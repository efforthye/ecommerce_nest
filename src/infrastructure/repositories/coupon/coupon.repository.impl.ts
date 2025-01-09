
import { Injectable } from '@nestjs/common';
import { FcfsCoupon } from '@prisma/client';
import { CouponRepository } from 'src/domain/coupon/repository/coupon.repository';
import { PrismaService } from 'src/infrastructure/database/prisma.service';

@Injectable()
export class CouponRepositoryImpl implements CouponRepository {
    constructor(private prisma: PrismaService) {}

    // 프리즈마로 선착순 쿠폰 아이디로 선착순 쿠폰 정보 조회
    async findFcfsCouponById(id: number): Promise<FcfsCoupon | null> {
        return this.prisma.fcfsCoupon.findUnique({
            where: { id },
            include: {
                coupon: true,
            },
        });
    }

    // 현재 시점 기준 사용 가능한 쿠폰 목록 조회
    async findAvailableFcfsCoupons(): Promise<FcfsCoupon[]> {
        const now = new Date();
        return this.prisma.fcfsCoupon.findMany({
            where: {
                startDate: { lte: now },
                endDate: { gte: now },
                stockQuantity: { gt: 0 },
            },
            include: {
                coupon: true,
            },
        });
    }
}