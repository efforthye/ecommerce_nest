import { Injectable } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { 
    OrderEvents, 
    OrderCreatedEvent,
    PaymentEvents, 
    PaymentCompletedEvent,
    ProductEvents,
    CouponEvents
} from '../../events';
import { OrderService } from 'src/domain/order/service/order.service';
import { CouponStatus, OrderStatus } from '@prisma/client';
import { PrismaService } from 'src/infrastructure/database/prisma.service';


@Injectable()
export class OrderOrchestrator {
    constructor(
        private readonly eventEmitter: EventEmitter2,
        private readonly orderService: OrderService,
        private readonly prisma: PrismaService
    ) {}

    @OnEvent(OrderEvents.ORDER_CREATED)
    async handleOrderCreation(payload: OrderCreatedEvent) {
        try {
            // 상품 재고 확인 요청
            for (const item of payload.items) {
                this.eventEmitter.emit(ProductEvents.PRODUCT_STOCK_CHECK_REQUESTED, {
                    productId: item.productId,
                    variantId: item.variantId,
                    requestedQuantity: item.quantity
                });
            }

            // 쿠폰 검증 요청 (쿠폰이 있는 경우)
            if (payload.couponId) {
                this.eventEmitter.emit(CouponEvents.COUPON_VALIDATION_REQUESTED, {
                    userId: payload.userId,
                    couponId: payload.couponId,
                    orderId: payload.orderId,
                    orderAmount: payload.totalAmount
                });
            }

            // 3. 결제 요청
            this.eventEmitter.emit(PaymentEvents.PAYMENT_INITIATED, {
                orderId: payload.orderId,
                userId: payload.userId,
                amount: payload.totalAmount
            });

        } catch (error) {
            // 주문 실패 처리
            await this.orderService.updateOrderStatus(payload.orderId, OrderStatus.CANCELLED);
            this.eventEmitter.emit(OrderEvents.ORDER_FAILED, {
                orderId: payload.orderId,
                reason: error.message
            });
        }
    }

    @OnEvent(PaymentEvents.PAYMENT_COMPLETED)
    async handlePaymentCompletion(payload: PaymentCompletedEvent) {
        await this.prisma.$transaction(async (tx) => {
            // 주문 상태 업데이트
            await this.orderService.updateOrderStatus(payload.orderId, OrderStatus.PAID);

            // 주문 정보 조회
            const order = await this.prisma.order.findUnique({
                where: { id: payload.orderId },
                include: {
                    orderItems: true
                }
            });

            if (!order) throw new Error(`Order not found: ${payload.orderId}`);

            // 재고 차감 요청
            for (const item of order.orderItems) {
                this.eventEmitter.emit(ProductEvents.PRODUCT_STOCK_UPDATED, {
                    productId: item.productId,
                    variantId: item.optionVariantId,
                    quantity: item.quantity,
                    operation: 'DECREASE'
                });
            }

            // 쿠폰 사용 처리
            if (order.couponId) {
                await tx.userCoupon.update({
                    where: { id: order.couponId },
                    data: { 
                        status: CouponStatus.USED, 
                        usedAt: new Date() 
                    }
                });
            }
        });
    }

    @OnEvent(PaymentEvents.PAYMENT_FAILED)
    async handlePaymentFailure(payload: { orderId: number; reason: string }) {
        await this.orderService.updateOrderStatus(payload.orderId, OrderStatus.CANCELLED);
    }
}