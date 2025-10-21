"use client";

import { useMemo, useState, useEffect } from "react";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter, Input } from "@repo/ui";
import type { MarkdownSection } from "../lib/download";
import { downloadMarkdown } from "../lib/download";

type LengthOption = "short" | "medium" | "long";
type ToneOption = "basic" | "persuasive" | "explanatory" | "bullet";

type PageData = {
  index: number;
  text: string;
};

type GenerationResult = {
  pageIndex: number;
  content: string;
};

type UsageSummary = {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
};

type CostSummary = {
  inputCost: number;
  outputCost: number;
  totalCost: number;
};

const LENGTH_OPTIONS: Record<LengthOption, string> = {
  short: "짧게 (300~400자)",
  medium: "중간 (500~700자)",
  long: "길게 (800~1000자)"
};

const TONE_OPTIONS: Record<ToneOption, string> = {
  basic: "기본 (설명형)",
  persuasive: "설득형 (광고형)",
  explanatory: "설명형 (예시중심)",
  bullet: "요점형 (숫자강조)"
};

const PDF_WORKER_SRC =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

async function extractPdfPages(file: File): Promise<PageData[]> {
  const arrayBuffer = await file.arrayBuffer();
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf");

  if (pdfjsLib.GlobalWorkerOptions) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = PDF_WORKER_SRC;
  }

  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pages: PageData[] = [];

  for (let i = 1; i <= pdf.numPages; i += 1) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const text = textContent.items
      .map((item: any) => (typeof item.str === "string" ? item.str : ""))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    pages.push({
      index: i - 1,
      text
    });
  }

  return pages;
}

async function extractImageText(file: File, onProgress?: (progress: number) => void): Promise<PageData[]> {
  const { createWorker } = await import("tesseract.js");

  const worker = await createWorker("kor+eng", 1, {
    logger: (m) => {
      if (m.status === "recognizing text" && onProgress) {
        onProgress(Math.round(m.progress * 100));
      }
    }
  });

  const imageData = await file.arrayBuffer();
  const blob = new Blob([imageData]);
  const { data: { text } } = await worker.recognize(blob);
  await worker.terminate();

  return [{
    index: 0,
    text: text.trim()
  }];
}

function formatCurrency(value: number) {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: value < 0.01 ? 4 : 2
  });
}

