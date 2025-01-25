import { RedisRedlock } from "./redis.redlock";
import { RedisService } from "./redis.service";

async function testRedlock() {
    const redisService = new RedisService();
    await redisService.onModuleInit(); // Redis 연결 확인

    const redisRedlock = new RedisRedlock(redisService);
    
    try {
        const lock = await redisRedlock.acquireLock('test-lock', 5000);
        console.log('Lock acquired successfully');
        await redisRedlock.releaseLock(lock);
        console.log('Lock released successfully');
    } catch (error) {
        console.error('Redlock test failed:', error);
    } finally {
        await redisService.onModuleDestroy();
    }
}

testRedlock();
