import { Inject, Injectable } from '@nestjs/common';
import { OrderRepository } from '../repository/order.repository';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { OrderStatus, Prisma } from '@prisma/client';
import { ORDER_REPOSITORY } from 'src/common/constants/app.constants';

@Injectable()
export class OrderService {
    constructor(
        @Inject(ORDER_REPOSITORY)
        private readonly orderRepository: OrderRepository,
        private readonly prisma: PrismaService,
    ) {}

    // 주문 생성
    async createOrder(userId: number, totalAmount: number, discountAmount: number, finalAmount: number) {
        return this.prisma.$transaction(async (tx) => {
            return this.orderRepository.createOrder({
                user: {
                    connect: { id: userId }, // 관계 연결
                },
                totalAmount,
                discountAmount,
                finalAmount,
                status: OrderStatus.PENDING,
                orderedAt: new Date(),
            });
        });
    }

    // 주문 상태 업데이트
    async updateOrderStatus(orderId: number, status: string) {
        return this.orderRepository.updateOrderStatus(orderId, status);
    }

    // 주문 조회
    async findOrderById(orderId: number) {
        return this.orderRepository.findOrderById(orderId);
    }
}
