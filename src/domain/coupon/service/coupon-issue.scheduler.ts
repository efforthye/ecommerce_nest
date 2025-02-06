import { Inject, Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { CouponRedisRepository } from '../repository/coupon.redis.repository';
import { CouponRepository } from '../repository/coupon.repository';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { CouponStatus } from '@prisma/client';
import { PaginationDto } from '../dto/pagination.dto';
import { COUPON_REPOSITORY } from 'src/common/constants/app.constants';

@Injectable()
export class CouponIssueScheduler {
    private readonly BATCH_SIZE = 100;

    constructor(
        private readonly couponRedisRepository: CouponRedisRepository,
        @Inject(COUPON_REPOSITORY)
        private readonly couponRepository: CouponRepository,
        private readonly prisma: PrismaService
    ) {}

    @Cron('*/10 * * * * *', {name: 'process-coupon-requests'}) // 10초마다 실행
    async processCouponRequests() {
        const pagination = new PaginationDto();
        pagination.page = 1;
        pagination.limit = 100;

        // 유효한 선착순 쿠폰 조회 (쿠폰 상세 정보 포함)
        const [activeCoupons] = await this.couponRepository.findAvailableFcfsCoupons(pagination);

        for (const fcfsCoupon of activeCoupons) {
            // Redis에서 대기 중인 요청 가져오기
            const requestUsers = await this.couponRedisRepository.getRequestUsers(
                fcfsCoupon.id,
                Math.min(this.BATCH_SIZE, fcfsCoupon.stockQuantity)
            );

            if (requestUsers.length === 0) continue;

            // 트랜잭션으로 쿠폰 발급 처리
            await this.prisma.$transaction(async (tx) => {
                for (const userId of requestUsers) {
                    const userIdNum = parseInt(userId);
                    
                    try {
                        // 쿠폰 상세 정보 조회 (validDays 포함)
                        const couponDetail = await this.couponRepository.findFcfsCouponWithLock(fcfsCoupon.id, tx);
                        if (!couponDetail || !couponDetail.coupon) continue;

                        // 이미 발급 받았는지 확인
                        const existingCoupon = await this.couponRepository.findExistingUserCoupon(
                            userIdNum,
                            couponDetail.couponId,
                            tx
                        );
                        if (existingCoupon) continue;

                        // 쿠폰 발급 처리
                        const expiryDate = new Date();
                        expiryDate.setDate(expiryDate.getDate() + couponDetail.coupon.validDays);

                        await this.couponRepository.createUserCoupon({
                            userId: userIdNum,
                            couponId: couponDetail.couponId,
                            status: CouponStatus.AVAILABLE,
                            expiryDate
                        }, tx);

                        // Redis에 발급 이력 추가
                        await this.couponRedisRepository.markAsIssued(fcfsCoupon.id, userIdNum);
                        
                        // 재고 감소
                        await this.couponRepository.decreaseFcfsCouponStock(fcfsCoupon.id, tx);
                    } catch (error) {
                        console.error(`Failed to issue coupon for user ${userId}:`, error);
                    }
                }
            });
        }
    }
}
