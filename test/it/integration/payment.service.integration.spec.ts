import { Test, TestingModule } from '@nestjs/testing';
import { PaymentService } from 'src/domain/payment/service/payment.service';
import { PaymentRepositoryPrisma } from 'src/domain/payment/repository/payment.repository.prisma';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { OrderService } from 'src/domain/order/service/order.service';
import { BalanceService } from 'src/domain/balance/service/balance.service';
import { PaymentStatus, PrismaClient } from '@prisma/client';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { PaymentStatisticsService } from 'src/domain/payment/service/payment-statistics.service';
import { 
    PAYMENT_REPOSITORY, 
    ORDER_REPOSITORY, 
    PRODUCT_REPOSITORY, 
    COUPON_REPOSITORY, 
    BALANCE_REPOSITORY 
} from 'src/common/constants/app.constants';
import { OrderRepositoryPrisma } from 'src/domain/order/repository/order.repository.prisma';
import { CouponRepositoryPrisma } from 'src/domain/coupon/repository/coupon.repository.prisma';
import { BalanceRepositoryPrisma } from 'src/domain/balance/repository/balance.repository.prisma';
import { ProductRepositoryPrisma } from 'src/domain/product/repository/product.repository.impl';
import { PessimisticLockInterceptor } from 'src/common/interceptors/pessimistic-lock.interceptor';
import { Reflector } from '@nestjs/core';
import { PaymentController } from 'src/interfaces/controllers/payment/payment.controller';

