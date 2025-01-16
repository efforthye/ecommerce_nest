import { Injectable, BadRequestException, NotFoundException, Inject } from '@nestjs/common';
import { OrderRepository } from '../repository/order.repository';
import { ProductRepository } from 'src/domain/product/repository/product.repository';
import { CouponRepository } from 'src/domain/coupon/repository/coupon.repository';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { Order, OrderStatus, Prisma } from '@prisma/client';
import { CreateOrderDto } from 'src/interfaces/dto/order.dto';
import { COUPON_REPOSITORY, ORDER_REPOSITORY, PRODUCT_REPOSITORY } from 'src/common/constants/app.constants';

@Injectable()
export class OrderService {
    constructor(
        @Inject(ORDER_REPOSITORY)
        private readonly orderRepository: OrderRepository,
        @Inject(PRODUCT_REPOSITORY)
        private readonly productRepository: ProductRepository,
        @Inject(COUPON_REPOSITORY)
        private readonly couponRepository: CouponRepository,
        private readonly prisma: PrismaService
    ) {}

    // 주문 생성
    async createOrder(userId: number, createOrderDto: CreateOrderDto): Promise<Order> {
        return await this.prisma.$transaction(async (tx) => {
            // 상품 및 재고 확인
            const orderItemsWithProduct = await Promise.all(
                createOrderDto.items.map(async (item) => {
                    const product = await this.productRepository.findById(item.productId);
                    if (!product || !product.isActive) {
                        throw new NotFoundException(`Product ${item.productId} not found or inactive`);
                    }

                    const variant = product.variants.find(v => v.id === item.variantId);
                    if (!variant || variant.stockQuantity < item.quantity) {
                        throw new BadRequestException(`Insufficient stock for product ${item.productId} variant ${item.variantId}`);
                    }

                    return {
                        product,
                        variant,
                        quantity: item.quantity
                    };
                })
            );

            // 총 금액 계산 (Decimal to number 변환 처리)
            const totalAmount = orderItemsWithProduct.reduce((sum, item) => {
                return sum + (Number(item.variant.price) * item.quantity);
            }, 0);

            // 쿠폰 적용 (있는 경우)
            let discountAmount = 0;
            let couponConnect: any = undefined;
            if (createOrderDto.couponId) {
                try {
                    const userCoupon = await this.couponRepository.findExistingUserCoupon(
                        userId,
                        createOrderDto.couponId,
                        tx
                    );

                    // 쿠폰이 없어도 주문은 계속 진행
                    if (userCoupon) {
                        const coupon = await tx.coupon.findUnique({
                            where: { id: userCoupon.couponId }
                        });

                        if (coupon && Number(coupon.minOrderAmount) <= totalAmount) {
                            discountAmount = coupon.type === 'PERCENTAGE'
                                ? totalAmount * (Number(coupon.amount) / 100)
                                : Number(coupon.amount);
                            
                            couponConnect = { id: createOrderDto.couponId };
                        }
                    }
                } catch (error) {
                    console.error('Coupon processing error:', error);
                    // 쿠폰 처리 중 오류가 발생해도 주문은 계속 진행
                }
            }
            const finalAmount = totalAmount - discountAmount;

            // 주문 및 주문상품 생성
            return await this.orderRepository.createOrder({
                user: { connect: { id: userId } },
                totalAmount: new Prisma.Decimal(totalAmount),
                discountAmount: new Prisma.Decimal(discountAmount),
                finalAmount: new Prisma.Decimal(finalAmount),
                status: OrderStatus.PENDING,
                orderItems: {
                    create: orderItemsWithProduct.map(item => ({
                        product: { connect: { id: item.product.id } },
                        productVariant: { connect: { id: item.variant.id } },
                        quantity: item.quantity,
                        unitPrice: item.variant.price,
                        totalPrice: new Prisma.Decimal(Number(item.variant.price) * item.quantity)
                    }))
                },
                ...(couponConnect && {
                    coupon: { connect: couponConnect }  // UserCoupon과 연결
                })
            });

            // 재고 감소 -> 결제 완료 이후에 차감
            // await Promise.all(
            //     orderItemsWithProduct.map(item => 
            //         this.productRepository.decreaseVariantStock(
            //             item.variant.id,
            //             item.quantity,
            //             tx
            //         )
            //     )
            // );
            // return order;
        });
    }

    // 주문 정보 조회
    async findOrderById(orderId: number): Promise<Order> {
        const order = await this.orderRepository.findOrderById(orderId);
        if (!order) throw new NotFoundException(`Order ${orderId} not found`);
        return order;
    }

    // 주문 상태 업데이트
    async updateOrderStatus(orderId: number, status: OrderStatus): Promise<Order> {
        const order = await this.orderRepository.findOrderById(orderId);
        if (!order) {
            throw new NotFoundException(`Order ${orderId} not found`);
        }

        return this.orderRepository.updateOrderStatus(orderId, status);
    }
}