import { SetMetadata } from '@nestjs/common';

export const PESSIMISTIC_LOCK_KEY = 'pessimistic_lock';
export const PessimisticLock = () => SetMetadata(PESSIMISTIC_LOCK_KEY, true);