import { Product, ProductVariant, ProductImage, Prisma } from '@prisma/client';

export type ProductWithIncludes = Prisma.ProductGetPayload<{
    include: {
        productImages: true;
        variants: true;
    }
}>;

export interface ProductRepository {
    findPopularProducts(limit: number): Promise<ProductWithIncludes[]>;
    findById(id: number): Promise<ProductWithIncludes | null>;
    findVariantById(id: number): Promise<ProductVariant | null>;
    decreaseVariantStock(id: number, quantity: number, tx: Prisma.TransactionClient): Promise<void>;
}