import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// next/headers의 cookies()를 Map 기반 가짜 저장소로 대체
const jar = new Map<string, string>();
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (jar.has(name) ? { name, value: jar.get(name)! } : undefined),
    set: (name: string, value: string) => void jar.set(name, value),
    delete: (name: string) => void jar.delete(name),
  }),
}));

const { createAdminSession, destroyAdminSession, hasValidAdminSession, verifyAdminPassword } =
  await import("./admin-session");

const COOKIE_NAME = "wishfund_admin";

describe("admin-session", () => {
  beforeEach(() => {
    jar.clear();
    vi.stubEnv("ADMIN_PASSWORD", "correct horse");
    vi.stubEnv("ADMIN_SESSION_SECRET", "x".repeat(32));
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it("비밀번호가 정확히 같을 때만 통과 (길이가 달라도 에러 없이 false)", () => {
    expect(verifyAdminPassword("correct horse")).toBe(true);
    expect(verifyAdminPassword("correct hors")).toBe(false);
    expect(verifyAdminPassword("")).toBe(false);
    expect(verifyAdminPassword("correct horse battery staple")).toBe(false);
  });

  it("환경변수가 없으면 로그인 자체를 거부한다", () => {
    vi.stubEnv("ADMIN_PASSWORD", "");
    expect(() => verifyAdminPassword("")).toThrow();
  });

  it("발급한 세션은 유효하고, 로그아웃하면 무효", async () => {
    expect(await hasValidAdminSession()).toBe(false);
    await createAdminSession();
    expect(await hasValidAdminSession()).toBe(true);
    await destroyAdminSession();
    expect(await hasValidAdminSession()).toBe(false);
  });

  it("만료 시각을 조작하면 서명이 맞지 않아 거부한다", async () => {
    await createAdminSession();
    const [, signature] = jar.get(COOKIE_NAME)!.split(".");
    jar.set(COOKIE_NAME, `${Date.now() + 10 ** 12}.${signature}`);
    expect(await hasValidAdminSession()).toBe(false);
  });

  it("서명 키가 바뀌면 기존 세션은 무효", async () => {
    await createAdminSession();
    vi.stubEnv("ADMIN_SESSION_SECRET", "y".repeat(32));
    expect(await hasValidAdminSession()).toBe(false);
  });

  it("7일이 지나면 만료", async () => {
    vi.useFakeTimers();
    await createAdminSession();
    vi.advanceTimersByTime(7 * 24 * 60 * 60 * 1000 - 1000);
    expect(await hasValidAdminSession()).toBe(true);
    vi.advanceTimersByTime(2000);
    expect(await hasValidAdminSession()).toBe(false);
  });

  it.each(["", "garbage", "123.", ".abc"])("형식이 깨진 쿠키는 거부: %j", async (value) => {
    jar.set(COOKIE_NAME, value);
    expect(await hasValidAdminSession()).toBe(false);
  });
});
