
import { Controller, Post, Body, Param, Patch } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import { OrderService } from 'src/domain/order/service/order.service';

@ApiTags('주문')
@Controller('order')
export class OrderController {
    constructor(private readonly orderService: OrderService) {}

    @ApiOperation({ summary: '주문 생성' })
    @ApiParam({ name: 'userId', description: '유저 아이디' })
    @ApiBody({ schema: { example: { totalAmount: 50000, discountAmount: 5000, finalAmount: 45000 }}})
    @ApiResponse({ status: 201, schema: { example: { orderId: 1, userId: 1, totalAmount: 50000, discountAmount: 5000, finalAmount: 45000, status: 'CREATED' }}})
    @Post(':userId')
    async createOrder(
        @Param('userId') userId: number,
        @Body() body: { totalAmount: number; discountAmount: number; finalAmount: number },
    ) {
        return this.orderService.createOrder(userId, body.totalAmount, body.discountAmount, body.finalAmount);
    }

    @ApiOperation({ summary: '주문 상태 업데이트' })
    @ApiParam({ name: 'orderId', description: '주문 ID' })
    @ApiBody({ schema: { example: { status: 'PAID' }}})
    @ApiResponse({ status: 200, schema: { example: { orderId: 1, status: 'PAID', updatedAt: '2025-01-10T12:00:00Z' }}})
    @Patch(':orderId/status')
    async updateOrderStatus(
        @Param('orderId') orderId: number, 
        @Body() body: { status: string }
    ) {
        return this.orderService.updateOrderStatus(orderId, body.status);
    }
}