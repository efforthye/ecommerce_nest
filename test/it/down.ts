import { PrismaClient } from '@prisma/client';
import { StartedTestContainer } from 'testcontainers';

declare global {
  var __TESTCONTAINER_MYSQL__: StartedTestContainer;
  var __PRISMA_CLIENT__: PrismaClient;
}

const down = async () => {
  try {
    // Prisma 연결 종료
    if (global.__PRISMA_CLIENT__) {
      await global.__PRISMA_CLIENT__.$disconnect();
    }
    
    // 테스트 컨테이너 종료
    if (global.__TESTCONTAINER_MYSQL__) {
      await global.__TESTCONTAINER_MYSQL__.stop();
    }

    console.log('Test environment cleanup completed');
  } catch (error) {
    console.error('Error during cleanup:', error);
    process.exit(1);
  }
};

export default down;