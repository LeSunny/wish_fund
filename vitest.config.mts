import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      // "server-only"는 RSC 번들러 밖에서 import 하면 에러를 던진다 → 테스트에선 빈 모듈로
      "server-only": path.resolve(import.meta.dirname, "src/test/empty.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // dev.db를 건드리지 않도록 테스트 전용 SQLite 파일 (globalSetup에서 마이그레이션 적용)
    env: { DATABASE_URL: "file:./prisma/test.db" },
    globalSetup: ["src/test/global-setup.ts"],
    // DB 테스트끼리 같은 파일을 쓰므로 파일 단위 병렬 실행은 끈다
    fileParallelism: false,
  },
});
