import { describe, it, expect } from 'vitest';
import { calculateFitDimensions, getPageSizePoints, getMarginPoints } from '@/lib/utils/canvas-helpers';

describe('canvas-helpers geometry', () => {
  it('should return correct point dimensions for page sizes', () => {
    const a4 = getPageSizePoints('a4');
    expect(a4.width).toBeCloseTo(595.28, 1);
    expect(a4.height).toBeCloseTo(841.89, 1);

    const letter = getPageSizePoints('letter');
    expect(letter.width).toBe(612);
    expect(letter.height).toBe(792);
  });

  it('should return correct margin points', () => {
    expect(getMarginPoints('none')).toBe(0);
    expect(getMarginPoints('small')).toBeCloseTo(28.35, 1);
    expect(getMarginPoints('large')).toBeCloseTo(56.7, 1);
  });

  it('should calculate scaled fit dimensions preserving aspect ratio', () => {
    const fit = calculateFitDimensions(1000, 500, 500, 500); // 2:1 aspect ratio in 1:1 box
    expect(fit.width).toBe(500);
    expect(fit.height).toBe(250);
    expect(fit.scale).toBe(0.5);
  });
});
