import { Prisma, Product, ProductImage, ProductVariant } from '@prisma/client';


// Prisma에서 제공하는 타입을 사용
export type ProductInclude = {
    images: true;
    variants: true;
};

export type ProductWithDetails = Prisma.ProductGetPayload<{
    include: ProductInclude;
}>;