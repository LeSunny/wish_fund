import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { rateLimit } from "./rate-limit";

describe("rateLimit", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("한도까지 허용하고 그다음부터 막는다", () => {
    const results = Array.from({ length: 4 }, () => rateLimit("t1:1.1.1.1", 3, 60_000));
    expect(results).toEqual([true, true, true, false]);
  });

  it("윈도우가 지나면 다시 허용한다", () => {
    for (let i = 0; i < 3; i++) rateLimit("t2:1.1.1.1", 3, 60_000);
    expect(rateLimit("t2:1.1.1.1", 3, 60_000)).toBe(false);
    vi.advanceTimersByTime(60_000);
    expect(rateLimit("t2:1.1.1.1", 3, 60_000)).toBe(true);
  });

  it("키(용도·IP)가 다르면 따로 센다", () => {
    for (let i = 0; i < 3; i++) rateLimit("t3:1.1.1.1", 3, 60_000);
    expect(rateLimit("t3:1.1.1.1", 3, 60_000)).toBe(false);
    expect(rateLimit("t3:2.2.2.2", 3, 60_000)).toBe(true);
    expect(rateLimit("t3-other:1.1.1.1", 3, 60_000)).toBe(true);
  });
});
