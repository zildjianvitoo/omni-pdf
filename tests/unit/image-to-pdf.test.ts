import { describe, it, expect } from 'vitest';
import { generatePdfFromImages } from '@/lib/converters/image-to-pdf';
import type { ImageFileItem, ImageToPdfOptions } from '@/lib/types';
import { PDFDocument } from 'pdf-lib';

describe('image-to-pdf engine', () => {
  it('should throw error when image list is empty', async () => {
    const options: ImageToPdfOptions = {
      pageSize: 'a4',
      orientation: 'portrait',
      margin: 'none',
      quality: 'high',
    };
    await expect(generatePdfFromImages([], options)).rejects.toThrow('No images provided');
  });

  it('should assemble a valid PDF document with given pages', async () => {
    // 1x1 base64 transparent PNG
    const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
    const binary = atob(pngBase64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes], { type: 'image/png' });
    const file = new File([blob], 'test.png', { type: 'image/png' });

    const mockItem: ImageFileItem = {
      id: '1',
      file,
      name: 'test.png',
      size: blob.size,
      type: 'image/png',
      previewUrl: '',
      rotation: 0,
      width: 100,
      height: 100,
      status: 'idle',
    };

    const options: ImageToPdfOptions = {
      pageSize: 'a4',
      orientation: 'portrait',
      margin: 'small',
      quality: 'high',
    };

    const pdfBlob = await generatePdfFromImages([mockItem], options);
    expect(pdfBlob).toBeInstanceOf(Blob);
    expect(pdfBlob.type).toBe('application/pdf');

    const pdfBuffer = await pdfBlob.arrayBuffer();
    const loadedPdf = await PDFDocument.load(pdfBuffer);
    expect(loadedPdf.getPageCount()).toBe(1);
  });
});
