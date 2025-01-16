import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { ArrayMinSize, IsArray, IsNumber, IsOptional, Min, ValidateNested } from "class-validator";

export class OrderItemDto {
    @ApiProperty({
        description: '상품 아이디',
        example: 1
    })
    @IsNumber()
    @Min(1)
    productId: number;

    @ApiProperty({
        description: '상품 조합 아이디',
        example: 1
    })
    @IsNumber()
    @Min(1)
    variantId: number;

    @ApiProperty({
        description: '주문 수량',
        example: 2
    })
    @IsNumber()
    @Min(1)
    quantity: number;
    }

    export class CreateOrderDto {
    @ApiProperty({ 
        type: [OrderItemDto],
        description: '주문 상품 목록',
        isArray: true
    })
    @IsArray()
    @ArrayMinSize(1)
    @ValidateNested({ each: true }) // {each: true} 추가
    @Type(() => OrderItemDto)
    items!: OrderItemDto[];

    @ApiProperty({ 
        required: false,
        description: '적용할 쿠폰 ID',
        example: 1
    })
    @IsOptional()
    @IsNumber()
    @Min(1)
    couponId?: number;
}