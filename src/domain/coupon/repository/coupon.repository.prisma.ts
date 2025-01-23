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
        return this.prisma.$transaction(async (tx) => {
            // 비관적 락으로 데이터 격리
            await tx.$executeRawUnsafe(`
                SELECT * FROM FcfsCoupon 
                WHERE id = ? 
                AND stockQuantity > 0 
                FOR UPDATE NOWAIT
            `, fcfsCouponId);

            const fcfsCoupon = await this.findFcfsCouponWithLock(fcfsCouponId, tx);
            if (!fcfsCoupon) throw new NotFoundException('Coupon not found');

            const existingCoupon = await this.findExistingUserCoupon(
                userId, 
                fcfsCoupon.couponId,
                tx
            );
            if (existingCoupon) throw new BadRequestException('Already issued');

            const now = new Date();
            if (now < fcfsCoupon.startDate || now > fcfsCoupon.endDate) {
                throw new BadRequestException('Coupon not available');
            }

            await this.decreaseFcfsCouponStock(fcfsCouponId, tx);

            const expiryDate = new Date();
            expiryDate.setDate(expiryDate.getDate() + fcfsCoupon.coupon.validDays);

            return await this.createUserCoupon({
                userId,
                couponId: fcfsCoupon.couponId,
                status: CouponStatus.AVAILABLE,
                expiryDate
            }, tx);
        }, {
            isolationLevel: Prisma.TransactionIsolationLevel.Serializable
        });
    }

    async findFcfsCouponWithLock(
        id: number,
        tx: Prisma.TransactionClient
    ): Promise<FcfsCouponWithCoupon | null> {
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
