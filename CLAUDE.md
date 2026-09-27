@AGENTS.md

# wish_fund — 생일선물 펀딩

친구들이 생일선물 비용을 원하는 금액만큼 나눠서 보태주는 **1인용 펀딩 페이지**.
텀블벅/와디즈 같은 구조에 훨씬 키치한 톤.

## 기술 스택

- Next.js 16 (App Router) + TypeScript + Tailwind CSS v4
  - Next 16은 학습 데이터와 API가 다를 수 있음 → `node_modules/next/dist/docs/` 먼저 확인
  - Tailwind v4는 `tailwind.config.*` 없이 `src/app/globals.css`의 `@theme`가 설정 파일
- Prisma 7 + SQLite (로컬). 배포 시 Postgres로 교체 가능하도록 스키마 작성
  - Prisma 7 방식: 연결 URL은 `prisma.config.ts`, 런타임은 드라이버 어댑터(`src/lib/prisma.ts`, better-sqlite3)
  - 클라이언트는 `src/generated/prisma`에 생성 (gitignore, `postinstall`에서 `prisma generate`). import는 `@/generated/prisma/client`
  - `prisma` 패키지 npm `latest` 태그가 8.0 RC를 가리키므로 7.x로 고정해서 설치할 것
- zod (모든 외부 입력 검증)
- 배포: Vercel

## MVP 범위

- 회원가입/로그인 없음. 캠페인은 관리자 1명만 등록.
- 결제 연동 없음. 수동 송금(카카오페이/토스 송금 링크, 계좌번호 복사 버튼).
- 향후 회원 기능·PG 결제를 붙일 수 있도록 확장 필드를 **스키마에만** 둔다. MVP 코드에서는 읽지도 쓰지도 않는다.
  - `Campaign.ownerId`, `Pledge.paymentMethod`, `Pledge.paymentId`

## 데이터 모델

### Campaign
| 필드 | 타입 | 비고 |
|---|---|---|
| id | String (cuid) | |
| slug | String, unique | 공유용 URL |
| title | String | |
| description | String | 마크다운 허용 (렌더 시 raw HTML 비허용) |
| productUrl, thumbnailUrl | String? | |
| goalAmount | Int | 원 단위 |
| deadline | DateTime | |
| accountInfo | String? | 은행/계좌/예금주 |
| kakaopayUrl, tossUrl | String? | |
| status | `DRAFT` \| `OPEN` \| `CLOSED` | |
| thanksMessage | String? | 성공 페이지 문구 |
| ownerId | String? | 향후 확장용, MVP 미사용 |
| createdAt, updatedAt | DateTime | |

### Pledge
| 필드 | 타입 | 비고 |
|---|---|---|
| id | String (cuid) | |
| campaignId | String | FK → Campaign |
| code | String, **unique (전역)** | 수정/취소용. 서버 발급. `귤-47-딸기` 형태 |
| displayName | String | 닉네임 가능 |
| isAnonymous | Boolean, 기본 false | true면 공개 목록에 "익명" |
| amount | Int | 원 단위 |
| isAmountPublic | Boolean, 기본 **false** | false면 공개 목록에서 금액 숨김. 관리자 화면은 항상 노출 |
| message | String? | 한 줄 축하 메시지 |
| status | `PENDING` \| `CONFIRMED` \| `CANCELLED` | 생성 시 PENDING |
| paymentMethod, paymentId | String? | 향후 PG 확장용, MVP 미사용 |
| createdAt, updatedAt | DateTime | |

## 라우팅

| 경로 | 설명 |
|---|---|
| `/` | 대표 캠페인으로 이동 (`DEFAULT_CAMPAIGN_SLUG` env, 없으면 가장 최근 OPEN 캠페인) |
| `/c/[slug]` | 캠페인 메인: 진행률, 상품, 후원자 목록, 후원하기 CTA. DRAFT는 404, **CLOSED는 `/success`로 redirect** |
| `/c/[slug]/pledge` | 후원 플로우 (입력 → 송금 안내 → 코드 발급 완료 화면) |
| `/c/[slug]/success` | 마감 후 성공 페이지. **CLOSED가 아니면 메인으로 redirect** (서로 반대 방향으로 맞물림) |
| `/my/[code]` | 내 후원 조회/수정/취소 (코드만으로 접근) |
| `/admin` | 관리자 로그인 화면 (세션 있으면 캠페인 목록) |
| `/admin/campaigns/new` | 캠페인 생성 |
| `/admin/campaigns/[id]` | 캠페인 수정 + 후원 목록(입금 확인) + 수동 마감 |

