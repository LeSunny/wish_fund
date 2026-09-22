// 개발용 예시 데이터. `npm run db:seed`
import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";
import { generatePledgeCode } from "../src/lib/pledge-code";

const prisma = new PrismaClient({
  adapter: new PrismaBetterSqlite3({ url: process.env.DATABASE_URL! }),
});

const DAY = 24 * 60 * 60 * 1000;

async function main() {
  await prisma.campaign.deleteMany({ where: { slug: "dasom" } });

  const campaign = await prisma.campaign.create({
    data: {
      slug: "dasom",
      title: "다솜이 생일선물",
      description: "올해 생일엔 **에어팟 프로 3**가 갖고 싶어요 🎧\n\n마음만 보태줘도 충분해요!",
      productUrl: "https://www.apple.com/kr/airpods-pro/",
      goalAmount: 359_000,
      deadline: new Date(Date.now() + 7 * DAY),
      accountInfo: "카카오뱅크 3333-00-0000000 이다솜 (예시)",
      kakaopayUrl: "https://qr.kakaopay.com/example",
      tossUrl: "https://toss.me/example",
      status: "OPEN",
      thanksMessage: "보태준 모두 고마워요!! 잘 쓸게요 ♡",
    },
  });

  const pledges = [
    { displayName: "귤잼", amount: 30_000, status: "CONFIRMED", isAmountPublic: true, message: "생일 축하해!!" },
    { displayName: "민지", amount: 50_000, status: "CONFIRMED", isAnonymous: true },
    { displayName: "현우", amount: 20_000, status: "PENDING", message: "늦어서 미안 ㅎㅎ" },
    { displayName: "취소한사람", amount: 10_000, status: "CANCELLED" },
  ] as const;

  for (const p of pledges) {
    await prisma.pledge.create({
      data: { campaignId: campaign.id, code: generatePledgeCode(), ...p },
    });
  }

  console.log(`seeded campaign /c/${campaign.slug} with ${pledges.length} pledges`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
