import { Product, ProductImage, ProductVariant } from '@prisma/client';

export interface CartItem {
    id: number;
    userId: number;
    productId: number;
    optionVariantId: number;
    quantity: number;
    createdAt: Date;
    updatedAt: Date;
    product: Product & {
        productImages: ProductImage[];
    };
    productVariant: ProductVariant;
}