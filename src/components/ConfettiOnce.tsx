"use client";

import { useEffect, useState } from "react";

const COLORS = ["var(--color-orange)", "var(--color-butter)", "var(--color-periwinkle)", "var(--color-apricot)"];
const PIECE_COUNT = 60;
const DURATION_MS = 3200;

type Piece = { id: number; left: number; delay: number; duration: number; color: string; spin: number };

function makePieces(): Piece[] {
  return Array.from({ length: PIECE_COUNT }, (_, id) => ({
    id,
    left: Math.random() * 100,
    delay: Math.random() * 0.6,
    duration: 2.2 + Math.random() * 1.2,
    color: COLORS[id % COLORS.length],
    spin: Math.random() > 0.5 ? 1 : -1,
  }));
}

/**
 * `storageKey` 기준으로 이 브라우저에서 처음 마운트될 때만 컨페티를 뿌린다.
 * prefers-reduced-motion이면 아예 렌더링하지 않는다 (움직임 자체를 만들지 않음).
 */
export function ConfettiOnce({ storageKey }: { storageKey: string }) {
  const [pieces, setPieces] = useState<Piece[] | null>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let seen = false;
    try {
      seen = localStorage.getItem(storageKey) === "1";
      if (!seen) localStorage.setItem(storageKey, "1");
    } catch {
      // 프라이빗 모드 등으로 localStorage를 못 쓰면, 매번 보여주기보다는 조용히 생략
      return;
    }
    if (seen) return;

    // localStorage 판정 결과로 "이번 마운트에서만" 터뜨리는 일회성 연출 — 값이 바뀔 때
    // 다시 반응할 외부 스토어가 없어 useSyncExternalStore로 옮길 수 없다 (마운트-1회 한정).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPieces(makePieces());
  }, [storageKey]);

  // 치우는 타이머는 "조각이 있을 때"에 따로 건다. 위 effect 안에서 걸면 StrictMode의
  // 실행→정리→재실행 중 정리에서 타이머가 취소되고, 재실행은 이미 본 것으로 판정해 다시 안 걸어서
  // 조각(전체 화면 overlay)이 영영 남는다.
  useEffect(() => {
    if (!pieces) return;
    const timer = setTimeout(() => setPieces(null), DURATION_MS + 400);
    return () => clearTimeout(timer);
  }, [pieces]);

  if (!pieces) return null;

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {pieces.map((p) => (
        <span
          key={p.id}
          className="absolute top-0 h-3 w-2 motion-safe:animate-confetti-fall"
          style={{
            left: `${p.left}%`,
            backgroundColor: p.color,
            border: "1.5px solid var(--color-ink)",
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
            transform: `rotate(${p.spin * 45}deg)`,
          }}
        />
      ))}
    </div>
  );
}
