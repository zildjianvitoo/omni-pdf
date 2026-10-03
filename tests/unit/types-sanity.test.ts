import { describe, it, expect } from 'vitest';
import type { ImageFileItem, ImageToPdfOptions, PdfToImageOptions, CompressPdfOptions, WorkerRequest } from '@/lib/types';

describe('TypeScript Type Contracts', () => {
  it('should construct valid ImageFileItem', () => {
    const item: Partial<ImageFileItem> = {
      id: 'test-1',
      name: 'photo.jpg',
      rotation: 90,
      status: 'idle',
    };
    expect(item.id).toBe('test-1');
    expect(item.rotation).toBe(90);
  });

  it('should construct valid WorkerRequest', () => {
    const req: WorkerRequest<'GENERATE_ZIP'> = {
      id: 'req-1',
      action: 'GENERATE_ZIP',
      payload: {
        files: [{ name: 'page-1.png', blob: new Blob() }],
      },
    };
    expect(req.action).toBe('GENERATE_ZIP');
  });
});
