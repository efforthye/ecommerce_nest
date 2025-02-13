import { Injectable } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { 
    PaymentEvents, 
    PaymentInitiatedEvent,
    BalanceEvents 
} from '../../events';
import { PaymentService } from 'src/domain/payment/service/payment.service';

@Injectable()
export class PaymentOrchestrator {
    constructor(
        private readonly eventEmitter: EventEmitter2,
        private readonly paymentService: PaymentService
    ) {}

    @OnEvent(PaymentEvents.PAYMENT_INITIATED)
    async handlePaymentInitiation(payload: PaymentInitiatedEvent) {
        // 잔액 차감 요청
        this.eventEmitter.emit(BalanceEvents.BALANCE_DEDUCTION_REQUESTED, {
            userId: payload.userId,
            amount: payload.amount,
            orderId: payload.orderId
        });
    }

    @OnEvent(BalanceEvents.BALANCE_DEDUCTION_COMPLETED)
    async handleBalanceDeductionComplete(payload: any) {
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
            this.eventEmitter.emit(PaymentEvents.PAYMENT_FAILED, {
                orderId: payload.orderId,
                userId: payload.userId,
                reason: error.message
            });
        }
    }
}