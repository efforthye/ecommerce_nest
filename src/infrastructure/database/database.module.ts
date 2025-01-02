import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { DatabaseConfig, dbConfig } from "./database.config";

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [
        ConfigModule.forRoot({
          load: [dbConfig],
          envFilePath: `.env.${process.env.NODE_ENV}`,
        }),
      ],
      useFactory: (configService: ConfigService) => ({
        type: "mysql",
        ...configService.get<DatabaseConfig>("database"),
        synchronize: false,
        autoLoadEntities: true,
        relationLoadStrategy: "join",
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [],
  providers: [],
})
export class DatabaseModule {}
