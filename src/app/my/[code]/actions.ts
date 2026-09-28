"use server";

import { revalidatePath } from "next/cache";
import { cancelPledgeByCode, updatePledgeByCode } from "@/lib/pledge";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { pledgeInputSchema } from "@/lib/validation";

export type UpdateMyPledgeResult =
  | { ok: true; revertedToPending: boolean }
  | { ok: false; error: string };

/** 이름/메시지/공개여부/금액 수정. 조건과 PENDING 되돌림 로직은 lib/pledge.ts 참고. */
export async function updateMyPledge(code: string, input: unknown): Promise<UpdateMyPledgeResult> {
  const ip = await getClientIp();
  if (!rateLimit(`my-edit:${ip}`, 10, 10 * 60_000)) {
    return { ok: false, error: "너무 여러 번 시도했어요. 잠시 후에 다시 해주세요" };
  }

  const parsed = pledgeInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "입력값을 확인해주세요" };
  }

  const result = await updatePledgeByCode(code, parsed.data);
  if (!result.ok) return result;

  revalidatePath(`/my/${code}`);
  revalidatePath(`/c/${result.slug}`);
  revalidatePath(`/c/${result.slug}/success`);
  return { ok: true, revertedToPending: result.revertedToPending };
}

export type CancelMyPledgeResult =
  | { ok: true; wasConfirmed: boolean }
  | { ok: false; error: string };

/** soft cancel. CONFIRMED였다면 환불은 관리자가 수동으로 처리 — 안내는 화면(클라이언트)에서. */
export async function cancelMyPledge(code: string): Promise<CancelMyPledgeResult> {
  const ip = await getClientIp();
  if (!rateLimit(`my-cancel:${ip}`, 10, 10 * 60_000)) {
    return { ok: false, error: "너무 여러 번 시도했어요. 잠시 후에 다시 해주세요" };
  }

  const result = await cancelPledgeByCode(code);
  if (!result.ok) return result;

  revalidatePath(`/my/${code}`);
  revalidatePath(`/c/${result.slug}`);
  revalidatePath(`/c/${result.slug}/success`);
  return { ok: true, wasConfirmed: result.wasConfirmed };
}
