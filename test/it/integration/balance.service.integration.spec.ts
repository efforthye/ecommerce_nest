import { Test, TestingModule } from '@nestjs/testing';
import { BALANCE_REPOSITORY } from 'src/common/constants/app.constants';
import { BalanceRepositoryPrisma } from 'src/domain/balance/repository/balance.repository.prisma';
import { BalanceService } from 'src/domain/balance/service/balance.service';
import { PrismaService } from 'src/infrastructure/database/prisma.service';

describe('잔액 서비스 동시성 통합 테스트', () => {
    let module: TestingModule;
    let balanceService: BalanceService;
    let prismaService: PrismaService;

    beforeAll(async () => {
        module = await Test.createTestingModule({
            providers: [
                BalanceService,
                {
                    provide: BALANCE_REPOSITORY,
                    useClass: BalanceRepositoryPrisma
                },
                PrismaService
            ],
        }).compile();

        balanceService = module.get<BalanceService>(BalanceService);
        prismaService = module.get<PrismaService>(PrismaService);
    });

    beforeEach(async () => {
        await prismaService.balanceHistory.deleteMany();
        await prismaService.userBalance.deleteMany();
        await prismaService.userAccount.deleteMany();

        await prismaService.userAccount.create({
            data: {
                id: 1,
                name: '테스트유저',
                email: 'test@test.com',
                userBalance: {
                    create: {
                        balance: 10000
                    }
                }
            }
        });
    });

    afterAll(async () => {
        await module.close();
    });

    describe('동시성 테스트 - 잔액 충전/차감', () => {
        it('여러 건의 동시 충전 요청이 모두 정상 처리된다', async () => {
            const userId = 1;
            const chargeAmount = 1000;
            const numberOfRequests = 5;

            const promises = Array(numberOfRequests).fill(null).map(() =>
                balanceService.chargeBalance(userId, chargeAmount)
            );

            await Promise.all(promises);

            const finalBalance = await balanceService.getBalance(userId);
            expect(finalBalance?.balance.toNumber()).toBe(10000 + (chargeAmount * numberOfRequests));
        });

        it('동시 차감 요청 시 잔액이 부족하면 실패한다', async () => {
            const userId = 1;
            const useAmount = 6000; 
            const numberOfRequests = 3;

            const promises = Array(numberOfRequests).fill(null).map(() =>
                balanceService.deductBalance(userId, useAmount).catch(e => e)
            );

            const results = await Promise.all(promises);
            const successCount = results.filter(r => !(r instanceof Error)).length;
            const failCount = results.filter(r => r instanceof Error).length;

            expect(successCount).toBeLessThanOrEqual(1);
            expect(failCount).toBeGreaterThanOrEqual(2);

            const finalBalance = await balanceService.getBalance(userId);
            expect(finalBalance?.balance.toNumber()).toBeGreaterThanOrEqual(0);
        });
    });
});