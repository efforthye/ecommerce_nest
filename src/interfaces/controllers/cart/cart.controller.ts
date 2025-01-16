import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards, Headers, UseInterceptors } from "@nestjs/common";
import { ApiOperation, ApiTags, ApiResponse, ApiBody, ApiHeader, ApiParam } from "@nestjs/swagger";
import { AddToCartDto, UpdateCartDto } from "../../dto/cart.dto";
import { CartService } from "src/domain/cart/service/cart.service";
import { JwtAuthGuard } from "src/common/guards/jwt-auth.guard";
import { ParseUserIdInterceptor } from "src/common/interceptors/parse-user-id.interceptor";

@Controller('cart')
@ApiTags('장바구니')
@UseInterceptors(ParseUserIdInterceptor)
export class CartController {
    constructor(private readonly cartService: CartService) {}

    @ApiOperation({ summary: '장바구니 조회' })
    @ApiHeader({ name: 'x-bypass-token', required: true, description: '인증 토큰 (temp bypass key: happy-world-token)', schema: { type: 'string' } })
    @ApiParam({ name: 'userId', description: '유저 아이디' })
    @ApiResponse({ status: 200, schema: { example: [{ id: 1, userId: 1, productId: 1, optionVariantId: 1, quantity: 2, product: { name: '상품명', basePrice: 10000, productImages: [{ imageUrl: '이미지URL' }] }, productVariant: { optionName: '옵션명', price: 10000 } }] } })
    @UseGuards(JwtAuthGuard)
    @Get(':userId')
    getCart(@Headers('x-bypass-token') bypassToken: string, @Param('userId') userId: number) {
        return this.cartService.getCart(userId);
    }

    @ApiOperation({ summary: '장바구니 상품 추가' })
    @ApiHeader({ name: 'x-bypass-token', required: true, description: '인증 토큰 (temp bypass key: happy-world-token)', schema: { type: 'string' } })
    @ApiParam({ name: 'userId', description: '유저 아이디' })
    @ApiBody({ type: AddToCartDto })
    @ApiResponse({ status: 201, schema: { example: { id: 1, userId: 1, productId: 1, optionVariantId: 1, quantity: 2 } } })
    @UseGuards(JwtAuthGuard)
    @Post(':userId')
    addToCart(@Headers('x-bypass-token') bypassToken: string, @Param('userId') userId: number, @Body() dto: AddToCartDto) {
        return this.cartService.addToCart(userId, dto);
    }

    @ApiOperation({ summary: '장바구니 수량 변경' })
    @ApiHeader({ name: 'x-bypass-token', required: true, description: '인증 토큰 (temp bypass key: happy-world-token)', schema: { type: 'string' } })
    @ApiParam({ name: 'userId', description: '유저 아이디' })
    @ApiParam({ name: 'cartId', description: '장바구니 아이템 ID' })
    @ApiBody({ type: UpdateCartDto })
    @ApiResponse({ status: 200, schema: { example: { id: 1, userId: 1, quantity: 3 } } })
    @UseGuards(JwtAuthGuard)
    @Patch(':userId/:cartId')
    updateQuantity(
        @Headers('x-bypass-token') bypassToken: string,
        @Param('userId') userId: number,
        @Param('cartId') cartId: number,
        @Body() dto: UpdateCartDto
    ) {
        return this.cartService.updateQuantity(userId, cartId, dto);
    }

    @ApiOperation({ summary: '장바구니 상품 삭제' })
    @ApiHeader({ name: 'x-bypass-token', required: true, description: '인증 토큰 (temp bypass key: happy-world-token)', schema: { type: 'string' } })
    @ApiParam({ name: 'userId', description: '유저 아이디' })
    @ApiParam({ name: 'cartId', description: '장바구니 아이템 ID' })
    @ApiResponse({ status: 200, schema: { example: { success: true } } })
    @ApiResponse({ status: 404, schema: { example: { success: false, message: "Cart item not found" } } })
    @UseGuards(JwtAuthGuard)
    @Delete(':userId/:cartId')
    removeFromCart(
        @Headers('x-bypass-token') bypassToken: string,
        @Param('userId') userId: number,
        @Param('cartId') cartId: number
    ) {
        return this.cartService.removeFromCart(userId, cartId);
    }
}