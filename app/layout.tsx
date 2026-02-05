import type { Metadata, Viewport } from "next"; // Viewport 추가
import "./globals.css";
import BrowserGuard from "./components/BrowserGuard"; // 컴포넌트 import

// PWA 뷰포트 설정 (확대 방지 등)
export const viewport: Viewport = {
  themeColor: "#6c5ce7",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "🇰🇷 K-Arena (한국어 게임)",
  description: "AI와 함께하는 실시간 한국어 배틀!",
  manifest: "/manifest.json", // 매니페스트 연결
  openGraph: {
    title: "🔥 K-Arena: 3초 승부!",
    description: "야 너두 할 수 있어! 뇌가 섹시해지는 한국어 두뇌 트레이닝 🧠",
    type: "website",
    locale: "ko_KR",
    siteName: "K-Arena",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link 
          rel="preconnect" 
          href="https://fonts.gstatic.com" 
          crossOrigin="anonymous" 
        />
        <link href="https://fonts.googleapis.com/css2?family=Jua&display=swap" rel="stylesheet" />
      </head>
      <body>
        <BrowserGuard /> {/* 여기에 추가! */}
        {children}
      </body>
    </html>
  );
}