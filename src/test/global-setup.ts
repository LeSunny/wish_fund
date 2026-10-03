import { execSync } from "node:child_process";
import { userInfo } from "node:os";

/**
 * 테스트 전용 로컬 Postgres DB (dev DB와 분리). DB는 한 번만 만들어두면 된다: `createdb wish_fund_test`
 * 실행마다 아직 안 들어간 마이그레이션만 적용하고(비파괴), 데이터는 각 테스트의 resetDb()가 비운다.
 * 스키마가 꼬였으면 직접 `dropdb wish_fund_test && createdb wish_fund_test`.
 */
export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL || `postgresql://${userInfo().username}@localhost:5432/wish_fund_test`;

export default function setup() {
  execSync("npx prisma migrate deploy", {
    stdio: "ignore",
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL, DATABASE_URL_UNPOOLED: "" },
  });
}
