import { Injectable } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { CartEvents, CartCheckoutEvent, OrderEvents } from '../../events';
import { CartService } from 'src/domain/cart/service/cart.service';

interface CartItem {
    id: number;
    userId: number;
    productId: number;
    optionVariantId: number;
    quantity: number;
    createdAt: Date;
    updatedAt: Date;
}

@Injectable()
export class CartOrchestrator {
    constructor(
        private readonly eventEmitter: EventEmitter2,
        private readonly cartService: CartService
    ) {}

    @OnEvent(CartEvents.CART_CHECKOUT_REQUESTED)
    async handleCartCheckout(payload: CartCheckoutEvent) {
        try {
        const cartItems = await this.cartService.getCart(payload.userId);
        
        if (!cartItems || cartItems.length === 0) {
            throw new Error('Cart is empty');
        }

        const items = cartItems.map(item => ({
            productId: item.productId,
            variantId: item.optionVariantId,
            quantity: item.quantity
        }));

        this.eventEmitter.emit(CartEvents.CART_VALIDATION_REQUESTED, {
            userId: payload.userId,
            cartId: payload.cartId,
            items: items
        });

        } catch (error) {
            this.eventEmitter.emit(CartEvents.CART_VALIDATION_FAILED, {
                userId: payload.userId,
                cartId: payload.cartId,
                reason: error.message || 'Cart validation failed'
            });
        }
    }
}