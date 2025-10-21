"use client";

import { useMemo, useState } from "react";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter, Input } from "@repo/ui";
import type { MarkdownSection } from "../lib/download";
import { downloadMarkdown } from "../lib/download";

type LengthOption = "short" | "medium" | "long";
type ToneOption = "neutral" | "formal" | "casual" | "persuasive";

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
  short: "짧게",
  medium: "중간",
  long: "길게"
};

const TONE_OPTIONS: Record<ToneOption, string> = {
  neutral: "중립적",
  formal: "격식",
  casual: "친근",
  persuasive: "설득"
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
  const [tone, setTone] = useState<ToneOption>("neutral");
  const [parsing, setParsing] = useState(false);
  const [loadingPage, setLoadingPage] = useState<number | null>(null);
  const [batchLoading, setBatchLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [usageSummary, setUsageSummary] = useState<UsageSummary | null>(null);
  const [costSummary, setCostSummary] = useState<CostSummary | null>(null);

  const generatedSections = useMemo<MarkdownSection[]>(() => {
    return pages
      .filter((page) => typeof results[page.index] === "string")
      .map((page) => ({
        title: `Page ${page.index + 1}`,
        content: results[page.index]!
      }));
  }, [pages, results]);

  const handleFileInput = async (input: HTMLInputElement) => {
    const file = input.files?.[0];
    if (!file) return;

    setParsing(true);
    setErrorMessage(null);

    try {
      const extracted = await extractPdfPages(file);
      if (!extracted.length) {
        throw new Error("PDF에서 텍스트를 찾지 못했습니다.");
      }
      setPages(extracted);
      setResults({});
      setUsageSummary(null);
      setCostSummary(null);
    } catch (error) {
      console.error(error);
      setErrorMessage(error instanceof Error ? error.message : "PDF 처리 중 오류가 발생했습니다.");
    } finally {
      setParsing(false);
      input.value = "";
    }
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
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-10">
      <header className="flex flex-col gap-3">
        <h1 className="text-3xl font-semibold tracking-tight">화법 생성 OCR (텍스트 PDF)</h1>
        <p className="text-slate-300">
          텍스트 기반 PDF를 업로드하면 페이지별 텍스트를 추출하고, 원하는 길이와 톤으로 발표 스크립트를 생성합니다. OCR
          지원은 추후 추가 예정입니다.
        </p>
        <section className="flex flex-wrap items-center gap-2 text-sm text-slate-300">
          <Badge variant="outline">최대 페이지: {pages.length || "-"}장</Badge>
          {usageSummary && (
            <>
              <Badge variant="accent">사용 토큰: {usageSummary.totalTokens}</Badge>
              <Badge variant="accent">
                입력 {usageSummary.promptTokens} · 출력 {usageSummary.completionTokens}
              </Badge>
            </>
          )}
          {costSummary && (
            <Badge variant="success">예상 비용 {formatCurrency(costSummary.totalCost)}</Badge>
          )}
        </section>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>PDF 업로드</CardTitle>
          <CardDescription>텍스트 PDF 파일을 업로드하면 페이지별 텍스트를 추출합니다.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid gap-2">
            <label className="text-sm text-slate-300">주제 (선택)</label>
            <Input
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              placeholder="발표 제목 또는 주제를 입력하세요"
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm text-slate-300">PDF 파일</label>
            <input
              type="file"
              accept="application/pdf"
              onChange={(event) => handleFileInput(event.currentTarget)}
              disabled={parsing}
            />
            <p className="text-xs text-slate-400">이미 OCR이 완료된 텍스트 PDF 사용을 권장합니다.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <label className="text-sm text-slate-300">길이</label>
              <select
                className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
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
              <label className="text-sm text-slate-300">톤</label>
              <select
                className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
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
        <CardFooter className="flex flex-wrap gap-2">
          <Button onClick={generateAllPages} disabled={!pages.length || batchLoading || parsing}>
            {batchLoading ? "일괄 생성 중..." : "전체 페이지 생성"}
          </Button>
          <Button
            variant="outline"
            onClick={handleDownloadMarkdown}
            disabled={!generatedSections.length}
          >
            결과 Markdown 다운로드
          </Button>
        </CardFooter>
      </Card>

      {errorMessage && (
        <div className="rounded-md border border-rose-700 bg-rose-950 px-4 py-3 text-sm text-rose-200">
          {errorMessage}
        </div>
      )}

      <section className="grid gap-4 lg:grid-cols-2">
        {pages.map((page) => (
          <Card key={page.index}>
            <CardHeader>
              <CardTitle>페이지 {page.index + 1}</CardTitle>
              <CardDescription className="line-clamp-2 text-ellipsis text-slate-400">
                {page.text.slice(0, 120) || "추출된 텍스트가 없습니다."}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              <details className="rounded-md border border-slate-800 bg-slate-950 p-3 text-sm leading-relaxed text-slate-200">
                <summary className="cursor-pointer text-slate-400">원문 보기</summary>
                <p className="pt-2 whitespace-pre-wrap break-words">{page.text}</p>
              </details>
              {results[page.index] && (
                <article className="rounded-md border border-emerald-700 bg-emerald-950/60 p-3 text-sm leading-relaxed text-emerald-100 shadow">
                  <header className="mb-2 font-semibold text-emerald-200">생성 결과</header>
                  <p className="whitespace-pre-wrap break-words">{results[page.index]}</p>
                </article>
              )}
            </CardContent>
            <CardFooter>
              <Button
                variant="secondary"
                onClick={() => generateForPage(page)}
                disabled={batchLoading || parsing || loadingPage === page.index}
              >
                {loadingPage === page.index ? "생성 중..." : "이 페이지 생성"}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </section>

      {!pages.length && !parsing && (
        <div className="rounded-md border border-slate-800 bg-slate-950 p-6 text-center text-sm text-slate-400">
          텍스트 기반 PDF 파일을 업로드하면 페이지별로 카드가 표시됩니다.
        </div>
      )}
    </main>
  );
}
