-- 캠페인당 상품 1개(campaigns.productUrl/thumbnailUrl) → 상품 여러 개(products 테이블)

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT,
    "thumbnailUrl" TEXT,
    "price" INTEGER,
    "sortOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "products_campaignId_sortOrder_idx" ON "products"("campaignId", "sortOrder");

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 기존 상품 정보를 첫 번째 상품으로 옮긴다. 상품명은 따로 없었으므로 캠페인 제목으로 채움 (관리자 화면에서 수정)
INSERT INTO "products" ("id", "campaignId", "title", "url", "thumbnailUrl", "sortOrder", "updatedAt")
SELECT gen_random_uuid()::text, "id", "title", "productUrl", "thumbnailUrl", 0, CURRENT_TIMESTAMP
FROM "campaigns"
WHERE "productUrl" IS NOT NULL OR "thumbnailUrl" IS NOT NULL;

-- AlterTable
ALTER TABLE "campaigns" DROP COLUMN "productUrl",
DROP COLUMN "thumbnailUrl";
