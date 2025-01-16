import { Module } from "@nestjs/common";
import { PrismaService } from "./prisma.service";
import { DatabaseSetup } from "./database.setup";
import { DatabaseConfig } from "./database.config";
import { LoggerModule } from "../logging/logger.module";

@Module({
  providers: [
    PrismaService,
    DatabaseSetup,
    DatabaseConfig,
    LoggerModule
  ],
  exports: [
    PrismaService,
    DatabaseSetup,
    DatabaseConfig,
  ],
})
export class DatabaseModule {}