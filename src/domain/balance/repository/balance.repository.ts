import { BalanceHistory, BalanceType, Prisma, UserBalance } from '@prisma/client';

export interface BalanceRepository {
    findByUserId(userId: number): Promise<UserBalance | null>;
    chargeBalance(userId: number, amount: number, tx?: Prisma.TransactionClient): Promise<UserBalance>;
    deductBalance(userId: number, amount: number, tx: Prisma.TransactionClient): Promise<UserBalance>;
    createBalanceHistory(
        userBalanceId: number,
        type: BalanceType,
        amount: number,
        afterBalance: number,
        tx: Prisma.TransactionClient
    ): Promise<BalanceHistory>;
}