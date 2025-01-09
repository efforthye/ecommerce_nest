
import { Injectable } from '@nestjs/common';
import { FcfsCoupon } from '@prisma/client';
import { PaginationDto } from 'src/domain/coupon/dto/pagination.dto';
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
    async findAvailableFcfsCoupons(pagination: PaginationDto): Promise<[FcfsCoupon[], number]> {
        const now = new Date();

        // 전체 쿠폰 개수
        const totalCount = await this.prisma.fcfsCoupon.count({
            where: {
                startDate: { lte: now },
                endDate: { gte: now },
                stockQuantity: { gt: 0 },
            },
        });

        // 페이징 처리된 데이터 가져오기
        const coupons = await this.prisma.fcfsCoupon.findMany({
            where: {
                startDate: { lte: now },
                endDate: { gte: now },
                stockQuantity: { gt: 0 },
            },
            skip: pagination.getSkip(),
            take: pagination.getTake(),
        });

        return [coupons, totalCount];
    }
}