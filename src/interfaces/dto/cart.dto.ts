import { ApiProperty } from "@nestjs/swagger";

export class AddToCartDto {
    @ApiProperty()
    productId: string;
 
    @ApiProperty()
    quantity: number;
}
 
export class UpdateCartDto {
    @ApiProperty()
    quantity: number;
}