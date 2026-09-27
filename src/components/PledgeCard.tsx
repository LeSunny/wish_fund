import { formatWon } from "@/lib/format";
import type { PublicPledge } from "@/lib/pledge";

/** 후원자 목록 카드 한 장. 메인 페이지 목록과 성공 페이지 엔딩 크레딧에서 공용으로 쓴다. */
export function PledgeCard({ pledge }: { pledge: PublicPledge }) {
  return (
    <div className="flex items-start justify-between gap-3 border-2 border-ink bg-white px-4 py-3">
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-2 font-pixel text-sm">
          {pledge.displayName}
          {pledge.status === "PENDING" && (
            <span className="border-2 border-ink bg-periwinkle px-1.5 py-0.5 text-[10px]">
              입금 확인 중
            </span>
          )}
        </p>
        {pledge.message && <p className="mt-1 text-sm break-words">{pledge.message}</p>}
      </div>
      {pledge.amount !== null && (
        <p className="shrink-0 font-pixel text-sm whitespace-nowrap">{formatWon(pledge.amount)}</p>
      )}
    </div>
  );
}
