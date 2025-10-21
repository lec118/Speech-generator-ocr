"use client";

import { useState, useMemo, useEffect } from "react";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input } from "@repo/ui";
import type { LengthOption, ToneOption, MarkdownSection } from "@repo/core";
import { useFileProcessor } from "../hooks/useFileProcessor";
import { useGeneration } from "../hooks/useGeneration";
import { usePageSelection } from "../hooks/usePageSelection";
import { downloadMarkdown } from "../lib/download";

const LENGTH_OPTIONS: Record<LengthOption, string> = {
  short: "짧게",
  medium: "중간",
  long: "길게"
};

const TONE_OPTIONS: Record<ToneOption, string> = {
  basic: "기본",
  persuasive: "설득형",
  explanatory: "설명형",
  bullet: "요점형"
};

function formatCurrency(value: number) {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: value < 0.01 ? 4 : 2
  });
}

export default function HomePage() {
  const [apiKey, setApiKey] = useState("");
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [showApiSettings, setShowApiSettings] = useState(false);
  const [topic, setTopic] = useState("");
  const [length, setLength] = useState<LengthOption>("medium");
  const [tone, setTone] = useState<ToneOption>("basic");

  // Load API key from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("openai_api_key");
    if (saved) {
      setApiKey(saved);
      setApiKeyInput(saved);
    }
  }, []);

  const handleSaveApiKey = () => {
    const trimmedKey = apiKeyInput.trim();
    if (trimmedKey) {
      try {
        localStorage.setItem("openai_api_key", trimmedKey);
        setApiKey(trimmedKey);
        setShowApiSettings(false);
        console.log("API 키가 저장되었습니다");
      } catch (error) {
        console.error("API 키 저장 실패:", error);
        alert("API 키 저장에 실패했습니다. 다시 시도해주세요.");
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && apiKeyInput.trim()) {
      handleSaveApiKey();
    }
  };

  const handleRemoveApiKey = () => {
    localStorage.removeItem("openai_api_key");
    setApiKey("");
    setApiKeyInput("");
    setShowApiSettings(false);
  };

  // Custom hooks
  const fileProcessor = useFileProcessor();
  const generation = useGeneration(topic, length, tone, apiKey);
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
        if (pages.length > 0 && !batchLoading && !parsing && apiKey) {
          generateAllPages(pages);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [generatedSections, pages, batchLoading, parsing, apiKey]);

  const handleDownloadMarkdown = () => {
    if (!generatedSections.length) return;
    const title = topic ? topic : "speech";
    downloadMarkdown(`${title}-${new Date().toISOString().slice(0, 10)}`, generatedSections);
  };

  return (
    <div className="flex min-h-screen flex-col bg-white">
      {/* 헤더 */}
      <header className="border-b bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-2xl">🏥</div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">보험 TTS 화법 생성기</h1>
                <p className="text-xs text-gray-500">PDF/이미지에서 음성 대본 자동 생성</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* API 키 상태 */}
              {apiKey ? (
                <Badge className="bg-emerald-600 text-white">
                  ✓ API 연결됨
                </Badge>
              ) : (
                <Badge className="bg-red-500 text-white">
                  API 키 필요
                </Badge>
              )}

              <Button
                onClick={() => setShowApiSettings(!showApiSettings)}
                variant="outline"
                className="text-sm"
              >
                ⚙️ 설정
              </Button>

              {pages.length > 0 && apiKey && (
                <>
                  <Input
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="상품명 입력"
                    className="w-40 text-sm"
                  />
                  <select
                    value={length}
                    onChange={(e) => setLength(e.target.value as LengthOption)}
                    className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                  >
                    {Object.entries(LENGTH_OPTIONS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                  <select
                    value={tone}
                    onChange={(e) => setTone(e.target.value as ToneOption)}
                    className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                  >
                    {Object.entries(TONE_OPTIONS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                  <Button
                    onClick={() => generateAllPages(pages)}
                    disabled={!pages.length || batchLoading || parsing}
                    className="bg-blue-600 px-4 py-2 text-sm hover:bg-blue-700"
                  >
                    {batchLoading ? "⏳ 생성중" : "🚀 전체생성"}
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* API 설정 패널 */}
          {showApiSettings && (
            <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">OpenAI API 키</h3>
                {apiKey && (
                  <span className="text-xs text-emerald-600">✓ 저장됨</span>
                )}
              </div>
              <div className="flex gap-2">
                <Input
                  type="password"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="sk-..."
                  className="flex-1 text-sm"
                />
                <Button
                  onClick={handleSaveApiKey}
                  disabled={!apiKeyInput.trim()}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {apiKey ? "변경" : "저장"}
                </Button>
                {apiKey && (
                  <Button
                    onClick={handleRemoveApiKey}
                    variant="outline"
                    className="border-red-300 text-red-600 hover:bg-red-50"
                  >
                    삭제
                  </Button>
                )}
              </div>
              <p className="mt-2 text-xs text-gray-600">
                💡 브라우저에만 안전하게 저장됩니다.
                <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="ml-1 text-blue-600 underline">
                  키 발급받기
                </a>
              </p>
            </div>
          )}

          {/* 진행률 바 */}
          {totalCount > 0 && (
            <div className="mt-4">
              <div className="mb-1 flex items-center justify-between text-xs text-gray-600">
                <span>진행률: {completedCount}/{totalCount} 페이지</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                <div
                  className="h-full bg-blue-600 transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="flex-1">
        {!apiKey ? (
          /* API 키 입력 안내 */
          <div className="flex min-h-[calc(100vh-200px)] items-center justify-center p-6">
            <Card className="w-full max-w-lg border-2 shadow-xl">
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 text-6xl">🔑</div>
                <CardTitle className="text-2xl">API 키가 필요합니다</CardTitle>
                <CardDescription>
                  OpenAI API 키를 입력하여 화법 생성 기능을 사용하세요
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Input
                    type="password"
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="sk-..."
                    className="text-sm"
                    autoFocus
                  />
                  <Button
                    onClick={handleSaveApiKey}
                    disabled={!apiKeyInput.trim()}
                    className="w-full bg-blue-600 py-3 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    시작하기
                  </Button>
                  <div className="rounded-lg bg-blue-50 p-4 text-xs text-gray-700">
                    <p className="mb-2 font-semibold">💡 안전한 사용</p>
                    <ul className="list-inside list-disc space-y-1">
                      <li>API 키는 브라우저 localStorage에만 저장됩니다</li>
                      <li>서버에 저장되지 않으며, 오직 OpenAI API 호출에만 사용됩니다</li>
                      <li>언제든지 설정에서 삭제할 수 있습니다</li>
                    </ul>
                    <a
                      href="https://platform.openai.com/api-keys"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-block text-blue-600 underline"
                    >
                      → OpenAI API 키 발급 받기
                    </a>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : pages.length === 0 ? (
          /* 파일 업로드 화면 */
          <div className="flex min-h-[calc(100vh-200px)] items-center justify-center p-6">
            <Card className="w-full max-w-2xl border-2 shadow-xl">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">파일 업로드</CardTitle>
                <CardDescription>
                  PDF 또는 이미지 파일을 업로드하여 TTS 화법을 생성하세요
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div
                  className={`rounded-xl border-2 border-dashed p-20 text-center transition-all ${
                    dragActive
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50/50"
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  {parsing ? (
                    <div className="flex flex-col items-center gap-4">
                      <div className="h-16 w-16 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600"></div>
                      <p className="text-lg font-medium text-gray-700">
                        {ocrProgress > 0 ? `OCR 처리 중... ${ocrProgress}%` : "파일 분석 중..."}
                      </p>
                      {ocrProgress > 0 && (
                        <div className="h-2 w-64 overflow-hidden rounded-full bg-gray-200">
                          <div
                            className="h-full bg-blue-600 transition-all"
                            style={{ width: `${ocrProgress}%` }}
                          />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-6">
                      <div className="text-6xl">📄</div>
                      <div>
                        <p className="mb-2 text-xl font-semibold text-gray-800">
                          파일을 여기에 드롭하세요
                        </p>
                        <p className="text-sm text-gray-500">
                          또는 버튼을 클릭하여 파일 선택
                        </p>
                        <p className="mt-1 text-xs text-gray-400">
                          지원 형식: PDF, JPG, PNG
                        </p>
                      </div>
                      <Button
                        onClick={() => document.getElementById("file-input")?.click()}
                        className="bg-blue-600 px-8 py-3 text-base hover:bg-blue-700"
                      >
                        파일 선택
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
                  <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-center">
                    <p className="text-sm font-medium text-red-600">⚠️ {errorMessage}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          /* 2단 레이아웃: 좌측(TTS) / 우측(원본) */
          <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 p-6">
            {/* 좌측: 생성된 TTS 화법 */}
            <div className="flex flex-col gap-4">
              <Card className="flex-1 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-emerald-50 to-green-50">
                  <CardTitle className="flex items-center justify-between text-lg">
                    <span>✨ 생성된 화법 대본</span>
                    {selectedPage && (
                      <Badge className="bg-emerald-600 text-white">
                        p.{selectedPage.index + 1}
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="min-h-[500px] p-6">
                  {selectedResult ? (
                    <div className="space-y-4">
                      <div className="max-h-[600px] overflow-y-auto rounded-lg bg-gray-50 p-6">
                        <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-gray-800">
{selectedResult}
                        </pre>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => navigator.clipboard.writeText(selectedResult)}
                          className="bg-emerald-600 hover:bg-emerald-700"
                        >
                          📋 복사
                        </Button>
                        <Button
                          onClick={handleDownloadMarkdown}
                          variant="outline"
                        >
                          💾 다운로드
                        </Button>
                      </div>
                    </div>
                  ) : selectedPage ? (
                    <div className="flex flex-col items-center justify-center py-32 text-center">
                      <p className="mb-4 text-5xl">💭</p>
                      <p className="mb-2 text-base text-gray-700">
                        화법이 아직 생성되지 않았습니다
                      </p>
                      <p className="mb-6 text-sm text-gray-500">
                        버튼을 눌러 생성하세요
                      </p>
                      <Button
                        onClick={() => selectedPage && generateForPage(selectedPage)}
                        disabled={loadingPage === selectedPage.index}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        {loadingPage === selectedPage.index ? "⏳ 생성 중..." : "🎯 생성하기"}
                      </Button>
                    </div>
                  ) : null}
                </CardContent>
              </Card>

              {/* 사용량 정보 */}
              {(usageSummary || costSummary) && (
                <Card className="bg-gray-50">
                  <CardContent className="flex items-center justify-between py-3">
                    <div className="flex gap-4 text-xs text-gray-600">
                      {usageSummary && (
                        <>
                          <span>입력: {usageSummary.promptTokens.toLocaleString()}</span>
                          <span>출력: {usageSummary.completionTokens.toLocaleString()}</span>
                        </>
                      )}
                    </div>
                    {costSummary && (
                      <span className="text-xs font-medium text-emerald-600">
                        {formatCurrency(costSummary.totalCost)}
                      </span>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* 우측: 원본 페이지 */}
            <div>
              <Card className="h-full shadow-lg">
                <CardHeader className="bg-blue-50">
                  <CardTitle className="text-lg">
                    📄 원본 페이지
                    <Badge variant="success" className="ml-2">
                      {completedCount}/{totalCount}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="max-h-[calc(100vh-300px)] space-y-2 overflow-y-auto">
                    {pages.map((page) => (
                      <button
                        key={page.index}
                        onClick={() => setSelectedPageIndex(page.index)}
                        className={`w-full rounded-lg border-2 p-4 text-left transition-all ${
                          selectedPageIndex === page.index
                            ? "border-blue-500 bg-blue-50 shadow-md"
                            : "border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/50"
                        }`}
                      >
                        <div className="mb-2 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge
                              className={results[page.index] ? "bg-emerald-600 text-white" : "bg-gray-400 text-white"}
                            >
                              {results[page.index] ? "✓" : page.index + 1}
                            </Badge>
                            <span className="text-sm font-medium text-gray-900">
                              Page {page.index + 1}
                            </span>
                          </div>
                          {loadingPage === page.index && (
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
                          )}
                        </div>
                        <p className="line-clamp-3 text-xs leading-relaxed text-gray-600">
                          {page.text}
                        </p>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
