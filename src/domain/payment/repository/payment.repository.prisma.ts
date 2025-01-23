import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Payment, PaymentStatus, Prisma } from '@prisma/client';
import { PaymentRepository } from './payment.repository';
import { PaymentWithOrder } from '../types/payment.types';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { BalanceRepositoryPrisma } from 'src/domain/balance/repository/balance.repository.prisma';
import { RedisRedlock } from 'src/infrastructure/redis/redis.redlock';

@Injectable()
export class PaymentRepositoryPrisma implements PaymentRepository {
    constructor(
        private readonly prisma: PrismaService,
        private readonly balanceRepository: BalanceRepositoryPrisma,
        private readonly redisRedlock: RedisRedlock // RedisRedlock 주입
    ) {}

    async processPayment(userId: number, orderId: number): Promise<Payment> {
        const orderLock = await this.redisRedlock.acquireLock(`order:${orderId}`);
        
        try {
            return await this.prisma.$transaction(async (tx) => {
                const order = await tx.order.findUnique({
                    where: { id: orderId }
                });
    
                if (!order) throw new NotFoundException('Order not found');
                if (order.userId !== userId) throw new BadRequestException('Unauthorized');
                if (order.status === 'PAID') throw new BadRequestException('Already paid');
                if (order.status === 'CANCELLED') throw new BadRequestException('Order cancelled');
    
                const orderItems = await tx.orderItem.findMany({
                    where: { orderId },
                    include: { productVariant: true }
                });
    
                // 재고 체크 및 차감
                for (const item of orderItems) {
                    const variantLock = await this.redisRedlock.acquireLock(`product:${item.optionVariantId}`);
                    try {
                        const variant = await tx.productVariant.findUnique({
                            where: { id: item.optionVariantId }
                        });
                        if (!variant || variant.stockQuantity < item.quantity) {
                            throw new BadRequestException(`Insufficient stock for ${item.optionVariantId}`);
                        }
                        
                        await tx.productVariant.update({
                            where: { id: item.optionVariantId },
                            data: { stockQuantity: { decrement: item.quantity } }
                        });
                    } finally {
                        await this.redisRedlock.releaseLock(variantLock);
                    }
                }
    
                const balanceLock = await this.redisRedlock.acquireLock(`balance:${userId}`);
                try {
                    // 잔액 차감
                    await this.balanceRepository.deductBalance(
                        userId,
                        Number(order.finalAmount),
                        tx
                    );
                } finally {
                    await this.redisRedlock.releaseLock(balanceLock);
                }
    
                // 결제 생성
                const pgTransactionId = `BAL_${Date.now()}_${orderId}`;
                const payment = await tx.payment.create({
                    data: {
                        orderId,
                        userId,
                        paymentMethod: 'BALANCE',
                        amount: order.finalAmount,
                        status: PaymentStatus.COMPLETED,
                        pgTransactionId
                    }
                });
    
                await tx.order.update({
                    where: { id: orderId },
                    data: { status: 'PAID', paidAt: new Date() }
                });
    
                return payment;
            }, {
                isolationLevel: Prisma.TransactionIsolationLevel.Serializable
            });
        } finally {
            await this.redisRedlock.releaseLock(orderLock);
        }
    }
    
    async cancelPayment(userId: number, paymentId: number): Promise<Payment> {
        const paymentLock = await this.redisRedlock.acquireLock(`payment:${paymentId}`);
        
        try {
            return await this.prisma.$transaction(async (tx) => {
                const payment = await this.findPaymentWithOrderById(paymentId);
                if (!payment) throw new NotFoundException('Payment not found');
                if (payment.userId !== userId) throw new BadRequestException('Unauthorized');
                if (payment.status !== PaymentStatus.COMPLETED) {
                    throw new BadRequestException('Can only cancel completed payments');
                }
    
                const orderItems = await tx.orderItem.findMany({
                    where: { orderId: payment.orderId },
                    include: { productVariant: true }
                });
    
                for (const item of orderItems) {
                    const variantLock = await this.redisRedlock.acquireLock(`product:${item.optionVariantId}`);
                    try {
                        await tx.productVariant.update({
                            where: { id: item.optionVariantId },
                            data: { stockQuantity: { increment: item.quantity } }
                        });
                    } finally {
                        await this.redisRedlock.releaseLock(variantLock);
                    }
                }
    
                const balanceLock = await this.redisRedlock.acquireLock(`balance:${userId}`);
                try {
                    await this.balanceRepository.chargeBalance(
                        userId,
                        Number(payment.amount),
                        tx
                    );
                } finally {
                    await this.redisRedlock.releaseLock(balanceLock);
                }
    
                const canceledPayment = await tx.payment.update({
                    where: { id: paymentId },
                    data: {
                        status: PaymentStatus.CANCELLED,
                        updatedAt: new Date()
                    }
                });
    
                await tx.order.update({
                    where: { id: payment.orderId },
                    data: { status: 'CANCELLED' }
                });
    
                return canceledPayment;
            }, {
                isolationLevel: Prisma.TransactionIsolationLevel.Serializable
            });
        } finally {
            await this.redisRedlock.releaseLock(paymentLock);
        }
    }

    async findPaymentWithOrderById(id: number): Promise<PaymentWithOrder | null> {
        return this.prisma.payment.findUnique({
            where: { id },
            include: { order: true }
        });
    }

    async findPaymentWithOrderByOrderId(orderId: number): Promise<PaymentWithOrder | null> {
        return this.prisma.payment.findFirst({
            where: { orderId },
            include: { order: true }
        });
    }

    async countUserPayments(userId: number): Promise<number> {
        return this.prisma.payment.count({
            where: { userId }
        });
    }

    async findUserPayments(
        userId: number,
        skip: number,
        take: number
    ): Promise<PaymentWithOrder[]> {
        return this.prisma.payment.findMany({
            where: { userId },
            include: { order: true },
            orderBy: { createdAt: 'desc' },
            skip,
            take
        });
    }

    async updatePaymentStatus(id: number, status: PaymentStatus, tx: Prisma.TransactionClient): Promise<Payment> {
        return tx.payment.update({
            where: { id },
            data: { 
                status,
                updatedAt: new Date()
            }
        });
    }

    async updateOrderItemStock(orderId: number, tx: Prisma.TransactionClient): Promise<void> {
        const orderItems = await tx.orderItem.findMany({
            where: { orderId },
            include: { productVariant: true }
        });

        for (const item of orderItems) {
            await tx.$executeRawUnsafe(
                'SELECT * FROM ProductVariant WHERE id = ? FOR UPDATE NOWAIT',
                item.optionVariantId
            );

            await tx.productVariant.update({
                where: { id: item.optionVariantId },
                data: {
                    stockQuantity: { decrement: item.quantity }
                }
            });
        }
    }
}