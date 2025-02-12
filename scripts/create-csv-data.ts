// ts-node scripts/create-csv-data.ts
import { PrismaClient, OrderStatus, Prisma } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();
const CHUNK_SIZE = 1000000; // 1000000
const TOTAL_USERS = 1000000;
const TOTAL_PRODUCTS = 12000;
const TOTAL_ORDERS = 50000000;

async function generateData() {
    try {
        console.log('데이터 파일 생성 시작...');

        // UserAccount 생성
        const users: { name: string; email: string }[] = [];
        for(let i = 1; i <= TOTAL_USERS; i++) {
            console.log(`UserAccount 생성중: ${i}`);
            users.push({
                name: `User${i}`,
                email: `user${i}@example.com`
            });
        }
        console.log(`UserAccount 저장 중...`);
        await prisma.userAccount.createMany({
            data: users,
            skipDuplicates: true
        });
        console.log('UserAccount 생성 완료');

        // Product 및 ProductVariant 생성
        const products: { name: string; basePrice: Prisma.Decimal; description: string; isActive: boolean }[] = [];
        for(let i = 1; i <= TOTAL_PRODUCTS; i++) {
            console.log(`Product, ProductVariant 생성중: ${i}`);
            products.push({
                name: `Product${i}`,
                basePrice: new Prisma.Decimal(Math.floor(Math.random() * 50000) + 10000),
                description: `Description for product ${i}`,
                isActive: true
            });
        }
        
        const createdProducts = await prisma.$transaction(
            products.map(product => 
                prisma.product.create({
                    data: product
                })
            )
        );
        console.log('Product 생성 완료');

        // ProductVariant 생성
        const variants: { productId: number; optionName: string; stockQuantity: number; price: Prisma.Decimal }[] = [];
        for(const product of createdProducts) {
            const variantCount = Math.floor(Math.random() * 2) + 2; // 2-3개
            for(let j = 1; j <= variantCount; j++) {
                variants.push({
                    productId: product.id,
                    optionName: `Option${j}`,
                    stockQuantity: 1000,
                    price: new Prisma.Decimal(Math.floor(Math.random() * 50000) + 10000)
                });
            }
        }
        
        await prisma.productVariant.createMany({
            data: variants,
            skipDuplicates: true
        });
        console.log('ProductVariant 생성 완료');

        // Orders CSV 생성
        const savedUsers = await prisma.userAccount.findMany({ select: { id: true }});
        const savedProducts = await prisma.product.findMany({
            select: { 
                id: true,
                variants: {
                    select: { id: true, price: true }
                }
            },
            where: { isActive: true }
        });

        let processedCount = 0;
        const orders: { userId: number; totalAmount: number; discountAmount: number; finalAmount: number; status: OrderStatus; orderedAt: string; paidAt: string }[] = [];
        const orderItems: { orderId: number; productId: number; optionVariantId: number; quantity: number; unitPrice: Prisma.Decimal; totalPrice: Prisma.Decimal; createdAt: string }[] = [];

        while (processedCount < TOTAL_ORDERS) {
            const currentChunkSize = Math.min(CHUNK_SIZE, TOTAL_ORDERS - processedCount);

            for (let i = 0; i < currentChunkSize; i++) {
                // console.log(`Order 생성중: ${i}`);
                const orderId = processedCount + i + 1;
                const user = savedUsers[Math.floor(Math.random() * savedUsers.length)];
                const product = savedProducts[Math.floor(Math.random() * savedProducts.length)];
                const variant = product.variants[Math.floor(Math.random() * product.variants.length)];
                const quantity = Math.floor(Math.random() * 5) + 1;
                
                const startDate = new Date('2025-01-01').getTime();
                const endDate = new Date('2025-02-12').getTime();
                const randomDate = new Date(startDate + Math.random() * (endDate - startDate));
                const date = randomDate.toISOString(); // ISO 형식으로 변환

                const totalAmount = Number(variant.price) * quantity;
                const discountAmount = Math.random() < 0.3 ? Math.floor(totalAmount * 0.1) : 0;
                const finalAmount = totalAmount - discountAmount;
                const status = Math.random() < 0.8 ? OrderStatus.PAID : OrderStatus.PENDING;

                orders.push({
                    userId: user.id,
                    totalAmount,
                    discountAmount,
                    finalAmount,
                    status,
                    orderedAt: date,
                    paidAt: date
                });

                orderItems.push({
                    orderId,
                    productId: product.id,
                    optionVariantId: variant.id,
                    quantity,
                    unitPrice: variant.price,
                    totalPrice: new Prisma.Decimal(totalAmount),
                    createdAt: date
                });
            }

            // 100만 개씩 데이터를 처리
            if (orders.length >= CHUNK_SIZE) {
                console.log(`${CHUNK_SIZE}개 저장 시작`);
                await prisma.$transaction([
                    prisma.order.createMany({
                        data: orders.splice(0, CHUNK_SIZE)
                    }),
                    prisma.orderItem.createMany({
                        data: orderItems.splice(0, CHUNK_SIZE)
                    })
                ]);
                console.log(`${CHUNK_SIZE}개 저장 완료`);
            }

            processedCount += currentChunkSize;
            console.log(`Progress: ${(processedCount / TOTAL_ORDERS * 100).toFixed(2)}%`);
        }

        // 남은 데이터가 있다면 저장
        if (orders.length > 0) {
            await prisma.$transaction([
                prisma.order.createMany({
                    data: orders
                }),
                prisma.orderItem.createMany({
                    data: orderItems
                })
            ]);
            console.log('남은 데이터 저장 완료');
        }


        console.log('주문 데이터 DB에 삽입 완료');
        await prisma.$disconnect();
    } catch (error) {
        console.log({error});
    }
}

generateData().catch(e => {
    console.error(e);
    process.exit(1);
});


async function testConnection() {
    const prisma = new PrismaClient({
        log: ['query', 'info', 'warn', 'error'],
    });

    try {
        console.log('Attempting to connect to database...');
        // Test the connection
        const users = await prisma.userAccount.count();
        console.log('Connection successful');
        console.log(`Total users in database: ${users}`);
        
        // Test products
        const products = await prisma.product.count();
        console.log(`Total products in database: ${products}`);
        
        await prisma.$disconnect();
    } catch (error) {
        console.error('Database connection error:', {
            message: error.message,
            code: error.code,
            meta: error.meta,
            clientVersion: error.clientVersion
        });
    }
}

testConnection();