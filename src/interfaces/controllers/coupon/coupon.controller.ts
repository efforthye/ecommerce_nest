import { PaginationDto } from "src/domain/coupon/dto/pagination.dto";
import { CouponService } from "src/domain/coupon/service/coupon.service";
import { IssueCouponResponse } from "src/domain/coupon/dto/issue_coupon_response.dto";
import { FcfsCouponDetailResponse } from "src/domain/coupon/dto/fcfs-coupon-detail.dto";
import { CouponPageResponse } from "src/domain/coupon/dto/coupon_page_response.dto";
import { ApiHeader, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from "@nestjs/swagger";
import { BadRequestException, Body, Controller, Get, Headers, Param, Post, Query, UseGuards } from "@nestjs/common";
import { UserAccount, UserCoupon } from "@prisma/client";
import { CurrentUser } from "src/common/decorators/current-user.decorator";
import { JwtAuthGuard } from "src/common/guards/jwt-auth.guard";

@ApiTags('쿠폰')
@Controller("coupons")
export class CouponController {
    constructor(private readonly couponService: CouponService) {}

    /**
     * 선착순 쿠폰 목록 조회
     */
    @ApiOperation({ summary: '선착순 쿠폰 목록 조회' })
    @ApiQuery({name: 'page', required: false, description: '페이지 번호'})
    @ApiQuery({name: 'pageSize', required: false, description: '페이지당 항목 수' })
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
    @ApiParam({ name: 'id', description: '쿠폰 ID' })
    @ApiResponse({ status: 200, description: '쿠폰 발급 성공' })
    // @UseGuards(JwtAuthGuard)
    @Post("fcfs/:id/issue")
    async issueCoupon(
        @Headers("authorization") authHeader: string,
        @Param("id") id: number,
        @Body("userId") userId: number,
    ): Promise<UserCoupon> {
        if (!authHeader) { // 임시로 헤더로 처리함
            throw new BadRequestException("Invalid or missing authorization token");
        }

        // 실제 발급 로직 호출
        return this.couponService.issueFcfsCoupon(userId, id);
    }

    /**
     * 사용자가 보유한 쿠폰 목록 조회
     */
    @ApiOperation({ summary: '사용자가 보유한 쿠폰 목록 조회' })
    @ApiQuery({ name: 'userId', required: true, description: '사용자 ID' })
    @ApiQuery({ name: 'page', required: false, description: '페이지 번호' })
    @ApiQuery({ name: 'pageSize', required: false, description: '페이지당 항목 수' })
    @ApiResponse({ status: 200, description: '사용자 쿠폰 목록 조회 성공' })
    @Get('my')
    async getMyCoupons(
        @Query('userId') userId: number,
        @Query('page') page?: number,
        @Query('limit') limit?: number,
    ): Promise<any> {
        if (!userId) {
            throw new BadRequestException('User ID is required');
        }

        // PaginationDto 객체 생성
        const pagination = new PaginationDto();
        pagination.page = page || 1;
        pagination.limit = limit || 10;

        return this.couponService.getMyCoupons(userId, pagination);
    }

}