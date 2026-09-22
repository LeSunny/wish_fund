"use server";

import { revalidatePath } from "next/cache";
import { getCampaign } from "@/lib/campaign";
import { createPendingPledge } from "@/lib/pledge";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { pledgeInputSchema } from "@/lib/validation";

export type CreatePledgeResult = { ok: true; code: string } | { ok: false; error: string };

/** "송금했어요" 클릭 시 PENDING 후원 생성 + 코드 발급 */
export async function createPledge(slug: string, input: unknown): Promise<CreatePledgeResult> {
  const ip = await getClientIp();
  if (!rateLimit(`pledge:${ip}`, 10, 10 * 60_000)) {
    return { ok: false, error: "너무 여러 번 시도했어요. 잠시 후에 다시 해주세요" };
  }

  const parsed = pledgeInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "입력값을 확인해주세요" };
  }

  const campaign = await getCampaign(slug);
  if (!campaign || campaign.status !== "OPEN") {
    return { ok: false, error: "지금은 후원할 수 없는 펀딩이에요 (마감됐거나 없는 펀딩)" };
  }

  const { code } = await createPendingPledge(campaign.id, parsed.data);
  revalidatePath(`/c/${slug}`);
  return { ok: true, code };
}
