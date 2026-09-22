import { cn } from "@/lib/cn";
import { formatWon } from "@/lib/format";

const HEART_COUNT = 10; // 하트 1개 = 10%
const HEART_PATH =
  "M12 21s-7.5-4.6-9.6-9.2C.9 8.4 2.9 4.5 6.6 4.5c2.2 0 3.6 1.2 5.4 3.1 1.8-1.9 3.2-3.1 5.4-3.1 3.7 0 5.7 3.9 4.2 7.3C19.5 16.4 12 21 12 21z";

type ProgressBarProps = {
  /** CONFIRMED 합계 — 진행률은 이 값만으로 계산 */
  confirmed: number;
  /** PENDING 합계 — 진행률에 넣지 않고 "입금 대기 중"으로 따로 표시 */
  pending?: number;
  goal: number;
  className?: string;
};

const clamp01 = (n: number) => Math.min(Math.max(n, 0), 1);

/** 게임 체력바 같은 하트 게이지. 노랑=입금 확인, 살구=입금 대기, 파랑=빈 칸 */
export function ProgressBar({ confirmed, pending = 0, goal, className }: ProgressBarProps) {
  const percent = goal > 0 ? (confirmed / goal) * 100 : 0;
  const withPending = goal > 0 ? ((confirmed + pending) / goal) * 100 : 0;
  const over = percent >= 100;
  const step = 100 / HEART_COUNT;

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={goal}
        aria-valuenow={Math.min(confirmed, goal)}
        aria-valuetext={`목표의 ${Math.floor(percent)}% 달성${pending > 0 ? `, 입금 대기 ${formatWon(pending)}` : ""}`}
        className="flex flex-wrap items-center gap-x-4 gap-y-2"
      >
        <div className="flex gap-1">
          {Array.from({ length: HEART_COUNT }, (_, i) => {
            const c = clamp01((percent - i * step) / step) * 100;
            const p = clamp01((withPending - i * step) / step) * 100;
            return (
              <div key={i} className="relative size-7 sm:size-8">
                <div
                  className="mask-heart absolute inset-0"
                  style={{
                    background: `linear-gradient(90deg, var(--color-butter) ${c}%, var(--color-apricot) ${c}% ${p}%, var(--color-periwinkle) ${p}%)`,
                  }}
                />
                <svg viewBox="-1 -1 26 26" className="absolute inset-0">
                  <path d={HEART_PATH} fill="none" stroke="var(--color-ink)" strokeWidth="1.6" />
                </svg>
              </div>
            );
          })}
        </div>
        <span className="font-pixel text-2xl">{Math.floor(percent)}%</span>
        {over && (
          <span className="border-2 border-ink bg-butter px-2 py-0.5 font-pixel text-sm">
            ✦ 목표 돌파!
          </span>
        )}
      </div>

      <p className="font-pixel text-sm">
        {formatWon(confirmed)} <span className="text-ink/50">/ {formatWon(goal)}</span>
      </p>

      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
        <li className="flex items-center gap-1.5">
          <span className="size-3 border-2 border-ink bg-butter" />
          입금 확인 {formatWon(confirmed)}
        </li>
        {pending > 0 && (
          <li className="flex items-center gap-1.5">
            <span className="size-3 border-2 border-ink bg-apricot" />
            입금 대기 중 {formatWon(pending)}
          </li>
        )}
      </ul>
    </div>
  );
}
