import { Injectable, Logger, LoggerService, Scope } from '@nestjs/common';

// 로깅 컨텍스트 분리를 위한 Transient 스코프 사용
@Injectable({ scope: Scope.TRANSIENT })
export class CustomLoggerService implements LoggerService {
    private target: string;
    private readonly logger: Logger;

    constructor() {
        this.logger = new Logger();
        this.setTarget(this.constructor.name);
    }

    // 로그 메시지의 타겟(출처) 설정
    setTarget(target: string): void {
        this.target = target;
    }

    // 다양한 타입의 메시지를 문자열로 변환
    private formatMessage(message: unknown): string {
        return typeof message === 'string' || typeof message === 'number'
            ? String(message)
            : JSON.stringify(message);
    }

    // 일반 로그 메시지
    log(message: unknown): void {
        this.logger.log(this.formatMessage(message), this.target);
    }

    // 디버그 레벨 로그 메시지
    debug(message: unknown): void {
        if (this.logger.debug) {
            this.logger.debug(this.formatMessage(message), this.target);
        }
    }

    // 경고 레벨 로그 메시지
    warn(message: unknown): void {
        this.logger.warn(this.formatMessage(message), this.target);
    }

    // 상세 정보 레벨 로그 메시지
    verbose(message: unknown): void {
        if (this.logger.verbose) {
            this.logger.verbose(this.formatMessage(message), this.target);
        }
    }

    // 에러 로그 메시지
    error(error: Error | string): void {
        this.logger.error(
            error,
            error instanceof Error ? error.stack : undefined,
            this.target,
        );
    }
}