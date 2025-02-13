export enum OrderEvents {
    ORDER_CREATED = 'order.created',
    ORDER_CONFIRMED = 'order.confirmed',
    ORDER_CANCELLED = 'order.cancelled',
    ORDER_STATUS_UPDATED = 'order.status.updated'
}

export interface OrderCreatedEvent {
    orderId: number;
    userId: number;
    totalAmount: number;
    items: Array<{
        productId: number;
        variantId: number;
        quantity: number;
    }>;
}

export interface OrderStatusUpdatedEvent {
    orderId: number;
    status: string;
    previousStatus: string;
}