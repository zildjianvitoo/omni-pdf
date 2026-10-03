import { describe, it, expect } from 'vitest';
import { formatZipPageFilename, getExtensionFromMime, packagePagesToZip } from '@/lib/converters/pdf-to-image';

describe('pdf-to-image helpers', () => {
  it('should format zip page filename with dynamic zero padding', () => {
    expect(formatZipPageFilename(1, 9, 'png')).toBe('page-1.png');
    expect(formatZipPageFilename(5, 50, 'jpg')).toBe('page-05.jpg');
    expect(formatZipPageFilename(12, 150, 'webp')).toBe('page-012.webp');
  });

  it('should map mime to proper extension', () => {
    expect(getExtensionFromMime('image/png')).toBe('png');
    expect(getExtensionFromMime('image/jpeg')).toBe('jpg');
    expect(getExtensionFromMime('image/webp')).toBe('webp');
  });

  it('should package page blobs into a zip file', async () => {
    const dummyBlob = new Blob(['sample-image-data'], { type: 'image/png' });
    const pages = [
      { pageNumber: 1, blob: dummyBlob },
      { pageNumber: 2, blob: dummyBlob },
    ];

    const zipBlob = await packagePagesToZip(pages, 2, 'image/png');
    expect(zipBlob).toBeInstanceOf(Blob);
    expect(zipBlob.type).toBe('application/zip');
    expect(zipBlob.size).toBeGreaterThan(0);
  });
});
