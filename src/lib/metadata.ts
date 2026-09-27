import type { Metadata } from "next";

export const SITE_NAME = "wish fund";

/**
 * 배포 도메인. 우선순위: 명시적 env → Vercel 프로덕션 도메인 → Vercel 배포별 도메인 → 로컬.
 * 루트 layout의 metadataBase에서 쓴다 (상대 경로 이미지를 절대 URL로 바꿔주는 기준).
 */
export function siteUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

/** 마크다운 기호를 대충 걷어내서 OG description용 평문으로 (렌더는 아니니 정교할 필요 없음) */
function stripMarkdown(markdown: string) {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[#>*_~`-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const DESCRIPTION_MAX = 80;

type CampaignForMetadata = {
  title: string;
  description: string;
  thumbnailUrl: string | null;
};

/**
 * 캠페인 공개 페이지(메인/성공)의 OG 메타데이터. 카카오톡 등에서 링크 공유 시 쓰인다.
 * - title: "{campaign.title}{titleSuffix}"
 * - image: thumbnailUrl이 있으면 그대로(크기 미지정 — 실제 비율을 모르니 잘못된 힌트를 주지 않는다),
 *   없으면 번들된 기본 이미지(public/og-default.png, 1200x630)
 */
export function campaignMetadata(
  campaign: CampaignForMetadata,
  { titleSuffix = "에 보태기" }: { titleSuffix?: string } = {},
): Metadata {
  const title = `${campaign.title}${titleSuffix}`;
  const plain = stripMarkdown(campaign.description);
  const description = plain
    ? plain.length > DESCRIPTION_MAX
      ? `${plain.slice(0, DESCRIPTION_MAX)}…`
      : plain
    : `${campaign.title} — 마음을 한 조각씩 보태주세요`;

  const images: NonNullable<Metadata["openGraph"]>["images"] = campaign.thumbnailUrl
    ? [{ url: campaign.thumbnailUrl }]
    : [{ url: "/og-default.png", width: 1200, height: 630 }];

  return {
    title,
    description,
    openGraph: { title, description, images, siteName: SITE_NAME, locale: "ko_KR", type: "website" },
  };
}