export default function HomePage() {
  const [topic, setTopic] = useState("");
  const [pages, setPages] = useState<PageData[]>([]);
  const [results, setResults] = useState<Record<number, string>>({});
  const [length, setLength] = useState<LengthOption>("medium");
  const [tone, setTone] = useState<ToneOption>("basic");
  const [parsing, setParsing] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [loadingPage, setLoadingPage] = useState<number | null>(null);
  const [batchLoading, setBatchLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [usageSummary, setUsageSummary] = useState<UsageSummary | null>(null);
  const [costSummary, setCostSummary] = useState<CostSummary | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [selectedPageIndex, setSelectedPageIndex] = useState<number | null>(null);

  const generatedSections = useMemo<MarkdownSection[]>(() => {
    return pages
      .filter((page) => typeof results[page.index] === "string")
      .map((page) => ({
        title: `Page ${page.index + 1}`,
        content: results[page.index]!
      }));
  }, [pages, results]);

  // 자동으로 첫 번째 페이지 선택
  useEffect(() => {
    if (pages.length > 0 && selectedPageIndex === null) {
      setSelectedPageIndex(0);
    }
  }, [pages, selectedPageIndex]);

  // 키보드 단축키
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
          generateAllPages();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [generatedSections, pages, batchLoading, parsing]);

  const processFile = async (file: File) => {
    setParsing(true);
    setErrorMessage(null);
    setOcrProgress(0);
    setSelectedPageIndex(null);

    try {
      const fileType = file.type;
      let extracted: PageData[];

      if (fileType === "application/pdf") {
        extracted = await extractPdfPages(file);
      } else if (fileType.startsWith("image/")) {
        extracted = await extractImageText(file, setOcrProgress);
      } else {
        throw new Error("지원하지 않는 파일 형식입니다. PDF 또는 이미지 파일(JPG, PNG)을 사용하세요.");
      }

      if (!extracted.length || !extracted[0].text) {
        throw new Error("파일에서 텍스트를 찾지 못했습니다.");
      }
      setPages(extracted);
      setResults({});
      setUsageSummary(null);
      setCostSummary(null);
    } catch (error) {
      console.error(error);
      setErrorMessage(error instanceof Error ? error.message : "파일 처리 중 오류가 발생했습니다.");
    } finally {
      setParsing(false);
      setOcrProgress(0);
    }
  };

  const handleFileInput = async (input: HTMLInputElement) => {
    const file = input.files?.[0];
    if (!file) return;
    await processFile(file);
    input.value = "";
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    await processFile(file);
  };

  const requestGeneration = async (targetPages: PageData[]) => {
    const response = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        topic,
        pages: targetPages.map((page) => ({
          pageIndex: page.index,
          pageText: page.text
        })),
        options: { length, tone }
      })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error ?? "생성 중 오류가 발생했습니다.");
    }

    return (await response.json()) as {
      outputs: GenerationResult[];
      usage: UsageSummary;
      cost: CostSummary;
    };
  };

  const generateForPage = async (page: PageData) => {
    setLoadingPage(page.index);
    setErrorMessage(null);
    try {
      const { outputs, usage, cost } = await requestGeneration([page]);
      const [result] = outputs;
      if (result) {
        setResults((prev) => ({ ...prev, [result.pageIndex]: result.content }));
      }
      setUsageSummary(usage);
      setCostSummary(cost);
    } catch (error) {
      console.error(error);
      setErrorMessage(error instanceof Error ? error.message : "생성 요청이 실패했습니다.");
    } finally {
      setLoadingPage(null);
    }
  };

  const generateAllPages = async () => {
    setBatchLoading(true);
    setErrorMessage(null);
    try {
      const { outputs, usage, cost } = await requestGeneration(pages);
      const merged: Record<number, string> = {};
      outputs.forEach((item) => {
        merged[item.pageIndex] = item.content;
      });
      setResults(merged);
      setUsageSummary(usage);
      setCostSummary(cost);
    } catch (error) {
      console.error(error);
      setErrorMessage(error instanceof Error ? error.message : "일괄 생성 중 문제가 발생했습니다.");
    } finally {
      setBatchLoading(false);
    }
  };

  const handleDownloadMarkdown = () => {
    if (!generatedSections.length) return;
    const title = topic ? topic : "speech";
    downloadMarkdown(`${title}-${new Date().toISOString().slice(0, 10)}`, generatedSections);
  };

  const selectedPage = selectedPageIndex !== null ? pages[selectedPageIndex] : null;
  const selectedResult = selectedPageIndex !== null ? results[selectedPageIndex] : null;

  const completedCount = Object.keys(results).length;
  const totalCount = pages.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

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
              onClick={generateAllPages}
              disabled={!pages.length || batchLoading || parsing}
              size="sm"
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-xs hover:from-blue-500 hover:to-purple-500"
            >
              {batchLoading ? "⏳ 생성중" : "🚀 전체생성"}
            </Button>
            <Button
              onClick={handleDownloadMarkdown}
              disabled={!generatedSections.length}
              size="sm"
              variant="outline"
              className="border-emerald-500 text-xs text-emerald-400 hover:bg-emerald-500/10"
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
                            className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
                            style={{ width: `${ocrProgress}%` }}
                          />
                        </div>
                      )}
                    </div>
                  ) : (
                    <>
                      <div className="mb-6 text-7xl transition-transform group-hover:scale-110">📤</div>
                      <p className="mb-3 text-lg font-semibold text-slate-200">
                        파일을 드래그하거나 클릭하여 선택
                      </p>
                      <p className="mb-8 text-sm text-slate-400">
                        PDF, JPG, PNG 지원 (최대 10MB 권장)
                      </p>
                      <label className="inline-block cursor-pointer rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 px-10 py-4 text-base font-bold text-white shadow-xl transition-all hover:scale-105 hover:shadow-2xl hover:from-blue-500 hover:to-purple-500">
                        파일 선택
                        <input
                          type="file"
                          accept="application/pdf,image/jpeg,image/png,image/jpg"
                          onChange={(event) => handleFileInput(event.currentTarget)}
                          disabled={parsing}
                          className="hidden"
                        />
                      </label>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <>
            {/* 좌측: 생성된 TTS 화법 */}
            <div className="flex w-1/2 flex-col gap-4">
              <Card className="flex-1 border-slate-700 bg-gradient-to-br from-emerald-950/30 to-slate-900 shadow-xl">
                <CardHeader className="border-b border-emerald-800/30 bg-gradient-to-r from-emerald-900/40 to-slate-900">
                  <CardTitle className="flex items-center gap-3 text-lg">
                    <span className="text-2xl">✨</span>
                    <span>생성된 TTS 화법 대본</span>
                    {selectedPage && (
                      <Badge className="ml-auto bg-emerald-600 text-white">
                        [p.{selectedPage.index + 1}]
                      </Badge>
                    )}
                  </CardTitle>
                  {usageSummary && (
                    <div className="flex gap-2 pt-2">
                      <Badge variant="accent" className="text-xs">
                        {usageSummary.totalTokens.toLocaleString()} 토큰
                      </Badge>
                      {costSummary && (
                        <Badge variant="success" className="text-xs">
                          {formatCurrency(costSummary.totalCost)}
                        </Badge>
                      )}
                    </div>
                  )}
                </CardHeader>
                <CardContent className="flex-1 overflow-y-auto p-6">
                  {selectedResult ? (
                    <div className="space-y-4">
                      <div className="rounded-lg bg-emerald-950/50 p-6 shadow-lg">
                        <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-emerald-50">
{selectedResult}
                        </pre>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => navigator.clipboard.writeText(selectedResult)}
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700"
                        >
                          📋 복사
                        </Button>
                        <Button
                          onClick={handleDownloadMarkdown}
                          size="sm"
                          variant="outline"
                          className="border-emerald-500 text-emerald-400"
                        >
                          💾 다운로드
                        </Button>
                      </div>
                    </div>
                  ) : selectedPage ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                      <p className="mb-4 text-5xl">💭</p>
                      <p className="mb-2 text-base font-medium text-slate-300">
                        아직 생성되지 않았습니다
                      </p>
                      <p className="mb-6 text-sm text-slate-500">
                        아래 버튼을 클릭하거나 상단의 '전체생성'을 이용하세요
                      </p>
                      <Button
                        onClick={() => selectedPage && generateForPage(selectedPage)}
                        disabled={loadingPage === selectedPage.index}
                        className="bg-blue-600 hover:bg-blue-500"
                      >
                        {loadingPage === selectedPage.index ? "⏳ 생성 중..." : "✍️ 이 페이지 생성"}
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center py-20">
                      <p className="text-slate-500">우측에서 페이지를 선택하세요</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {errorMessage && (
                <div className="rounded-xl border border-rose-600 bg-gradient-to-br from-rose-950/50 to-rose-900/30 p-4 shadow-lg">
                  <p className="flex items-center gap-2 text-sm font-medium text-rose-200">
                    <span className="text-lg">⚠️</span> {errorMessage}
                  </p>
                </div>
              )}
            </div>

            {/* 우측: 원본 페이지 미리보기 */}
            <div className="flex w-1/2 flex-col gap-4">
              <Card className="flex-1 border-slate-700 bg-gradient-to-br from-slate-900 to-slate-800 shadow-xl">
                <CardHeader className="border-b border-slate-700 bg-slate-900/50">
                  <CardTitle className="flex items-center gap-3 text-lg">
                    <span className="text-2xl">📄</span>
                    <span>원본 페이지 미리보기</span>
                    <Badge variant="accent" className="ml-auto">
                      {totalCount}개 페이지
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 space-y-3 overflow-y-auto p-4">
                  {pages.map((page) => (
                    <button
                      key={page.index}
                      onClick={() => setSelectedPageIndex(page.index)}
                      className={`group w-full rounded-xl border p-4 text-left transition-all ${
                        selectedPageIndex === page.index
                          ? "border-blue-500 bg-gradient-to-r from-blue-500/20 to-purple-500/20 shadow-lg shadow-blue-500/20"
                          : "border-slate-700 bg-slate-800/50 hover:border-blue-600 hover:bg-slate-800"
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        {/* 페이지 번호 뱃지 */}
                        <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg text-sm font-bold shadow-md transition-all ${
                          results[page.index]
                            ? "scale-110 bg-gradient-to-br from-emerald-500 to-green-600"
                            : "bg-gradient-to-br from-blue-500 to-purple-500"
                        }`}>
                          {results[page.index] ? "✓" : `p.${page.index + 1}`}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="mb-2 flex items-center gap-2">
                            <span className="font-bold text-slate-200">
                              페이지 {page.index + 1}
                            </span>
                            {loadingPage === page.index && (
                              <Badge className="bg-blue-600 text-xs">생성 중...</Badge>
                            )}
                            {results[page.index] && (
                              <Badge className="bg-emerald-600 text-xs">완료</Badge>
                            )}
                          </div>

                          {/* 원문 미리보기 */}
                          <div className="rounded-lg bg-slate-900/50 p-3">
                            <p className="line-clamp-4 text-xs leading-relaxed text-slate-300">
                              {page.text}
                            </p>
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
