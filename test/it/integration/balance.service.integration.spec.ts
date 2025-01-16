import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { BalanceModule } from 'src/domain/balance/balance.module';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { BalanceService } from 'src/domain/balance/service/balance.service';

describe('잔액 서비스 동시성 통합 테스트', () => {
    let app: INestApplication;
    let prismaService: PrismaService;
    let balanceService: BalanceService;

    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [BalanceModule],
        })
        .overrideGuard(JwtAuthGuard) // 인증 가드 오버라이드
        .useValue({
            canActivate: () => true, // 테스트에서는 항상 인증 통과
        })
        .compile();

        // resolve()를 사용하여 scoped provider를 해결
        balanceService = await moduleRef.resolve<BalanceService>(BalanceService); 
        prismaService = await moduleRef.resolve<PrismaService>(PrismaService);  // resolve()로 수정

        await prismaService.userBalance.deleteMany(); // userBalance 비우기

        app = moduleRef.createNestApplication();
        await app.init();
        
        prismaService = moduleRef.get<PrismaService>(PrismaService);
    });

    beforeEach(async () => {
        // 테스트 데이터 초기화
        await prismaService.balanceHistory.deleteMany();
        await prismaService.userBalance.deleteMany();
    });

    afterAll(async () => {
        await prismaService.$disconnect();
        await app.close();
    });

    describe('동시성 테스트 - 잔액 충전/차감', () => {
        it('여러 건의 동시 충전 요청이 모두 정상 처리된다', async () => {
            // given
            const userId = 1;
            const chargeAmount = 10000;
            const numberOfRequests = 5;

            // when: 동시에 여러 요청 실행
            const requests = Array(numberOfRequests).fill(null).map(() => 
                request(app.getHttpServer())
                    .post(`/balance/${userId}/charge`)
                    .set('x-bypass-token', 'happy-world-token')
                    .send({ amount: chargeAmount })
            );

            const responses = await Promise.all(requests);
            
            // then
            // 모든 요청이 성공했는지 확인
            responses.forEach(response => {
                expect(response.status).toBe(201);
                expect(response.body).toHaveProperty('balance');
            });

            // 최종 잔액이 정확한지 확인
            const finalBalance = await prismaService.userBalance.findUnique({
                where: { userId }
            });
            
            expect(finalBalance).not.toBeNull();
            if(finalBalance){
                expect(finalBalance.balance.toNumber()).toBe(chargeAmount * numberOfRequests);

                // 잔액 이력이 정확히 생성되었는지 확인
                const histories = await prismaService.balanceHistory.findMany({
                    where: { userBalanceId: finalBalance.id }
                });
                expect(histories).toHaveLength(numberOfRequests);
            }

        });

        it('동시 차감 요청 시 잔액이 부족하면 실패한다', async () => {
            // given
            const userId = 1;
            const initialCharge = 10000;
            const deductAmount = -3000;
            const numberOfRequests = 5; // 총 15000원 차감 시도

            // 초기 잔액 설정
            await request(app.getHttpServer())
                .post(`/balance/${userId}/charge`)
                .set('x-bypass-token', 'happy-world-token')
                .send({ amount: initialCharge });

            // when: 동시에 여러 차감 요청 실행
            const requests = Array(numberOfRequests).fill(null).map(() => 
                request(app.getHttpServer())
                    .post(`/balance/${userId}/charge`)
                    .set('x-bypass-token', 'happy-world-token')
                    .send({ amount: deductAmount })
            );

            const responses = await Promise.all(requests);
            
            // then
            // 성공한 요청 수 확인 (10000원으로 3000원씩 3번만 차감 가능)
            const successResponses = responses.filter(r => r.status === 200);
            const failedResponses = responses.filter(r => r.status === 400);
            
            expect(successResponses).toHaveLength(3);
            expect(failedResponses).toHaveLength(2);

            // 최종 잔액 확인 (1000원 남아있어야 함)
            const finalBalance = await prismaService.userBalance.findUnique({
                where: { userId }
            });
            
            expect(finalBalance).not.toBeNull();
            if(finalBalance){
                    expect(finalBalance.balance.toNumber()).toBe(1000);
            }
        });
    });
});