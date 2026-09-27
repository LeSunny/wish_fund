"use client";

import { useActionState, useEffect, useId, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, inputStyles, selectStyles, textareaStyles } from "@/components/ui/Field";
import { GOAL_AMOUNT_MAX } from "@/lib/validation";
import { fetchProductOgAction, saveCampaign, type SaveCampaignState } from "../actions";

export type EditableCampaign = {
  id: string;
  slug: string;
  title: string;
  description: string;
  productUrl: string | null;
  thumbnailUrl: string | null;
  goalAmount: number;
  deadline: Date;
  accountInfo: string | null;
  kakaopayUrl: string | null;
  tossUrl: string | null;
  thanksMessage: string | null;
  status: "DRAFT" | "OPEN" | "CLOSED";
};

const initialSaveState: SaveCampaignState = {};

function toDatetimeLocalValue(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function oneWeekFromNow() {
  return toDatetimeLocalValue(new Date(Date.now() + 7 * 86_400_000));
}

export function CampaignForm({ campaign }: { campaign?: EditableCampaign }) {
  const id = useId();
  const boundSave = saveCampaign.bind(null, campaign?.id ?? null);
  const [state, formAction, pending] = useActionState(boundSave, initialSaveState);
  const [ogState, ogAction, ogPending] = useActionState(fetchProductOgAction, {});

  const [title, setTitle] = useState(campaign?.title ?? "");
  const [thumbnailUrl, setThumbnailUrl] = useState(campaign?.thumbnailUrl ?? "");

  // "자동 채우기" 버튼(fetchProductOgAction)의 결과를 편집 가능한 로컬 상태로 반영한다.
  // ogState는 구독 가능한 외부 스토어가 아니라 액션이 끝날 때 한 번 도착하는 결과값이라
  // useSyncExternalStore로 옮길 수 없고, 렌더 중 파생도 안 된다(그 뒤 사용자가 또 고칠 수 있어야 함).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (ogState.title) setTitle(ogState.title);
    if (ogState.thumbnailUrl) setThumbnailUrl(ogState.thumbnailUrl);
  }, [ogState]);

  const fieldError = (key: string) => state.fieldErrors?.[key];
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
              hint="영문 소문자·숫자·하이픈만. 예) dasom-2026"
              error={fieldError("slug")}
            >
              <input
                id={`${id}-slug`}
                name="slug"
                required
                pattern="[a-z0-9-]+"
                placeholder="dasom-2026"
                aria-invalid={!!fieldError("slug")}
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

          <div className="flex flex-col gap-2 border-t-2 border-dashed border-ink/30 pt-5">
            <Field
              label="상품 URL"
              htmlFor={`${id}-productUrl`}
              hint="입력 후 자동 채우기를 누르면 제목·썸네일을 긁어와요"
              error={fieldError("productUrl") ?? ogState.error}
            >
              <div className="flex gap-2">
                <input
                  id={`${id}-productUrl`}
                  name="productUrl"
                  type="url"
                  defaultValue={campaign?.productUrl ?? ""}
                  placeholder="https://..."
                  aria-invalid={!!fieldError("productUrl")}
                  className={inputStyles}
                />
                <Button
                  type="submit"
                  formAction={ogAction}
                  formNoValidate
                  variant="white"
                  size="sm"
                  disabled={ogPending}
                  className="shrink-0"
                >
                  {ogPending ? "가져오는 중..." : "자동 채우기"}
                </Button>
              </div>
            </Field>

            <Field label="썸네일 URL" htmlFor={`${id}-thumbnailUrl`} error={fieldError("thumbnailUrl")}>
              <div className="flex items-center gap-3">
                <input
                  id={`${id}-thumbnailUrl`}
                  name="thumbnailUrl"
                  type="url"
                  value={thumbnailUrl}
                  onChange={(e) => setThumbnailUrl(e.target.value)}
                  placeholder="https://..."
                  aria-invalid={!!fieldError("thumbnailUrl")}
                  className={inputStyles}
                />
                {thumbnailUrl && (
                  // eslint-disable-next-line @next/next/no-img-element -- 미리보기, 도메인 목록을 미리 알 수 없음
                  <img
                    src={thumbnailUrl}
                    alt=""
                    className="size-12 shrink-0 border-2 border-ink object-cover"
                    onError={(e) => (e.currentTarget.style.visibility = "hidden")}
                    onLoad={(e) => (e.currentTarget.style.visibility = "visible")}
                  />
                )}
              </div>
            </Field>
          </div>

          <div className="grid gap-5 border-t-2 border-dashed border-ink/30 pt-5 sm:grid-cols-2">
            <Field label="목표 금액(원)" htmlFor={`${id}-goalAmount`} error={fieldError("goalAmount")}>
              <input
                id={`${id}-goalAmount`}
                name="goalAmount"
                type="number"
                inputMode="numeric"
                required
                min={1000}
                max={GOAL_AMOUNT_MAX}
                step={1000}
                defaultValue={campaign?.goalAmount}
                aria-invalid={!!fieldError("goalAmount")}
                className={inputStyles}
              />
            </Field>
            <Field label="마감일시" htmlFor={`${id}-deadline`} error={fieldError("deadline")}>
              <input
                id={`${id}-deadline`}
                name="deadline"
                type="datetime-local"
                required
                defaultValue={campaign ? toDatetimeLocalValue(campaign.deadline) : oneWeekFromNow()}
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

      <Button type="submit" size="lg" disabled={pending} block>
        {pending ? "저장 중..." : campaign ? "저장하기" : "캠페인 만들기"}
      </Button>
    </form>
  );
}
