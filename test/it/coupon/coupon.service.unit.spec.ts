// test/it/coupon/coupon.service.unit.spec.ts
import { Test } from '@nestjs/testing';
import { CouponService } from 'src/domain/coupon/service/coupon.service';
import { CouponRepository } from 'src/domain/coupon/repository/coupon.repository';
import { COUPON_REPOSITORY } from 'src/common/constants/repository.constants';
import { PaginationDto } from 'src/domain/coupon/dto/pagination.dto';
import { NotFoundException } from '@nestjs/common';
import { getPrismaClient } from '../util';

describe('선착순 쿠폰 서비스 테스트', () => {
    let couponService: CouponService;
    let mockCouponRepository: jest.Mocked<CouponRepository>;
    const prisma = getPrismaClient();

    beforeEach(async () => {
        // 각 테스트 전에 Repository mock 초기화
        mockCouponRepository = {
            findAvailableFcfsCoupons: jest.fn(),
            findFcfsCouponById: jest.fn(),
        };

        // 테스트 모듈 설정
        const moduleRef = await Test.createTestingModule({
            providers: [
                {
                    provide: COUPON_REPOSITORY,
                    useValue: mockCouponRepository
                },
                CouponService
            ],
        }).compile();

        couponService = moduleRef.get<CouponService>(CouponService);

        // mock 반환값 초기화
        mockCouponRepository.findAvailableFcfsCoupons.mockReset();
        mockCouponRepository.findFcfsCouponById.mockReset();
    });

    afterEach(() => {
        // 각 테스트 후에 mock이 예상한 횟수만큼만 호출되었는지 검증
        expect(mockCouponRepository.findAvailableFcfsCoupons).toHaveBeenCalledTimes(
            mockCouponRepository.findAvailableFcfsCoupons.mock.calls.length
        );
        expect(mockCouponRepository.findFcfsCouponById).toHaveBeenCalledTimes(
            mockCouponRepository.findFcfsCouponById.mock.calls.length
        );

        // mock 함수들 초기화
        jest.clearAllMocks();
    });

    afterAll(async () => {
        await prisma.$disconnect();
    });

    describe('사용 가능한 선착순 쿠폰 목록 조회 (getAvailableFcfsCoupons)', () => {
        it('사용 가능한 쿠폰이 있을 경우 - 페이징된 쿠폰 목록과 총 개수를 반환한다', async () => {
            // given
            const pagination = new PaginationDto();
            pagination.page = 1;
            pagination.limit = 10;

            const expectedCoupon = {
                id: 1,
                couponId: 1,
                coupon: {
                    id: 1,
                    name: '신규가입 할인 쿠폰',
                    type: 'PERCENTAGE',
                    amount: 10.00,
                    minOrderAmount: 10000,
                    validDays: 30,
                    isFcfs: true,
                    createdAt: new Date('2024-01-01')
                },
                totalQuantity: 100,
                stockQuantity: 45,
                startDate: new Date('2024-01-01'),
                endDate: new Date('2024-01-31'),
                createdAt: new Date('2024-01-01')
            };
            
            const totalCount = 1;
            mockCouponRepository.findAvailableFcfsCoupons.mockResolvedValue([[expectedCoupon], totalCount]);

            // when
            const result = await couponService.getAvailableFcfsCoupons(pagination);

            // then
            // 페이징된 결과에 정확히 1개의 쿠폰이 포함되어 있는지 확인
            expect(result.items).toHaveLength(1);
            // 전체 쿠폰 개수가 정확히 1개인지 확인
            expect(result.total).toBe(totalCount);
            // 요청한 페이지 번호가 그대로 반환되는지 확인
            expect(result.page).toBe(1);
            // 요청한 페이지 크기가 그대로 반환되는지 확인
            expect(result.limit).toBe(10);
            // 반환된 쿠폰 정보가 기대하는 데이터와 정확히 일치하는지 확인
            expect(result.items[0]).toEqual(expectedCoupon);
            // Repository의 조회 메서드가 페이징 정보와 함께 호출되었는지 확인
            expect(mockCouponRepository.findAvailableFcfsCoupons).toHaveBeenCalledWith(pagination);
        });

        it('사용 가능한 쿠폰이 없을 경우 - 빈 배열과 총 개수 0을 반환한다', async () => {
            // given
            const pagination = new PaginationDto();
            mockCouponRepository.findAvailableFcfsCoupons.mockResolvedValue([[], 0]);

            // when
            const result = await couponService.getAvailableFcfsCoupons(pagination);

            // then
            // 쿠폰 목록이 비어있는지 확인
            expect(result.items).toHaveLength(0);
            // 전체 쿠폰 개수가 0인지 확인
            expect(result.total).toBe(0);
            // Repository 조회 메서드가 페이징 정보와 함께 호출되었는지 확인
            expect(mockCouponRepository.findAvailableFcfsCoupons).toHaveBeenCalledWith(pagination);
        });
    });

    describe('특정 선착순 쿠폰 상세 조회 (getFcfsCouponById)', () => {
        it('존재하는 쿠폰 ID인 경우 - 쿠폰 상세 정보를 반환한다', async () => {
            // given
            const expectedCoupon = {
                id: 1,
                couponId: 1,
                coupon: {
                    id: 1,
                    name: '신규가입 할인 쿠폰',
                    type: 'PERCENTAGE',
                    amount: 10.00,
                    minOrderAmount: 10000,
                    validDays: 30,
                    isFcfs: true,
                    createdAt: new Date('2024-01-01')
                },
                totalQuantity: 100,
                stockQuantity: 45,
                startDate: new Date('2024-01-01'),
                endDate: new Date('2024-01-31'),
                createdAt: new Date('2024-01-01')
            };
            mockCouponRepository.findFcfsCouponById.mockResolvedValue(expectedCoupon);

            // when
            const result = await couponService.getFcfsCouponById(1);

            // then
            // 반환된 쿠폰 정보가 기대하는 데이터와 정확히 일치하는지 확인
            expect(result).toEqual(expectedCoupon);
            // Repository 조회 메서드가 정확한 ID와 함께 호출되었는지 확인
            expect(mockCouponRepository.findFcfsCouponById).toHaveBeenCalledWith(1);
        });

        it('존재하지 않는 쿠폰 ID인 경우 - NotFoundException을 발생시킨다', async () => {
            // given
            const nonExistentCouponId = 999;
            mockCouponRepository.findFcfsCouponById.mockResolvedValue(null);

            // when & then
            // 존재하지 않는 쿠폰 조회시 NotFoundException이 발생하는지 확인
            await expect(couponService.getFcfsCouponById(nonExistentCouponId))
                .rejects
                .toThrow(NotFoundException);
            // Repository 조회 메서드가 존재하지 않는 ID와 함께 호출되었는지 확인
            expect(mockCouponRepository.findFcfsCouponById).toHaveBeenCalledWith(nonExistentCouponId);
        });
    });
});