import { PDFDocument } from 'pdf-lib';
import type { CompressionPreset, CompressPdfOptions, CompressPdfResult } from '@/lib/types';
import { getPdfJs, renderPdfPageToBlob } from '@/lib/converters/pdf-to-image';

export function getCompressionPresetValues(preset: CompressionPreset): { dpiScale: number; jpegQuality: number } {
  switch (preset) {
    case 'extreme':
      return { dpiScale: 1.0, jpegQuality: 0.50 };
    case 'less':
      return { dpiScale: 2.0, jpegQuality: 0.90 };
    case 'recommended':
    default:
      return { dpiScale: 1.5, jpegQuality: 0.75 };
  }
}

export function calculateCompressionMetrics(
  originalSize: number,
  compressedSize: number
): { savingsPercent: number; isLargerThanOriginal: boolean } {
  if (originalSize <= 0) {
    return { savingsPercent: 0, isLargerThanOriginal: false };
  }

  const isLargerThanOriginal = compressedSize >= originalSize;
  const saved = originalSize - compressedSize;
  const savingsPercent = isLargerThanOriginal
    ? 0
    : Math.round((saved / originalSize) * 100);

  return {
    savingsPercent,
    isLargerThanOriginal,
  };
}

/**
 * Re-encodes PDF pages as optimized JPEG streams to compress PDF size
 */
export async function compressPdfDocument(
  arrayBuffer: ArrayBuffer,
  options: CompressPdfOptions,
  onProgress?: (current: number, total: number) => void
): Promise<CompressPdfResult> {
  const originalSize = arrayBuffer.byteLength;
  const pdfjsLib = await getPdfJs();
  const loadingTask = pdfjsLib.getDocument({
    data: arrayBuffer,
    password: options.password,
  });
  const sourcePdf = await loadingTask.promise;
  const totalPages = sourcePdf.numPages;

  const newDoc = await PDFDocument.create();

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    onProgress?.(pageNum, totalPages);

    const jpegBlob = await renderPdfPageToBlob(sourcePdf, pageNum, {
      format: 'image/jpeg',
      dpiScale: options.dpiScale,
      quality: options.jpegQuality,
    });

    const imageBytes = new Uint8Array(await jpegBlob.arrayBuffer());
    const embeddedJpg = await newDoc.embedJpg(imageBytes);

    // Keep page dimensions proportional to original unscaled page size
    const page = await sourcePdf.getPage(pageNum);
    const originalViewport = page.getViewport({ scale: 1.0 });
    const newPage = newDoc.addPage([originalViewport.width, originalViewport.height]);
    newPage.drawImage(embeddedJpg, {
      x: 0,
      y: 0,
      width: originalViewport.width,
      height: originalViewport.height,
    });

    await new Promise((r) => setTimeout(r, 0)); // Yield to thread
  }

  const compressedBytes = await newDoc.save();
  const compressedBlob = new Blob([compressedBytes], { type: 'application/pdf' });
  const compressedSize = compressedBlob.size;

  const { savingsPercent, isLargerThanOriginal } = calculateCompressionMetrics(
    originalSize,
    compressedSize
  );

  const downloadUrl = URL.createObjectURL(compressedBlob);

  return {
    originalSize,
    compressedSize,
    savingsPercent,
    isLargerThanOriginal,
    blob: compressedBlob,
    downloadUrl,
  };
}
