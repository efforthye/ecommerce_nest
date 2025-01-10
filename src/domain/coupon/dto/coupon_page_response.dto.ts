import { FcfsCoupon } from '@prisma/client';

export class CouponPageResponse {
    items: FcfsCoupon[];
    total: number;
    page: number;
    limit: number;
    
    constructor(items: FcfsCoupon[], total: number, page: number, limit: number) {
        this.items = items;
        this.total = total;
        this.page = page;
        this.limit = limit;
    }
}