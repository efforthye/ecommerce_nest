import { Controller, Get, Param, Post } from "@nestjs/common";
import { ApiOperation, ApiTags, ApiResponse } from "@nestjs/swagger";

@Controller('coupons')
@ApiTags('coupons')
export class CouponController {
   @Get(':id')
   @ApiOperation({ summary: '선착순 쿠폰 조회' })
   @ApiResponse({
       status: 200,
       description: '선착순 쿠폰 정보를 반환합니다.',
       schema: {
           example: {
               id: 'coupon-1',
               totalQuantity: 100,
               remainingQuantity: 45,
               isIssued: false
           }
       }
   })
   @ApiResponse({
       status: 404,
       description: '해당 쿠폰 ID를 찾을 수 없습니다.',
       schema: {
           example: {
               success: false,
               message: "Coupon not found"
           }
       }
   })
   findCoupon(@Param('id') id: string) {
       return {
           id,
           totalQuantity: 100,
           remainingQuantity: 45,
           isIssued: false 
       };
   }

   @Post(':id/issue')
   @ApiOperation({ summary: '선착순 쿠폰 발급' })
   @ApiResponse({
       status: 201,
       description: '선착순 쿠폰 발급 성공',
       schema: {
           example: {
               success: true,
               couponId: 'coupon-1',
               expireDate: '2024-01-03T12:00:00Z'
           }
       }
   })
   @ApiResponse({
       status: 409,
       description: '선착순 쿠폰 발급 실패 (수량 부족 등)',
       schema: {
           example: {
               success: false,
               message: "Coupon issuance failed: insufficient quantity"
           }
       }
   })
   issueCoupon(@Param('id') id: string) {
       return {
           success: true,
           couponId: id,
           expireDate: new Date()
       };
   }

   @Get('my')
   @ApiOperation({ summary: '보유 쿠폰 목록 조회' })
   @ApiResponse({
       status: 200,
       description: '사용자가 보유한 쿠폰 목록을 반환합니다.',
       schema: {
           example: [
               {
                   id: 'coupon-1',
                   name: '10% 할인 쿠폰',
                   status: 'ACTIVE',
                   expireDate: '2024-01-03T12:00:00Z'
               }
           ]
       }
   })
   getMyCoupons() {
       return [{
           id: 'coupon-1',
           name: '10% 할인 쿠폰',
           status: 'ACTIVE',
           expireDate: new Date()
       }];
   }
}
