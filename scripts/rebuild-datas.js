// generate-data.js
const { PrismaClient, OrderStatus, Prisma } = require('@prisma/client');
const prisma = new PrismaClient();

const CHUNK_SIZE = 200000; // 4배 증가
const TOTAL_ORDERS = 46000000; // 남은 수량만

async function generateData() {
    try {
        console.log('주문 데이터 생성 시작...');
        console.time('Total execution');

        // 미리 유저와 상품 데이터 로드
        console.time('Data loading');
        const [savedUsers, savedProducts] = await Promise.all([
            prisma.userAccount.findMany({ select: { id: true }}),
            prisma.product.findMany({
                select: { 
                    id: true,
                    variants: {
                        select: { id: true, price: true }
                    }
                },
                where: { isActive: true }
            })
        ]);
        console.timeEnd('Data loading');
        console.log(`Loaded ${savedUsers.length} users and ${savedProducts.length} products`);

        let processedCount = 0;
        let batchNumber = 1;
        const startTime = Date.now();

        while (processedCount < TOTAL_ORDERS) {
            const currentChunkSize = Math.min(CHUNK_SIZE, TOTAL_ORDERS - processedCount);
            const orders = [];
            const orderItems = [];
            
            console.time(`Batch ${batchNumber} preparation`);
            for (let i = 0; i < currentChunkSize; i++) {
                const orderId = processedCount + i + 1;
                const user = savedUsers[Math.floor(Math.random() * savedUsers.length)];
                const product = savedProducts[Math.floor(Math.random() * savedProducts.length)];
                const variant = product.variants[Math.floor(Math.random() * product.variants.length)];
                const quantity = Math.floor(Math.random() * 5) + 1;
                
                const startDate = new Date('2025-01-01').getTime();
                const endDate = new Date('2025-02-12').getTime();
                const date = new Date(startDate + Math.random() * (endDate - startDate)).toISOString();

                const totalAmount = Number(variant.price) * quantity;
                const discountAmount = Math.random() < 0.3 ? Math.floor(totalAmount * 0.1) : 0;
                const finalAmount = totalAmount - discountAmount;

                orders.push({
                    userId: user.id,
                    totalAmount,
                    discountAmount,
                    finalAmount,
                    status: Math.random() < 0.8 ? OrderStatus.PAID : OrderStatus.PENDING,
                    orderedAt: date,
                    paidAt: date
                });

                orderItems.push({
                    orderId: orderId + 4000000, // 기존 ID 이후부터 시작
                    productId: product.id,
                    optionVariantId: variant.id,
                    quantity,
                    unitPrice: variant.price,
                    totalPrice: new Prisma.Decimal(totalAmount),
                    createdAt: date
                });
            }
            console.timeEnd(`Batch ${batchNumber} preparation`);

            // DB 저장
            console.time(`Batch ${batchNumber} DB save`);
            await prisma.$transaction([
                prisma.order.createMany({
                    data: orders,
                    skipDuplicates: true
                }),
                prisma.orderItem.createMany({
                    data: orderItems,
                    skipDuplicates: true
                })
            ]);
            console.timeEnd(`Batch ${batchNumber} DB save`);

            processedCount += currentChunkSize;
            const elapsedSeconds = (Date.now() - startTime) / 1000;
            const recordsPerSecond = Math.floor(processedCount / elapsedSeconds);
            
            console.log(`Progress: ${(processedCount / TOTAL_ORDERS * 100).toFixed(2)}%`);
            console.log(`Speed: ${recordsPerSecond.toLocaleString()} records/second`);
            console.log(`Estimated time remaining: ${((TOTAL_ORDERS - processedCount) / recordsPerSecond / 60).toFixed(2)} minutes`);
            console.log('-------------------');

            batchNumber++;
        }

        console.timeEnd('Total execution');
        await prisma.$disconnect();
        
    } catch (error) {
        console.error('Error:', error);
        await prisma.$disconnect();
        process.exit(1);
    }
}

generateData();