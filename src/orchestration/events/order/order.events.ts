import { OrderStatus } from "@prisma/client";

export enum OrderEvents {
    ORDER_CREATED = 'order.created',
    ORDER_CONFIRMED = 'order.confirmed',
    ORDER_CANCELLED = 'order.cancelled',
    ORDER_STATUS_UPDATED = 'order.status.updated',
    ORDER_FAILED = 'order.faild',
}

export interface OrderCreatedEvent {
    orderId: number;
    userId: number;
    totalAmount: number;
    couponId?: number;
    items: Array<{
        productId: number;
        variantId: number;
        quantity: number;
    }>;
}

export interface OrderStatusUpdatedEvent {
    orderId: number;
    status: OrderStatus;
    previousStatus: OrderStatus;
}

export interface OrderFailedEvent {
    orderId: number;
    reason: string;
}