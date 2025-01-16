import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { FcfsCoupon, UserCoupon, Prisma, CouponStatus } from '@prisma/client';
import { PaginationDto } from '../dto/pagination.dto';
import { CouponRepository } from './coupon.repository';
import { FcfsCouponWithCoupon, CreateUserCouponInput } from '../types/coupon.types';

@Injectable()
export class CouponRepositoryPrisma implements CouponRepository {
    constructor(private readonly prisma: PrismaService) {}
    
    async findExistingUserCoupon(
        userId: number, 
        couponId: number, 
        tx: Prisma.TransactionClient
    ): Promise<UserCoupon | null> {
        return await tx.userCoupon.findFirst({
            where: {
                userId,
                couponId,
                status: CouponStatus.AVAILABLE
            }
        });
    }

    async findAvailableFcfsCoupons(
        pagination: PaginationDto
    ): Promise<[FcfsCoupon[], number]> {
        const { page = 1, limit = 10 } = pagination;
        const skip = (page - 1) * limit;

        const [fcfsCoupons, total] = await Promise.all([
            this.prisma.fcfsCoupon.findMany({
                where: {
                    stockQuantity: { gt: 0 },
                    startDate: { lte: new Date() },
                    endDate: { gte: new Date() }
                },
                include: { coupon: true },
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' }
            }),
            this.prisma.fcfsCoupon.count({
                where: {
                    stockQuantity: { gt: 0 },
                    startDate: { lte: new Date() },
                    endDate: { gte: new Date() }
                }
            })
        ]);

        return [fcfsCoupons, total];
    }

    async findFcfsCouponById(id: number): Promise<FcfsCoupon | null> {
        return this.prisma.fcfsCoupon.findUnique({
            where: { id },
            include: { coupon: true }
        });
    }

    async findUserCoupons(
        userId: number,
        pagination: PaginationDto
    ): Promise<[UserCoupon[], number]> {
        const { page = 1, limit = 10 } = pagination;
        const skip = (page - 1) * limit;

        const [userCoupons, total] = await Promise.all([
            this.prisma.userCoupon.findMany({
                where: { userId },
                include: { coupon: true },
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' }
            }),
            this.prisma.userCoupon.count({
                where: { userId }
            })
        ]);

        return [userCoupons, total];
    }

    async findFcfsCouponWithLock(
        id: number,
        tx: Prisma.TransactionClient
    ): Promise<FcfsCouponWithCoupon | null> {
        // 먼저 FcfsCoupon 테이블만 잠금을 걸고 조회
        const fcfsCoupon = await tx.$queryRaw<{
            id: number;
            couponId: number;
            totalQuantity: number;
            stockQuantity: number;
            startDate: Date;
            endDate: Date;
            createdAt: Date;
        }[]>`
            SELECT * FROM \`FcfsCoupon\`
            WHERE id = ${id}
            FOR UPDATE;
        `;

        if (!fcfsCoupon || fcfsCoupon.length === 0) {
            return null;
        }

        // 관련 쿠폰 정보 조회 (잠금 없이)
        const coupon = await tx.coupon.findUnique({
            where: { id: fcfsCoupon[0].couponId }
        });

        if (!coupon) {
            return null;
        }

        return {
            ...fcfsCoupon[0],
            coupon: {
                id: coupon.id,
                name: coupon.name,
                type: coupon.type,
                amount: Number(coupon.amount),
                minOrderAmount: Number(coupon.minOrderAmount),
                validDays: coupon.validDays,
                isFcfs: coupon.isFcfs,
                createdAt: coupon.createdAt
            }
        };
    }

    async decreaseFcfsCouponStock(
        id: number,
        tx: Prisma.TransactionClient
    ): Promise<void> {
        await tx.fcfsCoupon.update({
            where: { id },
            data: { stockQuantity: { decrement: 1 } }
        });
    }

    async createUserCoupon(
        data: CreateUserCouponInput,
        tx: Prisma.TransactionClient
    ): Promise<UserCoupon> {
        return tx.userCoupon.create({ data });
    }
}