## 핵심 규칙

- **진행률** = `CONFIRMED` 합계 / `goalAmount`. `PENDING` 합계는 "입금 대기 중"으로 별도 표시. `CANCELLED`는 어디에도 합산하지 않음.
- **마감**: `deadline`이 지나면 `CLOSED`. Vercel에 상시 워커가 없으므로 캠페인 조회 시점에 lazy 하게 검사·갱신한다 (`lib/campaign.ts`의 헬퍼 한 곳에서만 처리).
- 목표 미달성이어도 마감 시 그대로 **성공 처리** (차액은 관리자 부담).
- **초과 달성** 시 "남은 금액은 차(tea)값으로 쓸게요" 문구 노출.
- **후원 완료 화면**: 코드를 크게 표시 + "캡처해두세요" 안내 + 복사 버튼 + `/my/[code]` 링크.
- **코드 분실**: displayName 등으로 조회하는 기능은 만들지 않는다 (타인 조회 위험). 안내 문구만 노출.
- **수정/취소 가능 조건**: pledge.status ∈ {PENDING, CONFIRMED} **AND** campaign.status == OPEN.
  - 취소는 삭제가 아니라 `status = CANCELLED` (soft).
  - CONFIRMED 후원의 금액을 수정하면 `PENDING`으로 되돌린다 (재입금 확인 필요). CONFIRMED 후원 취소 시 환불은 수동이라는 안내를 노출.
- `PENDING → CONFIRMED` 전환은 관리자만 (입금 확인 후).

### 후원 코드 규칙
- 형식: `{한글명사}-{10~99}-{한글명사}` (예: `귤-47-딸기`). 명사 목록은 `lib/pledge-code.ts`에 상수로.
- 서버에서만 생성. DB unique 제약 + 생성 시 중복 검사, 충돌 시 재시도(최대 N회).
- 조회 시 입력 정규화: 앞뒤 공백 제거, 공백/`_`/연속 하이픈 → `-`.

## 보안

- 관리자 비밀번호는 env `ADMIN_PASSWORD`로만. **하드코딩 금지**. 비교는 timing-safe(`lib/admin-session.ts`, 양쪽을 sha256 다이제스트로 만든 뒤 `timingSafeEqual` — 길이가 달라도 안전).
- 관리자 세션: HMAC 서명된 httpOnly/secure(prod)/sameSite=lax 쿠키, 유효기간 7일. 서명 키 env `ADMIN_SESSION_SECRET`. `requireAdminSession()`을 모든 `/admin/**` 페이지·서버 액션 맨 위에서 호출.
- 관리자 로그인에도 rate limit (IP당 10분 10회) — 비밀번호 하나뿐이라 무차별 대입 방지가 특히 중요.
- 코드 조회 API(`/my/[code]` 및 관련 액션)에 **인메모리 rate limit** (IP 기준, `lib/rate-limit.ts`).
  - 서버리스 인스턴스 간 공유되지 않는 한계는 인지하고 수용 (MVP).
- 모든 입력은 zod 스키마(`lib/validation.ts`, 클라이언트/서버 공용)로 검증. 금액은 1,000원 단위 정수, 최소 1,000원 · 최대 1,000,000원.
- 후원 생성 Server Action에도 rate limit (IP당 10분 10회).
- 공개 API/페이지는 `isAnonymous`, `isAmountPublic`을 **서버에서** 마스킹한 뒤 내려보낸다 (클라이언트 마스킹 금지). `code`는 공개 응답에 절대 포함하지 않는다. 관리자 화면(`listPledgesForAdmin`)은 마스킹 없이 실제 값 그대로.
- 상품 URL OG 스크래핑(`lib/og-scrape.ts`)은 관리자가 지정한 URL로 서버가 요청을 보낸다는 점에서 SSRF 표면이지만, 세션 인증된 단일 신뢰 관리자만 호출 가능(본인이 직접 curl 치는 것과 같은 신뢰 수준). 최소 방어로 http(s) 프로토콜만 허용 + 사설/루프백 호스트 차단 + 5초 타임아웃 + 응답 500KB 캡. 완전한 SSRF 방어(DNS 재조회 기반 사설대역 검사 등)는 아님 — 알고 수용.
- `/admin/**`는 `robots: { index: false, follow: false }` (레이아웃 metadata).

