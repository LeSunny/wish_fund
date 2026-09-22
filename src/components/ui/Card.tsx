import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";
import { ArrowLeftIcon, GlobeIcon } from "./Deco";

type Tone = "lavender" | "white" | "butter" | "peach" | "periwinkle";

const toneClass: Record<Tone, string> = {
  lavender: "bg-lavender",
  white: "bg-white",
  butter: "bg-butter",
  peach: "bg-peach",
  periwinkle: "bg-periwinkle",
};

type CardProps = Omit<ComponentProps<"div">, "title"> & {
  tone?: Tone;
  /** 옛날 브라우저 창: 지구본 + 주소창 + 뒤로가기 타이틀바 */
  url?: string;
  /** 파일 창: 파일명 + 닫기(×) 타이틀바 */
  title?: string;
};

export function Card({ tone = "lavender", url, title, className, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-window border-2 border-ink",
        toneClass[tone],
        className,
      )}
      {...props}
    >
      {url && (
        <div className="flex items-center gap-3 border-b-2 border-ink bg-orange px-3 py-2">
          <GlobeIcon className="size-7 shrink-0" />
          <div className="min-w-0 flex-1 truncate border-2 border-ink bg-butter px-3 py-1 font-pixel text-sm">
            {url}
          </div>
          <ArrowLeftIcon className="size-6 shrink-0" />
        </div>
      )}
      {title && (
        <div className="flex items-center justify-between gap-3 border-b-2 border-ink bg-orange px-4 py-2">
          <span className="truncate font-pixel text-base">{title}</span>
          <span
            aria-hidden
            className="grid size-6 shrink-0 place-items-center border-2 border-ink bg-periwinkle font-pixel text-xs leading-none"
          >
            ✕
          </span>
        </div>
      )}
      {children && <div className="p-5">{children}</div>}
    </div>
  );
}
