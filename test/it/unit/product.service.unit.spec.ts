import { Test } from '@nestjs/testing';
import { ProductService } from 'src/domain/product/service/product.service';
import { ProductRepository } from 'src/domain/product/repository/product.repository';
import { PRODUCT_REPOSITORY } from 'src/common/constants/app.constants';
import { NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

describe('상품 서비스 테스트', () => {
    let productService: ProductService;
    let mockProductRepository: jest.Mocked<ProductRepository>;

    beforeEach(async () => {
        // 각 테스트 전에 Repository mock 초기화
        mockProductRepository = {
            findPopularProducts: jest.fn(),
            findById: jest.fn(),
            findVariantById: jest.fn(),
            decreaseVariantStock: jest.fn(),
        };

        // 테스트 모듈 설정
        const moduleRef = await Test.createTestingModule({
            providers: [
                {
                    provide: PRODUCT_REPOSITORY,
                    useValue: mockProductRepository
                },
                ProductService
            ],
        }).compile();

        productService = moduleRef.get<ProductService>(ProductService);
    });

    afterEach(() => {
        // mock 함수들 초기화
        jest.clearAllMocks();
    });

    describe('인기 상품 조회 (getPopularProducts)', () => {
        it('인기 상품 목록이 있는 경우 - 상품 목록을 반환한다', async () => {
            // given
            const limit = 10;
            const mockProducts = [{
                id: 1,
                name: '인기 상품 1',
                basePrice: new Prisma.Decimal(10000),
                description: '상품 설명',
                isActive: true,
                productImages: [{
                    id: 1,
                    productId: 1,
                    productVariantId: null,
                    imageUrl: 'https://example.com/image1.jpg',
                    sequence: 1,
                    createdAt: new Date('2025-01-01'),
                    updatedAt: new Date('2025-01-01')
                }],
                variants: [{
                    id: 1,
                    productId: 1,
                    optionName: '기본',
                    stockQuantity: 100,
                    price: new Prisma.Decimal(10000),
                    createdAt: new Date('2025-01-01'),
                    updatedAt: new Date('2025-01-01')
                }],
                createdAt: new Date('2025-01-01'),
                updatedAt: new Date('2025-01-01')
            }];

            mockProductRepository.findPopularProducts.mockResolvedValue(mockProducts);

            // when
            const result = await productService.getPopularProducts(limit);

            // then
            expect(result).toHaveLength(1);
            expect(result[0].id).toBe(1);
            expect(result[0].basePrice).toBe(10000);
            expect(result[0].productImages).toHaveLength(1);
            expect(result[0].variants).toHaveLength(1);
            expect(mockProductRepository.findPopularProducts).toHaveBeenCalledWith(limit);
        });

        it('인기 상품이 없는 경우 - 빈 배열을 반환한다', async () => {
            // given
            const limit = 10;
            mockProductRepository.findPopularProducts.mockResolvedValue([]);

            // when
            const result = await productService.getPopularProducts(limit);

            // then
            expect(result).toHaveLength(0);
            expect(mockProductRepository.findPopularProducts).toHaveBeenCalledWith(limit);
        });
    });

    describe('상품 상세 조회 (getProductById)', () => {
        it('존재하는 상품 ID인 경우 - 상품 상세 정보를 반환한다', async () => {
            // given
            const productId = 1;
            const mockProduct = {
                id: productId,
                name: '테스트 상품',
                basePrice: new Prisma.Decimal(10000),
                description: '상품 설명',
                isActive: true,
                productImages: [{
                    id: 1,
                    productId: 1,
                    productVariantId: null,
                    imageUrl: 'https://example.com/image1.jpg',
                    sequence: 1,
                    createdAt: new Date('2025-01-01'),
                    updatedAt: new Date('2025-01-01')
                }],
                variants: [{
                    id: 1,
                    productId: 1,
                    optionName: '기본',
                    stockQuantity: 100,
                    price: new Prisma.Decimal(10000),
                    createdAt: new Date('2025-01-01'),
                    updatedAt: new Date('2025-01-01')
                }],
                createdAt: new Date('2025-01-01'),
                updatedAt: new Date('2025-01-01')
            };

            mockProductRepository.findById.mockResolvedValue(mockProduct);

            // when
            const result = await productService.getProductById(productId);

            // then
            expect(result.id).toBe(productId);
            expect(result.basePrice).toBe(10000);
            expect(result.productImages).toHaveLength(1);
            expect(result.variants).toHaveLength(1);
            expect(mockProductRepository.findById).toHaveBeenCalledWith(productId);
        });

        it('존재하지 않는 상품 ID인 경우 - NotFoundException을 발생시킨다', async () => {
            // given
            const nonExistentProductId = 999;
            mockProductRepository.findById.mockResolvedValue(null);

            // when & then
            await expect(productService.getProductById(nonExistentProductId))
                .rejects
                .toThrow(NotFoundException);
            expect(mockProductRepository.findById).toHaveBeenCalledWith(nonExistentProductId);
        });
    });
});