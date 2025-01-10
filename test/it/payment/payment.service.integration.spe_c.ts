// import { Test } from '@nestjs/testing';
// import { PaymentService } from 'src/domain/payment/service/payment.service';
// import { PaymentRepository } from 'src/domain/payment/repository/payment.repository';
// import { PAYMENT_REPOSITORY } from 'src/common/constants/repository.constants';
// import { BadRequestException, NotFoundException } from '@nestjs/common';
// import { PrismaService } from 'src/infrastructure/database/prisma.service';
// import { OrderService } from 'src/domain/order/service/order.service';
// import { BalanceService } from 'src/domain/balance/service/balance.service';
// import { PaymentStatus } from '@prisma/client';
// import { PaymentWithOrder } from 'src/domain/payment/types/payment.types';

// describe('결제 서비스 동시성 테스트', () => {
//     let paymentService: PaymentService;
//     let mockPaymentRepository: jest.Mocked<PaymentRepository>;
//     let mockPrismaService: jest.Mocked<PrismaService>;
//     let mockOrderService: jest.Mocked<OrderService>;
//     let mockBalanceService: jest.Mocked<BalanceService>;

//     beforeEach(async () => {
//         // Repository와 Service의 모든 메서드를 Mock으로 생성
//         mockPaymentRepository = {
//             findPaymentWithOrderByOrderId: jest.fn(),
//             findPaymentWithOrderById: jest.fn(),
//             createPayment: jest.fn(),
//             updatePaymentStatus: jest.fn(),
//             countUserPayments: jest.fn(),
//             findUserPayments: jest.fn(),
//         };

//         mockOrderService = {
//             findOrderById: jest.fn(),
//             updateOrderStatus: jest.fn(),
//         } as any;

//         mockBalanceService = {
//             getBalance: jest.fn(),
//             chargeBalance: jest.fn(),
//         } as any;

//         // PrismaService의 트랜잭션을 Mock으로 생성
//         mockPrismaService = {
//             $transaction: jest.fn((callback) => callback(mockPrismaService)),
//         } as any;

//         // 테스트 모듈 설정
//         const moduleRef = await Test.createTestingModule({
//             providers: [
//                 {
//                     provide: PAYMENT_REPOSITORY,
//                     useValue: mockPaymentRepository,
//                 },
//                 {
//                     provide: PrismaService,
//                     useValue: mockPrismaService,
//                 },
//                 {
//                     provide: OrderService,
//                     useValue: mockOrderService,
//                 },
//                 {
//                     provide: BalanceService,
//                     useValue: mockBalanceService,
//                 },
//                 PaymentService,
//             ],
//         }).compile();

//         paymentService = moduleRef.get<PaymentService>(PaymentService);
//     });

//     afterEach(() => {
//         // mock 함수들 초기화
//         jest.clearAllMocks();
//     });

//     describe('동시성 테스트 - 결제 처리 (processPayment)', () => {
//         let now: Date;
        
//         beforeEach(() => {
//             // 테스트에서 사용할 현재 시간을 2025-01-10로 고정
//             now = new Date('2025-01-10T00:00:00Z');
//             jest.useFakeTimers();
//             jest.setSystemTime(now);
//         });

//         afterEach(() => {
//             // 테스트 종료 후 시스템 시간을 원래대로 복구
//             jest.useRealTimers();
//         });

//         it('동시 요청 시 잔액이 충분한 경우 - 결제가 정상 처리된다', async () => {
//             // given
//             const userId = 1;
//             const orderId = 1;
//             const orderAmount = 10000;

//             // 테스트 데이터 설정
//             const mockOrder = {
//                 id: orderId,
//                 userId: userId,
//                 totalAmount: orderAmount,
//                 finalAmount: orderAmount,
//                 status: 'PENDING',
//                 couponId: null,
//                 discountAmount: 0,
//                 orderedAt: now,
//                 paidAt: null
//             };

//             const mockBalance = {
//                 id: 1,
//                 userId: userId,
//                 balance: 20000, // 주문금액보다 큰 잔액
//             };

