import { Test } from '@nestjs/testing';
import { CouponService } from 'src/domain/coupon/service/coupon.service';
import { CouponRepository } from 'src/domain/coupon/repository/coupon.repository';
import { COUPON_REPOSITORY } from 'src/common/constants/app.constants';
import { PaginationDto } from 'src/domain/coupon/dto/pagination.dto';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { FcfsCouponWithCoupon } from 'src/domain/coupon/types/coupon.types';
import { CouponStatus } from '@prisma/client';
import { RedisService } from 'src/infrastructure/redis/redis.service';
import { RedisRedlock } from 'src/infrastructure/redis/redis.redlock';

describe('선착순 쿠폰 서비스 테스트', () => {
    let couponService: CouponService;
    let mockCouponRepository: jest.Mocked<CouponRepository>;
    let mockPrismaService: jest.Mocked<PrismaService>;
    let mockRedisService: jest.Mocked<RedisService>;
    let mockRedisRedlock: jest.Mocked<RedisRedlock>;

    beforeEach(async () => {
        mockCouponRepository = {
            findAvailableFcfsCoupons: jest.fn(),
            findFcfsCouponById: jest.fn(),
            findFcfsCouponWithLock: jest.fn(),
            decreaseFcfsCouponStock: jest.fn(),
            createUserCoupon: jest.fn(),
            findUserCoupons: jest.fn(),
            findExistingUserCoupon: jest.fn(),
            issueFcfsCoupon: jest.fn(),
        };

        mockPrismaService = {
            $transaction: jest.fn(callback => callback(mockPrismaService))
        } as any;

        mockRedisService = {
            getClients: jest.fn().mockReturnValue([])
        } as any;

        mockRedisRedlock = {
            acquireLock: jest.fn().mockImplementation(async () => ({
                release: jest.fn().mockResolvedValue(undefined)
            })).mockReturnValue(true),
            releaseLock: jest.fn().mockResolvedValue(undefined)
        } as any;

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
                {
                    provide: RedisService,
                    useValue: mockRedisService
                },
                {
                    provide: RedisRedlock,
                    useValue: mockRedisRedlock
                },
                CouponService
            ],
        }).compile();

        couponService = moduleRef.get<CouponService>(CouponService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('사용 가능한 선착순 쿠폰 목록 조회 (getAvailableFcfsCoupons)', () => {
        it('사용 가능한 쿠폰이 있을 경우 - 페이징된 쿠폰 목록과 총 개수를 반환한다', async () => {
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

            const result = await couponService.getAvailableFcfsCoupons(pagination);

            expect(result.items).toHaveLength(1);
            expect(result.total).toBe(totalCount);
            expect(result.page).toBe(1);
            expect(result.limit).toBe(10);
            expect(result.items[0]).toEqual(expectedCoupon);
            expect(mockCouponRepository.findAvailableFcfsCoupons).toHaveBeenCalledWith(pagination);
        });

        it('사용 가능한 쿠폰이 없을 경우 - 빈 배열과 총 개수 0을 반환한다', async () => {
            const pagination = new PaginationDto();
            mockCouponRepository.findAvailableFcfsCoupons.mockResolvedValue([[], 0]);

            const result = await couponService.getAvailableFcfsCoupons(pagination);

            expect(result.items).toHaveLength(0);
            expect(result.total).toBe(0);
            expect(mockCouponRepository.findAvailableFcfsCoupons).toHaveBeenCalledWith(pagination);
        });
    });

    describe('특정 선착순 쿠폰 상세 조회 (getFcfsCouponById)', () => {
        it('존재하는 쿠폰 ID인 경우 - 쿠폰 상세 정보를 반환한다', async () => {
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

            const result = await couponService.getFcfsCouponById(1);

            expect(result).toEqual(expectedCoupon);
            expect(mockCouponRepository.findFcfsCouponById).toHaveBeenCalledWith(1);
        });

        it('존재하지 않는 쿠폰 ID인 경우 - NotFoundException을 발생시킨다', async () => {
            const nonExistentCouponId = 999;
            mockCouponRepository.findFcfsCouponById.mockResolvedValue(null);

            await expect(couponService.getFcfsCouponById(nonExistentCouponId))
                .rejects
                .toThrow(NotFoundException);
            expect(mockCouponRepository.findFcfsCouponById).toHaveBeenCalledWith(nonExistentCouponId);
        });
    });

    describe('선착순 쿠폰 발급 (issueFcfsCoupon)', () => {
        let now: Date;
    
        beforeEach(() => {
            now = new Date('2025-01-10T00:00:00Z');
            jest.useFakeTimers();
            jest.setSystemTime(now);
        });
    
        afterEach(() => {
            jest.useRealTimers();
        });
    
        it('정상적인 쿠폰 발급 - 발급된 쿠폰 정보를 반환한다', async () => {
            const userId = 1;
            const fcfsCouponId = 1;
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
    
            const result = await couponService.issueFcfsCoupon(userId, fcfsCouponId);
    
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
            const mockCoupon: FcfsCouponWithCoupon = {
                id: 1,
                couponId: 1,
                totalQuantity: 100,
                stockQuantity: 50,
                startDate: new Date('2125-03-01T00:00:00Z'),
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