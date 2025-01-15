import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';

const INIT_FLAG_FILE = 'prisma/.db-initialized';

export class DatabaseSetup {
    private static async runPrismaCommand(command: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const [cmd, ...args] = command.split(' ');
            const childProcess = spawn(cmd, args, { stdio: 'inherit' });

            childProcess.on('error', (error) => {
                console.error(`Command failed: ${command}`);
                reject(error);
            });

            childProcess.on('exit', (code) => {
                if (code === 0) {
                    resolve();
                } else {
                    reject(new Error(`Command failed with exit code ${code}`));
                }
            });
        });
    }

    private static async isInitialized(): Promise<boolean> {
        return fs.existsSync(path.join(process.cwd(), INIT_FLAG_FILE));
    }

    private static async markAsInitialized(): Promise<void> {
        fs.writeFileSync(path.join(process.cwd(), INIT_FLAG_FILE), new Date().toISOString());
    }

    private static async runSeed(): Promise<void> {
        const prisma = new PrismaClient();
        
        try {
            // 유저 데이터 생성
            const users = await prisma.userAccount.createMany({
                data: [
                    { name: '천동민', email: 'hminimi@gmail.com', createdAt: new Date(), updatedAt: new Date() },
                    { name: '박혜림', email: 'efforthye@gmail.com', createdAt: new Date(), updatedAt: new Date() },
                    { name: '김종협', email: 'jong@gmail.com', createdAt: new Date(), updatedAt: new Date() },
                ],
                skipDuplicates: true,
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
                skipDuplicates: true,
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
                        startDate: new Date('2025-01-01T00:00:00Z'),
                        endDate: new Date('2025-06-30T23:59:59Z'),
                        createdAt: new Date(),
                    },
                ],
                skipDuplicates: true,
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
                skipDuplicates: true,
            });
            console.log('Created products:', products);

            // 상품 옵션 데이터 생성
            const productVariants = await prisma.productVariant.createMany({
                data: [
                    // 아이폰17pro 옵션
                    {
                        productId: 1,
                        optionName: '블루 티타늄-256GB',
                        stockQuantity: 50,
                        price: 1200000.0,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    },
                    {
                        productId: 1,
                        optionName: '블루 티타늄-512GB',
                        stockQuantity: 30,
                        price: 1400000.0,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    },
                    {
                        productId: 1,
                        optionName: '내추럴 티타늄-256GB',
                        stockQuantity: 40,
                        price: 1200000.0,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    },
                    // 맥북pro m7 옵션
                    {
                        productId: 2,
                        optionName: '스페이스 블랙-512GB',
                        stockQuantity: 20,
                        price: 1500000.0,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    },
                    {
                        productId: 2,
                        optionName: '스페이스 블랙-1TB',
                        stockQuantity: 15,
                        price: 1800000.0,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    },
                    {
                        productId: 2,
                        optionName: '실버-512GB',
                        stockQuantity: 25,
                        price: 1500000.0,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    },
                    // 에어팟4 옵션
                    {
                        productId: 3,
                        optionName: '화이트',
                        stockQuantity: 100,
                        price: 200000.0,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    },
                    {
                        productId: 3,
                        optionName: '블랙',
                        stockQuantity: 80,
                        price: 200000.0,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    }
                ],
                skipDuplicates: true,
            });
            console.log('Created product variants:', productVariants);

            // 상품 이미지 데이터 생성
            const productImages = await prisma.productImage.createMany({
                data: [
                    // 아이폰17pro 이미지
                    {
                        productId: 1,
                        productVariantId: null,
                        imageUrl: 'iphone17pro-main.jpg',
                        sequence: 1,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    },
                    {
                        productId: 1,
                        productVariantId: 1, // 블루 티타늄 이미지
                        imageUrl: 'iphone17pro-blue.jpg',
                        sequence: 1,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    },
                    // 맥북pro m7 이미지
                    {
                        productId: 2,
                        productVariantId: null,
                        imageUrl: 'macbook-m7-main.jpg',
                        sequence: 1,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    },
                    {
                        productId: 2,
                        productVariantId: 4, // 스페이스 블랙 이미지
                        imageUrl: 'macbook-m7-black.jpg',
                        sequence: 1,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    },
                    // 에어팟4 이미지
                    {
                        productId: 3,
                        productVariantId: null,
                        imageUrl: 'airpods4-main.jpg',
                        sequence: 1,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    }
                ],
                skipDuplicates: true,
            });
            console.log('Created product images:', productImages);
    
            // 유저 잔액 데이터 생성
            const balances = await prisma.userBalance.createMany({
                data: [
                    { userId: 1, balance: 10000, updatedAt: new Date() },
                    { userId: 2, balance: 5000, updatedAt: new Date() },
                    { userId: 3, balance: 20000, updatedAt: new Date() },
                ],
                skipDuplicates: true,
            });
            console.log('Created balances:', balances);
    
        } catch (error) {
            console.error('Seed execution failed:', error);
            throw error;
        } finally {
            await prisma.$disconnect();
        }
    }

    static async initializeDatabase(databaseConfig: any): Promise<void> {
        try {
            if (await this.isInitialized()) {
                console.log('Database already initialized, skipping setup...');
                return;
            }

            // 데이터베이스 생성
            await databaseConfig.createDatabase();

            // 프리즈마 마이그레이션 실행
            console.log('Starting Prisma migrations...');
            const migrationCommand = process.env.NODE_ENV === 'production'
                ? 'npx prisma migrate deploy'
                : 'npx prisma migrate dev --name init';
            console.log(`Executing command: ${migrationCommand}`);
            await this.runPrismaCommand(migrationCommand);
            console.log('Prisma migrations completed.');

            // 시드 데이터 생성
            console.log('Running seed data...');
            await this.runSeed();
            console.log('Seed data created successfully.');

            await this.markAsInitialized();
            console.log('Initial database setup completed successfully.');
        } catch (error) {
            console.error('Database setup failed:', error);
            process.exit(1);
        }
    }
}