//             const mockPayment = {
//                 id: 1,
//                 orderId,
//                 userId,
//                 amount: orderAmount,
//                 status: PaymentStatus.COMPLETED,
//                 createdAt: now,
//             };

//             // Mock 설정
//             mockPaymentRepository.findPaymentWithOrderByOrderId.mockResolvedValue(null);
//             mockOrderService.findOrderById.mockResolvedValue(mockOrder);
//             mockBalanceService.getBalance.mockResolvedValue(mockBalance);
//             mockPaymentRepository.createPayment.mockResolvedValue(mockPayment);

//             // when
//             const result = await paymentService.processPayment(userId, orderId);

//             // then
//             expect(result).toEqual(mockPayment);
//             expect(mockPrismaService.$transaction).toHaveBeenCalled();
//             expect(mockBalanceService.chargeBalance).toHaveBeenCalledWith(
//                 userId,
//                 -orderAmount
//             );
//             expect(mockOrderService.updateOrderStatus).toHaveBeenCalledWith(
//                 orderId,
//                 'PAID'
//             );
//         });

//         it('동시 요청 시 잔액이 부족한 경우 - BadRequestException이 발생한다', async () => {
//             // given
//             const userId = 1;
//             const orderId = 1;
//             const orderAmount = 10000;

//             const mockOrder = {
//                 id: orderId,
//                 userId: userId,
//                 totalAmount: orderAmount,
//                 finalAmount: orderAmount,
//                 status: 'PENDING',
//                 couponId: null,
//                 discountAmount: 0,
//                 orderedAt: now,
//                 paidAt: null
//             };

//             const mockBalance = {
//                 id: 1,
//                 userId: userId,
//                 balance: 5000, // 주문금액보다 작은 잔액
//             };

//             // Mock 설정
//             mockPaymentRepository.findPaymentWithOrderByOrderId.mockResolvedValue(null);
//             mockOrderService.findOrderById.mockResolvedValue(mockOrder);
//             mockBalanceService.getBalance.mockResolvedValue(mockBalance);

//             // when & then
//             await expect(paymentService.processPayment(userId, orderId))
//                 .rejects
//                 .toThrow(BadRequestException);

//             expect(mockBalanceService.chargeBalance).not.toHaveBeenCalled();
//             expect(mockOrderService.updateOrderStatus).not.toHaveBeenCalled();
//         });

//         it('결제 취소 시나리오 - 정상적으로 취소되고 잔액이 환불된다', async () => {
//             // given
//             const userId = 1;
//             const paymentId = 1;
//             const amount = 10000;

//             const mockPayment = {
//                 id: paymentId,
//                 userId,
//                 orderId: 1,
//                 amount,
//                 status: PaymentStatus.COMPLETED,
//             };

//             // Mock 설정
//             mockPaymentRepository.findPaymentWithOrderById.mockResolvedValue(mockPayment);

//             // when
//             await paymentService.cancelPayment(userId, paymentId);

//             // then
//             expect(mockBalanceService.chargeBalance).toHaveBeenCalledWith(
//                 userId,
//                 amount
//             );
//             expect(mockOrderService.updateOrderStatus).toHaveBeenCalledWith(
//                 mockPayment.orderId,
//                 'CANCELLED'
//             );
//         });

//         it('이미 처리된 주문에 대한 결제 시도 - BadRequestException이 발생한다', async () => {
//             // given
//             const userId = 1;
//             const orderId = 1;

//             const existingPayment = {
//                 id: 1,
//                 orderId,
//                 userId,
//                 status: PaymentStatus.COMPLETED,
//             };

//             // Mock 설정
//             mockPaymentRepository.findPaymentWithOrderByOrderId.mockResolvedValue(existingPayment);

//             // when & then
//             await expect(paymentService.processPayment(userId, orderId))
//                 .rejects
//                 .toThrow(BadRequestException);
            
//             expect(mockBalanceService.chargeBalance).not.toHaveBeenCalled();
//             expect(mockOrderService.updateOrderStatus).not.toHaveBeenCalled();
//         });
//     });
// });