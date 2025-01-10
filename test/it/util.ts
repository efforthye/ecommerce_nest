import { PrismaClient } from '@prisma/client';

let prisma: PrismaClient;

export const getPrismaClient = () => {
  if (!prisma) {
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: `mysql://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_DATABASE}`
        },
      },
      log: ['query', 'info', 'warn', 'error'],
    });
  }
  return prisma;
};