import type { Metadata } from "next";
import Link from "next/link";
import { hasValidAdminSession } from "@/lib/admin-session";
import { LogoutButton } from "./LogoutButton";

export const metadata: Metadata = {
  title: "admin",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const authed = await hasValidAdminSession();

  return (
    <div className="mx-auto flex min-h-dvh max-w-3xl flex-col gap-6 px-4 py-8">
      <header className="flex items-center justify-between gap-4 border-b-2 border-dashed border-ink/30 pb-4">
        <Link href="/admin" className="font-pixel text-lg">
          wish fund <span className="text-ink/50">· admin</span>
        </Link>
        {authed && <LogoutButton />}
      </header>
      {children}
    </div>
  );
}
