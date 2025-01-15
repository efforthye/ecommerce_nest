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
        type QueryResult = {
            id: number;
            couponId: number;
            totalQuantity: number;
            stockQuantity: number;
            startDate: Date;
            endDate: Date;
            createdAt: Date;
            c_id: number;
            c_name: string;
            c_type: string;
            c_amount: number;
            c_minOrderAmount: number;
            c_validDays: number;
            c_isFcfs: boolean;
            c_createdAt: Date;
        }[];

        const result = await tx.$queryRaw<QueryResult>`
            SELECT 
                fc.*,
                c.id as c_id,
                c.name as c_name,
                c.type as c_type,
                c.amount as c_amount,
                c.minOrderAmount as c_minOrderAmount, 
                c.validDays as c_validDays,
                c.isFcfs as c_isFcfs,
                c.createdAt as c_createdAt
            FROM \`FcfsCoupon\` fc
            INNER JOIN \`Coupon\` c ON fc.\`couponId\` = c.id
            WHERE fc.id = ${id}
            FOR UPDATE;
        `;

        if (!result || result.length === 0) {
            return null;
        }

        const row = result[0];
        return {
            id: row.id,
            couponId: row.couponId,
            totalQuantity: row.totalQuantity,
            stockQuantity: row.stockQuantity,
            startDate: row.startDate,
            endDate: row.endDate,
            createdAt: row.createdAt,
            coupon: {
                id: row.c_id,
                name: row.c_name,
                type: row.c_type,
                amount: row.c_amount,
                minOrderAmount: row.c_minOrderAmount,
                validDays: row.c_validDays,
                isFcfs: row.c_isFcfs,
                createdAt: row.c_createdAt
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
