import { Payment, PaymentStatus, Prisma } from '@prisma/client';
import { PaymentWithOrder } from '../types/payment.types';

export interface PaymentRepository {
    createPayment(data: Prisma.PaymentUncheckedCreateInput, tx: Prisma.TransactionClient): Promise<Payment>;
    findPaymentWithOrderById(id: number): Promise<PaymentWithOrder | null>;
    findPaymentWithOrderByOrderId(orderId: number): Promise<PaymentWithOrder | null>;
    updatePaymentStatus(id: number, status: PaymentStatus, tx: Prisma.TransactionClient): Promise<Payment>;
    countUserPayments(userId: number): Promise<number>;
    findUserPayments(userId: number, skip: number, take: number): Promise<PaymentWithOrder[]>;
    updateOrderItemStock(orderId: number, tx: Prisma.TransactionClient): Promise<void>;
}
