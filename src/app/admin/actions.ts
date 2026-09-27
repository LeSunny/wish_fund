"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@/generated/prisma/client";
import {
  createAdminSession,
  destroyAdminSession,
  requireAdminSession,
  verifyAdminPassword,
} from "@/lib/admin-session";
import { closeCampaignNow, createCampaign, updateCampaign } from "@/lib/campaign";
import { fetchOpenGraph } from "@/lib/og-scrape";
import { confirmPledge } from "@/lib/pledge";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { adminPasswordSchema, campaignInputSchema } from "@/lib/validation";

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

function campaignInputFromFormData(formData: FormData) {
  const str = (key: string) => String(formData.get(key) ?? "");
  return {
    slug: str("slug"),
    title: str("title"),
    description: str("description"),
    productUrl: str("productUrl"),
    thumbnailUrl: str("thumbnailUrl"),
    goalAmount: Number(str("goalAmount")),
    deadline: str("deadline"),
    accountInfo: str("accountInfo"),
    kakaopayUrl: str("kakaopayUrl"),
    tossUrl: str("tossUrl"),
    thanksMessage: str("thanksMessage"),
    status: str("status"),
  };
}

/** id가 있으면 수정, 없으면 생성. useActionState에 `saveCampaign.bind(null, id)`로 바인딩해서 쓴다. */
export async function saveCampaign(
  id: string | null,
  _prev: SaveCampaignState,
  formData: FormData,
): Promise<SaveCampaignState> {
  await requireAdminSession();

  const parsed = campaignInputSchema.safeParse(campaignInputFromFormData(formData));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0]);
      fieldErrors[key] ??= issue.message;
    }
    return { error: "입력값을 확인해주세요", fieldErrors };
  }

  let targetId: string;
  try {
    if (id) {
      // slug는 수정 폼에 없음(생성 후 불변) — 구조분해로 걷어내고 나머지만 반영
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { slug: _slug, ...rest } = parsed.data;
      await updateCampaign(id, rest);
      targetId = id;
    } else {
      targetId = (await createCampaign(parsed.data)).id;
    }
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { error: "이미 사용 중인 주소(slug)예요", fieldErrors: { slug: "다른 주소를 써주세요" } };
    }
    throw error;
  }

  revalidatePath("/admin");
  revalidatePath(`/c/${parsed.data.slug}`);
  revalidatePath(`/c/${parsed.data.slug}/success`);
  redirect(`/admin/campaigns/${targetId}`);
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

export type OgFetchState = { title?: string; thumbnailUrl?: string; error?: string };

export async function fetchProductOgAction(
  _prev: OgFetchState,
  formData: FormData,
): Promise<OgFetchState> {
  await requireAdminSession();

  const url = String(formData.get("productUrl") ?? "").trim();
  if (!url) return { error: "상품 URL을 먼저 입력해주세요" };

  try {
    const og = await fetchOpenGraph(url);
    if (!og.title && !og.image) return { error: "가져올 수 있는 정보가 없어요. 직접 입력해주세요" };
    return { title: og.title ?? undefined, thumbnailUrl: og.image ?? undefined };
  } catch {
    return { error: "자동으로 못 가져왔어요. 직접 입력해주세요" };
  }
}
