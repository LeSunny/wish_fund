import { z } from "zod";

// 클라이언트/서버 공용. 서버 전용 모듈을 import 하지 말 것.

export const AMOUNT_UNIT = 1_000;
export const AMOUNT_MIN = 1_000;
export const AMOUNT_MAX = 1_000_000; // 오타 방지용 상한
export const AMOUNT_PRESETS = Array.from({ length: 10 }, (_, i) => (i + 1) * 10_000);

export const DISPLAY_NAME_MAX = 20;
export const MESSAGE_MAX = 60;

export const amountSchema = z
  .number({ error: "금액을 입력해주세요" })
  .int("금액은 숫자로 입력해주세요")
  .min(AMOUNT_MIN, `최소 ${AMOUNT_MIN.toLocaleString("ko-KR")}원부터 보탤 수 있어요`)
  .max(AMOUNT_MAX, `한 번에 최대 ${AMOUNT_MAX.toLocaleString("ko-KR")}원까지 보탤 수 있어요`)
  .multipleOf(AMOUNT_UNIT, "1,000원 단위로 입력해주세요");

export const pledgeInputSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, "이름이나 닉네임을 적어주세요")
    .max(DISPLAY_NAME_MAX, `이름은 ${DISPLAY_NAME_MAX}자까지예요`),
  message: z.string().trim().max(MESSAGE_MAX, `메시지는 ${MESSAGE_MAX}자까지예요`),
  isAnonymous: z.boolean(),
  isAmountPublic: z.boolean(),
  amount: amountSchema,
});

export type PledgeInput = z.infer<typeof pledgeInputSchema>;

export const slugSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-z0-9-]+$/);
