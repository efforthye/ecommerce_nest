import { Module } from '@nestjs/common';
import { ProductService } from './service/product.service';
import { PRODUCT_REPOSITORY } from 'src/common/constants/app.constants';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { ProductRepositoryPrisma } from './repository/product.repository.impl';
import { EventEmitterModule } from '@nestjs/event-emitter';

@Module({
    imports: [
        EventEmitterModule.forRoot()
    ],
    providers: [
        ProductService,
        {
            provide: PRODUCT_REPOSITORY,
            useClass: ProductRepositoryPrisma,
        },
        PrismaService
    ],
    exports: [ProductService, PRODUCT_REPOSITORY]
})
export class ProductModule {}