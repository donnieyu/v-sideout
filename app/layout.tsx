import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "사이드아웃 · 배구 모임",
  description: "일요일의 배구, 함께 준비하는 한 주. 참석 신청과 팀 편성.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased">{children}</body>
    </html>
  );
}
