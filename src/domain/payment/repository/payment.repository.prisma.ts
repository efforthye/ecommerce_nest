import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Payment, PaymentStatus, Prisma } from '@prisma/client';
import { PaymentRepository } from './payment.repository';
import { PaymentWithOrder } from '../types/payment.types';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { BalanceRepositoryPrisma } from 'src/domain/balance/repository/balance.repository.prisma';

@Injectable()
export class PaymentRepositoryPrisma implements PaymentRepository {
    constructor(
        private readonly prisma: PrismaService,
        private readonly balanceRepository: BalanceRepositoryPrisma
    ) {}

    async processPayment(userId: number, orderId: number): Promise<Payment> {
        return this.prisma.$transaction(async (tx) => {
            // 비관적 락으로 주문 데이터 격리
            await tx.$executeRawUnsafe(`
                SELECT * FROM \`Order\` 
                WHERE id = ? 
                AND status NOT IN ('PAID', 'CANCELLED')
                FOR UPDATE NOWAIT
            `, orderId);

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

            // 재고에 대한 비관적 락
            for (const item of orderItems) {
                await tx.$executeRawUnsafe(
                    'SELECT * FROM ProductVariant WHERE id = ? FOR UPDATE NOWAIT',
                    item.optionVariantId
                );

                const variant = await tx.productVariant.findUnique({
                    where: { id: item.optionVariantId }
                });
                if (!variant || variant.stockQuantity < item.quantity) throw new BadRequestException(`Insufficient stock for ${item.optionVariantId}`);
            }

            // 낙관적 락으로 잔액 차감
            const updatedBalance = await this.balanceRepository.deductBalance(
                userId,
                Number(order.finalAmount),
                tx
            );

            // 옵션 조합에 대한 상품 재고 차감
            for (const item of orderItems) {
                await tx.productVariant.update({
                    where: { id: item.optionVariantId },
                    data: { stockQuantity: { decrement: item.quantity } }
                });
            }

            // 결제 생성 (PG = 임시 아이디 생성)
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

            // 주문 상태를 결제 완료로 업데이트
            await tx.order.update({
                where: { id: orderId },
                data: { status: 'PAID', paidAt: new Date() }
            });

            return payment;
        }, {
            isolationLevel: Prisma.TransactionIsolationLevel.Serializable
        });
    }

    async cancelPayment(userId: number, paymentId: number): Promise<Payment> {
        return this.prisma.$transaction(async (tx) => {
            // 비관적 락으로 결제 데이터 격리
            await tx.$executeRawUnsafe(
                'SELECT * FROM Payment WHERE id = ? FOR UPDATE NOWAIT',
                paymentId
            );

            const payment = await this.findPaymentWithOrderById(paymentId);
            if (!payment) throw new NotFoundException('Payment not found');
            if (payment.userId !== userId) throw new BadRequestException('Unauthorized');
            if (payment.status !== PaymentStatus.COMPLETED) {
                throw new BadRequestException('Can only cancel completed payments');
            }

            // 재고 복구에 대한 비관적 락
            const orderItems = await tx.orderItem.findMany({
                where: { orderId: payment.orderId },
                include: { productVariant: true }
            });

            for (const item of orderItems) {
                await tx.$executeRawUnsafe(
                    'SELECT * FROM ProductVariant WHERE id = ? FOR UPDATE NOWAIT',
                    item.optionVariantId
                );
            }

            // 낙관적 락으로 잔액 환불
            await this.balanceRepository.chargeBalance(
                userId,
                Number(payment.amount),
                tx
            );

            // 재고 복구
            for (const item of orderItems) {
                await tx.productVariant.update({
                    where: { id: item.optionVariantId },
                    data: { stockQuantity: { increment: item.quantity } }
                });
            }

            // 결제 취소 처리
            const canceledPayment = await tx.payment.update({
                where: { id: paymentId },
                data: {
                    status: PaymentStatus.CANCELLED,
                    updatedAt: new Date()
                }
            });

            // 주문 상태 업데이트
            await tx.order.update({
                where: { id: payment.orderId },
                data: { status: 'CANCELLED' }
            });

            return canceledPayment;
        }, {
            isolationLevel: Prisma.TransactionIsolationLevel.Serializable
        });
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