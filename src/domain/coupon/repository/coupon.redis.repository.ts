import { Injectable } from '@nestjs/common';
import { RedisService } from 'src/infrastructure/redis/redis.service';

@Injectable()
export class CouponRedisRepository {
    constructor(private readonly redisService: RedisService) {}

    private getRequestKey(couponId: number): string {
        return `fcfs:coupon:${couponId}:requests`;
    }

    private getIssuedKey(couponId: number): string {
        return `fcfs:coupon:${couponId}:issued`;
    }

    async addToRequestQueue(couponId: number, userId: number): Promise<void> {
        const score = Date.now();
        await this.redisService.zadd(this.getRequestKey(couponId), score, userId.toString());
    }

    async getRequestUsers(couponId: number, count: number): Promise<string[]> {
        return await this.redisService.zpopmin(this.getRequestKey(couponId), count);
    }

    async markAsIssued(couponId: number, userId: number): Promise<void> {
        await this.redisService.sadd(this.getIssuedKey(couponId), userId.toString());
    }

    async hasIssued(couponId: number, userId: number): Promise<boolean> {
        return await this.redisService.sismember(this.getIssuedKey(couponId), userId.toString());
    }

    async getIssuedCount(couponId: number): Promise<number> {
        return await this.redisService.scard(this.getIssuedKey(couponId));
    }
}