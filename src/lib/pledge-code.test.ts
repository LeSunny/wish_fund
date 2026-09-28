import { describe, expect, it } from "vitest";
import { CODE_NOUNS, generatePledgeCode, normalizePledgeCode } from "./pledge-code";

describe("generatePledgeCode", () => {
  it("{명사}-{10~99}-{다른 명사} 형식으로 만든다", () => {
    for (let i = 0; i < 500; i++) {
      const code = generatePledgeCode();
      const [first, number, last] = code.split("-");
      expect(CODE_NOUNS).toContain(first);
      expect(CODE_NOUNS).toContain(last);
      expect(first).not.toBe(last);
      expect(Number(number)).toBeGreaterThanOrEqual(10);
      expect(Number(number)).toBeLessThanOrEqual(99);
    }
  });

  it("만든 코드는 정규화해도 그대로다", () => {
    const code = generatePledgeCode();
    expect(normalizePledgeCode(code)).toBe(code);
  });
});

describe("normalizePledgeCode", () => {
  it.each([
    ["귤-47-딸기", "귤-47-딸기"],
    ["  귤-47-딸기  ", "귤-47-딸기"],
    ["귤 47 딸기", "귤-47-딸기"],
    ["귤_47_딸기", "귤-47-딸기"],
    ["귤--47---딸기", "귤-47-딸기"],
    ["귤47딸기", "귤-47-딸기"],
    ["귤 - 47 - 딸기", "귤-47-딸기"],
  ])("%j → %j", (input, expected) => {
    expect(normalizePledgeCode(input)).toBe(expected);
  });

  it.each(["", "귤-4-딸기", "귤-147-딸기", "apple-47-딸기", "귤-47", "귤-47-딸기-사과"])(
    "형식이 아니면 null: %j",
    (input) => {
      expect(normalizePledgeCode(input)).toBeNull();
    },
  );
});
