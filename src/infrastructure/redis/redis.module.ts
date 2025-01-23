import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RedisService } from './redis.service';
import { RedisRedlock } from './redis.redlock';

@Global()
@Module({
    imports: [ConfigModule],
    providers: [
        RedisService, 
        RedisRedlock,
        {
            provide: 'REDIS_CONFIG',
            useValue: { host: 'localhost', port: 6379 }
        }
    ],
    exports: [RedisService, RedisRedlock],
})
export class RedisModule {}