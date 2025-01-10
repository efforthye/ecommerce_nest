import { execSync } from "child_process";
import { MySqlContainer } from "@testcontainers/mysql";
import * as fs from "fs";
import { getPrismaClient } from "./util";

const init = async () => {
  await initMysql();
  await verifyConnection();
};

const verifyConnection = async () => {
  const prisma = getPrismaClient();
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log("테스트 컨테이너 연결 성공");
  } catch (error) {
    console.error("테스트 컨테이너 연결 실패:", error);
    throw error;
  }
};

const initMysql = async () => {
  console.log("MySQL 컨테이너 시작 중...");
  
  const mysql = await new MySqlContainer("mysql:8")
    .withDatabase("dbname")
    .withUser("root")
    .withRootPassword("pw")
    .start();

  global.mysql = mysql;

  process.env.DB_HOST = mysql.getHost();
  process.env.DB_PORT = mysql.getPort().toString();
  process.env.DB_USERNAME = mysql.getUsername();
  process.env.DB_PASSWORD = mysql.getUserPassword();
  process.env.DB_DATABASE = mysql.getDatabase();
  
  process.env.DATABASE_URL = `mysql://${mysql.getUsername()}:${mysql.getUserPassword()}@${mysql.getHost()}:${mysql.getPort()}/${mysql.getDatabase()}`;
  
  execSync("npx prisma generate");
  execSync("npx prisma migrate deploy");
  
  const importSql = fs.readFileSync("./test/it/import.sql").toString();
  const prisma = getPrismaClient();
  
  for (const sql of importSql.split(";").filter((s) => s.trim() !== "")) {
    await prisma.$executeRawUnsafe(sql);
  }
};

export default init;