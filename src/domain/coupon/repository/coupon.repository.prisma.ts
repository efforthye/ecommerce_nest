
import { Injectable } from '@nestjs/common';
import { CouponRepository } from './coupon.repository';
import { FcfsCoupon } from '@prisma/client';
import { PaginationDto } from '../dto/pagination.dto';
import { PrismaService } from 'src/infrastructure/database/prisma.service';

@Injectable()
export class CouponRepositoryPrisma implements CouponRepository {
    constructor(private prisma: PrismaService) {}

    async findAvailableFcfsCoupons(pagination: PaginationDto): Promise<[FcfsCoupon[], number]> {
        const now = new Date();
        
        const [items, total] = await Promise.all([
            this.prisma.fcfsCoupon.findMany({
                where: {
                    startDate: { lte: now },
                    endDate: { gte: now },
                    stockQuantity: { gt: 0 }
                },
                skip: pagination.getSkip(),
                take: pagination.getTake(),
                orderBy: { createdAt: 'desc' }
            }),
            this.prisma.fcfsCoupon.count({
                where: {
                    startDate: { lte: now },
                    endDate: { gte: now },
                    stockQuantity: { gt: 0 }
                }
            })
        ]);

        return [items, total];
    }

    async findFcfsCouponById(id: number): Promise<FcfsCoupon | null> {
        return this.prisma.fcfsCoupon.findUnique({
            where: { id }
        });
    }
}