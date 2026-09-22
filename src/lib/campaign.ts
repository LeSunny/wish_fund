import "server-only";
import { cache } from "react";
import { prisma } from "./prisma";
import { slugSchema } from "./validation";

/**
 * slug로 캠페인을 가져온다. 마감일이 지난 OPEN 캠페인은 여기서 CLOSED로 바꾼다.
 * (Vercel에 상시 워커가 없어서 조회 시점에 lazy 하게 처리. 마감 처리는 이 함수 한 곳에서만.)
 */
export const getCampaign = cache(async (slug: string) => {
  if (!slugSchema.safeParse(slug).success) return null;

  const campaign = await prisma.campaign.findUnique({ where: { slug } });
  if (!campaign) return null;

  if (campaign.status === "OPEN" && campaign.deadline <= new Date()) {
    // 동시 요청이 겹쳐도 한 번만 바뀌도록 updateMany + status 조건
    await prisma.campaign.updateMany({
      where: { id: campaign.id, status: "OPEN" },
      data: { status: "CLOSED" },
    });
    return { ...campaign, status: "CLOSED" as const };
  }

  return campaign;
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
