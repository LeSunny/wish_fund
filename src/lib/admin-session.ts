import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const COOKIE_NAME = "wishfund_admin";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7일

function requiredEnv(name: "ADMIN_PASSWORD" | "ADMIN_SESSION_SECRET") {
  const value = process.env[name];
  if (!value) throw new Error(`${name} 환경변수가 설정되지 않았어요`);
  return value;
}

/** 길이가 달라도 안전하게: 양쪽을 고정 길이 다이제스트로 만든 뒤 timing-safe 비교 */
function timingSafeStringEqual(a: string, b: string) {
  const digestA = createHash("sha256").update(a).digest();
  const digestB = createHash("sha256").update(b).digest();
  return timingSafeEqual(digestA, digestB);
}

export function verifyAdminPassword(candidate: string) {
  return timingSafeStringEqual(candidate, requiredEnv("ADMIN_PASSWORD"));
}

function sign(payload: string) {
  return createHmac("sha256", requiredEnv("ADMIN_SESSION_SECRET")).update(payload).digest("base64url");
}

export async function createAdminSession() {
  const payload = String(Date.now() + SESSION_TTL_MS); // exp
  const value = `${payload}.${sign(payload)}`;
  const store = await cookies();
  store.set(COOKIE_NAME, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  });
}

export async function destroyAdminSession() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function hasValidAdminSession() {
  const store = await cookies();
  const raw = store.get(COOKIE_NAME)?.value;
  if (!raw) return false;

  const sepIndex = raw.lastIndexOf(".");
  if (sepIndex < 0) return false;
  const payload = raw.slice(0, sepIndex);
  const signature = raw.slice(sepIndex + 1);

  if (!timingSafeStringEqual(signature, sign(payload))) return false;

  const exp = Number(payload);
  return Number.isFinite(exp) && Date.now() < exp;
}

/** 세션이 없으면 로그인 화면(`/admin`)으로 보낸다. admin 하위 페이지/액션 맨 위에서 호출. */
export async function requireAdminSession() {
  if (!(await hasValidAdminSession())) redirect("/admin");
}
