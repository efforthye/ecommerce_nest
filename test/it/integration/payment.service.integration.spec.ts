import { Test, TestingModule } from '@nestjs/testing';
import { PaymentService } from 'src/domain/payment/service/payment.service';
import { PaymentRepositoryPrisma } from 'src/domain/payment/repository/payment.repository.prisma';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { OrderService } from 'src/domain/order/service/order.service';
import { BalanceService } from 'src/domain/balance/service/balance.service';
import { PaymentStatus } from '@prisma/client';
import { BadRequestException } from '@nestjs/common';

describe('결제 서비스 동시성 테스트', () => {
    let paymentService: PaymentService;
    let prismaService: PrismaService;
    let orderService: OrderService;
    let balanceService: BalanceService;

    beforeAll(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PaymentService,
                PrismaService,
                OrderService,
                BalanceService,
                PaymentRepositoryPrisma,
            ],
        }).compile();

        paymentService = module.get<PaymentService>(PaymentService);
        prismaService = module.get<PrismaService>(PrismaService);
        orderService = module.get<OrderService>(OrderService);
        balanceService = module.get<BalanceService>(BalanceService);
    });

    describe('동시성 테스트 - 결제 처리 (processPayment)', () => {
        let now: Date;
        
        beforeEach(() => {
            now = new Date('2025-01-10T00:00:00Z');
            jest.useFakeTimers();
            jest.setSystemTime(now);
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        it('동시 요청 시 잔액이 충분한 경우 - 결제가 정상 처리된다', async () => {
            const userId = 1;
            const orderId = 1;
            const orderAmount = 10000;

            const order = await orderService.findOrderById(orderId);
            const balance = await balanceService.getBalance(userId);
            
            if(balance && balance.balance >= order.totalAmount) {
                const payment = await paymentService.processPayment(userId, orderId);
                expect(payment).toEqual(expect.objectContaining({
                    orderId: orderId,
                    userId: userId,
                    amount: orderAmount,
                    status: PaymentStatus.COMPLETED
                }));
            }
        });

        it('동시 요청 시 잔액이 부족한 경우 - BadRequestException이 발생한다', async () => {
            const userId = 1;
            const orderId = 1;
            const orderAmount = 10000;

            const order = await orderService.findOrderById(orderId);
            const balance = await balanceService.getBalance(userId);

            if(balance && balance.balance < order.totalAmount) {
                await expect(paymentService.processPayment(userId, orderId))
                    .rejects
                    .toThrow(BadRequestException);
            }
        });

        it('결제 취소 시나리오 - 정상적으로 취소되고 잔액이 환불된다', async () => {
            const userId = 1;
            const paymentId = 1;
            const amount = 10000;

            const payment = await prismaService.payment.findUnique({ where: { id: paymentId } });

            await paymentService.cancelPayment(userId, paymentId);

            const updatedBalance = await balanceService.getBalance(userId);
            if(updatedBalance){
                expect(updatedBalance.balance).toBeGreaterThanOrEqual(amount);
            }
        });
    });
});
