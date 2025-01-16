import { Module } from "@nestjs/common";
import { PrismaService } from "./prisma.service";
import { DatabaseSetup } from "./database.setup";
import { DatabaseConfig } from "./database.config";

@Module({
  providers: [
    PrismaService,
    DatabaseSetup,
    DatabaseConfig,
  ],
  exports: [
    PrismaService,
    DatabaseSetup,
    DatabaseConfig,
  ],
})
export class DatabaseModule {}