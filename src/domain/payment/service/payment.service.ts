import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PaymentRepository } from '../repository/payment.repository';
import { PAYMENT_REPOSITORY } from 'src/common/constants/app.constants';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { OrderService } from '../../order/service/order.service';
import { BalanceService } from '../../balance/service/balance.service';
import { PaymentStatus, Prisma } from '@prisma/client';
import { PaginatedPaymentResponse, PaymentWithOrder } from '../types/payment.types';

@Injectable()
export class PaymentService {
    constructor(
        @Inject(PAYMENT_REPOSITORY)
        private readonly paymentRepository: PaymentRepository,
        private readonly orderService: OrderService,
        private readonly balanceService: BalanceService,
        private readonly prisma: PrismaService
    ) {}

    // 주문에 대한 결제 처리
    async processPayment(userId: number, orderId: number) {
        return await this.prisma.$transaction(async (tx) => {
            // 기존 결제 내역 확인
            const existingPayment = await this.paymentRepository.findPaymentWithOrderByOrderId(orderId);
            if (existingPayment) {
                throw new BadRequestException('Payment already exists for this order');
            }

            // 주문 정보 조회 및 검증
            const order = await this.orderService.findOrderById(orderId);
            if (!order) {
                throw new NotFoundException('Order not found');
            }
            if (order.userId !== userId) {
                throw new BadRequestException('Unauthorized access to order');
            }
            if (order.status === 'PAID') {
                throw new BadRequestException('Order is already paid');
            }
            if (order.status === 'CANCELLED') {
                throw new BadRequestException('Cannot pay for cancelled order');
            }

            // 잔액 확인
            const balance = await this.balanceService.getBalance(userId);
            if (!balance || balance.balance < order.finalAmount) {
                throw new BadRequestException('Insufficient balance');
            }

            // 잔액 차감
            await this.balanceService.chargeBalance(
                userId,
                -Number(order.finalAmount)
            );

            // 결제 정보 생성
            const payment = await this.paymentRepository.createPayment({
                orderId,
                userId,
                paymentMethod: 'BALANCE',
                amount: Number(order.finalAmount),
                status: PaymentStatus.COMPLETED,
                pgTransactionId: `BAL_${Date.now()}_${orderId}`
            }, tx);

            // 주문 상태 업데이트
            await this.orderService.updateOrderStatus(orderId, 'PAID');

            return payment;
        });
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

    /**
     * 결제 상세 정보를 조회합니다.
     */
    async getPaymentDetail(userId: number, paymentId: number): Promise<PaymentWithOrder> {
        const payment = await this.getPaymentById(paymentId);
        if (payment.userId !== userId) {
            throw new BadRequestException('Unauthorized access to payment');
        }
        return payment;
    }

    /** 
     * 사용자의 결제 내역을 조회합니다.
     */
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

    // 결제 상태 업데이트
    async updatePaymentStatus(id: number, status: PaymentStatus) {
        return await this.prisma.$transaction(async (tx) => {
            const payment = await this.paymentRepository.findPaymentWithOrderById(id);
            if (!payment) throw new NotFoundException('Payment not found');
            if (payment.status === PaymentStatus.COMPLETED) throw new BadRequestException('Cannot update completed payment');

            // 결제 취소시 잔액 환불 처리
            if (status === PaymentStatus.CANCELLED && payment.status !== PaymentStatus.CANCELLED) {
                await this.balanceService.chargeBalance(
                    payment.userId,
                    Number(payment.amount)
                );
                
                await this.orderService.updateOrderStatus(
                    payment.orderId,
                    'CANCELLED'
                );
            }

            return await this.paymentRepository.updatePaymentStatus(id, status, tx);
        });
    }

    // 결제 취소
    async cancelPayment(userId: number, paymentId: number) {
        const payment = await this.getPaymentById(paymentId);
        
        if (payment.userId !== userId) {
            throw new BadRequestException('Unauthorized access to payment');
        }

        return await this.updatePaymentStatus(paymentId, PaymentStatus.CANCELLED);
    }

    // 사용자의 결제 접근 권한 검증
    async validateUserPayment(userId: number, paymentId: number): Promise<void> {
        const payment = await this.paymentRepository.findPaymentWithOrderById(paymentId);
        if (!payment || payment.userId !== userId) {
            throw new BadRequestException('Unauthorized access to payment');
        }
    }
}