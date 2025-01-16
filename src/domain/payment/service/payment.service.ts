import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PaymentRepository } from '../repository/payment.repository';
import { PAYMENT_REPOSITORY } from 'src/common/constants/app.constants';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { OrderService } from '../../order/service/order.service';
import { BalanceService } from '../../balance/service/balance.service';
import { PaymentStatus, Prisma } from '@prisma/client';
import { PaginatedPaymentResponse, PaymentWithOrder } from '../types/payment.types';
import { PaymentStatisticsService } from './payment-statistics.service';

@Injectable()
export class PaymentService {
    constructor(
        @Inject(PAYMENT_REPOSITORY)
        private readonly paymentRepository: PaymentRepository,
        private readonly orderService: OrderService,
        private readonly balanceService: BalanceService,
        private readonly statisticsService: PaymentStatisticsService,
        private readonly prisma: PrismaService
    ) {}

    // 주문에 대한 결제 처리
    async processPayment(userId: number, orderId: number) {
        return await this.prisma.$transaction(async (tx) => {
            // 주문 정보 조회 및 검증
            const order = await this.orderService.findOrderById(orderId);
            if (!order) {
                throw new NotFoundException('Order not found');
            }
            if (order.userId !== userId) {
                throw new BadRequestException('Unauthorized access to order');
            }
            if (order.status === 'PAID') {
                throw new BadRequestException(`Order(${orderId})는 이미 결제가 완료된 주문입니다.`);
            }
            if (order.status === 'CANCELLED') {
                throw new BadRequestException('Cannot pay for cancelled order');
            }

            // 기존 결제 내역 확인
            const existingPayment = await this.paymentRepository.findPaymentWithOrderByOrderId(orderId);
            if (existingPayment) {
                throw new BadRequestException('Payment already exists for this order');
            }

            // 사용자 잔액 조회 및 검증
            const userBalance = await tx.userBalance.findUnique({
                where: { userId },
                select: { balance: true }
            });

            if (!userBalance) {
                throw new BadRequestException('User balance not found');
            }

            if (Number(userBalance.balance) < Number(order.finalAmount)) {
                throw new BadRequestException(
                    `Insufficient balance. Required: ${order.finalAmount}, Current: ${userBalance.balance}`
                );
            }

            // 주문 상품 재고 확인 및 차감
            const orderItems = await tx.orderItem.findMany({
                where: { orderId },
                include: { productVariant: true }
            });

            for (const item of orderItems) {
                if (item.productVariant.stockQuantity < item.quantity) {
                    throw new BadRequestException(
                        `Insufficient stock for product variant ${item.optionVariantId}. Required: ${item.quantity}, Available: ${item.productVariant.stockQuantity}`
                    );
                }

                await tx.productVariant.update({
                    where: { id: item.optionVariantId },
                    data: {
                        stockQuantity: {
                            decrement: item.quantity
                        }
                    }
                });
            }

            // PG사 결제 승인 요청 모의 처리
            const pgTransactionId = `BAL_${Date.now()}_${orderId}`;
            const pgResponse = await this.mockPgApproval(pgTransactionId);
            if (!pgResponse.success) {
                throw new BadRequestException('PG payment approval failed');
            }

            // 잔액 차감 및 이력 생성
            await tx.userBalance.update({
                where: { userId },
                data: {
                    balance: {
                        decrement: Number(order.finalAmount)
                    },
                    balanceHistory: {
                        create: {
                            type: 'USE',
                            amount: order.finalAmount,
                            afterBalance: new Prisma.Decimal(Number(userBalance.balance)).minus(Number(order.finalAmount))
                        }
                    }
                }
            });

            // 결제 정보 생성
            const payment = await this.paymentRepository.createPayment({
                orderId,
                userId,
                paymentMethod: 'BALANCE',
                amount: order.finalAmount,
                status: PaymentStatus.COMPLETED,
                pgTransactionId
            }, tx);

            // 주문 상태 업데이트
            await tx.order.update({
                where: { id: orderId },
                data: { 
                    status: 'PAID',
                    paidAt: new Date()
                }
            });

            // 결제 통계 업데이트 (비동기)
            this.statisticsService.updateStatistics(payment).catch(console.error);

            return payment;
        }, {
            timeout: 10000, // 10초 타임아웃
            isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead // 격리 수준 설정
        });
    }

