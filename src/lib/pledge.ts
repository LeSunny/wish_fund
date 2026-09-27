import "server-only";
import { Prisma } from "@/generated/prisma/client";
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
