import { describe, it, expect } from 'vitest';
import { calculateCompressionMetrics, getCompressionPresetValues } from '@/lib/converters/compress-pdf';

describe('compress-pdf metrics', () => {
  it('should return correct preset values', () => {
    const extreme = getCompressionPresetValues('extreme');
    expect(extreme.dpiScale).toBe(1.0);
    expect(extreme.jpegQuality).toBe(0.5);

    const recommended = getCompressionPresetValues('recommended');
    expect(recommended.dpiScale).toBe(1.5);
    expect(recommended.jpegQuality).toBe(0.75);
  });

  it('should calculate savings accurately and detect negative compression', () => {
    const normal = calculateCompressionMetrics(10000, 2500);
    expect(normal.savingsPercent).toBe(75);
    expect(normal.isLargerThanOriginal).toBe(false);

    const negative = calculateCompressionMetrics(5000, 7500);
    expect(negative.savingsPercent).toBe(0);
    expect(negative.isLargerThanOriginal).toBe(true);
  });
});
