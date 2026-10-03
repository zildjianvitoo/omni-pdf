# Scalable Client-Side PDF Converter & Utility Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a 100% client-side, infinitely scalable web utility in Next.js (TypeScript) for converting images to PDF (with reordering, rotation, page sizing, and margin controls), converting multi-page PDFs to images (PNG, JPEG, WebP, with range selection and ZIP download), and compressing PDFs with negative-compression safeguards.

**Architecture:** Client-side processing utilizing browser Web APIs, `pdf-lib` for document assembly, `pdfjs-dist` for page rasterization, canvas for alpha flattening and format transcoding, and `jszip` for bulk packaging. All state and conversion pipelines are decoupled into typed custom hooks and isolated converter modules, preventing server load and ensuring complete privacy.

**Tech Stack:** Next.js 15 (App Router, React 19, TypeScript), Tailwind CSS, Lucide React, `@hello-pangea/dnd`, `pdf-lib`, `pdfjs-dist`, `heic2any`, `utif`, `jszip`, `file-saver`, Vitest.

---

## Chunk 1: Foundation & Utilities

### Task 1: Initialize Next.js Project & Dependencies

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.ts`
- Create: `tailwind.config.ts`
- Create: `postcss.config.mjs`
- Create: `vitest.config.ts`
- Create: `public/pdf.worker.min.mjs`

- [ ] **Step 1: Scaffold Next.js and install core dependencies**

Run:
```bash
npm init -y
npm install next@latest react@latest react-dom@latest lucide-react pdf-lib pdfjs-dist@^4.10.38 heic2any utif jszip file-saver @hello-pangea/dnd clsx tailwind-merge
npm install -D typescript @types/react @types/react-dom @types/node @types/file-saver tailwindcss @tailwindcss/postcss postcss vitest @testing-library/react @testing-library/jest-dom jsdom
```

- [ ] **Step 2: Configure TypeScript (`tsconfig.json`)**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: Configure Tailwind CSS (`tailwind.config.ts`) and PostCSS (`postcss.config.mjs`)**

```typescript
// tailwind.config.ts
import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;
```

```javascript
// postcss.config.mjs
export default {
  plugins: {
    '@tailwindcss/postcss': {},
  },
};
```

- [ ] **Step 4: Configure Next.js (`next.config.ts`) and Vitest (`vitest.config.ts`)**

```typescript
// next.config.ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  webpack: (config) => {
    config.resolve.alias.canvas = false;
    config.resolve.alias.encoding = false;
    return config;
  },
  turbopack: {},
};

export default nextConfig;
```

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    passWithNoTests: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

- [ ] **Step 5: Setup npm scripts and copy `pdf.worker.min.mjs` to `public/`**

Add scripts to `package.json`:
```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "test": "vitest run --passWithNoTests"
}
```

Run:
```bash
mkdir -p public
cp node_modules/pdfjs-dist/build/pdf.worker.*mjs public/pdf.worker.min.mjs
```

- [ ] **Step 6: Verify build configuration & test runner**

Run: `npm test`
Expected: `No test files found, exiting with code 0` (PASS with code 0).

- [ ] **Step 7: Commit**

```bash
git add package.json tsconfig.json next.config.ts tailwind.config.ts postcss.config.mjs vitest.config.ts public/
git commit -m "chore: initialize next.js project with vitest, tailwind, and conversion dependencies"
```

---

### Task 2: Core Data Models & TypeScript Contracts

**Files:**
- Create: `src/lib/types.ts`
- Test: `tests/unit/types-sanity.test.ts`

- [ ] **Step 1: Write the sanity test for types**

```typescript
// tests/unit/types-sanity.test.ts
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
```

- [ ] **Step 2: Run test to verify failure (missing types module)**

Run: `npx vitest run tests/unit/types-sanity.test.ts`
Expected: FAIL with "Cannot find module '@/lib/types'"

- [ ] **Step 3: Implement `src/lib/types.ts`**

```typescript
// src/lib/types.ts
export type ConversionMode = 'image-to-pdf' | 'pdf-to-image' | 'compress-pdf';

export type FileStatus = 'idle' | 'decoding' | 'converting' | 'done' | 'error';

export interface ImageFileItem {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  previewUrl: string;
  rotation: 0 | 90 | 180 | 270;
  width: number;
  height: number;
  status: FileStatus;
  error?: string;
}

export interface PdfPageItem {
  pageNumber: number;
  thumbnailUrl: string;
  blob?: Blob;
  selected: boolean;
  width: number;
  height: number;
  status: FileStatus;
  error?: string;
}

export interface ImageToPdfOptions {
  pageSize: 'a4' | 'letter' | 'fit';
  orientation: 'portrait' | 'landscape' | 'auto';
  margin: 'none' | 'small' | 'large'; // 0, 28.35 pt (10mm), 56.7 pt (20mm)
  quality: 'high' | 'medium' | 'low'; // 1.0, 0.8, 0.6 compression
}

export interface PdfToImageOptions {
  format: 'image/png' | 'image/jpeg' | 'image/webp';
  dpiScale: number; // 1.5x (~150 DPI) or 2.5x (~300 DPI)
  pageSelection: 'all' | 'range' | 'custom';
  pageRange?: string; // e.g. "1-3, 5"
  customPages?: number[]; // Selected page indices when pageSelection === 'custom'
  password?: string; // Optional password for encrypted PDFs
}

export type CompressionPreset = 'extreme' | 'recommended' | 'less';

export interface CompressPdfOptions {
  preset: CompressionPreset;
  dpiScale: number; // 1.0x (96 DPI), 1.5x (150 DPI), 2.0x (200 DPI)
  jpegQuality: number; // 0.50, 0.75, 0.90
  password?: string; // Optional password for encrypted PDFs
}

export interface CompressPdfResult {
  originalSize: number;
  compressedSize: number;
  savingsPercent: number;
  isLargerThanOriginal: boolean;
  blob: Blob;
  downloadUrl: string;
}

// Web Worker contracts
export type WorkerAction = 'DECODE_HEIC' | 'PARSE_TIFF' | 'GENERATE_ZIP';

export interface WorkerPayloadMap {
  DECODE_HEIC: { fileBuffer: ArrayBuffer; outputMime: 'image/jpeg' | 'image/png' };
  PARSE_TIFF: { fileBuffer: ArrayBuffer };
  GENERATE_ZIP: { files: { name: string; blob: Blob }[] };
}

export interface WorkerRequest<T extends WorkerAction> {
  id: string;
  action: T;
  payload: WorkerPayloadMap[T];
}

export interface WorkerResponse<R = unknown> {
  id: string;
  success: boolean;
  result?: R;
  error?: string;
  progress?: number;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/types-sanity.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/types.ts tests/unit/types-sanity.test.ts
git commit -m "feat: add core typescript types, interfaces, and worker contracts"
```

---

### Task 3: File Helpers & Range Parsing Utilities

**Files:**
- Create: `src/lib/utils/file-helpers.ts`
- Test: `tests/unit/file-helpers.test.ts`

- [ ] **Step 1: Write failing tests for file helpers and range parser**

```typescript
// tests/unit/file-helpers.test.ts
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
```

- [ ] **Step 2: Run test to verify failure**

Run: `npx vitest run tests/unit/file-helpers.test.ts`
Expected: FAIL with "Cannot find module '@/lib/utils/file-helpers'"

- [ ] **Step 3: Implement `src/lib/utils/file-helpers.ts`**

```typescript
// src/lib/utils/file-helpers.ts

const SUPPORTED_EXTENSIONS = new Set([
  'jpg', 'jpeg', 'png', 'webp', 'svg', 'gif', 'bmp', 'heic', 'heif', 'tiff', 'tif'
]);

const SUPPORTED_MIMES = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'image/gif',
  'image/bmp', 'image/heic', 'image/heif', 'image/tiff'
]);

export function getFileExtension(filename: string): string {
  const parts = filename.split('.');
  if (parts.length <= 1) return '';
  return parts.pop()?.toLowerCase() || '';
}

export function isSupportedImage(mimeType: string, filename: string): boolean {
  if (mimeType && SUPPORTED_MIMES.has(mimeType.toLowerCase())) return true;
  const ext = getFileExtension(filename);
  return SUPPORTED_EXTENSIONS.has(ext);
}

export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return (bytes / Math.pow(k, i)).toFixed(dm) + ' ' + sizes[i];
}