describe('결제 서비스 통합 테스트', () => {
    let paymentController: PaymentController;
    let paymentService: PaymentService;
    let orderService: OrderService;
    let balanceService: BalanceService;
    let prisma: PrismaClient;
    let module: TestingModule;
    let testUser: { id: number };
    let testOrder: { id: number };

    beforeAll(async () => {
        prisma = global.__PRISMA_CLIENT__;
        if (!prisma) {
            throw new Error('Prisma client is not initialized');
        }

        module = await Test.createTestingModule({
            providers: [
                PaymentController,
                PaymentService,
                OrderService,
                {
                    provide: BalanceService,
                    useClass: BalanceService,
                },
                PaymentStatisticsService,
                {
                    provide: PrismaService,
                    useValue: prisma,
                },
                {
                    provide: PAYMENT_REPOSITORY,
                    useClass: PaymentRepositoryPrisma,
                },
                {
                    provide: ORDER_REPOSITORY,
                    useClass: OrderRepositoryPrisma,
                },
                {
                    provide: PRODUCT_REPOSITORY,
                    useClass: ProductRepositoryPrisma,
                },
                {
                    provide: COUPON_REPOSITORY,
                    useClass: CouponRepositoryPrisma,
                },
                {
                    provide: BALANCE_REPOSITORY,
                    useClass: BalanceRepositoryPrisma,
                },
                Reflector,
                PessimisticLockInterceptor,
            ],
        }).compile();

        paymentController = await module.resolve(PaymentController);
        paymentService = await module.resolve(PaymentService);
        orderService = await module.resolve(OrderService);
        balanceService = await module.resolve(BalanceService);
    });

    beforeEach(async () => {
        await prisma.$transaction(async (tx) => {
            // 깨끗한 테스트 환경을 위한 데이터 정리
            await tx.payment.deleteMany();
            await tx.balanceHistory.deleteMany();
            await tx.orderItem.deleteMany();
            await tx.order.deleteMany();
            await tx.userBalance.deleteMany();
            await tx.userAccount.deleteMany();
            
            // 테스트용 사용자 생성
            testUser = await tx.userAccount.create({
                data: {
                    email: 'test@test.com',
                    name: '테스트유저'
                }
            });

            // 잔액 설정
            await tx.userBalance.create({
                data: {
                    userId: testUser.id,
                    balance: 20000
                }
            });

            // 테스트용 주문 생성
            testOrder = await tx.order.create({
                data: {
                    userId: testUser.id,
                    totalAmount: 10000,
                    discountAmount: 0,
                    finalAmount: 10000,
                    status: 'PENDING'
                }
            });
        });
    });

    afterAll(async () => {
        await prisma.$transaction([
            prisma.payment.deleteMany(),
            prisma.balanceHistory.deleteMany(),
            prisma.orderItem.deleteMany(),
            prisma.order.deleteMany(),
            prisma.userBalance.deleteMany(),
            prisma.userAccount.deleteMany(),
        ]);
        
        if (module) {
            await module.close();
        }
    });

    // 동시성 보장 함수
    const executeInParallel = async <T>(
        action: () => Promise<T>,
        count: number
    ): Promise<Array<{ success: boolean; data?: T; error?: any }>> => {
        let executed = false;
        // 배리어 동기화를 위한 Promise
        const barrier = new Promise<void>(resolve => {
            // 모든 요청이 준비될 때까지 약간의 지연
            setTimeout(() => {
                executed = true;
                resolve();
            }, 100);
        });
    
        const execute = async () => {
            if (!executed) {
                await barrier; // 배리어에서 대기
            }
            try {
                const data = await action();
                return { success: true, data };
            } catch (error) {
                return { success: false, error };
            }
        };
    
        // 실제 병렬 실행
        return Promise.all(Array(count).fill(null).map(() => execute()));
    };

    describe('결제 처리 (processPayment)', () => {
        it('단일 결제 - 정상 처리', async () => {
            // When
            const payment = await paymentService.processPayment(testUser.id, testOrder.id);

            // Then
            expect(payment).toBeDefined();
            expect(payment.status).toBe(PaymentStatus.COMPLETED);
            
            const updatedBalance = await balanceService.getBalance(testUser.id);
            expect(updatedBalance?.balance.toNumber()).toBe(10000); // 20000 - 10000
            
            // 결제 기록 확인
            const paymentRecord = await prisma.payment.findUnique({
                where: { id: payment.id }
            });
            expect(paymentRecord?.status).toBe(PaymentStatus.COMPLETED);
            expect(paymentRecord?.amount.toString()).toBe('10000');
        });

        it('잔액 부족 - 결제 실패', async () => {
            // Given
            await prisma.userBalance.update({
                where: { userId: testUser.id },
                data: { balance: 5000 }
            });

            // When & Then
            await expect(
                paymentService.processPayment(testUser.id, testOrder.id)
            ).rejects.toThrow(BadRequestException);

            // 잔액이 차감되지 않았는지 확인
            const finalBalance = await balanceService.getBalance(testUser.id);
            expect(finalBalance?.balance.toNumber()).toBe(5000);
        });

        it('동시 다중 결제 요청 - 락 경쟁으로 인해 하나만 성공', async () => {
            // Given
            const numberOfRequests = 3;
            
            // When
            const results = await executeInParallel(
                () => paymentService.processPayment(testUser.id, testOrder.id),
                numberOfRequests
            );
            
            // Then
            const successResults = results.filter(r => r.success);
            const failureResults = results.filter(r => !r.success);
            
            expect(successResults).toHaveLength(1);
            expect(failureResults).toHaveLength(numberOfRequests - 1);
            
            // 잔액이 정확히 한 번만 차감되었는지 확인
            const finalBalance = await balanceService.getBalance(testUser.id);
            expect(finalBalance?.balance.toNumber()).toBe(10000); // 20000 - 10000

            // 결제 기록이 하나만 생성되었는지 확인
            const payments = await prisma.payment.findMany({
                where: {
                    orderId: testOrder.id,
                    status: PaymentStatus.COMPLETED
                }
            });
            expect(payments).toHaveLength(1);
        });
    });

    describe('결제 취소 (cancelPayment)', () => {
        let paymentId: number;

        beforeEach(async () => {
            const payment = await paymentService.processPayment(testUser.id, testOrder.id);
            paymentId = payment.id;
        });

        it('결제 취소 - 정상 처리', async () => {
            // When
            const cancelledPayment = await paymentService.cancelPayment(testUser.id, paymentId);

            // Then
            expect(cancelledPayment.status).toBe(PaymentStatus.CANCELLED);
            
            // 잔액이 정상적으로 환불되었는지 확인
            const finalBalance = await balanceService.getBalance(testUser.id);
            expect(finalBalance?.balance.toNumber()).toBe(20000);
            
            // 주문 상태가 취소로 변경되었는지 확인
            const order = await orderService.findOrderById(testOrder.id);
            expect(order?.status).toBe('CANCELLED');

            // 취소 이력이 제대로 생성되었는지 확인
            const refundHistory = await prisma.balanceHistory.findFirst({
                where: {
                    type: 'REFUND',
                    userBalance: {
                        userId: testUser.id
                    }
                },
                orderBy: {
                    createdAt: 'desc'
                }
            });
            expect(refundHistory).toBeDefined();
            expect(refundHistory?.amount.toString()).toBe('10000');
        });

        it('동시 취소 요청 - 락 경쟁으로 인해 하나만 성공', async () => {
            // Given
            const numberOfRequests = 3;
            
            // When
            const results = await executeInParallel(
                () => paymentService.cancelPayment(testUser.id, paymentId),
                numberOfRequests
            );
            
            // Then
            const successResults = results.filter(r => r.success);
            const failureResults = results.filter(r => !r.success);
            
            expect(successResults).toHaveLength(1);
            expect(failureResults).toHaveLength(numberOfRequests - 1);
            
            // 잔액이 한 번만 환불되었는지 확인
            const finalBalance = await balanceService.getBalance(testUser.id);
            expect(finalBalance?.balance.toNumber()).toBe(20000);

            // 환불 이력이 하나만 생성되었는지 확인
            const refundHistories = await prisma.balanceHistory.findMany({
                where: {
                    type: 'REFUND',
                    userBalance: {
                        userId: testUser.id
                    }
                }
            });
            expect(refundHistories).toHaveLength(1);
        });

        it('이미 취소된 결제 재취소 시도 - 실패', async () => {
            // Given
            await paymentService.cancelPayment(testUser.id, paymentId);

            // When & Then
            await expect(
                paymentService.cancelPayment(testUser.id, paymentId)
            ).rejects.toThrow(BadRequestException);
        });
    });
});