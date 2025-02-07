import { Coupon, FcfsCoupon, Prisma, UserCoupon } from "@prisma/client";
import { PaginationDto } from "../dto/pagination.dto";
import { CreateUserCouponInput, FcfsCouponWithCoupon } from "../types/coupon.types";

export interface CouponRepository {
    findExistingUserCoupon(userId: number, couponId: number, tx: Prisma.TransactionClient): Promise<UserCoupon | null>;
    findAvailableFcfsCoupons(pagination: PaginationDto): Promise<[FcfsCoupon[], number]>;
    findFcfsCouponById(id: number): Promise<FcfsCouponWithCoupon | null>;
    findUserCoupons(userId: number, pagination: PaginationDto): Promise<[UserCoupon[], number]>;
    issueFcfsCoupon(userId: number, fcfsCouponId: number): Promise<UserCoupon>;
    findFcfsCouponWithLock(id: number, tx: Prisma.TransactionClient): Promise<FcfsCouponWithCoupon | null>;
    decreaseFcfsCouponStock(id: number, tx: Prisma.TransactionClient): Promise<void>;
    createUserCoupon(data: CreateUserCouponInput, tx: Prisma.TransactionClient): Promise<UserCoupon>;
}