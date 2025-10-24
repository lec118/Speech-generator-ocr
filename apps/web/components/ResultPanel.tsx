import { useEffect, useMemo } from "react";
import type { PageData } from "@repo/core";

interface ResultSegment {
  pageIndex: number;
  title: string;
  body: string;
  copyText: string;
}

interface ResultPanelProps {
  results: Record<number, string>;
  pages: PageData[];
  onCopyTextChange?: (text: string) => void;
  currentPageIndex?: number;
}

/**
 * Check if a line should be skipped (metadata, headers, etc.)
 */
function shouldSkipLine(line: string): boolean {
  const normalized = line.replace(/\s+/g, " ");
  const lowered = normalized.toLowerCase();
  const condensed = normalized.replace(/[.\s:-]/g, "").toLowerCase();

  const skipPatterns = [
    normalized.startsWith("###"),
    /^\[p\./i.test(normalized),
    /^p\d+$/i.test(condensed),
    /^[①-⑳]/.test(normalized),
    lowered.includes("본문") && lowered.includes("스크립트"),
    lowered.includes("top-down"),
    lowered.includes("상담형 어미 믹스"),
    lowered.includes("break time"),
    /^-\s*break\s*time/i.test(normalized),
    normalized.startsWith("<break time>")
  ];

  return skipPatterns.some(Boolean);
}

/**
 * Extract title from markdown format (supports multiple languages)
 */
function extractTitle(line: string): string | null {
  const normalized = line.replace(/\s+/g, " ");
  // Support Korean (제목), English (title), Chinese (标题), Vietnamese (Tiêu đề)
  const titleMatch = normalized.match(/^- \*\*(제목|title|标题|tiêu đề):\*\*\s*(.+)$/i);
  return titleMatch ? titleMatch[2].trim() : null;
}

/**
 * Check if line is script metadata (should be skipped)
 */
function isScriptMetadata(line: string): boolean {
  const normalized = line.replace(/\s+/g, " ");
  return /^- \*\*/.test(normalized);
}

/**
 * Clean line formatting (convert markdown bullets to bullet points)
 */
function cleanLine(line: string): string {
  const normalized = line.replace(/\s+/g, " ");
  return normalized.startsWith("- ") ? `• ${normalized.slice(2).trim()}` : normalized;
}

function extractSegments(results: Record<number, string>, pages: PageData[]): ResultSegment[] {
  return pages
    .map((page) => {
      const raw = results[page.index];
      if (!raw) return null;

      const lines = raw
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);

      let title = "";
      const bodyParts: string[] = [];

      for (const line of lines) {
        // Skip metadata/header lines
        if (shouldSkipLine(line)) {
          continue;
        }

        // Extract title
        const titleText = extractTitle(line);
        if (titleText) {
          title = titleText;
          continue;
        }

        // Skip script metadata
        if (isScriptMetadata(line)) {
          continue;
        }

        // Add cleaned line to body
        bodyParts.push(cleanLine(line));
      }

      const body = bodyParts.join("\n");
      const copyText = [title, body].filter(Boolean).join("\n\n");
      return { pageIndex: page.index, title, body, copyText };
    })
    .filter((segment): segment is ResultSegment => segment !== null);
}

export function ResultPanel({ results, pages, onCopyTextChange, currentPageIndex }: ResultPanelProps) {
  const segments = useMemo(() => extractSegments(results, pages), [results, pages]);

  // Filter segments to show only current page if specified
  const displaySegments = useMemo(() => {
    if (currentPageIndex !== undefined) {
      return segments.filter(seg => seg.pageIndex === currentPageIndex);
    }
    return segments;
  }, [segments, currentPageIndex]);

  useEffect(() => {
    if (onCopyTextChange) {
      const combined = displaySegments.map((segment) => segment.copyText).filter(Boolean).join("\n\n");
      onCopyTextChange(combined);
    }
  }, [displaySegments, onCopyTextChange]);

  if (displaySegments.length === 0) {
    return (
      <div className="flex min-h-[200px] items-center justify-center text-sm text-gray-500">
        생성된 화법이 없습니다. 옵션을 조정한 뒤 다시 생성해 주세요.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {displaySegments.map(({ pageIndex, title, body }) => (
        <article
          key={pageIndex}
          className="space-y-3 rounded-2xl bg-white/90 p-6 shadow-sm ring-1 ring-amber-100"
        >
          {title && <h3 className="text-lg font-semibold text-gray-900">{title}</h3>}
          {body && <p className="whitespace-pre-line text-base leading-relaxed text-gray-800">{body}</p>}
        </article>
      ))}
    </div>
  );
}
