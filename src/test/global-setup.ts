import { execSync } from "node:child_process";
import { rmSync } from "node:fs";

const TEST_DB = "prisma/test.db";

/** 테스트 DB를 매 실행마다 새로 만든다 (dev.db와 분리). */
export default function setup() {
  rmSync(TEST_DB, { force: true });
  execSync("npx prisma migrate deploy", {
    stdio: "ignore",
    env: { ...process.env, DATABASE_URL: `file:./${TEST_DB}` },
  });
  return () => rmSync(TEST_DB, { force: true });
}
