import { buttonStyles } from "@/components/ui/Button";
import { logoutAdmin } from "./actions";

// 서버 액션만 쓰는 순수 폼이라 클라이언트 JS 없이도 동작 — "use client" 불필요.
export function LogoutButton() {
  return (
    <form action={logoutAdmin}>
      <button type="submit" className={buttonStyles({ variant: "white", size: "sm" })}>
        로그아웃
      </button>
    </form>
  );
}
