import { Injectable } from '@nestjs/common';
import { Payment, PaymentStatus, Prisma } from '@prisma/client';
import { PaymentRepository } from './payment.repository';
import { PaymentWithOrder } from '../types/payment.types';
import { PrismaService } from 'src/infrastructure/database/prisma.service';

@Injectable()
export class PaymentRepositoryPrisma implements PaymentRepository {
    constructor(private readonly prisma: PrismaService) {}

    async createPayment(
        data: Prisma.PaymentUncheckedCreateInput,
        tx: Prisma.TransactionClient
    ): Promise<Payment> {
        return await tx.payment.create({ data });
    }

    async findPaymentWithOrderById(id: number): Promise<PaymentWithOrder | null> {
        return await this.prisma.payment.findUnique({
            where: { id },
            include: { order: true }
        });
    }

    async findPaymentWithOrderByOrderId(orderId: number): Promise<PaymentWithOrder | null> {
        return await this.prisma.payment.findFirst({
            where: { orderId },
            include: { order: true }
        });
    }

    async updatePaymentStatus(
        id: number,
        status: PaymentStatus,
        tx: Prisma.TransactionClient
    ): Promise<Payment> {
        return await tx.payment.update({
            where: { id },
            data: { 
                status,
                updatedAt: new Date()
            }
        });
    }

    async countUserPayments(userId: number): Promise<number> {
        return await this.prisma.payment.count({
            where: { userId }
        });
    }

    async findUserPayments(
        userId: number,
        skip: number,
        take: number
    ): Promise<PaymentWithOrder[]> {
        return await this.prisma.payment.findMany({
            where: { userId },
            include: { order: true },
            orderBy: { createdAt: 'desc' },
            skip,
            take
        });
    }

    async updateOrderItemStock(
        orderId: number, 
        tx: Prisma.TransactionClient
    ): Promise<void> {
        const orderItems = await tx.orderItem.findMany({
            where: { orderId },
            include: { productVariant: true }
        });

        for (const item of orderItems) {
            await tx.productVariant.update({
                where: { id: item.optionVariantId },
                data: {
                    stockQuantity: {
                        decrement: item.quantity
                    }
                }
            });
        }
    }
}