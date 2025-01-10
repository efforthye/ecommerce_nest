
import { Injectable } from '@nestjs/common';
import { BalanceHistory, Prisma, UserBalance } from '@prisma/client';
import { PrismaService } from 'src/infrastructure/database/prisma.service';


export interface BalanceRepository {
    findByUserId(userId: number): Promise<UserBalance | null>;
    chargeBalance(userId: number, amount: number, tx?: Prisma.TransactionClient): Promise<UserBalance>;
    createBalanceHistory(
        userBalanceId: number,
        type: string,
        amount: number,
        afterBalance: number,
        tx?: Prisma.TransactionClient
    ): Promise<BalanceHistory>;
}