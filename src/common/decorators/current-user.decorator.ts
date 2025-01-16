import { createParamDecorator, ExecutionContext } from "@nestjs/common";

// 유저의 Passport.js 인증 데이터를 가져오는 데코레이터
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    // 요청 컨텍스트의 객체를 가져오기 위해 HTTP로 변경
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);