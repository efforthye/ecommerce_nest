import { Module } from "@nestjs/common";
import { DatabaseModule } from "./infrastructure/database/database.module";
import { CouponController } from "./interfaces/controllers/coupon/coupon.controller";
import { BalanceController } from "./interfaces/controllers/balance/balance.controller";
import { ProductController } from "./interfaces/controllers/product/product.controller";
import { OrderController } from "./interfaces/controllers/order/order.controller";
import { CartController } from "./interfaces/controllers/cart/cart.controller";
import { TestController } from "./interfaces/controllers/test/test.controller";

@Module({
  imports: [DatabaseModule],
  controllers: [
    CouponController,
    BalanceController,
    ProductController,
    OrderController,
    CartController,
    TestController
  ],
  providers: [],
})
export class AppModule {}
