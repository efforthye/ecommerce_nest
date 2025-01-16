import { Module } from '@nestjs/common';
import { OrderService } from './service/order.service';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { OrderController } from 'src/interfaces/controllers/order/order.controller';
import { OrderRepositoryPrisma } from 'src/domain/order/repository/order.repository.prisma';
import { ORDER_REPOSITORY } from 'src/common/constants/app.constants';

@Module({
    controllers: [OrderController],
    providers: [
        OrderService,
        {
            provide: ORDER_REPOSITORY,
            useClass: OrderRepositoryPrisma,
        },
        PrismaService,
    ],
    exports: [OrderService, ORDER_REPOSITORY],
})
export class OrderModule {}
