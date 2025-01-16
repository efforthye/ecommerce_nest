import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as mysql from 'mysql2/promise';

export const DATABASE_URL = process.env.DATABASE_URL|| "mysql://root:1234@localhost:3306/ecommerce";

@Injectable()
export class DatabaseConfig {
  constructor(private configService: ConfigService) {}

  async createDatabase() {
    try {
      const connection = await mysql.createConnection({
        host: this.configService.get('DB_HOST') || 'localhost',
        port: this.configService.get('DB_PORT') || 3307,
        user: this.configService.get('DB_USER') || 'root',
        password: this.configService.get('DB_PASSWORD') || '1234',
      });

      await connection.query(
        `CREATE DATABASE IF NOT EXISTS ${
          this.configService.get('DB_NAME') || 'ecommerce'
        }`,
      );

      await connection.end();

      console.log('데이터베이스가 성공적으로 생성되었습니다.');
    } catch (error) {
      console.error('데이터베이스 생성 중 오류 발생:', error);
      throw error;
    }
  }
}