import { Injectable } from '@nestjs/common';
import { FcfsCoupon, UserCoupon, Prisma, CouponStatus } from '@prisma/client';
import { PaginationDto } from 'src/domain/coupon/dto/pagination.dto';
import { CouponRepository } from 'src/domain/coupon/repository/coupon.repository';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { FcfsCouponWithCoupon, CreateUserCouponInput } from 'src/domain/coupon/types/coupon.types';

@Injectable()
export class CouponRepositoryImpl implements CouponRepository {
    constructor(private readonly prisma: PrismaService) {}

    async findFcfsCouponById(id: number): Promise<FcfsCoupon | null> {
        return this.prisma.fcfsCoupon.findUnique({
            where: { id },
            include: { coupon: true }
        });
    }

    async findAvailableFcfsCoupons(
        pagination: PaginationDto
    ): Promise<[FcfsCoupon[], number]> {
        const now = new Date();

        const [fcfsCoupons, total] = await Promise.all([
            this.prisma.fcfsCoupon.findMany({
                where: {
                    stockQuantity: { gt: 0 },
                    startDate: { lte: now },
                    endDate: { gte: now }
                },
                include: { coupon: true },
                skip: pagination.getSkip(),
                take: pagination.getTake(),
                orderBy: { createdAt: 'desc' }
            }),
            this.prisma.fcfsCoupon.count({
                where: {
                    stockQuantity: { gt: 0 },
                    startDate: { lte: now },
                    endDate: { gte: now }
                }
            })
        ]);

        return [fcfsCoupons, total];
    }

    async findUserCoupons(
        userId: number,
        pagination: PaginationDto
    ): Promise<[UserCoupon[], number]> {
        const [userCoupons, total] = await Promise.all([
            this.prisma.userCoupon.findMany({
                where: { userId },
                include: { coupon: true },
                skip: pagination.getSkip(),
                take: pagination.getTake(),
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
        const result = await tx.$queryRaw<{
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
        }[]>`
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
            FROM FcfsCoupon fc
            INNER JOIN Coupon c ON fc.couponId = c.id
            WHERE fc.id = ${id}
            FOR UPDATE;
        `;

        if (!result?.[0]) return null;

        const row = result[0];
        const {id: rowId, couponId, totalQuantity, stockQuantity, startDate, endDate, createdAt} = row;
        const {c_id, c_name, c_type, c_amount, c_minOrderAmount, c_validDays, c_isFcfs, c_createdAt} = row;
        return {
            id: rowId, couponId, totalQuantity, stockQuantity, startDate, endDate, createdAt,
            coupon: {
                id: c_id,
                name: c_name,
                type: c_type,
                amount: c_amount,
                minOrderAmount: c_minOrderAmount,
                validDays: c_validDays,
                isFcfs: c_isFcfs,
                createdAt: c_createdAt
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
        const prismaData: Prisma.UserCouponCreateInput = {
            user: {
                connect: { id: data.userId }
            },
            coupon: {
                connect: { id: data.couponId }
            },
            status: data.status,
            expiryDate: data.expiryDate
        };

        return tx.userCoupon.create({
            data: prismaData
        });
    }

    async findExistingUserCoupon(
        userId: number,
        couponId: number,
        tx: Prisma.TransactionClient
    ): Promise<UserCoupon | null> {
        return tx.userCoupon.findFirst({
            where: {
                userId,
                couponId,
                status: "AVAILABLE"
            }
        });
    }
}
