import { Injectable, BadRequestException, NotFoundException, Inject, ConflictException } from '@nestjs/common';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { COUPON_REPOSITORY } from 'src/common/constants/app.constants';
import { CouponStatus, Prisma } from '@prisma/client';
import { PaginationDto } from '../dto/pagination.dto';
import { CouponRepository } from '../repository/coupon.repository';
import { RedisRedlock } from 'src/infrastructure/redis/redis.redlock';
import { CouponRedisRepository } from '../repository/coupon.redis.repository';

@Injectable()
export class CouponService {
    constructor(
        @Inject(COUPON_REPOSITORY)
        private readonly couponRepository: CouponRepository,
        private readonly couponRedisRepository: CouponRedisRepository,
        private readonly prisma: PrismaService,
        private readonly redlock: RedisRedlock
    ) {
        
    }

    async getAvailableFcfsCoupons(pagination: PaginationDto) {
        const [items, total] = await this.couponRepository.findAvailableFcfsCoupons(pagination);
        return {
            items,
            total,
            page: pagination.page,
            limit: pagination.limit
        };
    }

    async getFcfsCouponById(id: number) {
        const fcfsCoupon = await this.couponRepository.findFcfsCouponById(id);
        if (!fcfsCoupon) {
            throw new NotFoundException('Coupon not found');
        }
        return fcfsCoupon;
    }

    // async issueFcfsCoupon(userId: number, fcfsCouponId: number) {
    //     const lock = await this.redlock.acquireLock(`fcfs-coupon:${fcfsCouponId}`, 5000);
    //     if (!lock) throw new ConflictException('Failed to acquire lock');

    //     try {
    //         return await this.prisma.$transaction(async (tx) => {
    //             // 락을 획득하여 쿠폰 조회
    //             const fcfsCoupon = await this.couponRepository.findFcfsCouponWithLock(fcfsCouponId, tx);
    //             if (!fcfsCoupon) throw new NotFoundException('Coupon not found');
    
    //             // 재고 확인 
    //             if (fcfsCoupon.stockQuantity <= 0) throw new BadRequestException('Coupon stock is empty');
    
    //             // 발급 기간 확인
    //             const now = new Date();
    //             if (now < fcfsCoupon.startDate || now > fcfsCoupon.endDate) {
    //                 throw new BadRequestException('Coupon is not available at this time');
    //             }
    
    //             // 기존 발급 여부 확인
    //             const existingCoupon = await this.couponRepository.findExistingUserCoupon(
    //                 userId,
    //                 fcfsCoupon.couponId,
    //                 tx
    //             );
    //             if (existingCoupon) throw new BadRequestException('이미 발급된 쿠폰입니다.');
    
    //             // 재고 감소
    //             await this.couponRepository.decreaseFcfsCouponStock(fcfsCouponId, tx);
    
    //             // 사용자 쿠폰 생성
    //             const expiryDate = new Date();
    //             expiryDate.setDate(expiryDate.getDate() + fcfsCoupon.coupon.validDays);
    
    //             const userCoupon = await this.couponRepository.createUserCoupon({
    //                 userId,
    //                 couponId: fcfsCoupon.couponId,
    //                 status: CouponStatus.AVAILABLE,
    //                 expiryDate
    //             }, tx);
    
    //             return userCoupon;
    //         });
    //     } finally {
    //         await this.redlock.releaseLock(lock);
    //     }
    // }

    async issueFcfsCoupon(userId: number, fcfsCouponId: number) {
        const lock = await this.redlock.acquireLock(`fcfs-coupon:${fcfsCouponId}`, 5000);
        if (!lock) throw new ConflictException('Failed to acquire lock');

        try {
            // 쿠폰 정보 조회
            const fcfsCoupon = await this.couponRepository.findFcfsCouponById(fcfsCouponId);
            if (!fcfsCoupon) throw new NotFoundException('Coupon not found');

            // 발급 가능 시간 확인
            const now = new Date();
            if (now < fcfsCoupon.startDate || now > fcfsCoupon.endDate) {
                throw new BadRequestException('Coupon is not available at this time');
            }

            // 이미 발급받은 쿠폰인지 Redis에서 확인
            const hasIssued = await this.couponRedisRepository.hasIssued(fcfsCouponId, userId);
            if (hasIssued) throw new BadRequestException('이미 발급된 쿠폰입니다.');

            // Redis에서 발급된 수량 확인
            const issuedCount = await this.couponRedisRepository.getIssuedCount(fcfsCouponId);
            if (issuedCount >= fcfsCoupon.stockQuantity) {
                throw new BadRequestException('Coupon stock is empty');
            }

            // 트랜잭션으로 쿠폰 발급 처리
            const userCoupon = await this.prisma.$transaction(async (tx) => {
                // 기존 발급 여부 DB에서 한 번 더 체크
                const existingCoupon = await this.couponRepository.findExistingUserCoupon(
                    userId,
                    fcfsCoupon.couponId,
                    tx
                );
                if (existingCoupon) throw new BadRequestException('이미 발급된 쿠폰입니다.');

                // 쿠폰 발급
                const expiryDate = new Date();
                expiryDate.setDate(expiryDate.getDate() + fcfsCoupon.coupon.validDays);

                return await this.couponRepository.createUserCoupon({
                    userId,
                    couponId: fcfsCoupon.couponId,
                    status: CouponStatus.AVAILABLE,
                    expiryDate
                }, tx);
            });

            // Redis에 발급 완료 표시
            await this.couponRedisRepository.markAsIssued(fcfsCouponId, userId);

            return userCoupon;
        } finally {
            await this.redlock.releaseLock(lock);
        }
    }

    async getMyCoupons(userId: number, pagination: PaginationDto) {
        const [coupons, total] = await this.couponRepository.findUserCoupons(userId, pagination);
        return {
            items: coupons,
            total,
            page: pagination.page,
            limit: pagination.limit
        };
    }
}