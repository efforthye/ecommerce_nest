import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { FcfsCoupon, UserCoupon } from '@prisma/client';
import { PaginationDto } from '../dto/pagination.dto';
import { CouponPageResponse } from '../dto/coupon_page_response.dto';
import { CouponRepository } from '../repository/coupon.repository';
import { COUPON_REPOSITORY } from 'src/common/constants/app.constants';

@Injectable()
export class CouponService {
    constructor(
        @Inject(COUPON_REPOSITORY)
        private readonly couponRepository: CouponRepository
    ) {}

    // 발급 가능한 선착순 쿠폰 목록
    async getAvailableFcfsCoupons(pagination: PaginationDto): Promise<CouponPageResponse> {
        const [fcfsCoupons, total] = await this.couponRepository.findAvailableFcfsCoupons(pagination);
        return new CouponPageResponse(fcfsCoupons, total, pagination.page, pagination.limit);
    }

    // 선착순 쿠폰 정보
    async getFcfsCouponById(id: number): Promise<FcfsCoupon> {
        const coupon = await this.couponRepository.findFcfsCouponById(id);
        if (!coupon) throw new NotFoundException('Coupon not found');
        return coupon;
    }
    
    // 선착순 쿠폰 발급
    async issueFcfsCoupon(userId: number, fcfsCouponId: number): Promise<UserCoupon> {
        return this.couponRepository.issueFcfsCoupon(userId, fcfsCouponId);
    }

    // 유저 쿠폰 목록 조회
    async getMyCoupons(userId: number, pagination: PaginationDto): Promise<{ data: UserCoupon[]; total: number }> {
        const [coupons, total] = await this.couponRepository.findUserCoupons(userId, pagination);
        return { data: coupons, total };
    }
}