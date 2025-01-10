// // test/it/payment/payment.service.unit.spec.ts
// import { Test } from '@nestjs/testing';
// import { PaymentService } from 'src/domain/payment/service/payment.service';
// import { PaymentRepository } from 'src/domain/payment/repository/payment.repository';
// import { PAYMENT_REPOSITORY } from 'src/common/constants/repository.constants';
// import { PrismaService } from 'src/infrastructure/database/prisma.service';
// import { OrderService } from 'src/domain/order/service/order.service';
// import { BalanceService } from 'src/domain/balance/service/balance.service';
// import { BadRequestException, NotFoundException } from '@nestjs/common';
// import { PaymentStatus, OrderStatus, Prisma } from '@prisma/client';

// // Order 타입 정의
// type OrderType = {
//     id: number;
//     userId: number;
//     couponId: number | null;
//     totalAmount: Prisma.Decimal;
//     discountAmount: Prisma.Decimal;
//     finalAmount: Prisma.Decimal;
//     status: OrderStatus;
//     orderedAt: Date;
//     paidAt: Date | null;
//     updatedAt: Date;
// };

// // Payment 타입 정의
// type PaymentWithOrder = {
//     id: number;
//     orderId: number;
//     userId: number;
//     paymentMethod: string;
//     amount: Prisma.Decimal;
//     status: PaymentStatus;
//     pgTransactionId: string;
//     createdAt: Date;
//     updatedAt: Date;
//     order?: {
//         id: number;
//         status: OrderStatus;
//     };
// };

// describe('결제 서비스 테스트', () => {
//     let paymentService: PaymentService;
//     let mockPaymentRepository: jest.Mocked<PaymentRepository>;
//     let mockOrderService: jest.Mocked<OrderService>;
//     let mockBalanceService: jest.Mocked<BalanceService>;
//     let mockPrismaService: jest.Mocked<PrismaService>;

//     beforeEach(async () => {
//         // 각 테스트 전에 Repository와 Service mock 초기화
//         mockPaymentRepository = {
//             findPaymentWithOrderByOrderId: jest.fn(),
//             findPaymentWithOrderById: jest.fn(),
//             createPayment: jest.fn(),
//             updatePaymentStatus: jest.fn(),
//             countUserPayments: jest.fn(),
//             findUserPayments: jest.fn(),
//         };
//         mockOrderService = jest.fn(() => ({
//             findOrderById: jest.fn(),
//             updateOrderStatus: jest.fn(),
//             createOrder: jest.fn()
//         })) as unknown as jest.Mocked<OrderService>;

//         mockBalanceService = {
//             getBalance: jest.fn(),
//             chargeBalance: jest.fn()
//         } as unknown as jest.Mocked<BalanceService>;

//         mockPrismaService = {
//             $transaction: jest.fn(callback => callback(mockPrismaService))
//         } as any;

//         // 테스트 모듈 설정
//         const moduleRef = await Test.createTestingModule({
//             providers: [
//                 {
//                     provide: PAYMENT_REPOSITORY,
//                     useValue: mockPaymentRepository
//                 },
//                 {
//                     provide: OrderService,
//                     useValue: mockOrderService
//                 },
//                 {
//                     provide: BalanceService,
//                     useValue: mockBalanceService
//                 },
//                 {
//                     provide: PrismaService,
//                     useValue: mockPrismaService
//                 },
//                 PaymentService
//             ],
//         }).compile();

//         paymentService = moduleRef.get<PaymentService>(PaymentService);
//     });

//     afterEach(() => {
//         // mock 함수들 초기화
//         jest.clearAllMocks();
//     });

//     describe('결제 처리 (processPayment)', () => {
//         it('정상적인 결제 처리 - 결제 정보를 생성하고 주문 상태를 업데이트한다', async () => {
//             // given
//             const userId = 1;
//             const orderId = 1;
            
//             // 기존 결제 내역이 없음
//             mockPaymentRepository.findPaymentWithOrderByOrderId.mockResolvedValue(null);
            
