import "server-only";

// 관리자가 입력한 상품 URL에서 og:title/og:image를 긁어와 캠페인 등록 폼을 자동으로 채우는 용도.
// 실패하면 호출 쪽에서 "직접 입력해주세요"로 안내한다 (CLAUDE.md 관리자 스펙).
//
// 보안 메모: 이 서버가 관리자가 지정한 임의 URL로 요청을 나간다는 점에서 원론적으로는 SSRF 표면이지만,
// 이 기능은 세션 인증된 단일 신뢰 관리자만 호출할 수 있다 (본인이 직접 curl 치는 것과 같은 신뢰 수준).
// 그래도 최소한의 방어로 프로토콜을 http(s)로 제한하고 사설/루프백 호스트를 걸러낸다.

const FETCH_TIMEOUT_MS = 5_000;
const MAX_BYTES = 500_000; // og 태그는 보통 <head>에 있어서 이 정도면 충분

// 사설/루프백 대역 차단용. 완전한 SSRF 방어(DNS 재조회 등)는 아니고, 실수·오남용을 줄이는 최소 방어선.
const PRIVATE_HOSTNAME_PATTERNS = [
  /^localhost$/i,
  /^127\./, // 127.0.0.0/8 loopback
  /^10\./, // 10.0.0.0/8
  /^172\.(1[6-9]|2\d|3[01])\./, // 172.16.0.0/12
  /^192\.168\./, // 192.168.0.0/16
  /^0\.0\.0\.0$/,
  /^\[::1]$/, // IPv6 loopback (URL#hostname은 대괄호 포함)
  /\.local$/i, // mDNS
];

function isPrivateHostname(hostname: string) {
  return PRIVATE_HOSTNAME_PATTERNS.some((pattern) => pattern.test(hostname));
}

export type OgResult = { title: string | null; image: string | null };

export async function fetchOpenGraph(rawUrl: string): Promise<OgResult> {
  const url = new URL(rawUrl);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("http(s) 주소만 가져올 수 있어요");
  }
  if (isPrivateHostname(url.hostname)) {
    throw new Error("이 주소는 가져올 수 없어요");
  }

  const res = await fetch(url, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    redirect: "follow",
    headers: {
      // 일부 쇼핑몰이 기본 fetch UA는 막아서, 실제 브라우저처럼 보이게
      "user-agent": "Mozilla/5.0 (compatible; wishfund-link-preview/1.0)",
      accept: "text/html,application/xhtml+xml",
    },
  });
  if (!res.ok || !res.body) throw new Error(`페이지를 가져오지 못했어요 (${res.status})`);

  const html = await readCapped(res.body, MAX_BYTES);
  const finalUrl = res.url || rawUrl;

  const title = pickMeta(html, ["og:title", "twitter:title"]) ?? pickTitleTag(html);
  const rawImage = pickMeta(html, ["og:image", "og:image:url", "twitter:image"]);

  return { title, image: rawImage ? resolveUrl(rawImage, finalUrl) : null };
}

/** 응답 본문을 maxBytes까지만 읽고 나머지는 취소한다 (거대한 페이지 다운로드 방지). */
async function readCapped(stream: ReadableStream<Uint8Array>, maxBytes: number) {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (total < maxBytes) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    total += value.length;
  }
  await reader.cancel().catch(() => {});
  return Buffer.concat(chunks).toString("utf8");
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** <meta property="{key}" content="..."> 를 속성 순서 상관없이 찾는다. */
function pickMeta(html: string, keys: string[]): string | null {
  for (const key of keys) {
    const escaped = escapeRegExp(key);
    const forward = html.match(
      new RegExp(`<meta[^>]+(?:property|name)=["']${escaped}["'][^>]*content=["']([^"']*)["']`, "i"),
    );
    if (forward) return decodeHtmlEntities(forward[1].trim());

    const backward = html.match(
      new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${escaped}["']`, "i"),
    );
    if (backward) return decodeHtmlEntities(backward[1].trim());
  }
  return null;
}

function pickTitleTag(html: string): string | null {
  const match = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  return match ? decodeHtmlEntities(match[1].trim()) : null;
}

function decodeHtmlEntities(s: string) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&#x27;/g, "'");
}

function resolveUrl(maybeRelative: string, base: string) {
  try {
    return new URL(maybeRelative, base).toString();
  } catch {
    return null;
  }
}
