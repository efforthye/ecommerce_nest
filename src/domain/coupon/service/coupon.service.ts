import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CouponStatus, FcfsCoupon, UserCoupon } from '@prisma/client';
import { PaginationDto } from '../dto/pagination.dto';
import { CouponPageResponse } from '../dto/coupon_page_response.dto';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { CouponRepository } from '../repository/coupon.repository';
import { COUPON_REPOSITORY } from 'src/common/constants/app.constants';

@Injectable()
export class CouponService {
    constructor(
        private readonly prisma: PrismaService,
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
        return await this.prisma.$transaction(async (tx) => {
            // FOR UPDATE로 쿠폰 정보 조회
            const fcfsCoupon = await this.couponRepository.findFcfsCouponWithLock(fcfsCouponId, tx);
            if (!fcfsCoupon) throw new NotFoundException('Coupon not found');

            // 중복 발급 체크
            const existingCoupon = await this.couponRepository.findExistingUserCoupon(
                userId, 
                fcfsCoupon.couponId,
                tx
            );
            if (existingCoupon) throw new BadRequestException('이미 발급된 쿠폰입니다.');

            // 재고 체크
            if (fcfsCoupon.stockQuantity <= 0) {
                throw new BadRequestException('Coupon stock is empty');
            }

            // 발급 기간 체크
            const now = new Date();
            if (now < fcfsCoupon.startDate || now > fcfsCoupon.endDate) {
                throw new BadRequestException('Coupon is not available now');
            }

            // 재고 감소
            await this.couponRepository.decreaseFcfsCouponStock(fcfsCouponId, tx);

            // 쿠폰 만료일 계산
            const expiryDate = new Date();
            expiryDate.setDate(expiryDate.getDate() + fcfsCoupon.coupon.validDays);

            // 쿠폰 발급
            return await this.couponRepository.createUserCoupon({
                userId,
                couponId: fcfsCoupon.couponId,
                status: CouponStatus.AVAILABLE,
                expiryDate
            }, tx);
        });
    }

    // 유저 쿠폰 목록 조회
    async getMyCoupons(userId: number, pagination: PaginationDto): Promise<{ data: UserCoupon[]; total: number }> {
        const [coupons, total] = await this.couponRepository.findUserCoupons(userId, pagination);
        return { data: coupons, total };
    }
}