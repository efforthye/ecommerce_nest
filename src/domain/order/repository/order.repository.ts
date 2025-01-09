import { Order, Prisma } from '@prisma/client';

export interface OrderRepository {
    createOrder(data: Prisma.OrderCreateInput): Promise<Order>;
    updateOrderStatus(orderId: number, status: string): Promise<Order>;
    findOrderById(orderId: number): Promise<Order | null>;
}