## 환경변수

| 이름 | 설명 |
|---|---|
| `DATABASE_URL` | 로컬: `file:./prisma/dev.db` / 배포: Postgres URL |
| `ADMIN_PASSWORD` | 관리자 비밀번호 |
| `ADMIN_SESSION_SECRET` | 관리자 세션 쿠키 서명 키 (32바이트 이상 랜덤) |
| `DEFAULT_CAMPAIGN_SLUG` | `/` 접속 시 이동할 캠페인 (선택) |
| `NEXT_PUBLIC_SITE_URL` | OG 이미지 등 절대 URL 기준 도메인 (선택 — Vercel이면 배포 도메인으로 자동 추정, `lib/metadata.ts`) |

## Postgres 이식 원칙

- Prisma `enum` 사용 (SQLite는 Prisma 6.2+에서 지원).
- 금액은 `Int` (원 단위, 소수 없음). `Float`/`Decimal` 사용 금지.
- SQLite 전용 기능/raw SQL 사용 금지.
- 전환 절차: schema `provider` → `postgresql`, `src/lib/prisma.ts`·`prisma/seed.ts` 어댑터 → `@prisma/adapter-pg`, 기존 `prisma/migrations`(SQLite용 SQL)는 지우고 새로 `migrate dev`.

## 디자인 시스템 (Y2K 레트로 웹)

키워드: 복숭아빛 흐린 그라데이션 + 흰 모눈 격자, 옛날 브라우저/파일 창, 픽셀 폰트, 게임 체력바 하트, 선으로 그린 반짝이·별·지구본, 광택 하트, 홀로그램 물결.
**요소는 기울이지 않는다** (카드·버튼 모두 정방향). 선은 얇고 또렷하게, 그림자는 hover 시에만.

토큰은 전부 `src/app/globals.css`의 `@theme`에 있다. 기본 Tailwind 팔레트는 `--color-*: initial`로 비워뒀으므로 **토큰 색만 사용**.

