import { SetMetadata } from '@nestjs/common';
import { PESSIMISTIC_LOCK_KEY } from '../constants/app.constants';

// 락 옵션 인터페이스 정의
export interface PessimisticLockOptions {
    resourceType: string;
    timeout?: number;
    noWait?: boolean;
}

// 커스텀 락 데코레이터 정의
export const PessimisticLock = (options: PessimisticLockOptions | string) => {
    const lockOptions = typeof options === 'string' ? { resourceType: options } : options;
    return SetMetadata(PESSIMISTIC_LOCK_KEY, lockOptions);
};