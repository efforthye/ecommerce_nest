// payment/repository/payment.repository.impl.ts
import { Injectable } from '@nestjs/common';
import { Payment, PaymentStatus, Prisma } from '@prisma/client';
import { PaymentRepository } from 'src/domain/payment/repository/payment.repository';
import { CreatePaymentInput, PaymentWithOrder } from 'src/domain/payment/types/payment.types';
import { PrismaService } from 'src/infrastructure/database/prisma.service';

@Injectable()
export class PaymentRepositoryPrisma implements PaymentRepository {
    constructor(private readonly prisma: PrismaService) {}

    async createPayment(
        data: CreatePaymentInput,
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
                ...(status === PaymentStatus.CANCELLED ? { cancelledAt: new Date() } : {})
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
}