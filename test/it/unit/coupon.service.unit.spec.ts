import { Test } from '@nestjs/testing';
import { CouponService } from 'src/domain/coupon/service/coupon.service';
import { CouponRepository } from 'src/domain/coupon/repository/coupon.repository';
import { COUPON_REPOSITORY } from 'src/common/constants/app.constants';
import { PaginationDto } from 'src/domain/coupon/dto/pagination.dto';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { FcfsCouponWithCoupon } from 'src/domain/coupon/types/coupon.types';
import { CouponStatus } from '@prisma/client';

describe('선착순 쿠폰 서비스 테스트', () => {
    let couponService: CouponService;
    let mockCouponRepository: jest.Mocked<CouponRepository>;
    let mockPrismaService: jest.Mocked<PrismaService>;

    beforeEach(async () => {
        // 각 테스트 전에 Repository mock 초기화
        mockCouponRepository = {
            findAvailableFcfsCoupons: jest.fn(),
            findFcfsCouponById: jest.fn(),
            findFcfsCouponWithLock: jest.fn(),
            decreaseFcfsCouponStock: jest.fn(),
            createUserCoupon: jest.fn(),
            findUserCoupons: jest.fn(),
            findExistingUserCoupon: jest.fn()
        };

        mockPrismaService = {
            $transaction: jest.fn(callback => callback(mockPrismaService))
        } as any;

        // 테스트 모듈 설정
        const moduleRef = await Test.createTestingModule({
            providers: [
                {
                    provide: COUPON_REPOSITORY,
                    useValue: mockCouponRepository
                },
                {
                    provide: PrismaService,
                    useValue: mockPrismaService
                },
                CouponService
            ],
        }).compile();

        couponService = moduleRef.get<CouponService>(CouponService);
    });

    afterEach(() => {
        // mock 함수들 초기화
        jest.clearAllMocks();
    });

    describe('사용 가능한 선착순 쿠폰 목록 조회 (getAvailableFcfsCoupons)', () => {
        it('사용 가능한 쿠폰이 있을 경우 - 페이징된 쿠폰 목록과 총 개수를 반환한다', async () => {
            // given
            const pagination = new PaginationDto();
            pagination.page = 1;
            pagination.limit = 10;

            const expectedCoupon = {
                id: 1,
                couponId: 1,
                coupon: {
                    id: 1,
                    name: '신규가입 할인 쿠폰',
                    type: 'PERCENTAGE',
                    amount: 10.00,
                    minOrderAmount: 10000,
                    validDays: 30,
                    isFcfs: true,
                    createdAt: new Date('2025-01-01')
                },
                totalQuantity: 100,
                stockQuantity: 45,
                startDate: new Date('2025-01-01'),
                endDate: new Date('2025-01-31'),
                createdAt: new Date('2025-01-01')
            };
            
            const totalCount = 1;
            mockCouponRepository.findAvailableFcfsCoupons.mockResolvedValue([[expectedCoupon], totalCount]);

            // when
            const result = await couponService.getAvailableFcfsCoupons(pagination);

            // then
            // 페이징된 결과에 정확히 1개의 쿠폰이 포함되어 있는지 확인
            expect(result.items).toHaveLength(1);
            // 전체 쿠폰 개수가 정확히 1개인지 확인
            expect(result.total).toBe(totalCount);
            // 요청한 페이지 번호가 그대로 반환되는지 확인
            expect(result.page).toBe(1);
            // 요청한 페이지 크기가 그대로 반환되는지 확인
            expect(result.limit).toBe(10);
            // 반환된 쿠폰 정보가 기대하는 데이터와 정확히 일치하는지 확인
            expect(result.items[0]).toEqual(expectedCoupon);
            // Repository의 조회 메서드가 페이징 정보와 함께 호출되었는지 확인
            expect(mockCouponRepository.findAvailableFcfsCoupons).toHaveBeenCalledWith(pagination);
        });

        it('사용 가능한 쿠폰이 없을 경우 - 빈 배열과 총 개수 0을 반환한다', async () => {
            // given
            const pagination = new PaginationDto();
            mockCouponRepository.findAvailableFcfsCoupons.mockResolvedValue([[], 0]);

            // when
            const result = await couponService.getAvailableFcfsCoupons(pagination);

            // then
            // 쿠폰 목록이 비어있는지 확인
            expect(result.items).toHaveLength(0);
            // 전체 쿠폰 개수가 0인지 확인
            expect(result.total).toBe(0);
            // Repository 조회 메서드가 페이징 정보와 함께 호출되었는지 확인
            expect(mockCouponRepository.findAvailableFcfsCoupons).toHaveBeenCalledWith(pagination);
        });
    });

    describe('특정 선착순 쿠폰 상세 조회 (getFcfsCouponById)', () => {
        it('존재하는 쿠폰 ID인 경우 - 쿠폰 상세 정보를 반환한다', async () => {
            // given
            const expectedCoupon = {
                id: 1,
                couponId: 1,
                coupon: {
                    id: 1,
                    name: '신규가입 할인 쿠폰',
                    type: 'PERCENTAGE',
                    amount: 10.00,
                    minOrderAmount: 10000,
                    validDays: 30,
                    isFcfs: true,
                    createdAt: new Date('2025-01-01')
                },
                totalQuantity: 100,
                stockQuantity: 45,
                startDate: new Date('2025-01-01'),
                endDate: new Date('2025-01-31'),
                createdAt: new Date('2025-01-01')
            };
            mockCouponRepository.findFcfsCouponById.mockResolvedValue(expectedCoupon);

            // when
            const result = await couponService.getFcfsCouponById(1);

            // then
            // 반환된 쿠폰 정보가 기대하는 데이터와 정확히 일치하는지 확인
            expect(result).toEqual(expectedCoupon);
            // Repository 조회 메서드가 정확한 ID와 함께 호출되었는지 확인
            expect(mockCouponRepository.findFcfsCouponById).toHaveBeenCalledWith(1);
        });

        it('존재하지 않는 쿠폰 ID인 경우 - NotFoundException을 발생시킨다', async () => {
            // given
            const nonExistentCouponId = 999;
            mockCouponRepository.findFcfsCouponById.mockResolvedValue(null);

            // when & then
            // 존재하지 않는 쿠폰 조회시 NotFoundException이 발생하는지 확인
            await expect(couponService.getFcfsCouponById(nonExistentCouponId))
                .rejects
                .toThrow(NotFoundException);
            // Repository 조회 메서드가 존재하지 않는 ID와 함께 호출되었는지 확인
            expect(mockCouponRepository.findFcfsCouponById).toHaveBeenCalledWith(nonExistentCouponId);
        });
    });

    describe('선착순 쿠폰 발급 (issueFcfsCoupon)', () => {
        let now: Date;
    
        beforeEach(() => {
            // 테스트용 현재 시간 고정
            now = new Date('2025-01-10T00:00:00Z');
            jest.useFakeTimers();
            jest.setSystemTime(now);
        });
    
        afterEach(() => {
            jest.useRealTimers();
        });
    
        it('정상적인 쿠폰 발급 - 발급된 쿠폰 정보를 반환한다', async () => {
            // given
            const userId = 1;
            const fcfsCouponId = 1;
            const mockFcfsCoupon: FcfsCouponWithCoupon = {
                id: fcfsCouponId,
                couponId: 1,
                totalQuantity: 100,
                stockQuantity: 50,
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
                    createdAt: new Date('2025-01-01T00:00:00Z')
                }
            };
    
            const mockUserCoupon = {
                id: 1,
                userId,
                couponId: 1,
                status: CouponStatus.AVAILABLE,
                expiryDate: new Date('2025-02-09T23:59:59Z'),
                createdAt: now,
                usedAt: null
            };
    
            mockCouponRepository.findFcfsCouponWithLock.mockResolvedValue(mockFcfsCoupon);
            mockCouponRepository.createUserCoupon.mockResolvedValue(mockUserCoupon);
    
            // when
            const result = await couponService.issueFcfsCoupon(userId, fcfsCouponId);
    
            // then
            expect(mockPrismaService.$transaction).toHaveBeenCalled();
            expect(mockCouponRepository.findFcfsCouponWithLock).toHaveBeenCalledWith(
                fcfsCouponId,
                expect.any(Object)
            );
            expect(mockCouponRepository.decreaseFcfsCouponStock).toHaveBeenCalledWith(
                fcfsCouponId,
                expect.any(Object)
            );
            expect(mockCouponRepository.createUserCoupon).toHaveBeenCalledWith(
                expect.objectContaining({
                    userId,
                    couponId: mockFcfsCoupon.couponId,
                    status: CouponStatus.AVAILABLE
                }),
                expect.any(Object)
            );
            expect(result).toEqual(mockUserCoupon);
        });
    
        it('발급 기간이 아닌 경우 - BadRequestException을 발생시킨다', async () => {
            // given
            const mockCoupon: FcfsCouponWithCoupon = {
                id: 1,
                couponId: 1,
                totalQuantity: 100,
                stockQuantity: 50,
                startDate: new Date('2125-03-01T00:00:00Z'),  // 현재보다 미래 날짜
                endDate: new Date('2025-12-31T23:59:59Z'),
                createdAt: now,
                coupon: {
                    id: 1,
                    name: '테스트 쿠폰',
                    type: 'PERCENTAGE',
                    amount: 10,
                    minOrderAmount: 1000,
                    validDays: 30,
                    isFcfs: true,
                    createdAt: now
                }
            };
            mockCouponRepository.findFcfsCouponWithLock.mockResolvedValue(mockCoupon);
    
            // when & then
            await expect(couponService.issueFcfsCoupon(1, 1))
                .rejects
                .toThrow(BadRequestException);
            
            expect(mockCouponRepository.findFcfsCouponWithLock).toHaveBeenCalledWith(
                1,
                expect.any(Object)
            );
            expect(mockCouponRepository.decreaseFcfsCouponStock).not.toHaveBeenCalled();
            expect(mockCouponRepository.createUserCoupon).not.toHaveBeenCalled();
        });
    });

});