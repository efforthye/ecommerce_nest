import { OrderStatus, Prisma } from "@prisma/client";

export type OrderType = {
    id: number;
    userId: number;
    couponId: number | null;
    totalAmount: Prisma.Decimal;
    discountAmount: Prisma.Decimal;
    finalAmount: Prisma.Decimal;
    status: OrderStatus;
    orderedAt: Date;
    paidAt: Date | null;
    updatedAt: Date;
};
