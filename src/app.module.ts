import { Module } from "@nestjs/common";
import { DatabaseModule } from "./infrastructure/database/database.module";
import { CouponController } from "./interfaces/controllers/coupon.controller";
import { BalanceController } from "./interfaces/controllers/balance.controller";
import { ProductController } from "./interfaces/controllers/product.controller";
import { OrderController } from "./interfaces/controllers/order.controller";
import { CartController } from "./interfaces/controllers/cart.controller";

@Module({
  imports: [DatabaseModule],
  controllers: [
    CouponController,
    BalanceController,
    ProductController,
    OrderController,
    CartController
  ],
  providers: [],
})
export class AppModule {}
