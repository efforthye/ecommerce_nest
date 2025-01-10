import { Test } from '@nestjs/testing';
import { ProductService } from 'src/domain/product/service/product.service';
import { ProductRepository } from 'src/domain/product/repository/product.repository';
import { PRODUCT_REPOSITORY } from 'src/common/constants/repository.constants';
import { NotFoundException } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';

describe('상품 서비스 통합 테스트', () => {
    let productService: ProductService;
    let mockProductRepository: jest.Mocked<ProductRepository>;

    beforeEach(async () => {
        // Repository의 모든 메서드를 Mock으로 생성
        mockProductRepository = {
            findPopularProducts: jest.fn(),
            findById: jest.fn(),
            findVariantById: jest.fn(),
            decreaseVariantStock: jest.fn()
        };

        // 테스트 모듈 설정
        const moduleRef = await Test.createTestingModule({
            providers: [
                {
                    provide: PRODUCT_REPOSITORY,
                    useValue: mockProductRepository,
                },
                ProductService,
            ],
        }).compile();

        productService = moduleRef.get<ProductService>(ProductService);
    });

    afterEach(() => {
        // mock 함수들 초기화
        jest.clearAllMocks();
    });

    describe('인기 상품 조회 (getPopularProducts)', () => {
        let now: Date;
        
        beforeEach(() => {
            // 테스트에서 사용할 현재 시간을 2025-01-10로 고정
            now = new Date('2025-01-10T00:00:00Z');
            jest.useFakeTimers();
            jest.setSystemTime(now);
        });

        afterEach(() => {
            // 테스트 종료 후 시스템 시간을 원래대로 복구
            jest.useRealTimers();
        });

        it('인기 상품 목록이 정상적으로 조회된다', async () => {
            // given
            const mockProducts = [
                {
                    id: 1,
                    name: '인기 상품 1',
                    basePrice: new Decimal(10000),
                    description: '인기 상품 1 설명',
                    isActive: true,
                    productImages: [
                        {
                            id: 1,
                            productId: 1,
                            productVariantId: null,
                            imageUrl: 'http://example.com/image1.jpg',
                            sequence: 1,
                            createdAt: now,
                            updatedAt: now
                        }
                    ],
                    variants: [
                        {
                            id: 1,
                            productId: 1,
                            optionName: '기본',
                            stockQuantity: 100,
                            price: new Decimal(10000),
                            createdAt: now,
                            updatedAt: now
                        }
                    ],
                    createdAt: now,
                    updatedAt: now
                }
            ];

            // Mock 설정
            mockProductRepository.findPopularProducts.mockResolvedValue(mockProducts);

            // when
            const result = await productService.getPopularProducts(10);

            // then
            expect(result).toHaveLength(1);
            expect(result[0]).toEqual({
                id: 1,
                name: '인기 상품 1',
                basePrice: 10000,  // Decimal이 number로 변환됨
                description: '인기 상품 1 설명',
                isActive: true,
                productImages: [
                    {
                        id: 1,
                        productId: 1,
                        productVariantId: null,
                        imageUrl: 'http://example.com/image1.jpg',
                        sequence: 1,
                        createdAt: now,
                        updatedAt: now
                    }
                ],
                variants: [
                    {
                        id: 1,
                        productId: 1,
                        optionName: '기본',
                        stockQuantity: 100,
                        price: 10000,  // Decimal이 number로 변환됨
                        createdAt: now,
                        updatedAt: now
                    }
                ],
                createdAt: now,
                updatedAt: now
            });
            expect(mockProductRepository.findPopularProducts).toHaveBeenCalledWith(10);
        });

        it('인기 상품이 없는 경우 빈 배열을 반환한다', async () => {
            // given
            mockProductRepository.findPopularProducts.mockResolvedValue([]);

            // when
            const result = await productService.getPopularProducts(10);

            // then
            expect(result).toHaveLength(0);
            expect(mockProductRepository.findPopularProducts).toHaveBeenCalledWith(10);
        });
    });

    describe('상품 상세 조회 (getProductById)', () => {
        let now: Date;
        
        beforeEach(() => {
            now = new Date('2025-01-10T00:00:00Z');
            jest.useFakeTimers();
            jest.setSystemTime(now);
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        it('존재하는 상품 ID로 조회시 상품 정보가 정상적으로 반환된다', async () => {
            // given
            const productId = 1;
            const mockProduct = {
                id: productId,
                name: '테스트 상품',
                basePrice: new Decimal(15000),
                description: '테스트 상품 설명',
                isActive: true,
                productImages: [
                    {
                        id: 1,
                        productId: productId,
                        productVariantId: null,
                        imageUrl: 'http://example.com/image1.jpg',
                        sequence: 1,
                        createdAt: now,
                        updatedAt: now
                    }
                ],
                variants: [
                    {
                        id: 1,
                        productId: productId,
                        optionName: '옵션1',
                        stockQuantity: 50,
                        price: new Decimal(15000),
                        createdAt: now,
                        updatedAt: now
                    }
                ],
                createdAt: now,
                updatedAt: now
            };

            // Mock 설정
            mockProductRepository.findById.mockResolvedValue(mockProduct);

            // when
            const result = await productService.getProductById(productId);

            // then
            expect(result).toEqual({
                id: productId,
                name: '테스트 상품',
                basePrice: 15000,  // Decimal이 number로 변환됨
                description: '테스트 상품 설명',
                isActive: true,
                productImages: [
                    {
                        id: 1,
                        productId: productId,
                        productVariantId: null,
                        imageUrl: 'http://example.com/image1.jpg',
                        sequence: 1,
                        createdAt: now,
                        updatedAt: now
                    }
                ],
                variants: [
                    {
                        id: 1,
                        productId: productId,
                        optionName: '옵션1',
                        stockQuantity: 50,
                        price: 15000,  // Decimal이 number로 변환됨
                        createdAt: now,
                        updatedAt: now
                    }
                ],
                createdAt: now,
                updatedAt: now
            });
            expect(mockProductRepository.findById).toHaveBeenCalledWith(productId);
        });

        it('존재하지 않는 상품 ID로 조회시 NotFoundException이 발생한다', async () => {
            // given
            const nonExistentProductId = 999;

            // Mock 설정
            mockProductRepository.findById.mockResolvedValue(null);

            // when & then
            await expect(productService.getProductById(nonExistentProductId))
                .rejects
                .toThrow(NotFoundException);
            
            expect(mockProductRepository.findById).toHaveBeenCalledWith(nonExistentProductId);
        });

        it('비활성화된 상품도 정상적으로 조회된다', async () => {
            // given
            const productId = 1;
            const mockProduct = {
                id: productId,
                name: '비활성 상품',
                basePrice: new Decimal(20000),
                description: '비활성 상품 설명',
                isActive: false,  // 비활성 상태
                productImages: [],
                variants: [],
                createdAt: now,
                updatedAt: now
            };

            // Mock 설정
            mockProductRepository.findById.mockResolvedValue(mockProduct);

            // when
            const result = await productService.getProductById(productId);

            // then
            expect(result.isActive).toBeFalsy();
            expect(mockProductRepository.findById).toHaveBeenCalledWith(productId);
        });
    });
});