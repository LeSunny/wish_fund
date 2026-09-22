import Link from "next/link";
import { notFound } from "next/navigation";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { getCampaign } from "@/lib/campaign";
import { PledgeFlow } from "./PledgeFlow";

export default async function PledgePage({ params }: PageProps<"/c/[slug]/pledge">) {
  const { slug } = await params;
  const campaign = await getCampaign(slug);
  if (!campaign || campaign.status === "DRAFT") notFound();

  return (
    <main className="mx-auto flex max-w-lg flex-col gap-6 px-4 py-10">
      <header className="flex flex-col gap-2">
        <Link href={`/c/${slug}`} className="w-fit text-sm underline underline-offset-4">
          ← 펀딩으로
        </Link>
        <h1 className="font-pixel text-3xl leading-tight">{campaign.title}에 보태기</h1>
      </header>

      {campaign.status === "CLOSED" ? (
        <Card title="closed.txt">
          <div className="flex flex-col items-center gap-4 py-4 text-center">
            <p className="font-pixel text-xl">펀딩이 마감됐어요</p>
            <p className="text-sm">마음 써줘서 고마워요 ♡</p>
            <ButtonLink href={`/c/${slug}/success`}>결과 보러가기</ButtonLink>
          </div>
        </Card>
      ) : (
        <PledgeFlow
          slug={slug}
          transfer={{
            accountInfo: campaign.accountInfo,
            kakaopayUrl: campaign.kakaopayUrl,
            tossUrl: campaign.tossUrl,
          }}
        />
      )}
    </main>
  );
}
