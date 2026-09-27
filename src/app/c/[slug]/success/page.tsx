import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ConfettiOnce } from "@/components/ConfettiOnce";
import { CreditsScroll } from "@/components/CreditsScroll";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { GlossyHeart, HoloSquiggle, Sparkle } from "@/components/ui/Deco";
import { getCampaign, getCampaignTotals } from "@/lib/campaign";
import { formatWon } from "@/lib/format";
import { campaignMetadata } from "@/lib/metadata";
import { getPublicPledges } from "@/lib/pledge";

export async function generateMetadata({
  params,
}: {
  params: PageProps<"/c/[slug]/success">["params"];
}): Promise<Metadata> {
  const { slug } = await params;
  const campaign = await getCampaign(slug);
  if (!campaign) return {};
  return campaignMetadata(campaign, { titleSuffix: " 펀딩 완료!" });
}

export default async function SuccessPage({ params }: PageProps<"/c/[slug]/success">) {
  const { slug } = await params;
  const campaign = await getCampaign(slug);
  if (!campaign) notFound();
  // 아직 진행 중인 캠페인은 성공 페이지가 아니라 메인으로
  if (campaign.status !== "CLOSED") redirect(`/c/${slug}`);

  const [{ confirmed }, pledges] = await Promise.all([
    getCampaignTotals(campaign.id),
    getPublicPledges(campaign.id),
  ]);
  const percent = campaign.goalAmount > 0 ? Math.floor((confirmed / campaign.goalAmount) * 100) : 0;
  const over = confirmed > campaign.goalAmount;

  return (
    <main className="mx-auto flex max-w-lg flex-col gap-8 px-4 py-10">
      <ConfettiOnce storageKey={`wishfund:confetti-seen:${slug}`} />

      <header className="relative flex flex-col items-center gap-3 pt-4 text-center">
        <Sparkle className="absolute -top-2 left-1/4 size-9 motion-safe:animate-twinkle" />
        <Sparkle className="absolute top-6 right-1/5 size-6 motion-safe:animate-twinkle" />
        <GlossyHeart className="size-24 motion-safe:animate-float" />
        <h1 className="font-pixel text-3xl leading-tight">펀딩 완료!</h1>
        <p className="font-pixel text-lg">{campaign.title}</p>
      </header>

      <Card title="result.txt">
        <div className="flex flex-col items-center gap-3 py-2 text-center">
          <p className="font-pixel text-5xl">{percent}%</p>
          <p className="text-sm">
            {formatWon(confirmed)} <span className="text-ink/50">/ {formatWon(campaign.goalAmount)}</span>
          </p>
          {over && (
            <p className="mt-1 border-2 border-ink bg-butter px-3 py-1.5 font-pixel text-sm">
              🍵 남은 금액은 차(tea)값으로 쓸게요
            </p>
          )}
        </div>
      </Card>

      {campaign.thanksMessage && (
        <Card tone="butter">
          <p className="text-center leading-relaxed">{campaign.thanksMessage}</p>
        </Card>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-center font-pixel text-lg">보태준 사람들</h2>
        <CreditsScroll pledges={pledges} />
      </section>

      <HoloSquiggle className="mx-auto w-40" />

      <ButtonLink href={`/c/${slug}`} variant="white" block>
        펀딩 페이지로
      </ButtonLink>
    </main>
  );
}
