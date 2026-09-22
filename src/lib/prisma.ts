import "server-only";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@/generated/prisma/client";

// Postgres 전환 시: @prisma/adapter-pg 의 PrismaPg 로 교체
function createClient() {
  const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL! });
  return new PrismaClient({ adapter });
}

// 개발 중 HMR로 클라이언트가 여러 개 생기지 않도록 전역에 보관
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
