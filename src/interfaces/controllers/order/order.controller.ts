import { Controller, Post, Body, Param, Patch, UseGuards, UseInterceptors, Headers, BadRequestException, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody, ApiHeader } from '@nestjs/swagger';
import { OrderService } from 'src/domain/order/service/order.service';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { OrderStatus } from '@prisma/client';
import { CreateOrderDto } from 'src/interfaces/dto/order.dto';
import { ParseUserIdInterceptor } from 'src/common/interceptors/parse-user-id.interceptor';
import { CustomLoggerService } from 'src/infrastructure/logging/logger.service';
import { HttpExceptionFilter } from 'src/common/filters/http-exception.filter';
import { OrderEvents } from 'src/orchestration/events';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { KafkaService } from 'src/infrastructure/kafka/kafka.service';

@ApiTags('주문')
@Controller('order')
export class OrderController {
    constructor(
        private readonly orderService: OrderService,
        private readonly logger: CustomLoggerService,
        private readonly eventEmitter: EventEmitter2,
        private readonly kafkaService: KafkaService,
    ) {
        this.logger.setTarget(HttpExceptionFilter.name);
    }

    @ApiOperation({ summary: '주문 생성' })
    @ApiHeader({ name: 'x-bypass-token', required: true, description: '인증 토큰 (temp bypass key: happy-world-token)', schema: { type: 'string' } })
    @ApiParam({ name: 'userId', description: '유저 아이디' })
    @ApiBody({ schema: { example: { items: [{ productId: 1, variantId: 1, quantity: 2 }], couponId: 1}}})
    @ApiResponse({ status: 201, schema: { example: { id: 1, userId: 1, totalAmount: 50000, discountAmount: 5000, finalAmount: 45000, status: OrderStatus.PENDING, items: [] }}})
    @UseGuards(JwtAuthGuard)
    @UseInterceptors(ParseUserIdInterceptor)
    @Post(':userId')
    async createOrder(
        @Headers('x-bypass-token') bypassToken: string,
        @Param('userId') userId: number,
        @Body() createOrderDto: CreateOrderDto
    ) {
        // this.logger.log(`CreateOrderDto: ${createOrderDto}`);
        // return this.orderService.createOrder(userId, createOrderDto);
        // this.eventEmitter.emit(OrderEvents.ORDER_CREATED, {
        //     userId,
        //     items: createOrderDto.items,
        //     couponId: createOrderDto.couponId
        // });

        // 카프카로 주문 생성 이벤트 발행
        const order = await this.orderService.createOrder(userId, createOrderDto);
        await this.kafkaService.emit('order.created', {
            orderId: order.id,
            userId,
            items: createOrderDto.items,
            couponId: createOrderDto.couponId
        });

        return this.orderService.createOrder(userId, createOrderDto);
    }


    @ApiOperation({ summary: '주문 조회' })
    @ApiHeader({ name: 'x-bypass-token', required: true, description: '인증 토큰 (temp bypass key: happy-world-token)', schema: { type: 'string' } })
    @ApiParam({ name: 'orderId', description: '주문 ID' })
    @ApiResponse({
        status: 200,
        schema: {
            example: {
                id: 1,
                userId: 1,
                totalAmount: 50000,
                discountAmount: 5000,
                finalAmount: 45000,
                status: 'PENDING',
                items: [],
            },
        },
    })
    @UseGuards(JwtAuthGuard)
    @Get(':orderId')
    async getOrderById(@Headers('x-bypass-token') bypassToken: string, @Param('orderId') orderId: number) {
        const order = await this.orderService.findOrderById(orderId);
        return order;
    }

    @ApiOperation({ summary: '특정 유저의 주문 목록 조회' })
    @ApiHeader({ name: 'x-bypass-token', required: true, description: '인증 토큰 (temp bypass key: happy-world-token)', schema: { type: 'string' } })
    @ApiParam({ name: 'userId', description: '유저 ID' })
    @ApiResponse({
        status: 200,
        schema: {
            example: [
                {
                    id: 1,
                    userId: 1,
                    totalAmount: 50000,
                    discountAmount: 5000,
                    finalAmount: 45000,
                    status: 'PENDING',
                    items: [],
                },
                {
                    id: 2,
                    userId: 1,
                    totalAmount: 70000,
                    discountAmount: 7000,
                    finalAmount: 63000,
                    status: 'PAID',
                    items: [],
                }
            ],
        },
    })
    @UseGuards(JwtAuthGuard)
    @Get(':userId')
    async getOrdersByUserId(@Headers('x-bypass-token') bypassToken: string, @Param('userId') userId: number) {
        const orders = await this.orderService.findOrdersByUserId(userId);
        return orders;
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
        // return this.orderService.updateOrderStatus(orderId, status);
        const order = await this.orderService.updateOrderStatus(orderId, status);
        this.eventEmitter.emit(OrderEvents.ORDER_STATUS_UPDATED, {
            orderId,
            status: order.status,
            previousStatus: order.status
        });
        return order;
    }
}