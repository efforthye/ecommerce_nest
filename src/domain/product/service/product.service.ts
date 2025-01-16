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

    private mapProductImages(productImages) {
        return productImages.map(({ id, productId, productVariantId, imageUrl, sequence, createdAt, updatedAt }) => ({
            id,
            productId,
            productVariantId,
            imageUrl,
            sequence,
            createdAt,
            updatedAt
        }));
    }

    private mapVariants(variants) {
        return variants.map(({ id, productId, optionName, stockQuantity, price, createdAt, updatedAt }) => ({
            id,
            productId,
            optionName,
            stockQuantity,
            price: Number(price),
            createdAt,
            updatedAt
        }));
    }

    async getPopularProducts(limit: number = 10): Promise<ProductResponseDto[]> {
        const products = await this.productRepository.findPopularProducts(limit);
        return products.map(({ id, name, basePrice, description, isActive, productImages, variants, createdAt, updatedAt }) => ({
            id,
            name,
            basePrice: Number(basePrice),
            description,
            isActive,
            productImages: this.mapProductImages(productImages),
            variants: this.mapVariants(variants),
            createdAt,
            updatedAt
        }));
    }

    async getProductById(id: number): Promise<ProductDetailResponseDto> {
        const product = await this.productRepository.findById(id);
        if (!product) {
            throw new NotFoundException('Product not found');
        }

        const { id: productId, name, basePrice, description, isActive, productImages, variants, createdAt, updatedAt } = product;

        return {
            id: productId,
            name,
            basePrice: Number(basePrice),
            description,
            isActive,
            productImages: this.mapProductImages(productImages),
            variants: this.mapVariants(variants),
            createdAt,
            updatedAt
        };
    }
}
