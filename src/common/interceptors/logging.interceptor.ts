import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { CustomLoggerService } from 'src/infrastructure/logging/logger.service';

/**
 * 전역 HTTP 인터셉터
 * 모든 요청과 응답을 로깅합니다.
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
    constructor(private readonly logger: CustomLoggerService) {
        this.logger.setTarget('HTTP');
    }

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const now = Date.now();
        const request = context.switchToHttp().getRequest();
        const { method, originalUrl, body, params } = request;

        // Request 로그 - 간단한 형태로
        this.logger.log(`[REQUEST] ${method} ${originalUrl} ${
            Object.keys(params).length ? `params=${JSON.stringify(params)}` : ''
        }${body && Object.keys(body).length ? ` body=${JSON.stringify(body)}` : ''}`);

        return next.handle().pipe(
            tap({
                next: () => {
                    const response = context.switchToHttp().getResponse();
                    const delay = Date.now() - now;
                    
                    // Response 로그 - 상태 코드와 응답 시간만
                    this.logger.log(
                        `[SUCCESS] ${method} ${originalUrl} ${response.statusCode} ${delay}ms`
                    );
                },
                error: (error: Error) => {
                    const delay = Date.now() - now;
                    
                    // Error 로그 - 에러 메시지와 응답 시간
                    this.logger.error(
                        `[ERROR] ${method} ${originalUrl} ${error.message} ${delay}ms`
                    );
                },
            }),
        );
    }
}