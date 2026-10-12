import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, inputStyles } from "@/components/ui/Field";
import { normalizePledgeCode } from "@/lib/pledge-code";
import { slugSchema } from "@/lib/validation";

export const metadata: Metadata = {
  title: "내 후원 찾기",
  robots: { index: false, follow: false },
};

/**
 * 후원 코드 입력 → /my/[code]. 후원 완료 화면을 닫은 뒤에도 들어올 수 있는 입구.
 * JS 없이 동작하도록 GET 폼(?code=)으로 받아 서버에서 리다이렉트한다.
 * 조회 자체(와 rate limit)는 /my/[code]에서 — 여기선 형식만 본다 (DB 접근 없음).
 */
export default async function FindMyPledgePage({ searchParams }: PageProps<"/my">) {
  const { code, from } = await searchParams;
  const backSlug = typeof from === "string" && slugSchema.safeParse(from).success ? from : null;

  let error: string | null = null;
  if (typeof code === "string" && code.trim()) {
    const normalized = normalizePledgeCode(code);
    if (normalized) redirect(`/my/${encodeURIComponent(normalized)}`);
    error = "코드 형식이 아니에요. '귤-47-딸기'처럼 단어-숫자-단어예요";
  }

  return (
    <main className="mx-auto flex max-w-lg flex-col gap-6 px-4 py-10">
      <header className="flex flex-col gap-2">
        {backSlug && (
          <Link href={`/c/${backSlug}`} className="w-fit text-sm underline underline-offset-4">
            ← 펀딩 페이지로
          </Link>
        )}
        <h1 className="font-pixel text-3xl leading-tight">내 후원 찾기</h1>
        <p className="text-sm leading-relaxed text-ink/70">
          후원 완료 화면에서 받은 코드를 넣으면 금액·메시지를 고치거나 취소할 수 있어요. (펀딩이 진행 중일
          때만)
        </p>
      </header>

      <Card title="find_my_pledge.txt">
        <form action="/my" className="flex flex-col gap-4">
          {backSlug && <input type="hidden" name="from" value={backSlug} />}
          <Field label="후원 코드" htmlFor="my-code" hint="예) 귤-47-딸기" error={error ?? undefined}>
            <input
              id="my-code"
              name="code"
              required
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              defaultValue={typeof code === "string" ? code : ""}
              placeholder="귤-47-딸기"
              aria-invalid={!!error}
              className={inputStyles}
            />
          </Field>
          <Button type="submit" block>
            내 후원 보기
          </Button>
        </form>
      </Card>

      <Card tone="periwinkle">
        <p className="font-pixel text-sm">코드를 잃어버렸다면?</p>
        <p className="mt-2 text-sm leading-relaxed">
          다른 사람이 내 후원을 볼 수 없도록 이름으로는 찾을 수 없어요. 주인공에게 직접 말해주세요.
        </p>
      </Card>
    </main>
  );
}
