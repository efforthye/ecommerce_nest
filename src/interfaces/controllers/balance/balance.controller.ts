
import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import { BalanceService } from 'src/domain/balance/service/balance.service';

@ApiTags('잔액')
@Controller('balance')
export class BalanceController {
    constructor(private readonly balanceService: BalanceService) {}

    @ApiOperation({ summary: '유저 잔액 조회' })
    @ApiParam({ name: 'userId', description: '유저 아이디' })
    @ApiResponse({ status: 200, schema: { example: { userId: 1, balance: 10000 }}})
    @Get(':userId')
    async getBalance(@Param('userId') userId: string) {
        const id = parseInt(userId, 10);
        return this.balanceService.getBalance(id);
    }

    @ApiOperation({ summary: '유저 잔액 충전' })
    @ApiParam({ name: 'userId', description: '유저 아이디' })
    @ApiBody({ schema: { example: { amount: 10000 }}})
    @ApiResponse({ status: 200, schema: { example: { userId: 1, balance: 20000, chargedAmount: 10000 }}})
    @Post(':userId/charge')
    async chargeBalance(
        @Param('userId') userId: string,
        @Body('amount') amount: number,
    ) {
        const id = parseInt(userId, 10);
        return this.balanceService.chargeBalance(id, amount);
    }
}
