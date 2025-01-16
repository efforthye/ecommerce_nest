import { UserCart } from '@prisma/client';

export interface CartRepository {
    findByUserId(userId: number): Promise<UserCart[]>;
    create(userId: number, productId: number, variantId: number, quantity: number): Promise<UserCart>;
    update(id: number, quantity: number): Promise<UserCart>;
    delete(id: number): Promise<void>;
    findById(id: number): Promise<UserCart | null>;
}