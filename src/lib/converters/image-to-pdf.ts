import { PDFDocument } from 'pdf-lib';
import type { ImageFileItem, ImageToPdfOptions } from '@/lib/types';
import {
  getPageSizePoints,
  getMarginPoints,
  calculateFitDimensions,
  loadImageFromBlob,
  flattenImageToCanvas,
  canvasToBlob,
} from '@/lib/utils/canvas-helpers';

export async function generatePdfFromImages(
  images: ImageFileItem[],
  options: ImageToPdfOptions,
  onProgress?: (current: number, total: number) => void
): Promise<Blob> {
  if (!images || images.length === 0) {
    throw new Error('No images provided for PDF conversion');
  }

  const pdfDoc = await PDFDocument.create();

  for (let i = 0; i < images.length; i++) {
    const item = images[i];
    onProgress?.(i + 1, images.length);

    let imageBytes: Uint8Array;
    let isPng = false;

    // Check if intermediate canvas transcoding is required:
    const ext = item.name.split('.').pop()?.toLowerCase() || '';
    const isJpegOrPng =
      ext === 'jpg' ||
      ext === 'jpeg' ||
      ext === 'png' ||
      item.type === 'image/jpeg' ||
      item.type === 'image/png';

    const isDirectSupported =
      isJpegOrPng && item.rotation === 0 && options.quality === 'high';

    if (isDirectSupported) {
      const buffer = await item.file.arrayBuffer();
      imageBytes = new Uint8Array(buffer);
      isPng = ext === 'png' || item.type === 'image/png';
    } else {
      // Transcode through canvas with solid white fill, quality compression, and rotation
      const img = await loadImageFromBlob(item.file);
      const canvas = await flattenImageToCanvas(
        img,
        img.naturalWidth || img.width,
        img.naturalHeight || img.height,
        item.rotation
      );

      const qualityFactor =
        options.quality === 'low' ? 0.6 : options.quality === 'medium' ? 0.8 : 0.95;
      const transcodeBlob = await canvasToBlob(canvas, 'image/jpeg', qualityFactor);

      canvas.width = 0;
      canvas.height = 0; // Trigger GC

      const buffer = await transcodeBlob.arrayBuffer();
      imageBytes = new Uint8Array(buffer);
      isPng = false;
    }

    let embeddedImage;
    try {
      if (isPng) {
        embeddedImage = await pdfDoc.embedPng(imageBytes);
      } else {
        embeddedImage = await pdfDoc.embedJpg(imageBytes);
      }
    } catch {
      // Resilient fallback
      try {
        embeddedImage = await pdfDoc.embedJpg(imageBytes);
      } catch {
        embeddedImage = await pdfDoc.embedPng(imageBytes);
      }
    }

    const imgWidth = embeddedImage.width;
    const imgHeight = embeddedImage.height;

    let pageWidth: number;
    let pageHeight: number;

    if (options.pageSize === 'fit') {
      pageWidth = imgWidth;
      pageHeight = imgHeight;
    } else {
      const standard = getPageSizePoints(options.pageSize);
      let isLandscape = options.orientation === 'landscape';
      if (options.orientation === 'auto') {
        isLandscape = imgWidth > imgHeight;
      }
      pageWidth = isLandscape ? standard.height : standard.width;
      pageHeight = isLandscape ? standard.width : standard.height;
    }

    const margin = options.pageSize === 'fit' ? 0 : getMarginPoints(options.margin);
    const printableWidth = Math.max(1, pageWidth - margin * 2);
    const printableHeight = Math.max(1, pageHeight - margin * 2);

    const { width: drawWidth, height: drawHeight } = calculateFitDimensions(
      imgWidth,
      imgHeight,
      printableWidth,
      printableHeight
    );

    const x = margin + (printableWidth - drawWidth) / 2;
    const y = margin + (printableHeight - drawHeight) / 2;

    const page = pdfDoc.addPage([pageWidth, pageHeight]);
    page.drawImage(embeddedImage, {
      x,
      y,
      width: drawWidth,
      height: drawHeight,
    });

    await new Promise((r) => setTimeout(r, 0)); // Microtask yield
  }

  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });
}
