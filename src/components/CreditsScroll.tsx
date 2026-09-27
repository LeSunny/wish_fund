"use client";

import { useSyncExternalStore } from "react";
import { PledgeCard } from "@/components/PledgeCard";
import type { PublicPledge } from "@/lib/pledge";

const SECONDS_PER_ITEM = 2.4;
const MIN_DURATION_S = 14;
// 항목이 적으면 화면 안에 다 들어와서 굳이 돌릴 필요가 없음
const MIN_ITEMS_TO_SCROLL = 5;

function subscribeReducedMotion(onChange: () => void) {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}
const getReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
// 서버는 선호를 알 수 없으니 "움직임 허용"으로 렌더링하고, 클라이언트에서 실제 값으로 맞춘다.
const getReducedMotionServer = () => false;

/** 후원자 목록을 엔딩 크레딧처럼 아래에서 위로 천천히 무한 스크롤한다. */
export function CreditsScroll({ pledges }: { pledges: PublicPledge[] }) {
  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotion,
    getReducedMotionServer,
  );

  const shouldScroll = !reducedMotion && pledges.length >= MIN_ITEMS_TO_SCROLL;
  const duration = Math.max(pledges.length * SECONDS_PER_ITEM, MIN_DURATION_S);

  if (pledges.length === 0) {
    return (
      <p className="border-2 border-dashed border-ink/40 px-4 py-6 text-center text-sm text-ink/60">
        아직 아무도 없어요.
      </p>
    );
  }

  if (!shouldScroll) {
    return (
      <div className="flex flex-col gap-2">
        {pledges.map((p) => (
          <PledgeCard key={p.id} pledge={p} />
        ))}
      </div>
    );
  }

  return (
    <div className="relative h-80 overflow-hidden mask-fade-y sm:h-96">
      <div
        className="motion-safe:animate-credits-scroll absolute inset-x-0 top-0 flex flex-col"
        style={{ animationDuration: `${duration}s` }}
      >
        {/*
          목록을 두 벌 이어 붙여서 -50% 지점에서 처음과 이어지게 한다.
          각 사본이 자기 몫의 mb-2를 갖게 해서 (사본0 높이 == 사본1 높이) -50%가
          정확히 사본0 전체 높이와 같아지게 한다 — 바깥 gap을 쓰면 절반만큼 어긋난다.
        */}
        {[0, 1].map((copy) => (
          <div key={copy} aria-hidden={copy === 1} className="mb-2 flex flex-col gap-2">
            {pledges.map((p) => (
              <PledgeCard key={p.id} pledge={p} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
