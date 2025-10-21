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
  short: "짧게 (120~180)",
  medium: "중간 (250~400)",
  long: "길게 (500~700)"
};

const TONE_OPTIONS: Record<ToneOption, string> = {
  basic: "기본",
  persuasive: "설득형",
  explanatory: "설명형",
  bullet: "요점형"
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
      // Ctrl/Cmd + S: 다운로드
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (generatedSections.length > 0) {
          handleDownloadMarkdown();
        }
      }
      // Ctrl/Cmd + G: 전체 생성
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
      <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1920px] items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 text-2xl shadow-lg">
              🏥
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">보험 화법 생성기</h1>
              <p className="text-sm text-slate-400">PDF/이미지에서 TTS 대본 생성</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {usageSummary && (
              <>
                <Badge variant="accent" className="text-xs">
                  {usageSummary.totalTokens.toLocaleString()} 토큰
                </Badge>
                {costSummary && (
                  <Badge variant="success" className="text-xs">
                    {formatCurrency(costSummary.totalCost)}
                  </Badge>
                )}
              </>
            )}
            {totalCount > 0 && (
              <Badge variant="outline" className="text-xs">
                {completedCount}/{totalCount} 완료
              </Badge>
            )}
          </div>
        </div>
        {totalCount > 0 && (
          <div className="h-1 bg-slate-900">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </header>

      {/* 메인 2컬럼 레이아웃 */}
      <main className="mx-auto flex w-full max-w-[1920px] flex-1 gap-6 p-6">
        {/* 왼쪽 패널: 설정 & 컨트롤 */}
        <aside className="flex w-[420px] flex-col gap-6">
          {/* 파일 업로드 */}
          <Card className="border-slate-700 bg-gradient-to-br from-slate-900 to-slate-800 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <span className="text-2xl">📎</span>
                <span>파일 업로드</span>
              </CardTitle>
              <CardDescription className="text-slate-400">
                PDF 또는 이미지 파일을 업로드하세요
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div
                className={`group relative rounded-xl border-2 border-dashed p-12 text-center transition-all duration-300 ${
                  dragActive
                    ? "scale-105 border-blue-400 bg-gradient-to-br from-blue-500/20 via-purple-500/20 to-pink-500/20 shadow-xl shadow-blue-500/30"
                    : "border-slate-600 bg-slate-800/50 hover:border-blue-500 hover:shadow-lg"
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                {parsing ? (
                  <div className="flex flex-col items-center gap-4">
                    <div className="h-16 w-16 animate-spin rounded-full border-4 border-slate-700 border-t-blue-500"></div>
                    <p className="text-sm font-medium text-slate-300">
                      {ocrProgress > 0 ? `OCR 처리 중... ${ocrProgress}%` : "파일 분석 중..."}
                    </p>
                    {ocrProgress > 0 && (
                      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-700">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
                          style={{ width: `${ocrProgress}%` }}
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="mb-4 text-5xl transition-transform group-hover:scale-110">📤</div>
                    <p className="mb-2 text-sm font-semibold text-slate-200">
                      파일을 드래그하거나 클릭하여 선택
                    </p>
                    <p className="mb-6 text-xs text-slate-400">
                      PDF, JPG, PNG 지원 (최대 10MB)
                    </p>
                    <label className="inline-block cursor-pointer rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 px-8 py-3 text-sm font-bold text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl hover:from-blue-500 hover:to-purple-500">
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

          {/* 옵션 설정 */}
          <Card className="border-slate-700 bg-gradient-to-br from-slate-900 to-slate-800 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <span className="text-2xl">⚙️</span>
                <span>생성 옵션</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-300">📝 주제 (선택사항)</label>
                <Input
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="예: 암보험, 실손보험"
                  className="border-slate-600 bg-slate-900 text-slate-100 placeholder:text-slate-500 focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-300">📏 길이</label>
                  <select
                    value={length}
                    onChange={(e) => setLength(e.target.value as LengthOption)}
                    className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2.5 text-sm text-slate-100 transition-colors hover:border-slate-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    {Object.entries(LENGTH_OPTIONS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-300">🎯 톤</label>
                  <select
                    value={tone}
                    onChange={(e) => setTone(e.target.value as ToneOption)}
                    className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2.5 text-sm text-slate-100 transition-colors hover:border-slate-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    {Object.entries(TONE_OPTIONS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 액션 버튼 */}
          <Card className="border-slate-700 bg-gradient-to-br from-slate-900 to-slate-800 shadow-xl">
            <CardContent className="space-y-3 pt-6">
              <Button
                onClick={generateAllPages}
                disabled={!pages.length || batchLoading || parsing}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 py-6 text-base font-bold shadow-lg transition-all hover:scale-105 hover:shadow-xl hover:from-blue-500 hover:to-purple-500 disabled:scale-100 disabled:opacity-50"
              >
                {batchLoading ? "⏳ 생성 중..." : "🚀 전체 페이지 생성"}
              </Button>
              <Button
                variant="outline"
                onClick={handleDownloadMarkdown}
                disabled={!generatedSections.length}
                className="w-full border-emerald-500 py-6 text-base font-bold text-emerald-400 transition-all hover:scale-105 hover:bg-emerald-500/10 hover:text-emerald-300 disabled:scale-100 disabled:opacity-50"
              >
                💾 Markdown 다운로드
              </Button>

              <div className="pt-2 text-center text-xs text-slate-500">
                단축키: Ctrl+G (생성) / Ctrl+S (다운로드)
              </div>
            </CardContent>
          </Card>

          {errorMessage && (
            <div className="animate-shake rounded-xl border border-rose-600 bg-gradient-to-br from-rose-950/50 to-rose-900/30 p-4 shadow-lg">
              <p className="flex items-center gap-2 text-sm font-medium text-rose-200">
                <span className="text-lg">⚠️</span> {errorMessage}
              </p>
            </div>
          )}
        </aside>

        {/* 오른쪽 패널: 페이지 목록 & 결과 */}
        <div className="flex flex-1 flex-col gap-6">
          {pages.length > 0 ? (
            <div className="grid flex-1 gap-6 lg:grid-cols-2">
              {/* 페이지 목록 */}
              <Card className="flex flex-col border-slate-700 bg-gradient-to-br from-slate-900 to-slate-800 shadow-xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <span className="text-2xl">📄</span>
                    <span>페이지 목록</span>
                    <Badge variant="accent" className="ml-auto">
                      {totalCount}개
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 space-y-2 overflow-y-auto">
                  {pages.map((page) => (
                    <button
                      key={page.index}
                      onClick={() => setSelectedPageIndex(page.index)}
                      className={`group w-full rounded-lg border p-4 text-left transition-all ${
                        selectedPageIndex === page.index
                          ? "border-blue-500 bg-gradient-to-r from-blue-500/20 to-purple-500/20 shadow-lg"
                          : "border-slate-700 bg-slate-800/50 hover:border-slate-600 hover:bg-slate-800"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-sm font-bold shadow-md transition-all ${
                          results[page.index]
                            ? "bg-gradient-to-br from-emerald-500 to-green-500 scale-110"
                            : "bg-gradient-to-br from-slate-600 to-slate-700"
                        }`}>
                          {results[page.index] ? "✓" : page.index + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-200">
                            페이지 {page.index + 1}
                          </p>
                          <p className="mt-1 line-clamp-2 text-xs text-slate-400">
                            {page.text.slice(0, 100)}...
                          </p>
                          {loadingPage === page.index && (
                            <p className="mt-2 text-xs font-medium text-blue-400">
                              ⏳ 생성 중...
                            </p>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </CardContent>
              </Card>

              {/* 선택된 페이지 상세 */}
              <Card className="flex flex-col border-slate-700 bg-gradient-to-br from-slate-900 to-slate-800 shadow-xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <span className="text-2xl">✨</span>
                    <span>
                      {selectedPage ? `페이지 ${selectedPage.index + 1}` : "페이지 선택"}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col gap-4 overflow-y-auto">
                  {selectedPage ? (
                    <>
                      <details className="group rounded-lg border border-slate-700 bg-slate-900/50">
                        <summary className="cursor-pointer px-4 py-3 font-semibold text-slate-300 transition-colors hover:text-slate-200">
                          📄 원문 보기
                        </summary>
                        <div className="border-t border-slate-700 px-4 py-3">
                          <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-300">
                            {selectedPage.text}
                          </p>
                        </div>
                      </details>

                      {selectedResult ? (
                        <div className="flex-1 rounded-lg border border-emerald-500/50 bg-gradient-to-br from-emerald-900/40 to-emerald-950/40 p-6 shadow-xl">
                          <div className="mb-3 flex items-center gap-2">
                            <span className="text-2xl">✨</span>
                            <h3 className="text-lg font-bold text-emerald-300">생성 결과</h3>
                          </div>
                          <p className="whitespace-pre-wrap text-sm leading-relaxed text-emerald-50">
                            {selectedResult}
                          </p>
                        </div>
                      ) : (
                        <div className="flex flex-1 items-center justify-center rounded-lg border-2 border-dashed border-slate-700 bg-slate-900/30 p-12">
                          <div className="text-center">
                            <p className="mb-4 text-4xl">💭</p>
                            <p className="text-sm font-medium text-slate-400">
                              아직 생성되지 않았습니다
                            </p>
                            <Button
                              onClick={() => selectedPage && generateForPage(selectedPage)}
                              disabled={batchLoading || parsing || loadingPage === selectedPage.index}
                              className="mt-4 bg-blue-600 hover:bg-blue-500"
                            >
                              ✍️ 이 페이지 생성
                            </Button>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex flex-1 items-center justify-center">
                      <p className="text-slate-500">왼쪽에서 페이지를 선택하세요</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card className="flex flex-1 items-center justify-center border-slate-700 bg-gradient-to-br from-slate-900 to-slate-800 shadow-xl">
              <CardContent className="py-24 text-center">
                <div className="mb-6 text-8xl">📋</div>
                <h3 className="mb-2 text-2xl font-bold text-slate-200">파일을 업로드하세요</h3>
                <p className="text-slate-400">
                  PDF 또는 이미지 파일을 업로드하면<br />
                  페이지별로 TTS 화법 대본을 생성할 수 있습니다
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
