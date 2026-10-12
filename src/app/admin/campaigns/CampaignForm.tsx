"use client";

import { useActionState, useEffect, useId, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, inputStyles, selectStyles, textareaStyles } from "@/components/ui/Field";
import { formatWon, toKstDatetimeLocal } from "@/lib/format";
import { GOAL_AMOUNT_MAX } from "@/lib/validation";
import {
  checkSlugAction,
  saveCampaign,
  type SaveCampaignState,
  type SlugCheckResult,
} from "../actions";
import {
  ProductsEditor,
  emptyProduct,
  toProductDraft,
  toProductInput,
  type ProductDraft,
} from "./ProductsEditor";

export type EditableCampaign = {
  id: string;
  slug: string;
  title: string;
  description: string;
  products: { title: string; url: string | null; thumbnailUrl: string | null; price: number | null }[];
  goalAmount: number;
  deadline: Date;
  accountInfo: string | null;
  kakaopayUrl: string | null;
  tossUrl: string | null;
  thanksMessage: string | null;
  status: "DRAFT" | "OPEN" | "CLOSED";
};

const initialSaveState: SaveCampaignState = {};

function oneWeekFromNow() {
  return toKstDatetimeLocal(new Date(Date.now() + 7 * 86_400_000));
}

export function CampaignForm({ campaign }: { campaign?: EditableCampaign }) {
  const id = useId();
  const boundSave = saveCampaign.bind(null, campaign?.id ?? null);
  const [state, formAction, pending] = useActionState(boundSave, initialSaveState);

  const [title, setTitle] = useState(campaign?.title ?? "");
  // 상품 목록은 행 추가·삭제·순서 변경이 있어 상태로 관리하고, 제출 때 hidden input에 JSON으로 담는다
  const [products, setProducts] = useState<ProductDraft[]>(() =>
    campaign ? campaign.products.map(toProductDraft) : [emptyProduct()],
  );
  const [goalAmount, setGoalAmount] = useState(campaign ? String(campaign.goalAmount) : "");
  // 가격을 적은 상품의 합계 (목표 금액 제안용)
  const suggestedGoal = products.reduce((sum, p) => sum + (p.price === "" ? 0 : Number(p.price)), 0);

  // 새 캠페인일 때만: 공유 주소를 입력하는 동안 형식·중복을 미리 검사 (입력이 멈추고 0.4초 뒤)
  const [slug, setSlug] = useState("");
  const [slugCheck, setSlugCheck] = useState<{ slug: string; result: SlugCheckResult } | null>(null);
  useEffect(() => {
    if (campaign || !slug) return;
    let stale = false;
    const timer = setTimeout(async () => {
      const result = await checkSlugAction(slug);
      if (!stale) setSlugCheck({ slug, result });
    }, 400);
    return () => {
      stale = true;
      clearTimeout(timer);
    };
  }, [campaign, slug]);
  // 지금 입력값에 대한 결과만 쓴다 (검사 중이거나 예전 입력의 결과면 null)
  const slugResult = slugCheck?.slug === slug ? slugCheck.result : null;
  const slugTaken = slugResult?.ok === false;

  const fieldError = (key: string) => state.fieldErrors?.[key];
  // 저장 후 서버가 준 에러보다 지금 입력값을 검사한 결과를 우선
  const slugError = slugResult ? (slugResult.ok ? undefined : slugResult.error) : fieldError("slug");
  const closed = campaign?.status === "CLOSED";

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <Card title="campaign.txt">
        <div className="flex flex-col gap-5">
          {campaign ? (
            <div>
              <p className="font-pixel text-sm">공유 주소</p>
              <p className="text-sm text-ink/60">
                /c/{campaign.slug} <span className="text-xs">(생성 후에는 못 바꿔요)</span>
              </p>
              <input type="hidden" name="slug" value={campaign.slug} />
            </div>
          ) : (
            <Field
              label="공유 주소 (slug)"
              htmlFor={`${id}-slug`}
              hint={
                slugResult?.ok
                  ? `✓ 쓸 수 있는 주소예요 → /c/${slug}`
                  : "영문 소문자·숫자·하이픈만. 예) dasom-2026"
              }
              error={slugError}
            >
              <input
                id={`${id}-slug`}
                name="slug"
                required
                pattern="[a-z0-9-]+"
                placeholder="dasom-2026"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                value={slug}
                onChange={(e) => setSlug(e.target.value.trim().toLowerCase())}
                aria-invalid={!!slugError}
                className={inputStyles}
              />
            </Field>
          )}

          <Field label="제목" htmlFor={`${id}-title`} error={fieldError("title")}>
            <input
              id={`${id}-title`}
              name="title"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="다솜이 생일선물"
              aria-invalid={!!fieldError("title")}
              className={inputStyles}
            />
          </Field>

          <Field
            label="설명"
            htmlFor={`${id}-description`}
            hint="마크다운 가능 (**굵게**, 목록 등)"
            error={fieldError("description")}
          >
            <textarea
              id={`${id}-description`}
              name="description"
              required
              defaultValue={campaign?.description}
              placeholder="올해 생일엔 이게 갖고 싶어요..."
              aria-invalid={!!fieldError("description")}
              className={textareaStyles}
            />
          </Field>

          <div className="border-t-2 border-dashed border-ink/30 pt-5">
            <ProductsEditor products={products} onChange={setProducts} fieldError={fieldError} />
            <input type="hidden" name="products" value={JSON.stringify(products.map(toProductInput))} />
          </div>

          <div className="grid gap-5 border-t-2 border-dashed border-ink/30 pt-5 sm:grid-cols-2">
            <Field
              label="목표 금액(원)"
              htmlFor={`${id}-goalAmount`}
              error={fieldError("goalAmount")}
              hint={
                suggestedGoal >= 1000 &&
                String(suggestedGoal) !== goalAmount && (
                  <button
                    type="button"
                    onClick={() => setGoalAmount(String(suggestedGoal))}
                    className="underline underline-offset-2"
                  >
                    상품 합계로 채우기 ({formatWon(suggestedGoal)})
                  </button>
                )
              }
            >
              <input
                id={`${id}-goalAmount`}
                name="goalAmount"
                type="number"
                inputMode="numeric"
                required
                min={1000}
                max={GOAL_AMOUNT_MAX}
                step={1}
                value={goalAmount}
                onChange={(e) => setGoalAmount(e.target.value)}
                aria-invalid={!!fieldError("goalAmount")}
                className={inputStyles}
              />
            </Field>
            <Field label="마감일시 (한국 시간)" htmlFor={`${id}-deadline`} error={fieldError("deadline")}>
              <input
                id={`${id}-deadline`}
                name="deadline"
                type="datetime-local"
                required
                defaultValue={campaign ? toKstDatetimeLocal(campaign.deadline) : oneWeekFromNow()}
                aria-invalid={!!fieldError("deadline")}
                className={inputStyles}
              />
            </Field>
          </div>

          <div className="flex flex-col gap-5 border-t-2 border-dashed border-ink/30 pt-5">
            <Field
              label="계좌 정보"
              htmlFor={`${id}-accountInfo`}
              hint="은행/계좌번호/예금주 (선택)"
              error={fieldError("accountInfo")}
            >
              <input
                id={`${id}-accountInfo`}
                name="accountInfo"
                defaultValue={campaign?.accountInfo ?? ""}
                placeholder="카카오뱅크 3333-00-0000000 홍길동"
                className={inputStyles}
              />
            </Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="카카오페이 송금 링크" htmlFor={`${id}-kakaopayUrl`} error={fieldError("kakaopayUrl")}>
                <input
                  id={`${id}-kakaopayUrl`}
                  name="kakaopayUrl"
                  type="url"
                  defaultValue={campaign?.kakaopayUrl ?? ""}
                  placeholder="https://qr.kakaopay.com/..."
                  aria-invalid={!!fieldError("kakaopayUrl")}
                  className={inputStyles}
                />
              </Field>
              <Field label="토스 송금 링크" htmlFor={`${id}-tossUrl`} error={fieldError("tossUrl")}>
                <input
                  id={`${id}-tossUrl`}
                  name="tossUrl"
                  type="url"
                  defaultValue={campaign?.tossUrl ?? ""}
                  placeholder="https://toss.me/..."
                  aria-invalid={!!fieldError("tossUrl")}
                  className={inputStyles}
                />
              </Field>
            </div>
          </div>

          <Field
            label="감사 메시지"
            htmlFor={`${id}-thanksMessage`}
            hint="마감 후 성공 페이지에 보여줄 문구 (선택)"
            error={fieldError("thanksMessage")}
          >
            <textarea
              id={`${id}-thanksMessage`}
              name="thanksMessage"
              defaultValue={campaign?.thanksMessage ?? ""}
              placeholder="보태준 모두 고마워요!! 잘 쓸게요 ♡"
              className={textareaStyles}
            />
          </Field>

          <div className="border-t-2 border-dashed border-ink/30 pt-5">
            {closed ? (
              <div>
                <p className="font-pixel text-sm">상태</p>
                <p className="text-sm text-ink/60">마감됨 (더 이상 바꿀 수 없어요)</p>
              </div>
            ) : (
              <Field label="상태" htmlFor={`${id}-status`} error={fieldError("status")}>
                <select
                  id={`${id}-status`}
                  name="status"
                  defaultValue={campaign?.status ?? "DRAFT"}
                  className={selectStyles}
                >
                  <option value="DRAFT">임시저장 (공개 페이지 비공개)</option>
                  <option value="OPEN">진행 중 (공개)</option>
                </select>
              </Field>
            )}
          </div>
        </div>
      </Card>

      {state.error && (
        <p role="alert" className="border-2 border-red bg-white p-3 text-sm text-red">
          ✕ {state.error}
        </p>
      )}

      <Button type="submit" size="lg" disabled={pending || slugTaken} block>
        {pending ? "저장 중..." : campaign ? "저장하기" : "캠페인 만들기"}
      </Button>
    </form>
  );
}
