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
