import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { CouponRepository } from './coupon.repository';
import { CouponStatus, FcfsCoupon, Prisma, UserCoupon } from '@prisma/client';
import { CreateUserCouponInput, FcfsCouponWithCoupon } from '../types/coupon.types';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PaginationDto } from '../dto/pagination.dto';

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

    async issueFcfsCoupon(userId: number, fcfsCouponId: number): Promise<UserCoupon> {
        return await this.prisma.$transaction(async (tx) => {
            const [updated] = await tx.$queryRaw<any[]>`
                UPDATE FcfsCoupon 
                SET stockQuantity = stockQuantity - 1
                WHERE id = ${fcfsCouponId} 
                AND stockQuantity > 0
                AND NOT EXISTS (
                    SELECT 1 FROM UserCoupon 
                    WHERE userId = ${userId} 
                    AND couponId = FcfsCoupon.couponId
                )
                RETURNING *, 
                (SELECT validDays FROM Coupon WHERE id = FcfsCoupon.couponId) as validDays`;
    
            if (!updated) throw new BadRequestException('Coupon not available or already issued');
    
            const expiryDate = new Date();
            expiryDate.setDate(expiryDate.getDate() + updated.validDays);
    
            return await this.createUserCoupon({
                userId,
                couponId: updated.couponId,
                status: CouponStatus.AVAILABLE,
                expiryDate
            }, tx);
        }, {
            isolationLevel: Prisma.TransactionIsolationLevel.Serializable
        });
    }
    
    async findFcfsCouponWithLock(id: number, tx: Prisma.TransactionClient): Promise<FcfsCouponWithCoupon | null> {
        await tx.$executeRaw`SELECT * FROM FcfsCoupon WHERE id = ${id} FOR UPDATE`;
        
        const fcfsCoupon = await tx.fcfsCoupon.findUnique({
            where: { id },
            include: { coupon: true }
        });
    
        if (!fcfsCoupon) return null;
    
        return {
            ...fcfsCoupon,
            coupon: {
                ...fcfsCoupon.coupon,
                amount: Number(fcfsCoupon.coupon.amount),
                minOrderAmount: Number(fcfsCoupon.coupon.minOrderAmount)
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
