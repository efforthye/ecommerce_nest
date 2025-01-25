import { CouponStatus, FcfsCoupon } from "@prisma/client";

export interface FcfsCouponWithCoupon extends Omit<FcfsCoupon, 'coupon'> {
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