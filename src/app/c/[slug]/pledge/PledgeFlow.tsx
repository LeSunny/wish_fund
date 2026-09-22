"use client";

import { useEffect, useId, useState, useTransition } from "react";
import { CopyButton } from "@/components/CopyButton";
import { Button, ButtonLink, buttonStyles } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Sparkle } from "@/components/ui/Deco";
import { Checkbox, Field, inputStyles } from "@/components/ui/Field";
import { cn } from "@/lib/cn";
import { extractAccountNumber, formatWon } from "@/lib/format";
import {
  AMOUNT_MAX,
  AMOUNT_PRESETS,
  DISPLAY_NAME_MAX,
  MESSAGE_MAX,
  amountSchema,
  pledgeInputSchema,
  type PledgeInput,
} from "@/lib/validation";
import { createPledge } from "./actions";

type Step = "form" | "transfer" | "done";
type Errors = Partial<Record<keyof PledgeInput, string>>;

export type TransferInfo = {
  accountInfo: string | null;
  kakaopayUrl: string | null;
  tossUrl: string | null;
};

const STEPS: { key: Step; label: string }[] = [
  { key: "form", label: "금액·이름" },
  { key: "transfer", label: "송금" },
  { key: "done", label: "코드 받기" },
];

const MAX_AMOUNT_DIGITS = String(AMOUNT_MAX).length;

