"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { closeCampaignAction } from "../../actions";

export function CloseCampaignButton({ id, slug }: { id: string; slug: string }) {
  const [armed, setArmed] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!armed) {
    return (
      <Button variant="white" size="sm" onClick={() => setArmed(true)}>
        지금 마감하기
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2 border-2 border-ink bg-white px-3 py-2">
      <span className="text-sm">정말요? 되돌릴 수 없어요.</span>
      <Button variant="white" size="sm" disabled={pending} onClick={() => setArmed(false)}>
        취소
      </Button>
      <Button
        size="sm"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            await closeCampaignAction(id, slug);
            setArmed(false);
          })
        }
      >
        {pending ? "처리 중..." : "확정"}
      </Button>
    </div>
  );
}
