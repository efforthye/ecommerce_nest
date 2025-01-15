import { Module } from '@nestjs/common';
import { PaymentService } from './service/payment.service';
import { OrderModule } from '../order/order.module';
import { BalanceModule } from '../balance/balance.module';
import { PaymentController } from 'src/interfaces/controllers/payment/payment.controller';
import { PAYMENT_REPOSITORY } from 'src/common/constants/app.constants';
import { PaymentRepositoryImpl } from 'src/infrastructure/repositories/payment/payment.repository.impl';
import { DatabaseModule } from 'src/infrastructure/database/database.module';
import { PrismaService } from 'src/infrastructure/database/prisma.service';

@Module({
    imports: [
        DatabaseModule, 
        OrderModule, 
        BalanceModule
    ],
    controllers: [PaymentController],
    providers: [
        PaymentService,
        PrismaService,
        {
            provide: PAYMENT_REPOSITORY,
            useClass: PaymentRepositoryImpl
        }
    ],
    exports: [PaymentService, PAYMENT_REPOSITORY]
})
export class PaymentModule {}