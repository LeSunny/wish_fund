-- CreateTable
CREATE TABLE "campaigns" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "productUrl" TEXT,
    "thumbnailUrl" TEXT,
    "goalAmount" INTEGER NOT NULL,
    "deadline" DATETIME NOT NULL,
    "accountInfo" TEXT,
    "kakaopayUrl" TEXT,
    "tossUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "thanksMessage" TEXT,
    "ownerId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "pledges" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "isAnonymous" BOOLEAN NOT NULL DEFAULT false,
    "amount" INTEGER NOT NULL,
    "isAmountPublic" BOOLEAN NOT NULL DEFAULT false,
    "message" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "paymentMethod" TEXT,
    "paymentId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "pledges_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "campaigns_slug_key" ON "campaigns"("slug");

-- CreateIndex
CREATE INDEX "campaigns_status_idx" ON "campaigns"("status");

-- CreateIndex
CREATE UNIQUE INDEX "pledges_code_key" ON "pledges"("code");

-- CreateIndex
CREATE INDEX "pledges_campaignId_status_idx" ON "pledges"("campaignId", "status");
