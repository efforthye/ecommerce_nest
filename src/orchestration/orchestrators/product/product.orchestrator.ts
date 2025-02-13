import { Injectable } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { ProductEvents } from '../../events';
import { ProductService } from 'src/domain/product/service/product.service';
import { PrismaService } from 'src/infrastructure/database/prisma.service';

@Injectable()
export class ProductOrchestrator {
    constructor(
        private readonly eventEmitter: EventEmitter2,
        private readonly productService: ProductService,
        private readonly prisma: PrismaService
    ) {}

    @OnEvent(ProductEvents.PRODUCT_STOCK_CHECK_REQUESTED)
    async handleStockCheck(payload: {
        productId: number;
        variantId: number;
        requestedQuantity: number;
    }) {
        try {
            const product = await this.productService.getProductById(payload.productId);
            const variant = product.variants.find(v => v.id === payload.variantId);

            if (!variant) {
                throw new Error('Product variant not found');
            }

            const isAvailable = variant.stockQuantity >= payload.requestedQuantity;

            this.eventEmitter.emit(ProductEvents.PRODUCT_STOCK_CHECK_COMPLETED, {
                productId: payload.productId,
                variantId: payload.variantId,
                requestedQuantity: payload.requestedQuantity,
                isAvailable,
                currentStock: variant.stockQuantity
            });
        } catch (error) {
            this.eventEmitter.emit(ProductEvents.PRODUCT_STOCK_CHECK_COMPLETED, {
                productId: payload.productId,
                variantId: payload.variantId,
                requestedQuantity: payload.requestedQuantity,
                isAvailable: false,
                error: error.message
            });
        }
    }

    @OnEvent(ProductEvents.PRODUCT_STOCK_UPDATED)
    async handleStockUpdate(payload: {
        productId: number;
        variantId: number;
        quantity: number;
        operation: 'INCREASE' | 'DECREASE';
    }) {
        try {
            await this.prisma.$transaction(async (tx) => {
                // Lock을 걸고 재고 조회
                const variant = await tx.productVariant.findUnique({
                    where: { id: payload.variantId },
                    select: { id: true, stockQuantity: true }
                });

                if (!variant) {
                    throw new Error('Product variant not found');
                }

                let newQuantity: number;
                if (payload.operation === 'DECREASE') {
                    if (variant.stockQuantity < payload.quantity) {
                        throw new Error('Insufficient stock');
                    }
                    newQuantity = variant.stockQuantity - payload.quantity;
                } else {
                    newQuantity = variant.stockQuantity + payload.quantity;
                }

                // 재고 업데이트
                await tx.productVariant.update({
                    where: { id: payload.variantId },
                    data: { stockQuantity: newQuantity }
                });

                // 재고 이력 생성
                await tx.productStockHistory.create({
                    data: {
                        productId: payload.productId,
                        variantId: payload.variantId,
                        quantity: payload.quantity,
                        type: payload.operation,
                        beforeStock: variant.stockQuantity,
                        afterStock: newQuantity
                    }
                });
            });

            this.eventEmitter.emit(ProductEvents.PRODUCT_STOCK_UPDATED, {
                productId: payload.productId,
                variantId: payload.variantId,
                quantity: payload.quantity,
                operation: payload.operation,
                status: 'SUCCESS'
            });
        } catch (error) {
            this.eventEmitter.emit(ProductEvents.PRODUCT_STOCK_UPDATED, {
                productId: payload.productId,
                variantId: payload.variantId,
                quantity: payload.quantity,
                operation: payload.operation,
                status: 'FAILED',
                error: error.message
            });
        }
    }
}