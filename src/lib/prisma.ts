import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

// 런타임 연결은 DATABASE_URL (Neon이면 pooled URL). 마이그레이션용 직접 연결은 prisma.config.ts 참고.
function createClient() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  return new PrismaClient({ adapter });
}

// 개발 중 HMR로 클라이언트가 여러 개 생기지 않도록 전역에 보관
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
