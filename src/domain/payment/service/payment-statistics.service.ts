import { Injectable } from '@nestjs/common';
import { Payment } from '@prisma/client';
import { HttpExceptionFilter } from 'src/common/filters/http-exception.filter';
import { CustomLoggerService } from 'src/infrastructure/logging/logger.service';

@Injectable()
export class PaymentStatisticsService {
    constructor(
        private readonly logger: CustomLoggerService,
    ){
        this.logger.setTarget(HttpExceptionFilter.name);
    }

    private statistics = {
        totalPayments: 0,
        totalAmount: 0,
        successfulPayments: 0,
        cancelledPayments: 0,
        averageAmount: 0
    };

    async updateStatistics(payment: Payment): Promise<void> {
        this.statistics.totalPayments++;
        this.statistics.totalAmount += Number(payment.amount);
        
        if (payment.status === 'COMPLETED') {
            this.statistics.successfulPayments++;
        } else if (payment.status === 'CANCELLED') {
            this.statistics.cancelledPayments++;
        }

        this.statistics.averageAmount = this.statistics.totalAmount / this.statistics.successfulPayments;
        
        this.logger.log(`Payment Statistics Updated: ${this.statistics}`);
    }

    getStatistics() {
        return this.statistics;
    }
}