import { Inject, Injectable, Scope } from '@nestjs/common';
import { BalanceRepository } from '../repository/balance.repository';
import { BALANCE_REPOSITORY } from 'src/common/constants/app.constants';

@Injectable()
export class BalanceService {
    constructor(
        @Inject(BALANCE_REPOSITORY) 
        private readonly balanceRepository: BalanceRepository
    ) {}

    async getBalance(userId: number) {
        return this.balanceRepository.findByUserId(userId);
    }

    async chargeBalance(userId: number, amount: number) {
        return this.balanceRepository.chargeBalanceWithTransaction(userId, amount);
    }
}