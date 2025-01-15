import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { PrismaClient } from '@prisma/client';
import { ValidationPipe } from '@nestjs/common';
import { DatabaseConfig } from './infrastructure/database/database.config';
import { DatabaseSetup } from './infrastructure/database/database.setup';
import { CustomLoggerService } from './infrastructure/logging/logger.service';
import { ConfigService } from '@nestjs/config';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 전역 파이프라인 정의
  app.useGlobalPipes(new ValidationPipe({ 
    transform: true, 
    whitelist: true, 
    forbidNonWhitelisted: true, 
  }));

  // Logger 전역 필터 적용
  const logger = await app.resolve(CustomLoggerService);
  const configService = app.get(ConfigService);
  app.useGlobalFilters(new HttpExceptionFilter(logger, configService));
  app.useGlobalInterceptors(new LoggingInterceptor(logger));

  // 데이터베이스 초기화
  const databaseConfig = app.get(DatabaseConfig);
  await DatabaseSetup.initializeDatabase(databaseConfig);

  // Prisma Client 초기화 및 연결
  const prisma = new PrismaClient();
  try {
    await prisma.$connect();
    console.log('Prisma connected to the database successfully.');
  } catch (error) {
    console.error('Error connecting to the database:', error);
    process.exit(1);
  }

  // Swagger 설정
  const config = new DocumentBuilder()
    .setTitle('API Docs')
    .setDescription('API description')
    .setVersion('1.0')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  // 서버 시작
  await app.listen(3000);

  // 서버 종료 시 Prisma 연결 해제
  process.on('SIGINT', async () => {
    await prisma.$disconnect();
    console.log('Prisma disconnected from the database.');
    process.exit(0);
  });
}

bootstrap();