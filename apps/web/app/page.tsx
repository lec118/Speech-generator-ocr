"use client";

import { useState, useMemo, useEffect } from "react";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input } from "@repo/ui";
import type { LengthOption, ToneOption, LENGTH_LABELS, TONE_LABELS, MarkdownSection } from "@repo/core";
import { useFileProcessor } from "../hooks/useFileProcessor";
import { useGeneration } from "../hooks/useGeneration";
import { usePageSelection } from "../hooks/usePageSelection";
import { downloadMarkdown } from "../lib/download";

const LENGTH_OPTIONS: typeof LENGTH_LABELS = {
  short: "짧게 (300~400자)",
  medium: "중간 (500~700자)",
  long: "길게 (800~1000자)"
};

const TONE_OPTIONS: typeof TONE_LABELS = {
  basic: "기본 (설명형)",
  persuasive: "설득형 (광고형)",
  explanatory: "설명형 (예시중심)",
  bullet: "요점형 (숫자강조)"
};

function formatCurrency(value: number) {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: value < 0.01 ? 4 : 2
  });
}

export default function HomePage() {
  const [topic, setTopic] = useState("");
  const [length, setLength] = useState<LengthOption>("medium");
  const [tone, setTone] = useState<ToneOption>("basic");

  // Custom hooks
  const fileProcessor = useFileProcessor();
  const generation = useGeneration(topic, length, tone);
  const pageSelection = usePageSelection(fileProcessor.pages);

  const { pages, parsing, ocrProgress, errorMessage: fileError, dragActive, handleFileInput, handleDrag, handleDrop } = fileProcessor;
  const { results, loadingPage, batchLoading, errorMessage: genError, usageSummary, costSummary, generateForPage, generateAllPages } = generation;
  const { selectedPageIndex, selectedPage, setSelectedPageIndex } = pageSelection;

  const errorMessage = fileError || genError;
  const selectedResult = selectedPageIndex !== null ? results[selectedPageIndex] : null;

  const generatedSections = useMemo<MarkdownSection[]>(() => {
    return pages
      .filter((page) => typeof results[page.index] === "string")
      .map((page) => ({
        title: `Page ${page.index + 1}`,
        content: results[page.index]!
      }));
  }, [pages, results]);

  const completedCount = Object.keys(results).length;
  const totalCount = pages.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (generatedSections.length > 0) {
          handleDownloadMarkdown();
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'g') {
        e.preventDefault();
        if (pages.length > 0 && !batchLoading && !parsing) {
          generateAllPages(pages);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [generatedSections, pages, batchLoading, parsing]);

  const handleDownloadMarkdown = () => {
    if (!generatedSections.length) return;
    const title = topic ? topic : "speech";
    downloadMarkdown(`${title}-${new Date().toISOString().slice(0, 10)}`, generatedSections);
  };

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* 헤더 */}
      <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1920px] items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 text-xl shadow-lg">
              🏥
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">보험 화법 생성기 (TTS 최적화)</h1>
              <p className="text-xs text-slate-400">PDF/이미지 → 음성 대본 자동 생성</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="상품명 또는 주제"
              className="w-48 border-slate-600 bg-slate-900 text-xs text-slate-100"
            />
            <select
              value={length}
              onChange={(e) => setLength(e.target.value as LengthOption)}
              className="rounded-lg border border-slate-600 bg-slate-900 px-2 py-1.5 text-xs text-slate-100"
            >
              {Object.entries(LENGTH_OPTIONS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <select
              value={tone}
              onChange={(e) => setTone(e.target.value as ToneOption)}
              className="rounded-lg border border-slate-600 bg-slate-900 px-2 py-1.5 text-xs text-slate-100"
            >
              {Object.entries(TONE_OPTIONS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <Button
              onClick={() => generateAllPages(pages)}
              disabled={!pages.length || batchLoading || parsing}
              className="bg-gradient-to-r from-blue-600 to-purple-600 px-3 py-1.5 text-xs hover:from-blue-500 hover:to-purple-500"
            >
              {batchLoading ? "⏳ 생성중" : "🚀 전체생성"}
            </Button>
            <Button
              onClick={handleDownloadMarkdown}
              disabled={!generatedSections.length}
              variant="outline"
              className="border-emerald-500 px-3 py-1.5 text-xs text-emerald-400 hover:bg-emerald-500/10"
            >
              💾 다운로드
            </Button>
          </div>
        </div>
        {/* 진행률 바 */}
        {totalCount > 0 && (
          <div className="h-1 bg-slate-900">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </header>

      {/* 메인: 좌측(TTS 화법) / 우측(원본 페이지) */}
      <main className="mx-auto flex w-full max-w-[1920px] flex-1 gap-6 p-6">
        {pages.length === 0 ? (
          /* 파일 업로드 영역 (초기 상태) */
          <div className="flex flex-1 items-center justify-center">
            <Card className="w-full max-w-2xl border-slate-700 bg-gradient-to-br from-slate-900 to-slate-800 shadow-2xl">
              <CardHeader>
                <CardTitle className="text-center text-2xl">📎 파일 업로드</CardTitle>
                <CardDescription className="text-center">
                  PDF 또는 이미지 파일을 업로드하여 TTS 화법 대본을 자동 생성하세요
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div
                  className={`group relative rounded-2xl border-2 border-dashed p-16 text-center transition-all duration-300 ${
                    dragActive
                      ? "scale-105 border-blue-400 bg-gradient-to-br from-blue-500/20 via-purple-500/20 to-pink-500/20 shadow-2xl shadow-blue-500/30"
                      : "border-slate-600 bg-slate-800/50 hover:border-blue-500 hover:shadow-xl"
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  {parsing ? (
                    <div className="flex flex-col items-center gap-4">
                      <div className="h-20 w-20 animate-spin rounded-full border-4 border-slate-700 border-t-blue-500"></div>
                      <p className="text-base font-medium text-slate-300">
                        {ocrProgress > 0 ? `OCR 처리 중... ${ocrProgress}%` : "파일 분석 중..."}
                      </p>
                      {ocrProgress > 0 && (
                        <div className="h-3 w-80 overflow-hidden rounded-full bg-slate-700">
                          <div
                            className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all"
                            style={{ width: `${ocrProgress}%` }}
                          />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-6">
                      <div className="text-7xl opacity-80 transition-all duration-300 group-hover:scale-110">
                        📄
                      </div>
                      <div>
                        <p className="mb-2 text-xl font-semibold text-slate-200">
                          파일을 드래그하거나 클릭하여 선택하세요
                        </p>
                        <p className="text-sm text-slate-400">
                          지원 형식: PDF, JPG, PNG
                        </p>
                      </div>
                      <Button
                        onClick={() => document.getElementById("file-input")?.click()}
                        className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-3 text-base shadow-lg hover:from-blue-500 hover:to-purple-500"
                      >
                        📂 파일 선택
                      </Button>
                      <input
                        id="file-input"
                        type="file"
                        accept=".pdf,image/jpeg,image/png,image/jpg"
                        onChange={(e) => e.target && handleFileInput(e.target)}
                        className="hidden"
                      />
                    </div>
                  )}
                </div>

                {errorMessage && (
                  <div className="mt-6 rounded-xl border border-red-500/50 bg-red-500/10 p-4 text-center">
                    <p className="text-sm font-medium text-red-400">⚠️ {errorMessage}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          <>
            {/* 좌측: 생성된 TTS 화법 */}
            <div className="flex w-1/2 flex-col gap-4">
              <Card className="flex-1 border-slate-700 bg-gradient-to-br from-emerald-950/30 to-slate-900">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-lg">
                    <span>✨ 생성된 TTS 화법 대본</span>
                    {selectedPage && (
                      <Badge className="ml-auto bg-emerald-600 text-sm">
                        [p.{selectedPage.index + 1}]
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  {selectedResult ? (
                    <div className="flex flex-col gap-4">
                      <div className="max-h-[600px] overflow-y-auto rounded-xl bg-slate-950/50 p-6">
                        <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-emerald-50">
{selectedResult}
                        </pre>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => navigator.clipboard.writeText(selectedResult)}
                          className="bg-emerald-600 px-3 py-1.5 text-xs hover:bg-emerald-700"
                        >
                          📋 복사
                        </Button>
                        <Button
                          onClick={handleDownloadMarkdown}
                          variant="outline"
                          className="border-emerald-500 px-3 py-1.5 text-xs text-emerald-400"
                        >
                          💾 다운로드
                        </Button>
                      </div>
                    </div>
                  ) : selectedPage ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                      <p className="mb-4 text-5xl">💭</p>
                      <p className="mb-2 text-base text-slate-300">
                        이 페이지의 TTS 화법이 아직 생성되지 않았습니다
                      </p>
                      <p className="mb-6 text-xs text-slate-500">
                        아래 버튼을 눌러 바로 생성하거나, 상단의 "전체생성"을 이용하세요
                      </p>
                      <Button
                        onClick={() => selectedPage && generateForPage(selectedPage)}
                        disabled={loadingPage === selectedPage.index}
                        className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500"
                      >
                        {loadingPage === selectedPage.index ? "⏳ 생성 중..." : "🎯 이 페이지만 생성"}
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                      <p className="mb-4 text-5xl">👈</p>
                      <p className="text-base text-slate-300">
                        우측에서 페이지를 선택하세요
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* 사용량 및 비용 정보 */}
              {(usageSummary || costSummary) && (
                <Card className="border-slate-700 bg-slate-900/50">
                  <CardContent className="flex items-center justify-between py-3">
                    <div className="flex gap-6 text-xs text-slate-400">
                      {usageSummary && (
                        <>
                          <span>입력: {usageSummary.promptTokens.toLocaleString()} tokens</span>
                          <span>출력: {usageSummary.completionTokens.toLocaleString()} tokens</span>
                          <span>총: {usageSummary.totalTokens.toLocaleString()} tokens</span>
                        </>
                      )}
                    </div>
                    {costSummary && (
                      <span className="text-xs font-medium text-emerald-400">
                        예상 비용: {formatCurrency(costSummary.totalCost)}
                      </span>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* 우측: 원본 페이지 미리보기 */}
            <div className="flex w-1/2 flex-col gap-4">
              <Card className="flex-1 border-slate-700 bg-slate-900">
                <CardHeader>
                  <CardTitle className="text-lg">
                    📄 원본 페이지 미리보기
                    <Badge variant="success" className="ml-2 text-xs">
                      {completedCount}/{totalCount} 완료
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="max-h-[calc(100vh-200px)] space-y-3 overflow-y-auto pr-2">
                    {pages.map((page) => (
                      <button
                        key={page.index}
                        onClick={() => setSelectedPageIndex(page.index)}
                        className={`group relative w-full rounded-xl border-2 p-4 text-left transition-all duration-200 ${
                          selectedPageIndex === page.index
                            ? "scale-[1.02] border-blue-500 bg-gradient-to-br from-blue-950/40 to-purple-950/40 shadow-lg shadow-blue-500/20"
                            : "border-slate-700 bg-slate-800/50 hover:border-slate-600 hover:bg-slate-800"
                        }`}
                      >
                        <div className="mb-2 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge
                              className={`text-xs ${
                                results[page.index]
                                  ? "bg-emerald-600 text-white"
                                  : "bg-slate-700 text-slate-300"
                              }`}
                            >
                              {results[page.index] ? "✓" : `p.${page.index + 1}`}
                            </Badge>
                            <span className="text-sm font-semibold text-slate-200">
                              Page {page.index + 1}
                            </span>
                          </div>
                          {loadingPage === page.index && (
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-600 border-t-blue-500" />
                          )}
                        </div>
                        <p className="line-clamp-4 text-xs leading-relaxed text-slate-400">
                          {page.text}
                        </p>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
