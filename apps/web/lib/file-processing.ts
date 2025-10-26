import type { PageData } from "@repo/core";

const PDF_WORKER_SRC = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
const DEFAULT_PDF_SCALE = 1.5;
const MAX_IMAGE_DIMENSION = 2048; // Max width or height for vision API
const JPEG_QUALITY = 0.85; // JPEG compression quality (0-1)

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
 * Resize and compress image if needed to meet API requirements
 */
function optimizeImageSize(canvas: HTMLCanvasElement): string {
  const { width, height } = canvas;

  // Check if resizing is needed
  if (width <= MAX_IMAGE_DIMENSION && height <= MAX_IMAGE_DIMENSION) {
    // Use JPEG compression for better file size
    return canvas.toDataURL('image/jpeg', JPEG_QUALITY);
  }

  // Calculate new dimensions while maintaining aspect ratio
  let newWidth = width;
  let newHeight = height;

  if (width > height) {
    if (width > MAX_IMAGE_DIMENSION) {
      newWidth = MAX_IMAGE_DIMENSION;
      newHeight = Math.round((height / width) * MAX_IMAGE_DIMENSION);
    }
  } else {
    if (height > MAX_IMAGE_DIMENSION) {
      newHeight = MAX_IMAGE_DIMENSION;
      newWidth = Math.round((width / height) * MAX_IMAGE_DIMENSION);
    }
  }

  // Create a temporary canvas for resizing
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = newWidth;
  tempCanvas.height = newHeight;

  const tempContext = tempCanvas.getContext('2d');
  if (!tempContext) {
    // Fallback to original if can't resize
    return canvas.toDataURL('image/jpeg', JPEG_QUALITY);
  }

  // Draw resized image
  tempContext.drawImage(canvas, 0, 0, newWidth, newHeight);

  // Return compressed JPEG
  const dataUrl = tempCanvas.toDataURL('image/jpeg', JPEG_QUALITY);

  // Clean up
  tempCanvas.width = 0;
  tempCanvas.height = 0;

  return dataUrl;
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
    try {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: DEFAULT_PDF_SCALE });

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      await page.render({ canvasContext: context, viewport }).promise;

      // Optimize image size before converting to data URL
      const imageDataUrl = optimizeImageSize(canvas);

      pages.push({
        index: i - 1,
        imageDataUrl,
        label: `Page ${i}`
      });

      context.clearRect(0, 0, canvas.width, canvas.height);

      if (onProgress) {
        onProgress(Math.round((i / pdf.numPages) * 100));
      }
    } catch (error) {
      console.error(`Error rendering page ${i}:`, error);
      // Continue with next page instead of failing completely
      if (onProgress) {
        onProgress(Math.round((i / pdf.numPages) * 100));
      }
    }
  }

  canvas.width = 0;
  canvas.height = 0;

  if (pages.length === 0) {
    throw new Error('Failed to render any pages from PDF');
  }

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

  // Optimize image size if needed
  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = imageDataUrl;
  });

  let optimizedDataUrl = imageDataUrl;

  if (img.width > MAX_IMAGE_DIMENSION || img.height > MAX_IMAGE_DIMENSION) {
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;

    const context = canvas.getContext('2d');
    if (context) {
      context.drawImage(img, 0, 0);
      optimizedDataUrl = optimizeImageSize(canvas);
      canvas.width = 0;
      canvas.height = 0;
    }
  }

  if (onProgress) {
    onProgress(100);
  }

  return [{
    index: 0,
    imageDataUrl: optimizedDataUrl,
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
