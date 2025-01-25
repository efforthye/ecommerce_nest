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
    let userId: number;

    const mockRequest = {
        prismaTransaction: undefined
    };

    beforeEach(async () => {
        // 각 테스트 전에 기존 데이터 삭제
        await prisma.balanceHistory.deleteMany();
        await prisma.userBalance.deleteMany();
        await prisma.userAccount.deleteMany();
        
        // 랜덤한 이메일로 테스트 유저 생성
        const testEmail = `test-${Date.now()}@test.com`;
        const user = await prisma.userAccount.create({
            data: { email: testEmail, name: 'Test User' }
        });
        userId = user.id;
    });

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

        const user = await prisma.userAccount.create({
            data: { email: 'test@test.com', name: 'Test User' }
        });
        userId = user.id;
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
});