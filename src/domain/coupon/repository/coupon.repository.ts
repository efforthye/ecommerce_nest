import { FcfsCoupon } from "@prisma/client";
import { PaginationDto } from "../dto/pagination.dto";

export interface CouponRepository {
    findFcfsCouponById(id: number): Promise<FcfsCoupon | null>;
    findAvailableFcfsCoupons(pagination: PaginationDto): Promise<[FcfsCoupon[], number]>;
}