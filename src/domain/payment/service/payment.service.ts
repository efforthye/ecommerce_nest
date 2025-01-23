import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { PaginatedPaymentResponse } from "../types/payment.types";
import { PAYMENT_REPOSITORY } from "src/common/constants/app.constants";
import { PaymentRepository } from "../repository/payment.repository";
import { PaymentStatisticsService } from "./payment-statistics.service";

@Injectable()
export class PaymentService {
    constructor(
        @Inject(PAYMENT_REPOSITORY)
        private readonly paymentRepository: PaymentRepository,
        private readonly statisticsService: PaymentStatisticsService
    ) {}

    async processPayment(userId: number, orderId: number) {
        const payment = await this.paymentRepository.processPayment(userId, orderId);
        await this.statisticsService.updateStatistics(payment).catch(console.error);
        return payment;
    }

    async cancelPayment(userId: number, paymentId: number) {
        return this.paymentRepository.cancelPayment(userId, paymentId);
    }

    async getPaymentById(id: number) {
        const payment = await this.paymentRepository.findPaymentWithOrderById(id);
        if (!payment) throw new NotFoundException('Payment not found');
        return payment;
    }

    async getPaymentByOrderId(orderId: number) {
        const payment = await this.paymentRepository.findPaymentWithOrderByOrderId(orderId);
        if (!payment) throw new NotFoundException('Payment not found');
        return payment;
    }

    async getPaymentDetail(userId: number, paymentId: number) {
        const payment = await this.getPaymentById(paymentId);
        if (payment.userId !== userId) {
            throw new BadRequestException('Unauthorized access to payment');
        }
        return payment;
    }

    async getUserPayments(
        userId: number,
        pagination: { page?: number; pageSize?: number } = { page: 1, pageSize: 10 }
    ): Promise<PaginatedPaymentResponse> {
        const { page = 1, pageSize = 10 } = pagination;
        const skip = (page - 1) * pageSize;
        
        const [total, payments] = await Promise.all([
            this.paymentRepository.countUserPayments(userId),
            this.paymentRepository.findUserPayments(userId, skip, pageSize)
        ]);
    
        return {
            total,
            payments,
            page,
            pageSize,
            totalPages: Math.ceil(total / pageSize)
        };
    }
}