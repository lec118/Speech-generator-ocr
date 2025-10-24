/**
 * Page range parser utility
 * Converts string input like "1,2,4" or "1-3,6" to array [1,2,3,4,6]
 */

export interface ParseResult {
  valid: boolean;
  pages: number[];
  error?: string;
}

/**
 * Parse page input string into array of page numbers
 * @param input - Input string (e.g., "1,2,4" or "1-3,6")
 * @param maxPage - Maximum page number allowed
 * @returns Array of sorted, unique page numbers or null if invalid
 */
export function parsePageInput(input: string, maxPage: number): number[] | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Validate format: numbers, commas, hyphens, spaces only
  if (!/^\s*\d+(\s*-\s*\d+)?(\s*,\s*\d+(\s*-\s*\d+)?)*\s*$/.test(trimmed)) {
    return null;
  }

  const pages = new Set<number>();
  const parts = trimmed.split(',');

  for (const part of parts) {
    const range = part.trim();
    if (range.includes('-')) {
      const [start, end] = range.split('-').map(s => parseInt(s.trim(), 10));
      if (isNaN(start) || isNaN(end) || start < 1 || end > maxPage || start > end) {
        return null;
      }
      for (let i = start; i <= end; i++) {
        pages.add(i);
      }
    } else {
      const pageNum = parseInt(range, 10);
      if (isNaN(pageNum) || pageNum < 1 || pageNum > maxPage) {
        return null;
      }
      pages.add(pageNum);
    }
  }

  return Array.from(pages).sort((a, b) => a - b);
}

/**
 * Parse page input with detailed result
 * @param input - Input string
 * @param maxPage - Maximum page number allowed
 * @returns ParseResult object with validation details
 */
export function parsePageInputDetailed(input: string, maxPage: number): ParseResult {
  const trimmed = input.trim();

  if (!trimmed) {
    return { valid: false, pages: [], error: '입력이 비어있습니다' };
  }

  if (maxPage < 1) {
    return { valid: false, pages: [], error: '페이지가 없습니다' };
  }

  const pages = parsePageInput(input, maxPage);

  if (pages === null) {
    return {
      valid: false,
      pages: [],
      error: '형식이 올바르지 않습니다. 예: 1,2,4 또는 1-3,6'
    };
  }

  return { valid: true, pages };
}

/**
 * Format page array to readable string
 * @param pages - Array of page numbers
 * @returns Formatted string (e.g., "1-3, 5, 7-9")
 */
export function formatPageRange(pages: number[]): string {
  if (pages.length === 0) return '';

  const sorted = [...pages].sort((a, b) => a - b);
  const ranges: string[] = [];
  let start = sorted[0];
  let end = sorted[0];

  for (let i = 1; i <= sorted.length; i++) {
    if (i < sorted.length && sorted[i] === end + 1) {
      end = sorted[i];
    } else {
      if (start === end) {
        ranges.push(`${start}`);
      } else if (end === start + 1) {
        ranges.push(`${start}, ${end}`);
      } else {
        ranges.push(`${start}-${end}`);
      }
      if (i < sorted.length) {
        start = sorted[i];
        end = sorted[i];
      }
    }
  }

  return ranges.join(', ');
}
