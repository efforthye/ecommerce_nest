import { FcfsCoupon, Prisma, UserCoupon } from "@prisma/client";
import { PaginationDto } from "../dto/pagination.dto";
import { CreateUserCouponInput, FcfsCouponWithCoupon } from "../types/coupon.types";

export interface CouponRepository {
    findFcfsCouponById(id: number): Promise<FcfsCoupon | null>;
    findAvailableFcfsCoupons(pagination: PaginationDto): Promise<[FcfsCoupon[], number]>;
    findUserCoupons(userId: number, pagination: PaginationDto): Promise<[UserCoupon[], number]>;
    findExistingUserCoupon(userId: number, couponId: number, tx: Prisma.TransactionClient): Promise<UserCoupon | null>;

    findFcfsCouponWithLock(id: number, tx: Prisma.TransactionClient): Promise<FcfsCouponWithCoupon | null>;
    decreaseFcfsCouponStock(id: number, tx: Prisma.TransactionClient): Promise<void>;
    createUserCoupon(data: CreateUserCouponInput, tx: Prisma.TransactionClient): Promise<UserCoupon>;
}