import { Module } from '@nestjs/common';
import { CartController } from 'src/interfaces/controllers/cart/cart.controller';
import { CartService } from './service/cart.service';
import { CartRepositoryPrisma } from './repository/cart.repository.prisma';
import { ProductModule } from '../product/product.module';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { CART_REPOSITORY } from 'src/common/constants/app.constants';

@Module({
    imports: [ProductModule],
    controllers: [CartController],
    providers: [
        CartService,
        PrismaService,
        {
            provide: CART_REPOSITORY,
            useClass: CartRepositoryPrisma
        }
    ],
    exports: [CartService, CART_REPOSITORY]
})
export class CartModule {}