import { Inject, Injectable } from '@nestjs/common';
import { BalanceRepository } from '../repository/balance.repository';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { BalanceType } from '@prisma/client'; // BalanceType 열거형 가져오기
import { BALANCE_REPOSITORY } from 'src/common/constants/repository.constants';

@Injectable()
export class BalanceService {
    constructor(
        @Inject(BALANCE_REPOSITORY) 
        private readonly balanceRepository: BalanceRepository,
        private readonly prisma: PrismaService
    ) {}

    // 유저 잔액 조회
    async getBalance(userId: number) {
        return this.balanceRepository.findByUserId(userId);
    }

    // 유저 잔액 충전
    async chargeBalance(userId: number, amount: number) {
        return await this.prisma.$transaction(async (tx) => {
            // 잔액 업데이트
            const updatedBalance = await this.balanceRepository.chargeBalance(userId, amount, tx);

            // 잔액 변동 이력 추가
            await this.balanceRepository.createBalanceHistory(
                updatedBalance.id,
                BalanceType.CHARGE, // 열거형 값 사용
                amount,
                Number(updatedBalance.balance),
                tx
            );

            return updatedBalance;
        });
    }
}
