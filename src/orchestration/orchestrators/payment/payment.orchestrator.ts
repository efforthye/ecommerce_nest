import { Injectable } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { 
    PaymentEvents, 
    PaymentInitiatedEvent,
    BalanceEvents 
} from '../../events';
import { PaymentService } from 'src/domain/payment/service/payment.service';
import { PrismaService } from 'src/infrastructure/database/prisma.service';

@Injectable()
export class PaymentOrchestrator {
    constructor(
        private readonly eventEmitter: EventEmitter2,
        private readonly paymentService: PaymentService,
        private readonly prisma: PrismaService
    ) {}

    @OnEvent(PaymentEvents.PAYMENT_INITIATED)
    async handlePaymentInitiation(payload: PaymentInitiatedEvent) {
        try {
            // 주문 정보 조회
            const order = await this.prisma.order.findUnique({
                where: { id: payload.orderId }
            });

            if (!order) {
                throw new Error('Order not found');
            }

            // 잔액 차감 요청
            this.eventEmitter.emit(BalanceEvents.BALANCE_DEDUCTION_REQUESTED, {
                userId: payload.userId,
                amount: Number(order.finalAmount),
                orderId: payload.orderId
            });
        } catch (error) {
            this.eventEmitter.emit(PaymentEvents.PAYMENT_FAILED, {
                orderId: payload.orderId,
                userId: payload.userId,
                reason: error.message
            });
        }
    }

    @OnEvent(BalanceEvents.BALANCE_DEDUCTION_COMPLETED)
    async handleBalanceDeductionComplete(payload: {
        userId: number;
        orderId: number;
        deductedAmount: number;
    }) {
        try {
            const payment = await this.paymentService.processPayment(
                payload.userId,
                payload.orderId
            );

            this.eventEmitter.emit(PaymentEvents.PAYMENT_COMPLETED, {
                paymentId: payment.id,
                orderId: payload.orderId,
                userId: payload.userId,
                amount: payment.amount,
                status: payment.status
            });
        } catch (error) {
            // 결제 실패 시 잔액 환불 처리
            this.eventEmitter.emit(BalanceEvents.BALANCE_CHARGE_REQUESTED, {
                userId: payload.userId,
                amount: payload.deductedAmount
            });

            this.eventEmitter.emit(PaymentEvents.PAYMENT_FAILED, {
                orderId: payload.orderId,
                userId: payload.userId,
                reason: error.message
            });
        }
    }
}