//             // 주문 정보
//             const mockOrder: OrderType = {
//                 id: orderId,
//                 userId,
//                 couponId: null,
//                 totalAmount: new Prisma.Decimal(50000),
//                 discountAmount: new Prisma.Decimal(5000),
//                 finalAmount: new Prisma.Decimal(45000),
//                 status: OrderStatus.PENDING,
//                 orderedAt: new Date(),
//                 paidAt: null,
//                 updatedAt: new Date()
//             };
//             mockOrderService.findOrderById.mockResolvedValue(mockOrder);
            
//             // 잔액 정보
//             const mockBalance = {
//                 id: 1,
//                 userId,
//                 balance: new Prisma.Decimal(100000),
//                 updatedAt: new Date()
//             };
//             mockBalanceService.getBalance.mockResolvedValue(mockBalance);
            
//             // 생성될 결제 정보
//             const mockPayment: PaymentWithOrder = {
//                 id: 1,
//                 orderId,
//                 userId,
//                 paymentMethod: 'BALANCE',
//                 amount: new Prisma.Decimal(45000),
//                 status: PaymentStatus.COMPLETED,
//                 pgTransactionId: `BAL_${Date.now()}_${orderId}`,
//                 createdAt: new Date(),
//                 updatedAt: new Date(),
//                 order: {
//                     id: orderId,
//                     status: OrderStatus.PAID
//                 }
//             };
//             mockPaymentRepository.createPayment.mockResolvedValue(mockPayment);

//             // when
//             const result = await paymentService.processPayment(userId, orderId);

//             // then
//             expect(result).toEqual(mockPayment);
//             expect(mockPrismaService.$transaction).toHaveBeenCalled();
//             expect(mockBalanceService.chargeBalance).toHaveBeenCalledWith(userId, -45000);
//             expect(mockOrderService.updateOrderStatus).toHaveBeenCalledWith(orderId, 'PAID');
//         });

//         it('이미 결제된 주문인 경우 - BadRequestException을 발생시킨다', async () => {
//             // given
//             const userId = 1;
//             const orderId = 1;
//             const existingPayment: PaymentWithOrder = {
//                 id: 1,
//                 orderId: 1,
//                 userId: 1,
//                 paymentMethod: 'BALANCE',
//                 amount: new Prisma.Decimal(45000),
//                 status: PaymentStatus.COMPLETED,
//                 pgTransactionId: 'BAL_1234567_1',
//                 createdAt: new Date(),
//                 updatedAt: new Date(),
//                 order: {
//                     id: 1,
//                     status: OrderStatus.PAID
//                 }
//             };
//             mockPaymentRepository.findPaymentWithOrderByOrderId.mockResolvedValue(existingPayment);

//             // when & then
//             await expect(paymentService.processPayment(userId, orderId))
//                 .rejects
//                 .toThrow(BadRequestException);
//         });

//         it('잔액이 부족한 경우 - BadRequestException을 발생시킨다', async () => {
//             // given
//             const userId = 1;
//             const orderId = 1;
            
//             mockPaymentRepository.findPaymentWithOrderByOrderId.mockResolvedValue(null);
            
//             const mockOrder: OrderType = {
//                 id: orderId,
//                 userId,
//                 couponId: null,
//                 totalAmount: new Prisma.Decimal(50000),
//                 discountAmount: new Prisma.Decimal(5000),
//                 finalAmount: new Prisma.Decimal(45000),
//                 status: OrderStatus.PENDING,
//                 orderedAt: new Date(),
//                 paidAt: null,
//                 updatedAt: new Date()
//             };
//             mockOrderService.findOrderById.mockResolvedValue(mockOrder);
            
//             const mockBalance = {
//                 id: 1,
//                 userId,
//                 balance: new Prisma.Decimal(10000), // 주문 금액보다 적은 잔액
//                 updatedAt: new Date()
//             };
//             mockBalanceService.getBalance.mockResolvedValue(mockBalance);

//             // when & then
//             await expect(paymentService.processPayment(userId, orderId))
//                 .rejects
//                 .toThrow(BadRequestException);
//         });
//     });

