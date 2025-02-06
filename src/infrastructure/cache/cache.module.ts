import { Module, Global } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager'
import { CacheService } from './cache.service';;

@Global()
@Module({
    imports: [
        CacheModule.register({
            ttl: 60 * 1000 * 30, // 30분
            // max: 10000 // 최대 캐시 아이템 수
        })
    ],
    providers: [CacheService],
    exports: [CacheService]
})
export class AppCacheModule {}