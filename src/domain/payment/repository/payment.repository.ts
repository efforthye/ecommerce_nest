import { Payment, PaymentStatus, Prisma } from '@prisma/client';
import { CreatePaymentInput, PaymentWithOrder } from '../types/payment.types';

export interface PaymentRepository {
    createPayment(data: CreatePaymentInput, tx: Prisma.TransactionClient): Promise<Payment>;
    findPaymentWithOrderById(id: number): Promise<PaymentWithOrder | null>;
    findPaymentWithOrderByOrderId(orderId: number): Promise<PaymentWithOrder | null>;
    updatePaymentStatus(id: number, status: PaymentStatus, tx: Prisma.TransactionClient): Promise<Payment>;
    countUserPayments(userId: number): Promise<number>;
    findUserPayments(userId: number, skip: number, take: number): Promise<PaymentWithOrder[]>;
}