import "./globals.css";
import type { Metadata } from "next";
import { ReactNode } from "react";
import { ErrorBoundary } from "../components/ErrorBoundary";

export const metadata: Metadata = {
  title: "화법Gen",
  description: "화법 Gen: 보험 상품 이미지 기반 상담 화법 생성"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <body className="min-h-screen antialiased">
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </body>
    </html>
  );
}
