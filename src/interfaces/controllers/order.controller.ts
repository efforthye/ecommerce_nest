import { Body, Controller, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { CreateOrderDto } from "../dto/order.dto";

@Controller('orders')
@ApiTags('orders')
export class OrderController {
    @Post()
    @ApiOperation({ summary: '주문 생성' })
    createOrder(@Body() createOrderDto: CreateOrderDto) {
        return {
            id: 'order-1',
            totalAmount: 50000,
            status: 'PAYMENT_PENDING',
            items: createOrderDto.items
        };
    }
}