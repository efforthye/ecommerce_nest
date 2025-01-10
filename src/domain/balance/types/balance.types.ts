import { BalanceType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

export interface Balance {
    id: number;
    userId: number;
    balance: Decimal;
    updatedAt: Date;
    createdAt: Date;
}

export interface BalanceHistory {
    id: number;
    userBalanceId: number;
    type: BalanceType;
    amount: Decimal;
    afterBalance: Decimal;
    createdAt: Date;
}