import { describe, expect, it } from "vitest";
import { amountSchema, campaignInputSchema, pledgeInputSchema } from "./validation";

describe("amountSchema", () => {
  it.each([1_000, 10_000, 57_000, 1_000_000])("허용: %i", (amount) => {
    expect(amountSchema.safeParse(amount).success).toBe(true);
  });

  it.each([
    [0, "최소"],
    [999, "최소"],
    [1_500, "1,000원 단위"],
    [1_001_000, "최대"],
    [10_000.5, "숫자"],
  ])("거부: %d (%s)", (amount, messagePart) => {
    const result = amountSchema.safeParse(amount);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toContain(messagePart);
  });

  it("문자열 숫자는 받지 않는다 (폼에서 Number로 바꿔 넘겨야 함)", () => {
    expect(amountSchema.safeParse("10000").success).toBe(false);
  });
});

describe("pledgeInputSchema", () => {
  const base = {
    displayName: "다솜",
    message: "",
    isAnonymous: false,
    isAmountPublic: false,
    amount: 10_000,
  };

  it("이름·메시지 앞뒤 공백을 걷어낸다", () => {
    const parsed = pledgeInputSchema.parse({ ...base, displayName: "  다솜 ", message: " 생일 축하해 " });
    expect(parsed.displayName).toBe("다솜");
    expect(parsed.message).toBe("생일 축하해");
  });

  it("공백뿐인 이름은 거부한다", () => {
    expect(pledgeInputSchema.safeParse({ ...base, displayName: "   " }).success).toBe(false);
  });

  it("이름 20자, 메시지 60자 초과는 거부한다", () => {
    expect(pledgeInputSchema.safeParse({ ...base, displayName: "가".repeat(20) }).success).toBe(true);
    expect(pledgeInputSchema.safeParse({ ...base, displayName: "가".repeat(21) }).success).toBe(false);
    expect(pledgeInputSchema.safeParse({ ...base, message: "가".repeat(60) }).success).toBe(true);
    expect(pledgeInputSchema.safeParse({ ...base, message: "가".repeat(61) }).success).toBe(false);
  });
});

describe("campaignInputSchema", () => {
  const base = {
    slug: "dasom",
    title: "생일선물",
    description: "설명",
    productUrl: "",
    thumbnailUrl: "",
    goalAmount: 100_000,
    deadline: "2026-12-31T23:59",
    accountInfo: "",
    kakaopayUrl: "",
    tossUrl: "",
    thanksMessage: "",
    status: "OPEN",
  };

  it("빈 선택 입력은 null, 마감일은 Date로 바꾼다", () => {
    const parsed = campaignInputSchema.parse(base);
    expect(parsed.productUrl).toBeNull();
    expect(parsed.accountInfo).toBeNull();
    expect(parsed.deadline).toBeInstanceOf(Date);
  });

  it("slug는 영문 소문자·숫자·하이픈만", () => {
    expect(campaignInputSchema.safeParse({ ...base, slug: "Dasom" }).success).toBe(false);
    expect(campaignInputSchema.safeParse({ ...base, slug: "다솜" }).success).toBe(false);
    expect(campaignInputSchema.safeParse({ ...base, slug: "dasom-2026" }).success).toBe(true);
  });

  it("URL 형식이 아니면 거부한다", () => {
    expect(campaignInputSchema.safeParse({ ...base, productUrl: "not a url" }).success).toBe(false);
  });

  it("CLOSED는 폼 입력으로 받지 않는다 (터미널 상태)", () => {
    expect(campaignInputSchema.safeParse({ ...base, status: "CLOSED" }).success).toBe(false);
  });
});
