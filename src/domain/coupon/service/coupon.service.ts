import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CouponRepository } from '../repository/coupon.repository';
import { FcfsCoupon } from '@prisma/client';
import { COUPON_REPOSITORY } from 'src/common/constants/repository.constants';
import { PaginationDto } from '../dto/pagination.dto';
import { CouponPageResponse } from '../dto/coupon_page_response.dto';

@Injectable()
export class CouponService {
    getMyCoupons: any;
    constructor(
        @Inject(COUPON_REPOSITORY)
        private readonly couponRepository: CouponRepository
    ) {}

    // 발급 가능한 선착순 쿠폰 목록
    async getAvailableFcfsCoupons(pagination: PaginationDto): Promise<CouponPageResponse> {
        const [items, total] = await this.couponRepository.findAvailableFcfsCoupons(pagination);
        return new CouponPageResponse(items, total, pagination.page, pagination.limit);
    }

    // 선착순 쿠폰 정보
    async getFcfsCouponById(id: number): Promise<FcfsCoupon> {
        const coupon = await this.couponRepository.findFcfsCouponById(id);
        if (!coupon) throw new NotFoundException('Coupon not found');
        return coupon;
    }
}