//     describe('결제 취소 (cancelPayment)', () => {
//         it('정상적인 결제 취소 - 결제가 취소되고 잔액이 환불된다', async () => {
//             // given
//             const userId = 1;
//             const paymentId = 1;
//             const mockPayment: PaymentWithOrder = {
//                 id: paymentId,
//                 orderId: 1,
//                 userId,
//                 paymentMethod: 'BALANCE',
//                 amount: new Prisma.Decimal(45000),
//                 status: PaymentStatus.COMPLETED,
//                 pgTransactionId: 'BAL_1234567_1',
//                 createdAt: new Date(),
//                 updatedAt: new Date(),
//                 order: {
//                     id: 1,
//                     status: OrderStatus.PAID
//                 }
//             };
            
//             const canceledPayment: PaymentWithOrder = {
//                 ...mockPayment,
//                 status: PaymentStatus.CANCELLED,
//                 updatedAt: new Date()
//             };

//             mockPaymentRepository.findPaymentWithOrderById.mockResolvedValue(mockPayment);
//             mockPaymentRepository.updatePaymentStatus.mockResolvedValue(canceledPayment);

//             // when
//             const result = await paymentService.cancelPayment(userId, paymentId);

//             // then
//             expect(result).toEqual(canceledPayment);
//             expect(mockBalanceService.chargeBalance).toHaveBeenCalledWith(userId, 45000);
//             expect(mockOrderService.updateOrderStatus).toHaveBeenCalledWith(1, 'CANCELLED');
//         });

//         it('다른 사용자의 결제 취소 시도 - BadRequestException을 발생시킨다', async () => {
//             // given
//             const userId = 1;
//             const paymentId = 1;
//             const mockPayment: PaymentWithOrder = {
//                 id: paymentId,
//                 userId: 2, // 다른 사용자의 결제
//                 orderId: 1,
//                 paymentMethod: 'BALANCE',
//                 amount: new Prisma.Decimal(45000),
//                 status: PaymentStatus.COMPLETED,
//                 pgTransactionId: 'BAL_1234567_1',
//                 createdAt: new Date(),
//                 updatedAt: new Date(),
//                 order: {
//                     id: 1,
//                     status: OrderStatus.PAID
//                 }
//             };
//             mockPaymentRepository.findPaymentWithOrderById.mockResolvedValue(mockPayment);

//             // when & then
//             await expect(paymentService.cancelPayment(userId, paymentId))
//                 .rejects
//                 .toThrow(BadRequestException);
//         });
//     });

//     describe('사용자 결제 내역 조회 (getUserPayments)', () => {
//         it('결제 내역이 있는 경우 - 페이징된 결제 내역을 반환한다', async () => {
//             // given
//             const userId = 1;
//             const pagination = { page: 1, pageSize: 10 };
//             const mockPayments: PaymentWithOrder[] = [
//                 {
//                     id: 1,
//                     orderId: 1,
//                     userId,
//                     paymentMethod: 'BALANCE',
//                     amount: new Prisma.Decimal(45000),
//                     status: PaymentStatus.COMPLETED,
//                     pgTransactionId: 'BAL_1234567_1',
//                     createdAt: new Date(),
//                     updatedAt: new Date(),
//                     order: {
//                         id: 1,
//                         status: OrderStatus.PAID
//                     }
//                 }
//             ];
//             const totalCount = 1;

//             mockPaymentRepository.countUserPayments.mockResolvedValue(totalCount);
//             mockPaymentRepository.findUserPayments.mockResolvedValue(mockPayments);

//             // when
//             const result = await paymentService.getUserPayments(userId, pagination);

//             // then
//             expect(result.payments).toEqual(mockPayments);
//             expect(result.total).toBe(totalCount);
//             expect(result.page).toBe(pagination.page);
//             expect(result.pageSize).toBe(pagination.pageSize);
//             expect(result.totalPages).toBe(1);
//         });

//         it('결제 내역이 없는 경우 - 빈 배열을 반환한다', async () => {
//             // given
//             const userId = 1;
//             const pagination = { page: 1, pageSize: 10 };

//             mockPaymentRepository.countUserPayments.mockResolvedValue(0);
//             mockPaymentRepository.findUserPayments.mockResolvedValue([]);

//             // when
//             const result = await paymentService.getUserPayments(userId, pagination);

//             // then
//             expect(result.payments).toHaveLength(0);
//             expect(result.total).toBe(0);
//             expect(result.totalPages).toBe(0);
//         });
//     });
// });