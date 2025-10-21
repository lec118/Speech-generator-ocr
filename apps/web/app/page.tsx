"use client";

import { useMemo, useState } from "react";
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
  // 동적으로 Tesseract.js import (클라이언트 전용)
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

  const generatedSections = useMemo<MarkdownSection[]>(() => {
    return pages
      .filter((page) => typeof results[page.index] === "string")
      .map((page) => ({
        title: `Page ${page.index + 1}`,
        content: results[page.index]!
      }));
  }, [pages, results]);

  const processFile = async (file: File) => {
    setParsing(true);
    setErrorMessage(null);
    setOcrProgress(0);

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

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10">
      {/* 헤더 - 화려한 그라디언트 배경 */}
      <header className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-purple-600 to-pink-500 p-8 shadow-2xl">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative z-10 flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 text-4xl shadow-lg backdrop-blur-sm">
              🏥
            </div>
            <div>
              <h1 className="text-4xl font-bold tracking-tight text-white drop-shadow-lg">보험 화법 생성기</h1>
              <p className="text-lg text-white/90">PDF 또는 이미지에서 TTS 화법 대본 생성</p>
            </div>
          </div>
        <section className="flex flex-wrap items-center gap-2 text-sm">
          <Badge variant="outline">파일: {pages.length > 0 ? `${pages.length}페이지` : "미업로드"}</Badge>
          {usageSummary && (
            <>
              <Badge variant="accent">토큰: {usageSummary.totalTokens.toLocaleString()}</Badge>
              <Badge variant="accent">
                입력 {usageSummary.promptTokens} · 출력 {usageSummary.completionTokens}
              </Badge>
            </>
          )}
          {costSummary && (
            <Badge variant="success">비용: {formatCurrency(costSummary.totalCost)}</Badge>
          )}
        </section>
      </div>
      </header>

      <Card className="border-slate-700 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-xl">
            <span className="text-3xl">📎</span> 파일 업로드
          </CardTitle>
          <CardDescription className="text-slate-300">
            PDF 파일 또는 이미지 파일(JPG, PNG)을 업로드하세요. 이미지는 자동으로 OCR 처리됩니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid gap-2">
            <label className="text-sm font-medium text-slate-300">주제 (선택)</label>
            <Input
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              placeholder="예: 암보험, 실손보험 등"
            />
          </div>

          <div
            className={`relative rounded-xl border-2 border-dashed p-8 text-center transition-all duration-300 ${
              dragActive
                ? "border-blue-400 bg-gradient-to-br from-blue-500/20 via-purple-500/20 to-pink-500/20 shadow-lg shadow-blue-500/50"
                : "border-slate-600 bg-slate-800/30 hover:border-blue-500 hover:bg-slate-800/50"
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            {parsing ? (
              <div className="flex flex-col items-center gap-3">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-700 border-t-blue-500"></div>
                <p className="text-sm text-slate-300">
                  {ocrProgress > 0 ? `OCR 처리 중... ${ocrProgress}%` : "파일 처리 중..."}
                </p>
                {ocrProgress > 0 && (
                  <div className="h-2 w-64 overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full bg-blue-500 transition-all duration-300"
                      style={{ width: `${ocrProgress}%` }}
                    ></div>
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className="mb-3 text-4xl">📤</div>
                <p className="mb-2 text-sm font-medium text-slate-200">
                  파일을 드래그 앤 드롭하거나 클릭하여 선택
                </p>
                <p className="mb-4 text-xs text-slate-400">
                  PDF, JPG, PNG 파일 지원 (최대 10MB 권장)
                </p>
                <label className="inline-block cursor-pointer rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/50 transition-all hover:scale-105 hover:from-blue-500 hover:to-purple-500">
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

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <label className="text-sm font-medium text-slate-300">📏 길이</label>
              <select
                className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-blue-500 focus:outline-none"
                value={length}
                onChange={(event) => setLength(event.target.value as LengthOption)}
              >
                {Object.entries(LENGTH_OPTIONS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium text-slate-300">🎯 톤</label>
              <select
                className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-blue-500 focus:outline-none"
                value={tone}
                onChange={(event) => setTone(event.target.value as ToneOption)}
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
        <CardFooter className="flex flex-wrap gap-3">
          <Button
            onClick={generateAllPages}
            disabled={!pages.length || batchLoading || parsing}
            className="bg-gradient-to-r from-blue-600 to-purple-600 shadow-lg shadow-blue-500/50 hover:from-blue-500 hover:to-purple-500 hover:shadow-xl"
          >
            {batchLoading ? "⏳ 생성 중..." : "🚀 전체 페이지 생성"}
          </Button>
          <Button
            variant="outline"
            onClick={handleDownloadMarkdown}
            disabled={!generatedSections.length}
            className="border-emerald-500 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300"
          >
            💾 Markdown 다운로드
          </Button>
        </CardFooter>
      </Card>

      {errorMessage && (
        <div className="rounded-lg border border-rose-700 bg-rose-950/50 px-4 py-3 text-sm text-rose-200">
          ⚠️ {errorMessage}
        </div>
      )}

      <section className="grid gap-4 lg:grid-cols-2">
        {pages.map((page) => (
          <Card key={page.index} className="overflow-hidden border-slate-700 bg-gradient-to-br from-slate-900 to-slate-800 shadow-lg transition-all hover:shadow-xl">
            <CardHeader className="bg-gradient-to-r from-slate-800 to-slate-900">
              <CardTitle className="flex items-center gap-3 text-lg">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 text-sm font-bold shadow-md">
                  {page.index + 1}
                </span>
                페이지 {page.index + 1}
              </CardTitle>
              <CardDescription className="line-clamp-2 text-ellipsis text-slate-400">
                {page.text.slice(0, 120) || "추출된 텍스트가 없습니다."}...
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 pt-4">
              <details className="rounded-md border border-slate-800 bg-slate-950 p-3 text-sm leading-relaxed text-slate-200">
                <summary className="cursor-pointer font-medium text-slate-400 hover:text-slate-300">
                  📄 원문 보기
                </summary>
                <p className="pt-3 whitespace-pre-wrap break-words">{page.text}</p>
              </details>
              {results[page.index] && (
                <article className="rounded-lg border border-emerald-500/50 bg-gradient-to-br from-emerald-900/40 to-emerald-950/40 p-4 text-sm leading-relaxed text-emerald-50 shadow-lg shadow-emerald-900/20">
                  <header className="mb-2 flex items-center gap-2 font-semibold text-emerald-300">
                    <span className="text-lg">✨</span> 생성 결과
                  </header>
                  <p className="whitespace-pre-wrap break-words">{results[page.index]}</p>
                </article>
              )}
            </CardContent>
            <CardFooter className="bg-slate-900/50">
              <Button
                variant="secondary"
                onClick={() => generateForPage(page)}
                disabled={batchLoading || parsing || loadingPage === page.index}
                className="w-full border-blue-500/50 bg-slate-800 hover:bg-blue-600/20 hover:border-blue-400"
              >
                {loadingPage === page.index ? "⏳ 생성 중..." : "✍️ 이 페이지 생성"}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </section>

      {!pages.length && !parsing && (
        <div className="rounded-xl border border-slate-700 bg-gradient-to-br from-slate-900 to-slate-800 p-16 text-center shadow-xl">
          <div className="mb-4 text-6xl">📋</div>
          <p className="text-base text-slate-300 font-medium">
            PDF 파일 또는 이미지를 업로드하면 페이지별로 카드가 표시됩니다.
          </p>
        </div>
      )}
    </main>
  );
}
