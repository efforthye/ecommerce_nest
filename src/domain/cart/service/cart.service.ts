import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CartRepository } from '../repository/cart.repository';
import { ProductService } from '../../product/service/product.service';
import { AddToCartDto, UpdateCartDto } from 'src/interfaces/dto/cart.dto';
import { CART_REPOSITORY, PRODUCT_REPOSITORY } from 'src/common/constants/app.constants';

@Injectable()
export class CartService {
    constructor(
        @Inject(CART_REPOSITORY)
        private readonly cartRepository: CartRepository,
        private readonly productService: ProductService
    ) {}

    async getCart(userId: number) {
        return this.cartRepository.findByUserId(userId);
    }

    async addToCart(userId: number, dto: AddToCartDto) {
        // 상품 및 재고 확인
        const product = await this.productService.getProductById(dto.productId);;
        if (!product || !product.isActive) {
            throw new NotFoundException('Product not found or inactive');
        }

        const variant = product.variants.find(v => v.id === dto.variantId);
        if (!variant || variant.stockQuantity < dto.quantity) {
            throw new NotFoundException('Product variant not found or insufficient stock');
        }

        return this.cartRepository.create(
            userId,
            dto.productId,
            dto.variantId,
            dto.quantity
        );
    }

    async updateQuantity(userId: number, cartId: number, dto: UpdateCartDto) {
        const cart = await this.cartRepository.findById(cartId);
        if (!cart || cart.userId !== userId) {
            throw new NotFoundException('Cart item not found');
        }

        return this.cartRepository.update(cartId, dto.quantity);
    }

    async removeFromCart(userId: number, cartId: number) {
        const cart = await this.cartRepository.findById(cartId);
        if (!cart || cart.userId !== userId) {
            throw new NotFoundException('Cart item not found');
        }

        await this.cartRepository.delete(cartId);
        return { success: true };
    }
}