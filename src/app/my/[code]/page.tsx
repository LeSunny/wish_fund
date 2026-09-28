import Link from "next/link";
import { getCampaignById } from "@/lib/campaign";
import { getPledgeByCode } from "@/lib/pledge";
import { normalizePledgeCode } from "@/lib/pledge-code";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { Card } from "@/components/ui/Card";
import { MyPledgeView } from "./MyPledgeView";

function NotFoundCard({ message, hint }: { message: string; hint?: string }) {
  return (
    <Card title="not_found.txt">
      <div className="flex flex-col items-center gap-3 py-4 text-center">
        <p className="font-pixel text-lg">{message}</p>
        {hint && <p className="text-sm text-ink/60 break-all">{hint}</p>}
        <p className="text-sm leading-relaxed">
          코드는 후원 완료 화면에서만 발급돼요. 잃어버렸다면 주인공에게 직접 물어봐주세요.
        </p>
      </div>
    </Card>
  );
}

export default async function MyPledgePage({ params }: PageProps<"/my/[code]">) {
  const { code: rawCode } = await params;

  const ip = await getClientIp();
  if (!rateLimit(`my-lookup:${ip}`, 20, 10 * 60_000)) {
    return (
      <main className="mx-auto flex max-w-lg flex-col gap-6 px-4 py-10">
        <NotFoundCard message="너무 여러 번 조회했어요. 잠시 후 다시 시도해주세요" />
      </main>
    );
  }

  const normalized = normalizePledgeCode(decodeURIComponent(rawCode));
  const pledge = normalized ? await getPledgeByCode(normalized) : null;
  if (!normalized || !pledge) {
    return (
      <main className="mx-auto flex max-w-lg flex-col gap-6 px-4 py-10">
        <NotFoundCard message="그런 코드를 찾을 수 없어요" hint={rawCode} />
      </main>
    );
  }

  const campaign = await getCampaignById(pledge.campaignId);
  if (!campaign) {
    return (
      <main className="mx-auto flex max-w-lg flex-col gap-6 px-4 py-10">
        <NotFoundCard message="그런 코드를 찾을 수 없어요" hint={normalized} />
      </main>
    );
  }

  const editable = campaign.status === "OPEN" && pledge.status !== "CANCELLED";

  return (
    <main className="mx-auto flex max-w-lg flex-col gap-6 px-4 py-10">
      <header className="flex flex-col gap-2">
        <Link href={`/c/${campaign.slug}`} className="w-fit text-sm underline underline-offset-4">
          ← {campaign.title}
        </Link>
        <h1 className="font-pixel text-3xl leading-tight">내 후원</h1>
      </header>

      <MyPledgeView
        code={normalized}
        campaignSlug={campaign.slug}
        campaignClosed={campaign.status !== "OPEN"}
        editable={editable}
        pledge={{
          displayName: pledge.displayName,
          message: pledge.message,
          isAnonymous: pledge.isAnonymous,
          isAmountPublic: pledge.isAmountPublic,
          amount: pledge.amount,
          status: pledge.status,
        }}
      />
    </main>
  );
}
