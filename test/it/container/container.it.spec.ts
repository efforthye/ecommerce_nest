import { getPrismaClient } from "../util";

describe("Container Connection Test", () => {
  const prisma = getPrismaClient();

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("테스트 컨테이너 연결 확인", async () => {
    // when
    // const result = await prisma.$queryRaw`SELECT 1+1 as result`;
    const result = await prisma.$queryRaw<{ result: number }[]>`SELECT 1+1 as result`;

    // then
    expect(Number(result[0].result)).toBe(2);  // BigInt를 Number로 변환
  });
});