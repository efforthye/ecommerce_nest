import { Module } from '@nestjs/common';
import { ProductService } from './service/product.service';
import { PRODUCT_REPOSITORY } from 'src/common/constants/repository.constants';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { ProductRepositoryImpl } from './repository/product.repository.impl';

@Module({
    providers: [
        ProductService,
        {
            provide: PRODUCT_REPOSITORY,
            useClass: ProductRepositoryImpl,
        },
        PrismaService
    ],
    exports: [ProductService]
})
export class ProductModule {}