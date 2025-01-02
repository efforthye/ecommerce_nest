import { Body, Controller, Get, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { ChargeBalanceDto } from "../dto/balance.dto";

@Controller('balance')
@ApiTags('balance')
export class BalanceController {
    @Get()
    @ApiOperation({ summary: '잔액 조회' })
    getBalance() {
        return {
            balance: 50000
        };
    }

    @Post('charge')
    @ApiOperation({ summary: '잔액 충전' })
    chargeBalance(@Body() dto: ChargeBalanceDto) {
        return {
            success: true,
            balance: 50000 + dto.amount
        };
    }
}
