import { Module } from '@nestjs/common';
import { PaymentService } from './service/payment.service';
import { OrderModule } from '../order/order.module';
import { BalanceModule } from '../balance/balance.module';
import { PaymentController } from 'src/interfaces/controllers/payment/payment.controller';
import { PAYMENT_REPOSITORY } from 'src/common/constants/app.constants';
import { PaymentRepositoryPrisma } from 'src/domain/payment/repository/payment.repository.prisma';
import { DatabaseModule } from 'src/infrastructure/database/database.module';
import { PaymentStatisticsService } from './service/payment-statistics.service';
import { EventEmitterModule } from '@nestjs/event-emitter';

@Module({
    imports: [
        DatabaseModule, 
        OrderModule, 
        BalanceModule,
        EventEmitterModule.forRoot()
    ],
    controllers: [PaymentController],
    providers: [
        PaymentService,
        {
            provide: PAYMENT_REPOSITORY,
            useClass: PaymentRepositoryPrisma
        },
        PaymentStatisticsService,
    ],
    exports: [PaymentService, PAYMENT_REPOSITORY]
})
export class PaymentModule {}