import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUserTeams1709499839546 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL
            ) ENGINE=InnoDB;
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP TABLE IF EXISTS users;");
  }
}
