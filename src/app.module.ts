import { Module } from "@nestjs/common";
import { DatabaseModule } from "./infrastructure/database/database.module";
import { CouponController } from "./interfaces/controllers/coupon/coupon.controller";
import { BalanceController } from "./interfaces/controllers/balance/balance.controller";
import { ProductController } from "./interfaces/controllers/product/product.controller";
import { OrderController } from "./interfaces/controllers/order/order.controller";
import { CartController } from "./interfaces/controllers/cart/cart.controller";
import { TestController } from "./interfaces/controllers/test/test.controller";
import { CouponModule } from "./domain/coupon/coupon.module";
import { JwtAuthGuard } from "./common/guards/jwt-auth.guard";

@Module({
  imports: [DatabaseModule, CouponModule],
  controllers: [
    CouponController,
    BalanceController,
    ProductController,
    OrderController,
    CartController,
    TestController
  ],
  providers: [
    JwtAuthGuard,
  ],
})
export class AppModule {}
