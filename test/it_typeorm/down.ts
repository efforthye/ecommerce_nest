import { getDatasource } from "./util";

const down = async () => {
  await global.mysql.stop();
  await (await getDatasource()).destroy();
};

export default down;
