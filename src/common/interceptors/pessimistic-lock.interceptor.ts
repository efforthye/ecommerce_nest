import { Injectable, NestInterceptor, ExecutionContext, CallHandler, BadRequestException, ConflictException } from '@nestjs/common';
import { from, lastValueFrom, Observable } from 'rxjs';
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
        // resourceId 유효성 검증
        if (!resourceId || isNaN(Number(resourceId))) throw new BadRequestException(`Invalid ${resourceType} ID`);

        // 해당 프리즈마 트랜잭션 리소스에 비관적 락 적용
        return from(
            this.prisma.$transaction(async (tx) => {
                try {
                    await this.applyLock(resourceType, resourceId, tx, noWait);
                    // 트랜잭션 객체를 request에 저장
                    request.prismaTransaction = tx;
                    const result = await lastValueFrom(next.handle());
                    return result;
                } catch (error) {
                    if (error.code === 'ER_LOCK_WAIT_TIMEOUT') {
                        throw new ConflictException('Lock acquisition timeout');
                    }
                    throw error;
                }
            }, {
                timeout // 트랜잭션 전체 타임아웃 설정
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
            case 'Payment':
                return request.params.id || request.body.orderId;
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
                    `SELECT * FROM \`Coupon\` WHERE \`id\` = ? FOR UPDATE ${nowaitClause}`,
                    resourceId
                );
                break;
            case 'FcfsCoupon':
                // 먼저 FcfsCoupon 테이블에 락 적용
                await tx.$executeRawUnsafe(
                    `SELECT * FROM \`FcfsCoupon\` 
                    WHERE id = ? 
                    AND \`stock_quantity\` > 0 
                    AND \`start_date\` <= CURRENT_TIMESTAMP 
                    AND \`end_date\` > CURRENT_TIMESTAMP 
                    FOR UPDATE ${nowaitClause}`,
                    resourceId
                );
                
                // 이후 Coupon 테이블은 락 없이 조회만 수행
                await tx.$executeRawUnsafe(
                    `SELECT c.is_fcfs FROM \`Coupon\` c 
                        WHERE c.id = (SELECT \`coupon_id\` FROM \`FcfsCoupon\` WHERE id = ?)`,
                    resourceId
                );
                break;
            case 'UserBalance':
                // 잔액 존재 여부 먼저 확인
                const balance = await tx.userBalance.findUnique({
                    where: { userId: parseInt(resourceId, 10) },
                    select: { id: true }
                });
                
                // 기존 잔액이 있는 경우 id로 UserBalance 테이블에 락 적용
                if (balance) {
                    await tx.$executeRawUnsafe(
                        `SELECT balance FROM \`UserBalance\` WHERE \`id\` = ? FOR UPDATE ${nowaitClause}`,
                        balance.id
                    );
                }
                break;
            case 'Payment':
                // Payment 조회
                const payment = await tx.payment.findUnique({
                    where: { id: parseInt(resourceId, 10) },
                    select: { orderId: true }
                });

                if (payment) {
                    // Payment와 연관된 Order에 락 적용
                    await tx.$executeRawUnsafe(
                        `SELECT * FROM \`Order\` 
                        WHERE id = ? 
                        AND status NOT IN ('PAID', 'CANCELLED')
                        FOR UPDATE ${nowaitClause}`,
                        payment.orderId
                    );
                } else {
                    // 결제 생성 시에는 Order에 직접 락 적용
                    await tx.$executeRawUnsafe(
                        `SELECT * FROM \`Order\` 
                        WHERE id = ? 
                        AND status NOT IN ('PAID', 'CANCELLED')
                        FOR UPDATE ${nowaitClause}`,
                        resourceId
                    );
                }
                break;
            default:
                throw new Error(`Unknown resource type: ${resourceType}`);
        }
    }
}