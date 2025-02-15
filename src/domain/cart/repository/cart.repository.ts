import { CartItem } from '../types/cart.types';

export interface CartRepository {
    findByUserId(userId: number): Promise<CartItem[]>;
    findById(id: number): Promise<CartItem | null>;
    create(userId: number, productId: number, variantId: number, quantity: number): Promise<CartItem>;
    update(id: number, quantity: number): Promise<CartItem>;
    delete(id: number): Promise<void>;
}