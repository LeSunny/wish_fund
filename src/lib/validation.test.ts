import { describe, expect, it } from "vitest";
import { amountSchema, campaignInputSchema, campaignUpdateSchema, pledgeInputSchema } from "./validation";

describe("amountSchema", () => {
  it.each([1_000, 1_234, 10_000, 57_500, 1_000_000])("허용: %i (1원 단위 자유)", (amount) => {
    expect(amountSchema.safeParse(amount).success).toBe(true);
  });

  it.each([
    [0, "최소"],
    [999, "최소"],
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
    products: [],
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
    expect(parsed.accountInfo).toBeNull();
    expect(parsed.kakaopayUrl).toBeNull();
    expect(parsed.deadline).toBeInstanceOf(Date);
  });

  it("마감일은 서버 시간대와 무관하게 한국 시간으로 해석한다", () => {
    const parsed = campaignInputSchema.parse(base);
    expect(parsed.deadline.toISOString()).toBe("2026-12-31T14:59:00.000Z");
  });

  it("마감일 형식이 틀리면 거부한다", () => {
    expect(campaignInputSchema.safeParse({ ...base, deadline: "" }).success).toBe(false);
    expect(campaignInputSchema.safeParse({ ...base, deadline: "2026-13-01T00:00" }).success).toBe(false);
    expect(campaignInputSchema.safeParse({ ...base, deadline: "내일" }).success).toBe(false);
  });

  it("slug는 영문 소문자·숫자·하이픈만", () => {
    expect(campaignInputSchema.safeParse({ ...base, slug: "Dasom" }).success).toBe(false);
    expect(campaignInputSchema.safeParse({ ...base, slug: "다솜" }).success).toBe(false);
    expect(campaignInputSchema.safeParse({ ...base, slug: "dasom-2026" }).success).toBe(true);
  });

  it("URL 형식이 아니면 거부한다", () => {
    expect(campaignInputSchema.safeParse({ ...base, tossUrl: "not a url" }).success).toBe(false);
  });

  const product = { title: "에어팟", url: "", thumbnailUrl: "", price: null };

  it("상품: 빈 URL은 null, 가격은 비워도 된다", () => {
    const parsed = campaignInputSchema.parse({ ...base, products: [product, { ...product, price: 30_000 }] });
    expect(parsed.products[0]).toEqual({ title: "에어팟", url: null, thumbnailUrl: null, price: null });
    expect(parsed.products[1].price).toBe(30_000);
  });

  it("상품: 이름 필수, URL 형식, 가격은 0 이상 정수", () => {
    const fails = (p: object) => !campaignInputSchema.safeParse({ ...base, products: [{ ...product, ...p }] }).success;
    expect(fails({ title: " " })).toBe(true);
    expect(fails({ url: "not a url" })).toBe(true);
    expect(fails({ price: -1 })).toBe(true);
    expect(fails({ price: 1.5 })).toBe(true);
  });

  it("상품: 최대 5개, 배열이 아니면 거부", () => {
    expect(campaignInputSchema.safeParse({ ...base, products: Array(5).fill(product) }).success).toBe(true);
    expect(campaignInputSchema.safeParse({ ...base, products: Array(6).fill(product) }).success).toBe(false);
    expect(campaignInputSchema.safeParse({ ...base, products: null }).success).toBe(false);
  });

  it("CLOSED는 폼 입력으로 받지 않는다 (터미널 상태)", () => {
    expect(campaignInputSchema.safeParse({ ...base, status: "CLOSED" }).success).toBe(false);
    expect(campaignInputSchema.safeParse({ ...base, status: undefined }).success).toBe(false);
  });
});

describe("campaignUpdateSchema", () => {
  const base = {
    title: "생일선물",
    description: "설명",
    products: [],
    goalAmount: 100_000,
    deadline: "2026-12-31T23:59",
    accountInfo: "",
    kakaopayUrl: "",
    tossUrl: "",
    thanksMessage: "",
  };

  it("마감된 캠페인 폼처럼 status가 없어도 통과한다", () => {
    const parsed = campaignUpdateSchema.parse(base);
    expect(parsed.status).toBeUndefined();
  });

  it("status를 보내면 DRAFT/OPEN만 허용, slug는 걷어낸다", () => {
    expect(campaignUpdateSchema.safeParse({ ...base, status: "CLOSED" }).success).toBe(false);
    expect(campaignUpdateSchema.parse({ ...base, status: "OPEN", slug: "x" })).not.toHaveProperty("slug");
  });
});
