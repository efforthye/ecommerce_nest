import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Min } from 'class-validator';

export class AddToCartDto {
    @ApiProperty({ description: '상품 ID', example: 1 })
    @IsNumber()
    @Min(1)
    productId: number;

    @ApiProperty({ description: '상품 옵션 ID', example: 1 })
    @IsNumber()
    @Min(1)
    variantId: number;

    @ApiProperty({ description: '수량', example: 1 })
    @IsNumber()
    @Min(1)
    quantity: number;
}

export class UpdateCartDto {
    @ApiProperty({ description: '수량', example: 1 })
    @IsNumber()
    @Min(1)
    quantity: number;
}