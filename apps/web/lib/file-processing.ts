import type { PageData } from "@repo/core";

const PDF_WORKER_SRC = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
const DEFAULT_PDF_SCALE = 1.5;

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to read file as data URL.'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to load image data.'));
    reader.readAsDataURL(file);
  });
}

/**
 * Render PDF pages to image data URLs for GPT vision input
 */
export async function renderPdfPages(
  file: File,
  onProgress?: (progress: number) => void
): Promise<PageData[]> {
  const arrayBuffer = await file.arrayBuffer();
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf');

  if (pdfjsLib.GlobalWorkerOptions) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = PDF_WORKER_SRC;
  }

  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pages: PageData[] = [];
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('Unable to create a Canvas 2D context.');
  }

  for (let i = 1; i <= pdf.numPages; i += 1) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: DEFAULT_PDF_SCALE });

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({ canvasContext: context, viewport }).promise;

    const imageDataUrl = canvas.toDataURL('image/png');

    pages.push({
      index: i - 1,
      imageDataUrl,
      label: `Page ${i}`
    });

    context.clearRect(0, 0, canvas.width, canvas.height);

    if (onProgress) {
      onProgress(Math.round((i / pdf.numPages) * 100));
    }
  }

  canvas.width = 0;
  canvas.height = 0;

  return pages;
}

/**
 * Prepare single image file as data URL
 */
export async function prepareImageFile(
  file: File,
  onProgress?: (progress: number) => void
): Promise<PageData[]> {
  if (onProgress) {
    onProgress(10);
  }

  const imageDataUrl = await fileToDataUrl(file);

  if (onProgress) {
    onProgress(100);
  }

  return [{
    index: 0,
    imageDataUrl,
    label: file.name
  }];
}

/**
 * Process a file (PDF or image) and render to image data URLs
 */
export async function processFile(
  file: File,
  onProgress?: (progress: number) => void
): Promise<PageData[]> {
  const fileType = file.type;

  if (fileType === 'application/pdf') {
    return renderPdfPages(file, onProgress);
  }

  if (fileType.startsWith('image/')) {
    return prepareImageFile(file, onProgress);
  }

  throw new Error('Unsupported file type. Please use a PDF or image.');
}

/**
 * Validate rendered pages
 */
export function validatePages(pages: PageData[]): void {
  if (!pages.length || !pages[0].imageDataUrl) {
    throw new Error('Unable to extract page images from the file.');
  }
}
