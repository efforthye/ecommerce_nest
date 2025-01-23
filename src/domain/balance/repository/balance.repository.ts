import { BalanceHistory, BalanceType, Prisma, UserBalance } from '@prisma/client';


export interface BalanceRepository {
    findByUserId(userId: number): Promise<UserBalance | null>;
    chargeBalanceWithTransaction(userId: number, amount: number): Promise<UserBalance>;
    createBalanceHistory(
        userBalanceId: number,
        type: BalanceType,
        amount: number,
        afterBalance: number,
        tx: Prisma.TransactionClient
    ): Promise<BalanceHistory>;
    deductBalance(userId: number, amount: number, tx: Prisma.TransactionClient): Promise<UserBalance>;
}