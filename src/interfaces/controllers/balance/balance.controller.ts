import { Controller, Get, Post, Param, Body, UseGuards, UseInterceptors, Headers } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody, ApiHeader } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { BalanceService } from 'src/domain/balance/service/balance.service';
import { PessimisticLock } from 'src/common/decorators/pessimistic-lock.decorator';
import { PessimisticLockInterceptor } from 'src/common/interceptors/pessimistic-lock.interceptor';
import { ParseUserIdInterceptor } from 'src/common/interceptors/parse-user-id.interceptor';

@ApiTags('잔액')
@Controller('balance')
export class BalanceController {
    constructor(private readonly balanceService: BalanceService) {}

    @ApiOperation({ summary: '유저 잔액 조회' })
    @ApiHeader({ name: 'x-bypass-token', required: true, description: '인증 토큰 (temp bypass key: happy-world-token)', schema: { type: 'string' } })
    @ApiParam({ name: 'userId', description: '유저 아이디' })
    @ApiResponse({ status: 200, schema: { example: { id: 1, userId: 1, balance: 10000, updatedAt: '2024-01-16T12:00:00.000Z' } } })
    @ApiResponse({ status: 401, description: '인증 실패', schema: { example: { message: "잘못된 테스트 토큰입니다.", error: "Unauthorized", statusCode: 401 } } })
    @UseGuards(JwtAuthGuard)
    @UseInterceptors(ParseUserIdInterceptor)
    @Get(':userId')
    async getBalance(@Headers('x-bypass-token') bypassToken: string, @Param('userId') userId: number) {
        return this.balanceService.getBalance(userId);
    }

    @ApiOperation({ summary: '유저 잔액 충전' })
    @ApiHeader({ name: 'x-bypass-token', required: true, description: '인증 토큰 (temp bypass key: happy-world-token)', schema: { type: 'string' } })
    @ApiParam({ name: 'userId', description: '유저 아이디' }) 
    @ApiBody({ schema: { example: { amount: 10000 } } })
    @ApiResponse({ status: 200, schema: { example: { id: 1, userId: 1, balance: 20000, updatedAt: '2024-01-16T12:00:00.000Z', balanceHistory: { id: 1, userBalanceId: 1, type: 'CHARGE', amount: 10000, afterBalance: 20000, createdAt: '2024-01-16T12:00:00.000Z' } } } })
    @ApiResponse({ status: 401, description: '인증 실패', schema: { example: { message: "잘못된 테스트 토큰입니다.", error: "Unauthorized", statusCode: 401 } } })
    @UseGuards(JwtAuthGuard)
    @UseInterceptors(PessimisticLockInterceptor)
    @UseInterceptors(ParseUserIdInterceptor)
    @PessimisticLock({ resourceType: 'UserBalance', timeout: 5000, noWait: false })
    @Post(':userId/charge')
    async chargeBalance(@Headers('x-bypass-token') bypassToken: string, @Param('userId') userId: number, @Body('amount') amount: number) {
        return this.balanceService.chargeBalance(userId, amount);
    }
}