export function parsePageRange(rangeStr: string, totalPages: number): number[] {
  if (!rangeStr || rangeStr.trim().toLowerCase() === 'all') {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages = new Set<number>();
  const tokens = rangeStr.split(/[\s,]+/);

  for (const token of tokens) {
    if (!token) continue;
    if (token.includes('-')) {
      const [startStr, endStr] = token.split('-');
      const start = parseInt(startStr, 10);
      const end = parseInt(endStr, 10);
      if (!isNaN(start) && !isNaN(end)) {
        const min = Math.max(1, Math.min(start, end));
        const max = Math.min(totalPages, Math.max(start, end));
        for (let p = min; p <= max; p++) {
          pages.add(p);
        }
      }
    } else {
      const page = parseInt(token, 10);
      if (!isNaN(page) && page >= 1 && page <= totalPages) {
        pages.add(page);
      }
    }
  }

  return Array.from(pages).sort((a, b) => a - b);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/file-helpers.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/utils/file-helpers.ts tests/unit/file-helpers.test.ts
git commit -m "feat: add file validation, formatting, and page range parsing utilities"
```

---

### Task 4: Canvas Utilities & Page Geometry Calculations

**Files:**
- Create: `src/lib/utils/canvas-helpers.ts`
- Test: `tests/unit/canvas-helpers.test.ts`

- [ ] **Step 1: Write failing tests for canvas & layout calculations**

```typescript
// tests/unit/canvas-helpers.test.ts
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
```

- [ ] **Step 2: Run test to verify failure**

Run: `npx vitest run tests/unit/canvas-helpers.test.ts`
Expected: FAIL with "Cannot find module '@/lib/utils/canvas-helpers'"

- [ ] **Step 3: Implement `src/lib/utils/canvas-helpers.ts`**

```typescript
// src/lib/utils/canvas-helpers.ts

export const PAGE_SIZES = {
  a4: { width: 595.28, height: 841.89 },
  letter: { width: 612, height: 792 },
} as const;

export const MARGINS = {
  none: 0,
  small: 28.35, // 10mm in points
  large: 56.7,  // 20mm in points
} as const;

export function getPageSizePoints(size: 'a4' | 'letter'): { width: number; height: number } {
  return PAGE_SIZES[size] || PAGE_SIZES.a4;
}

export function getMarginPoints(margin: 'none' | 'small' | 'large'): number {
  return MARGINS[margin] ?? 0;
}

export function calculateFitDimensions(
  imgWidth: number,
  imgHeight: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number; scale: number } {
  if (imgWidth <= 0 || imgHeight <= 0 || maxWidth <= 0 || maxHeight <= 0) {
    return { width: 0, height: 0, scale: 0 };
  }
  const scale = Math.min(maxWidth / imgWidth, maxHeight / imgHeight);
  return {
    width: imgWidth * scale,
    height: imgHeight * scale,
    scale,
  };
}

export async function loadImageFromBlob(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image from blob: ' + err));
    };
    img.src = url;
  });
}

/**
 * Draws image onto a clean canvas with solid white fill to prevent transparent
 * PNG/WebP alpha channels turning black upon JPEG or PDF embedding.
 */
export async function flattenImageToCanvas(
  imgSource: HTMLImageElement | ImageBitmap,
  width: number,
  height: number,
  rotation = 0
): Promise<HTMLCanvasElement> {
  const canvas = document.createElement('canvas');
  const isRotated90or270 = rotation === 90 || rotation === 270;
  canvas.width = isRotated90or270 ? height : width;
  canvas.height = isRotated90or270 ? width : height;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get 2D canvas context');

  // Fill solid white background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Apply rotation
  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.drawImage(imgSource, -width / 2, -height / 2, width, height);
  ctx.restore();

  return canvas;
}

export function canvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality?: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    if (canvas.toBlob) {
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Failed to export canvas to blob'));
        },
        mimeType,
        quality
      );
    } else {
      // Fallback for environments lacking canvas.toBlob
      try {
        const dataUrl = canvas.toDataURL(mimeType, quality);
        const binary = atob(dataUrl.split(',')[1]);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        resolve(new Blob([bytes], { type: mimeType }));
      } catch (err) {
        reject(err);
      }
    }
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/canvas-helpers.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/utils/canvas-helpers.ts tests/unit/canvas-helpers.test.ts
git commit -m "feat: add canvas layout calculation, image loader, and alpha flattening helpers"
```

---

## Chunk 2: Conversion Engines

> **Concurrency Note:** Image normalization, TIFF decoding, and canvas rendering utilize client DOM canvas APIs (`HTMLCanvasElement`) and run cooperatively on the main thread via micro-task yielding (`setTimeout(r, 0)`). `pdfjs-dist` executes internal PDF parsing inside its dedicated worker (`/public/pdf.worker.min.mjs`), ensuring smooth UI rendering and avoiding nested worker failures in WebKit/iOS.

### Task 5: Extended Format Decoders (HEIC & TIFF)

**Files:**
- Create: `src/lib/converters/heic-decoder.ts`
- Create: `src/lib/converters/tiff-decoder.ts`
- Test: `tests/unit/decoders.test.ts`

- [ ] **Step 1: Write tests for HEIC & TIFF SSR environment checks**

```typescript
// tests/unit/decoders.test.ts
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
```

- [ ] **Step 2: Run test to verify failure**

Run: `npx vitest run tests/unit/decoders.test.ts`
Expected: FAIL with "Cannot find module '@/lib/converters/heic-decoder'"

- [ ] **Step 3: Implement `heic-decoder.ts` and `tiff-decoder.ts`**

```typescript
// src/lib/converters/heic-decoder.ts
export async function decodeHeicToBlob(file: File | Blob): Promise<Blob> {
  if (typeof window === 'undefined') {
    throw new Error('HEIC decoding is only supported in browser environment');
  }
  // Dynamically import heic2any to avoid SSR evaluation errors
  const heic2anyModule = await import('heic2any');
  const heic2any = heic2anyModule.default || heic2anyModule;
  const result = await heic2any({
    blob: file,
    toType: 'image/jpeg',
    quality: 0.9,
  });

  return Array.isArray(result) ? result[0] : result;
}
```

```typescript
// src/lib/converters/tiff-decoder.ts
import { canvasToBlob } from '@/lib/utils/canvas-helpers';

export async function decodeTiffToBlob(file: File | Blob): Promise<Blob> {
  if (typeof window === 'undefined') {
    throw new Error('TIFF decoding is only supported in browser environment');
  }
  const buffer = await file.arrayBuffer();
  // @ts-expect-error utif does not export full TS types
  const UTIFModule = await import('utif');
  const UTIF = UTIFModule.default || UTIFModule;
  const ifds = UTIF.decode(buffer);
  if (!ifds || ifds.length === 0) {
    throw new Error('Invalid TIFF file or empty image directory');
  }

  UTIF.decodeImage(buffer, ifds[0]);
  const rgba = UTIF.toRGBA8(ifds[0]);
  const width = ifds[0].width;
  const height = ifds[0].height;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not create canvas context for TIFF');

  const imgData = ctx.createImageData(width, height);
  imgData.data.set(rgba);
  ctx.putImageData(imgData, 0, 0);

  const blob = await canvasToBlob(canvas, 'image/png');
  canvas.width = 0;
  canvas.height = 0;
  return blob;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/decoders.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/converters/heic-decoder.ts src/lib/converters/tiff-decoder.ts tests/unit/decoders.test.ts
git commit -m "feat: add client-side dynamic decoders for HEIC and TIFF images with SSR guards"
```

---

### Task 6: Image to PDF Conversion Engine with Intermediate Transcoding

**Files:**
- Create: `src/lib/converters/image-to-pdf.ts`
- Test: `tests/unit/image-to-pdf.test.ts`

- [ ] **Step 1: Write tests for Image to PDF generation**

```typescript
// tests/unit/image-to-pdf.test.ts
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
```

- [ ] **Step 2: Run test to verify failure**

Run: `npx vitest run tests/unit/image-to-pdf.test.ts`
Expected: FAIL with "Cannot find module '@/lib/converters/image-to-pdf'"

- [ ] **Step 3: Implement `src/lib/converters/image-to-pdf.ts`**

```typescript
// src/lib/converters/image-to-pdf.ts
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
  }

  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes], { type: 'application/pdf' });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/image-to-pdf.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/converters/image-to-pdf.ts tests/unit/image-to-pdf.test.ts
git commit -m "feat: implement image-to-pdf engine with layout fitting, rotation, and canvas transcoding"
```

---

### Task 7: PDF to Image Engine & ZIP Archiving

**Files:**
- Create: `src/lib/converters/pdf-to-image.ts`
- Test: `tests/unit/pdf-to-image.test.ts`

- [ ] **Step 1: Write tests for PDF to Image page extraction and ZIP archiving**

```typescript
// tests/unit/pdf-to-image.test.ts
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
```

- [ ] **Step 2: Run test to verify failure**

Run: `npx vitest run tests/unit/pdf-to-image.test.ts`
Expected: FAIL with "Cannot find module '@/lib/converters/pdf-to-image'"

- [ ] **Step 3: Implement `src/lib/converters/pdf-to-image.ts` with custom selection and password support**

```typescript
// src/lib/converters/pdf-to-image.ts
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

  return results;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/pdf-to-image.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/converters/pdf-to-image.ts tests/unit/pdf-to-image.test.ts
