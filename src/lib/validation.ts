import { z } from "zod";
import { parseKstDatetimeLocal } from "./format";

// 클라이언트/서버 공용. 서버 전용 모듈을 import 하지 말 것.

export const AMOUNT_MIN = 1_000; // 금액 단위는 자유(1원 단위), 너무 작은 장난 후원만 막는다
export const AMOUNT_MAX = 1_000_000; // 오타 방지용 상한
export const AMOUNT_PRESETS = Array.from({ length: 10 }, (_, i) => (i + 1) * 10_000);

export const DISPLAY_NAME_MAX = 20;
export const MESSAGE_MAX = 60;

export const amountSchema = z
  .number({ error: "금액을 입력해주세요" })
  .int("금액은 숫자로 입력해주세요")
  .min(AMOUNT_MIN, `최소 ${AMOUNT_MIN.toLocaleString("ko-KR")}원부터 보탤 수 있어요`)
  .max(AMOUNT_MAX, `한 번에 최대 ${AMOUNT_MAX.toLocaleString("ko-KR")}원까지 보탤 수 있어요`);

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

export const PRODUCTS_MAX = 5;

export const productInputSchema = z.object({
  title: z.string().trim().min(1, "상품 이름을 입력해주세요").max(60, "상품 이름은 60자까지예요"),
  url: optionalUrl,
  thumbnailUrl: optionalUrl,
  // 참고용 가격 (목표 금액 자동 제안에만 사용). 비우면 null
  price: z
    .number()
    .int("원 단위 정수로 입력해주세요")
    .min(0, "0원 이상으로 입력해주세요")
    .max(GOAL_AMOUNT_MAX, `최대 ${GOAL_AMOUNT_MAX.toLocaleString("ko-KR")}원까지예요`)
    .nullable(),
});

export type ProductInput = z.infer<typeof productInputSchema>;

export const campaignInputSchema = z.object({
  slug: slugSchema,
  title: z.string().trim().min(1, "제목을 입력해주세요").max(60, "제목은 60자까지예요"),
  description: z.string().trim().min(1, "설명을 입력해주세요").max(4000, "설명은 4000자까지예요"),
  // 순서 = 화면 표시 순서. 첫 번째 상품의 썸네일이 공유(OG) 이미지
  products: z
    .array(productInputSchema, { error: "상품 정보를 확인해주세요" })
    .max(PRODUCTS_MAX, `상품은 최대 ${PRODUCTS_MAX}개까지예요`),
  goalAmount: z
    .number({ error: "목표 금액을 입력해주세요" })
    .int()
    .min(1_000, "최소 1,000원 이상으로 설정해주세요")
    .max(GOAL_AMOUNT_MAX, `최대 ${GOAL_AMOUNT_MAX.toLocaleString("ko-KR")}원까지예요`),
  // 폼의 datetime-local 값을 한국 시간으로 해석 (z.coerce.date는 서버 시간대를 따라가서 UTC 서버에선 9시간 밀림)
  deadline: z.string().transform((v, ctx) => {
    const date = parseKstDatetimeLocal(v);
    if (!date) {
      ctx.addIssue({ code: "custom", message: "마감일을 입력해주세요" });
      return z.NEVER;
    }
    return date;
  }),
  accountInfo: optionalText(200),
  kakaopayUrl: optionalUrl,
  tossUrl: optionalUrl,
  thanksMessage: optionalText(200),
  status: z.enum(["DRAFT", "OPEN"]),
});

export type CampaignInput = z.infer<typeof campaignInputSchema>;

// 수정: slug는 생성 후 불변이라 받지 않는다. 마감(CLOSED)된 캠페인은 폼에 상태 칸이 없으므로 status는 선택.
export const campaignUpdateSchema = campaignInputSchema
  .omit({ slug: true })
  .extend({ status: campaignInputSchema.shape.status.optional() });

export type CampaignUpdateInput = z.infer<typeof campaignUpdateSchema>;

export const adminPasswordSchema = z.string().min(1, "비밀번호를 입력해주세요").max(200);
