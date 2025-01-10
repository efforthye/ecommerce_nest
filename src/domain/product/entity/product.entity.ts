
/**
 * 프리즈마에서 자동으로 주긴 하는데 일단 명시해두는게 좋을거 같아서 추가함
 */
export interface Product {
    id: number;
    name: string;
    basePrice: number;
    description: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface ProductVariant {
    id: number;
    productId: number;
    optionName: string;
    stockQuantity: number;
    price: number;
    createdAt: Date;
    updatedAt: Date;
}

export interface ProductImage {
    id: number;
    productId: number;
    imageUrl: string;
    sequence: number;
    createdAt: Date;
    updatedAt: Date;
}