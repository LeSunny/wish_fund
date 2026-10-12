"use server";

import { revalidatePath } from "next/cache";
import type { z } from "zod";
import { redirect } from "next/navigation";
import { Prisma } from "@/generated/prisma/client";
import {
  createAdminSession,
  destroyAdminSession,
  requireAdminSession,
  verifyAdminPassword,
} from "@/lib/admin-session";
import { closeCampaignNow, createCampaign, isSlugTaken, updateCampaign } from "@/lib/campaign";
import { fetchOpenGraph } from "@/lib/og-scrape";
import { confirmPledge } from "@/lib/pledge";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { adminPasswordSchema, campaignInputSchema, campaignUpdateSchema, slugSchema } from "@/lib/validation";

function isUniqueViolation(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

// ---- 로그인 / 로그아웃 ----

export type LoginState = { error?: string };

export async function loginAdmin(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const ip = await getClientIp();
  if (!rateLimit(`admin-login:${ip}`, 10, 10 * 60_000)) {
    return { error: "너무 여러 번 시도했어요. 잠시 후에 다시 해주세요" };
  }

  const parsed = adminPasswordSchema.safeParse(formData.get("password"));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "비밀번호를 입력해주세요" };
  if (!verifyAdminPassword(parsed.data)) return { error: "비밀번호가 맞지 않아요" };

  await createAdminSession();
  redirect("/admin");
}

export async function logoutAdmin() {
  await destroyAdminSession();
  redirect("/admin");
}

// ---- 캠페인 생성/수정 ----

export type SaveCampaignState = { error?: string; fieldErrors?: Record<string, string> };

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function campaignInputFromFormData(formData: FormData) {
  const str = (key: string) => String(formData.get(key) ?? "");
  return {
    slug: str("slug"),
    title: str("title"),
    description: str("description"),
    // 상품 목록은 폼이 hidden input에 JSON으로 담아 보낸다. 깨진 JSON은 null → zod가 거부
    products: parseJson(str("products")),
    goalAmount: Number(str("goalAmount")),
    deadline: str("deadline"),
    accountInfo: str("accountInfo"),
    kakaopayUrl: str("kakaopayUrl"),
    tossUrl: str("tossUrl"),
    thanksMessage: str("thanksMessage"),
    // 마감된 캠페인은 폼에 상태 칸이 없다 → undefined (수정 스키마에서 선택)
    status: formData.has("status") ? str("status") : undefined,
  };
}

function invalidInput(error: z.ZodError): SaveCampaignState {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    // 상품 필드는 "products.0.title"처럼 경로 전체를 키로 (폼이 상품 행별로 찾아 표시)
    fieldErrors[issue.path.join(".")] ??= issue.message;
  }
  return { error: "입력값을 확인해주세요", fieldErrors };
}

/** id가 있으면 수정, 없으면 생성. useActionState에 `saveCampaign.bind(null, id)`로 바인딩해서 쓴다. */
export async function saveCampaign(
  id: string | null,
  _prev: SaveCampaignState,
  formData: FormData,
): Promise<SaveCampaignState> {
  await requireAdminSession();

  const input = campaignInputFromFormData(formData);

  let targetId: string;
  let slug: string;
  if (id) {
    const parsed = campaignUpdateSchema.safeParse(input);
    if (!parsed.success) return invalidInput(parsed.error);
    slug = (await updateCampaign(id, parsed.data)).slug;
    targetId = id;
  } else {
    const parsed = campaignInputSchema.safeParse(input);
    if (!parsed.success) return invalidInput(parsed.error);
    try {
      targetId = (await createCampaign(parsed.data)).id;
    } catch (error) {
      if (isUniqueViolation(error)) {
        return { error: "이미 사용 중인 주소(slug)예요", fieldErrors: { slug: "다른 주소를 써주세요" } };
      }
      throw error;
    }
    slug = parsed.data.slug;
  }

  revalidatePath("/admin");
  revalidatePath(`/admin/campaigns/${targetId}`);
  revalidatePath(`/c/${slug}`);
  revalidatePath(`/c/${slug}/success`);
  // 상세 페이지도 같은 폼이라 거기로 보내면 저장됐는지 티가 안 난다 → 목록으로
  redirect("/admin");
}

export type SlugCheckResult = { ok: true } | { ok: false; error: string };

/** 새 캠페인 폼에서 입력 중인 공유 주소를 미리 검사 (형식 + 중복). */
export async function checkSlugAction(slug: string): Promise<SlugCheckResult> {
  await requireAdminSession();

  const parsed = slugSchema.safeParse(slug);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "주소 형식을 확인해주세요" };
  if (await isSlugTaken(parsed.data)) return { ok: false, error: "이미 사용 중인 주소예요" };
  return { ok: true };
}

/** 마감일과 무관하게 지금 바로 마감. 관리자 상세 페이지에 남아 최신 상태를 본다. */
export async function closeCampaignAction(id: string, slug: string) {
  await requireAdminSession();
  await closeCampaignNow(id);
  revalidatePath(`/admin/campaigns/${id}`);
  revalidatePath(`/c/${slug}`);
  revalidatePath(`/c/${slug}/success`);
}

// ---- 후원 확인 ----

export async function confirmPledgeAction(slug: string, pledgeId: string) {
  await requireAdminSession();
  try {
    await confirmPledge(pledgeId);
  } catch {
    // 이미 CONFIRMED/CANCELLED인 뒤 중복 클릭 등 — 조용히 무시, 화면은 최신 상태로 새로고침됨
  }
  revalidatePath(`/c/${slug}`);
  revalidatePath(`/c/${slug}/success`);
}

// ---- 상품 URL → OG 자동 채우기 ----

export type OgFetchResult = { title?: string; thumbnailUrl?: string; error?: string };

/** 상품 URL → OG 제목·썸네일. 관리자 폼의 상품 행마다 "자동 채우기"로 직접 호출한다. */
export async function fetchProductOg(rawUrl: string): Promise<OgFetchResult> {
  await requireAdminSession();

  const url = rawUrl.trim();
  if (!url) return { error: "상품 URL을 먼저 입력해주세요" };

  try {
    const og = await fetchOpenGraph(url);
    if (!og.title && !og.image) return { error: "가져올 수 있는 정보가 없어요. 직접 입력해주세요" };
    return { title: og.title ?? undefined, thumbnailUrl: og.image ?? undefined };
  } catch {
    return { error: "자동으로 못 가져왔어요. 직접 입력해주세요" };
  }
}
