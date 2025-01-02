import { Controller, Get, Param } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";

@Controller('products')
@ApiTags('products')
export class ProductController {
    @Get('popular')
    @ApiOperation({ summary: '인기 상품 조회' })
    getPopularProducts() {
        return [{
            id: 'product-1',
            name: '인기상품1',
            salesCount: 150
        }];
    }

    @Get(':id')
    @ApiOperation({ summary: '상품 상세 정보' })
    getProduct(@Param('id') id: string) {
        return {
            id,
            name: '상품명',
            price: 10000,
            description: '상품설명'
        };
    }
}