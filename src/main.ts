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
import { mkdirSync, existsSync } from 'fs';
import { join } from 'path';

async function bootstrap() {
  // logs 디렉토리 생성
  const logsDir = join(process.cwd(), 'logs');
  if (!existsSync(logsDir)) {
      mkdirSync(logsDir);
  }

  const app = await NestFactory.create(AppModule);

  // Logger 초기화 및 전역 설정
  const logger = await app.resolve(CustomLoggerService);
  app.useLogger(logger);

  // 전역 파이프라인 정의
  app.useGlobalPipes(new ValidationPipe({ 
    transform: true, // 입력값을 DTO 클래스의 인스턴스로 변환
    whitelist: true, // DTO에 정의되지 않은 속성 제거
    forbidNonWhitelisted: false, // DTO에 정의되지 않은 속성이 있으면 에러
    transformOptions: { 
      enableImplicitConversion: true, // 암시적 타입 변환 활성화
    },
    skipMissingProperties: false, // 누락된 필수 속성에 대해 에러 발생
    stopAtFirstError: true,       // 첫 번째 에러에서 중단
  }));

  // Logger 전역 필터 적용
  const configService = app.get(ConfigService);
  app.useGlobalFilters(new HttpExceptionFilter(logger, configService));
  app.useGlobalInterceptors(new LoggingInterceptor(logger));

  // 데이터베이스 초기화
    const databaseConfig = app.get(DatabaseConfig);
    const databaseSetup = app.get(DatabaseSetup); // 인스턴스 얻기
    await databaseSetup.initializeDatabase(databaseConfig);

  // Prisma Client 초기화 및 연결
  const prisma = new PrismaClient();
  try {
    await prisma.$connect();
    logger.log('Prisma connected to the database successfully.');
  } catch (error) {
    logger.error('Error connecting to the database:', error);
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
    logger.log('Prisma disconnected from the database.');
    process.exit(0);
  });
}

bootstrap();