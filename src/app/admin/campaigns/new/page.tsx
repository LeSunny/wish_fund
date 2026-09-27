import { requireAdminSession } from "@/lib/admin-session";
import { CampaignForm } from "../CampaignForm";

export default async function NewCampaignPage() {
  await requireAdminSession();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-pixel text-2xl">새 캠페인</h1>
      <CampaignForm />
    </div>
  );
}
