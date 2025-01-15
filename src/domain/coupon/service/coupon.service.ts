import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CouponRepository } from '../repository/coupon.repository';
import { CouponStatus, FcfsCoupon, UserCoupon } from '@prisma/client';
import { COUPON_REPOSITORY } from 'src/common/constants/app.constants';
import { PaginationDto } from '../dto/pagination.dto';
import { CouponPageResponse } from '../dto/coupon_page_response.dto';
import { PrismaService } from 'src/infrastructure/database/prisma.service';

@Injectable()
export class CouponService {
    constructor(
        @Inject(COUPON_REPOSITORY)
        private readonly couponRepository: CouponRepository,
        private readonly prisma: PrismaService
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
    
    // 선착순 쿠폰 발급
    async issueFcfsCoupon(userId: number, fcfsCouponId: number): Promise<UserCoupon> {
        return await this.prisma.$transaction(async (tx) => {
            const fcfsCoupon = await this.couponRepository.findFcfsCouponWithLock(fcfsCouponId, tx);
            if (!fcfsCoupon) throw new NotFoundException('Coupon not found');

            // 중복 발급 체크
            const existingCoupon = await this.couponRepository.findExistingUserCoupon(
                userId,
                fcfsCoupon.couponId,
                tx
            );
            if (existingCoupon) throw new BadRequestException('이미 사용된 쿠폰입니다.');

            if (fcfsCoupon.stockQuantity <= 0) {
                throw new BadRequestException('Coupon stock is empty');
            }

            const now = new Date();
            if (now < fcfsCoupon.startDate || now > fcfsCoupon.endDate) {
                throw new BadRequestException('Coupon is not available now');
            }

            await this.couponRepository.decreaseFcfsCouponStock(fcfsCouponId, tx);

            const expiryDate = new Date();
            expiryDate.setDate(expiryDate.getDate() + fcfsCoupon.coupon.validDays);

            return await this.couponRepository.createUserCoupon(
                {
                    userId,
                    couponId: fcfsCoupon.couponId,
                    status: CouponStatus.AVAILABLE,
                    expiryDate
                },
                tx
            );
        });
    }

    // 유저 쿠폰 목록 조회
    async getMyCoupons(userId: number, pagination: PaginationDto): Promise<{ data: UserCoupon[]; total: number }> {
        const [coupons, total] = await this.couponRepository.findUserCoupons(userId, pagination);
        return { data: coupons, total };
    }
}
