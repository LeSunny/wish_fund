import { describe, expect, it } from "vitest";
import { parseKstDatetimeLocal, toKstDatetimeLocal } from "./format";

describe("KST datetime-local", () => {
  it("Date를 한국 시간 datetime-local 값으로 바꾼다", () => {
    expect(toKstDatetimeLocal(new Date("2026-12-31T14:59:00Z"))).toBe("2026-12-31T23:59");
    // 날짜가 넘어가는 경우
    expect(toKstDatetimeLocal(new Date("2026-12-31T15:00:00Z"))).toBe("2027-01-01T00:00");
  });

  it("datetime-local 값을 한국 시간으로 해석한다 (초 선택)", () => {
    expect(parseKstDatetimeLocal("2026-12-31T23:59")?.toISOString()).toBe("2026-12-31T14:59:00.000Z");
    expect(parseKstDatetimeLocal("2026-12-31T23:59:30")?.toISOString()).toBe("2026-12-31T14:59:30.000Z");
  });

  it("왕복 변환이 같은 값을 돌려준다", () => {
    expect(toKstDatetimeLocal(parseKstDatetimeLocal("2026-10-20T09:05")!)).toBe("2026-10-20T09:05");
  });

  it("형식이 틀리면 null", () => {
    expect(parseKstDatetimeLocal("")).toBeNull();
    expect(parseKstDatetimeLocal("2026-12-31")).toBeNull();
    expect(parseKstDatetimeLocal("2026-12-31T23:59Z")).toBeNull();
    expect(parseKstDatetimeLocal("2026-13-01T00:00")).toBeNull();
  });
});
