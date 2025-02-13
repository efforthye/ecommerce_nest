import { Injectable } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { CartEvents, CartCheckoutEvent, OrderEvents, CartValidationEvent, ProductStockCheckCompletedEvent, ProductEvents } from '../../events';
import { CartService } from 'src/domain/cart/service/cart.service';

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

            // 상품 유효성 검증 요청
            for (const item of cartItems) {
                this.eventEmitter.emit(CartEvents.CART_VALIDATION_REQUESTED, {
                    userId: payload.userId,
                    items: [{
                        productId: item.productId,
                        variantId: item.productVariant.id,
                        quantity: item.quantity
                    }]
                });
            }

            // 검증 성공 시 주문 생성 이벤트 발행
            const totalAmount = cartItems.reduce((sum, item) => {
                return sum + (Number(item.productVariant.price) * item.quantity);
            }, 0);

            this.eventEmitter.emit(OrderEvents.ORDER_CREATED, {
                userId: payload.userId,
                items: cartItems.map(item => ({
                    productId: item.productId,
                    variantId: item.productVariant.id,
                    quantity: item.quantity,
                    unitPrice: Number(item.productVariant.price),
                    totalPrice: Number(item.productVariant.price) * item.quantity
                })),
                totalAmount
            });

            // 주문 생성 후 장바구니 비우기
            await Promise.all(cartItems.map(item => 
                this.cartService.removeFromCart(payload.userId, item.id)
            ));

        } catch (error) {
            this.eventEmitter.emit(CartEvents.CART_VALIDATION_FAILED, {
                userId: payload.userId,
                reason: error.message || 'Cart validation failed'
            });
        }
    }

    @OnEvent(CartEvents.CART_VALIDATION_REQUESTED)
    async handleCartValidation(payload: CartValidationEvent) {
        try {
            for (const item of payload.items) {
                // 상품 재고 확인
                this.eventEmitter.emit(ProductEvents.PRODUCT_STOCK_CHECK_REQUESTED, {
                    productId: item.productId,
                    variantId: item.variantId,
                    requestedQuantity: item.quantity
                });
            }

            this.eventEmitter.emit(CartEvents.CART_VALIDATION_COMPLETED, {
                userId: payload.userId,
                items: payload.items
            });
        } catch (error) {
            this.eventEmitter.emit(CartEvents.CART_VALIDATION_FAILED, {
                userId: payload.userId,
                reason: error.message || 'Product validation failed'
            });
        }
    }

    @OnEvent(ProductEvents.PRODUCT_STOCK_CHECK_COMPLETED)
    async handleStockCheckResponse(payload: ProductStockCheckCompletedEvent) {
        if (!payload.isAvailable) {
            this.eventEmitter.emit(CartEvents.CART_VALIDATION_FAILED, {
                productId: payload.productId,
                variantId: payload.variantId,
                reason: `Insufficient stock for product ${payload.productId}`
            });
        }
    }
}