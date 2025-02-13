import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { BalanceOrchestrator } from './orchestrators/balance/balance.orchestrator';
import { CartOrchestrator } from './orchestrators/cart/cart.orchestrator';
import { OrderOrchestrator } from './orchestrators/order/order.orchestrator';
import { PaymentOrchestrator } from './orchestrators/payment/payment.orchestrator';

import { BalanceModule } from 'src/domain/balance/balance.module';
import { CartModule } from 'src/domain/cart/cart.module';
import { OrderModule } from 'src/domain/order/order.module';
import { PaymentModule } from 'src/domain/payment/payment.module';
import { CouponModule } from 'src/domain/coupon/coupon.module';
import { ProductModule } from 'src/domain/product/product.module';
import { CouponOrchestrator } from './orchestrators/coupon/coupon.orchestrator';
import { ProductOrchestrator } from './orchestrators/product/product.orchestrator';

@Module({
  imports: [
    EventEmitterModule.forRoot({
      wildcard: false,
      delimiter: '.',
      newListener: false,
      removeListener: false,
      maxListeners: 10,
      verboseMemoryLeak: false,
      ignoreErrors: false,
    }),
    BalanceModule,
    CartModule,
    OrderModule,
    PaymentModule,
    CouponModule,
    ProductModule,
  ],
  providers: [
    BalanceOrchestrator,
    CartOrchestrator,
    OrderOrchestrator,
    PaymentOrchestrator,
    CouponOrchestrator,
    ProductOrchestrator
  ],
  exports: [
    BalanceOrchestrator,
    CartOrchestrator,
    OrderOrchestrator,
    PaymentOrchestrator,
    CouponOrchestrator,
    ProductOrchestrator
  ],
})
export class OrchestrationModule {}