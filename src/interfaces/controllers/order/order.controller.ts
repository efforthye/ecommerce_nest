import { Body, Controller, Post } from "@nestjs/common";
import { ApiOperation, ApiTags, ApiResponse, ApiBody } from "@nestjs/swagger";
import { CreateOrderDto } from "../../dto/order.dto";

@Controller('orders')
@ApiTags('orders')
export class OrderController {
    @Post()
    @ApiOperation({ summary: '주문 생성' })
    @ApiBody({
        description: '주문 생성에 필요한 데이터',
        type: CreateOrderDto,
        examples: {
            example1: {
                summary: '주문 생성 요청 예제',
                value: {
                    items: [
                        { productId: 'product-1', quantity: 2 },
                        { productId: 'product-2', quantity: 1 }
                    ]
                }
            }
        }
    })
    @ApiResponse({
        status: 201,
        description: '주문이 성공적으로 생성되었습니다.',
        schema: {
            example: {
                id: 'order-1',
                totalAmount: 50000,
                status: 'PAYMENT_PENDING',
                items: [
                    { productId: 'product-1', quantity: 2 },
                    { productId: 'product-2', quantity: 1 }
                ]
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
    createOrder(@Body() createOrderDto: CreateOrderDto) {
        return {
            id: 'order-1',
            totalAmount: 50000,
            status: 'PAYMENT_PENDING',
            items: createOrderDto.items
        };
    }
}