git commit -m "feat: implement pdf-to-image engine with custom page selection and password support"
```

---

### Task 8: Compress PDF Engine & Safeguard Pipeline

**Files:**
- Create: `src/lib/converters/compress-pdf.ts`
- Test: `tests/unit/compress-pdf.test.ts`

- [ ] **Step 1: Write test for compression savings and negative compression safeguard**

```typescript
// tests/unit/compress-pdf.test.ts
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
```

- [ ] **Step 2: Run test to verify failure**

Run: `npx vitest run tests/unit/compress-pdf.test.ts`
Expected: FAIL with "Cannot find module '@/lib/converters/compress-pdf'"

- [ ] **Step 3: Implement `src/lib/converters/compress-pdf.ts` reusing page renderer**

```typescript
// src/lib/converters/compress-pdf.ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/compress-pdf.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/converters/compress-pdf.ts tests/unit/compress-pdf.test.ts
git commit -m "feat: implement pdf compression re-encoding engine and negative-compression safeguards"
```

---

## Chunk 3: Shared Components & Image to PDF Hub

### Task 9: Shared Common Components

**Files:**
- Create: `src/components/common/Navbar.tsx`
- Create: `src/components/common/Footer.tsx`
- Create: `src/components/common/PrivacyBadge.tsx`
- Create: `src/components/common/ProgressBar.tsx`
- Create: `src/components/common/ModeSwitcher.tsx`
- Create: `src/components/common/Dropzone.tsx`

- [ ] **Step 1: Implement `Navbar.tsx`, `Footer.tsx`, and `PrivacyBadge.tsx`**

```tsx
// src/components/common/Navbar.tsx
import Link from 'next/link';
import { FileText, ShieldCheck } from 'lucide-react';

export function Navbar() {
  return (
    <header className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-xl text-slate-900">
          <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm">
            <FileText className="w-5 h-5" />
          </div>
          <span>OmniPDF</span>
        </Link>
        <div className="flex items-center gap-2 text-xs md:text-sm font-medium text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>100% Client-Side & Privat</span>
        </div>
      </div>
    </header>
  );
}
```

```tsx
// src/components/common/Footer.tsx
export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-slate-50 py-8 mt-16 text-center text-sm text-slate-500">
      <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p>© 2026 OmniPDF Converter. Semua pemrosesan berlangsung lokal di browser Anda.</p>
        <div className="flex items-center gap-4 text-slate-600">
          <span>Zero Server Uploads</span>
          <span>•</span>
          <span>Scale-to-Infinity</span>
        </div>
      </div>
    </footer>
  );
}
```

```tsx
// src/components/common/PrivacyBadge.tsx
import { Lock } from 'lucide-react';

export function PrivacyBadge() {
  return (
    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-xs font-medium">
      <Lock className="w-3.5 h-3.5 text-blue-600" />
      <span>File tidak pernah diunggah ke server mana pun. Privasi 100% terjamin.</span>
    </div>
  );
}
```

- [ ] **Step 2: Implement `ProgressBar.tsx` and `ModeSwitcher.tsx`**

```tsx
// src/components/common/ProgressBar.tsx
interface ProgressBarProps {
  current: number;
  total: number;
  label?: string;
}

