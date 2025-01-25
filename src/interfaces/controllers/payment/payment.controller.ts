import { Controller, Post, Body, Get, Query, Param, UseGuards, BadRequestException, UseInterceptors } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiParam, ApiQuery, ApiHeader } from '@nestjs/swagger';
import { PaymentService } from 'src/domain/payment/service/payment.service';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { Payment } from '@prisma/client';
import { ParseUserIdInterceptor } from 'src/common/interceptors/parse-user-id.interceptor';

@ApiTags('결제')
@Controller('payments')
@UseGuards(JwtAuthGuard)
@UseInterceptors(ParseUserIdInterceptor)
@ApiHeader({ name: 'x-bypass-token', required: true, description: '인증 토큰 (temp bypass key: happy-world-token)', schema: { type: 'string' } })
export class PaymentController {
    constructor(private readonly paymentService: PaymentService) {}

    /**
     * 결제 처리
     */
    @ApiOperation({ summary: '결제 처리' }) 
    @ApiBody({ schema: { type: 'object', required: ['userId', 'orderId'], properties: { userId: { type: 'number', example: 1 }, orderId: { type: 'number', example: 1 } } } }) 
    @ApiResponse({ status: 201, description: '결제 처리 성공', schema: { example: { id: 1, orderId: 1, userId: 1, paymentMethod: "BALANCE", amount: "50000", status: "COMPLETED", pgTransactionId: "BAL_1642320000000_1", createdAt: "2024-01-16T10:00:00.000Z", updatedAt: "2024-01-16T10:00:00.000Z" } } })
    @ApiResponse({ status: 400, description: '잘못된 요청', schema: { example: { message: '잔액이 부족합니다.', error: 'Bad Request', statusCode: 400 } } })
    @ApiResponse({ status: 401, description: '인증 실패', schema: { example: { message: '유효하지 않은 토큰입니다.', error: 'Unauthorized', statusCode: 401 } } })
    @ApiResponse({ status: 409, description: '데드락/타임아웃', schema: { example: { message: 'Lock acquisition timeout', error: 'Conflict', statusCode: 409 } } })
    @Post() 
    async processPayment(
        @Body('userId') userId: number, 
        @Body('orderId') orderId: number
    ): Promise<Payment> {
        if (!userId || !orderId) {
            throw new BadRequestException('userId와 orderId는 필수값 입니다.');
        }
        return this.paymentService.processPayment(userId, orderId);
    }

    @ApiOperation({ summary: '결제 내역 조회' }) 
    @ApiQuery({ name: 'userId', required: true, type: 'string', description: '유저 아이디 (숫자 형태의 문자열)' }) 
    @ApiQuery({ name: 'page', required: false, type: 'string', description: '페이지 번호 (기본값: 1)' }) 
    @ApiQuery({ name: 'pageSize', required: false, type: 'string', description: '페이지당 항목 수 (기본값: 10)' }) 
    @ApiResponse({ status: 200, description: '결제 내역 조회 성공' }) 
    @Get() 
    async getPayments(
        @Query('userId') userId: string, 
        @Query('page') page: string = '1', 
        @Query('pageSize') pageSize: string = '10'
    ) {
        const numericUserId = Number(userId);
        const numericPage = Number(page);
        const numericPageSize = Number(pageSize);

        if (isNaN(numericUserId) || numericUserId <= 0) throw new BadRequestException('userId는 올바른 숫자여야 합니다.');

        return await this.paymentService.getUserPayments(numericUserId, { 
            page: isNaN(numericPage) ? 1 : numericPage, 
            pageSize: isNaN(numericPageSize) ? 10 : numericPageSize 
        });
    }

    /**
     * 특정 결제 상세 조회
     */
    @ApiOperation({ summary: '특정 결제 상세 조회' }) 
    @ApiParam({ name: 'id', required: true, type: 'number', description: '결제 아이디' }) 
    @ApiQuery({ name: 'userId', required: true, type: 'string', description: '유저 아이디 (숫자 형태의 문자열)' }) 
    @ApiResponse({ status: 200, description: '결제 상세 조회 성공', schema: { example: { id: 1, orderId: 1, userId: 1, paymentMethod: "BALANCE", amount: "50000", status: "COMPLETED", pgTransactionId: "BAL_1642320000000_1", createdAt: "2024-01-16T10:00:00.000Z", updatedAt: "2024-01-16T10:00:00.000Z" } } })
    @Get(':id') 
    async getPaymentDetail(
        @Param('id') paymentId: string,
        @Query('userId') userId: string,
    ) {
        const numericUserId = Number(userId);
        const numericPaymentId = Number(paymentId);

        if (isNaN(numericUserId)) throw new BadRequestException('userId는 숫자여야 합니다.');
        if (isNaN(numericPaymentId)) throw new BadRequestException('paymentId는 숫자여야 합니다.');

        return await this.paymentService.getPaymentDetail(numericUserId, numericPaymentId);
    }

    /**
     * 결제 취소
     */
    @ApiOperation({ summary: '결제 취소' }) 
    @ApiParam({ name: 'id', required: true, type: 'number', description: '결제 아이디' }) 
    @ApiQuery({ name: 'userId', required: true, type: 'string', description: '유저 아이디 (숫자 형태의 문자열)' }) 
    @ApiResponse({ status: 200, description: '결제 취소 성공', schema: { example: { id: 1, orderId: 1, userId: 1, paymentMethod: "BALANCE", amount: "50000", status: "CANCELLED", pgTransactionId: "BAL_1642320000000_1", createdAt: "2024-01-16T10:00:00.000Z", updatedAt: "2024-01-16T10:00:00.000Z" } } })
    @Post(':id/cancel') 
    async cancelPayment(
        @Param('id') paymentId: string, 
        @Query('userId') userId: string,
    ) {
        const numericUserId = Number(userId);
        const numericPaymentId = Number(paymentId);

        if (isNaN(numericUserId)) throw new BadRequestException('userId는 숫자여야 합니다.');
        if (isNaN(numericPaymentId)) throw new BadRequestException('paymentId는 숫자여야 합니다.');

        return await this.paymentService.cancelPayment(numericUserId, numericPaymentId);
    }
}