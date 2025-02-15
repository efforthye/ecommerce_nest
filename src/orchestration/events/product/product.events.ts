export enum ProductEvents {
    PRODUCT_STOCK_CHECK_REQUESTED = 'product.stock.check.requested',
    PRODUCT_STOCK_CHECK_COMPLETED = 'product.stock.check.completed',
    PRODUCT_STOCK_UPDATED = 'product.stock.updated',
    PRODUCT_PRICE_UPDATED = 'product.price.updated',
    PRODUCT_STOCK_UPDATE_COMPLETED = 'product.stock.update.completed',
    PRODUCT_STOCK_UPDATE_FAILED = 'product.stock.update.faild',
}

export interface ProductStockCheckEvent {
    productId: number;
    variantId: number;
    requestedQuantity: number;
}

export interface ProductStockCheckCompletedEvent {
    productId: number;
    variantId: number;
    requestedQuantity: number;
    isAvailable: boolean;
    currentStock: number;
}

export interface ProductStockUpdateEvent {
    productId: number;
    variantId: number;
    quantity: number;
    operation: 'INCREASE' | 'DECREASE';
}