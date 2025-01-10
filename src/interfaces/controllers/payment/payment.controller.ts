import { Controller, Post, Body, Get, Query, Param, Headers, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiParam, ApiQuery, ApiHeader } from '@nestjs/swagger';
import { PaymentService } from 'src/domain/payment/service/payment.service';

@ApiTags('결제')
@Controller('payments')
export class PaymentController {
    constructor(private readonly paymentService: PaymentService) {}

    /**
     * 결제 처리
     */
    @ApiOperation({ summary: '결제 처리' })
    @ApiHeader({ name: 'authorization', description: 'Authorization 토큰', required: true })
    @ApiBody({
        description: '결제 요청 정보',
        schema: {
            type: 'object',
            properties: {
                userId: { type: 'number', description: '유저 아이디' },
                orderId: { type: 'number', description: '주문 아이디' },
            },
            required: ['userId', 'orderId'],
        },
    })
    @ApiResponse({ status: 200, description: '결제 처리 성공' })
    @ApiResponse({ status: 400, description: '잘못된 요청' })
    @Post()
    async processPayment(
        @Headers('authorization') authHeader: string,
        @Body('userId') userId: number,
        @Body('orderId') orderId: number,
    ) {
        return await this.paymentService.processPayment(userId, orderId);
    }

    /**
     * 결제 내역 조회
     */
    @ApiOperation({ summary: '결제 내역 조회' })
    @ApiHeader({ name: 'authorization', description: 'Authorization 토큰', required: true })
    @ApiQuery({ name: 'userId', required: true, description: '유저 아이디' })
    @ApiQuery({ name: 'page', required: false, description: '페이지 번호 (기본값: 1)' })
    @ApiQuery({ name: 'pageSize', required: false, description: '페이지당 항목 수 (기본값: 10)' })
    @ApiResponse({ status: 200, description: '결제 내역 조회 성공' })
    @ApiResponse({ status: 400, description: '잘못된 요청' })
    @Get()
    async getPayments(
        @Headers('authorization') authHeader: string,
        @Query('userId') userId: number,
        @Query('page') page?: number,
        @Query('pageSize') pageSize?: number,
    ) {
        if (!userId) {
            throw new BadRequestException('User ID is required');
        }

        const pagination = { page: page || 1, pageSize: pageSize || 10 };
        return await this.paymentService.getUserPayments(userId, pagination);
    }

    /**
     * 특정 결제 상세 조회
     */
    @ApiOperation({ summary: '특정 결제 상세 조회' })
    @ApiHeader({ name: 'authorization', description: 'Authorization 토큰', required: true })
    @ApiParam({ name: 'id', description: '결제 ID', required: true })
    @ApiQuery({ name: 'userId', required: true, description: '유저 아이디' })
    @ApiResponse({ status: 200, description: '결제 상세 조회 성공' })
    @ApiResponse({ status: 400, description: '잘못된 요청' })
    @Get(':id')
    async getPaymentDetail(
        @Headers('authorization') authHeader: string,
        @Param('id') paymentId: number,
        @Query('userId') userId: number,
    ) {
        if (!userId) {
            throw new BadRequestException('User ID is required');
        }

        return await this.paymentService.getPaymentDetail(userId, paymentId);
    }

    /**
     * 결제 취소
     */
    @ApiOperation({ summary: '결제 취소' })
    @ApiHeader({ name: 'authorization', description: 'Authorization 토큰', required: true })
    @ApiParam({ name: 'id', description: '결제 ID', required: true })
    @ApiQuery({ name: 'userId', required: true, description: '유저 아이디' })
    @ApiResponse({ status: 200, description: '결제 취소 성공' })
    @ApiResponse({ status: 400, description: '잘못된 요청' })
    @Post(':id/cancel')
    async cancelPayment(
        @Headers('authorization') authHeader: string,
        @Param('id') paymentId: number,
        @Query('userId') userId: number,
    ) {
        if (!userId) {
            throw new BadRequestException('User ID is required');
        }

        return await this.paymentService.cancelPayment(userId, paymentId);
    }
}
