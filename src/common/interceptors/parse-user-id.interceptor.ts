import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable() // @UseInterceptors(ParseUserIdInterceptor)
export class ParseUserIdInterceptor implements NestInterceptor {
    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const request = context.switchToHttp().getRequest();
        const userId = request.params.userId;

        if (userId) {
            // userId를 10진수 정수로 변환
            request.params.userId = parseInt(userId, 10);
        }

        return next.handle();
    }
}
