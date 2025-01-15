import { Injectable, NestInterceptor, ExecutionContext, CallHandler, BadRequestException } from '@nestjs/common';
import { from, lastValueFrom, Observable, switchMap } from 'rxjs';
import { Reflector } from '@nestjs/core';
import { PESSIMISTIC_LOCK_KEY } from '../constants/app.constants';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { Prisma } from '@prisma/client';
import { PessimisticLockOptions } from '../decorators/pessimistic-lock.decorator';

@Injectable()
// 비관적 락 적용 커스텀 인터셉터
export class PessimisticLockInterceptor implements NestInterceptor {
    constructor(
        private reflector: Reflector,
        private prisma: PrismaService // PrismaService 주입
    ) {}

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        // 메타데이터에서 리소스 정보 가져오기
        const lockOptions = this.reflector.get<PessimisticLockOptions>(
            PESSIMISTIC_LOCK_KEY,
            context.getHandler()
        );
        // 비관적 락이 필요하지 않은 경우 바로 처리
        if (!lockOptions) return next.handle(); 
        // 리소스 정보 추출
        const {resourceType, timeout=3000, noWait=true} = lockOptions;

        // 요청 파라미터에서 resourceType에 맞는 resourceId 추출
        const request = context.switchToHttp().getRequest();
        const resourceId = this.getResourceId(resourceType, request);
        // resourceId 유효셩 검증
        if (!resourceId || isNaN(Number(resourceId))) throw new BadRequestException(`Invalid ${resourceType} ID`);

        // 해당 프리즈마 트랜잭션 리소스에 비관적 락 적용
        return from(
            this.prisma.$transaction(async (tx) => {
                // 락 타임아웃 설정
                await tx.$executeRawUnsafe(`SET LOCAL lock_timeout = '${timeout}ms'`);
                // 리소스 타입에 맞는 락 획득 SQL 쿼리 실행
                await this.applyLock(resourceType, resourceId, tx, noWait);
                // 다음 핸들러를 트랜잭션 내에서 실행
                return await lastValueFrom(next.handle());
            })
        );
    }

    // 리소스 타입에 따른 리소스 아이디 응답
    getResourceId(resourceType: string, request: any): string {
        switch (resourceType) {
            case 'Coupon':
            case 'FcfsCoupon':
                return request.params.id;
            case 'UserBalance':
                return request.params.userId;
            default:
                throw new Error(`Unknown resource type: ${resourceType}`);
        }
    }

    // 리소스 타입에 따른 비관적 락 적용
    private async applyLock(
        resourceType: string, 
        resourceId: string, 
        tx: Prisma.TransactionClient,
        noWait: boolean
    ) {
        const nowaitClause = noWait ? 'NOWAIT' : '';
        
        switch (resourceType) {
            case 'Coupon':
                await tx.$executeRawUnsafe(
                    `SELECT * FROM "Coupon" WHERE "id" = $1 AND "is_fcfs" = TRUE FOR UPDATE ${nowaitClause}`,
                    resourceId
                );
                break;
            case 'FcfsCoupon':
                // 락 없이 Coupon 테이블 쿠폰 유효성 체크
                await tx.$executeRawUnsafe(
                    `SELECT c.is_fcfs FROM \`coupon\` c 
                     WHERE c.id = (SELECT \`coupon_id\` FROM \`FcfsCoupon\` WHERE id = $1)`,
                    resourceId
                );

                // 재고 수량 체크 (stock_quantity > 0)
                // 발급 기간 체크 (start_date <= 현재 <= end_date)
                // 조건을 만족하는 FcfsCoupon row에 대해 베타 락 적용
                await tx.$executeRawUnsafe(
                    `SELECT * FROM \`FcfsCoupon\` 
                    WHERE id = $1 
                    AND \`stock_quantity\` > 0 
                    AND \`start_date\` <= CURRENT_TIMESTAMP 
                    AND \`end_date\` > CURRENT_TIMESTAMP 
                    FOR UPDATE ${nowaitClause}`,
                    resourceId
                );
                break;
            case 'UserBalance':
                await tx.$executeRawUnsafe(
                    `SELECT * FROM "UserBalance" WHERE "userId" = $1 FOR UPDATE ${nowaitClause}`,
                    resourceId
                );
                break;
            default:
                throw new Error(`Unknown resource type: ${resourceType}`);
        }
    }
}
