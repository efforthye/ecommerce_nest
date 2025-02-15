import { Injectable } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { CouponEvents, CouponIssueRequestEvent, CouponValidationRequestEvent } from '../../events';
import { CouponService } from 'src/domain/coupon/service/coupon.service';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { CouponStatus } from '@prisma/client';

@Injectable()
export class CouponOrchestrator {
    constructor(
        private readonly eventEmitter: EventEmitter2,
        private readonly couponService: CouponService,
        private readonly prisma: PrismaService
    ) {}

    @OnEvent(CouponEvents.COUPON_VALIDATION_REQUESTED)
    async handleCouponValidation(payload: CouponValidationRequestEvent) {
        try {
            const userCoupon = await this.prisma.userCoupon.findFirst({
                where: {
                    userId: payload.userId,
                    couponId: payload.couponId,
                    status: CouponStatus.AVAILABLE,
                    expiryDate: {
                        gte: new Date()
                    }
                },
                include: { coupon: true }
            });

            if (!userCoupon) {
                throw new Error('Invalid or expired coupon');
            }

            // 최소 주문 금액 체크
            if (Number(userCoupon.coupon.minOrderAmount) > payload.orderAmount) {
                throw new Error('Order amount is less than minimum required amount');
            }

            // 할인 금액 계산
            let discountAmount: number;
            if (userCoupon.coupon.type === 'PERCENTAGE') {
                discountAmount = Math.floor(payload.orderAmount * (Number(userCoupon.coupon.amount) / 100));
            } else {
                discountAmount = Number(userCoupon.coupon.amount);
            }

            this.eventEmitter.emit(CouponEvents.COUPON_VALIDATION_COMPLETED, {
                userId: payload.userId,
                couponId: payload.couponId,
                orderId: payload.orderId,
                isValid: true,
                discountAmount,
                userCouponId: userCoupon.id
            });
        } catch (error) {
            this.eventEmitter.emit(CouponEvents.COUPON_VALIDATION_FAILED, {
                userId: payload.userId,
                couponId: payload.couponId,
                orderId: payload.orderId,
                reason: error.message
            });
        }
    }

    @OnEvent(CouponEvents.COUPON_ISSUE_REQUESTED)
    async handleCouponIssue(payload: CouponIssueRequestEvent) {
        try {
            const userCoupon = await this.couponService.issueFcfsCoupon(
                payload.userId,
                payload.fcfsCouponId
            );

            this.eventEmitter.emit(CouponEvents.COUPON_ISSUE_COMPLETED, {
                userId: payload.userId,
                fcfsCouponId: payload.fcfsCouponId,
                couponId: userCoupon.couponId,
                expiryDate: userCoupon.expiryDate
            });
        } catch (error) {
            this.eventEmitter.emit(CouponEvents.COUPON_ISSUE_FAILED, {
                userId: payload.userId,
                fcfsCouponId: payload.fcfsCouponId,
                reason: error.message
            });
        }
    }
}