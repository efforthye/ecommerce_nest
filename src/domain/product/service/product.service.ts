import { Injectable, NotFoundException } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { ProductRepository } from '../repository/product.repository';
import { PRODUCT_REPOSITORY } from 'src/common/constants/app.constants';
import { ProductResponseDto, ProductDetailResponseDto } from '../dto/product-response.dto';
import { CacheService } from 'src/infrastructure/cache/cache.service';

@Injectable()
export class ProductService {
    constructor(
        @Inject(PRODUCT_REPOSITORY)
        private readonly productRepository: ProductRepository,
        private readonly cacheService: CacheService
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
        const CACHE_KEY = `popular_products_${limit}`;
        const CACHE_TTL = 60 * 1000 * 10; // 10분

        const getProducts = async () => {
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
        };

        return await this.cacheService.getOrSet(CACHE_KEY, getProducts, CACHE_TTL);
    }

    // TODO: 상품 정보 변경 시 캐싱 초기화 및 새로운 데이터 캐싱 로직 추가
    async getProductById(id: number): Promise<ProductDetailResponseDto> {
        const CACHE_KEY = `product_detail_${id}`;
        const CACHE_TTL = 60 * 1000 * 30; // 30분

        const getProduct = async () => {
            const product = await this.productRepository.findById(id);
            if (!product) throw new NotFoundException('Product not found');

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
        };

        return await this.cacheService.getOrSet(CACHE_KEY, getProduct, CACHE_TTL);
    }
}
