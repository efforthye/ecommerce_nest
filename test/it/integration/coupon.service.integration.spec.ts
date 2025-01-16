import { Test, TestingModule } from '@nestjs/testing';
import { CouponService } from 'src/domain/coupon/service/coupon.service';
import { COUPON_REPOSITORY } from 'src/common/constants/app.constants';
import { CouponRepositoryPrisma } from 'src/domain/coupon/repository/coupon.repository.prisma';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { BadRequestException } from '@nestjs/common';
import { CouponStatus, Prisma } from '@prisma/client';
import { setTimeout } from 'timers/promises';

describe('선착순 쿠폰 서비스 동시성 통합 테스트', () => {
    let module: TestingModule;
    let couponService: CouponService;
    let prismaService: PrismaService;

    beforeAll(async () => {
        // 테스트 모듈 설정 - 실제 구현체 사용
        module = await Test.createTestingModule({
            providers: [
                CouponService,
                PrismaService,
                {
                    provide: COUPON_REPOSITORY,
                    useClass: CouponRepositoryPrisma // 실제 Repository 구현체 사용
                }
            ],
        }).compile();

        couponService = module.get<CouponService>(CouponService);
        prismaService = module.get<PrismaService>(PrismaService);
    });

    beforeEach(async () => {
        // 각 테스트 전에 테스트 데이터 초기화
        await prismaService.userCoupon.deleteMany();
        await prismaService.fcfsCoupon.deleteMany();
        await prismaService.coupon.deleteMany();
    });

    afterAll(async () => {
        // 테스트 종료 후 모듈과 DB 연결 정리
        await prismaService.$disconnect();
        await module.close();
    });

    describe('동시성 테스트 - 선착순 쿠폰 발급 (issueFcfsCoupon)', () => {
        it('여러 사용자가 동시에 쿠폰을 발급 요청할 경우 재고만큼만 정상 발급된다', async () => {
            // given
            // 테스트 설정값
            const stockQuantity = 3;  // 초기 재고 수량
            const totalRequests = 10; // 총 요청 수
            const delayMs = 100;      // 동시성 시뮬레이션을 위한 지연 시간

            // 테스트용 쿠폰 데이터 생성
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

            // 테스트용 선착순 쿠폰 데이터 생성
            const fcfsCoupon = await prismaService.fcfsCoupon.create({
                data: {
                    couponId: coupon.id,
                    totalQuantity: stockQuantity,
                    stockQuantity: stockQuantity,
                    startDate: new Date(),
                    endDate: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24시간 후
                }
            });

            // when
            // 여러 사용자의 동시 요청을 시뮬레이션
            const requests = Array.from({ length: totalRequests }, (_, index) => ({
                userId: index + 1,
                fcfsCouponId: fcfsCoupon.id
            }));

            // 의도적으로 약간의 지연을 주어 요청들이 거의 동시에 처리되도록 함
            await setTimeout(delayMs);
            
            const results = await Promise.allSettled(
                requests.map(req => 
                    couponService.issueFcfsCoupon(req.userId, req.fcfsCouponId)
                )
            );

            // then
            const successResults = results.filter(r => r.status === 'fulfilled');
            const failedResults = results.filter(r => r.status === 'rejected');

            // 1. 성공한 발급 수가 초기 재고 수량과 일치해야 함
            expect(successResults).toHaveLength(stockQuantity);
            
            // 2. 실패한 발급 수가 (총 요청 수 - 초기 재고 수량)과 일치해야 함
            expect(failedResults).toHaveLength(totalRequests - stockQuantity);

            // 3. 실패한 요청들은 모두 재고 부족 에러여야 함
            for (const result of failedResults) {
                expect(result.status).toBe('rejected');
                expect(result.reason).toBeInstanceOf(BadRequestException);
                expect(result.reason.message).toBe('Coupon stock is empty');
            }

            // 4. DB의 재고가 0이 되었는지 확인
            const updatedFcfsCoupon = await prismaService.fcfsCoupon.findUnique({
                where: { id: fcfsCoupon.id }
            });
            expect(updatedFcfsCoupon).not.toBeNull(); // null이 아닌지 먼저 체크
            if (updatedFcfsCoupon) {  // Type narrowing
                expect(updatedFcfsCoupon.stockQuantity).toBe(0);
            }

            // 5. 실제 발급된 쿠폰의 상태 확인
            const issuedCoupons = await prismaService.userCoupon.findMany({
                where: { couponId: coupon.id }
            });
            expect(issuedCoupons).toHaveLength(stockQuantity);
            expect(issuedCoupons.every(c => c.status === CouponStatus.AVAILABLE)).toBe(true);
        });

        it('동일 사용자가 동시에 중복 발급을 시도할 경우 한 번만 발급된다', async () => {
            // given
            const userId = 1;
            const stockQuantity = 5;
            const simultaneousRequests = 5;

            // 테스트용 쿠폰 생성
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

            // when
            // 동일 사용자의 동시 요청을 시뮬레이션
            const results = await Promise.allSettled(
                Array(simultaneousRequests).fill(null).map(() =>
                    couponService.issueFcfsCoupon(userId, fcfsCoupon.id)
                )
            );

            // then
            const successResults = results.filter(r => r.status === 'fulfilled');
            const failedResults = results.filter(r => r.status === 'rejected');

            // 1. 한 번만 성공해야 함
            expect(successResults).toHaveLength(1);
            
            // 2. 나머지는 중복 발급 에러여야 함
            expect(failedResults).toHaveLength(simultaneousRequests - 1);
            for (const result of failedResults) {
                expect(result.status).toBe('rejected');
                expect(result.reason).toBeInstanceOf(BadRequestException);
                expect(result.reason.message).toBe('이미 발급된 쿠폰입니다.');
            }

            // 3. DB에 실제로 발급된 쿠폰이 1개인지 확인
            const issuedCoupons = await prismaService.userCoupon.findMany({
                where: { 
                    userId,
                    couponId: coupon.id
                }
            });
            expect(issuedCoupons).toHaveLength(1);
            
            // 4. 재고가 1개만 감소했는지 확인
            const updatedFcfsCoupon = await prismaService.fcfsCoupon.findUnique({
                where: { id: fcfsCoupon.id }
            });
            expect(updatedFcfsCoupon).not.toBeNull();
            if (updatedFcfsCoupon) {
                expect(updatedFcfsCoupon.stockQuantity).toBe(stockQuantity - 1);
            }
        });

        it('발급 기간이 아닌 경우 발급에 실패한다', async () => {
            // given
            const userId = 1;
            const stockQuantity = 5;

            // 테스트용 쿠폰 생성 (미래 시작일)
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
            futureDate.setDate(futureDate.getDate() + 7); // 7일 후 시작

            const fcfsCoupon = await prismaService.fcfsCoupon.create({
                data: {
                    couponId: coupon.id,
                    totalQuantity: stockQuantity,
                    stockQuantity: stockQuantity,
                    startDate: futureDate,
                    endDate: new Date(futureDate.getTime() + 24 * 60 * 60 * 1000)
                }
            });

            // when & then
            await expect(
                couponService.issueFcfsCoupon(userId, fcfsCoupon.id)
            ).rejects.toThrow(BadRequestException);

            // 재고가 감소하지 않았는지 확인
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