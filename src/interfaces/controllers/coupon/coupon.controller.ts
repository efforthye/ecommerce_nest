import { PaginationDto } from "src/domain/coupon/dto/pagination.dto";
import { CouponService } from "src/domain/coupon/service/coupon.service";
import { IssueCouponResponse } from "src/domain/coupon/dto/issue_coupon_response.dto";
import { FcfsCouponDetailResponse } from "src/domain/coupon/dto/fcfs-coupon-detail.dto";
import { CouponPageResponse } from "src/domain/coupon/dto/coupon_page_response.dto";
import { ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from "@nestjs/swagger";
import { Controller, Get, Param, Post, Query } from "@nestjs/common";

@ApiTags('쿠폰')
@Controller("coupons")
export class CouponController {
    constructor(private readonly couponService: CouponService) {}

    /**
     * 선착순 쿠폰 목록 조회
     */
    @ApiOperation({ summary: '선착순 쿠폰 목록 조회' })
    @ApiQuery({ 
      name: 'page', 
      required: false, 
      description: '페이지 번호' 
    })
    @ApiQuery({ 
      name: 'pageSize', 
      required: false, 
      description: '페이지당 항목 수' 
    })
    @ApiResponse({ 
      status: 200, 
      description: '쿠폰 목록 조회 성공' 
    })
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
    @ApiParam({ 
      name: 'id', 
      description: '쿠폰 ID' 
    })
    @ApiResponse({ 
      status: 200, 
      description: '쿠폰 상세 정보 조회 성공' 
    })
    @Get("fcfs/:id")
    async getFcfsCouponDetail(
        @Param("id") id: number
    ): Promise<FcfsCouponDetailResponse> {
        return this.couponService.getFcfsCouponById(id);
    }

    /**
     * 선착순 쿠폰 발급 (Mock 데이터)
     */
    @ApiOperation({ summary: '선착순 쿠폰 발급' })
    @ApiParam({ 
      name: 'id', 
      description: '쿠폰 ID' 
    })
    @ApiResponse({ 
      status: 200, 
      description: '쿠폰 발급 성공' 
    })
    @Post("fcfs/:id/issue")
    async issueCoupon(
      @Param("id") id: number
    ): Promise<IssueCouponResponse> {
        // Mock 데이터 반환
        return {
            id: 1,
            userId: 1,
            couponId: id,
            status: "AVAILABLE",
            expiryDate: new Date("2024-02-01T23:59:59Z"),
            createdAt: new Date("2024-01-01T00:00:00Z"),
            usedAt: null,
        };
    }

    /**
     * 사용자가 보유한 쿠폰 목록 조회 (Mock 데이터)
     */
    @ApiOperation({ summary: '사용자 보유 쿠폰 목록 조회' })
    @ApiQuery({ 
      name: 'page', 
      required: false, 
      description: '페이지 번호' 
    })
    @ApiQuery({ 
      name: 'pageSize', 
      required: false, 
      description: '페이지당 항목 수' 
    })
    @ApiResponse({ 
      status: 200, 
      description: '사용자 쿠폰 목록 조회 성공' 
    })
    @Get("my")
    async getMyCoupons(
      @Query() pagination: PaginationDto
    ) {
        // Mock 데이터 반환
        return {
            data: [
                {
                    id: 1,
                    userId: 1,
                    couponId: 101,
                    coupon: {
                        id: 101,
                        name: "신규가입 할인 쿠폰",
                        type: "PERCENTAGE",
                        amount: 10.0,
                        minOrderAmount: 10000,
                        validDays: 30,
                        isFcfs: true,
                        createdAt: new Date("2024-01-01T00:00:00Z"),
                    },
                    status: "AVAILABLE",
                    expiryDate: new Date("2024-02-01T23:59:59Z"),
                    createdAt: new Date("2024-01-01T00:00:00Z"),
                    usedAt: null,
                },
            ],
            total: 1,
        };
    }
}