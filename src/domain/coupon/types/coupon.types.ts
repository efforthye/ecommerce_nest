import { CouponStatus, Prisma } from '@prisma/client';

export interface FcfsCouponWithCoupon {
    id: number;
    couponId: number;
    totalQuantity: number;
    stockQuantity: number;
    startDate: Date;
    endDate: Date;
    createdAt: Date;
    coupon: {
        id: number;
        name: string;
        type: string;
        amount: number;
        minOrderAmount: number;
        validDays: number;
        isFcfs: boolean;
        createdAt: Date;
    };
}

export interface CreateUserCouponInput {
    userId: number;
    couponId: number;
    status: CouponStatus;
    expiryDate: Date;
}