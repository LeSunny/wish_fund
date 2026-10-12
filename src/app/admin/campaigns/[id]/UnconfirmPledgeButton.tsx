"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { unconfirmPledgeAction } from "../../actions";

/** 입금 확인 취소. 잘못 누르면 진행률이 바로 바뀌므로 2단계 확인. */
export function UnconfirmPledgeButton({ slug, pledgeId }: { slug: string; pledgeId: string }) {
  const [armed, setArmed] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!armed) {
    return (
      <Button variant="white" size="sm" onClick={() => setArmed(true)}>
        확인 취소
      </Button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 border-2 border-ink bg-white px-3 py-2">
      <span className="text-sm">입금 대기로 되돌릴까요?</span>
      <Button variant="white" size="sm" disabled={pending} onClick={() => setArmed(false)}>
        아니요
      </Button>
      <Button
        size="sm"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            await unconfirmPledgeAction(slug, pledgeId);
            setArmed(false);
          })
        }
      >
        {pending ? "처리 중..." : "되돌리기"}
      </Button>
    </div>
  );
}
