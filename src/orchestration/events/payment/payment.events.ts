export enum PaymentEvents {
    PAYMENT_INITIATED = 'payment.initiated',
    PAYMENT_COMPLETED = 'payment.completed',
    PAYMENT_FAILED = 'payment.failed',
    PAYMENT_CANCELLED = 'payment.cancelled'
}

export interface PaymentInitiatedEvent {
    paymentId: number;
    orderId: number;
    userId: number;
    amount: number;
}

export interface PaymentCompletedEvent {
    paymentId: number;
    orderId: number;
    userId: number;
    amount: number;
    status: string;
}