| 토큰 | 값 / 유틸리티 |
|---|---|
| 색 | `ink`(#1c1a22) `white` `lavender`(창 본문) `peach`(배경) `apricot` `orange`(CTA·타이틀바) `butter`(주소창·채운 하트) `periwinkle`(닫기 버튼·빈 하트) |
| 보더 | 항상 `border-2 border-ink` |
| 그림자 | 평소엔 없음. 버튼 hover 시 `shadow-pop`(3px 하드 섀도) — `press` 유틸리티 |
| 모서리 | 창/카드 `rounded-window`(16px), 버튼은 각진 사각형 |
| 배경 | body에 복숭아 그라데이션 + 가장자리만 보이는 `bg-grid` 격자 (전역 적용) |
| 질감 | `bg-holo`(파스텔 홀로그램) `mask-heart`(하트 모양 마스크) |
| 폰트 | `font-pixel` = 갈무리11 Bold (제목·숫자·버튼·타이틀바), `font-sans` = Nanum Gothic Coding (본문, 고정폭) |
| 모션 | `animate-twinkle`(반짝이) `animate-float`(둥실 하트) |

- 갈무리는 npm `galmuri` 패키지(OFL-1.1)에서 `next/font/local`로 로드. 굵기는 Bold 하나뿐.
- 애니메이션은 `motion-safe:` 접두사로. 전역 `prefers-reduced-motion` 가드도 있음.
- 공통 컴포넌트 `src/components/ui/`:
  - `Button`/`ButtonLink` — variant(orange·butter·periwinkle·white·ink)·size·block
  - `Card` — tone, `url`(브라우저 창 타이틀바) 또는 `title`(파일 창 타이틀바 + ✕). children 없으면 타이틀바만
  - `ProgressBar` — 하트 10개 게이지(1개=10%). 노랑=입금 확인, 살구=입금 대기, 파랑=빈 칸
  - `Deco` — `Sparkle` `Starburst` `GlobeIcon` `ArrowLeftIcon` `PixelCursor` `GlossyHeart` `HoloSquiggle` (장식용, aria-hidden)
- 미리보기: 개발 서버에서 `/design` (production에서는 404).

## 명령어

| 명령 | 설명 |
|---|---|
| `npm run dev` | 개발 서버 |
| `npm run db:migrate` | 스키마 변경 → 마이그레이션 (`prisma migrate dev`, 이후 `npx prisma generate`) |
| `npm run db:seed` | 예시 캠페인 `/c/dasom` + 후원 4건 (다시 실행하면 초기화) |
| `npm run db:studio` | DB 브라우저 |

## 코드 컨벤션

- 데이터 변경은 Server Actions 우선, 외부 호출이 필요한 경우만 Route Handler.
- DB 접근은 `lib/` 헬퍼를 통해서만 (페이지 컴포넌트에서 prisma 직접 호출 지양).
- UI 문구는 한국어, 톤은 키치하게.

## 구현 로드맵

각 단계는 완료 후 확인받고 다음으로 넘어간다.

1. [x] CLAUDE.md, `prisma/schema.prisma`
2. [x] 프로젝트 뼈대 + 디자인 시스템 (토큰, Button/Card/ProgressBar)
3. [x] 후원 플로우 `/c/[slug]/pledge`
   - 금액: 1~10만원 만원 단위 버튼 + 직접 입력(1,000원 단위, 최소 1,000원). 버튼과 입력값 양방향 동기화
   - 이름/메시지/익명여부/금액공개여부 입력 → 송금 안내(카카오페이·토스 링크, 계좌 복사) → "송금했어요" 클릭 시 PENDING 저장 → 코드 발급 화면
   - 송금 안내 단계까지는 DB에 아무것도 저장하지 않는다. 코드 발급 화면은 새로고침하면 사라지므로 캡처 안내를 강하게
   - 부수로 캠페인 메인 `/c/[slug]`도 함께 구현 (완료 화면·마감 안내가 여길 링크하는데 없었음). 공개 후원자 목록 마스킹은 `lib/pledge.ts`의 `getPublicPledges`
4. [x] 성공 페이지 `/c/[slug]/success`
   - 첫 진입 1회만 confetti (localStorage 기록, `ConfettiOnce`), 이후엔 애니메이션 없이 감사 화면
   - 후원자 목록을 엔딩 크레딧처럼 아래→위로 천천히 스크롤 (`CreditsScroll`). 항목 5개 미만이면 굳이 안 돌리고 고정 목록
   - `prefers-reduced-motion`: JS에서 먼저 분기(컨페티는 아예 생성 안 함, 크레딧은 정적 목록) + `motion-safe:`/전역 CSS로 이중 방어
   - 설명(마크다운)은 `react-markdown`(+ remark-gfm)으로 렌더 — raw HTML은 기본적으로 무시됨 (라이브러리 기본 동작, 별도 sanitize 불필요)
5. [x] 공유: `generateMetadata`로 카카오톡 OG 태그 (캠페인 제목·썸네일·"OO님의 생일선물에 보태기"). 썸네일 없으면 기본 이미지
   - 공통 로직은 `lib/metadata.ts`의 `campaignMetadata()` — `/c/[slug]`(제목 "…에 보태기")와 `/c/[slug]/success`(제목 "…펀딩 완료!")에서 공용
   - `metadataBase`는 루트 layout에 설정 (`siteUrl()`: `NEXT_PUBLIC_SITE_URL` → Vercel 배포 도메인 → localhost)
   - 이미지: `thumbnailUrl`이 있으면 그대로 사용(실제 비율을 모르니 width/height 힌트는 안 줌), 없으면 `public/og-default.png`(1200×630, `scripts/generate-og-default.tsx`로 생성 — `next/og`의 `ImageResponse` + 갈무리 폰트. 다시 만들려면 `npx tsx scripts/generate-og-default.tsx`)
   - description은 마크다운 기호를 걷어낸 평문 80자 요약
6. [x] 관리자 `/admin`
   - 캠페인 생성/수정(목표금액·마감일·상품 URL·계좌정보), 수동 마감 버튼(2단계 확인, OPEN일 때만 노출)
   - 후원 목록 테이블(금액·이름·코드 항상 노출), PENDING→CONFIRMED 확인 버튼
   - 상품 URL 입력 시 OG 태그 스크래핑으로 제목·썸네일 자동 채움 (실패 시 직접 입력) — `lib/og-scrape.ts`, 정규식 기반(HTML 파서 미사용)
   - slug는 생성 후 수정 불가(폼에서 hidden으로 유지) — 공유된 링크가 깨지지 않게
   - CLOSED는 폼에서 되돌릴 수 없음(터미널 상태). DRAFT↔OPEN만 select로 토글
   - 두 useActionState(`saveCampaign`/`fetchProductOgAction`)를 버튼별 `formAction`으로 한 폼에 공존시킴
