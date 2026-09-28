import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { getCampaignById } from "./campaign";
import { generatePledgeCode } from "./pledge-code";
import { prisma } from "./prisma";
import type { PledgeInput } from "./validation";

const MAX_CODE_ATTEMPTS = 10;

function isUniqueViolation(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

/**
 * PENDING 후원을 만들고 코드를 발급한다.
 * 코드 중복은 미리 조회해서 피하고, 조회와 저장 사이 경합은 unique 제약 위반 시 재시도로 막는다.
 */
export async function createPendingPledge(campaignId: string, input: PledgeInput) {
  for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
    const code = generatePledgeCode();
    const taken = await prisma.pledge.findUnique({ where: { code }, select: { id: true } });
    if (taken) continue;

    try {
      return await prisma.pledge.create({
        data: {
          campaignId,
          code,
          displayName: input.displayName,
          message: input.message || null,
          isAnonymous: input.isAnonymous,
          isAmountPublic: input.isAmountPublic,
          amount: input.amount,
          status: "PENDING",
        },
        select: { code: true },
      });
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
    }
  }
  throw new Error("후원 코드 발급에 실패했습니다 (재시도 초과)");
}

export type PublicPledge = {
  id: string;
  displayName: string; // isAnonymous면 이미 "익명"으로 치환됨
  amount: number | null; // isAmountPublic이 아니면 null
  message: string | null;
  status: "CONFIRMED" | "PENDING";
  createdAt: Date;
};

/**
 * 공개 후원자 목록. CANCELLED는 제외하고, 익명·금액비공개는 여기서 마스킹해서 내려준다.
 * (code는 절대 select 하지 않는다 — 공개 응답에 포함 금지)
 */
export async function getPublicPledges(campaignId: string): Promise<PublicPledge[]> {
  const pledges = await prisma.pledge.findMany({
    where: { campaignId, status: { in: ["CONFIRMED", "PENDING"] } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      displayName: true,
      isAnonymous: true,
      amount: true,
      isAmountPublic: true,
      message: true,
      status: true,
      createdAt: true,
    },
  });

  return pledges.map((p) => ({
    id: p.id,
    displayName: p.isAnonymous ? "익명" : p.displayName,
    amount: p.isAmountPublic ? p.amount : null,
    message: p.message,
    status: p.status as "CONFIRMED" | "PENDING",
    createdAt: p.createdAt,
  }));
}

// ---- 관리자 ----

/** 관리자용 전체 후원 목록. 마스킹 없이 실제 값 그대로 (금액·이름·코드 항상 노출). */
export function listPledgesForAdmin(campaignId: string) {
  return prisma.pledge.findMany({
    where: { campaignId },
    orderBy: { createdAt: "desc" },
  });
}

/** 입금 확인 처리. PENDING일 때만 CONFIRMED로 바뀐다. */
export async function confirmPledge(id: string) {
  const result = await prisma.pledge.updateMany({
    where: { id, status: "PENDING" },
    data: { status: "CONFIRMED" },
  });
  if (result.count === 0) throw new Error("입금 대기 중인 후원만 확인 처리할 수 있어요");
}

// ---- 내 후원 조회/수정/취소 (/my/[code]) ----

/** 코드로 후원을 조회한다. 코드는 서버 발급이라 전역 unique — 본인 확인 수단은 이 코드 자체뿐. */
export function getPledgeByCode(code: string) {
  return prisma.pledge.findUnique({ where: { code } });
}

type MutationResult<T extends object> = ({ ok: true } & T) | { ok: false; error: string };

/**
 * 수정 가능 조건: pledge.status ∈ {PENDING, CONFIRMED} AND campaign.status == OPEN.
 * CONFIRMED 상태에서 금액을 바꾸면 재입금 확인이 필요하므로 PENDING으로 되돌린다.
 */
export async function updatePledgeByCode(
  code: string,
  input: PledgeInput,
): Promise<MutationResult<{ slug: string; revertedToPending: boolean }>> {
  const pledge = await prisma.pledge.findUnique({ where: { code } });
  if (!pledge) return { ok: false, error: "그런 코드를 찾을 수 없어요" };

  const campaign = await getCampaignById(pledge.campaignId);
  if (!campaign || campaign.status !== "OPEN") {
    return { ok: false, error: "마감된 펀딩은 수정할 수 없어요" };
  }

  const revertedToPending = pledge.status === "CONFIRMED" && input.amount !== pledge.amount;
  const result = await prisma.pledge.updateMany({
    where: { id: pledge.id, status: { in: ["PENDING", "CONFIRMED"] } },
    data: {
      displayName: input.displayName,
      message: input.message || null,
      isAnonymous: input.isAnonymous,
      isAmountPublic: input.isAmountPublic,
      amount: input.amount,
      ...(revertedToPending ? { status: "PENDING" as const } : {}),
    },
  });
  if (result.count === 0) return { ok: false, error: "지금은 수정할 수 없어요" };
  return { ok: true, slug: campaign.slug, revertedToPending };
}

/** 취소는 삭제가 아니라 soft delete. CONFIRMED였다면 환불은 관리자가 수동으로 처리한다. */
export async function cancelPledgeByCode(
  code: string,
): Promise<MutationResult<{ slug: string; wasConfirmed: boolean }>> {
  const pledge = await prisma.pledge.findUnique({ where: { code } });
  if (!pledge) return { ok: false, error: "그런 코드를 찾을 수 없어요" };

  const campaign = await getCampaignById(pledge.campaignId);
  if (!campaign || campaign.status !== "OPEN") {
    return { ok: false, error: "마감된 펀딩은 취소할 수 없어요" };
  }

  const wasConfirmed = pledge.status === "CONFIRMED";
  const result = await prisma.pledge.updateMany({
    where: { id: pledge.id, status: { in: ["PENDING", "CONFIRMED"] } },
    data: { status: "CANCELLED" },
  });
  if (result.count === 0) return { ok: false, error: "이미 취소된 후원이에요" };
  return { ok: true, slug: campaign.slug, wasConfirmed };
}
