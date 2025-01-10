import { getPrismaClient } from '../util';

describe("Should return expected result", () => {
  const prisma = getPrismaClient();

  beforeAll(async () => {
    // 필요한 초기화 작업
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("Should 1=1", async () => {
    // given

    // when

    // then
    expect(1).toEqual(1);
  });
});