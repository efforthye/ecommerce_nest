import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { Redis } from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
    private readonly redisClients: Redis[];
    
    constructor() {
        this.redisClients = [
            new Redis({ host: 'localhost', port: 6379, retryStrategy: (times) => Math.min(times * 50, 2000) }),
            new Redis({ host: 'localhost', port: 6380, retryStrategy: (times) => Math.min(times * 50, 2000) }),
            new Redis({ host: 'localhost', port: 6381, retryStrategy: (times) => Math.min(times * 50, 2000) }),
            new Redis({ host: 'localhost', port: 6382, retryStrategy: (times) => Math.min(times * 50, 2000) }),
        ];
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
    
}