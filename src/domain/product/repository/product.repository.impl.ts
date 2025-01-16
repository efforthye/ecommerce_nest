import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { ProductRepository } from 'src/domain/product/repository/product.repository';
import { ProductVariant, Prisma } from '@prisma/client';
import { ProductWithIncludes } from 'src/domain/product/repository/product.repository';

@Injectable()
export class ProductRepositoryPrisma implements ProductRepository {
    constructor(private readonly prisma: PrismaService) {}

    async findPopularProducts(limit: number): Promise<ProductWithIncludes[]> {
        return this.prisma.product.findMany({
            where: { 
                isActive: true 
            },
            take: limit,
            include: {
                productImages: {
                    orderBy: {
                        sequence: 'asc'
                    }
                },
                variants: true
            },
            orderBy: [
                {
                    orderItems: {
                        _count: 'desc'
                    }
                }
            ]
        });
    }

    async findById(id: number): Promise<ProductWithIncludes | null> {
        return this.prisma.product.findUnique({
            where: { 
                id 
            },
            include: {
                productImages: {
                    orderBy: {
                        sequence: 'asc'
                    }
                },
                variants: true
            }
        });
    }

    async findVariantById(id: number): Promise<ProductVariant | null> {
        return this.prisma.productVariant.findUnique({
            where: { id }
        });
    }

    async decreaseVariantStock(
        id: number,
        quantity: number,
        tx: Prisma.TransactionClient
    ): Promise<void> {
        await tx.productVariant.update({
            where: { id },
            data: {
                stockQuantity: {
                    decrement: quantity
                }
            }
        });
    }
}