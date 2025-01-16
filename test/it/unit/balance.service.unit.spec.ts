import { Test, TestingModule } from '@nestjs/testing';
import { BalanceService } from '../../../src/domain/balance/service/balance.service';
import { PrismaService } from '../../../src/infrastructure/database/prisma.service';
import { BalanceRepository } from '../../../src/domain/balance/repository/balance.repository';
import { BALANCE_REPOSITORY } from '../../../src/common/constants/app.constants';
import { UserBalance, BalanceType, Prisma } from '@prisma/client';
import { REQUEST } from '@nestjs/core';
import { BalanceRepositoryPrisma } from 'src/domain/balance/repository/balance.repository.prisma';

describe('잔액 서비스 테스트', () => {
    let moduleRef: TestingModule;
    let balanceService: BalanceService;
    let prisma: PrismaService;
    let balanceRepository: BalanceRepository;

    const mockRequest = {
        prismaTransaction: undefined
    };

    beforeAll(async () => {
        moduleRef = await Test.createTestingModule({
            providers: [
                    BalanceService,
                    PrismaService,
                {
                    provide: BALANCE_REPOSITORY,
                    useClass: BalanceRepositoryPrisma,
                },
                {
                    provide: REQUEST,
                    useValue: mockRequest,
                },
            ],
        }).compile();

        // get() 대신 resolve() 사용 (스코프 프로바이더)
        balanceService = await moduleRef.resolve<BalanceService>(BalanceService);
        prisma = moduleRef.get<PrismaService>(PrismaService);
        balanceRepository = moduleRef.get<BalanceRepository>(BALANCE_REPOSITORY);
    });

    afterEach(async () => {
        await prisma.$transaction([
            prisma.balanceHistory.deleteMany(),
            prisma.userBalance.deleteMany(),
            prisma.payment.deleteMany(),
            prisma.orderItem.deleteMany(),
            prisma.order.deleteMany(),
            prisma.userAccount.deleteMany(),
        ]);
    });

    afterAll(async () => {
        await moduleRef.close();
    });

    describe('잔액 충전 (chargeBalance)', () => {
        it('잔액 충전 시 - 트랜잭션 내에서 잔액 업데이트와 이력을 생성한다', async () => {
            // given
            const userId = 1;
            const chargeAmount = 50000;
            const mockUpdatedBalance: UserBalance = {
                id: 1,
                userId,
                balance: new Prisma.Decimal(chargeAmount),
                updatedAt: new Date(),
            };

            jest.spyOn(balanceRepository, 'chargeBalance').mockResolvedValue(mockUpdatedBalance);

            // when
            const result = await balanceService.chargeBalance(userId, chargeAmount);

            // then
            expect(result).toBeDefined();
            expect(Number(result.balance)).toBe(chargeAmount);
        });
    });
});