import { Injectable } from '@nestjs/common';
import { Payment } from '@prisma/client';

@Injectable()
export class PaymentStatisticsService {
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
        
        // 임시로 콘솔에 통계 출력
        console.log('Payment Statistics Updated:', this.statistics);
    }

    getStatistics() {
        return this.statistics;
    }
}