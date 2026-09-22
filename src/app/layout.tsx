import type { Metadata } from "next";
import { Nanum_Gothic_Coding } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

// 한글 픽셀 폰트 갈무리 (OFL-1.1, npm `galmuri`)
const pixel = localFont({
  src: "../../node_modules/galmuri/dist/Galmuri11-Bold.woff2",
  weight: "700",
  variable: "--font-galmuri",
  display: "swap",
});

// Google Fonts의 한글 글리프는 unicode-range 조각으로 함께 셀프호스팅된다.
// subsets는 preload 대상만 지정한다.
const sans = Nanum_Gothic_Coding({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-nanum-coding",
  display: "swap",
});

export const metadata: Metadata = {
  title: "wish fund",
  description: "생일선물에 한 조각 보태기",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={`${pixel.variable} ${sans.variable}`}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
