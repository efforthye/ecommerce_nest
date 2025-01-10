
import { ApiProperty } from '@nestjs/swagger';

export class ProductImageDto {
    @ApiProperty()
    id: number;

    @ApiProperty()
    productId: number;

    @ApiProperty({ required: false, nullable: true })
    productVariantId: number | null;

    @ApiProperty()
    imageUrl: string;

    @ApiProperty()
    sequence: number;

    @ApiProperty()
    createdAt: Date;

    @ApiProperty()
    updatedAt: Date;
}

export class ProductVariantDto {
    @ApiProperty()
    id: number;

    @ApiProperty()
    productId: number;

    @ApiProperty()
    optionName: string;

    @ApiProperty()
    stockQuantity: number;

    @ApiProperty()
    price: number;

    @ApiProperty()
    createdAt: Date;

    @ApiProperty()
    updatedAt: Date;
}

export class ProductResponseDto {
    @ApiProperty()
    id: number;

    @ApiProperty()
    name: string;

    @ApiProperty()
    basePrice: number;

    @ApiProperty()
    description: string;

    @ApiProperty()
    isActive: boolean;

    @ApiProperty({ type: [ProductImageDto] })
    productImages: ProductImageDto[];

    @ApiProperty({ type: [ProductVariantDto] })
    variants: ProductVariantDto[];

    @ApiProperty()
    createdAt: Date;

    @ApiProperty()
    updatedAt: Date;
}

export class ProductDetailResponseDto extends ProductResponseDto {}