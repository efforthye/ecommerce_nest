import { Test, TestingModule } from '@nestjs/testing';
import { PaymentService } from 'src/domain/payment/service/payment.service';
import { PaymentRepositoryPrisma } from 'src/domain/payment/repository/payment.repository.prisma';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { OrderService } from 'src/domain/order/service/order.service';
import { BalanceService } from 'src/domain/balance/service/balance.service';
import { PaymentStatus, PrismaClient } from '@prisma/client';
import { BadRequestException } from '@nestjs/common';
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
import { PessimisticLockInterceptor } from 'src/common/interceptors/pessimistic-lock.interceptor';
import { Reflector } from '@nestjs/core';
import { PaymentController } from 'src/interfaces/controllers/payment/payment.controller';
import { CustomLoggerService } from 'src/infrastructure/logging/logger.service';
import { ProductRepositoryPrisma } from 'src/domain/product/repository/product.repository.impl';

class ExtendedPrismaClient extends PrismaClient {
 async onModuleInit() {
   await this.$connect();
 }
}

describe('결제 서비스 통합 테스트', () => {
    let paymentController: PaymentController;
    let paymentService: PaymentService;
    let orderService: OrderService;
    let balanceService: BalanceService;
    let prisma: ExtendedPrismaClient;
    let module: TestingModule;
    let testUser: { id: number };
    let testOrder: { id: number };
    let logger: CustomLoggerService;
    let balanceRepository: BalanceRepositoryPrisma;
 
    beforeAll(async () => {
        prisma = global.__PRISMA_CLIENT__ as ExtendedPrismaClient;
        if (!prisma) throw new Error('Prisma client is not initialized');
 
        logger = new CustomLoggerService();
        logger.setTarget('PaymentServiceTest');
 
        balanceRepository = new BalanceRepositoryPrisma(prisma);
 
        module = await Test.createTestingModule({
            providers: [
                PaymentController,
                PaymentService,
                OrderService,
                BalanceService,
                PaymentStatisticsService,
                {
                    provide: PrismaService,
                    useValue: prisma,
                },
                {
                    provide: PAYMENT_REPOSITORY,
                    useFactory: () => {
                        const repo = new PaymentRepositoryPrisma(prisma, balanceRepository);
                        return repo;
                    }
                },
                {
                    provide: ORDER_REPOSITORY,
                    useFactory: () => new OrderRepositoryPrisma(prisma),
                },
                {
                    provide: PRODUCT_REPOSITORY, 
                    useFactory: () => new ProductRepositoryPrisma(prisma),
                },
                {
                    provide: COUPON_REPOSITORY,
                    useFactory: () => new CouponRepositoryPrisma(prisma),
                },
                {
                    provide: BALANCE_REPOSITORY,
                    useValue: balanceRepository,
                },
                {
                    provide: CustomLoggerService,
                    useValue: logger
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
            await tx.payment.deleteMany();
            await tx.balanceHistory.deleteMany();
            await tx.orderItem.deleteMany();
            await tx.order.deleteMany();
            await tx.userBalance.deleteMany();
            await tx.userAccount.deleteMany();
            
            testUser = await tx.userAccount.create({
                data: {
                    email: 'test@test.com',
                    name: '테스트유저'
                }
            });

            await tx.userBalance.create({
                data: {
                    userId: testUser.id,
                    balance: 20000
                }
            });

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

    const executeInParallel = async <T>(
        action: () => Promise<T>,
        count: number
    ): Promise<Array<{ success: boolean; data?: T; error?: any }>> => {
        let executed = false;
        const barrier = new Promise<void>(resolve => {
            setTimeout(() => {
                executed = true;
                resolve();
            }, 100);
        });
    
        const execute = async () => {
            if (!executed) {
                await barrier;
            }
            try {
                const data = await action();
                return { success: true, data };
            } catch (error) {
                return { success: false, error };
            }
        };
    
        return Promise.all(Array(count).fill(null).map(() => execute()));
    };

    describe('결제 처리 (processPayment)', () => {
        it('단일 결제 - 정상 처리', async () => {
            const payment = await paymentService.processPayment(testUser.id, testOrder.id);

            expect(payment).toBeDefined();
            expect(payment.status).toBe(PaymentStatus.COMPLETED);
            
            const updatedBalance = await balanceService.getBalance(testUser.id);
            expect(updatedBalance?.balance.toNumber()).toBe(10000);
            
            const paymentRecord = await prisma.payment.findUnique({
                where: { id: payment.id }
            });
            expect(paymentRecord?.status).toBe(PaymentStatus.COMPLETED);
            expect(paymentRecord?.amount.toString()).toBe('10000');
        });

        it('잔액 부족 - 결제 실패', async () => {
            await prisma.userBalance.update({
                where: { userId: testUser.id },
                data: { balance: 5000 }
            });

            await expect(
                paymentService.processPayment(testUser.id, testOrder.id)
            ).rejects.toThrow(BadRequestException);

            const finalBalance = await balanceService.getBalance(testUser.id);
            expect(finalBalance?.balance.toNumber()).toBe(5000);
        });

        it('동시 다중 결제 요청 - 락 경쟁으로 인해 하나만 성공', async () => {
            const numberOfRequests = 3;
            
            const results = await executeInParallel(
                () => paymentService.processPayment(testUser.id, testOrder.id),
                numberOfRequests
            );
            
            const successResults = results.filter(r => r.success);
            const failureResults = results.filter(r => !r.success);
            
            expect(successResults).toHaveLength(1);
            expect(failureResults).toHaveLength(numberOfRequests - 1);
            
            const finalBalance = await balanceService.getBalance(testUser.id);
            expect(finalBalance?.balance.toNumber()).toBe(10000);

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
            const cancelledPayment = await paymentService.cancelPayment(testUser.id, paymentId);

            expect(cancelledPayment.status).toBe(PaymentStatus.CANCELLED);
            
            const finalBalance = await balanceService.getBalance(testUser.id);
            expect(finalBalance?.balance.toNumber()).toBe(20000);
            
            const order = await orderService.findOrderById(testOrder.id);
            expect(order?.status).toBe('CANCELLED');

            const userBalance = await balanceRepository.findByUserId(testUser.id);
            if (!userBalance) throw new Error('Balance not found');

            const refundHistory = await prisma.balanceHistory.findFirst({
                where: {
                    userBalanceId: userBalance.id,
                    type: 'REFUND'
                },
                orderBy: {
                    createdAt: 'desc'
                }
            });
            expect(refundHistory).toBeDefined();
            expect(refundHistory?.amount.toString()).toBe('10000');
        });

        it('동시 취소 요청 - 락 경쟁으로 인해 하나만 성공', async () => {
            const numberOfRequests = 3;
            
            const results = await executeInParallel(
                () => paymentService.cancelPayment(testUser.id, paymentId),
                numberOfRequests
            );
            
            const successResults = results.filter(r => r.success);
            const failureResults = results.filter(r => !r.success);
            
            expect(successResults).toHaveLength(1);
            expect(failureResults).toHaveLength(numberOfRequests - 1);
            
            const finalBalance = await balanceService.getBalance(testUser.id);
            expect(finalBalance?.balance.toNumber()).toBe(20000);

            const userBalance = await balanceRepository.findByUserId(testUser.id);
            if (!userBalance) throw new Error('Balance not found');

            const refundHistories = await prisma.balanceHistory.findMany({
                where: {
                    userBalanceId: userBalance.id,
                    type: 'REFUND'
                }
            });
            expect(refundHistories).toHaveLength(1);
        });

        it('이미 취소된 결제 재취소 시도 - 실패', async () => {
            await paymentService.cancelPayment(testUser.id, paymentId);

            await expect(
                paymentService.cancelPayment(testUser.id, paymentId)
            ).rejects.toThrow(BadRequestException);
        });
    });
});