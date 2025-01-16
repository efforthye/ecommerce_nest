import { Inject, Injectable, Scope } from '@nestjs/common';
import { BalanceRepository } from '../repository/balance.repository';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { BalanceType, Prisma } from '@prisma/client'; 
import { BALANCE_REPOSITORY } from 'src/common/constants/app.constants';
import { REQUEST } from '@nestjs/core';

@Injectable({ scope: Scope.REQUEST })
export class BalanceService {
    constructor(
        @Inject(BALANCE_REPOSITORY) 
        private readonly balanceRepository: BalanceRepository,
        private readonly prisma: PrismaService,
        @Inject(REQUEST) private readonly request: Request
    ) {}

    // 유저 잔액 조회
    async getBalance(userId: number) {
        return this.balanceRepository.findByUserId(userId);
    }

    // 유저 잔액 충전
    async chargeBalance(userId: number, amount: number) {
        // request에서 외부 트랜잭션(커스텀 락)객체가 있는 경우 사용
        const tx = (this.request as any).prismaTransaction || this.prisma;
        
        // 잔액 업데이트
        const updatedBalance = await this.balanceRepository.chargeBalance(userId, amount, tx);

        // 잔액 변동 이력 추가
        await this.balanceRepository.createBalanceHistory(
            updatedBalance.id,
            BalanceType.CHARGE,
            amount,
            Number(updatedBalance.balance),
            tx
        );

        return updatedBalance;
    }
}