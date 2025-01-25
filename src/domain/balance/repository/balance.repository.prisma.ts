import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { BalanceHistory, BalanceType, Prisma, UserBalance } from "@prisma/client";
import { PrismaService } from "src/infrastructure/database/prisma.service";
import { BalanceRepository } from "./balance.repository";

@Injectable()
export class BalanceRepositoryPrisma implements BalanceRepository {
    constructor(private readonly prisma: PrismaService) {}

    async findByUserId(userId: number): Promise<UserBalance | null> {
        return this.prisma.userBalance.findUnique({
            where: { userId },
        });
    }

    async chargeBalance(userId: number, amount: number, tx?: Prisma.TransactionClient): Promise<UserBalance> {
        if (tx) {
            return this.chargeBalanceWithTx(userId, amount, tx);
        }
        return this.chargeBalanceWithNewTx(userId, amount);
    }

    private async chargeBalanceWithTx(userId: number, amount: number, tx: Prisma.TransactionClient): Promise<UserBalance> {
        const result = await tx.$queryRaw<UserBalance[]>`
            SELECT * FROM UserBalance 
            WHERE userId = ${userId}
            FOR UPDATE`;

        const userBalance = result[0];
        if (!userBalance) {
            const newBalance = await tx.userBalance.create({
                data: { userId, balance: amount }
            });

            await this.createBalanceHistory(
                newBalance.id,
                BalanceType.REFUND,
                amount,
                Number(newBalance.balance),
                tx
            );

            return newBalance;
        }

        const updatedBalance = await tx.userBalance.update({
            where: { userId },
            data: { balance: { increment: amount } }
        });

        await this.createBalanceHistory(
            updatedBalance.id,
            BalanceType.REFUND,
            amount,
            Number(updatedBalance.balance),
            tx
        );

        return updatedBalance;
    }

    private async chargeBalanceWithNewTx(userId: number, amount: number): Promise<UserBalance> {
        return this.prisma.$transaction(async (tx) => {
            return this.chargeBalanceWithTx(userId, amount, tx);
        }, {
            isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
            timeout: 5000
        });
    }

    async deductBalance(userId: number, amount: number, tx: Prisma.TransactionClient): Promise<UserBalance> {
        const result = await tx.$queryRaw<UserBalance[]>`
            SELECT * FROM UserBalance 
            WHERE userId = ${userId}
            FOR UPDATE`;

        const userBalance = result[0];
        if (!userBalance) {
            throw new NotFoundException('Balance not found');
        }

        if (userBalance.balance.lessThan(amount)) {
            throw new BadRequestException('Insufficient balance');
        }

        const updatedBalance = await tx.userBalance.update({
            where: { userId },
            data: { balance: { decrement: amount } }
        });

        await this.createBalanceHistory(
            updatedBalance.id,
            BalanceType.USE,
            amount,
            Number(updatedBalance.balance),
            tx
        );

        return updatedBalance;
    }

    async createBalanceHistory(
        userBalanceId: number,
        type: BalanceType,
        amount: number,
        afterBalance: number,
        tx: Prisma.TransactionClient
    ): Promise<BalanceHistory> {
        return tx.balanceHistory.create({
            data: {
                userBalanceId,
                type,
                amount,
                afterBalance,
            },
        });
    }
}