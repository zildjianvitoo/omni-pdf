import JSZip from 'jszip';
import type { PdfToImageOptions } from '@/lib/types';
import { parsePageRange } from '@/lib/utils/file-helpers';
import { canvasToBlob } from '@/lib/utils/canvas-helpers';

export function getExtensionFromMime(mime: string): string {
  switch (mime) {
    case 'image/jpeg': return 'jpg';
    case 'image/webp': return 'webp';
    case 'image/png':
    default: return 'png';
  }
}

export function formatZipPageFilename(pageNumber: number, totalPages: number, ext: string): string {
  const digits = Math.max(1, String(totalPages).length);
  const padded = String(pageNumber).padStart(digits, '0');
  return `page-${padded}.${ext}`;
}

export async function packagePagesToZip(
  pages: { pageNumber: number; blob: Blob }[],
  totalDocumentPages: number,
  mime: string,
  onProgress?: (percent: number) => void
): Promise<Blob> {
  const zip = new JSZip();
  const ext = getExtensionFromMime(mime);

  pages.forEach(({ pageNumber, blob }) => {
    const filename = formatZipPageFilename(pageNumber, totalDocumentPages, ext);
    zip.file(filename, blob);
  });

  return await zip.generateAsync({ type: 'blob' }, (metadata) => {
    onProgress?.(metadata.percent);
  });
}

/**
 * Initializes pdfjs-dist and configures static worker path safely in browser
 */
export async function getPdfJs() {
  const pdfjsLib = await import('pdfjs-dist');
  if (typeof window !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
  }
  return pdfjsLib;
}

/**
 * Renders a single PDF page to an image Blob at specified DPI scale and quality
 */
export async function renderPdfPageToBlob(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pdfDoc: any,
  pageNumber: number,
  options: { format: string; dpiScale: number; quality?: number }
): Promise<Blob> {
  const page = await pdfDoc.getPage(pageNumber);
  const viewport = page.getViewport({ scale: options.dpiScale });

  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas 2d context for PDF rendering');

  // Fill solid white background in case PDF has transparent elements
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  await page.render({
    canvasContext: ctx,
    viewport,
  }).promise;

  const blob = await canvasToBlob(canvas, options.format, options.quality ?? 0.95);

  // Clean up canvas memory immediately
  canvas.width = 0;
  canvas.height = 0;

  return blob;
}

/**
 * Extracts multiple pages from a PDF ArrayBuffer with range, custom, and password support
 */
export async function extractPagesFromPdf(
  arrayBuffer: ArrayBuffer,
  options: PdfToImageOptions,
  onProgress?: (current: number, total: number) => void
): Promise<{ pageNumber: number; blob: Blob }[]> {
  const pdfjsLib = await getPdfJs();
  const loadingTask = pdfjsLib.getDocument({
    data: arrayBuffer,
    password: options.password,
  });
  const pdfDoc = await loadingTask.promise;
  const totalPages = pdfDoc.numPages;

  let targetPages: number[];
  if (options.pageSelection === 'range' && options.pageRange) {
    targetPages = parsePageRange(options.pageRange, totalPages);
  } else if (
    options.pageSelection === 'custom' &&
    options.customPages &&
    options.customPages.length > 0
  ) {
    targetPages = options.customPages.filter((p) => p >= 1 && p <= totalPages);
  } else {
    targetPages = Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const results: { pageNumber: number; blob: Blob }[] = [];

  try {
    for (let i = 0; i < targetPages.length; i++) {
      const pageNum = targetPages[i];
      onProgress?.(i + 1, targetPages.length);

      const blob = await renderPdfPageToBlob(pdfDoc, pageNum, {
        format: options.format,
        dpiScale: options.dpiScale,
      });

      results.push({ pageNumber: pageNum, blob });

      // Yield to main thread briefly for UI responsiveness
      await new Promise((r) => setTimeout(r, 0));
    }
  } finally {
    try {
      await pdfDoc.destroy();
    } catch {
      // Ignore worker cleanup error
    }
  }

  return results;
}
