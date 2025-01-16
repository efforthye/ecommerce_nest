import { PrismaClient } from "@prisma/client";

let prisma: PrismaClient;

beforeAll(async () => {
  prisma = new PrismaClient();
  await prisma.$connect();
  global.__PRISMA_CLIENT__ = prisma;
  if (!prisma) {
    throw new Error('Prisma client is not initialized');
  }
});

beforeEach(async () => {
  try {
    await prisma.$transaction([
      prisma.payment.deleteMany(),
      prisma.orderItem.deleteMany(),
      prisma.order.deleteMany(),
      prisma.userCart.deleteMany(),
      prisma.productImage.deleteMany(),
      prisma.productVariant.deleteMany(),
      prisma.product.deleteMany(),
      prisma.balanceHistory.deleteMany(),
      prisma.userBalance.deleteMany(),
      prisma.userCoupon.deleteMany(),
      prisma.fcfsCoupon.deleteMany(),
      prisma.coupon.deleteMany(),
      prisma.userAccount.deleteMany(),
    ]);
  } catch (error) {
    console.error('Failed to clean up database:', error);
    throw error;
  }
});

afterAll(async () => {
  if (prisma) {
    await prisma.$disconnect();
  }
});