    // PG사 결제 승인 모의 처리
    private async mockPgApproval(txId: string): Promise<{ success: boolean }> {
        await new Promise(resolve => setTimeout(resolve, 100));
        return { success: true };
    }

    // 결제 아이디로 결제 정보 조회
    async getPaymentById(id: number): Promise<PaymentWithOrder> {
        const payment = await this.paymentRepository.findPaymentWithOrderById(id);
        if (!payment) throw new NotFoundException('Payment not found');
        return payment;
    }

    // 주문 아이디로 결제 정보 조회
    async getPaymentByOrderId(orderId: number): Promise<PaymentWithOrder> {
        const payment = await this.paymentRepository.findPaymentWithOrderByOrderId(orderId);
        if (!payment) throw new NotFoundException('Payment not found for this order');
        return payment;
    }

    // 특정 결제 상세 정보 조회
    async getPaymentDetail(userId: number, paymentId: number): Promise<PaymentWithOrder> {
        const payment = await this.getPaymentById(paymentId);
        if (payment.userId !== userId) {
            throw new BadRequestException('Unauthorized access to payment');
        }
        return payment;
    }

    // 유저의 결제 내역 조회
    async getUserPayments(
        userId: number,
        pagination: { page: number; pageSize: number }
    ): Promise<PaginatedPaymentResponse> {
        const skip = (pagination.page - 1) * pagination.pageSize;
        
        const [total, payments] = await Promise.all([
            this.paymentRepository.countUserPayments(userId),
            this.paymentRepository.findUserPayments(userId, skip, pagination.pageSize)
        ]);
    
        return {
            total,
            payments,
            page: pagination.page,
            pageSize: pagination.pageSize,
            totalPages: Math.ceil(total / pagination.pageSize)
        };
    }

    // 결제 취소
    async cancelPayment(userId: number, paymentId: number) {
        return await this.prisma.$transaction(async (tx) => {
            // 결제 정보 조회 및 검증
            const payment = await this.getPaymentById(paymentId);
            
            if (payment.userId !== userId) {
                throw new BadRequestException('Unauthorized access to payment');
            }
            if (payment.status !== PaymentStatus.COMPLETED) {
                throw new BadRequestException('Can only cancel completed payments');
            }

            // 사용자 잔액 조회
            const userBalance = await tx.userBalance.findUnique({
                where: { userId: payment.userId },
                select: { balance: true }
            });

            if (!userBalance) {
                throw new BadRequestException('User balance not found');
            }

            // 결제 상태 변경
            const updatedPayment = await this.paymentRepository.updatePaymentStatus(
                paymentId, 
                PaymentStatus.CANCELLED,
                tx
            );

            // 재고 복구
            const orderItems = await tx.orderItem.findMany({
                where: { orderId: payment.orderId },
                include: { productVariant: true }
            });

            for (const item of orderItems) {
                await tx.productVariant.update({
                    where: { id: item.optionVariantId },
                    data: {
                        stockQuantity: {
                            increment: item.quantity
                        }
                    }
                });
            }

            // 잔액 환불 및 이력 생성
            await tx.userBalance.update({
                where: { userId: payment.userId },
                data: {
                    balance: {
                        increment: Number(payment.amount)
                    },
                    balanceHistory: {
                        create: {
                            type: 'REFUND',
                            amount: payment.amount,
                            afterBalance: new Prisma.Decimal(Number(userBalance.balance)).add(Number(payment.amount))
                        }
                    }
                }
            });
            
            // 주문 상태 업데이트
            await tx.order.update({
                where: { id: payment.orderId },
                data: { status: 'CANCELLED' }
            });

            return updatedPayment;
        }, {
            timeout: 10000,
            isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead
        });
    }
}