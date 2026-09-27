import Link from "next/link";
import { AdminLoginForm } from "./AdminLoginForm";
import { hasValidAdminSession } from "@/lib/admin-session";
import { listCampaignsForAdmin } from "@/lib/campaign";
import { ButtonLink } from "@/components/ui/Button";
import { formatWon } from "@/lib/format";

const STATUS_LABEL: Record<string, string> = { DRAFT: "임시저장", OPEN: "진행 중", CLOSED: "마감" };

export default async function AdminHomePage() {
  if (!(await hasValidAdminSession())) return <AdminLoginForm />;

  const campaigns = await listCampaignsForAdmin();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-pixel text-2xl">캠페인</h1>
        <ButtonLink href="/admin/campaigns/new" size="sm">
          + 새 캠페인
        </ButtonLink>
      </div>

      {campaigns.length === 0 ? (
        <p className="border-2 border-dashed border-ink/40 px-4 py-8 text-center text-sm text-ink/60">
          아직 캠페인이 없어요. 새로 만들어보세요.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {campaigns.map((c) => (
            <li key={c.id}>
              <Link
                href={`/admin/campaigns/${c.id}`}
                className="flex flex-wrap items-center justify-between gap-2 border-2 border-ink bg-white px-4 py-3 hover:bg-butter/30"
              >
                <div className="flex min-w-0 flex-col">
                  <span className="font-pixel text-sm">{c.title}</span>
                  <span className="text-xs text-ink/50">/c/{c.slug}</span>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span>{formatWon(c.goalAmount)}</span>
                  <span className="border-2 border-ink bg-periwinkle px-1.5 py-0.5">
                    {STATUS_LABEL[c.status] ?? c.status}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
