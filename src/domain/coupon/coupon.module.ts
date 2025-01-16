import { Module } from '@nestjs/common';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { CouponService } from './service/coupon.service';
import { COUPON_REPOSITORY } from 'src/common/constants/app.constants';
import { CouponRepositoryPrisma } from './repository/coupon.repository.prisma';

@Module({
    providers: [
        CouponService, // 비즈니스 로직 관리
        PrismaService, // DB 접근
        {
            provide: COUPON_REPOSITORY,
            useClass: CouponRepositoryPrisma,
        }
    ],
    exports: [CouponService, COUPON_REPOSITORY], // 다른 모듈에서 사용할 수 있도록 내보냄
})
export class CouponModule {}
