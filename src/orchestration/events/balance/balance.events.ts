export enum BalanceEvents {
    BALANCE_CHECK_REQUESTED = 'balance.check.requested',
    BALANCE_CHECK_COMPLETED = 'balance.check.completed',
    BALANCE_DEDUCTION_REQUESTED = 'balance.deduction.requested',
    BALANCE_DEDUCTION_COMPLETED = 'balance.deduction.completed',
    BALANCE_CHARGE_REQUESTED = 'balance.charge.requested',
    BALANCE_CHARGE_COMPLETED = 'balance.charge.completed',
    BALANCE_CHARGE_FAILED = 'balance.charge.faild'
}

export interface BalanceCheckEvent {
    userId: number;
}

export interface BalanceDeductionEvent {
    userId: number;
    amount: number;
    orderId: number;
}

export interface BalanceChargeEvent {
    userId: number;
    amount: number;
}