import { Body, Controller, Get, Post } from "@nestjs/common";
import { ApiOperation, ApiTags, ApiResponse, ApiBody } from "@nestjs/swagger";
import { ChargeBalanceDto } from "../dto/balance.dto";

@Controller('balance')
@ApiTags('balance')
export class BalanceController {
    @Get()
    @ApiOperation({ summary: '잔액 조회' })
    @ApiResponse({
        status: 200,
        description: '현재 잔액을 반환합니다.',
        schema: {
            example: {
                balance: 50000
            }
        }
    })
    @ApiResponse({
        status: 401,
        description: '인증되지 않은 사용자의 요청입니다.'
    })
    getBalance() {
        // 잔액 조회 로직
        return {
            balance: 50000
        };
    }

    @Post('charge')
    @ApiOperation({ summary: '잔액 충전' })
    @ApiBody({
        description: '충전 요청에 필요한 데이터',
        type: ChargeBalanceDto,
        examples: {
            example1: {
                summary: '충전 요청 예제',
                value: {
                    amount: 10000
                }
            }
        }
    })
    @ApiResponse({
        status: 200,
        description: '잔액 충전에 성공한 경우',
        schema: {
            example: {
                success: true,
                balance: 60000
            }
        }
    })
    @ApiResponse({
        status: 400,
        description: '요청 데이터가 유효하지 않거나 오류가 발생한 경우',
        schema: {
            example: {
                success: false,
                message: "Invalid request data"
            }
        }
    })
    chargeBalance(@Body() dto: ChargeBalanceDto) {
        // 잔액 충전 로직
        return {
            success: true,
            balance: 50000 + dto.amount
        };
    }
}
