import { PaginationDto } from "src/domain/coupon/dto/pagination.dto";
import { CouponService } from "src/domain/coupon/service/coupon.service";
import { FcfsCouponDetailResponse } from "src/domain/coupon/dto/fcfs-coupon-detail.dto";
import { CouponPageResponse } from "src/domain/coupon/dto/coupon_page_response.dto";
import { ApiBody, ApiHeader, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from "@nestjs/swagger";
import { BadRequestException, Body, Controller, Get, Headers, Param, Post, Query, UseGuards, UseInterceptors } from "@nestjs/common";
import { UserCoupon } from "@prisma/client";
import { JwtAuthGuard } from "src/common/guards/jwt-auth.guard";
import { PessimisticLock } from "src/common/decorators/pessimistic-lock.decorator";
import { ParseUserIdInterceptor } from "src/common/interceptors/parse-user-id.interceptor";

@ApiTags('쿠폰')
@Controller("coupons")
export class CouponController {
    constructor(private readonly couponService: CouponService) {}

    /**
     * 선착순 쿠폰 목록 조회
     */
    @ApiOperation({ summary: '선착순 쿠폰 목록 조회' })
    @ApiQuery({name: 'page', required: false, description: '페이지 번호'})
    @ApiQuery({name: 'limit', required: false, description: '페이지당 항목 수' })
    @ApiResponse({status: 200, description: '쿠폰 목록 조회 성공'})
    @Get("fcfs")
    async getAvailableFcfsCoupons(
        @Query() pagination: PaginationDto
    ): Promise<CouponPageResponse> {
        return this.couponService.getAvailableFcfsCoupons(pagination);
    }

    /**
     * 특정 선착순 쿠폰 정보 조회
     */
    @ApiOperation({ summary: '특정 선착순 쿠폰 정보 조회' })
    @ApiParam({name: 'id', description: '쿠폰 ID'})
    @ApiResponse({status: 200, description: '쿠폰 상세 정보 조회 성공'})
    @Get("fcfs/:id")
    async getFcfsCouponDetail(
        @Param("id") id: number
    ): Promise<FcfsCouponDetailResponse> {
        return this.couponService.getFcfsCouponById(id);
    }

    /**
     * 선착순 쿠폰 발급
     */
    @ApiOperation({ summary: '선착순 쿠폰 발급' })
    @ApiHeader({ name: 'x-bypass-token', required: true, description: '인증 토큰 (temp bypass key: happy-world-token)', schema: { type: 'string' } })
    @ApiParam({ name: 'id', description: '쿠폰 아이디' })
    @ApiBody({ description: "유저 아이디", schema: { type: "object", properties: { userId: { type: "number" } }, required: ["userId"] } })
    @ApiResponse({ status: 201, description: '쿠폰 발급 성공', schema: { example: { id: 3, userId: 1, couponId: 1, status: "AVAILABLE", expiryDate: "2025-02-14T14:05:43.654Z", createdAt: "2025-01-15T14:05:43.656Z", usedAt: null } } })
    @ApiResponse({ status: 400, description: '이미 발급된 쿠폰', schema: { example: { message: "이미 발급된 쿠폰입니다.", error: "Bad Request", statusCode: 400 } } })
    @ApiResponse({ status: 401, description: '인증 실패', schema: { example: { message: "잘못된 테스트 토큰입니다.", error: "Unauthorized", statusCode: 401 } } })
    @UseGuards(JwtAuthGuard)
    @UseInterceptors(ParseUserIdInterceptor)
    @PessimisticLock({resourceType: 'FcfsCoupon', noWait: false})
    @Post("fcfs/:id/issue")
    async issueCoupon(
        @Headers("x-bypass-token") bypassToken: string,
        @Param("id") id: number,
        @Body("userId") userId: number,
    ): Promise<UserCoupon> {
        return this.couponService.issueFcfsCoupon(userId, id);
    }

    /**
     * 사용자가 보유한 쿠폰 목록 조회
     */
    @ApiOperation({ summary: '사용자가 보유한 쿠폰 목록 조회' })
    @ApiQuery({ name: 'userId', required: true, description: '유저 아이디' })
    @ApiQuery({ name: 'page', required: false, description: '페이지 번호' })
    @ApiQuery({ name: 'limit', required: false, description: '페이지당 항목 수' })
    @ApiResponse({ status: 200, description: '사용자 쿠폰 목록 조회 성공' })
    @UseInterceptors(ParseUserIdInterceptor)
    @Get('my')
    async getMyCoupons(
        @Query('userId') userId: number,
        @Query('page') page?: number,
        @Query('limit') limit?: number,
    ): Promise<any> {
        if (!userId) throw new BadRequestException('userId는 필수값 입니다.');

        const pagination = new PaginationDto();
        pagination.page = page || 1;
        pagination.limit = limit || 10;
        
        return this.couponService.getMyCoupons(userId, pagination);
    }

}