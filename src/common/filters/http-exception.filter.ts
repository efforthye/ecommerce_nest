import { 
    ExceptionFilter, 
    Catch, 
    ArgumentsHost, 
    HttpException, 
    HttpStatus,
    Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { CustomLoggerService } from 'src/infrastructure/logging/logger.service';

/**
 * 에러 응답의 표준 형식을 정의하는 인터페이스
 */
interface ErrorResponse {
    success: false;
    statusCode: number;
    message: string | string[];
    error?: string;
    timestamp: string;
    path: string;
    requestId?: string;
    details?: unknown;
}

/**
 * HTTP 요청 관련 정보를 표준화하는 인터페이스
 */
interface RequestInfo {
    method: string;
    originalUrl: string;
    params: unknown;
    query: unknown;
    headers: Record<string, unknown>;
    body: unknown;
    requestId?: string;
    ip?: string;
    userAgent?: string;
}

/**
 * 전역 HTTP 예외 필터
 * 모든 예외를 일관된 형식으로 변환하여 응답합니다.
 */
@Injectable()
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
    constructor(
        private readonly logger: CustomLoggerService,
        private readonly configService: ConfigService,
    ) {
        this.logger.setTarget(HttpExceptionFilter.name);
    }

    catch(exception: HttpException, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();
        const status = exception.getStatus() || HttpStatus.INTERNAL_SERVER_ERROR;
        
        const exceptionResponse = exception.getResponse();
        const isProduction = this.configService.get('NODE_ENV') === 'production';
        
        // 요청 정보 수집 및 민감 정보 제거
        const requestInfo = this.buildRequestInfo(request);

        // 에러 응답 생성
        const errorResponse = this.buildErrorResponse({
            status,
            exceptionResponse,
            request,
            requestInfo,
            exception,
            isProduction,
        });

        // 에러 로깅
        this.logException({
            status,
            errorResponse,
            exception,
            requestInfo,
        });

        // 클라이언트에 응답 반환
        response.status(status).json(errorResponse);
    }

    /**
     * 요청 정보를 수집하고 민감 정보를 제거하여 반환
     */
    private buildRequestInfo(request: Request): RequestInfo {
        return {
            method: request.method,
            originalUrl: request.originalUrl,
            params: request.params,
            query: request.query,
            headers: this.sanitizeHeaders(request.headers),
            body: this.sanitizeBody(request.body),
            requestId: this.getHeaderValue(request.headers, 'x-request-id'),
            ip: request.ip || undefined,
            userAgent: this.getHeaderValue(request.headers, 'user-agent'),
        };
    }

    /**
     * 표준화된 에러 응답을 생성
     */
    private buildErrorResponse({
        status,
        exceptionResponse,
        request,
        requestInfo,
        exception,
        isProduction,
    }: {
        status: number;
        exceptionResponse: unknown;
        request: Request;
        requestInfo: RequestInfo;
        exception: HttpException;
        isProduction: boolean;
    }): ErrorResponse {
        const errorResponse: ErrorResponse = {
            success: false,
            statusCode: status,
            message: this.extractMessage(exceptionResponse),
            timestamp: new Date().toISOString(),
            path: request.originalUrl,
            requestId: requestInfo.requestId,
        };

        if (!isProduction) {
            errorResponse.details = {
                stack: exception.stack,
                request: requestInfo,
            };
        }

        return errorResponse;
    }

    /**
     * 예외 상황을 로깅
     */
    private logException({
        status,
        errorResponse,
        exception,
        requestInfo,
    }: {
        status: number;
        errorResponse: ErrorResponse;
        exception: HttpException;
        requestInfo: RequestInfo;
    }): void {
        const logMessage = `${requestInfo.method} ${requestInfo.originalUrl} - ${status} - ${errorResponse.message}`;

        if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
            this.logger.error(`Server Error: ${logMessage}\n${exception.stack}`);
        } else {
            this.logger.warn(`Client Error: ${logMessage}`);
        }
    }

    /**
     * 예외 응답에서 메시지를 추출
     */
    private extractMessage(exceptionResponse: unknown): string | string[] {
        if (typeof exceptionResponse === 'string') {
            return exceptionResponse;
        }
        
        if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
            const response = exceptionResponse as Record<string, unknown>;
            return response.message as string | string[] || 'Unknown error';
        }

        return 'Unknown error';
    }

    /**
     * HTTP 헤더 값을 안전하게 추출
     */
    private getHeaderValue(headers: Record<string, string | string[] | undefined>, key: string): string | undefined {
        const value = headers[key];
        if (Array.isArray(value)) return value[0];
        return value;
    }

    /**
     * 민감한 헤더 정보를 필터링
     */
    private sanitizeHeaders(headers: Record<string, string | string[] | undefined>): Record<string, unknown> {
        const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key'];
        return Object.entries(headers).reduce((acc, [key, value]) => {
            if (sensitiveHeaders.includes(key.toLowerCase())) {
                acc[key] = '[REDACTED]';
            } else if (Array.isArray(value)) {
                acc[key] = value[0];
            } else {
                acc[key] = value;
            }
            return acc;
        }, {} as Record<string, unknown>);
    }

    /**
     * 요청 바디에서 민감한 정보를 필터링
     */
    private sanitizeBody(body: unknown): unknown {
        if (typeof body !== 'object' || body === null) return body;

        const sensitiveFields = ['password', 'token', 'secret', 'credentials'];
        return Object.entries(body as Record<string, unknown>).reduce((acc, [key, value]) => {
            if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
                acc[key] = '[REDACTED]';
            } else {
                acc[key] = value;
            }
            return acc;
        }, {} as Record<string, unknown>);
    }
}