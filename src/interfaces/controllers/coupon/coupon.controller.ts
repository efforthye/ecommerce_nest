import { Controller, Get, Param, Post, ParseIntPipe, Query } from "@nestjs/common";
import { ApiOperation, ApiTags, ApiResponse, ApiParam, ApiQuery } from "@nestjs/swagger";
import { PaginationDto } from "src/domain/coupon/dto/pagination.dto";
import { CouponService } from "src/domain/coupon/service/coupon.service";

@Controller('coupons')
@ApiTags('쿠폰 API')
export class CouponController {
    constructor(
        private readonly couponService: CouponService
    ) {}

    @Get('fcfs/:id')
    @ApiOperation({
        summary: '선착순 쿠폰 조회',
        description: '특정 선착순 쿠폰의 상세 정보를 조회합니다.'
    })
    @ApiParam({
        name: 'id',
        type: 'number',
        description: '선착순 쿠폰 ID'
    })
    @ApiResponse({
        status: 200,
        description: '선착순 쿠폰 정보를 반환합니다.',
        schema: {
            example: {
                id: 1,
                couponId: 1,
                coupon: {
                    id: 1,
                    name: '신규가입 할인 쿠폰',
                    type: 'PERCENTAGE',
                    amount: 10.00,
                    minOrderAmount: 10000,
                    validDays: 30,
                    isFcfs: true,
                    createdAt: '2024-01-01T00:00:00Z'
                },
                totalQuantity: 100,
                stockQuantity: 45,
                startDate: '2024-01-01T00:00:00Z',
                endDate: '2024-01-31T23:59:59Z',
                createdAt: '2024-01-01T00:00:00Z'
            }
        }
    })
    @ApiResponse({
        status: 404,
        description: '해당 쿠폰을 찾을 수 없습니다.',
        schema: {
            example: {
                statusCode: 404,
                message: "Coupon not found",
                error: "Not Found"
            }
        }
    })
    async findFcfsCoupon(@Param('id', ParseIntPipe) id: number) {
        return this.couponService.getFcfsCouponById(id);
    }

    @Post('fcfs/:id/issue')
    @ApiOperation({
        summary: '선착순 쿠폰 발급',
        description: '사용자에게 선착순 쿠폰을 발급합니다.'
    })
    @ApiParam({
        name: 'id',
        type: 'number',
        description: '선착순 쿠폰 ID'
    })
    @ApiResponse({
        status: 201,
        description: '선착순 쿠폰 발급 성공',
        schema: {
            example: {
                id: 1,
                userId: 1,
                couponId: 1,
                status: 'AVAILABLE',
                expiryDate: '2024-02-01T23:59:59Z',
                createdAt: '2024-01-01T00:00:00Z',
                usedAt: null
            }
        }
    })
    @ApiResponse({
        status: 409,
        description: '선착순 쿠폰 발급 실패',
        schema: {
            example: {
                statusCode: 409,
                message: "Coupon issuance failed: insufficient stock quantity",
                error: "Conflict"
            }
        }
    })
    // async issueCoupon(@Param('id', ParseIntPipe) id: number) {
    //     return this.couponService.issueCoupon(id);
    // }

    @Get('my')
    @ApiOperation({
        summary: '보유 쿠폰 목록 조회',
        description: '사용자가 보유한 쿠폰 목록을 조회합니다.'
    })
    @ApiQuery({
        name: 'page',
        type: 'number',
        required: false,
        description: '페이지 번호 (기본값: 1)'
    })
    @ApiQuery({
        name: 'limit',
        type: 'number',
        required: false,
        description: '페이지당 항목 수 (기본값: 10, 최대: 100)'
    })
    @ApiResponse({
        status: 200,
        description: '사용자가 보유한 쿠폰 목록을 반환합니다.',
        schema: {
            example: [
                {
                    id: 1,
                    userId: 1,
                    couponId: 1,
                    coupon: {
                        id: 1,
                        name: '신규가입 할인 쿠폰',
                        type: 'PERCENTAGE',
                        amount: 10.00,
                        minOrderAmount: 10000,
                        validDays: 30,
                        isFcfs: true,
                        createdAt: '2024-01-01T00:00:00Z'
                    },
                    status: 'AVAILABLE',
                    expiryDate: '2024-02-01T23:59:59Z',
                    createdAt: '2024-01-01T00:00:00Z',
                    usedAt: null
                }
            ]
        }
    })
    async getMyCoupons(@Query() pagination: PaginationDto) {
        return this.couponService.getMyCoupons(pagination);
    }
}