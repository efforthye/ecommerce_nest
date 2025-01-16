import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { UserBalance, BalanceHistory, Prisma, BalanceType } from '@prisma/client';
import { BalanceRepository } from 'src/domain/balance/repository/balance.repository';

@Injectable()
export class BalanceRepositoryPrisma implements BalanceRepository {
    constructor(private readonly prisma: PrismaService) {}

    async findByUserId(userId: number): Promise<UserBalance | null> {
        return this.prisma.userBalance.findUnique({
            where: { userId },
        });
    }

    async chargeBalance(
        userId: number,
        amount: number,
        tx?: Prisma.TransactionClient
    ): Promise<UserBalance> {
        const prisma = tx || this.prisma;
        const existingBalance = await prisma.userBalance.findUnique({
            where: { userId },
        });
    
        if (existingBalance) {
            return prisma.userBalance.update({
                where: { userId },
                data: {
                    balance: { increment: amount },
                },
            });
        }
    
        return prisma.userBalance.create({
            data: {
                userId,
                balance: amount,
            },
        });
    }
    
    async createBalanceHistory(
        userBalanceId: number,
        type: BalanceType,
        amount: number,
        afterBalance: number,
        tx?: Prisma.TransactionClient
    ): Promise<BalanceHistory> {
        const prisma = tx || this.prisma;
        return prisma.balanceHistory.create({
            data: {
                userBalanceId,
                type,
                amount,
                afterBalance,
            },
        });
    }
}
