import { redirect } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { getDefaultCampaignSlug } from "@/lib/campaign";

// DEFAULT_CAMPAIGN_SLUG나 "가장 최근 OPEN 캠페인"은 매 요청 시점에 다시 확인해야 한다
// (마감 lazy 체크·새 캠페인 생성이 바로 반영되게). 정적 프리렌더로 굳어지지 않도록 강제.
export const dynamic = "force-dynamic";

export default async function RootPage() {
  const slug = await getDefaultCampaignSlug();
  if (slug) redirect(`/c/${slug}`);

  return (
    <main className="mx-auto flex max-w-lg flex-col gap-6 px-4 py-10">
      <Card title="wish_fund.txt">
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <p className="font-pixel text-lg">아직 진행 중인 펀딩이 없어요</p>
          <p className="text-sm text-ink/60">주인공에게 받은 링크로 다시 들어와주세요.</p>
        </div>
      </Card>
    </main>
  );
}
