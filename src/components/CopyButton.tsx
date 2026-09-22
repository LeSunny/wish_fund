"use client";

import { useEffect, useState, type ComponentProps } from "react";
import { Button } from "@/components/ui/Button";

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // 권한 없음/구형 브라우저(카카오톡 인앱 등) 대비
    const el = document.createElement("textarea");
    el.value = text;
    el.setAttribute("readonly", "");
    el.style.position = "fixed";
    el.style.opacity = "0";
    document.body.appendChild(el);
    el.select();
    const ok = document.execCommand("copy");
    el.remove();
    return ok;
  }
}

type CopyButtonProps = Omit<ComponentProps<typeof Button>, "onClick"> & {
  text: string;
  copiedLabel?: string;
};

export function CopyButton({ text, children, copiedLabel = "복사됨!", ...props }: CopyButtonProps) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

  useEffect(() => {
    if (state === "idle") return;
    const t = setTimeout(() => setState("idle"), 1500);
    return () => clearTimeout(t);
  }, [state]);

  return (
    <Button {...props} onClick={async () => setState((await copyText(text)) ? "copied" : "failed")}>
      <span aria-live="polite">
        {state === "copied" ? `✓ ${copiedLabel}` : state === "failed" ? "직접 복사해주세요" : children}
      </span>
    </Button>
  );
}
