import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { PledgeCard } from "@/components/PledgeCard";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { GlobeIcon, Sparkle, Starburst } from "@/components/ui/Deco";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { getCampaign, getCampaignTotals } from "@/lib/campaign";
import { campaignMetadata } from "@/lib/metadata";
import { getPublicPledges } from "@/lib/pledge";

function daysLeft(deadline: Date) {
  return Math.max(0, Math.ceil((deadline.getTime() - Date.now()) / 86_400_000));
}

export async function generateMetadata({
  params,
}: {
  params: PageProps<"/c/[slug]">["params"];
}): Promise<Metadata> {
  const { slug } = await params;
  const campaign = await getCampaign(slug);
  // 못 찾은 경우 페이지 컴포넌트가 notFound()를 처리하니, 여기선 기본 메타데이터만
  if (!campaign || campaign.status === "DRAFT") return {};
  return campaignMetadata(campaign);
}

export default async function CampaignPage({ params }: PageProps<"/c/[slug]">) {
  const { slug } = await params;
  const campaign = await getCampaign(slug);
  if (!campaign || campaign.status === "DRAFT") notFound();
  if (campaign.status === "CLOSED") redirect(`/c/${slug}/success`);

  const [{ confirmed, pending }, pledges] = await Promise.all([
    getCampaignTotals(campaign.id),
    getPublicPledges(campaign.id),
  ]);
  const dday = daysLeft(campaign.deadline);

  return (
    <main className="mx-auto flex max-w-lg flex-col gap-8 px-4 py-10">
      <header className="relative flex flex-col gap-4">
        <Sparkle className="absolute -top-2 right-0 size-10 motion-safe:animate-twinkle" />
        <GlobeIcon className="absolute top-14 -right-8 -z-10 size-28 text-apricot/70" />
        <p className="font-pixel text-sm text-ink/60">wishfund.kr/c/{slug}</p>
        <h1 className="font-pixel text-4xl leading-tight">{campaign.title}</h1>
      </header>

      {campaign.thumbnailUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- 외부 상품 이미지, 도메인 목록을 미리 알 수 없음
        <img
          src={campaign.thumbnailUrl}
          alt=""
          className="aspect-video w-full border-2 border-ink object-cover"
        />
      )}

      <Card title="progress.txt">
        <div className="flex flex-col gap-4">
          <ProgressBar confirmed={confirmed} pending={pending} goal={campaign.goalAmount} />
          <p className="border-t-2 border-dashed border-ink/30 pt-3 text-sm">
            {dday > 0 ? (
              <>
                마감까지 <b className="font-pixel">D-{dday}</b>
              </>
            ) : (
              "오늘 마감이에요!"
            )}
          </p>
        </div>
      </Card>

      {/* Tailwind typography 플러그인 없이 마크다운 최소 스타일링 (Y2K 톤 유지) */}
      <div
        className={[
          "text-sm leading-relaxed break-words [&>*+*]:mt-3",
          "[&_h1]:font-pixel [&_h1]:text-xl [&_h2]:font-pixel [&_h2]:text-lg [&_h3]:font-bold",
          "[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li+li]:mt-1",
          "[&_a]:underline [&_a]:underline-offset-2 [&_strong]:font-bold",
          "[&_blockquote]:border-l-2 [&_blockquote]:border-ink [&_blockquote]:pl-3 [&_blockquote]:text-ink/70",
          "[&_code]:border [&_code]:border-ink [&_code]:bg-white [&_code]:px-1 [&_code]:font-mono [&_code]:text-xs",
          "[&_hr]:border-t-2 [&_hr]:border-dashed [&_hr]:border-ink/30",
        ].join(" ")}
      >
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{campaign.description}</ReactMarkdown>
      </div>

      {campaign.productUrl && (
        <a
          href={campaign.productUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="border-2 border-ink bg-white px-4 py-3 text-sm underline underline-offset-4"
        >
          🎁 어떤 선물인지 보러가기 ↗
        </a>
      )}

      <div className="relative">
        <Starburst spikes={8} className="absolute -top-6 -right-4 size-14 text-orange" />
        <ButtonLink href={`/c/${slug}/pledge`} size="lg" block>
          ♡ 선물에 보태기 ♡
        </ButtonLink>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="font-pixel text-lg">
          후원자 {pledges.length > 0 && <span className="text-ink/50">({pledges.length})</span>}
        </h2>
        {pledges.length === 0 ? (
          <p className="border-2 border-dashed border-ink/40 px-4 py-6 text-center text-sm text-ink/60">
            아직 아무도 없어요. 첫 후원자가 되어주세요!
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {pledges.map((p) => (
              <li key={p.id}>
                <PledgeCard pledge={p} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
