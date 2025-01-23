import { Test, TestingModule } from '@nestjs/testing';
import { CouponService } from 'src/domain/coupon/service/coupon.service';
import { COUPON_REPOSITORY } from 'src/common/constants/app.constants';
import { CouponRepositoryPrisma } from 'src/domain/coupon/repository/coupon.repository.prisma';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { BadRequestException } from '@nestjs/common';
import { CouponStatus, Prisma } from '@prisma/client';
import { setTimeout } from 'timers/promises';
import { RedisService } from 'src/infrastructure/redis/redis.service';
import { RedisRedlock } from 'src/infrastructure/redis/redis.redlock';

describe('선착순 쿠폰 서비스 동시성 통합 테스트', () => {
    let module: TestingModule;
    let couponService: CouponService;
    let prismaService: PrismaService;
    let mockRedisService: jest.Mocked<RedisService>;
    let mockRedisRedlock: jest.Mocked<RedisRedlock>;

    beforeAll(async () => {
        mockRedisService = {
            getClients: jest.fn().mockReturnValue([]),
            onModuleInit: jest.fn(),
            onModuleDestroy: jest.fn()
        } as any;

        mockRedisRedlock = {
                acquireLock: jest.fn().mockResolvedValue({
                    release: jest.fn().mockResolvedValue(undefined)
                }),
                releaseLock: jest.fn().mockResolvedValue(undefined)
            } as any;

        module = await Test.createTestingModule({
            providers: [
                CouponService,
                PrismaService,
                {
                    provide: RedisService,
                    useValue: mockRedisService
                },
                {
                    provide: RedisRedlock,
                    useValue: mockRedisRedlock
                },
                {
                    provide: COUPON_REPOSITORY,
                    useClass: CouponRepositoryPrisma
                }
            ],
        }).compile();

        couponService = module.get<CouponService>(CouponService);
        prismaService = module.get<PrismaService>(PrismaService);
    });

    beforeEach(async () => {
        await prismaService.userCoupon.deleteMany();
        await prismaService.fcfsCoupon.deleteMany();
        await prismaService.coupon.deleteMany();
        jest.clearAllMocks();
    });

    afterAll(async () => {
        await prismaService.$disconnect();
        await module.close();
    });

    describe('동시성 테스트 - 선착순 쿠폰 발급 (issueFcfsCoupon)', () => {
        it('여러 사용자가 동시에 쿠폰을 발급 요청할 경우 재고만큼만 정상 발급된다', async () => {
            const stockQuantity = 3;
            const totalRequests = 10;
            const delayMs = 100;

            const coupon = await prismaService.coupon.create({
                data: {
                    name: '테스트 쿠폰',
                    type: 'PERCENTAGE', 
                    amount: new Prisma.Decimal(10.00),
                    minOrderAmount: new Prisma.Decimal(1000.00),
                    validDays: 30,
                    isFcfs: true
                }
            });

            const fcfsCoupon = await prismaService.fcfsCoupon.create({
                data: {
                    couponId: coupon.id,
                    totalQuantity: stockQuantity,
                    stockQuantity: stockQuantity,
                    startDate: new Date(),
                    endDate: new Date(Date.now() + 24 * 60 * 60 * 1000)
                }
            });

            await setTimeout(delayMs);
            
            const requests = Array.from({ length: totalRequests }, (_, index) => ({
                userId: index + 1,
                fcfsCouponId: fcfsCoupon.id
            }));

            const results = await Promise.allSettled(
                requests.map(req => 
                    couponService.issueFcfsCoupon(req.userId, req.fcfsCouponId)
                )
            );

            const successResults = results.filter(r => r.status === 'fulfilled');
            const failedResults = results.filter(r => r.status === 'rejected');

            expect(successResults).toHaveLength(stockQuantity);
            expect(failedResults).toHaveLength(totalRequests - stockQuantity);

            for (const result of failedResults) {
                expect(result.status).toBe('rejected');
                expect(result.reason).toBeInstanceOf(BadRequestException);
                expect(result.reason.message).toBe('Coupon stock is empty');
            }

            const updatedFcfsCoupon = await prismaService.fcfsCoupon.findUnique({
                where: { id: fcfsCoupon.id }
            });
            expect(updatedFcfsCoupon).not.toBeNull();
            if (updatedFcfsCoupon) {
                expect(updatedFcfsCoupon.stockQuantity).toBe(0);
            }

            const issuedCoupons = await prismaService.userCoupon.findMany({
                where: { couponId: coupon.id }
            });
            expect(issuedCoupons).toHaveLength(stockQuantity);
            expect(issuedCoupons.every(c => c.status === CouponStatus.AVAILABLE)).toBe(true);
        });

        it('동일 사용자가 동시에 중복 발급을 시도할 경우 한 번만 발급된다', async () => {
            const userId = 1;
            const stockQuantity = 5;
            const simultaneousRequests = 5;

            const coupon = await prismaService.coupon.create({
                data: {
                    name: '테스트 쿠폰',
                    type: 'PERCENTAGE',
                    amount: new Prisma.Decimal(10.00),
                    minOrderAmount: new Prisma.Decimal(1000.00),
                    validDays: 30,
                    isFcfs: true
                }
            });

            const fcfsCoupon = await prismaService.fcfsCoupon.create({
                data: {
                    couponId: coupon.id,
                    totalQuantity: stockQuantity,
                    stockQuantity: stockQuantity,
                    startDate: new Date(),
                    endDate: new Date(Date.now() + 24 * 60 * 60 * 1000)
                }
            });

            const results = await Promise.allSettled(
                Array(simultaneousRequests).fill(null).map(() =>
                    couponService.issueFcfsCoupon(userId, fcfsCoupon.id)
                )
            );

            const successResults = results.filter(r => r.status === 'fulfilled');
            const failedResults = results.filter(r => r.status === 'rejected');

            expect(successResults).toHaveLength(1);
            expect(failedResults).toHaveLength(simultaneousRequests - 1);

            for (const result of failedResults) {
                expect(result.status).toBe('rejected');
                expect(result.reason).toBeInstanceOf(BadRequestException);
                expect(result.reason.message).toBe('이미 발급된 쿠폰입니다.');
            }

            const issuedCoupons = await prismaService.userCoupon.findMany({
                where: { 
                    userId,
                    couponId: coupon.id
                }
            });
            expect(issuedCoupons).toHaveLength(1);
            
            const updatedFcfsCoupon = await prismaService.fcfsCoupon.findUnique({
                where: { id: fcfsCoupon.id }
            });
            expect(updatedFcfsCoupon).not.toBeNull();
            if (updatedFcfsCoupon) {
                expect(updatedFcfsCoupon.stockQuantity).toBe(stockQuantity - 1);
            }
        });

        it('발급 기간이 아닌 경우 발급에 실패한다', async () => {
            const userId = 1;
            const stockQuantity = 5;

            const coupon = await prismaService.coupon.create({
                data: {
                    name: '테스트 쿠폰',
                    type: 'PERCENTAGE',
                    amount: new Prisma.Decimal(10.00),
                    minOrderAmount: new Prisma.Decimal(1000.00),
                    validDays: 30,
                    isFcfs: true
                }
            });

            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 7);

            const fcfsCoupon = await prismaService.fcfsCoupon.create({
                data: {
                    couponId: coupon.id,
                    totalQuantity: stockQuantity,
                    stockQuantity: stockQuantity,
                    startDate: futureDate,
                    endDate: new Date(futureDate.getTime() + 24 * 60 * 60 * 1000)
                }
            });

            await expect(
                couponService.issueFcfsCoupon(userId, fcfsCoupon.id)
            ).rejects.toThrow(BadRequestException);

            const updatedFcfsCoupon = await prismaService.fcfsCoupon.findUnique({
                where: { id: fcfsCoupon.id }
            });
            expect(updatedFcfsCoupon).not.toBeNull();
            if (updatedFcfsCoupon) {
                expect(updatedFcfsCoupon.stockQuantity).toBe(stockQuantity);
            }
        });
    });
});