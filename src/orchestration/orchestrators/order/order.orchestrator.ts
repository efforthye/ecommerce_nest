import { Injectable } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { 
  OrderEvents, 
  OrderCreatedEvent,
  PaymentEvents 
} from '../../events';
import { OrderService } from 'src/domain/order/service/order.service';

@Injectable()
export class OrderOrchestrator {
    constructor(
        private readonly eventEmitter: EventEmitter2,
        private readonly orderService: OrderService
    ) {}

    @OnEvent(OrderEvents.ORDER_CREATED)
    async handleOrderCreation(payload: OrderCreatedEvent) {
        try {
        const order = await this.orderService.createOrder(payload.userId, {
            items: payload.items
        });

        // 결제 프로세스 시작
        this.eventEmitter.emit(PaymentEvents.PAYMENT_INITIATED, {
            orderId: order.id,
            userId: payload.userId,
            amount: order.finalAmount
        });
        } catch (error) {
        // 에러 처리
        }
    }

    @OnEvent(PaymentEvents.PAYMENT_COMPLETED)
    async handlePaymentCompletion(payload: any) {
        await this.orderService.updateOrderStatus(payload.orderId, 'PAID');
    }

    @OnEvent(PaymentEvents.PAYMENT_FAILED)
    async handlePaymentFailure(payload: any) {
        await this.orderService.updateOrderStatus(payload.orderId, 'CANCELLED');
    }
}