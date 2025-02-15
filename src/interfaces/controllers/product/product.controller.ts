import { Controller, Get, Param, Query, BadRequestException } from '@nestjs/common';
import { ProductService } from 'src/domain/product/service/product.service';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse, ApiParam } from '@nestjs/swagger';
import { ProductResponseDto, ProductDetailResponseDto } from 'src/domain/product/dto/product-response.dto';
import { ProductEvents } from 'src/orchestration/events';
import { EventEmitter2 } from '@nestjs/event-emitter';

@ApiTags('상품') @Controller('products')
export class ProductController {
    constructor(
        private readonly productService: ProductService,
        private readonly eventEmitter: EventEmitter2
    ) {}

    @ApiOperation({ summary: '인기 상품 목록 조회' }) 
    @ApiQuery({ name: 'page', required: false, type: 'string', description: '페이지 (숫자 형태의 문자열)' }) 
    @ApiQuery({ name: 'limit', required: false, type: 'string', description: '조회할 상품 수 (숫자 형태의 문자열)' }) 
    @ApiResponse({ status: 200, description: '인기 상품 목록 조회 성공' }) 
    @Get('popular') 
    async getPopularProducts(@Query('page') page: string = '1', @Query('limit') limit: string = '10'): Promise<ProductResponseDto[]> {
        const numericPage = Number(page);
        const numericLimit = Number(limit);

        if (isNaN(numericPage) || numericPage < 1) {
            throw new BadRequestException('page는 올바른 숫자여야 합니다.');
        }

        if (isNaN(numericLimit) || numericLimit < 1) {
            throw new BadRequestException('limit는 올바른 숫자여야 합니다.');
        }

        return this.productService.getPopularProducts(numericLimit);
    }

    @ApiOperation({ summary: '상품 상세 정보 조회' }) 
    @ApiParam({ name: 'id', required: true, type: 'string', description: '상품 ID (숫자 형태의 문자열)' }) 
    @ApiResponse({ status: 200, description: '상품 상세 정보 조회 성공' }) 
    @Get(':id') 
    async getProductDetail(@Param('id') id: string): Promise<ProductDetailResponseDto> {
        // const numericId = Number(id);
        // if (isNaN(numericId) || numericId <= 0) {
        //     throw new BadRequestException('id는 올바른 숫자여야 합니다.');
        // }
        // return this.productService.getProductById(numericId);
        const numericId = Number(id);
        this.eventEmitter.emit(ProductEvents.PRODUCT_STOCK_CHECK_REQUESTED, {
            productId: numericId
        });
        return this.productService.getProductById(numericId);
    }
}
