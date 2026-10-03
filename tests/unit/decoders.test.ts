import { describe, it, expect } from 'vitest';
import { decodeHeicToBlob } from '@/lib/converters/heic-decoder';
import { decodeTiffToBlob } from '@/lib/converters/tiff-decoder';

describe('extended decoders environment guard', () => {
  it('should throw descriptive error when window is undefined in decodeHeicToBlob', async () => {
    const originalWindow = global.window;
    try {
      // @ts-expect-error simulate SSR
      delete global.window;
      await expect(decodeHeicToBlob(new Blob())).rejects.toThrow('browser environment');
    } finally {
      global.window = originalWindow;
    }
  });

  it('should throw descriptive error when window is undefined in decodeTiffToBlob', async () => {
    const originalWindow = global.window;
    try {
      // @ts-expect-error simulate SSR
      delete global.window;
      await expect(decodeTiffToBlob(new Blob())).rejects.toThrow('browser environment');
    } finally {
      global.window = originalWindow;
    }
  });
});