export function ProgressBar({ current, total, label }: ProgressBarProps) {
  const percent = total > 0 ? Math.round((current / total) * 100) : 0;
  return (
    <div className="w-full space-y-2">
      <div className="flex justify-between text-xs font-semibold text-slate-700">
        <span>{label || 'Memproses...'}</span>
        <span>{percent}% ({current}/{total})</span>
      </div>
      <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-600 transition-all duration-200 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
```

```tsx
// src/components/common/ModeSwitcher.tsx
'use client';

import { Image, FileOutput, Minimize2 } from 'lucide-react';
import type { ConversionMode } from '@/lib/types';

interface ModeSwitcherProps {
  currentMode: ConversionMode;
  onSelectMode: (mode: ConversionMode) => void;
}

export function ModeSwitcher({ currentMode, onSelectMode }: ModeSwitcherProps) {
  const modes = [
    { id: 'image-to-pdf' as const, label: 'Gambar ke PDF', icon: Image },
    { id: 'pdf-to-image' as const, label: 'PDF ke Gambar', icon: FileOutput },
    { id: 'compress-pdf' as const, label: 'Kompres PDF', icon: Minimize2 },
  ];

  return (
    <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200 max-w-lg mx-auto">
      {modes.map(({ id, label, icon: Icon }) => {
        const isActive = currentMode === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onSelectMode(id)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs md:text-sm font-semibold transition-all ${
              isActive
                ? 'bg-white text-blue-600 shadow-sm border border-slate-200/60'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Icon className="w-4 h-4" />
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 3: Implement `Dropzone.tsx` with drag-and-drop, file picker, and paste support**

```tsx
// src/components/common/Dropzone.tsx
'use client';

import { useRef, useState, useEffect } from 'react';
import { UploadCloud } from 'lucide-react';

interface DropzoneProps {
  accept: string;
  multiple?: boolean;
  onFilesSelected: (files: File[]) => void;
  title: string;
  subtitle: string;
}

export function Dropzone({
  accept,
  multiple = true,
  onFilesSelected,
  title,
  subtitle,
}: DropzoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFilesSelected(Array.from(e.dataTransfer.files));
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (e.clipboardData?.files && e.clipboardData.files.length > 0) {
        onFilesSelected(Array.from(e.clipboardData.files));
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [onFilesSelected]);

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={() => fileInputRef.current?.click()}
      className={`border-2 border-dashed rounded-3xl p-8 md:p-12 text-center cursor-pointer transition-all ${
        isDragOver
          ? 'border-blue-500 bg-blue-50/50 scale-[1.01]'
          : 'border-slate-300 hover:border-slate-400 bg-white hover:bg-slate-50/50'
      }`}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            onFilesSelected(Array.from(e.target.files));
            e.target.value = '';
          }
        }}
      />
      <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4 border border-blue-100 shadow-sm">
        <UploadCloud className="w-8 h-8" />
      </div>
      <h3 className="text-base md:text-lg font-bold text-slate-800 mb-1">{title}</h3>
      <p className="text-xs md:text-sm text-slate-500 max-w-md mx-auto">{subtitle}</p>
      <div className="mt-4 inline-block text-xs font-medium text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
        Mendukung Drag & Drop atau Paste (Ctrl+V)
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Verify typecheck**

Run: `npx tsc --noEmit`
Expected: PASS with 0 errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/common/
git commit -m "feat: add shared common components including navbar, footer, dropzone, and mode switcher"
```

---

### Task 10: Image to PDF Feature Hub & Hook

**Files:**
- Create: `src/hooks/useImageToPdf.ts`
- Create: `src/components/image-to-pdf/ImageCard.tsx`
- Create: `src/components/image-to-pdf/ImageGrid.tsx`
- Create: `src/components/image-to-pdf/PageSettingsBar.tsx`
- Create: `src/components/image-to-pdf/ImageToPdfHub.tsx`

- [ ] **Step 1: Implement `useImageToPdf.ts` with error tracking and memory registration**

```typescript
// src/hooks/useImageToPdf.ts
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import type { ImageFileItem, ImageToPdfOptions } from '@/lib/types';
import { generatePdfFromImages } from '@/lib/converters/image-to-pdf';
import { decodeHeicToBlob } from '@/lib/converters/heic-decoder';
import { decodeTiffToBlob } from '@/lib/converters/tiff-decoder';
import { getFileExtension } from '@/lib/utils/file-helpers';
import { saveAs } from 'file-saver';

export function useImageToPdf() {
  const [images, setImages] = useState<ImageFileItem[]>([]);
  const [options, setOptions] = useState<ImageToPdfOptions>({
    pageSize: 'a4',
    orientation: 'portrait',
    margin: 'none',
    quality: 'high',
  });
  const [isConverting, setIsConverting] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const objectUrlsRef = useRef<Set<string>>(new Set());

  const registerUrl = useCallback((url: string) => {
    objectUrlsRef.current.add(url);
    return url;
  }, []);

  const cleanupUrls = useCallback(() => {
    objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    objectUrlsRef.current.clear();
  }, []);

  useEffect(() => {
    return () => cleanupUrls();
  }, [cleanupUrls]);

  const addFiles = async (files: File[]) => {
    const newItems: ImageFileItem[] = [];

    for (const file of files) {
      const ext = getFileExtension(file.name);
      let processedFile: File = file;
      let previewBlob: Blob = file;
      let itemStatus: ImageFileItem['status'] = 'idle';
      let itemError: string | undefined;

      try {
        if (ext === 'heic' || ext === 'heif') {
          previewBlob = await decodeHeicToBlob(file);
          processedFile = new File([previewBlob], file.name.replace(/\.[^/.]+$/, '.jpg'), {
            type: 'image/jpeg',
          });
        } else if (ext === 'tiff' || ext === 'tif') {
          previewBlob = await decodeTiffToBlob(file);
          processedFile = new File([previewBlob], file.name.replace(/\.[^/.]+$/, '.png'), {
            type: 'image/png',
          });
        }
      } catch (err) {
        console.error('Extended decode failed for file:', file.name, err);
        itemStatus = 'error';
        itemError = 'Format rusak atau tidak didukung';
      }

      const previewUrl = itemStatus === 'error' ? '' : registerUrl(URL.createObjectURL(previewBlob));
      newItems.push({
        id: `${file.name}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        file: processedFile,
        name: file.name,
        size: file.size,
        type: file.type,
        previewUrl,
        rotation: 0,
        width: 0,
        height: 0,
        status: itemStatus,
        error: itemError,
      });
    }

    setImages((prev) => [...prev, ...newItems]);
  };

  const removeImage = (id: string) => {
    setImages((prev) => {
      const item = prev.find((img) => img.id === id);
      if (item && item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      return prev.filter((img) => img.id !== id);
    });
  };

  const rotateImage = (id: string) => {
    setImages((prev) =>
      prev.map((img) => {
        if (img.id !== id) return img;
        const nextRotation = ((img.rotation + 90) % 360) as 0 | 90 | 180 | 270;
        return { ...img, rotation: nextRotation };
      })
    );
  };

  const reorderImages = (startIndex: number, endIndex: number) => {
    setImages((prev) => {
      const result = Array.from(prev);
      const [removed] = result.splice(startIndex, 1);
      result.splice(endIndex, 0, removed);
      return result;
    });
  };

  const convertToPdf = async () => {
    const validImages = images.filter((img) => img.status !== 'error');
    if (validImages.length === 0) {
      alert('Tidak ada gambar valid yang dapat dikonversi.');
      return;
    }

    setIsConverting(true);
    setProgress({ current: 0, total: validImages.length });

    try {
      const pdfBlob = await generatePdfFromImages(validImages, options, (current, total) => {
        setProgress({ current, total });
      });
      saveAs(pdfBlob, 'converted-documents.pdf');
    } catch (err) {
      console.error('PDF conversion failed:', err);
      alert('Gagal mengonversi gambar ke PDF. Silakan periksa kembali file Anda.');
    } finally {
      setIsConverting(false);
    }
  };

  const clearAll = () => {
    cleanupUrls();
    setImages([]);
  };

  return {
    images,
    options,
    setOptions,
    isConverting,
    progress,
    addFiles,
    removeImage,
    rotateImage,
    reorderImages,
    convertToPdf,
    clearAll,
  };
}
```

- [ ] **Step 2: Implement `ImageCard.tsx`, `ImageGrid.tsx`, and `PageSettingsBar.tsx`**

```tsx
// src/components/image-to-pdf/ImageCard.tsx
import { RotateCw, Trash2, GripVertical, AlertCircle } from 'lucide-react';
import type { ImageFileItem } from '@/lib/types';
import { formatBytes } from '@/lib/utils/file-helpers';

interface ImageCardProps {
  item: ImageFileItem;
  index: number;
  onRotate: (id: string) => void;
  onRemove: (id: string) => void;
  dragHandleProps?: Record<string, unknown>;
}

export function ImageCard({
  item,
  index,
  onRotate,
  onRemove,
  dragHandleProps,
}: ImageCardProps) {
  const isError = item.status === 'error';

  return (
    <div
      className={`group relative bg-white rounded-2xl border overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col ${
        isError ? 'border-red-400 bg-red-50/20' : 'border-slate-200'
      }`}
    >
      <div className="absolute top-2 left-2 z-10 bg-slate-900/70 backdrop-blur-sm text-white text-[11px] font-bold px-2 py-0.5 rounded-full">
        #{index + 1}
      </div>

      {!isError && (
        <div
          {...dragHandleProps}
          className="absolute top-2 right-2 z-10 bg-white/90 backdrop-blur-sm text-slate-700 p-1.5 rounded-lg shadow-sm cursor-grab active:cursor-grabbing hover:bg-white"
          title="Geser untuk mengubah urutan"
        >
          <GripVertical className="w-4 h-4" />
        </div>
      )}

      <div className="h-44 bg-slate-100 flex items-center justify-center p-3 overflow-hidden">
        {isError ? (
          <div className="text-center p-4 text-red-500 space-y-1">
            <AlertCircle className="w-8 h-8 mx-auto" />
            <p className="text-xs font-semibold">{item.error || 'Gagal memuat'}</p>
          </div>
        ) : (
          <img
            src={item.previewUrl}
            alt={item.name}
            className="max-h-full max-w-full object-contain transition-transform duration-200"
            style={{ transform: `rotate(${item.rotation}deg)` }}
          />
        )}
      </div>

      <div className="p-3 bg-white flex items-center justify-between border-t border-slate-100">
        <div className="min-w-0 pr-2">
          <p className="text-xs font-semibold text-slate-800 truncate">{item.name}</p>
          <p className="text-[10px] text-slate-400">{formatBytes(item.size)}</p>
        </div>
        <div className="flex items-center gap-1">
          {!isError && (
            <button
              type="button"
              onClick={() => onRotate(item.id)}
              className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Putar 90°"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={() => onRemove(item.id)}
            className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Hapus gambar"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
```

```tsx
// src/components/image-to-pdf/ImageGrid.tsx
'use client';

import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import type { ImageFileItem } from '@/lib/types';
import { ImageCard } from './ImageCard';

interface ImageGridProps {
  images: ImageFileItem[];
  onReorder: (startIndex: number, endIndex: number) => void;
  onRotate: (id: string) => void;
  onRemove: (id: string) => void;
}

export function ImageGrid({ images, onReorder, onRotate, onRemove }: ImageGridProps) {
  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    onReorder(result.source.index, result.destination.index);
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId="images-droppable" direction="horizontal">
        {(provided) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4"
          >
            {images.map((item, index) => (
              <Draggable key={item.id} draggableId={item.id} index={index}>
                {(dragProvided) => (
                  <div
                    ref={dragProvided.innerRef}
                    {...dragProvided.draggableProps}
                  >
                    <ImageCard
                      item={item}
                      index={index}
                      onRotate={onRotate}
                      onRemove={onRemove}
                      dragHandleProps={dragProvided.dragHandleProps ?? undefined}
                    />
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
}
```

```tsx
// src/components/image-to-pdf/PageSettingsBar.tsx
import type { ImageToPdfOptions } from '@/lib/types';

interface PageSettingsBarProps {
  options: ImageToPdfOptions;
  onChange: (options: ImageToPdfOptions) => void;
}

export function PageSettingsBar({ options, onChange }: PageSettingsBarProps) {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
      <div>
        <label className="block text-xs font-bold text-slate-700 mb-1.5">Ukuran Kertas</label>
        <select
          value={options.pageSize}
          onChange={(e) => onChange({ ...options, pageSize: e.target.value as ImageToPdfOptions['pageSize'] })}
          className="w-full text-xs font-semibold bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="a4">A4 (Standar)</option>
          <option value="letter">US Letter</option>
          <option value="fit">Fit to Image (Asli)</option>
        </select>
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-700 mb-1.5">Orientasi</label>
        <select
          value={options.orientation}
          onChange={(e) => onChange({ ...options, orientation: e.target.value as ImageToPdfOptions['orientation'] })}
          className="w-full text-xs font-semibold bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="portrait">Portrait</option>
          <option value="landscape">Landscape</option>
          <option value="auto">Auto (Sesuai Foto)</option>
        </select>
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-700 mb-1.5">Margin</label>
        <select
          value={options.margin}
          onChange={(e) => onChange({ ...options, margin: e.target.value as ImageToPdfOptions['margin'] })}
          className="w-full text-xs font-semibold bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="none">Tanpa Margin (0)</option>
          <option value="small">Margin Kecil (10mm)</option>
          <option value="large">Margin Besar (20mm)</option>
        </select>
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-700 mb-1.5">Kualitas Gambar</label>
        <select
          value={options.quality}
          onChange={(e) => onChange({ ...options, quality: e.target.value as ImageToPdfOptions['quality'] })}
          className="w-full text-xs font-semibold bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="high">High (Original)</option>
          <option value="medium">Medium (Compressed)</option>
          <option value="low">Low (Small File)</option>
        </select>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Implement `ImageToPdfHub.tsx`**

```tsx
// src/components/image-to-pdf/ImageToPdfHub.tsx
'use client';

import { useImageToPdf } from '@/hooks/useImageToPdf';
import { Dropzone } from '@/components/common/Dropzone';
import { ProgressBar } from '@/components/common/ProgressBar';
import { ImageGrid } from './ImageGrid';
import { PageSettingsBar } from './PageSettingsBar';
import { Plus, Trash2, ArrowRight } from 'lucide-react';

export function ImageToPdfHub() {
  const {
    images,
    options,
    setOptions,
    isConverting,
    progress,
    addFiles,
    removeImage,
    rotateImage,
    reorderImages,
    convertToPdf,
    clearAll,
  } = useImageToPdf();

  return (
    <div className="space-y-6">
      {images.length === 0 ? (
        <Dropzone
          accept="image/*,.heic,.heif,.tiff,.tif"
          title="Pilih atau Tarik File Gambar ke Sini"
          subtitle="Mendukung JPG, PNG, WebP, SVG, GIF, BMP, HEIC iPhone, dan scanner TIFF."
          onFilesSelected={addFiles}
        />
      ) : (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200">
            <div>
              <h2 className="text-base font-bold text-slate-900">{images.length} Gambar Dipilih</h2>
              <p className="text-xs text-slate-500">Tarik kartu gambar untuk mengatur urutan halaman.</p>
            </div>
            <div className="flex items-center gap-2">
              <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors">
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Gambar</span>
                <input
                  type="file"
                  accept="image/*,.heic,.heif,.tiff,.tif"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files) addFiles(Array.from(e.target.files));
                    e.target.value = '';
                  }}
                />
              </label>
              <button
                type="button"
                onClick={clearAll}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-red-600 hover:bg-red-50 text-xs font-semibold transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus Semua</span>
              </button>
            </div>
          </div>

          <PageSettingsBar options={options} onChange={setOptions} />

          <ImageGrid
            images={images}
            onReorder={reorderImages}
            onRotate={rotateImage}
            onRemove={removeImage}
          />

          {isConverting && (
            <div className="p-4 bg-white rounded-2xl border border-blue-200 shadow-sm">
              <ProgressBar
                current={progress.current}
                total={progress.total}
                label="Menghasilkan dokumen PDF..."
              />
            </div>
          )}

          <div className="flex justify-end pt-4">
            <button
              type="button"
              disabled={isConverting}
              onClick={convertToPdf}
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold text-sm shadow-md shadow-blue-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <span>{isConverting ? 'Sedang Memproses...' : 'Konversi ke PDF'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Verify typecheck**

Run: `npx tsc --noEmit`
Expected: PASS with 0 errors.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useImageToPdf.ts src/components/image-to-pdf/
git commit -m "feat: implement image-to-pdf hook and interactive UI components with drag-and-drop and error badges"
```

---

## Chunk 4: PDF to Image Feature Hub

### Task 11: PDF to Image Feature Hub & Hook

**Files:**
- Create: `src/hooks/usePdfToImage.ts`
- Create: `src/components/pdf-to-image/PageCard.tsx`
- Create: `src/components/pdf-to-image/PdfPreviewGrid.tsx`
- Create: `src/components/pdf-to-image/ExtractionBar.tsx`
- Create: `src/components/pdf-to-image/PdfToImageHub.tsx`

- [ ] **Step 1: Implement `usePdfToImage.ts` hook with password catch and range parsing**

```typescript
// src/hooks/usePdfToImage.ts
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import type { PdfPageItem, PdfToImageOptions } from '@/lib/types';
import {
  getPdfJs,
  renderPdfPageToBlob,
  packagePagesToZip,
  formatZipPageFilename,
  getExtensionFromMime,
} from '@/lib/converters/pdf-to-image';
import { parsePageRange } from '@/lib/utils/file-helpers';
import { saveAs } from 'file-saver';

export function usePdfToImage() {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pages, setPages] = useState<PdfPageItem[]>([]);
  const [options, setOptions] = useState<PdfToImageOptions>({
    format: 'image/png',
    dpiScale: 1.5,
    pageSelection: 'all',
    pageRange: '',
  });
  const [needsPassword, setNeedsPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [isLoadingDoc, setIsLoadingDoc] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const objectUrlsRef = useRef<Set<string>>(new Set());

  const registerUrl = useCallback((url: string) => {
    objectUrlsRef.current.add(url);
    return url;
  }, []);

  const cleanupUrls = useCallback(() => {
    objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    objectUrlsRef.current.clear();
  }, []);

  useEffect(() => {
    return () => cleanupUrls();
  }, [cleanupUrls]);

  const loadPdf = async (file: File, suppliedPassword?: string) => {
    cleanupUrls();
    setPdfFile(file);
    setIsLoadingDoc(true);
    setNeedsPassword(false);

    try {
      const buffer = await file.arrayBuffer();
      const pdfjsLib = await getPdfJs();
      const loadingTask = pdfjsLib.getDocument({
        data: buffer,
        password: suppliedPassword,
      });

      const pdfDoc = await loadingTask.promise;
      const total = pdfDoc.numPages;

      const pageItems: PdfPageItem[] = [];
      for (let num = 1; num <= total; num++) {
        const thumbBlob = await renderPdfPageToBlob(pdfDoc, num, {
          format: 'image/jpeg',
          dpiScale: 0.5,
        });
        const thumbnailUrl = registerUrl(URL.createObjectURL(thumbBlob));

        pageItems.push({
          pageNumber: num,
          thumbnailUrl,
          selected: true,
          width: 0,
          height: 0,
          status: 'idle',
        });
      }
      setPages(pageItems);
    } catch (err: unknown) {
      const errorObj = err as { name?: string; message?: string };
      if (errorObj?.name === 'PasswordException') {
        setNeedsPassword(true);
      } else {
        console.error('Failed to load PDF:', err);
        alert('Gagal membaca dokumen PDF. Pastikan file valid.');
      }
    } finally {
      setIsLoadingDoc(false);
    }
  };

  const handlePasswordSubmit = () => {
    if (pdfFile && password) {
      loadPdf(pdfFile, password);
    }
  };

  const togglePageSelection = (pageNumber: number) => {
    setPages((prev) =>
      prev.map((p) =>
        p.pageNumber === pageNumber ? { ...p, selected: !p.selected } : p
      )
    );
  };

  const selectAll = (selected: boolean) => {
    setPages((prev) => prev.map((p) => ({ ...p, selected })));
  };

  const downloadSinglePage = async (pageNumber: number) => {
    if (!pdfFile) return;
    try {
      const buffer = await pdfFile.arrayBuffer();
      const pdfjsLib = await getPdfJs();
      const pdfDoc = await pdfjsLib.getDocument({ data: buffer, password }).promise;

      const blob = await renderPdfPageToBlob(pdfDoc, pageNumber, {
        format: options.format,
        dpiScale: options.dpiScale,
      });

      const ext = getExtensionFromMime(options.format);
      const filename = formatZipPageFilename(pageNumber, pages.length, ext);
      saveAs(blob, filename);
    } catch (err) {
      console.error('Download page failed:', err);
      alert('Gagal mendownload halaman.');
    }
  };

  const downloadAllZip = async () => {
    if (!pdfFile || pages.length === 0) return;
    setIsExtracting(true);

    let targetPages: number[];
    if (options.pageSelection === 'range' && options.pageRange) {
      targetPages = parsePageRange(options.pageRange, pages.length);
    } else {
      targetPages = pages.filter((p) => p.selected).map((p) => p.pageNumber);
    }

    if (targetPages.length === 0) {
      alert('Tidak ada halaman yang dipilih untuk diekstrak.');
      setIsExtracting(false);
      return;
    }

    setProgress({ current: 0, total: targetPages.length });

    try {
      const buffer = await pdfFile.arrayBuffer();
      const pdfjsLib = await getPdfJs();
      const pdfDoc = await pdfjsLib.getDocument({ data: buffer, password }).promise;

      const extractedBlobs: { pageNumber: number; blob: Blob }[] = [];

      for (let i = 0; i < targetPages.length; i++) {
        const pageNum = targetPages[i];
        setProgress({ current: i + 1, total: targetPages.length });

        const blob = await renderPdfPageToBlob(pdfDoc, pageNum, {
          format: options.format,
          dpiScale: options.dpiScale,
        });
        extractedBlobs.push({ pageNumber: pageNum, blob });
        await new Promise((r) => setTimeout(r, 0));
      }

      const zipBlob = await packagePagesToZip(
        extractedBlobs,
        pages.length,
        options.format
      );
      saveAs(zipBlob, `${pdfFile.name.replace(/\.[^/.]+$/, '')}-pages.zip`);
    } catch (err) {
      console.error('Batch export failed:', err);
      alert('Gagal mengekspor halaman ke ZIP.');
    } finally {
      setIsExtracting(false);
    }
  };

  const clearAll = () => {
    cleanupUrls();
    setPdfFile(null);
    setPages([]);
    setNeedsPassword(false);
    setPassword('');
  };

  return {
    pdfFile,
    pages,
    options,
    setOptions,
    needsPassword,
    password,
    setPassword,
    handlePasswordSubmit,
    isLoadingDoc,
    isExtracting,
    progress,
    loadPdf,
    togglePageSelection,
    selectAll,
    downloadSinglePage,
    downloadAllZip,
    clearAll,
  };
}
```

- [ ] **Step 2: Implement `PageCard.tsx`, `PdfPreviewGrid.tsx`, and `ExtractionBar.tsx`**

```tsx
// src/components/pdf-to-image/PageCard.tsx
import { Download, Check } from 'lucide-react';
import type { PdfPageItem } from '@/lib/types';

interface PageCardProps {
  item: PdfPageItem;
  onToggleSelect: (pageNumber: number) => void;
  onDownload: (pageNumber: number) => void;
}

export function PageCard({ item, onToggleSelect, onDownload }: PageCardProps) {
  return (
    <div
      className={`group relative bg-white rounded-2xl border transition-all overflow-hidden flex flex-col ${
        item.selected ? 'border-blue-500 shadow-sm' : 'border-slate-200 opacity-60'
      }`}
    >
      <div
        onClick={() => onToggleSelect(item.pageNumber)}
        className="absolute top-2 left-2 z-10 w-6 h-6 rounded-lg border flex items-center justify-center cursor-pointer transition-all bg-white"
        style={{ borderColor: item.selected ? '#2563eb' : '#cbd5e1' }}
      >
        {item.selected && <Check className="w-4 h-4 text-blue-600" />}
      </div>

      <div className="absolute top-2 right-2 z-10 bg-slate-900/70 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
        Hal. {item.pageNumber}
      </div>

      <div
        onClick={() => onToggleSelect(item.pageNumber)}
        className="h-48 bg-slate-100 p-3 flex items-center justify-center cursor-pointer overflow-hidden"
      >
        <img
          src={item.thumbnailUrl}
          alt={`Halaman ${item.pageNumber}`}
          className="max-h-full max-w-full object-contain shadow-xs"
        />
      </div>

      <div className="p-3 bg-white border-t border-slate-100 flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-700">Halaman {item.pageNumber}</span>
        <button
          type="button"
          onClick={() => onDownload(item.pageNumber)}
          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          title="Download halaman ini"
        >
          <Download className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
```

```tsx
// src/components/pdf-to-image/PdfPreviewGrid.tsx
import type { PdfPageItem } from '@/lib/types';
import { PageCard } from './PageCard';

interface PdfPreviewGridProps {
  pages: PdfPageItem[];
  onToggleSelect: (pageNumber: number) => void;
  onDownloadPage: (pageNumber: number) => void;
}

export function PdfPreviewGrid({
  pages,
  onToggleSelect,
  onDownloadPage,
}: PdfPreviewGridProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
      {pages.map((p) => (
        <PageCard
          key={p.pageNumber}
          item={p}
          onToggleSelect={onToggleSelect}
          onDownload={onDownloadPage}
        />
      ))}
    </div>
  );
}
```

```tsx
// src/components/pdf-to-image/ExtractionBar.tsx
import type { PdfToImageOptions } from '@/lib/types';

interface ExtractionBarProps {
  options: PdfToImageOptions;
  onChange: (options: PdfToImageOptions) => void;
  selectedCount: number;
  totalCount: number;
  onSelectAll: (val: boolean) => void;
}

export function ExtractionBar({
  options,
  onChange,
  selectedCount,
  totalCount,
  onSelectAll,
}: ExtractionBarProps) {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Format Output</label>
            <select
              value={options.format}
              onChange={(e) =>
                onChange({ ...options, format: e.target.value as PdfToImageOptions['format'] })
              }
              className="text-xs font-semibold bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="image/png">PNG (Lossless & Jernih)</option>
              <option value="image/jpeg">JPG (Ukuran Kompak)</option>
              <option value="image/webp">WebP (Modern Web)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Resolusi / DPI</label>
            <select
              value={options.dpiScale}
              onChange={(e) =>
                onChange({ ...options, dpiScale: parseFloat(e.target.value) })
              }
              className="text-xs font-semibold bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="1.5">Standar (~150 DPI)</option>
              <option value="2.5">Tinggi (~300 DPI Sharp)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Mode Halaman</label>
            <select
              value={options.pageSelection}
              onChange={(e) =>
                onChange({ ...options, pageSelection: e.target.value as PdfToImageOptions['pageSelection'] })
              }
              className="text-xs font-semibold bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Pilih Manual / Semua</option>
              <option value="range">Range Sintaks</option>
            </select>
          </div>
        </div>

        {options.pageSelection !== 'range' && (
          <div className="flex items-center gap-3 text-xs font-semibold">
            <span className="text-slate-500">
              {selectedCount} dari {totalCount} halaman dipilih
            </span>
            <button
              type="button"
              onClick={() => onSelectAll(selectedCount !== totalCount)}
              className="text-blue-600 hover:underline"
            >
              {selectedCount === totalCount ? 'Batal Pilih Semua' : 'Pilih Semua'}
            </button>
          </div>
        )}
      </div>

      {options.pageSelection === 'range' && (
        <div className="bg-white p-3 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center gap-2">
          <label className="text-xs font-bold text-slate-700 min-w-fit">Range Halaman:</label>
          <input
            type="text"
            placeholder="Contoh: 1-3, 5, 8-10"
            value={options.pageRange || ''}
            onChange={(e) => onChange({ ...options, pageRange: e.target.value })}
            className="flex-1 text-xs border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-[11px] text-slate-400">Total dokumen: {totalCount} hal.</span>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Implement `PdfToImageHub.tsx` with password modal**

```tsx
// src/components/pdf-to-image/PdfToImageHub.tsx
'use client';

import { usePdfToImage } from '@/hooks/usePdfToImage';
import { Dropzone } from '@/components/common/Dropzone';
import { ProgressBar } from '@/components/common/ProgressBar';
import { ExtractionBar } from './ExtractionBar';
import { PdfPreviewGrid } from './PdfPreviewGrid';
import { FileArchive, Trash2, KeyRound } from 'lucide-react';

export function PdfToImageHub() {
  const {
    pdfFile,
    pages,
    options,
    setOptions,
    needsPassword,
    password,
    setPassword,
    handlePasswordSubmit,
    isLoadingDoc,
    isExtracting,
    progress,
    loadPdf,
    togglePageSelection,
    selectAll,
    downloadSinglePage,
    downloadAllZip,
    clearAll,
  } = usePdfToImage();

  return (
    <div className="space-y-6">
      {!pdfFile ? (
        <Dropzone
          accept="application/pdf"
          multiple={false}
          title="Pilih atau Tarik File PDF ke Sini"
          subtitle="Mendukung konversi dokumen PDF multi-halaman ke file gambar PNG, JPG, atau WebP."
          onFilesSelected={(files) => {
            if (files[0]) loadPdf(files[0]);
          }}
        />
      ) : needsPassword ? (
        <div className="p-8 bg-white rounded-3xl border border-amber-200 max-w-md mx-auto text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
            <KeyRound className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">PDF Terproteksi Kata Sandi</h3>
          <p className="text-xs text-slate-500">Masukkan kata sandi untuk mendekripsi dan membaca dokumen di browser.</p>
          <input
            type="password"
            placeholder="Masukkan kata sandi..."
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex items-center gap-2 justify-end">
            <button
              type="button"
              onClick={clearAll}
              className="px-4 py-2 rounded-xl text-slate-600 text-xs font-semibold hover:bg-slate-100"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handlePasswordSubmit}
              className="px-5 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700"
            >
              Buka PDF
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200">
            <div>
              <h2 className="text-base font-bold text-slate-900">{pdfFile.name}</h2>
              <p className="text-xs text-slate-500">Total {pages.length} halaman terdeteksi.</p>
            </div>
            <button
              type="button"
              onClick={clearAll}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-red-600 hover:bg-red-50 text-xs font-semibold transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Ganti File</span>
            </button>
          </div>

          <ExtractionBar
            options={options}
            onChange={setOptions}
            selectedCount={pages.filter((p) => p.selected).length}
            totalCount={pages.length}
            onSelectAll={selectAll}
          />

          {isLoadingDoc ? (
            <div className="py-12 text-center text-slate-500 text-sm">
              Memuat dan merender pratinjau halaman PDF...
            </div>
          ) : (
            <PdfPreviewGrid
              pages={pages}
              onToggleSelect={togglePageSelection}
              onDownloadPage={downloadSinglePage}
            />
          )}

          {isExtracting && (
            <div className="p-4 bg-white rounded-2xl border border-blue-200 shadow-sm">
              <ProgressBar
                current={progress.current}
                total={progress.total}
                label="Mengekstrak halaman dan mengompres ke ZIP..."
              />
            </div>
          )}

          <div className="flex justify-end pt-4">
            <button
              type="button"
              disabled={isExtracting || (options.pageSelection === 'all' && pages.filter((p) => p.selected).length === 0)}
              onClick={downloadAllZip}
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold text-sm shadow-md shadow-blue-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <FileArchive className="w-4 h-4" />
              <span>
                {isExtracting
                  ? 'Sedang Mengompres...'
                  : options.pageSelection === 'range' && options.pageRange
                  ? `Download Range (${options.pageRange}) (.ZIP)`
                  : `Download ${pages.filter((p) => p.selected).length} Halaman (.ZIP)`}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Verify typecheck**

Run: `npx tsc --noEmit`
Expected: PASS with 0 errors.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/usePdfToImage.ts src/components/pdf-to-image/
git commit -m "feat: implement pdf-to-image hook, extraction bar with range syntax, and password modal"
```

---

## Chunk 5: Compress PDF, Application Pages & Verification

### Task 12: Compress PDF Feature Hub & Hook

**Files:**
- Create: `src/hooks/useCompressPdf.ts`
- Create: `src/components/compress-pdf/CompressionSettings.tsx`
- Create: `src/components/compress-pdf/CompressionResult.tsx`
- Create: `src/components/compress-pdf/CompressPdfHub.tsx`

- [ ] **Step 1: Implement `useCompressPdf.ts` hook with password handling**

```typescript
// src/hooks/useCompressPdf.ts
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import type { CompressPdfOptions, CompressPdfResult, CompressionPreset } from '@/lib/types';
import {
  compressPdfDocument,
  getCompressionPresetValues,
} from '@/lib/converters/compress-pdf';
import { saveAs } from 'file-saver';

export function useCompressPdf() {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [preset, setPreset] = useState<CompressionPreset>('recommended');
  const [password, setPassword] = useState('');
  const [needsPassword, setNeedsPassword] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [result, setResult] = useState<CompressPdfResult | null>(null);
  const objectUrlsRef = useRef<Set<string>>(new Set());

  const cleanupUrls = useCallback(() => {
    objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    objectUrlsRef.current.clear();
  }, []);

  useEffect(() => {
    return () => cleanupUrls();
  }, [cleanupUrls]);

  const loadPdf = (file: File) => {
    cleanupUrls();
    setPdfFile(file);
    setResult(null);
    setNeedsPassword(false);
    setPassword('');
  };

  const startCompression = async (suppliedPassword?: string) => {
    if (!pdfFile) return;
    setIsCompressing(true);
    setProgress({ current: 0, total: 0 });
    setNeedsPassword(false);

    try {
      const buffer = await pdfFile.arrayBuffer();
      const presetValues = getCompressionPresetValues(preset);
      const options: CompressPdfOptions = {
        preset,
        dpiScale: presetValues.dpiScale,
        jpegQuality: presetValues.jpegQuality,
        password: suppliedPassword || password || undefined,
      };

      const compressResult = await compressPdfDocument(
        buffer,
        options,
        (current, total) => setProgress({ current, total })
      );

      objectUrlsRef.current.add(compressResult.downloadUrl);
      setResult(compressResult);
    } catch (err: unknown) {
      const errorObj = err as { name?: string };
      if (errorObj?.name === 'PasswordException') {
        setNeedsPassword(true);
      } else {
        console.error('Compression failed:', err);
        alert('Gagal mengompresi file PDF. Pastikan file valid.');
      }
    } finally {
      setIsCompressing(false);
    }
  };

  const downloadResult = () => {
    if (!result || !pdfFile) return;
    saveAs(result.blob, `compressed-${pdfFile.name}`);
  };

  const downloadOriginal = () => {
    if (!pdfFile) return;
    saveAs(pdfFile, pdfFile.name);
  };

  const clearAll = () => {
    cleanupUrls();
    setPdfFile(null);
    setResult(null);
    setNeedsPassword(false);
    setPassword('');
  };

  return {
    pdfFile,
    preset,
    setPreset,
    password,
    setPassword,
    needsPassword,
    isCompressing,
    progress,
    result,
    loadPdf,
    startCompression,
    downloadResult,
    downloadOriginal,
    clearAll,
  };
}
```

- [ ] **Step 2: Implement `CompressionSettings.tsx` and `CompressionResult.tsx`**

```tsx
// src/components/compress-pdf/CompressionSettings.tsx
import type { CompressionPreset } from '@/lib/types';
import { Zap, Sparkles, Sliders, Info } from 'lucide-react';

interface CompressionSettingsProps {
  preset: CompressionPreset;
  onSelectPreset: (preset: CompressionPreset) => void;
}

export function CompressionSettings({ preset, onSelectPreset }: CompressionSettingsProps) {
  const options = [
    {
      id: 'extreme' as const,
      title: 'Extreme Compression',
      desc: 'Ukuran file terkecil (~96 DPI, kualitas JPEG 50%). Ideal untuk email berbatas ukuran ketat.',
      icon: Zap,
    },
    {
      id: 'recommended' as const,
      title: 'Recommended (Optimal)',
      desc: 'Keseimbangan ideal (~150 DPI, kualitas JPEG 75%). Teks tetap jernih dan ukuran terpangkas drastis.',
      icon: Sparkles,
    },
    {
      id: 'less' as const,
      title: 'Less Compression',
      desc: 'Kualitas visual tinggi (~200 DPI, kualitas JPEG 90%). Cocok untuk cetak atau dokumen banyak grafis.',
      icon: Sliders,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-800 text-xs">
        <Info className="w-4 h-4 flex-shrink-0" />
        <span>
          Kompresi merasterisasi halaman PDF menjadi gambar JPEG yang dioptimasi; ideal untuk dokumen scan dan slide presentasi.
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {options.map(({ id, title, desc, icon: Icon }) => {
          const isSelected = preset === id;
          return (
            <div
              key={id}
              onClick={() => onSelectPreset(id)}
              className={`p-5 rounded-2xl border-2 cursor-pointer transition-all ${
                isSelected
                  ? 'border-blue-600 bg-blue-50/40 shadow-sm'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <div
                  className={`p-2 rounded-xl ${
                    isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <h4 className="text-sm font-bold text-slate-900">{title}</h4>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

```tsx
// src/components/compress-pdf/CompressionResult.tsx
import { Download, AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { CompressPdfResult } from '@/lib/types';
import { formatBytes } from '@/lib/utils/file-helpers';

interface CompressionResultProps {
  result: CompressPdfResult;
  onDownloadCompressed: () => void;
  onDownloadOriginal: () => void;
}

export function CompressionResult({
  result,
  onDownloadCompressed,
  onDownloadOriginal,
}: CompressionResultProps) {
  return (
    <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-6">
      <div className="flex items-center gap-3">
        {result.isLargerThanOriginal ? (
          <div className="p-2.5 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200">
            <AlertTriangle className="w-6 h-6" />
          </div>
        ) : (
          <div className="p-2.5 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        )}
        <div>
          <h3 className="text-lg font-bold text-slate-900">
            {result.isLargerThanOriginal
              ? 'File Asli Sudah Sangat Teroptimasi'
              : 'Kompresi Berhasil!'}
          </h3>
          <p className="text-xs text-slate-500">
            {result.isLargerThanOriginal
              ? 'Dokumen ini berbasis vektor murni. Merasterisasi ke gambar akan membuat ukuran lebih besar.'
              : `Ukuran dokumen berhasil dihemat sebesar ${result.savingsPercent}%.`}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
        <div>
          <span className="block text-[11px] font-semibold text-slate-400">Ukuran Asli</span>
          <span className="text-sm font-bold text-slate-700">
            {formatBytes(result.originalSize)}
          </span>
        </div>
        <div>
          <span className="block text-[11px] font-semibold text-slate-400">Ukuran Baru</span>
          <span className="text-sm font-bold text-blue-600">
            {formatBytes(result.compressedSize)}
          </span>
        </div>
        <div className="col-span-2 sm:col-span-1">
          <span className="block text-[11px] font-semibold text-slate-400">Penghematan</span>
          <span
            className={`text-sm font-bold ${
              result.isLargerThanOriginal ? 'text-amber-600' : 'text-emerald-600'
            }`}
          >
            {result.isLargerThanOriginal ? '0% (Tetap)' : `-${result.savingsPercent}%`}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-3">
        {result.isLargerThanOriginal && (
          <button
            type="button"
            onClick={onDownloadOriginal}
            className="px-5 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all"
          >
            Gunakan File Asli Saja
          </button>
        )}
        <button
          type="button"
          onClick={onDownloadCompressed}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all"
        >
          <Download className="w-4 h-4" />
          <span>Download PDF Terkompresi</span>
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Implement `CompressPdfHub.tsx`**

```tsx
// src/components/compress-pdf/CompressPdfHub.tsx
'use client';

import { useCompressPdf } from '@/hooks/useCompressPdf';
import { Dropzone } from '@/components/common/Dropzone';
import { ProgressBar } from '@/components/common/ProgressBar';
import { CompressionSettings } from './CompressionSettings';
import { CompressionResult } from './CompressionResult';
import { Minimize2, Trash2, KeyRound } from 'lucide-react';
import { formatBytes } from '@/lib/utils/file-helpers';

export function CompressPdfHub() {
  const {
    pdfFile,
    preset,
    setPreset,
    password,
    setPassword,
    needsPassword,
    isCompressing,
    progress,
    result,
    loadPdf,
    startCompression,
    downloadResult,
    downloadOriginal,
    clearAll,
  } = useCompressPdf();

  return (
    <div className="space-y-6">
      {!pdfFile ? (
        <Dropzone
          accept="application/pdf"
          multiple={false}
          title="Pilih atau Tarik File PDF yang Ingin Dikompres"
          subtitle="Optimasi ukuran file PDF secara instan di browser Anda tanpa batas kuota."
          onFilesSelected={(files) => {
            if (files[0]) loadPdf(files[0]);
          }}
        />
      ) : needsPassword ? (
        <div className="p-8 bg-white rounded-3xl border border-amber-200 max-w-md mx-auto text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
            <KeyRound className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">PDF Terproteksi Kata Sandi</h3>
          <p className="text-xs text-slate-500">Masukkan kata sandi untuk mendekripsi dan mengompres dokumen.</p>
          <input
            type="password"
            placeholder="Masukkan kata sandi..."
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex items-center gap-2 justify-end">
            <button
              type="button"
              onClick={clearAll}
              className="px-4 py-2 rounded-xl text-slate-600 text-xs font-semibold hover:bg-slate-100"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={() => startCompression(password)}
              className="px-5 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700"
            >
              Lanjutkan Kompresi
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200">
            <div>
              <h2 className="text-base font-bold text-slate-900">{pdfFile.name}</h2>
              <p className="text-xs text-slate-500">Ukuran file awal: {formatBytes(pdfFile.size)}</p>
            </div>
            <button
              type="button"
              onClick={clearAll}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-red-600 hover:bg-red-50 text-xs font-semibold transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Ganti File</span>
            </button>
          </div>

          {!result && (
            <>
              <CompressionSettings preset={preset} onSelectPreset={setPreset} />

              {isCompressing && (
                <div className="p-4 bg-white rounded-2xl border border-blue-200 shadow-sm">
                  <ProgressBar
                    current={progress.current}
                    total={progress.total}
                    label="Mengompresi halaman PDF..."
                  />
                </div>
              )}

              <div className="flex justify-end pt-4">
                <button
                  type="button"
                  disabled={isCompressing}
                  onClick={() => startCompression()}
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold text-sm shadow-md shadow-blue-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Minimize2 className="w-4 h-4" />
                  <span>{isCompressing ? 'Sedang Mengompres...' : 'Mulai Kompresi'}</span>
                </button>
              </div>
            </>
          )}

          {result && (
            <CompressionResult
              result={result}
              onDownloadCompressed={downloadResult}
              onDownloadOriginal={downloadOriginal}
            />
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Verify typecheck**

Run: `npx tsc --noEmit`
Expected: PASS with 0 errors.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useCompressPdf.ts src/components/compress-pdf/
git commit -m "feat: implement compress-pdf hook and UI with presets, password handling, and negative-compression guard"
```

---

### Task 13: App Pages, Styling & Full Build Verification

**Files:**
- Create: `src/app/globals.css`
- Create: `src/app/layout.tsx`
- Create: `src/app/page.tsx`
- Create: `src/app/image-to-pdf/page.tsx`
- Create: `src/app/pdf-to-image/page.tsx`
- Create: `src/app/compress-pdf/page.tsx`

- [ ] **Step 1: Create `src/app/globals.css` and `src/app/layout.tsx`**

```css
/* src/app/globals.css */
@import "tailwindcss";

body {
  color: #1e293b;
  background-color: #f8fafc;
  min-height: 100vh;
}
```

```tsx
// src/app/layout.tsx
import type { Metadata } from 'next';
import './globals.css';
import { Navbar } from '@/components/common/Navbar';
import { Footer } from '@/components/common/Footer';

export const metadata: Metadata = {
  title: 'OmniPDF - Free Client-Side Image to PDF & PDF Converter',
  description:
    'Convert any image (JPG, PNG, WebP, SVG, HEIC, TIFF) to PDF, extract PDF pages to images, and compress PDFs 100% locally in your browser with zero server uploads.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Create dynamic client hubs in `src/app/page.tsx` with `next/dynamic`**

```tsx
// src/app/page.tsx
'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import type { ConversionMode } from '@/lib/types';
import { ModeSwitcher } from '@/components/common/ModeSwitcher';
import { PrivacyBadge } from '@/components/common/PrivacyBadge';

const ImageToPdfHub = dynamic(
  () => import('@/components/image-to-pdf/ImageToPdfHub').then((m) => m.ImageToPdfHub),
  { ssr: false }
);

const PdfToImageHub = dynamic(
  () => import('@/components/pdf-to-image/PdfToImageHub').then((m) => m.PdfToImageHub),
  { ssr: false }
);

const CompressPdfHub = dynamic(
  () => import('@/components/compress-pdf/CompressPdfHub').then((m) => m.CompressPdfHub),
  { ssr: false }
);

export default function HomePage() {
  const [mode, setMode] = useState<ConversionMode>('image-to-pdf');

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 md:py-12 space-y-8">
      <div className="text-center space-y-3">
        <PrivacyBadge />
        <h1 className="text-3xl md:text-5xl font-extrabold text-slate-900 tracking-tight">
          Konversi & Kompres PDF Secara Cepat, Aman & Privat
        </h1>
        <p className="text-sm md:text-base text-slate-500 max-w-xl mx-auto">
          Semua file diproses 100% di browser Anda menggunakan teknologi WebAssembly dan Canvas. Tanpa batas, tanpa antrean server.
        </p>
      </div>

      <ModeSwitcher currentMode={mode} onSelectMode={setMode} />

      <div className="pt-2">
        {mode === 'image-to-pdf' && <ImageToPdfHub />}
        {mode === 'pdf-to-image' && <PdfToImageHub />}
        {mode === 'compress-pdf' && <CompressPdfHub />}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create Client Views and dedicated SEO Server Component routes with metadata**

```tsx
// src/components/image-to-pdf/ImageToPdfClientView.tsx
'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

const ImageToPdfHub = dynamic(
  () => import('@/components/image-to-pdf/ImageToPdfHub').then((m) => m.ImageToPdfHub),
  { ssr: false }
);

export function ImageToPdfClientView() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 md:py-12 space-y-6">
      <Link href="/" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800">
        <ArrowLeft className="w-4 h-4" />
        <span>Kembali ke Beranda</span>
      </Link>
      <div className="space-y-2">
        <h1 className="text-3xl font-extrabold text-slate-900">Konversi Gambar ke PDF</h1>
        <p className="text-sm text-slate-500">Gabungkan multi-gambar ke satu dokumen PDF dengan pengaturan ukuran halaman & margin.</p>
      </div>
      <ImageToPdfHub />
    </div>
  );
}
```

```tsx
// src/components/pdf-to-image/PdfToImageClientView.tsx
'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

const PdfToImageHub = dynamic(
  () => import('@/components/pdf-to-image/PdfToImageHub').then((m) => m.PdfToImageHub),
  { ssr: false }
);

export function PdfToImageClientView() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 md:py-12 space-y-6">
      <Link href="/" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800">
        <ArrowLeft className="w-4 h-4" />
        <span>Kembali ke Beranda</span>
      </Link>
      <div className="space-y-2">
        <h1 className="text-3xl font-extrabold text-slate-900">Konversi PDF ke Gambar</h1>
        <p className="text-sm text-slate-500">Ekstrak setiap halaman PDF menjadi gambar resolusi tinggi (PNG, JPG, WebP) atau unduh dalam bentuk ZIP.</p>
      </div>
      <PdfToImageHub />
    </div>
  );
}
```

```tsx
// src/components/compress-pdf/CompressPdfClientView.tsx
'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

const CompressPdfHub = dynamic(
  () => import('@/components/compress-pdf/CompressPdfHub').then((m) => m.CompressPdfHub),
  { ssr: false }
);

export function CompressPdfClientView() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 md:py-12 space-y-6">
      <Link href="/" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800">
        <ArrowLeft className="w-4 h-4" />
        <span>Kembali ke Beranda</span>
      </Link>
      <div className="space-y-2">
        <h1 className="text-3xl font-extrabold text-slate-900">Kompres File PDF</h1>
        <p className="text-sm text-slate-500">Perkecil ukuran dokumen PDF Anda langsung di browser tanpa batas ukuran server.</p>
      </div>
      <CompressPdfHub />
    </div>
  );
}
```

```tsx
// src/app/image-to-pdf/page.tsx
import type { Metadata } from 'next';
import { ImageToPdfClientView } from '@/components/image-to-pdf/ImageToPdfClientView';

export const metadata: Metadata = {
  title: 'Konversi Gambar ke PDF Gratis - OmniPDF',
  description: 'Gabungkan file JPG, PNG, WebP, SVG, HEIC, TIFF ke PDF instan di browser Anda dengan urutan & margin kustom.',
};

export default function ImageToPdfPage() {
  return <ImageToPdfClientView />;
}
```

```tsx
// src/app/pdf-to-image/page.tsx
import type { Metadata } from 'next';
import { PdfToImageClientView } from '@/components/pdf-to-image/PdfToImageClientView';

export const metadata: Metadata = {
  title: 'Konversi PDF ke Gambar (PNG, JPG, WebP) - OmniPDF',
  description: 'Ekstrak setiap halaman PDF menjadi gambar resolusi tinggi tanpa batasan file langsung di perangkat Anda.',
};

export default function PdfToImagePage() {
  return <PdfToImageClientView />;
}
```

```tsx
// src/app/compress-pdf/page.tsx
import type { Metadata } from 'next';
import { CompressPdfClientView } from '@/components/compress-pdf/CompressPdfClientView';

export const metadata: Metadata = {
  title: 'Kompres PDF Online Cepat & Aman - OmniPDF',
  description: 'Perkecil ukuran dokumen PDF Anda 100% lokal di browser dengan proteksi kualitas visual dan privasi total.',
};

export default function CompressPdfPage() {
  return <CompressPdfClientView />;
}
```

- [ ] **Step 4: Run test and build verification**

Run:
```bash
npm test
npm run build
```
Expected: All Vitest unit tests PASS and Next.js production build exits with code 0.

- [ ] **Step 5: Commit**

```bash
git add src/components/ src/app/
git commit -m "feat: implement app layout, home hub, and dedicated server-component SEO routes with metadata and client views"
```


