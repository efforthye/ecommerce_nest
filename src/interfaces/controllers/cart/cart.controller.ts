
import { Body, Controller, Delete, Get, Param, Patch, Post } from "@nestjs/common";
import { ApiOperation, ApiTags, ApiResponse, ApiBody } from "@nestjs/swagger";
import { AddToCartDto, UpdateCartDto } from "../../dto/cart.dto";

@Controller('cart')
@ApiTags('cart')
export class CartController {
    @Get()
    @ApiOperation({ summary: '장바구니 조회' })
    @ApiResponse({ status: 200, schema: { example: [{ id: 'cart-1', productId: 'product-1', quantity: 2, productInfo: { name: '상품명', price: 10000, image: '이미지URL' }}]}})
    getCart() {
        return [{
            id: 'cart-1',
            productId: 'product-1',  
            quantity: 2,
            productInfo: {
                name: '상품명',
                price: 10000,
                image: '이미지URL'
            }
        }];
    }

    @Post()
    @ApiOperation({ summary: '장바구니 상품 추가' })
    @ApiBody({ type: AddToCartDto, schema: { example: { productId: 'product-1', quantity: 2 }}})
    @ApiResponse({ status: 201, schema: { example: { id: 'cart-1', productId: 'product-1', quantity: 2 }}})
    addToCart(@Body() dto: AddToCartDto) {
        return {
            id: 'cart-1',
            productId: dto.productId,
            quantity: dto.quantity
        };
    }

    @Patch(':id')
    @ApiOperation({ summary: '장바구니 수량 변경' })
    @ApiBody({ type: UpdateCartDto, schema: { example: { quantity: 3 }}})
    @ApiResponse({ status: 200, schema: { example: { id: 'cart-1', quantity: 3 }}})
    updateQuantity(
        @Param('id') id: string,
        @Body() dto: UpdateCartDto
    ) {
        return {
            id,
            quantity: dto.quantity
        };
    }

    @Delete(':id')
    @ApiOperation({ summary: '장바구니 상품 삭제' })
    @ApiResponse({ status: 200, schema: { example: { success: true }}})
    @ApiResponse({ status: 404, schema: { example: { success: false, message: "Cart item not found" }}})
    removeFromCart(@Param('id') id: string) {
        return { success: true };
    }
}