export function PledgeFlow({ slug, transfer }: { slug: string; transfer: TransferInfo }) {
  const [step, setStep] = useState<Step>("form");
  // 금액은 숫자 하나만 상태로 두고, 버튼 선택/입력창 표시는 모두 여기서 파생 → 항상 동기화
  const [amount, setAmount] = useState<number | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [message, setMessage] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isAmountPublic, setIsAmountPublic] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const id = useId();

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [step]);

  const input = { displayName, message, isAnonymous, isAmountPublic, amount: amount ?? NaN };

  // 금액은 입력 중에도 바로 안내 (빈 값일 땐 조용히)
  const amountError =
    errors.amount ?? (amount !== null ? amountSchema.safeParse(amount).error?.issues[0]?.message : undefined);

  function handleAmountText(text: string) {
    const digits = text.replace(/\D/g, "").slice(0, MAX_AMOUNT_DIGITS);
    setAmount(digits ? Number(digits) : null);
    setErrors((e) => ({ ...e, amount: undefined }));
  }

  function handleNext(e: React.FormEvent) {
    e.preventDefault();
    const result = pledgeInputSchema.safeParse(input);
    if (!result.success) {
      const next: Errors = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof PledgeInput;
        next[key] ??= key === "amount" && amount === null ? "금액을 골라주세요" : issue.message;
      }
      setErrors(next);
      // 화면 위에서부터 첫 번째 에러 칸으로 포커스
      const fieldIds = { amount: "amount", displayName: "name", message: "message" } as const;
      const first = (Object.keys(fieldIds) as (keyof typeof fieldIds)[]).find((k) => next[k]);
      if (first) document.getElementById(`${id}-${fieldIds[first]}`)?.focus();
      return;
    }
    setErrors({});
    setServerError(null);
    setStep("transfer");
  }

  function handleSent() {
    setServerError(null);
    startTransition(async () => {
      const result = await createPledge(slug, input);
      if (result.ok) {
        setCode(result.code);
        setStep("done");
      } else {
        setServerError(result.error);
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <ol className="flex gap-2" aria-label="후원 단계">
        {STEPS.map((s, i) => (
          <li
            key={s.key}
            aria-current={s.key === step ? "step" : undefined}
            className={cn(
              "flex-1 border-2 border-ink px-2 py-1.5 text-center font-pixel text-xs",
              s.key === step ? "bg-orange" : "bg-white/60 text-ink/50",
            )}
          >
            {i + 1}. {s.label}
          </li>
        ))}
      </ol>

      {step === "form" && (
        <form onSubmit={handleNext} noValidate className="flex flex-col gap-6">
          <Card title="how_much.txt">
            <fieldset className="flex flex-col gap-4">
              <legend className="mb-3 font-pixel text-base">얼마를 보탤까요?</legend>
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
                    placeholder="예) 15,000"
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
          </Card>

          <Card title="who_are_you.txt">
            <div className="flex flex-col gap-5">
              <Field
                label="이름 또는 닉네임"
                htmlFor={`${id}-name`}
                error={errors.displayName}
                errorId={`${id}-name-error`}
              >
                <input
                  id={`${id}-name`}
                  value={displayName}
                  maxLength={DISPLAY_NAME_MAX}
                  autoComplete="nickname"
                  placeholder="예) 귤잼"
                  onChange={(e) => setDisplayName(e.target.value)}
                  aria-invalid={!!errors.displayName}
                  aria-describedby={errors.displayName ? `${id}-name-error` : undefined}
                  className={inputStyles}
                />
              </Field>
              <Field
                label="축하 한마디 (선택)"
                htmlFor={`${id}-message`}
                hint={`${message.length}/${MESSAGE_MAX}`}
                error={errors.message}
                errorId={`${id}-message-error`}
              >
                <input
                  id={`${id}-message`}
                  value={message}
                  maxLength={MESSAGE_MAX}
                  placeholder="생일 축하해!!"
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
                  description="후원자 목록에 '익명'으로 보여요. 이름은 주인공만 볼 수 있어요."
                />
                <Checkbox
                  checked={isAmountPublic}
                  onChange={(e) => setIsAmountPublic(e.target.checked)}
                  label="금액 공개하기"
                  description="체크하면 후원자 목록에 금액이 같이 보여요."
                />
              </div>
            </div>
          </Card>

          <Button type="submit" size="lg" block>
            다음: 송금하러 가기 →
          </Button>
        </form>
      )}

      {step === "transfer" && amount !== null && (
        <div className="flex flex-col gap-6">
          <Card title="send_money.txt">
            <div className="flex flex-col gap-5">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-sm">이만큼 보내주세요</p>
                  <p className="font-pixel text-4xl">{formatWon(amount)}</p>
                </div>
                <CopyButton text={String(amount)} variant="white" size="sm">
                  금액 복사
                </CopyButton>
              </div>

              {transfer.kakaopayUrl || transfer.tossUrl || transfer.accountInfo ? (
                <div className="flex flex-col gap-3">
                  {transfer.kakaopayUrl && (
                    <a
                      href={transfer.kakaopayUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={buttonStyles({ variant: "butter", block: true })}
                    >
                      카카오페이로 보내기 ↗
                    </a>
                  )}
                  {transfer.tossUrl && (
                    <a
                      href={transfer.tossUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={buttonStyles({ variant: "periwinkle", block: true })}
                    >
                      토스로 보내기 ↗
                    </a>
                  )}
                  {transfer.accountInfo && (
                    <div className="flex flex-wrap items-center justify-between gap-3 border-2 border-ink bg-white p-3">
                      <p className="text-sm break-all">{transfer.accountInfo}</p>
                      <CopyButton
                        text={extractAccountNumber(transfer.accountInfo)}
                        variant="white"
                        size="sm"
                      >
                        계좌번호 복사
                      </CopyButton>
                    </div>
                  )}
                </div>
              ) : (
                <p className="border-2 border-ink bg-white p-3 text-sm">
                  송금 방법이 아직 등록되지 않았어요. 주인공에게 직접 물어봐주세요!
                </p>
              )}
            </div>
          </Card>

          <Card tone="butter">
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
              <dt className="font-pixel">이름</dt>
              <dd>
                {displayName.trim()}
                {isAnonymous && <span className="text-ink/60"> (목록엔 익명)</span>}
              </dd>
              <dt className="font-pixel">메시지</dt>
              <dd>{message.trim() || <span className="text-ink/40">없음</span>}</dd>
              <dt className="font-pixel">금액</dt>
              <dd>
                {formatWon(amount)}
                <span className="text-ink/60"> ({isAmountPublic ? "공개" : "비공개"})</span>
              </dd>
            </dl>
          </Card>

          <p className="text-sm leading-relaxed">
            송금을 마친 뒤 아래 버튼을 눌러주세요. 주인공이 입금을 확인하기 전까지는{" "}
            <b>입금 대기 중</b>으로 표시돼요.
          </p>

          {serverError && (
            <p role="alert" className="border-2 border-red bg-white p-3 text-sm text-red">
              ✕ {serverError}
            </p>
          )}

          <div className="grid grid-cols-[auto_1fr] gap-3">
            <Button variant="white" size="lg" onClick={() => setStep("form")} disabled={isPending}>
              ← 수정
            </Button>
            <Button size="lg" onClick={handleSent} disabled={isPending}>
              {isPending ? "저장 중..." : "송금했어요 ✓"}
            </Button>
          </div>
        </div>
      )}

      {step === "done" && code && (
        <div className="flex flex-col gap-6">
          <Card title="my_code.txt">
            <div className="flex flex-col items-center gap-5 py-2 text-center">
              <p className="font-pixel text-lg">보태줘서 고마워요 ♡</p>
              <div className="relative w-full">
                <Sparkle className="absolute -top-5 -left-3 size-9 motion-safe:animate-twinkle" />
                <p className="border-2 border-ink bg-butter px-4 py-6 font-pixel text-4xl break-keep select-all sm:text-5xl">
                  {code}
                </p>
              </div>
              <p className="font-pixel text-base text-red">📸 지금 꼭 캡처해두세요!</p>
              <p className="text-sm leading-relaxed">
                이 코드로만 내 후원을 확인·수정·취소할 수 있어요.
              </p>
              <div className="grid w-full grid-cols-2 gap-3">
                <CopyButton text={code} variant="white" block>
                  코드 복사
                </CopyButton>
                <ButtonLink href={`/my/${encodeURIComponent(code)}`} block>
                  내 후원 보기
                </ButtonLink>
              </div>
            </div>
          </Card>

          <Card tone="periwinkle">
            <p className="font-pixel text-sm">코드를 잃어버리면?</p>
            <p className="mt-2 text-sm leading-relaxed">
              다른 사람이 내 후원을 볼 수 없도록 이름으로는 조회가 안 돼요. 코드를 잃어버렸다면
              주인공에게 직접 말해주세요.
            </p>
          </Card>

          <ButtonLink href={`/c/${slug}`} variant="white" block>
            펀딩 페이지로 돌아가기
          </ButtonLink>
        </div>
      )}
    </div>
  );
}
