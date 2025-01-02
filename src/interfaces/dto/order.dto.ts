import { ApiProperty } from "@nestjs/swagger";

 
export class OrderItemDto {
    @ApiProperty({
        description: '상품 ID',
        example: 'product-1'
    })
    productId: string;
 
    @ApiProperty({
        description: '주문 수량',
        example: 2
    })
    quantity: number;
}

export class CreateOrderDto {
    @ApiProperty({ 
        type: [OrderItemDto],
        description: '주문 상품 목록'
    })
    items: OrderItemDto[];
 
    @ApiProperty({ 
        required: false,
        description: '적용할 쿠폰 ID' 
    })
    couponId?: string;
}