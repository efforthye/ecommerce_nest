import { Injectable } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { 
    BalanceEvents, 
    BalanceDeductionEvent,
    PaymentEvents, 
    BalanceChargeEvent
} from '../../events';
import { BalanceService } from 'src/domain/balance/service/balance.service';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { BalanceType, Prisma } from '@prisma/client';

@Injectable()
export class BalanceOrchestrator {
    constructor(
        private readonly eventEmitter: EventEmitter2,
        private readonly balanceService: BalanceService,
        private readonly prisma: PrismaService
    ) {}

    @OnEvent(BalanceEvents.BALANCE_DEDUCTION_REQUESTED)
    async handleBalanceDeduction(payload: BalanceDeductionEvent) {
        try {
            const updatedBalance = await this.prisma.$transaction(async (tx) => {
                // 잔액 차감
                const balance = await this.balanceService.deductBalance(
                    payload.userId,
                    payload.amount
                );

                // 잔액 이력 생성
                await tx.balanceHistory.create({
                    data: {
                        userBalanceId: balance.id,
                        type: BalanceType.USE,
                        amount: new Prisma.Decimal(payload.amount),
                        afterBalance: balance.balance
                    }
                });

                return balance;
            });

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
                reason: error.message || 'Insufficient balance'
            });
        }
    }

    @OnEvent(BalanceEvents.BALANCE_CHARGE_REQUESTED)
    async handleBalanceCharge(payload: BalanceChargeEvent) {
        try {
            const updatedBalance = await this.prisma.$transaction(async (tx) => {
                // 잔액 충전
                const balance = await this.balanceService.chargeBalance(
                    payload.userId,
                    payload.amount
                );

                // 잔액 이력 생성
                await tx.balanceHistory.create({
                    data: {
                        userBalanceId: balance.id,
                        type: BalanceType.CHARGE,
                        amount: new Prisma.Decimal(payload.amount),
                        afterBalance: balance.balance
                    }
                });

                return balance;
            });

            this.eventEmitter.emit(BalanceEvents.BALANCE_CHARGE_COMPLETED, {
                userId: payload.userId,
                chargedAmount: payload.amount,
                currentBalance: updatedBalance.balance
            });
        } catch (error) {
            this.eventEmitter.emit(BalanceEvents.BALANCE_CHARGE_FAILED, {
                userId: payload.userId,
                amount: payload.amount,
                reason: error.message
            });
        }
    }
}