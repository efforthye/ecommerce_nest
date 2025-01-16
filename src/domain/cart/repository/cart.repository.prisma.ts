import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { CartRepository } from './cart.repository';
import { UserCart } from '@prisma/client';

@Injectable()
export class CartRepositoryPrisma implements CartRepository {
    constructor(private readonly prisma: PrismaService) {}

    // 유저 장바구니 아이템 목록 조회
    async findByUserId(userId: number): Promise<UserCart[]> {
        return this.prisma.userCart.findMany({
            where: { userId },
            include: {
                product: {
                    include: {
                        productImages: true
                    }
                },
                productVariant: true
            }
        });
    }

    // 장바구니 생성
    async create(userId: number, productId: number, variantId: number, quantity: number): Promise<UserCart> {
        return this.prisma.userCart.create({
            data: {
                userId,
                productId,
                optionVariantId: variantId,
                quantity
            },
            include: {
                product: {
                    include: {
                        productImages: true
                    }
                },
                productVariant: true
            }
        });
    }

    // 장바구니 상품 재고 수량 변경
    async update(id: number, quantity: number): Promise<UserCart> {
        return this.prisma.userCart.update({
            where: { id },
            data: { quantity },
            include: {
                product: {
                    include: {
                        productImages: true
                    }
                },
                productVariant: true
            }
        });
    }

    // 장바구니 아이템 삭제
    async delete(id: number): Promise<void> {
        await this.prisma.userCart.delete({
            where: { id }
        });
    }

    // 유저 장바구니 상세 정보 조회
    async findById(id: number): Promise<UserCart | null> {
        return this.prisma.userCart.findUnique({
            where: { id },
            include: {
                product: true,
                productVariant: true
            }
        });
    }
}