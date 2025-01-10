// test/it/balance/balance.service.unit.spec.ts
import { Test } from '@nestjs/testing';
import { BalanceService } from 'src/domain/balance/service/balance.service';
import { BalanceRepository } from 'src/domain/balance/repository/balance.repository';
import { BALANCE_REPOSITORY } from 'src/common/constants/repository.constants';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { BalanceType, Prisma } from '@prisma/client';

describe('잔액 서비스 테스트', () => {
    let balanceService: BalanceService;
    let mockBalanceRepository: jest.Mocked<BalanceRepository>;
    let mockPrismaService: jest.Mocked<PrismaService>;

    beforeEach(async () => {
        // 각 테스트 전에 Repository mock 초기화
        mockBalanceRepository = {
            findByUserId: jest.fn(),
            chargeBalance: jest.fn(),
            createBalanceHistory: jest.fn(),
        };

        mockPrismaService = {
            $transaction: jest.fn(callback => callback(mockPrismaService))
        } as any;

        // 테스트 모듈 설정
        const moduleRef = await Test.createTestingModule({
            providers: [
                {
                    provide: BALANCE_REPOSITORY,
                    useValue: mockBalanceRepository
                },
                {
                    provide: PrismaService,
                    useValue: mockPrismaService
                },
                BalanceService
            ],
        }).compile();

        balanceService = moduleRef.get<BalanceService>(BalanceService);
    });

    afterEach(() => {
        // mock 함수들 초기화
        jest.clearAllMocks();
    });

    describe('잔액 조회 (getBalance)', () => {
        it('사용자의 잔액이 있는 경우 - 잔액 정보를 반환한다', async () => {
            // given
            const userId = 1;
            const expectedBalance = {
                id: 1,
                userId: 1,
                balance: new Prisma.Decimal(10000),
                createdAt: new Date('2025-01-01'),
                updatedAt: new Date('2025-01-01')
            };
            mockBalanceRepository.findByUserId.mockResolvedValue(expectedBalance);

            // when
            const result = await balanceService.getBalance(userId);

            // then
            expect(result).toEqual(expectedBalance);
            expect(mockBalanceRepository.findByUserId).toHaveBeenCalledWith(userId);
        });

        it('사용자의 잔액이 없는 경우 - null을 반환한다', async () => {
            // given
            const userId = 999;
            mockBalanceRepository.findByUserId.mockResolvedValue(null);

            // when
            const result = await balanceService.getBalance(userId);

            // then
            expect(result).toBeNull();
            expect(mockBalanceRepository.findByUserId).toHaveBeenCalledWith(userId);
        });
    });

    describe('잔액 충전 (chargeBalance)', () => {
        it('잔액 충전 시 - 트랜잭션 내에서 잔액 업데이트와 이력을 생성한다', async () => {
            // given
            const userId = 1;
            const chargeAmount = 10000;
            const updatedBalance = {
                id: 1,
                userId: 1,
                balance: new Prisma.Decimal(20000),
                createdAt: new Date('2025-01-01'),
                updatedAt: new Date('2025-01-01')
            };

            const expectedHistory = {
                id: 1,
                userBalanceId: 1,
                type: BalanceType.CHARGE,
                amount: new Prisma.Decimal(chargeAmount),
                afterBalance: updatedBalance.balance,
                createdAt: expect.any(Date)
            };

            mockBalanceRepository.chargeBalance.mockResolvedValue(updatedBalance);
            mockBalanceRepository.createBalanceHistory.mockResolvedValue(expectedHistory);

            // when
            const result = await balanceService.chargeBalance(userId, chargeAmount);

            // then
            expect(result).toEqual(updatedBalance);
            expect(mockPrismaService.$transaction).toHaveBeenCalled();
            expect(mockBalanceRepository.chargeBalance).toHaveBeenCalledWith(
                userId,
                chargeAmount,
                expect.any(Object)
            );
            expect(mockBalanceRepository.createBalanceHistory).toHaveBeenCalledWith(
                updatedBalance.id,
                BalanceType.CHARGE,
                chargeAmount,
                Number(updatedBalance.balance),
                expect.any(Object)
            );
        });

    });
});