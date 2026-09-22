import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

// Y2K 장식 요소. 전부 장식용이므로 aria-hidden.

type SvgProps = ComponentProps<"svg">;

/** 속이 흰 네 갈래 반짝이 ✦ */
export function Sparkle({ className, ...props }: SvgProps) {
  return (
    <svg viewBox="-2 -2 28 28" aria-hidden className={className} {...props}>
      <path
        d="M12 0C12.9 7.2 16.8 11.1 24 12 16.8 12.9 12.9 16.8 12 24 11.1 16.8 7.2 12.9 0 12 7.2 11.1 11.1 7.2 12 0Z"
        fill="var(--color-white)"
        stroke="var(--color-ink)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** 선으로만 그린 뾰족 별 (기본: 속 빈 외곽선) */
export function Starburst({
  spikes = 12,
  filled = false,
  className,
  ...props
}: SvgProps & { spikes?: number; filled?: boolean }) {
  const d = Array.from({ length: spikes * 2 }, (_, i) => {
    const r = i % 2 === 0 ? 48 : 20;
    const a = (Math.PI * i) / spikes - Math.PI / 2;
    return `${(50 + r * Math.cos(a)).toFixed(2)},${(50 + r * Math.sin(a)).toFixed(2)}`;
  }).join(" ");
  return (
    <svg viewBox="0 0 100 100" aria-hidden className={cn("text-orange", className)} {...props}>
      <polygon
        points={d}
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth={filled ? 0 : 1.5}
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** 와이어프레임 지구본 */
export function GlobeIcon({ className, ...props }: SvgProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      aria-hidden
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={className}
      {...props}
    >
      <circle cx="16" cy="16" r="13" />
      <ellipse cx="16" cy="16" rx="6" ry="13" />
      <path d="M3 16h26M5.5 9h21M5.5 23h21M16 3v26" />
    </svg>
  );
}

/** 타이틀바 뒤로가기 화살표 */
export function ArrowLeftIcon({ className, ...props }: SvgProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="square"
      className={className}
      {...props}
    >
      <path d="M21 12H4M11 5l-7 7 7 7" />
    </svg>
  );
}

/** 픽셀 마우스 커서 */
export function PixelCursor({ className, ...props }: SvgProps) {
  return (
    <svg viewBox="0 0 16 22" aria-hidden shapeRendering="crispEdges" className={className} {...props}>
      <path
        d="M1 1v16l4-4 3 7 3-1-3-7h5z"
        fill="var(--color-white)"
        stroke="var(--color-ink)"
        strokeWidth="1"
      />
    </svg>
  );
}

/** 말랑한 광택 하트 (3D 느낌) */
export function GlossyHeart({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("drop-shadow-[0_14px_18px_rgb(255_120_60/0.35)]", className)}>
      <div className="mask-heart size-full bg-[radial-gradient(circle_at_32%_28%,#fff1e6_0,#ffb685_28%,#ff9a5c_62%,#ff8440_100%)]" />
    </div>
  );
}

/** 홀로그램 물결선 */
export function HoloSquiggle({ className, ...props }: SvgProps) {
  return (
    <svg viewBox="0 0 200 60" aria-hidden fill="none" className={className} {...props}>
      <defs>
        <linearGradient id="holo-squiggle" x1="0" x2="1">
          <stop offset="0" stopColor="#aabdff" />
          <stop offset=".35" stopColor="#ffb8e0" />
          <stop offset=".65" stopColor="#fff3b0" />
          <stop offset="1" stopColor="#b8f5e0" />
        </linearGradient>
      </defs>
      <path
        d="M8 40c20-30 40-30 50 0s30 30 45 0 35-30 45 0 30 25 44-5"
        stroke="url(#holo-squiggle)"
        strokeWidth="12"
        strokeLinecap="round"
      />
    </svg>
  );
}
