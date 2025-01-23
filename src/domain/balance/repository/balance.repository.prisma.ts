import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
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

    async chargeBalanceWithTransaction(userId: number, amount: number): Promise<UserBalance> {
        let retries = 1;

        while (retries > 0) {
            try {
                return await this.prisma.$transaction(async (tx) => {
                    const currentBalance = await tx.userBalance.findUnique({ where: { userId } });

                    let updatedBalance;
                    if (currentBalance) {
                        const expectedBalance = Number(currentBalance.balance);
                        const latestBalance = await tx.userBalance.findUnique({ where: { userId }});

                        if (Number(latestBalance?.balance) !== expectedBalance) throw new ConflictException('Balance was modified');

                        updatedBalance = await tx.userBalance.update({
                            where: { userId },
                            data: { balance: { increment: amount } }
                        });
                    } else {
                        updatedBalance = await tx.userBalance.create({data: { userId, balance: amount }});
                    }

                    await this.createBalanceHistory(
                        updatedBalance.id,
                        BalanceType.CHARGE,
                        amount,
                        Number(updatedBalance.balance),
                        tx
                    );

                    return updatedBalance;
                }, {
                    isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead
                });
            } catch (error) {
                if (error instanceof ConflictException && retries > 1) {
                    retries--;
                    await new Promise(resolve => setTimeout(resolve, 100));
                    continue;
                }
                throw error;
            }
        }

        throw new ConflictException('Failed to update balance after retries');
    }

    async deductBalance(
        userId: number, 
        amount: number, 
        tx: Prisma.TransactionClient
    ): Promise<UserBalance> {
        const currentBalance = await tx.userBalance.findUnique({where: { userId }});

        if (!currentBalance) throw new NotFoundException('Balance not found');

        const expectedBalance = Number(currentBalance.balance);
        const latestBalance = await tx.userBalance.findUnique({
            where: { userId }
        });

        if (Number(latestBalance?.balance) !== expectedBalance) throw new ConflictException('Balance was modified');
        if (expectedBalance < amount) throw new BadRequestException('Insufficient balance');

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