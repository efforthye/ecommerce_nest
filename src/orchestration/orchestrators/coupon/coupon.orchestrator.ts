import { Injectable } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { CouponEvents } from '../../events';
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
    async handleCouponValidation(payload: { 
        userId: number; 
        couponId: number;
        orderId: number;
        amount: number;
    }) {
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
                include: {coupon: true}
            });

            if (!userCoupon) throw new Error('Invalid or expired coupon');

            // 최소 주문 금액 체크 (minOrderAmount 사용)
            if (Number(userCoupon.coupon.minOrderAmount) > payload.amount) {
                throw new Error('Order amount is less than minimum required amount');
            }

            // 할인 금액 계산 (type과 amount 사용)
            let discountAmount: number;
            if (userCoupon.coupon.type === 'PERCENTAGE') {
                discountAmount = Math.floor(payload.amount * (Number(userCoupon.coupon.amount) / 100));
            } else { // type === 'AMOUNT'
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
}