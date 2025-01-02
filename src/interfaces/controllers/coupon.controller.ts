import { Controller, Get, Param, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";

@Controller('coupons')
@ApiTags('coupons')
export class CouponController {
   @Get(':id')
   @ApiOperation({ summary: '선착순 쿠폰 조회' })
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
   issueCoupon(@Param('id') id: string) {
       return {
           success: true,
           couponId: id,
           expireDate: new Date()
       };
   }

   @Get('my')
   @ApiOperation({ summary: '보유 쿠폰 목록 조회' })
   getMyCoupons() {
       return [{
           id: 'coupon-1',
           name: '10% 할인 쿠폰',
           status: 'ACTIVE',
           expireDate: new Date()
       }];
   }
}