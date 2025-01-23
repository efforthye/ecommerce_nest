import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { Redis } from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
    private readonly redisClients: Redis[];
    
    constructor() {
        this.redisClients = [
            new Redis({ host: 'localhost', port: 6379, maxRetriesPerRequest: null, retryStrategy: (times) => null }),
            // new Redis({ host: 'localhost', port: 6380, maxRetriesPerRequest: null, retryStrategy: (times) => Math.min(times * 50, 2000) }),
            // new Redis({ host: 'localhost', port: 6381, maxRetriesPerRequest: null, retryStrategy: (times) => Math.min(times * 50, 2000) })
        ];
    }

    getClients(): Redis[] {
        return this.redisClients;
    }

    async onModuleInit() {
        await Promise.all(this.redisClients.map(client => client.ping()));
    }

    async onModuleDestroy() {
        if (this.redisClients) {
            await Promise.all(this.redisClients.map(client => client.disconnect()));
        }
    }
}