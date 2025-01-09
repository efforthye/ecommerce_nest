import { Controller, Get, Param, Query } from '@nestjs/common';
import { ProductService } from 'src/domain/product/service/product.service';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse, ApiParam } from '@nestjs/swagger';
import { ProductResponseDto, ProductDetailResponseDto } from 'src/domain/product/dto/product-response.dto';

@ApiTags('상품')
@Controller('products')
export class ProductController {
    constructor(private readonly productService: ProductService) {}

    @ApiOperation({ summary: '인기 상품 목록 조회' })
    @ApiQuery({ name: 'page', required: false, description: '페이지' })
    @ApiQuery({ name: 'limit', required: false, description: '조회할 상품 수' })
    @ApiResponse({ status: 200, description: '인기 상품 목록 조회 성공' })
    @Get('popular')
    async getPopularProducts(
        @Query('page') page: string,
        @Query('limit') limit: string
    ): Promise<ProductResponseDto[]> {
        return this.productService.getPopularProducts(Number(limit) || 10);
    }

    @ApiOperation({ summary: '상품 상세 정보 조회' })
    @ApiParam({ name: 'id', description: '상품 ID' })
    @ApiResponse({ status: 200, description: '상품 상세 정보 조회 성공' })
    @Get(':id')
    async getProductDetail(
        @Param('id') id: string
    ): Promise<ProductDetailResponseDto> {
        return this.productService.getProductById(Number(id));
    }
}