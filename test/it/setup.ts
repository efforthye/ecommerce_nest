import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

dotenv.config();

declare global {
  var __PRISMA_CLIENT__: PrismaClient;
}

const setup = async () => {
  try {
    // 이미 존재하는 Prisma 클라이언트가 있다면 연결 해제
    if (global.__PRISMA_CLIENT__) {
      await global.__PRISMA_CLIENT__.$disconnect();
    }

    console.log('Connecting to database with URL:', process.env.DATABASE_URL);

    // MySQL 서버 연결 확인
    try {
      await execAsync(`mysqladmin ping -h${process.env.DB_HOST} -P${process.env.DB_PORT} -u${process.env.DB_USERNAME} -p${process.env.DB_PASSWORD}`);
      console.log('MySQL server is reachable');
    } catch (error) {
      console.error('MySQL server is not reachable:', error.message);
      throw new Error('MySQL server is not running or not accessible');
    }

    // Prisma 클라이언트 초기화
    const prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL
        },
      },
      log: ['info', 'warn', 'error'],
    });

    // Prisma 연결 확인
    await prisma.$connect();
    global.__PRISMA_CLIENT__ = prisma;
    console.log('Database connected successfully');

    try {
      // import.sql 실행
      const importSql = fs.readFileSync(path.join(process.cwd(), 'test/it/import.sql'), 'utf8');
      const statements = importSql
        .split(';')
        .map(statement => statement.trim())
        .filter(statement => statement.length > 0);

      for (const statement of statements) {
        await prisma.$executeRawUnsafe(`${statement};`);
      }

      // 테스트 데이터 생성 및 결과 확인
      const testData = await createTestData(prisma);
      console.log('Test environment setup completed with data:', testData);
      return prisma;

    } catch (error) {
      console.error('Prisma error:', error);
      await prisma.$disconnect();
      throw error;
    }

  } catch (error) {
    console.error('Setup failed:', error);
    throw error;
  }
};

async function createTestData(prisma: PrismaClient) {
  return prisma.$transaction(async (tx) => {
    try {
      // 1. 기존 데이터 정리
      await tx.payment.deleteMany();
      await tx.orderItem.deleteMany();
      await tx.order.deleteMany();
      await tx.balanceHistory.deleteMany();
      await tx.userBalance.deleteMany();
      await tx.userCoupon.deleteMany();
      await tx.fcfsCoupon.deleteMany();
      await tx.coupon.deleteMany();
      await tx.userCart.deleteMany();
      await tx.productImage.deleteMany();
      await tx.productVariant.deleteMany();
      await tx.product.deleteMany();
      await tx.userAccount.deleteMany();

      // 2. 테스트용 사용자 생성
      const user = await tx.userAccount.create({
        data: {
          name: '테스트유저',
          email: 'test@test.com',
        },
      });

      if (!user) {
        throw new Error('Failed to create test user');
      }

      // 3. 잔액 정보 생성
      const balance = await tx.userBalance.create({
        data: {
          userId: user.id,
          balance: 50000,
        },
      });

      if (!balance) {
        throw new Error('Failed to create user balance');
      }

      // 4. 쿠폰 생성
      const coupon = await tx.coupon.create({
        data: {
          name: '신규가입 쿠폰',
          type: 'FIXED',
          amount: 5000,
          minOrderAmount: 10000,
          validDays: 30,
          isFcfs: true,
        },
      });

      if (!coupon) {
        throw new Error('Failed to create coupon');
      }

      // 5. 선착순 쿠폰 생성
      const fcfsCoupon = await tx.fcfsCoupon.create({
        data: {
          couponId: coupon.id,
          totalQuantity: 100,
          stockQuantity: 100,
          startDate: new Date('2025-01-01'),
          endDate: new Date('2025-12-31'),
        },
      });

      if (!fcfsCoupon) {
        throw new Error('Failed to create fcfs coupon');
      }

      // 6. 상품 생성
      const product = await tx.product.create({
        data: {
          name: '테스트 상품',
          basePrice: 15000,
          description: '테스트용 상품입니다.',
          isActive: true,
        },
      });

      if (!product) {
        throw new Error('Failed to create product');
      }

      // 7. 상품 옵션 생성
      const productVariant = await tx.productVariant.create({
        data: {
          productId: product.id,
          optionName: '기본',
          price: 15000,
          stockQuantity: 100,
        },
      });

      if (!productVariant) {
        throw new Error('Failed to create product variant');
      }

      // 8. 주문 생성
      const order = await tx.order.create({
        data: {
          userId: user.id,
          totalAmount: 15000,
          discountAmount: 0,
          finalAmount: 15000,
          status: 'PENDING',
        },
      });

      if (!order) {
        throw new Error('Failed to create order');
      }

      // 생성된 모든 데이터 반환
      return {
        user,
        balance,
        coupon,
        fcfsCoupon,
        product,
        productVariant,
        order,
      };

    } catch (error) {
      console.error('Transaction failed:', error);
      throw error;
    }
  });
}

export default setup;