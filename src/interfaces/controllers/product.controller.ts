import { Controller, Get, Param } from "@nestjs/common";
import { ApiOperation, ApiTags, ApiResponse } from "@nestjs/swagger";

@Controller('products')
@ApiTags('products')
export class ProductController {
    @Get('popular')
    @ApiOperation({ summary: '인기 상품 조회' })
    @ApiResponse({
        status: 200,
        description: '인기 상품 목록을 반환합니다.',
        schema: {
            example: [
                {
                    id: 'product-1',
                    name: '인기상품1',
                    salesCount: 150
                },
                {
                    id: 'product-2',
                    name: '인기상품2',
                    salesCount: 120
                }
            ]
        }
    })
    getPopularProducts() {
        return [{
            id: 'product-1',
            name: '인기상품1',
            salesCount: 150
        }];
    }

    @Get(':id')
    @ApiOperation({ summary: '상품 상세 정보' })
    @ApiResponse({
        status: 200,
        description: '특정 상품의 상세 정보를 반환합니다.',
        schema: {
            example: {
                id: 'product-1',
                name: '상품명',
                price: 10000,
                description: '상품설명'
            }
        }
    })
    @ApiResponse({
        status: 404,
        description: '해당 상품 ID를 찾을 수 없습니다.',
        schema: {
            example: {
                success: false,
                message: "Product not found"
            }
        }
    })
    getProduct(@Param('id') id: string) {
        return {
            id,
            name: '상품명',
            price: 10000,
            description: '상품설명'
        };
    }
}
