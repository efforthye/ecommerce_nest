import { Inject, Injectable } from '@nestjs/common';
import { UserBalance } from '@prisma/client';
import { BALANCE_REPOSITORY } from 'src/common/constants/app.constants';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { BalanceRepository } from '../repository/balance.repository';

@Injectable() 
export class BalanceService {
    constructor(
        @Inject(BALANCE_REPOSITORY)
        private readonly balanceRepository: BalanceRepository,
        private readonly prisma: PrismaService
    ) {}

    async getBalance(userId: number): Promise<UserBalance | null> {
        return this.balanceRepository.findByUserId(userId);
    }

    async chargeBalance(userId: number, amount: number): Promise<UserBalance> {
        return this.balanceRepository.chargeBalance(userId, amount);
    }

    async deductBalance(userId: number, amount: number): Promise<UserBalance> {
        return this.prisma.$transaction(async (tx) => {
            return this.balanceRepository.deductBalance(userId, amount, tx);
        });
    }
}