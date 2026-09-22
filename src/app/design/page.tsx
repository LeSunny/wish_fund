import { notFound } from "next/navigation";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  GlobeIcon,
  GlossyHeart,
  HoloSquiggle,
  PixelCursor,
  Sparkle,
  Starburst,
} from "@/components/ui/Deco";
import { ProgressBar } from "@/components/ui/ProgressBar";

const swatches = [
  ["orange", "bg-orange"],
  ["apricot", "bg-apricot"],
  ["peach", "bg-peach"],
  ["butter", "bg-butter"],
  ["periwinkle", "bg-periwinkle"],
  ["lavender", "bg-lavender"],
  ["white", "bg-white"],
  ["ink", "bg-ink"],
] as const;

// 디자인 시스템 미리보기 (개발 환경 전용)
export default function DesignPage() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-16 px-4 py-12">
      {/* 히어로: 레퍼런스 구도 */}
      <section className="relative flex flex-col gap-6 pt-6">
        <Sparkle className="absolute -top-2 right-2 size-12 motion-safe:animate-twinkle" />
        <GlobeIcon className="absolute top-24 -right-6 size-40 text-apricot sm:-right-16" />
        <Starburst className="absolute -bottom-10 -left-12 size-40 text-apricot" />

        <ProgressBar confirmed={240000} pending={30000} goal={300000} className="relative self-center" />

        <Card title="birthday_wish.txt" className="relative" />

        <Card url="www.wishfund.kr/c/dasom" className="relative">
          <div className="flex flex-col items-center gap-6 py-4 text-center">
            <h1 className="font-pixel text-4xl leading-tight sm:text-5xl">HAPPY BIRTHDAY</h1>
            <p className="text-base">다솜이 생일선물에 한 조각 보태기 ♡</p>
            <div className="relative">
              <Button variant="butter" size="lg" className="min-w-60">
                선물 구경하기 !
              </Button>
              <PixelCursor className="absolute -bottom-6 -left-4 w-7" />
            </div>
            <div className="grid w-full grid-cols-2 gap-4 pt-2">
              <Button block>OK</Button>
              <Button block>후원하기</Button>
            </div>
          </div>
        </Card>
        <Starburst filled spikes={8} className="absolute top-[58%] -right-8 size-20 text-orange" />
        <GlossyHeart className="absolute -right-4 -bottom-16 size-28 motion-safe:animate-float sm:-right-14" />

        <div className="relative flex items-end gap-6 pt-6">
          <p className="font-pixel text-5xl leading-none">
            D-3
          </p>
          <p className="text-sm leading-relaxed">
            마감까지 3일 남았어요.
            <br />
            남은 금액은 차(tea)값으로 쓸게요.
          </p>
        </div>
        <HoloSquiggle className="w-40 self-end" />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-pixel text-xl">Colors</h2>
        <div className="grid grid-cols-4 gap-3 sm:grid-cols-8">
          {swatches.map(([name, bg]) => (
            <div key={name} className="flex flex-col gap-1 text-xs">
              <div className={`aspect-square border-2 border-ink ${bg}`} />
              {name}
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-pixel text-xl">Button</h2>
        <div className="flex flex-wrap items-center gap-3">
          <Button>후원하기</Button>
          <Button variant="butter">카카오페이</Button>
          <Button variant="periwinkle">토스</Button>
          <Button variant="white" size="sm">
            계좌 복사
          </Button>
          <Button variant="ink">송금했어요</Button>
          <Button disabled>마감됨</Button>
        </div>
        <ButtonLink href="/design" size="lg" block>
          ♡ 선물에 보태기 ♡
        </ButtonLink>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-pixel text-xl">Card</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Card title="my_code.txt">
            <p className="text-xs">내 후원 코드</p>
            <p className="mt-1 font-pixel text-3xl">귤-47-딸기</p>
            <p className="mt-2 text-xs">꼭 캡처해두세요!!</p>
          </Card>
          <Card url="wishfund.kr/c/dasom" tone="white">
            <p className="font-pixel text-lg">에어팟 프로 3</p>
            <p className="mt-1 text-sm text-ink/60">목표 359,000원</p>
          </Card>
          <Card tone="butter">
            <p>“생일 축하해!! 🎂”</p>
            <p className="mt-1 text-xs text-ink/60">— 익명</p>
          </Card>
          <Card tone="periwinkle">
            <p>남은 금액은 차(tea)값으로 쓸게요 🍵</p>
          </Card>
        </div>
      </section>

      <section className="flex flex-col gap-8">
        <h2 className="font-pixel text-xl">ProgressBar</h2>
        <ProgressBar confirmed={0} goal={300000} />
        <ProgressBar confirmed={125000} pending={50000} goal={300000} />
        <ProgressBar confirmed={375000} pending={20000} goal={300000} />
      </section>
    </main>
  );
}
