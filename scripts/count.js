// count.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function countRecords() {
    try {
        const counts = await Promise.all([
            prisma.userAccount.count(),
            prisma.product.count(),
            prisma.productVariant.count(),
            prisma.order.count(),
            prisma.orderItem.count()
        ]);

        console.log('Current record counts:');
        console.log('UserAccount:', counts[0].toLocaleString());
        console.log('Product:', counts[1].toLocaleString());
        console.log('ProductVariant:', counts[2].toLocaleString());
        console.log('Order:', counts[3].toLocaleString());
        console.log('OrderItem:', counts[4].toLocaleString());
        console.log('-------------------');
        console.log('Total records:', counts.reduce((a, b) => a + b, 0).toLocaleString());

        await prisma.$disconnect();
    } catch (error) {
        console.error('Error:', error);
        await prisma.$disconnect();
        process.exit(1);
    }
}

countRecords();