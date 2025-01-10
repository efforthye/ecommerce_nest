import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { Reflector } from '@nestjs/core';
import { PESSIMISTIC_LOCK_KEY } from '../decorators/pessimistic-lock.decorator';

@Injectable()
export class PessimisticLockInterceptor implements NestInterceptor {
    constructor(private reflector: Reflector) {}

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const isPessimisticLock = this.reflector.get<boolean>(
            PESSIMISTIC_LOCK_KEY,
            context.getHandler()
        );

        if (!isPessimisticLock) {
            return next.handle();
        }

        return next.handle();
    }
}
