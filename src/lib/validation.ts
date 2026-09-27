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
  .regex(/^[a-z0-9-]+$/, "영문 소문자·숫자·하이픈만 쓸 수 있어요");

// ---- 관리자 ----

export const GOAL_AMOUNT_MAX = 50_000_000;

/** 빈 문자열은 null로 (nullable 필드용 선택 입력) */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => v || null);

const optionalUrl = z
  .string()
  .trim()
  .max(500)
  .refine((v) => v === "" || z.url().safeParse(v).success, "올바른 URL 형식이 아니에요")
  .transform((v) => v || null);

export const campaignInputSchema = z.object({
  slug: slugSchema,
  title: z.string().trim().min(1, "제목을 입력해주세요").max(60, "제목은 60자까지예요"),
  description: z.string().trim().min(1, "설명을 입력해주세요").max(4000, "설명은 4000자까지예요"),
  productUrl: optionalUrl,
  thumbnailUrl: optionalUrl,
  goalAmount: z
    .number({ error: "목표 금액을 입력해주세요" })
    .int()
    .min(1_000, "최소 1,000원 이상으로 설정해주세요")
    .max(GOAL_AMOUNT_MAX, `최대 ${GOAL_AMOUNT_MAX.toLocaleString("ko-KR")}원까지예요`),
  deadline: z.coerce.date({ error: "마감일을 입력해주세요" }),
  accountInfo: optionalText(200),
  kakaopayUrl: optionalUrl,
  tossUrl: optionalUrl,
  thanksMessage: optionalText(200),
  status: z.enum(["DRAFT", "OPEN"]),
});

export type CampaignInput = z.infer<typeof campaignInputSchema>;

export const adminPasswordSchema = z.string().min(1, "비밀번호를 입력해주세요").max(200);
