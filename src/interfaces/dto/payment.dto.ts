
import { ApiProperty } from "@nestjs/swagger";
import { IsNumber, IsOptional, Min } from "class-validator";
import { Type } from "class-transformer";

export class ProcessPaymentDto {
    @ApiProperty({
        description: '유저 아이디',
        example: 1
    })
    @IsNumber()
    @Min(1)
    @Type(() => Number)
    userId: number;

    @ApiProperty({
        description: '주문 아이디',
        example: 1
    })
    @IsNumber()
    @Min(1)
    @Type(() => Number)
    orderId: number;
}

export class PaymentResponseDto {
    @ApiProperty({ example: 1 })
    id: number;

    @ApiProperty({ example: 1 })
    orderId: number;

    @ApiProperty({ example: 1 })
    userId: number;

    @ApiProperty({ example: "BALANCE" })
    paymentMethod: string;

    @ApiProperty({ example: 50000 })
    amount: number;

    @ApiProperty({ example: "COMPLETED" })
    status: string;

    @ApiProperty({ example: "BAL_1642320000000_1" })
    pgTransactionId: string;

    @ApiProperty({ example: "2024-01-16T10:00:00.000Z" })
    createdAt: Date;

    @ApiProperty({ example: "2024-01-16T10:00:00.000Z" })
    updatedAt: Date;
}

export class PaymentPaginationDto {
    @ApiProperty({
        description: '페이지 번호',
        example: 1,
        required: false
    })
    @IsOptional()
    @IsNumber()
    @Min(1)
    @Type(() => Number)
    page?: number;

    @ApiProperty({
        description: '페이지당 항목 수',
        example: 10,
        required: false
    })
    @IsOptional()
    @IsNumber()
    @Min(1)
    @Type(() => Number)
    pageSize?: number;
}