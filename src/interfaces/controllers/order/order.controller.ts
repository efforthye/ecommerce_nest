import { Controller, Post, Body, Param, Patch, UseGuards, UseInterceptors, Headers } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody, ApiHeader } from '@nestjs/swagger';
import { OrderService } from 'src/domain/order/service/order.service';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { OrderStatus } from '@prisma/client';
import { PessimisticLockInterceptor } from 'src/common/interceptors/pessimistic-lock.interceptor';
import { CreateOrderDto } from 'src/interfaces/dto/order.dto';

@ApiTags('주문')
@Controller('order')
export class OrderController {
    constructor(private readonly orderService: OrderService) {}

    @ApiOperation({ summary: '주문 생성' })
    @ApiHeader({ name: 'x-bypass-token', required: true, description: '인증 토큰 (temp bypass key: happy-world-token)', schema: { type: 'string' } })
    @ApiParam({ name: 'userId', description: '유저 아이디' })
    @ApiBody({ schema: { example: { items: [{ productId: 1, variantId: 1, quantity: 2 }], couponId: 1}}})
    @ApiResponse({ status: 201, schema: { example: { id: 1, userId: 1, totalAmount: 50000, discountAmount: 5000, finalAmount: 45000, status: OrderStatus.PENDING, items: [] }}})
    @UseGuards(JwtAuthGuard)
    @UseInterceptors(PessimisticLockInterceptor)
    @Post(':userId')
    async createOrder(
        @Headers('x-bypass-token') bypassToken: string,
        @Param('userId') userId: number,
        @Body() createOrderDto: CreateOrderDto
    ) {
        console.log('CreateOrderDto:', createOrderDto);
        return this.orderService.createOrder(userId, createOrderDto);
    }

    @ApiOperation({ summary: '주문 상태 업데이트' })
    @ApiHeader({ name: 'x-bypass-token', required: true, description: '인증 토큰 (temp bypass key: happy-world-token)', schema: { type: 'string' } })
    @ApiParam({ name: 'orderId', description: '주문 ID' })
    @ApiBody({ schema: { example: { status: 'PAID' }, properties: { status: { type: 'string', enum: ['PENDING', 'PAID', 'SHIPPING', 'DELIVERED', 'CANCELLED'], description: 'PENDING: 주문 대기, PAID: 결제 완료, SHIPPING: 배송중, DELIVERED: 배송 완료, CANCELLED: 주문 취소' } } } })
    @ApiResponse({ status: 200, schema: { example: { id: 1, status: 'PAID', updatedAt: '2025-01-10T12:00:00Z', orderedAt: '2025-01-10T12:00:00Z', paidAt: '2025-01-10T12:00:00Z' } } })
    @UseGuards(JwtAuthGuard)
    @Patch(':orderId/status')
    async updateOrderStatus(
        @Headers('x-bypass-token') bypassToken: string,
        @Param('orderId') orderId: number, 
        @Body('status') status: OrderStatus
    ) {
        return this.orderService.updateOrderStatus(orderId, status);
    }
}