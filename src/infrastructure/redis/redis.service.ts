import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { Redis } from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
    private readonly redisClients: Redis[];
    private primaryClient: Redis;

    constructor() {
        this.redisClients = [
            new Redis({ host: 'localhost', port: 6379, retryStrategy: (times) => Math.min(times * 50, 2000) }),
            new Redis({ host: 'localhost', port: 6380, retryStrategy: (times) => Math.min(times * 50, 2000) }),
            new Redis({ host: 'localhost', port: 6381, retryStrategy: (times) => Math.min(times * 50, 2000) }),
            new Redis({ host: 'localhost', port: 6382, retryStrategy: (times) => Math.min(times * 50, 2000) }),
        ];
        this.primaryClient = this.redisClients[0]; // 기본 클라이언트 설정
    }

    getClients(): Redis[] {
        return this.redisClients;
    }

    async onModuleInit() {
        try {
            const responses = await Promise.all(this.redisClients.map(client => client.ping()));
            console.log('Redis connections successful:', responses);
        } catch (error) {
            console.error('Redis connection failed:', error);
            throw new Error('Failed to connect to Redis instances');
        }
    }

    async onModuleDestroy() {
        if (this.redisClients) {
            try {
                await Promise.all(this.redisClients.map(client => client.quit()));
                console.log('Redis clients disconnected successfully');
            } catch (error) {
                console.error('Error while disconnecting Redis clients:', error);
            }
        }
    }

    // Sorted Set 명령어
    async zadd(key: string, score: number, member: string): Promise<void> {
        await this.primaryClient.zadd(key, score, member);
    }

    async zpopmin(key: string, count: number): Promise<string[]> {
        const result = await this.primaryClient.zpopmin(key, count);
        // Redis의 zpopmin은 [member1, score1, member2, score2, ...] 형태로 반환
        const members: string[] = [];
        for (let i = 0; i < result.length; i += 2) {
            members.push(result[i]);
        }
        return members;
    }

    // Set 명령어
    async sadd(key: string, member: string): Promise<void> {
        await this.primaryClient.sadd(key, member);
    }

    async sismember(key: string, member: string): Promise<boolean> {
        const result = await this.primaryClient.sismember(key, member);
        return result === 1;
    }

    async scard(key: string): Promise<number> {
        return await this.primaryClient.scard(key);
    }
}