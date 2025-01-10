/**
 * 프리즈마에서 자동으로 주긴 하는데 일단 명시해두는게 좋을거 같아서 추가함
 */

// 쿠폰
export interface Coupon {
    id: number;
    name: string;
    type: string;
    amount: number;
    minOrderAmount: number;
    validDays: number;
}

// 선착순 쿠폰
export interface FcfsCoupon {
    id: number;
    couponId: number;
    totalQuantity: number;
    stockQuantity: number;
    startDate: Date;
    endDate: Date;
    createdAt: Date;
    coupon: Coupon;
}