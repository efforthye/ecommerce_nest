import { Test, TestingModule } from '@nestjs/testing';
import { BalanceService } from 'src/domain/balance/service/balance.service';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { BALANCE_REPOSITORY } from 'src/common/constants/app.constants';
import { BalanceRepositoryPrisma } from 'src/domain/balance/repository/balance.repository.prisma';

describe('잔액 서비스 동시성 통합 테스트', () => {
    let app: INestApplication;
    let balanceService: BalanceService;
    let prisma: PrismaClient;
    let module: TestingModule;

    beforeAll(async () => {
        prisma = global.__PRISMA_CLIENT__;
        if (!prisma) {
            throw new Error('Prisma client is not initialized');
        }

        module = await Test.createTestingModule({
            providers: [
                BalanceService,
                {
                    provide: BALANCE_REPOSITORY,
                    useClass: BalanceRepositoryPrisma,
                },
                {
                    provide: PrismaService,
                    useValue: prisma,
                },
            ],
        }).compile();

        app = module.createNestApplication();
        await app.init();

        balanceService = await module.resolve(BalanceService);
    });

    beforeEach(async () => {
        try {
            // 테스트 데이터 초기화
            await prisma.$transaction([
                prisma.balanceHistory.deleteMany(),
                prisma.userBalance.deleteMany(),
                prisma.userAccount.deleteMany(),
            ]);

            // 테스트용 사용자 생성
            const user = await prisma.userAccount.create({
                data: {
                    id: 1,
                    name: '테스트유저',
                    email: 'test@test.com',
                },
            });

            // 잔액 생성
            const userBalance = await prisma.userBalance.create({
                data: {
                    userId: user.id,
                    balance: 10000,
                },
            });

            // 잔액 이력 생성
            await prisma.balanceHistory.create({
                data: {
                    userBalanceId: userBalance.id,
                    type: 'CHARGE',
                    amount: 10000,
                    afterBalance: 10000,
                },
            });
        } catch (error) {
            console.error('Failed to initialize test data:', error);
            throw error;
        }
    });

    afterAll(async () => {
        await app.close();
        if (module) {
            await module.close();
        }
    });

    describe('동시성 테스트 - 잔액 충전/차감', () => {
        it('여러 건의 동시 충전 요청이 모두 정상 처리된다', async () => {
            // given
            const userId = 1;
            const chargeAmount = 1000;
            const numberOfRequests = 5;

            // when: 동시에 여러 요청 실행
            const requests = Array(numberOfRequests).fill(null).map(() => 
                request(app.getHttpServer())
                    .post(`/balance/${userId}/charge`)
                    .set('x-bypass-token', 'happy-world-token')
                    .send({ amount: chargeAmount })
            );

            // then
            const responses = await Promise.all(requests);
            const successCount = responses.filter(res => res.status === 200).length;

            expect(successCount).toBe(numberOfRequests);

            const finalBalance = await balanceService.getBalance(userId);
            expect(finalBalance?.balance.toNumber()).toBe(10000 + (chargeAmount * numberOfRequests));
        });

        it('동시 차감 요청 시 잔액이 부족하면 실패한다', async () => {
            // given
            const userId = 1;
            const initialCharge = 5000;

            // 초기 잔액 설정
            await request(app.getHttpServer())
                .post(`/balance/${userId}/charge`)
                .set('x-bypass-token', 'happy-world-token')
                .send({ amount: initialCharge });

            const useAmount = 2000;
            const numberOfRequests = 3; // 총 차감 시도액: 6000

            // when: 동시에 여러 차감 요청
            const requests = Array(numberOfRequests).fill(null).map(() =>
                request(app.getHttpServer())
                    .post(`/balance/${userId}/use`)
                    .set('x-bypass-token', 'happy-world-token')
                    .send({ amount: useAmount })
            );

            // then
            const responses = await Promise.all(requests);
            const successCount = responses.filter(res => res.status === 200).length;
            const failCount = responses.filter(res => res.status === 400).length;

            expect(successCount).toBeLessThanOrEqual(2); // 최대 2건만 성공 가능
            expect(failCount).toBeGreaterThanOrEqual(1); // 최소 1건은 실패

            const finalBalance = await balanceService.getBalance(userId);
            expect(finalBalance?.balance.toNumber()).toBeGreaterThanOrEqual(0);
        });
    });
});