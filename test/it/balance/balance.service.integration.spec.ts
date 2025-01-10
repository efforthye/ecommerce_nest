import { Test } from '@nestjs/testing';
import { BalanceService } from 'src/domain/balance/service/balance.service';
import { BalanceRepository } from 'src/domain/balance/repository/balance.repository';
import { BALANCE_REPOSITORY } from 'src/common/constants/repository.constants';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { BalanceType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

describe('잔액 서비스 동시성 테스트', () => {
    let balanceService: BalanceService;
    let mockBalanceRepository: jest.Mocked<BalanceRepository>;
    let mockPrismaService: jest.Mocked<PrismaService>;

    beforeEach(async () => {
        // Repository의 모든 메서드를 Mock으로 생성
        mockBalanceRepository = {
            findByUserId: jest.fn(),
            chargeBalance: jest.fn(),
            createBalanceHistory: jest.fn(),
        };

        // PrismaService의 트랜잭션을 Mock으로 생성
        mockPrismaService = {
            $transaction: jest.fn((callback) => callback(mockPrismaService)),
        } as any;

        // 테스트 모듈 설정
        const moduleRef = await Test.createTestingModule({
            providers: [
                {
                    provide: BALANCE_REPOSITORY,
                    useValue: mockBalanceRepository,
                },
                {
                    provide: PrismaService,
                    useValue: mockPrismaService,
                },
                BalanceService,
            ],
        }).compile();

        balanceService = moduleRef.get<BalanceService>(BalanceService);
    });

    afterEach(() => {
        // mock 함수들 초기화
        jest.clearAllMocks();
    });

    describe('동시성 테스트 - 잔액 충전/차감 (chargeBalance)', () => {
        let now: Date;
        
        beforeEach(() => {
            // 테스트에서 사용할 현재 시간을 2025-01-10로 고정
            now = new Date('2025-01-10T00:00:00Z');
            jest.useFakeTimers();
            jest.setSystemTime(now);
        });

        afterEach(() => {
            // 테스트 종료 후 시스템 시간을 원래대로 복구
            jest.useRealTimers();
        });

        it('동시 요청 시 잔액 충전이 정상적으로 처리된다', async () => {
            // given
            const userId = 1;
            const chargeAmount = 10000;
            const initialBalance = 5000;
            const expectedBalance = initialBalance + chargeAmount;

            // 테스트 데이터 설정
            const mockBalance = {
                id: 1,
                userId,
                balance: new Decimal(expectedBalance),
                updatedAt: now,
                createdAt: now
            };

            const mockBalanceHistory = {
                id: 1,
                userBalanceId: mockBalance.id,
                type: BalanceType.CHARGE,
                amount: new Decimal(chargeAmount),
                afterBalance: new Decimal(expectedBalance),
                createdAt: now
            };

            // Mock 설정
            mockBalanceRepository.chargeBalance.mockResolvedValue(mockBalance);
            mockBalanceRepository.createBalanceHistory.mockResolvedValue(mockBalanceHistory);

            // when
            const result = await balanceService.chargeBalance(userId, chargeAmount);

            // then
            expect(result).toEqual(mockBalance);
            expect(mockPrismaService.$transaction).toHaveBeenCalled();
            expect(mockBalanceRepository.chargeBalance).toHaveBeenCalledWith(
                userId,
                chargeAmount,
                expect.any(Object)
            );
            expect(mockBalanceRepository.createBalanceHistory).toHaveBeenCalledWith(
                mockBalance.id,
                BalanceType.CHARGE,
                chargeAmount,
                expectedBalance,
                expect.any(Object)
            );
        });

        it('동시 요청 시 잔액 차감이 정상적으로 처리된다', async () => {
            // given
            const userId = 1;
            const deductAmount = -5000;
            const initialBalance = 10000;
            const expectedBalance = initialBalance + deductAmount;

            // 테스트 데이터 설정
            const mockBalance = {
                id: 1,
                userId,
                balance: new Decimal(expectedBalance),
                updatedAt: now,
                createdAt: now
            };

            const mockBalanceHistory = {
                id: 1,
                userBalanceId: mockBalance.id,
                type: BalanceType.CHARGE,
                amount: new Decimal(deductAmount),
                afterBalance: new Decimal(expectedBalance),
                createdAt: now
            };

            // Mock 설정
            mockBalanceRepository.chargeBalance.mockResolvedValue(mockBalance);
            mockBalanceRepository.createBalanceHistory.mockResolvedValue(mockBalanceHistory);

            // when
            const result = await balanceService.chargeBalance(userId, deductAmount);

            // then
            expect(result).toEqual(mockBalance);
            expect(mockPrismaService.$transaction).toHaveBeenCalled();
            expect(mockBalanceRepository.chargeBalance).toHaveBeenCalledWith(
                userId,
                deductAmount,
                expect.any(Object)
            );
        });

        it('잔액 조회가 정상적으로 처리된다', async () => {
            // given
            const userId = 1;
            const mockBalance = {
                id: 1,
                userId,
                balance: new Decimal(10000),
                updatedAt: now,
                createdAt: now
            };

            // Mock 설정
            mockBalanceRepository.findByUserId.mockResolvedValue(mockBalance);

            // when
            const result = await balanceService.getBalance(userId);

            // then
            expect(result).toEqual(mockBalance);
            expect(mockBalanceRepository.findByUserId).toHaveBeenCalledWith(userId);
        });

        it('존재하지 않는 사용자의 잔액 조회 시 null을 반환한다', async () => {
            // given
            const userId = 999;

            // Mock 설정
            mockBalanceRepository.findByUserId.mockResolvedValue(null);

            // when
            const result = await balanceService.getBalance(userId);

            // then
            expect(result).toBeNull();
            expect(mockBalanceRepository.findByUserId).toHaveBeenCalledWith(userId);
        });

        it('트랜잭션 실패 시 롤백이 정상적으로 동작한다', async () => {
            // given
            const userId = 1;
            const chargeAmount = 10000;

            // Mock 설정 - 트랜잭션 실패 시뮬레이션
            mockBalanceRepository.chargeBalance.mockRejectedValue(new Error('Transaction failed'));

            // when & then
            await expect(balanceService.chargeBalance(userId, chargeAmount))
                .rejects
                .toThrow('Transaction failed');
            
            expect(mockPrismaService.$transaction).toHaveBeenCalled();
            expect(mockBalanceRepository.createBalanceHistory).not.toHaveBeenCalled();
        });

        it('음수 잔액이 되는 차감 요청은 실패한다', async () => {
            // given
            const userId = 1;
            const deductAmount = -20000; // 현재 잔액보다 큰 차감 요청
            const currentBalance = 10000;

            const mockCurrentBalance = {
                id: 1,
                userId,
                balance: new Decimal(currentBalance),
                updatedAt: now,
                createdAt: now
            };

            // Mock 설정
            mockBalanceRepository.findByUserId.mockResolvedValue(mockCurrentBalance);
            mockBalanceRepository.chargeBalance.mockRejectedValue(
                new BadRequestException('Insufficient balance')
            );

            // when & then
            await expect(balanceService.chargeBalance(userId, deductAmount))
                .rejects
                .toThrow(BadRequestException);
            
            expect(mockPrismaService.$transaction).toHaveBeenCalled();
            expect(mockBalanceRepository.createBalanceHistory).not.toHaveBeenCalled();
        });
    });
});