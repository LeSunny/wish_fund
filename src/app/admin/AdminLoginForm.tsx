"use client";

import { useActionState, useId } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, inputStyles } from "@/components/ui/Field";
import { loginAdmin } from "./actions";

export function AdminLoginForm() {
  const [state, formAction, pending] = useActionState(loginAdmin, {});
  const id = useId();

  return (
    <Card title="login.txt" className="mx-auto mt-8 max-w-sm">
      <form action={formAction} className="flex flex-col gap-4">
        <Field
          label="관리자 비밀번호"
          htmlFor={`${id}-password`}
          error={state.error}
          errorId={`${id}-password-error`}
        >
          <input
            id={`${id}-password`}
            name="password"
            type="password"
            autoComplete="current-password"
            autoFocus
            required
            aria-invalid={!!state.error}
            aria-describedby={state.error ? `${id}-password-error` : undefined}
            className={inputStyles}
          />
        </Field>
        <Button type="submit" disabled={pending} block>
          {pending ? "확인 중..." : "로그인"}
        </Button>
      </form>
    </Card>
  );
}
