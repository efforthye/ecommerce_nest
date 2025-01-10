import { Product } from '@prisma/client';

export class ProductPageResponse {
    items: Product[];
    total: number;
    page: number;
    limit: number;
    
    constructor(items: Product[], total: number, page: number, limit: number) {
        this.items = items;
        this.total = total;
        this.page = page;
        this.limit = limit;
    }
}