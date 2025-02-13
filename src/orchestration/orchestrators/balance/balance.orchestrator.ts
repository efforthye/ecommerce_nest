import { Injectable } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { 
    BalanceEvents, 
    BalanceDeductionEvent,
    PaymentEvents 
} from '../../events';
import { BalanceService } from 'src/domain/balance/service/balance.service';

@Injectable()
export class BalanceOrchestrator {
    constructor(
        private readonly eventEmitter: EventEmitter2,
        private readonly balanceService: BalanceService
    ) {}

    @OnEvent(BalanceEvents.BALANCE_DEDUCTION_REQUESTED)
    async handleBalanceDeduction(payload: BalanceDeductionEvent) {
        try {
            const updatedBalance = await this.balanceService.deductBalance(
                payload.userId,
                payload.amount
            );

            this.eventEmitter.emit(BalanceEvents.BALANCE_DEDUCTION_COMPLETED, {
                userId: payload.userId,
                orderId: payload.orderId,
                deductedAmount: payload.amount,
                remainingBalance: updatedBalance.balance
            });
        } catch (error) {
            this.eventEmitter.emit(PaymentEvents.PAYMENT_FAILED, {
                userId: payload.userId,
                orderId: payload.orderId,
                reason: 'Insufficient balance'
            });
        }
    }
}