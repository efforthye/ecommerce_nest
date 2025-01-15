import { Module } from '@nestjs/common';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { CouponService } from './service/coupon.service';
import { CouponRepositoryImpl } from 'src/infrastructure/repositories/coupon/coupon.repository.impl';
import { COUPON_REPOSITORY } from 'src/common/constants/app.constants';

@Module({
    providers: [
        CouponService, // 비즈니스 로직 관리
        {
            provide: COUPON_REPOSITORY,
            useClass: CouponRepositoryImpl, // 인터페이스와 구현체 연결
        },
        PrismaService, // DB 접근
    ],
    exports: [CouponService, COUPON_REPOSITORY], // 다른 모듈에서 사용할 수 있도록 내보냄
})
export class CouponModule {}
