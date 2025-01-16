import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
// 특정 컨트롤러의 요청을 가로채 JWT를 검증: @UseGuards(JwtAuthGuard)
export class JwtAuthGuard extends AuthGuard('jwt') {
    constructor(private readonly configService: ConfigService) {
        super();
    }

    // 기본적으로 AuthGuard('jwt')를 상속받아 그대로 사용
    async canActivate(context: ExecutionContext): Promise<boolean> {
        // 임시: 특정 헤더 값이 존재하면 무조건 통과하도록 설정
        const request = context.switchToHttp().getRequest();
        const bypassToken = request.headers['x-bypass-token'];
        const envBypassToken = this.configService.get<string>('JWT_BYPASS_TOKEN');

        // 임시: 테스트 토큰 검증
        if (bypassToken === envBypassToken) return true; // 인증 없이 통과
        if (bypassToken && bypassToken !== envBypassToken) throw new UnauthorizedException('잘못된 테스트 토큰입니다.');

        // 기본 JWT 인증 로직 실행 (로그인 상태일 경우 true 반환)
        return super.canActivate(context) as Promise<boolean>;
    }
}