import { OrderStatus } from '@prisma/client';

export class Order {
    id: number;
    userId: number;
    totalAmount: number;
    discountAmount: number;
    finalAmount: number;
    status: OrderStatus;
    orderedAt: Date;
    paidAt: Date | null;
}