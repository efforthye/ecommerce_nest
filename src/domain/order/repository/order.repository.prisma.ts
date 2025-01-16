import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { Order, Prisma, OrderStatus } from '@prisma/client';
import { OrderRepository } from 'src/domain/order/repository/order.repository';

@Injectable()
export class OrderRepositoryPrisma implements OrderRepository {
    constructor(private readonly prisma: PrismaService) {}

    async createOrder(data: Prisma.OrderCreateInput): Promise<Order> {
        return this.prisma.order.create({ data });
    }

    async updateOrderStatus(orderId: number, status: OrderStatus): Promise<Order> {
        return this.prisma.order.update({
            where: { id: orderId },
            data: { status }, // status는 OrderStatus 타입으로 지정
        });
    }

    async findOrderById(orderId: number): Promise<Order | null> {
        return this.prisma.order.findUnique({
            where: { id: orderId },
        });
    }
}
