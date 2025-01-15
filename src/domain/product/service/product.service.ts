import { Injectable, NotFoundException } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { ProductRepository } from '../repository/product.repository';
import { PRODUCT_REPOSITORY } from 'src/common/constants/app.constants';
import { ProductResponseDto, ProductDetailResponseDto } from '../dto/product-response.dto';

@Injectable()
export class ProductService {
    constructor(
        @Inject(PRODUCT_REPOSITORY)
        private readonly productRepository: ProductRepository
    ) {}

    async getPopularProducts(limit: number = 10): Promise<ProductResponseDto[]> {
        const products = await this.productRepository.findPopularProducts(limit);
        return products.map(product => ({
            id: product.id,
            name: product.name,
            basePrice: Number(product.basePrice),
            description: product.description,
            isActive: product.isActive,
            productImages: product.productImages.map(image => ({
                id: image.id,
                productId: image.productId,
                productVariantId: image.productVariantId,
                imageUrl: image.imageUrl,
                sequence: image.sequence,
                createdAt: image.createdAt,
                updatedAt: image.updatedAt
            })),
            variants: product.variants.map(variant => ({
                id: variant.id,
                productId: variant.productId,
                optionName: variant.optionName,
                stockQuantity: variant.stockQuantity,
                price: Number(variant.price),
                createdAt: variant.createdAt,
                updatedAt: variant.updatedAt
            })),
            createdAt: product.createdAt,
            updatedAt: product.updatedAt
        }));
    }

    async getProductById(id: number): Promise<ProductDetailResponseDto> {
        const product = await this.productRepository.findById(id);
        if (!product) {
            throw new NotFoundException('Product not found');
        }

        return {
            id: product.id,
            name: product.name,
            basePrice: Number(product.basePrice),
            description: product.description,
            isActive: product.isActive,
            productImages: product.productImages.map(image => ({
                id: image.id,
                productId: image.productId,
                productVariantId: image.productVariantId,
                imageUrl: image.imageUrl,
                sequence: image.sequence,
                createdAt: image.createdAt,
                updatedAt: image.updatedAt
            })),
            variants: product.variants.map(variant => ({
                id: variant.id,
                productId: variant.productId,
                optionName: variant.optionName,
                stockQuantity: variant.stockQuantity,
                price: Number(variant.price),
                createdAt: variant.createdAt,
                updatedAt: variant.updatedAt
            })),
            createdAt: product.createdAt,
            updatedAt: product.updatedAt
        };
    }
}