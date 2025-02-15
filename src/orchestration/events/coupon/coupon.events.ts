export enum CouponEvents {
    COUPON_ISSUE_REQUESTED = 'coupon.issue.requested',
    COUPON_ISSUE_COMPLETED = 'coupon.issue.completed',
    COUPON_ISSUE_FAILED = 'coupon.issue.failed',
    COUPON_VALIDATION_REQUESTED = 'coupon.validation.requested',
    COUPON_VALIDATION_COMPLETED = 'coupon.validation.completed',
    COUPON_VALIDATION_FAILED = 'coupon.validation.failed'
}

export interface CouponIssueRequestEvent {
    userId: number;
    fcfsCouponId: number;
}

export interface CouponIssueCompletedEvent {
    userId: number;
    fcfsCouponId: number;
    couponId: number;
    expiryDate: Date;
}

export interface CouponValidationRequestEvent {
    userId: number;
    couponId: number;
    orderId: number;
    orderAmount: number;
}

export interface CouponValidationCompletedEvent {
    userId: number;
    couponId: number;
    orderId: number;
    discountAmount: number;
    isValid: boolean;
}