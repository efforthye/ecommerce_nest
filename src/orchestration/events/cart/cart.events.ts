export enum CartEvents {
    CART_CHECKOUT_REQUESTED = 'cart.checkout.requested',
    CART_CHECKOUT_COMPLETED = 'cart.checkout.completed',
    CART_VALIDATION_REQUESTED = 'cart.validation.requested',
    CART_VALIDATION_COMPLETED = 'cart.validation.completed',
    CART_VALIDATION_FAILED = 'cart.validation.faild'
}

export interface CartCheckoutEvent {
    userId: number;
    cartId: number;
}

export interface CartValidationEvent {
    userId: number;
    cartId: number;
    items: Array<{
        productId: number;
        variantId: number;
        quantity: number;
    }>;
}