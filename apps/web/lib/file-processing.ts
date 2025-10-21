import type { PageData } from "@repo/core";

const PDF_WORKER_SRC = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

/**
 * Extract text from all pages of a PDF file
 */
export async function extractPdfPages(file: File): Promise<PageData[]> {
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

/**
 * Extract text from an image using OCR (Korean + English)
 */
export async function extractImageText(
  file: File,
  onProgress?: (progress: number) => void
): Promise<PageData[]> {
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

/**
 * Process a file (PDF or image) and extract text
 */
export async function processFile(
  file: File,
  onProgress?: (progress: number) => void
): Promise<PageData[]> {
  const fileType = file.type;

  if (fileType === "application/pdf") {
    return extractPdfPages(file);
  }

  if (fileType.startsWith("image/")) {
    return extractImageText(file, onProgress);
  }

  throw new Error("지원하지 않는 파일 형식입니다. PDF 또는 이미지 파일(JPG, PNG)을 사용하세요.");
}

/**
 * Validate extracted pages
 */
export function validatePages(pages: PageData[]): void {
  if (!pages.length || !pages[0].text) {
    throw new Error("파일에서 텍스트를 찾지 못했습니다.");
  }
}
