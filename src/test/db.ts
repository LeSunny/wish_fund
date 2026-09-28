import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export { prisma };

export async function resetDb() {
  await prisma.pledge.deleteMany();
  await prisma.campaign.deleteMany();
}

let seq = 0;

export function makeCampaign(data: Partial<Prisma.CampaignCreateInput> = {}) {
  seq++;
  return prisma.campaign.create({
    data: {
      slug: `test-${seq}`,
      title: `테스트 캠페인 ${seq}`,
      description: "설명",
      goalAmount: 100_000,
      deadline: new Date(Date.now() + 24 * 60 * 60 * 1000),
      status: "OPEN",
      ...data,
    },
  });
}

export function makePledge(
  campaignId: string,
  data: Partial<Omit<Prisma.PledgeUncheckedCreateInput, "campaignId">> = {},
) {
  seq++;
  return prisma.pledge.create({
    data: {
      campaignId,
      code: `귤-${10 + (seq % 90)}-딸기${seq}`,
      displayName: `후원자${seq}`,
      amount: 10_000,
      status: "PENDING",
      ...data,
    },
  });
}
