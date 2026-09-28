"use client";

import { useId, useState, useTransition } from "react";
import { ButtonLink, Button, buttonStyles } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Checkbox, Field, inputStyles } from "@/components/ui/Field";
import { cn } from "@/lib/cn";
import { formatWon } from "@/lib/format";
import {
  AMOUNT_MAX,
  AMOUNT_PRESETS,
  DISPLAY_NAME_MAX,
  MESSAGE_MAX,
  amountSchema,
  pledgeInputSchema,
  type PledgeInput,
} from "@/lib/validation";
import { cancelMyPledge, updateMyPledge } from "./actions";

type PledgeStatus = "PENDING" | "CONFIRMED" | "CANCELLED";

type PledgeView = {
  displayName: string;
  message: string | null;
  isAnonymous: boolean;
  isAmountPublic: boolean;
  amount: number;
  status: PledgeStatus;
};

const STATUS_LABEL: Record<PledgeStatus, string> = {
  PENDING: "입금 대기 중",
  CONFIRMED: "입금 확인 완료",
  CANCELLED: "취소됨",
};

const MAX_AMOUNT_DIGITS = String(AMOUNT_MAX).length;

export function MyPledgeView({
  code,
  campaignSlug,
  campaignClosed,
  editable,
  pledge: initialPledge,
}: {
  code: string;
  campaignSlug: string;
  campaignClosed: boolean;
  editable: boolean;
  pledge: PledgeView;
}) {
  const [pledge, setPledge] = useState(initialPledge);
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [notice, setNotice] = useState<string | null>(null);
  const [cancelArmed, setCancelArmed] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function startEdit() {
    setServerError(null);
    setNotice(null);
    setMode("edit");
  }

  function handleSaved(next: PledgeInput, revertedToPending: boolean) {
    setPledge({ ...next, status: revertedToPending ? "PENDING" : pledge.status });
    setNotice(
      revertedToPending
        ? "금액이 바뀌어서 입금 대기 상태로 되돌아갔어요. 재입금 확인이 필요해요."
        : "수정했어요.",
    );
    setMode("view");
  }

  function handleCancel() {
    startTransition(async () => {
      const result = await cancelMyPledge(code);
      if (!result.ok) {
        setServerError(result.error);
        setCancelArmed(false);
        return;
      }
      setPledge((p) => ({ ...p, status: "CANCELLED" }));
      setCancelArmed(false);
      setNotice(
        result.wasConfirmed
          ? "취소됐어요. 이미 확인된 입금이라 환불은 주인공이 직접 계좌로 보내드려요."
          : "취소됐어요.",
      );
    });
  }

  if (mode === "edit") {
    return (
      <EditForm
        code={code}
        pledge={pledge}
        onCancel={() => setMode("view")}
        onSaved={handleSaved}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Card title="my_pledge.txt">
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          <dt className="font-pixel">상태</dt>
          <dd>{STATUS_LABEL[pledge.status]}</dd>
          <dt className="font-pixel">이름</dt>
          <dd>
            {pledge.displayName}
            {pledge.isAnonymous && <span className="text-ink/60"> (목록엔 익명)</span>}
          </dd>
          <dt className="font-pixel">금액</dt>
          <dd>
            {formatWon(pledge.amount)}
            <span className="text-ink/60"> ({pledge.isAmountPublic ? "공개" : "비공개"})</span>
          </dd>
          <dt className="font-pixel">메시지</dt>
          <dd>{pledge.message || <span className="text-ink/40">없음</span>}</dd>
        </dl>
      </Card>

      {notice && (
        <p className="border-2 border-ink bg-butter p-3 text-sm leading-relaxed">{notice}</p>
      )}
      {serverError && (
        <p role="alert" className="border-2 border-red bg-white p-3 text-sm text-red">
          ✕ {serverError}
        </p>
      )}

      {pledge.status === "CANCELLED" ? (
        <p className="text-sm text-ink/60">취소된 후원이에요. 더 이상 수정할 수 없어요.</p>
      ) : campaignClosed ? (
        <p className="text-sm text-ink/60">마감된 펀딩이라 더 이상 수정·취소할 수 없어요.</p>
      ) : editable ? (
        <div className="flex flex-col gap-3">
          {pledge.status === "CONFIRMED" && (
            <p className="text-xs text-ink/60">
              입금 확인된 후원이에요. 금액을 바꾸면 재입금 확인을 위해 입금 대기 상태로 되돌아가요.
            </p>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Button variant="white" onClick={startEdit} disabled={isPending}>
              수정하기
            </Button>
            {!cancelArmed ? (
              <Button variant="white" onClick={() => setCancelArmed(true)} disabled={isPending}>
                취소하기
              </Button>
            ) : (
              <Button onClick={handleCancel} disabled={isPending}>
                {isPending ? "처리 중..." : "정말 취소할래요"}
              </Button>
            )}
          </div>
          {cancelArmed && (
            <div className="flex items-center justify-between gap-3 border-2 border-ink bg-white px-3 py-2">
              <span className="text-sm">
                {pledge.status === "CONFIRMED"
                  ? "이미 입금 확인된 후원이에요. 취소하면 환불은 주인공이 수동으로 보내드려요. 정말 취소할까요?"
                  : "정말 취소할까요? 되돌릴 수 없어요."}
              </span>
              <Button variant="white" size="sm" onClick={() => setCancelArmed(false)} disabled={isPending}>
                아니요
              </Button>
            </div>
          )}
        </div>
      ) : null}

      <ButtonLink href={`/c/${campaignSlug}`} variant="white" block>
        펀딩 페이지로 돌아가기
      </ButtonLink>
    </div>
  );
}

function EditForm({
  code,
  pledge,
  onCancel,
  onSaved,
}: {
  code: string;
  pledge: PledgeView;
  onCancel: () => void;
  onSaved: (next: PledgeInput, revertedToPending: boolean) => void;
}) {
  const [displayName, setDisplayName] = useState(pledge.displayName);
  const [message, setMessage] = useState(pledge.message ?? "");
  const [isAnonymous, setIsAnonymous] = useState(pledge.isAnonymous);
  const [isAmountPublic, setIsAmountPublic] = useState(pledge.isAmountPublic);
  const [amount, setAmount] = useState<number | null>(pledge.amount);
  const [errors, setErrors] = useState<Partial<Record<keyof PledgeInput, string>>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const id = useId();

  const amountError =
    errors.amount ?? (amount !== null ? amountSchema.safeParse(amount).error?.issues[0]?.message : undefined);

  function handleAmountText(text: string) {
    const digits = text.replace(/\D/g, "").slice(0, MAX_AMOUNT_DIGITS);
    setAmount(digits ? Number(digits) : null);
    setErrors((e) => ({ ...e, amount: undefined }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const input = { displayName, message, isAnonymous, isAmountPublic, amount: amount ?? NaN };
    const result = pledgeInputSchema.safeParse(input);
    if (!result.success) {
      const next: Partial<Record<keyof PledgeInput, string>> = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof PledgeInput;
        next[key] ??= key === "amount" && amount === null ? "금액을 입력해주세요" : issue.message;
      }
      setErrors(next);
      return;
    }
    setServerError(null);
    startTransition(async () => {
      const res = await updateMyPledge(code, result.data);
      if (res.ok) {
        onSaved(result.data, res.revertedToPending);
      } else {
        setServerError(res.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
      <Card title="edit_pledge.txt">
        <div className="flex flex-col gap-5">
          <fieldset className="flex flex-col gap-4">
            <legend className="mb-1 font-pixel text-base">금액</legend>
            <div className="grid grid-cols-5 gap-2">
              {AMOUNT_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  aria-pressed={amount === preset}
                  onClick={() => {
                    setAmount(preset);
                    setErrors((e) => ({ ...e, amount: undefined }));
                  }}
                  className={cn(
                    buttonStyles({ variant: amount === preset ? "orange" : "white", size: "sm" }),
                    "px-0",
                  )}
                >
                  {preset / 10_000}만
                </button>
              ))}
            </div>
            <Field
              label="직접 입력"
              htmlFor={`${id}-amount`}
              hint="1,000원 단위 · 최소 1,000원"
              error={amountError}
              errorId={`${id}-amount-error`}
            >
              <div className="relative">
                <input
                  id={`${id}-amount`}
                  inputMode="numeric"
                  autoComplete="off"
                  value={amount === null ? "" : amount.toLocaleString("ko-KR")}
                  onChange={(e) => handleAmountText(e.target.value)}
                  aria-invalid={!!amountError}
                  aria-describedby={amountError ? `${id}-amount-error` : undefined}
                  className={cn(inputStyles, "pr-10 text-right font-pixel text-lg")}
                />
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center font-pixel">
                  원
                </span>
              </div>
            </Field>
          </fieldset>

          <Field label="이름 또는 닉네임" htmlFor={`${id}-name`} error={errors.displayName}>
            <input
              id={`${id}-name`}
              value={displayName}
              maxLength={DISPLAY_NAME_MAX}
              onChange={(e) => setDisplayName(e.target.value)}
              aria-invalid={!!errors.displayName}
              className={inputStyles}
            />
          </Field>
          <Field
            label="축하 한마디 (선택)"
            htmlFor={`${id}-message`}
            hint={`${message.length}/${MESSAGE_MAX}`}
            error={errors.message}
          >
            <input
              id={`${id}-message`}
              value={message}
              maxLength={MESSAGE_MAX}
              onChange={(e) => setMessage(e.target.value)}
              aria-invalid={!!errors.message}
              className={inputStyles}
            />
          </Field>
          <div className="flex flex-col gap-4 border-t-2 border-dashed border-ink/30 pt-5">
            <Checkbox
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
              label="익명으로 보태기"
              description="후원자 목록에 '익명'으로 보여요."
            />
            <Checkbox
              checked={isAmountPublic}
              onChange={(e) => setIsAmountPublic(e.target.checked)}
              label="금액 공개하기"
              description="체크하면 후원자 목록에 금액이 같이 보여요."
            />
          </div>

          {pledge.status === "CONFIRMED" && (
            <p className="text-xs text-ink/60">
              금액을 바꾸면 재입금 확인을 위해 입금 대기 상태로 되돌아가요.
            </p>
          )}
        </div>
      </Card>

      {serverError && (
        <p role="alert" className="border-2 border-red bg-white p-3 text-sm text-red">
          ✕ {serverError}
        </p>
      )}

      <div className="grid grid-cols-[auto_1fr] gap-3">
        <Button type="button" variant="white" onClick={onCancel} disabled={isPending}>
          그만두기
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? "저장 중..." : "저장하기"}
        </Button>
      </div>
    </form>
  );
}
