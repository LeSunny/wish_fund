// 기본 OG 이미지를 한 번 생성해서 public/og-default.png로 저장하는 스크립트.
// 캠페인에 thumbnailUrl이 없을 때 쓰는 fallback (src/app/c/[slug]/page.tsx generateMetadata).
// 다시 만들고 싶으면: npx tsx scripts/generate-og-default.tsx
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { ImageResponse } from "next/og";

const galmuri = readFileSync(
  path.join(process.cwd(), "node_modules/galmuri/dist/Galmuri11-Bold.ttf"),
);

const ACCENTS = ["#ff9d5c", "#fff3b0", "#aabdff", "#ffc09a"];

async function main() {
  const image = new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#ffdcc8",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            background: "#f8f5ff",
            border: "6px solid #1c1a22",
            borderRadius: 28,
            padding: "56px 96px",
          }}
        >
          <div style={{ display: "flex", fontSize: 84, fontFamily: "Galmuri", color: "#1c1a22" }}>
            wish fund
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 28,
              fontSize: 38,
              fontFamily: "Galmuri",
              color: "#1c1a22",
            }}
          >
            🎁 생일선물에 마음 한 조각 보태기
          </div>
          <div style={{ display: "flex", gap: 14, marginTop: 36 }}>
            {ACCENTS.map((color) => (
              <div
                key={color}
                style={{ width: 28, height: 28, background: color, border: "3px solid #1c1a22" }}
              />
            ))}
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: [{ name: "Galmuri", data: galmuri, weight: 700, style: "normal" }],
    },
  );

  const buffer = Buffer.from(await image.arrayBuffer());
  const outPath = path.join(process.cwd(), "public/og-default.png");
  writeFileSync(outPath, buffer);
  console.log(`wrote ${outPath} (${(buffer.length / 1024).toFixed(0)}KB)`);
}

main();
