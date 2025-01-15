import { Module } from '@nestjs/common';
import { BalanceService } from './service/balance.service';
import { BalanceRepository } from './repository/balance.repository';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { BalanceController } from 'src/interfaces/controllers/balance/balance.controller';
import { BalanceRepositoryImpl } from 'src/infrastructure/repositories/balance/balance.repository.impl';
import { BALANCE_REPOSITORY } from 'src/common/constants/app.constants';

@Module({
    controllers: [BalanceController],
    providers: [
        BalanceService, 
        PrismaService,
        { provide: BALANCE_REPOSITORY, useClass: BalanceRepositoryImpl }
    ],
    exports: [BalanceService, BALANCE_REPOSITORY]
})
export class BalanceModule {}
