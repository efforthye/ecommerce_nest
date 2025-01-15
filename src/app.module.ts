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
import { CouponService } from "./domain/coupon/service/coupon.service";
import { BalanceModule } from "./domain/balance/balance.module";
import { BalanceService } from "./domain/balance/service/balance.service";
import { OrderModule } from "./domain/order/order.module";
import { PaymentModule } from "./domain/payment/payment.module";
import { PaymentController } from "./interfaces/controllers/payment/payment.controller";
import { ConfigModule } from "@nestjs/config";
import * as Joi from 'joi';
import { DatabaseConfig } from "./infrastructure/database/database.config";
import { LoggerModule } from "./infrastructure/logging/logger.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // .env 전역 사용
      validationSchema: Joi.object({
        DATABASE_URL: Joi.string().uri().required().default('mysql://root:1234@localhost:3306/ecommerce'),
        DB_USERNAME: Joi.string().required().default('root'),
        DB_PASSWORD: Joi.string().required().default('1234'),
        DB_HOST: Joi.string().hostname().required().default('localhost'),
        DB_PORT: Joi.number().port().required().default(3306),
        DB_DATABASE: Joi.string().required().default('ecommerce'),
        JWT_BYPASS_TOKEN: Joi.string().required().default('happy-world-token'),
        JWT_REGISTER_SECRET_KEY: Joi.string().required().default('happy-world-register-key'),
      }),
    }),
    DatabaseModule, 
    ProductModule, 
    BalanceModule,
    OrderModule,
    PaymentModule,
    CouponModule,
    LoggerModule
  ],
  controllers: [
    CouponController,
    BalanceController,
    ProductController,
    OrderController,
    CartController,
    TestController,
    PaymentController,
  ],
  providers: [
    JwtAuthGuard,
    BalanceService,
    DatabaseConfig
  ],
})
export class AppModule {}
