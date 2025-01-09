import { getPrismaClient } from "./util";

const down = async () => {
  await global.mysql.stop();
  await getPrismaClient().$disconnect();
};

export default down;