import { PrismaClient } from '@prisma/client';

const down = async () => {
  const prisma = new PrismaClient();
  await prisma.$disconnect();
  await global.mysql.stop();
};

export default down;