// 의존성 주입 식별자 정의
export const COUPON_REPOSITORY = Symbol('COUPON_REPOSITORY');
export const PRODUCT_REPOSITORY = Symbol('PRODUCT_REPOSITORY');
export const ORDER_REPOSITORY = Symbol('ORDER_REPOSITORY');
export const PAYMENT_REPOSITORY = Symbol('PAYMENT_REPOSITORY');
export const BALANCE_REPOSITORY = Symbol('BALANCE_REPOSITORY');
export const CART_REPOSITORY = Symbol('CART_REPOSITORY');

// 커스텀 락 식별자 정의
export const PESSIMISTIC_LOCK_KEY = Symbol('PESSIMISTIC_LOCK');