import { Injectable } from '@nestjs/common';
import { Order } from '@prisma/client';

@Injectable()
export class DataPlatform {
    sendOrderData(order: Order): true {
        return true;
    }
}