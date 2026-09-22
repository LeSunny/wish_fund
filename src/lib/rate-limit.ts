import "server-only";
import { headers } from "next/headers";

// 간단한 인메모리 고정 윈도우 rate limit.
// 서버리스 인스턴스끼리 공유되지 않는 한계는 MVP에서 수용 (CLAUDE.md 보안 섹션).

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export async function getClientIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

/** 허용되면 true. key 는 "용도:ip" 형태로 넘긴다. */
export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();

  // 맵이 무한히 커지지 않게 가끔 만료된 항목 정리
  if (buckets.size > 5_000) {
    for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
  }

  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (bucket.count >= limit) return false;
  bucket.count++;
  return true;
}
