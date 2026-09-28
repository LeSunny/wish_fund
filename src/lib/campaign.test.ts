import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { makeCampaign, makePledge, prisma, resetDb } from "@/test/db";
import { closeCampaignNow, getCampaign, getCampaignTotals, getDefaultCampaignSlug } from "./campaign";

beforeEach(resetDb);
afterEach(() => vi.unstubAllEnvs());

const statusOf = async (id: string) =>
  (await prisma.campaign.findUniqueOrThrow({ where: { id } })).status;

describe("getCampaign (lazy 마감)", () => {
  it("마감일이 지난 OPEN 캠페인은 조회 시 CLOSED로 바꿔서 저장한다", async () => {
    const campaign = await makeCampaign({ deadline: new Date(Date.now() - 1000) });
    expect((await getCampaign(campaign.slug))?.status).toBe("CLOSED");
    expect(await statusOf(campaign.id)).toBe("CLOSED");
  });

  it("마감 전이면 OPEN 유지, DRAFT는 마감일이 지나도 건드리지 않는다", async () => {
    const open = await makeCampaign();
    const draft = await makeCampaign({ status: "DRAFT", deadline: new Date(Date.now() - 1000) });
    expect((await getCampaign(open.slug))?.status).toBe("OPEN");
    expect((await getCampaign(draft.slug))?.status).toBe("DRAFT");
  });

  it("slug 형식이 아니면 DB 조회 없이 null", async () => {
    expect(await getCampaign("../admin")).toBeNull();
  });
});

describe("getCampaignTotals", () => {
  it("CONFIRMED·PENDING은 따로 합산하고 CANCELLED는 어디에도 넣지 않는다", async () => {
    const campaign = await makeCampaign();
    await makePledge(campaign.id, { status: "CONFIRMED", amount: 10_000 });
    await makePledge(campaign.id, { status: "CONFIRMED", amount: 5_000 });
    await makePledge(campaign.id, { status: "PENDING", amount: 3_000 });
    await makePledge(campaign.id, { status: "CANCELLED", amount: 100_000 });

    expect(await getCampaignTotals(campaign.id)).toEqual({ confirmed: 15_000, pending: 3_000 });
  });

  it("후원이 없으면 0", async () => {
    const campaign = await makeCampaign();
    expect(await getCampaignTotals(campaign.id)).toEqual({ confirmed: 0, pending: 0 });
  });
});

describe("closeCampaignNow", () => {
  it("OPEN만 마감할 수 있다", async () => {
    const open = await makeCampaign();
    const draft = await makeCampaign({ status: "DRAFT" });

    await closeCampaignNow(open.id);
    expect(await statusOf(open.id)).toBe("CLOSED");
    await expect(closeCampaignNow(open.id)).rejects.toThrow();
    await expect(closeCampaignNow(draft.id)).rejects.toThrow();
  });
});

describe("getDefaultCampaignSlug", () => {
  it("DEFAULT_CAMPAIGN_SLUG가 있으면 그대로", async () => {
    vi.stubEnv("DEFAULT_CAMPAIGN_SLUG", "dasom");
    expect(await getDefaultCampaignSlug()).toBe("dasom");
  });

  it("없으면 가장 최근 OPEN 캠페인, 마감일 지난 건 닫고 건너뛴다", async () => {
    vi.stubEnv("DEFAULT_CAMPAIGN_SLUG", "");
    const older = await makeCampaign({ createdAt: new Date("2026-01-01") });
    const expired = await makeCampaign({
      createdAt: new Date("2026-03-01"),
      deadline: new Date(Date.now() - 1000),
    });
    await makeCampaign({ status: "DRAFT", createdAt: new Date("2026-04-01") });

    expect(await getDefaultCampaignSlug()).toBe(older.slug);
    expect(await statusOf(expired.id)).toBe("CLOSED");
  });

  it("OPEN 캠페인이 없으면 null", async () => {
    vi.stubEnv("DEFAULT_CAMPAIGN_SLUG", "");
    await makeCampaign({ status: "CLOSED" });
    expect(await getDefaultCampaignSlug()).toBeNull();
  });
});
