import { describe, it, expect } from 'vitest';
import { formatBytes, parsePageRange, isSupportedImage, getFileExtension } from '@/lib/utils/file-helpers';

describe('file-helpers', () => {
  it('should format bytes to human readable string', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(1024)).toBe('1.0 KB');
    expect(formatBytes(1024 * 1024 * 2.5)).toBe('2.5 MB');
  });

  it('should get file extension accurately', () => {
    expect(getFileExtension('sample.photo.PNG')).toBe('png');
    expect(getFileExtension('document.pdf')).toBe('pdf');
    expect(getFileExtension('no-ext')).toBe('');
  });

  it('should identify supported image formats', () => {
    expect(isSupportedImage('image/jpeg', 'test.jpg')).toBe(true);
    expect(isSupportedImage('image/png', 'test.png')).toBe(true);
    expect(isSupportedImage('image/heic', 'test.heic')).toBe(true);
    expect(isSupportedImage('', 'scan.tiff')).toBe(true);
    expect(isSupportedImage('application/pdf', 'doc.pdf')).toBe(false);
  });

  it('should parse page ranges correctly', () => {
    expect(parsePageRange('1-3, 5, 7-8', 10)).toEqual([1, 2, 3, 5, 7, 8]);
    expect(parsePageRange('all', 4)).toEqual([1, 2, 3, 4]);
    expect(parsePageRange('10-15', 5)).toEqual([]); // out of bounds clamped
    expect(parsePageRange('invalid, 2', 5)).toEqual([2]);
  });
});
