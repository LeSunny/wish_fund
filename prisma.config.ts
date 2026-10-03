import "dotenv/config";
import { defineConfig } from "prisma/config";

// CLI(migrate 등)용 연결. Neon은 pooler를 거치지 않는 직접 연결(DATABASE_URL_UNPOOLED)을 따로 주므로
// 있으면 그걸 쓰고, 없으면(로컬) DATABASE_URL. 런타임 연결은 src/lib/prisma.ts 에서 DATABASE_URL로.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL,
  },
});
