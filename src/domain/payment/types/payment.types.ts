import { Payment, Order, OrderItem, ProductVariant, PaymentStatus, Prisma } from '@prisma/client';

export interface PaymentWithOrder extends Payment {
    order: {
        id: number;
        userId: number;
        status: string;
        couponId: number | null;
        totalAmount: Prisma.Decimal;
        discountAmount: Prisma.Decimal;
        finalAmount: Prisma.Decimal;
        orderedAt: Date;
        paidAt: Date | null;
    }
}

export type CreatePaymentInput = {
    orderId: number;
    userId: number;
    paymentMethod: string;
    amount: number;
    status: PaymentStatus;
    pgTransactionId: string;
};


export interface PaginatedPaymentResponse {
    total: number;
    payments: PaymentWithOrder[];
    page: number;
    pageSize: number;
    totalPages: number;
}
