import { Test } from '@nestjs/testing';
import { CouponService } from 'src/domain/coupon/service/coupon.service';
import { CouponRepository } from 'src/domain/coupon/repository/coupon.repository';
import { COUPON_REPOSITORY } from 'src/common/constants/repository.constants';
import { BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { CouponStatus } from '@prisma/client';
import { FcfsCouponWithCoupon } from 'src/domain/coupon/types/coupon.types';

describe('선착순 쿠폰 서비스 동시성 테스트', () => {
    let couponService: CouponService;
    let mockCouponRepository: jest.Mocked<CouponRepository>;
    let mockPrismaService: jest.Mocked<PrismaService>;

    beforeEach(async () => {
        // Repository의 모든 메서드를 Mock으로 생성
        mockCouponRepository = {
            findAvailableFcfsCoupons: jest.fn(),
            findFcfsCouponById: jest.fn(),
            findFcfsCouponWithLock: jest.fn(),
            decreaseFcfsCouponStock: jest.fn(),
            createUserCoupon: jest.fn(),
            findUserCoupons: jest.fn(),
            findExistingUserCoupon: jest.fn(),
        };

        // PrismaService의 트랜잭션을 Mock으로 생성
        // callback 함수를 그대로 실행하되 트랜잭션 객체로 mockPrismaService를 전달
        mockPrismaService = {
            $transaction: jest.fn((callback) => callback(mockPrismaService)),
        } as any;

        // 테스트 모듈 설정 - Repository와 PrismaService를 Mock으로 주입
        const moduleRef = await Test.createTestingModule({
            providers: [
                {
                    provide: COUPON_REPOSITORY,
                    useValue: mockCouponRepository,
                },
                {
                    provide: PrismaService,
                    useValue: mockPrismaService,
                },
                CouponService,
            ],
        }).compile();

        couponService = moduleRef.get<CouponService>(CouponService);
    });

    afterEach(() => {
        // mock 함수들 초기화
        jest.clearAllMocks();
    });

    describe('동시성 테스트 - 선착순 쿠폰 발급 (issueFcfsCoupon)', () => {
        let now: Date;
        
        beforeEach(() => {
            // 테스트에서 사용할 현재 시간을 2025-01-10로 고정
            now = new Date('2025-01-10T00:00:00Z');
            jest.useFakeTimers();
            jest.setSystemTime(now);
        });

        afterEach(() => {
            // 테스트 종료 후 시스템 시간을 원래대로 복구
            jest.useRealTimers();
        });

        it('동시 요청 시 재고가 있는 경우 - 쿠폰이 정상 발급된다', async () => {
            // given
            // 테스트 데이터 설정
            const userId = 1;
            const fcfsCouponId = 1;
            // 재고가 1개 남은 선착순 쿠폰 데이터 생성
            const mockFcfsCoupon: FcfsCouponWithCoupon = {
                id: fcfsCouponId,
                couponId: 1,
                totalQuantity: 100,
                stockQuantity: 1, // 마지막 1장 남은 상황
                startDate: new Date('2025-01-01T00:00:00Z'), // 현재보다 이전 날짜
                endDate: new Date('2025-12-31T23:59:59Z'),   // 현재보다 이후 날짜
                createdAt: new Date('2025-01-01T00:00:00Z'),
                coupon: {
                    id: 1,
                    name: '테스트 쿠폰',
                    type: 'PERCENTAGE',
                    amount: 10,
                    minOrderAmount: 1000,
                    validDays: 30,
                    isFcfs: true,
                    createdAt: new Date('2025-01-01T00:00:00Z'),
                },
            };
            // 발급될 사용자 쿠폰 데이터 생성
            const mockUserCoupon = {
                id: 1,
                userId,
                couponId: 1,
                status: CouponStatus.AVAILABLE,
                expiryDate: new Date('2025-02-01T23:59:59Z'),
                createdAt: new Date('2025-01-01T00:00:00Z'),
                usedAt: null,
            };
            // 각 Repository 메서드의 반환값 설정
            mockCouponRepository.findFcfsCouponWithLock.mockResolvedValue(mockFcfsCoupon);  // 락 획득 성공
            mockCouponRepository.findExistingUserCoupon.mockResolvedValue(null);  // 기존 발급내역 없음
            mockCouponRepository.decreaseFcfsCouponStock.mockResolvedValue(undefined);  // 재고 감소 성공
            mockCouponRepository.createUserCoupon.mockResolvedValue(mockUserCoupon);  // 쿠폰 발급 성공

            // when
            // 쿠폰 발급 요청
            const result = await couponService.issueFcfsCoupon(userId, fcfsCouponId);

            // then
            // 발급된 쿠폰 정보가 예상한 데이터와 일치하는지 확인
            expect(result).toEqual(mockUserCoupon);
            // 트랜잭션이 실행되었는지 확인
            expect(mockPrismaService.$transaction).toHaveBeenCalled();
            // 락을 획득하며 쿠폰을 조회했는지 확인
            expect(mockCouponRepository.findFcfsCouponWithLock).toHaveBeenCalledWith(
                fcfsCouponId,
                expect.any(Object)  // 트랜잭션 객체 전달 확인
            );
            // 재고가 정상적으로 감소되었는지 확인
            expect(mockCouponRepository.decreaseFcfsCouponStock).toHaveBeenCalledWith(
                fcfsCouponId,
                expect.any(Object)  // 트랜잭션 객체 전달 확인
            );
            // 사용자 쿠폰이 생성되었는지 확인
            expect(mockCouponRepository.createUserCoupon).toHaveBeenCalledWith(
                expect.objectContaining({
                    userId,
                    couponId: mockFcfsCoupon.couponId,
                    status: CouponStatus.AVAILABLE
                }),
                expect.any(Object) // 트랜잭션 객체 전달 확인
            );
        });

        it('동시 요청 시 재고가 없는 경우 - BadRequestException이 발생한다', async () => {
            // given: 테스트 데이터 설정
            const userId = 1;
            const fcfsCouponId = 1;
            
            // 재고가 0인 선착순 쿠폰 데이터 생성
            const mockFcfsCoupon: FcfsCouponWithCoupon = {
                id: fcfsCouponId,
                couponId: 1,
                totalQuantity: 100,
                stockQuantity: 0, // 재고 없음
                startDate: new Date('2025-01-01T00:00:00Z'),
                endDate: new Date('2025-12-31T23:59:59Z'),
                createdAt: new Date('2025-01-01T00:00:00Z'),
                coupon: {
                    id: 1,
                    name: '테스트 쿠폰',
                    type: 'PERCENTAGE',
                    amount: 10,
                    minOrderAmount: 1000,
                    validDays: 30,
                    isFcfs: true,
                    createdAt: new Date('2025-01-01T00:00:00Z'),
                },
            };

            // Repository 메서드 반환값 설정
            mockCouponRepository.findFcfsCouponWithLock.mockResolvedValue(mockFcfsCoupon);  // 락 획득은 성공
            mockCouponRepository.findExistingUserCoupon.mockResolvedValue(null);  // 기존 발급내역 없음

            // when & then: BadRequestException이 발생하는지 확인
            await expect(couponService.issueFcfsCoupon(userId, fcfsCouponId))
                .rejects
                .toThrow(BadRequestException);

            // 트랜잭션이 시작되었는지 확인
            expect(mockPrismaService.$transaction).toHaveBeenCalled();
            // 재고가 0이므로 감소 시도를 하지 않았는지 확인
            expect(mockCouponRepository.decreaseFcfsCouponStock).not.toHaveBeenCalled();
            // 쿠폰이 발급되지 않았는지 확인
            expect(mockCouponRepository.createUserCoupon).not.toHaveBeenCalled();
        });

        it('동시 요청 시 중복 발급 시도의 경우 - BadRequestException이 발생한다', async () => {
            // given: 테스트 데이터 설정
            const userId = 1;
            const fcfsCouponId = 1;
            // 재고가 있는 선착순 쿠폰 데이터 생성
            const mockFcfsCoupon: FcfsCouponWithCoupon = {
                id: fcfsCouponId,
                couponId: 1,
                totalQuantity: 100,
                stockQuantity: 50,
                startDate: new Date('2025-01-01T00:00:00Z'),
                endDate: new Date('2025-12-31T23:59:59Z'),
                createdAt: new Date('2025-01-01T00:00:00Z'),
                coupon: {
                    id: 1,
                    name: '테스트 쿠폰',
                    type: 'PERCENTAGE',
                    amount: 10,
                    minOrderAmount: 1000,
                    validDays: 30,
                    isFcfs: true,
                    createdAt: new Date('2025-01-01T00:00:00Z'),
                },
            };
            // 이미 발급된 사용자 쿠폰 데이터 생성
            const existingCoupon = {
                id: 1,
                userId: userId,
                couponId: 1,
                status: CouponStatus.AVAILABLE,
                expiryDate: new Date('2025-02-01T23:59:59Z'),
                createdAt: new Date('2025-01-01T00:00:00Z'),
                usedAt: null,
            };
            // Repository 메서드 반환값 설정
            mockCouponRepository.findFcfsCouponWithLock.mockResolvedValue(mockFcfsCoupon);  // 락 획득 성공
            mockCouponRepository.findExistingUserCoupon.mockResolvedValue(existingCoupon);  // 기존 발급내역 있음

            // when & then: BadRequestException이 발생하는지 확인
            await expect(couponService.issueFcfsCoupon(userId, fcfsCouponId))
                .rejects
                .toThrow(BadRequestException);
            
            // 트랜잭션이 시작되었는지 확인
            expect(mockPrismaService.$transaction).toHaveBeenCalled();
            // 중복 발급이므로 재고 감소를 시도하지 않았는지 확인
            expect(mockCouponRepository.decreaseFcfsCouponStock).not.toHaveBeenCalled();
            // 중복 발급이므로 새로운 쿠폰이 생성되지 않았는지 확인
            expect(mockCouponRepository.createUserCoupon).not.toHaveBeenCalled();
        });

        it('락 획득 실패 시나리오 - 예외가 발생한다', async () => {
            // given: 테스트 데이터 설정
            const userId = 1;
            const fcfsCouponId = 1;
            // Repository 메서드 반환값 설정 - 락 획득 실패 상황 시뮬레이션
            mockCouponRepository.findFcfsCouponWithLock.mockRejectedValue(
                new Error('Failed to acquire lock')
            );

            // when & then: 락 획득 실패 에러가 그대로 전파되는지 확인
            await expect(couponService.issueFcfsCoupon(userId, fcfsCouponId))
                .rejects
                .toThrow('Failed to acquire lock');
            
            // 트랜잭션이 시작되었는지 확인
            expect(mockPrismaService.$transaction).toHaveBeenCalled();
            // 락 획득 실패로 재고 감소를 시도하지 않았는지 확인
            expect(mockCouponRepository.decreaseFcfsCouponStock).not.toHaveBeenCalled();
            // 락 획득 실패로 쿠폰이 생성되지 않았는지 확인
            expect(mockCouponRepository.createUserCoupon).not.toHaveBeenCalled();
        });
    });
});