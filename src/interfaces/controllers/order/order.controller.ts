// src/domain/order/controller/order.controller.ts
import { Controller, Post, Body, Param, Patch } from '@nestjs/common';
import { OrderService } from 'src/domain/order/service/order.service';

@Controller('order')
export class OrderController {
    constructor(private readonly orderService: OrderService) {}

    @Post(':userId')
    async createOrder(
        @Param('userId') userId: number,
        @Body() body: { totalAmount: number; discountAmount: number; finalAmount: number },
    ) {
        return this.orderService.createOrder(userId, body.totalAmount, body.discountAmount, body.finalAmount);
    }

    @Patch(':orderId/status')
    async updateOrderStatus(@Param('orderId') orderId: number, @Body() body: { status: string }) {
        return this.orderService.updateOrderStatus(orderId, body.status);
    }
}
