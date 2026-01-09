import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  // 1. 브라우저 탭 이름 (Create Next App 삭제)
  title: "🇰🇷 K-Arena (한국어 게임)",
  
  // 2. 검색 엔진 및 기본 설명
  description: "AI와 함께하는 실시간 한국어 배틀! 스피드 퀴즈, 끝말잇기, 문장 조각 맞추기 등 다양한 미니게임을 즐겨보세요.",
  
  // 3. 카카오톡/SNS 공유 시 보이는 카드 설정 (캐주얼한 느낌)
  openGraph: {
    title: "🔥 K-Arena: 3초 승부!",
    description: "야 너두 할 수 있어! 뇌가 섹시해지는 한국어 두뇌 트레이닝 🧠 친구들과 점수 대결 고고? 👉",
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
        {/* 구글 폰트: Jua (동글동글한 게임 폰트) 적용 */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link 
          rel="preconnect" 
          href="https://fonts.gstatic.com" 
          crossOrigin="anonymous" 
        />
        <link href="https://fonts.googleapis.com/css2?family=Jua&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  );
}