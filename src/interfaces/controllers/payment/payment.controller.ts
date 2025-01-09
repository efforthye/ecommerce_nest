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
    @ApiHeader({ name: 'authorization', required: true })
    @ApiResponse({ status: 200, description: '결제 처리 성공' })
    @ApiResponse({ status: 400, description: '잘못된 요청' })
    @Post()
    async processPayment(
        @Headers('authorization') authHeader: string,
        @Body('userId') userId: number,
        @Body('orderId') orderId: number
    ) {
        if (!authHeader) {
            throw new BadRequestException("Invalid or missing authorization token");
        }
        return await this.paymentService.processPayment(userId, orderId);
    }

    /**
     * 결제 내역 조회
     */
    @ApiOperation({ summary: '결제 내역 조회' })
    @ApiHeader({ name: 'authorization', required: true })
    @ApiQuery({ name: 'userId', required: true, description: '사용자 ID' })
    @ApiQuery({ name: 'page', required: false, description: '페이지 번호' })
    @ApiQuery({ name: 'pageSize', required: false, description: '페이지당 항목 수' })
    @ApiResponse({ status: 200, description: '결제 내역 조회 성공' })
    @Get()
    async getPayments(
        @Headers('authorization') authHeader: string,
        @Query('userId') userId: number,
        @Query('page') page?: number,
        @Query('pageSize') pageSize?: number
    ) {
        if (!authHeader) {
            throw new BadRequestException("Invalid or missing authorization token");
        }
        if (!userId) {
            throw new BadRequestException("User ID is required");
        }

        const pagination = {
            page: page || 1,
            pageSize: pageSize || 10
        };

        return await this.paymentService.getUserPayments(userId, pagination);
    }

    /**
     * 특정 결제 상세 조회
     */
    @ApiOperation({ summary: '특정 결제 상세 조회' })
    @ApiHeader({ name: 'authorization', required: true })
    @ApiParam({ name: 'id', description: '결제 ID' })
    @ApiQuery({ name: 'userId', required: true, description: '사용자 ID' })
    @ApiResponse({ status: 200, description: '결제 상세 조회 성공' })
    @Get(':id')
    async getPaymentDetail(
        @Headers('authorization') authHeader: string,
        @Param('id') paymentId: number,
        @Query('userId') userId: number
    ) {
        if (!authHeader) {
            throw new BadRequestException("Invalid or missing authorization token");
        }
        if (!userId) {
            throw new BadRequestException("User ID is required");
        }
        
        return await this.paymentService.getPaymentDetail(userId, paymentId);
    }

    /**
     * 결제 취소
     */
    @ApiOperation({ summary: '결제 취소' })
    @ApiHeader({ name: 'authorization', required: true })
    @ApiParam({ name: 'id', description: '결제 ID' })
    @ApiQuery({ name: 'userId', required: true, description: '사용자 ID' })
    @ApiResponse({ status: 200, description: '결제 취소 성공' })
    @Post(':id/cancel')
    async cancelPayment(
        @Headers('authorization') authHeader: string,
        @Param('id') paymentId: number,
        @Query('userId') userId: number
    ) {
        if (!authHeader) {
            throw new BadRequestException("Invalid or missing authorization token");
        }
        if (!userId) {
            throw new BadRequestException("User ID is required");
        }

        return await this.paymentService.cancelPayment(userId, paymentId);
    }
}