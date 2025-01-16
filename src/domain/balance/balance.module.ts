import { Module } from '@nestjs/common';
import { BalanceService } from './service/balance.service';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { BalanceController } from 'src/interfaces/controllers/balance/balance.controller';
import { BALANCE_REPOSITORY } from 'src/common/constants/app.constants';
import { BalanceRepositoryPrisma } from './repository/balance.repository.prisma';

@Module({
    controllers: [BalanceController],
    providers: [
        BalanceService, 
        PrismaService,
        { provide: BALANCE_REPOSITORY, useClass: BalanceRepositoryPrisma }
    ],
    exports: [BalanceService, BALANCE_REPOSITORY]
})
export class BalanceModule {}
