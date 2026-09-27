import "server-only";
import { cache } from "react";
import type { Campaign } from "@/generated/prisma/client";
import { prisma } from "./prisma";
import type { CampaignInput } from "./validation";
import { slugSchema } from "./validation";

/**
 * 마감일이 지난 OPEN 캠페인은 CLOSED로 바꾼다.
 * (Vercel에 상시 워커가 없어서 조회 시점에 lazy 하게 처리. 마감 처리는 이 함수를 통해서만.)
 */
async function closeIfExpired(campaign: Campaign): Promise<Campaign> {
  if (campaign.status === "OPEN" && campaign.deadline <= new Date()) {
    // 동시 요청이 겹쳐도 한 번만 바뀌도록 updateMany + status 조건
    await prisma.campaign.updateMany({
      where: { id: campaign.id, status: "OPEN" },
      data: { status: "CLOSED" },
    });
    return { ...campaign, status: "CLOSED" };
  }
  return campaign;
}

/** slug로 캠페인을 가져온다 (공개 페이지용). */
export const getCampaign = cache(async (slug: string) => {
  if (!slugSchema.safeParse(slug).success) return null;
  const campaign = await prisma.campaign.findUnique({ where: { slug } });
  return campaign && closeIfExpired(campaign);
});

/** id로 캠페인을 가져온다 (관리자용 — DRAFT도 조회 가능). */
export const getCampaignById = cache(async (id: string) => {
  const campaign = await prisma.campaign.findUnique({ where: { id } });
  return campaign && closeIfExpired(campaign);
});

/** 진행률 계산용 합계. CANCELLED는 어디에도 넣지 않는다. */
export async function getCampaignTotals(campaignId: string) {
  const groups = await prisma.pledge.groupBy({
    by: ["status"],
    where: { campaignId, status: { in: ["CONFIRMED", "PENDING"] } },
    _sum: { amount: true },
  });
  const sumOf = (status: "CONFIRMED" | "PENDING") =>
    groups.find((g) => g.status === status)?._sum.amount ?? 0;

  return { confirmed: sumOf("CONFIRMED"), pending: sumOf("PENDING") };
}

// ---- 관리자 ----

export function listCampaignsForAdmin() {
  return prisma.campaign.findMany({ orderBy: { createdAt: "desc" } });
}

export function createCampaign(input: CampaignInput) {
  return prisma.campaign.create({ data: input });
}

export function updateCampaign(id: string, input: Omit<CampaignInput, "slug">) {
  // slug는 공유된 링크를 깨뜨릴 수 있어 생성 후에는 바꾸지 않는다 (폼에서도 수정 불가로 막음)
  return prisma.campaign.update({ where: { id }, data: input });
}

/** 마감일과 무관하게 지금 바로 마감. OPEN 상태일 때만 의미가 있다. */
export async function closeCampaignNow(id: string) {
  const result = await prisma.campaign.updateMany({
    where: { id, status: "OPEN" },
    data: { status: "CLOSED" },
  });
  if (result.count === 0) throw new Error("진행 중(OPEN)인 캠페인만 마감할 수 있어요");
}
