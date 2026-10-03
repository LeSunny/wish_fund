-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "PledgeStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED');

-- CreateTable
CREATE TABLE "campaigns" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "productUrl" TEXT,
    "thumbnailUrl" TEXT,
    "goalAmount" INTEGER NOT NULL,
    "deadline" TIMESTAMP(3) NOT NULL,
    "accountInfo" TEXT,
    "kakaopayUrl" TEXT,
    "tossUrl" TEXT,
    "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "thanksMessage" TEXT,
    "ownerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pledges" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "isAnonymous" BOOLEAN NOT NULL DEFAULT false,
    "amount" INTEGER NOT NULL,
    "isAmountPublic" BOOLEAN NOT NULL DEFAULT false,
    "message" TEXT,
    "status" "PledgeStatus" NOT NULL DEFAULT 'PENDING',
    "paymentMethod" TEXT,
    "paymentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pledges_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "campaigns_slug_key" ON "campaigns"("slug");

-- CreateIndex
CREATE INDEX "campaigns_status_idx" ON "campaigns"("status");

-- CreateIndex
CREATE UNIQUE INDEX "pledges_code_key" ON "pledges"("code");

-- CreateIndex
CREATE INDEX "pledges_campaignId_status_idx" ON "pledges"("campaignId", "status");

-- AddForeignKey
ALTER TABLE "pledges" ADD CONSTRAINT "pledges_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
