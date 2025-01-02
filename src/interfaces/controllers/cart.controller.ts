import { Body, Controller, Delete, Get, Param, Patch, Post } from "@nestjs/common";
import { ApiOperation, ApiTags, ApiResponse, ApiBody } from "@nestjs/swagger";
import { AddToCartDto, UpdateCartDto } from "../dto/cart.dto";

@Controller('cart')
@ApiTags('cart')
export class CartController {
    @Get()
    @ApiOperation({ summary: '장바구니 조회' })
    @ApiResponse({
        status: 200,
        description: '장바구니에 담긴 상품 목록을 반환합니다.',
        schema: {
            example: [
                {
                    id: 'cart-1',
                    productId: 'product-1',
                    quantity: 2,
                    productInfo: {
                        name: '상품명',
                        price: 10000,
                        image: '이미지URL'
                    }
                }
            ]
        }
    })
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
    @ApiBody({
        description: '추가할 상품의 정보',
        type: AddToCartDto,
        examples: {
            example1: {
                summary: '추가 요청 예제',
                value: {
                    productId: 'product-1',
                    quantity: 2
                }
            }
        }
    })
    @ApiResponse({
        status: 201,
        description: '장바구니에 상품이 추가되었습니다.',
        schema: {
            example: {
                id: 'cart-1',
                productId: 'product-1',
                quantity: 2
            }
        }
    })
    addToCart(@Body() dto: AddToCartDto) {
        return {
            id: 'cart-1',
            productId: dto.productId,
            quantity: dto.quantity
        };
    }

    @Patch(':id')
    @ApiOperation({ summary: '장바구니 수량 변경' })
    @ApiBody({
        description: '변경할 상품 수량 정보',
        type: UpdateCartDto,
        examples: {
            example1: {
                summary: '수량 변경 요청 예제',
                value: {
                    quantity: 3
                }
            }
        }
    })
    @ApiResponse({
        status: 200,
        description: '장바구니 상품 수량이 변경되었습니다.',
        schema: {
            example: {
                id: 'cart-1',
                quantity: 3
            }
        }
    })
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
    @ApiResponse({
        status: 200,
        description: '장바구니에서 상품이 삭제되었습니다.',
        schema: {
            example: {
                success: true
            }
        }
    })
    @ApiResponse({
        status: 404,
        description: '존재하지 않는 장바구니 항목입니다.',
        schema: {
            example: {
                success: false,
                message: "Cart item not found"
            }
        }
    })
    removeFromCart(@Param('id') id: string) {
        return { success: true };
    }
}
