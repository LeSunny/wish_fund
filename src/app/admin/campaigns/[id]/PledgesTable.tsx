import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { formatWon } from "@/lib/format";
import { listPledgesForAdmin } from "@/lib/pledge";
import { confirmPledgeAction } from "../../actions";

const STATUS_LABEL = { PENDING: "입금 대기", CONFIRMED: "입금 확인", CANCELLED: "취소됨" } as const;
const STATUS_TONE = { PENDING: "bg-butter", CONFIRMED: "bg-periwinkle", CANCELLED: "bg-white" } as const;

/** 관리자용 후원 목록. 금액·이름·코드가 항상(마스킹 없이) 보인다. */
export async function PledgesTable({ campaignId, slug }: { campaignId: string; slug: string }) {
  const pledges = await listPledgesForAdmin(campaignId);

  if (pledges.length === 0) {
    return (
      <p className="border-2 border-dashed border-ink/40 px-4 py-8 text-center text-sm text-ink/60">
        아직 후원이 없어요.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {pledges.map((p) => (
        <div
          key={p.id}
          className={cn(
            "flex flex-wrap items-center justify-between gap-3 border-2 border-ink px-4 py-3",
            p.status === "CANCELLED" ? "bg-white/50 text-ink/50" : "bg-white",
          )}
        >
          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-2 font-pixel text-sm">
              {p.displayName}
              {p.isAnonymous && <span className="text-xs font-normal text-ink/50">(공개: 익명)</span>}
              <span className={cn("border-2 border-ink px-1.5 py-0.5 text-[10px]", STATUS_TONE[p.status])}>
                {STATUS_LABEL[p.status]}
              </span>
            </p>
            <p className="text-xs text-ink/50">
              코드 {p.code} · {p.isAmountPublic ? "금액 공개" : "금액 비공개"}
            </p>
            {p.message && <p className="mt-1 text-sm">{p.message}</p>}
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <span className="font-pixel text-sm">{formatWon(p.amount)}</span>
            {p.status === "PENDING" && (
              <form action={confirmPledgeAction.bind(null, slug, p.id)}>
                <Button type="submit" size="sm">
                  입금 확인
                </Button>
              </form>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
