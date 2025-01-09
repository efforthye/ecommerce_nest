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
import { ProductModule } from "./domain/product/product.module";
import { ProductService } from "./domain/product/service/product.service";
import { CouponService } from "./domain/coupon/service/coupon.service";
import { PRODUCT_REPOSITORY } from "./common/constants/repository.constants";
import { BalanceModule } from "./domain/balance/balance.module";
import { BalanceService } from "./domain/balance/service/balance.service";
import { OrderModule } from "./domain/order/order.module";

@Module({
  imports: [
    DatabaseModule, 
    CouponModule, 
    ProductModule, 
    BalanceModule,
    OrderModule,
  ],
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
    CouponService,
    BalanceService
  ],
})
export class AppModule {}
