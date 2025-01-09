// npx ts-node prisma/seed.ts
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    // 유저 데이터 생성
    const users = await prisma.userAccount.createMany({
        data: [
            { name: '천동민', email: 'hminimi@gmail.com', createdAt: new Date(), updatedAt: new Date() },
            { name: '박혜림', email: 'efforthye@gmail.com', createdAt: new Date(), updatedAt: new Date() },
            { name: '김종협', email: 'jong@gmail.com', createdAt: new Date(), updatedAt: new Date() },
        ],
    });

    console.log('Created users:', users);

    // 쿠폰 데이터 생성
    const coupons = await prisma.coupon.createMany({
        data: [
            {
                name: '10% 할인쿠폰',
                type: 'PERCENTAGE',
                amount: 10.0,
                minOrderAmount: 5000.0,
                validDays: 30,
                isFcfs: true,
                createdAt: new Date(),
            },
            {
                name: '5000원 할인쿠폰',
                type: 'FIXED',
                amount: 5000.0,
                minOrderAmount: 10000.0,
                validDays: 15,
                isFcfs: false,
                createdAt: new Date(),
            },
        ],
    });

    console.log('Created coupons:', coupons);

    // 선착순 쿠폰 데이터 생성
    const fcfsCoupons = await prisma.fcfsCoupon.createMany({
        data: [
            {
                couponId: 1,
                totalQuantity: 100,
                stockQuantity: 100,
                startDate: new Date('2025-01-01T00:00:00Z'),
                endDate: new Date('2025-12-31T23:59:59Z'),
                createdAt: new Date(),
            },
            {
                couponId: 2,
                totalQuantity: 50,
                stockQuantity: 50,
                startDate: new Date('2025-02-01T00:00:00Z'),
                endDate: new Date('2025-06-30T23:59:59Z'),
                createdAt: new Date(),
            },
        ],
    });

    console.log('Created FCFS coupons:', fcfsCoupons);

    // 상품 데이터 생성
    const products = await prisma.product.createMany({
        data: [
            {
                name: '아이폰17pro',
                basePrice: 1000000.0,
                description: '카메라가 5개입니다.',
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
            {
                name: '맥북pro m7',
                basePrice: 1500000.0,
                description: '애플의 고성능 노트북입니다.',
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
            {
                name: '에어팟4 액티브 노이즈 캔슬링',
                basePrice: 200000.0,
                description: '고음질 무선 이어폰입니다.',
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
        ],
    });

    console.log('Created products:', products);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
