import type { Metadata } from "next";
import "./globals.css";
import { Nav } from "@/components/Nav";

export const metadata: Metadata = {
  title: "한화생명 고객터치 KPI 대시보드",
  description: "이벤트·혜택·참여 행동 기반 의사결정 지원 대시보드 (MVP)",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <Nav />
        <main className="mx-auto w-full max-w-[1400px] flex-1 px-6 py-6">{children}</main>
        <footer className="border-t border-[var(--border)] py-4 text-center text-xs text-gray-400">
          한화생명 고객터치 시스템 KPI 대시보드 (MVP) · 데이터 기준일 2026-09-04 · 내부 업무용
        </footer>
      </body>
    </html>
  );
}
