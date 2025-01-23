import { ConflictException, Injectable } from '@nestjs/common';
import { Redis } from 'ioredis';
import { RedisService } from './redis.service';
import Redlock from 'redlock';

@Injectable() 
export class RedisRedlock {
    private readonly redlock: Redlock;
    private readonly defaultTTL = 30000;

    constructor(private readonly redisService: RedisService) {
        const clients = this.redisService.getClients();
        if (clients.length === 0) throw new Error('No Redis clients available');

        this.redlock = new Redlock(clients, {
            driftFactor: 0.01,             // 보정 팩터
            retryCount: 10,                 // 재시도 횟수
            retryDelay: 200,                 // 재시도 딜레이 (ms)
            retryJitter: 100,                 // 랜덤 지터 추가
            automaticExtensionThreshold: 2000 // 락 자동 연장
        });

        this.redlock.on('error', (error) => {
            console.error('Redlock error:', error);
        });
    }

    async acquireLock(resource: string, ttl = this.defaultTTL) {
        try {
            return await this.redlock.acquire([`locks:${resource}`], ttl);
        } catch (error) {
            if (error.name === 'LockError') {
                throw new ConflictException(`Resource ${resource} is locked`);
            }
            throw error;
        }
    }

    async releaseLock(lock: any) {
        if (!lock) return;
        try {
            await lock.release();
        } catch (error) {
            console.error('Lock release failed:', error);
        }
    }
}