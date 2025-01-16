import { Order, Payment } from '@prisma/client';

export interface CreatePaymentInput {
    orderId: number;
    userId: number;
    paymentMethod: string;
    amount: number;
    status: string;
    pgTransactionId: string;
}

export interface PaymentWithOrder extends Payment {
    order: Order;
}

export interface PaginatedPaymentResponse {
    total: number;
    payments: PaymentWithOrder[];
    page: number;
    pageSize: number;
    totalPages: number;
}

export interface PaymentStatistics {
    date: Date;
    totalAmount: number;
    paymentCount: number;
    averageAmount: number;
}