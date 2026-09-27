import { notFound } from "next/navigation";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { requireAdminSession } from "@/lib/admin-session";
import { getCampaignById, getCampaignTotals } from "@/lib/campaign";
import { CampaignForm } from "../CampaignForm";
import { CloseCampaignButton } from "./CloseCampaignButton";
import { PledgesTable } from "./PledgesTable";

export default async function AdminCampaignDetailPage({
  params,
}: PageProps<"/admin/campaigns/[id]">) {
  await requireAdminSession();

  const { id } = await params;
  const campaign = await getCampaignById(id);
  if (!campaign) notFound();

  const { confirmed, pending } = await getCampaignTotals(campaign.id);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-pixel text-2xl">{campaign.title}</h1>
        {campaign.status === "OPEN" && <CloseCampaignButton id={campaign.id} slug={campaign.slug} />}
      </div>

      <ProgressBar confirmed={confirmed} pending={pending} goal={campaign.goalAmount} />

      <CampaignForm campaign={campaign} />

      <section className="flex flex-col gap-3">
        <h2 className="font-pixel text-lg">후원 목록</h2>
        <PledgesTable campaignId={campaign.id} slug={campaign.slug} />
      </section>
    </div>
  );
}
