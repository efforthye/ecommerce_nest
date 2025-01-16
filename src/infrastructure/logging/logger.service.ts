import {
    Inject,
    Injectable,
    LoggerService,
    Scope,
} from '@nestjs/common';
import * as winston from 'winston';
import { join } from 'path';

// 로그 메시지의 가능한 타입을 정의
type LogPayload = string | Error | Record<string, any>;

// 로깅 컨텍스트 분리를 위한 Transient 스코프 사용
@Injectable({ scope: Scope.TRANSIENT })
export class CustomLoggerService implements LoggerService {
    private target: string;
    private readonly logger: winston.Logger;

    constructor() {
        const logFormat = winston.format.combine(
            winston.format.timestamp({ format: 'MM/DD/YYYY, h:mm:ss A' }),
            winston.format.printf(({ timestamp, level, message, target }: winston.Logform.TransformableInfo) => {
                const pid = process.pid;
                
                // NestJS 스타일의 색상 및 심볼릭 텍스트 매핑
                let prefix, messageColor;
                if (typeof message === 'string' && message.includes('[HTTP]')) {
                    prefix = '\x1B[32m[Winston]\x1B[39m';
                    messageColor = '\x1B[36mINFO\x1B[39m'; // HTTP 요청은 INFO cyan 색상
                } else {
                    prefix = '\x1B[33m[Winston]\x1B[39m';
                    messageColor = '\x1B[32mLOG\x1B[39m';  // 일반 로그는 LOG green 색상
                }
    
                const messageStr = typeof message === 'string' ? message : JSON.stringify(message);
    
                // RouterExplorer, NestApplication 등의 컴포넌트 이름에 색상 적용
                let coloredMessage = messageStr;
                if (messageStr.includes('[RouterExplorer]')) {
                    coloredMessage = messageStr.replace('[RouterExplorer]', '\x1B[33m[RouterExplorer]\x1B[39m');
                } else if (messageStr.includes('[NestApplication]')) {
                    coloredMessage = messageStr.replace('[NestApplication]', '\x1B[33m[NestApplication]\x1B[39m');
                }
    
                // HTTP 메소드(GET, POST 등)와 path에 색상 적용
                ['GET', 'POST', 'PATCH', 'DELETE'].forEach(method => {
                    coloredMessage = coloredMessage.replace(method, `\x1B[32m${method}\x1B[39m`);
                });
    
                return `${prefix} ${pid}\x1B[32m  - ${timestamp}  ${messageColor} ${coloredMessage}\x1B[39m`;
            })
        );
    
        this.logger = winston.createLogger({
            format: logFormat,
            transports: [
                new winston.transports.Console(),
                new winston.transports.File({
                    filename: join(process.cwd(), 'logs', 'application.log'),
                    format: winston.format.uncolorize()  // 파일에는 색상 코드 제거
                })
            ]
        });
    
        this.setTarget(this.constructor.name);
    }

    // 로그 메시지의 타겟(출처) 설정
    setTarget(target: string): void {
        this.target = target;
    }

    // 다양한 타입의 메시지를 문자열로 변환
    private formatMessage(message: LogPayload): string {
        if (typeof message === 'string' || typeof message === 'number') {
            return String(message);
        }
        
        // BatchPayload 타입 처리
        if (this.isPrismaBatchPayload(message)) {
            return `{count: ${message.count}}`;
        }
        
        return JSON.stringify(message, null, 2);
    }
    private isPrismaBatchPayload(message: any): message is { count: number } {
        return message && typeof message === 'object' && 'count' in message;
    }

    // 일반 로그 메시지
    log(message: LogPayload): void {
        this.logger.info(this.formatMessage(message), { target: this.target });
    }

    // 디버그 레벨 로그 메시지
    debug(message: LogPayload): void {
        this.logger.debug(this.formatMessage(message), { target: this.target });
    }

    // 경고 레벨 로그 메시지
    warn(message: LogPayload): void {
        this.logger.warn(this.formatMessage(message), { target: this.target });
    }

    // 상세 정보 레벨 로그 메시지
    verbose(message: LogPayload): void {
        this.logger.verbose(this.formatMessage(message), { target: this.target });
    }

    // 에러 로그 메시지
    error(message: LogPayload, stack?: string): void {
        this.logger.error(this.formatMessage(message), { 
            target: this.target,
            stack
        });
    }
}