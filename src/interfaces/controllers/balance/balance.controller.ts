import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { BalanceService } from 'src/domain/balance/service/balance.service';

@Controller('balance')
export class BalanceController {
    constructor(private readonly balanceService: BalanceService) {}

    // 유저 잔액 조회 API
    @Get(':userId')
    async getBalance(@Param('userId') userId: string) {
        const id = parseInt(userId, 10);
        return this.balanceService.getBalance(id);
    }

    // 유저 잔액 충전 API
    @Post(':userId/charge')
    async chargeBalance(
        @Param('userId') userId: string,
        @Body('amount') amount: number,
    ) {
        const id = parseInt(userId, 10);
        return this.balanceService.chargeBalance(id, amount);
    }
}
