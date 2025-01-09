
import { IsNumber, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class PaginationDto {
    @IsNumber()
    @IsOptional()
    @Type(() => Number)
    @Min(1)
    // 페이지 지정 안하는 경우 기본값 1
    page: number = 1;

    @IsNumber()
    @IsOptional()
    @Type(() => Number)
    @Min(1)
    @Max(100)
    // 개수 지정 안하는 경우 기본값 10
    limit: number = 10;

    // getSkip()과 getTake()는 Prisma에서 페이징 처리할 때 사용되는 메서드
    getSkip(): number {
        return (this.page - 1) * this.limit;
    }
    getTake(): number {
        return this.limit;
    }
}