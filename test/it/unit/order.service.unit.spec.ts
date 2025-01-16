// test/it/order/order.service.unit.spec.ts
import { Test } from '@nestjs/testing';
import { OrderService } from 'src/domain/order/service/order.service';
import { OrderRepository } from 'src/domain/order/repository/order.repository';
import { ORDER_REPOSITORY } from 'src/common/constants/app.constants';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { OrderStatus, Prisma } from '@prisma/client';
import { OrderType } from 'src/domain/order/types/order.type';

describe('주문 서비스 테스트', () => {
    let orderService: OrderService;
    let mockOrderRepository: jest.Mocked<OrderRepository>;
    let mockPrismaService: jest.Mocked<PrismaService>;

    beforeEach(async () => {
        // 각 테스트 전에 Repository mock 초기화
        mockOrderRepository = {
            createOrder: jest.fn(),
            updateOrderStatus: jest.fn(),
            findOrderById: jest.fn(),
        };

        mockPrismaService = {
            $transaction: jest.fn(callback => callback(mockPrismaService))
        } as any;

        // 테스트 모듈 설정
        const moduleRef = await Test.createTestingModule({
            providers: [
                {
                    provide: ORDER_REPOSITORY,
                    useValue: mockOrderRepository
                },
                {
                    provide: PrismaService,
                    useValue: mockPrismaService
                },
                OrderService
            ],
        }).compile();

        orderService = moduleRef.get<OrderService>(OrderService);
    });

    afterEach(() => {
        // mock 함수들 초기화
        jest.clearAllMocks();
    });

    describe('주문 생성 (createOrder)', () => {
        it('정상적인 주문 생성 - 생성된 주문 정보를 반환한다', async () => {
            // given
            const userId = 1;
            const totalAmount = 50000;
            const discountAmount = 5000;
            const finalAmount = 45000;

            const expectedOrder = {
                id: 1,
                userId,
                couponId: null,
                totalAmount: new Prisma.Decimal(totalAmount),
                discountAmount: new Prisma.Decimal(discountAmount),
                finalAmount: new Prisma.Decimal(finalAmount),
                status: OrderStatus.PENDING,
                orderedAt: expect.any(Date),
                paidAt: null,
                createdAt: expect.any(Date),
                updatedAt: expect.any(Date)
            };

            mockOrderRepository.createOrder.mockResolvedValue(expectedOrder);

            // when
            const result = await orderService.createOrder(
                userId,
                totalAmount,
                discountAmount,
                finalAmount
            );

            // then
            expect(result).toEqual(expectedOrder);
            expect(mockPrismaService.$transaction).toHaveBeenCalled();
            expect(mockOrderRepository.createOrder).toHaveBeenCalledWith({
                user: { 
                    connect: { id: userId } 
                },
                totalAmount,
                discountAmount,
                finalAmount,
                status: OrderStatus.PENDING,
                orderedAt: expect.any(Date)
            });
        });
    });

    describe('주문 상태 업데이트 (updateOrderStatus)', () => {
        it('주문 상태 업데이트 성공 - 업데이트된 주문 정보를 반환한다', async () => {
            // given
            const orderId = 1;
            const newStatus = OrderStatus.PAID;
            const updatedOrder = {
                id: orderId,
                userId: 1,
                couponId: null,
                totalAmount: new Prisma.Decimal(50000),
                discountAmount: new Prisma.Decimal(5000),
                finalAmount: new Prisma.Decimal(45000),
                status: newStatus,
                orderedAt: new Date(),
                paidAt: new Date(),
                updatedAt: new Date()
            };

            mockOrderRepository.updateOrderStatus.mockResolvedValue(updatedOrder);

            // when
            const result = await orderService.updateOrderStatus(orderId, newStatus);

            // then
            expect(result).toEqual(updatedOrder);
            expect(mockOrderRepository.updateOrderStatus).toHaveBeenCalledWith(
                orderId,
                newStatus
            );
        });

        it('주문 취소 상태로 업데이트 - 취소된 주문 정보를 반환한다', async () => {
            // given
            const orderId = 1;
            const cancelStatus = OrderStatus.CANCELLED;
            const canceledOrder: OrderType = {
                id: orderId,
                userId: 1,
                couponId: null,
                totalAmount: new Prisma.Decimal(50000),
                discountAmount: new Prisma.Decimal(5000),
                finalAmount: new Prisma.Decimal(45000),
                status: OrderStatus.CANCELLED,
                orderedAt: new Date(),
                paidAt: null,  // 취소된 주문은 paidAt이 null
                updatedAt: new Date()
            };

            mockOrderRepository.updateOrderStatus.mockResolvedValue(canceledOrder);

            // when
            const result = await orderService.updateOrderStatus(orderId, cancelStatus);

            // then
            expect(result).toEqual(canceledOrder);
            expect(result.status).toBe(OrderStatus.CANCELLED);
            expect(mockOrderRepository.updateOrderStatus).toHaveBeenCalledWith(
                orderId,
                cancelStatus
            );
        });
    });

    describe('주문 조회 (findOrderById)', () => {
        it('존재하는 주문 ID인 경우 - 주문 정보를 반환한다', async () => {
            // given
            const orderId = 1;
            const expectedOrder = {
                id: orderId,
                userId: 1,
                couponId: null,
                totalAmount: new Prisma.Decimal(50000),
                discountAmount: new Prisma.Decimal(5000),
                finalAmount: new Prisma.Decimal(45000),
                status: OrderStatus.PENDING,
                orderedAt: new Date(),
                paidAt: null,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            mockOrderRepository.findOrderById.mockResolvedValue(expectedOrder);

            // when
            const result = await orderService.findOrderById(orderId);

            // then
            expect(result).toEqual(expectedOrder);
            expect(mockOrderRepository.findOrderById).toHaveBeenCalledWith(orderId);
        });

        it('존재하지 않는 주문 ID인 경우 - null을 반환한다', async () => {
            // given
            const nonExistentOrderId = 999;
            mockOrderRepository.findOrderById.mockResolvedValue(null);

            // when
            const result = await orderService.findOrderById(nonExistentOrderId);

            // then
            expect(result).toBeNull();
            expect(mockOrderRepository.findOrderById).toHaveBeenCalledWith(nonExistentOrderId);
        });
    });
});