import { Body, Controller, Delete, Get, Param, Patch, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { AddToCartDto, UpdateCartDto } from "../dto/cart.dto";

@Controller('cart')
@ApiTags('cart')
export class CartController {
    @Get()
    @ApiOperation({ summary: '장바구니 조회' })
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
    addToCart(@Body() dto: AddToCartDto) {
        return {
            id: 'cart-1',
            productId: dto.productId,
            quantity: dto.quantity
        };
    }

    @Patch(':id')
    @ApiOperation({ summary: '장바구니 수량 변경' })
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
    removeFromCart(@Param('id') id: string) {
        return { success: true };
    }
}