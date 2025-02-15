import { Module } from '@nestjs/common';
import { BalanceService } from './service/balance.service';
import { BalanceController } from 'src/interfaces/controllers/balance/balance.controller';
import { BALANCE_REPOSITORY } from 'src/common/constants/app.constants';
import { BalanceRepositoryPrisma } from './repository/balance.repository.prisma';
import { DatabaseModule } from 'src/infrastructure/database/database.module';
import { EventEmitterModule } from '@nestjs/event-emitter';

@Module({
    imports: [
        DatabaseModule,
        EventEmitterModule.forRoot()
    ],
    controllers: [BalanceController],
    providers: [
        BalanceService,
        BalanceRepositoryPrisma,
        { provide: BALANCE_REPOSITORY, useClass: BalanceRepositoryPrisma }
    ],
    exports: [BalanceService, BALANCE_REPOSITORY, BalanceRepositoryPrisma]
})
export class BalanceModule {}
