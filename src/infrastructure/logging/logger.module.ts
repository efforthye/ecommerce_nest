import { Global, Module } from '@nestjs/common';
import { CustomLoggerService } from './logger.service';

// 전역으로 사용할 수 있도록 Global 데코레이터 사용
@Global()
@Module({
    providers: [CustomLoggerService],
    exports: [CustomLoggerService]
})
export class LoggerModule {}