import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class CacheService {
    constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

    async get<T>(key: string): Promise<T | null> {
        return await this.cacheManager.get<T>(key);
    }

    async set(key: string, value: any, ttl?: number): Promise<void> {
        await this.cacheManager.set(key, value, ttl);
    }

    async del(key: string): Promise<void> {
        await this.cacheManager.del(key);
    }

    // 캐시 어사이드 패턴(getOrSet) 구현
    async getOrSet<T>(key: string, fetchFn: () => Promise<T>, ttl?: number): Promise<T> {
        const cached = await this.get<T>(key);
        if (cached) return cached;

        const value = await fetchFn();
        await this.set(key, value, ttl);
        return value;
    }
}