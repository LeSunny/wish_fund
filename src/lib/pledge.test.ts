import { beforeEach, describe, expect, it } from "vitest";
import { makeCampaign, makePledge, prisma, resetDb } from "@/test/db";
import {
  cancelPledgeByCode,
  confirmPledge,
  createPendingPledge,
  getPublicPledges,
  updatePledgeByCode,
} from "./pledge";
import { normalizePledgeCode } from "./pledge-code";
import type { PledgeInput } from "./validation";

const input: PledgeInput = {
  displayName: "다솜",
  message: "",
  isAnonymous: false,
  isAmountPublic: false,
  amount: 30_000,
};

beforeEach(resetDb);

describe("createPendingPledge", () => {
  it("PENDING으로 저장하고, 정규화된 형식의 코드를 발급한다", async () => {
    const campaign = await makeCampaign();
    const { code } = await createPendingPledge(campaign.id, { ...input, message: "" });

    expect(normalizePledgeCode(code)).toBe(code);
    const saved = await prisma.pledge.findUniqueOrThrow({ where: { code } });
    expect(saved.status).toBe("PENDING");
    expect(saved.message).toBeNull(); // 빈 메시지는 null
  });
});

describe("getPublicPledges", () => {
  it("익명·금액 비공개를 서버에서 마스킹하고, code는 내려보내지 않는다", async () => {
    const campaign = await makeCampaign();
    await makePledge(campaign.id, { displayName: "실명", isAnonymous: true, isAmountPublic: false });
    await makePledge(campaign.id, { displayName: "공개", isAnonymous: false, isAmountPublic: true, amount: 20_000 });

    const list = await getPublicPledges(campaign.id);
    const byName = Object.fromEntries(list.map((p) => [p.displayName, p]));

    expect(byName["익명"].amount).toBeNull();
    expect(byName["공개"].amount).toBe(20_000);
    expect(list.map((p) => p.displayName)).not.toContain("실명");
    for (const p of list) {
      expect(p).not.toHaveProperty("code");
      expect(p).not.toHaveProperty("isAnonymous");
      expect(p).not.toHaveProperty("isAmountPublic");
    }
  });

  it("CANCELLED는 제외하고, 다른 캠페인 후원은 섞이지 않는다", async () => {
    const campaign = await makeCampaign();
    const other = await makeCampaign();
    await makePledge(campaign.id, { status: "PENDING" });
    await makePledge(campaign.id, { status: "CONFIRMED" });
    await makePledge(campaign.id, { status: "CANCELLED" });
    await makePledge(other.id);

    const list = await getPublicPledges(campaign.id);
    expect(list.map((p) => p.status).sort()).toEqual(["CONFIRMED", "PENDING"]);
  });
});

describe("confirmPledge", () => {
  it("PENDING만 CONFIRMED로 바꾼다", async () => {
    const campaign = await makeCampaign();
    const pending = await makePledge(campaign.id, { status: "PENDING" });
    const cancelled = await makePledge(campaign.id, { status: "CANCELLED" });

    await confirmPledge(pending.id);
    expect((await prisma.pledge.findUniqueOrThrow({ where: { id: pending.id } })).status).toBe("CONFIRMED");

    await expect(confirmPledge(cancelled.id)).rejects.toThrow();
    await expect(confirmPledge(pending.id)).rejects.toThrow(); // 이미 CONFIRMED
  });
});

describe("updatePledgeByCode", () => {
  it("CONFIRMED 후원의 금액을 바꾸면 PENDING으로 되돌린다", async () => {
    const campaign = await makeCampaign();
    const pledge = await makePledge(campaign.id, { status: "CONFIRMED", amount: 10_000 });

    const result = await updatePledgeByCode(pledge.code, { ...input, amount: 20_000 });
    expect(result).toEqual({ ok: true, slug: campaign.slug, revertedToPending: true });

    const saved = await prisma.pledge.findUniqueOrThrow({ where: { id: pledge.id } });
    expect(saved.status).toBe("PENDING");
    expect(saved.amount).toBe(20_000);
  });

  it("CONFIRMED 후원이라도 금액 외 항목만 바꾸면 그대로 CONFIRMED", async () => {
    const campaign = await makeCampaign();
    const pledge = await makePledge(campaign.id, { status: "CONFIRMED", amount: 10_000 });

    const result = await updatePledgeByCode(pledge.code, {
      ...input,
      amount: 10_000,
      displayName: "새 이름",
      message: "축하해",
    });
    expect(result).toMatchObject({ ok: true, revertedToPending: false });

    const saved = await prisma.pledge.findUniqueOrThrow({ where: { id: pledge.id } });
    expect(saved.status).toBe("CONFIRMED");
    expect(saved.displayName).toBe("새 이름");
    expect(saved.message).toBe("축하해");
  });

  it("CANCELLED 후원은 수정할 수 없다 (되살아나지 않음)", async () => {
    const campaign = await makeCampaign();
    const pledge = await makePledge(campaign.id, { status: "CANCELLED" });

    const result = await updatePledgeByCode(pledge.code, input);
    expect(result.ok).toBe(false);
    expect((await prisma.pledge.findUniqueOrThrow({ where: { id: pledge.id } })).status).toBe("CANCELLED");
  });

  it("캠페인이 OPEN이 아니면 수정할 수 없다", async () => {
    const closed = await makeCampaign({ status: "CLOSED" });
    const pledge = await makePledge(closed.id);
    expect((await updatePledgeByCode(pledge.code, input)).ok).toBe(false);
  });

  it("마감일이 지난 캠페인은 조회 시점에 CLOSED가 되어 수정할 수 없다", async () => {
    const expired = await makeCampaign({ deadline: new Date(Date.now() - 1000) });
    const pledge = await makePledge(expired.id);

    expect((await updatePledgeByCode(pledge.code, input)).ok).toBe(false);
    expect((await prisma.campaign.findUniqueOrThrow({ where: { id: expired.id } })).status).toBe("CLOSED");
  });

  it("없는 코드는 실패", async () => {
    expect((await updatePledgeByCode("없는-10-코드", input)).ok).toBe(false);
  });
});

describe("cancelPledgeByCode", () => {
  it("삭제하지 않고 CANCELLED로 바꾼다 (CONFIRMED였는지 알려줌)", async () => {
    const campaign = await makeCampaign();
    const confirmed = await makePledge(campaign.id, { status: "CONFIRMED" });
    const pending = await makePledge(campaign.id, { status: "PENDING" });

    expect(await cancelPledgeByCode(confirmed.code)).toMatchObject({ ok: true, wasConfirmed: true });
    expect(await cancelPledgeByCode(pending.code)).toMatchObject({ ok: true, wasConfirmed: false });

    const rows = await prisma.pledge.findMany({ where: { campaignId: campaign.id } });
    expect(rows).toHaveLength(2);
    expect(rows.every((p) => p.status === "CANCELLED")).toBe(true);
  });

  it("이미 취소된 후원은 다시 취소할 수 없다", async () => {
    const campaign = await makeCampaign();
    const pledge = await makePledge(campaign.id, { status: "CANCELLED" });
    expect((await cancelPledgeByCode(pledge.code)).ok).toBe(false);
  });

  it("마감된 캠페인의 후원은 취소할 수 없다", async () => {
    const closed = await makeCampaign({ status: "CLOSED" });
    const pledge = await makePledge(closed.id, { status: "CONFIRMED" });
    expect((await cancelPledgeByCode(pledge.code)).ok).toBe(false);
    expect((await prisma.pledge.findUniqueOrThrow({ where: { id: pledge.id } })).status).toBe("CONFIRMED");
  });
});
