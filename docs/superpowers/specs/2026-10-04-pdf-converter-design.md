# Design Specification: Scalable Client-Side PDF Converter & Utility

- **Date:** 2026-10-04
- **Status:** Approved (Revised after Architecture Review)
- **Target Platform:** Modern Web Browsers (Desktop & Mobile)
- **Architecture:** 100% Client-Side Processing on Next.js (App Router + TypeScript)

---

## 1. Executive Summary & Goals

### 1.1 Overview
The project is a high-performance, privacy-first web utility for converting images to PDF, converting PDF pages to images, and compressing PDF files. All processing occurs entirely within the client's browser (zero server upload, zero server compute costs), ensuring infinite scalability and absolute privacy for sensitive user documents.

### 1.2 Core Goals
1. **Universal Image to PDF Conversion:** Support popular web formats (JPG, JPEG, PNG, WebP, SVG, GIF, BMP) as well as mobile/scanner formats (HEIC/HEIF, TIFF). Support reordering, page sizing, orientation, and margin adjustments.
2. **High-Fidelity PDF to Image Extraction:** Render multi-page PDFs to PNG, JPG, or WebP with configurable DPI scaling, supporting single-page and bulk `.zip` downloads with individual page selection and range parsing.
3. **Client-Side PDF Compression:** Re-encode and optimize PDF assets directly in-browser with three compression presets, negative-compression safeguards, and real-time before/after size comparisons.
4. **Infinite Scalability & Zero Infrastructure Cost:** Eliminate server-side file processing, file storage, and bandwidth bottlenecks by running all workloads in browser threads, Web Workers, and Canvas pipelines.
5. **Modern, Responsive UI/UX:** Clean, intuitive UI built with Tailwind CSS, Lucide icons, drag-and-drop reordering, and clipboard paste support.

### 1.3 Non-Goals (Out of Scope for MVP)
- Server-side background queues or cloud storage databases (all operations are ephemeral in-memory).
- Full OCR (Optical Character Recognition) text layer extraction.
- Password cracking/bypassing of encrypted PDFs (user must supply the correct password if encrypted).

---

## 2. Tech Stack & Library Selection

| Layer | Technology | Rationale |
| :--- | :--- | :--- |
| **Framework** | Next.js (App Router, React 19, TypeScript) | High SEO performance (landing pages, metadata per format), modern React features, static export capability. |
| **Styling & UI** | Tailwind CSS + Lucide React | Lightweight, responsive, utility-first styling with modern iconography. |
| **Drag & Drop** | `@hello-pangea/dnd` | Accessible, performant drag-and-drop reordering for thumbnail cards. |
| **PDF Manipulation** | `pdf-lib` | Pure JavaScript PDF creation, page addition, image embedding (`embedJpg`, `embedPng`), and stream serialization. |
| **PDF Rendering** | `pdfjs-dist` | Mozilla's standard PDF engine for page rasterization to canvas at arbitrary DPIs. |
| **Extended Decoders** | `heic2any` & `utif` | Client-side WebAssembly/JS decoders for Apple HEIC and scanner TIFF formats. |
| **Archive Packaging** | `jszip` & `file-saver` | Fast in-browser zip archiving for multi-page batch image downloads. |
| **Concurrency & Workers** | Dedicated `pdf.worker.min.mjs` + Utility Worker | `pdfjs-dist` leverages its dedicated worker for document parsing; image decoding/ZIP packaging run cooperatively without nested worker deadlocks. |

---

## 3. Data Models & TypeScript Contracts

To ensure rigid boundaries between the UI layer, custom hooks, and conversion engines, the following shared types are defined in `src/lib/types.ts`:

### 3.1 Common & File Types
```typescript
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
```

### 3.2 Configuration Options
```typescript
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
}

export type CompressionPreset = 'extreme' | 'recommended' | 'less';

export interface CompressPdfOptions {
  preset: CompressionPreset;
  dpiScale: number; // 1.0x (96 DPI), 1.5x (150 DPI), 2.0x (200 DPI)
  jpegQuality: number; // 0.50, 0.75, 0.90
}

export interface CompressPdfResult {
  originalSize: number;
  compressedSize: number;
  savingsPercent: number;
  isLargerThanOriginal: boolean;
  blob: Blob;
  downloadUrl: string;
}
```

### 3.3 Worker Communication Contract
For formats decoded in Web Workers (e.g. HEIC, TIFF parsing):
```typescript
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

---

## 4. System Architecture & Component Hierarchy

### 4.1 Next.js SSR / Client Boundary Strategy
Because libraries such as `pdfjs-dist`, `heic2any`, `utif`, `@hello-pangea/dnd`, and canvas APIs access `window`, `document`, and DOM APIs, executing them on the server causes `ReferenceError: window is not defined`.
- **Rule:** Every component interacting with files, canvas, or drag-and-drop must include `'use client'`.
- **Dynamic Imports:** The main workspace components (`ImageToPdfHub`, `PdfToImageHub`, `CompressPdfHub`, `Dropzone`) are loaded via `next/dynamic` with `{ ssr: false }` to guarantee complete immunity against server pre-rendering mismatches.
- **Worker Script Distribution:** `pdf.worker.min.mjs` is statically hosted in `/public/pdf.worker.min.mjs` and configured via `pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'`.

### 4.2 Project File Structure
```text
pdf-converter/
├── docs/
│   └── superpowers/specs/
│       └── 2026-10-04-pdf-converter-design.md
├── public/
│   └── pdf.worker.min.mjs           # Static worker file for pdfjs-dist
├── src/
│   ├── app/
│   │   ├── layout.tsx               # Root layout, metadata, fonts
│   │   ├── page.tsx                 # Universal converter hub with ModeSwitcher
│   │   ├── image-to-pdf/page.tsx    # Dedicated SEO route for Image to PDF
│   │   ├── pdf-to-image/page.tsx    # Dedicated SEO route for PDF to Image
│   │   └── compress-pdf/page.tsx    # Dedicated SEO route for Compress PDF
│   ├── components/
│   │   ├── common/
│   │   │   ├── Navbar.tsx           # App header & branding
│   │   │   ├── Footer.tsx           # Footer with links & privacy assurance
│   │   │   ├── Dropzone.tsx         # Unified drag-and-drop / clipboard zone
│   │   │   ├── ModeSwitcher.tsx     # Tab switch (Image-to-PDF / PDF-to-Image / Compress)
│   │   │   ├── ProgressBar.tsx      # Multi-stage conversion progress indicator
│   │   │   └── PrivacyBadge.tsx     # 100% Client-side privacy highlight banner
│   │   ├── image-to-pdf/
│   │   │   ├── ImageCard.tsx        # Draggable card with thumbnail, rotate, delete
│   │   │   ├── ImageGrid.tsx        # Drag-and-drop container for uploaded images
│   │   │   └── PageSettingsBar.tsx  # Page size, orientation, margin, quality options
│   │   ├── pdf-to-image/
│   │   │   ├── PdfPreviewGrid.tsx   # Grid of rendered page preview cards
│   │   │   ├── PageCard.tsx         # Individual page card with single download action
│   │   │   └── ExtractionBar.tsx    # Format picker (PNG/JPG/WebP), DPI toggle, ZIP download
│   │   └── compress-pdf/
│   │       ├── CompressionSettings.tsx # Preset selectors (Extreme, Recommended, Less)
│   │       └── CompressionResult.tsx   # Before/after size comparison card & download
│   ├── lib/
│   │   ├── workers/
│   │   │   └── converter.worker.ts  # Web Worker for HEIC/TIFF/ZIP processing
│   │   ├── converters/
│   │   │   ├── image-to-pdf.ts      # pdf-lib builder with layout logic
│   │   │   ├── pdf-to-image.ts      # pdfjs-dist page iterator & canvas rasterizer
│   │   │   ├── compress-pdf.ts      # Page re-sampling and PDF stream re-compression
│   │   │   ├── heic-decoder.ts      # Wrapper around heic2any
│   │   │   └── tiff-decoder.ts      # Wrapper around utif
│   │   ├── utils/
│   │   │   ├── file-helpers.ts      # Format sniffer, size formatter, mime validator, range parser
│   │   │   └── canvas-helpers.ts    # Alpha-channel background flattener & canvas converter
│   │   └── types.ts                 # Shared TypeScript interfaces & types
│   └── hooks/
│       ├── useImageToPdf.ts         # Image queue, reorder state, conversion runner
│       ├── usePdfToImage.ts         # PDF parsing state, page selection, batch export
│       └── useCompressPdf.ts        # Compression state, progress, and size calculations
```

---

## 5. Workflows & Detailed Conversion Pipelines

### 5.1 Pipeline A: Image to PDF
1. **Intake & Normalization:**
   - User drops files, selects via file picker, or pastes from clipboard (`Ctrl+V`).
   - Format detection by file extension and MIME type.
   - **Extended decoders:**
     - `HEIC/HEIF`: Processed via `heic2any` converting to standard JPEG blob.
     - `TIFF`: Processed via `utif` decoding raw pixel buffers to standard RGBA canvas blob.
   - For all formats, create an initial preview blob URL.
2. **Intermediate Canvas Conversion for Non-JPEG/PNG Formats:**
   - Note: `pdf-lib` exclusively supports embedding JPEG (`embedJpg`) and PNG (`embedPng`).
   - For SVG, WebP, BMP, and GIF (first frame): The image is drawn onto an intermediate `<canvas>`.
   - **Transparency flattening:** To prevent transparent PNG/WebP/SVG backgrounds turning solid black upon JPEG conversion or in dark PDF viewports, the canvas context fills `#FFFFFF` across the rect before `drawImage()`.
   - The canvas exports via `canvas.toBlob('image/png')` or `canvas.toBlob('image/jpeg', quality)`.
3. **Reordering & Page Settings:**
   - User reorders cards using `@hello-pangea/dnd`.
   - Per-card rotations ($0^\circ, 90^\circ, 180^\circ, 270^\circ$) transform internal image rendering.
   - Global settings:
     - **Page Size:** A4 ($595.28 \times 841.89$ pt), US Letter ($612 \times 792$ pt), or Fit to Image.
     - **Orientation:** Portrait, Landscape, or Auto (derives orientation from individual image aspect ratio).
     - **Margins:** None ($0$), Small ($28.35$ pt / $10$ mm), Large ($56.7$ pt / $20$ mm).
     - **Quality:** High ($1.0$), Balanced ($0.8$), Compressed ($0.6$).
4. **PDF Generation (`pdf-lib`):**
   - Instantiate `PDFDocument.create()`.
   - For each image, embed into PDF via `doc.embedJpg(bytes)` or `doc.embedPng(bytes)`.
   - Compute printable area: $\text{printWidth} = \text{pageWidth} - 2 \times \text{margin}$, $\text{printHeight} = \text{pageHeight} - 2 \times \text{margin}$.
   - Maintain aspect ratio:
     $$\text{scale} = \min\left(\frac{\text{printWidth}}{\text{imgWidth}}, \frac{\text{printHeight}}{\text{imgHeight}}\right)$$
   - Center image on page:
     $$x = \text{margin} + \frac{\text{printWidth} - \text{imgWidth} \times \text{scale}}{2}, \quad y = \text{margin} + \frac{\text{printHeight} - \text{imgHeight} \times \text{scale}}{2}$$
   - Save document: `const pdfBytes = await doc.save()`.
   - Package as `Blob('application/pdf')` and trigger automatic download.

### 5.2 Pipeline B: PDF to Image
1. **Intake & Document Parsing:**
   - Load PDF via `pdfjsLib.getDocument({ data: arrayBuffer })`.
   - Dedicated worker `pdf.worker.min.mjs` handles internal parsing.
   - Avoid nested worker conflicts: rasterization loop coordinates directly on the main thread using chunked `requestAnimationFrame` yielding to maintain UI responsiveness.
2. **Page Range & Selection Logic:**
   - Support three selection modes:
     - **All Pages:** Extracts $1$ to $N$.
     - **Range Syntax:** Parse user text (e.g. `"1-3, 5, 8-10"`) with boundary checks.
     - **Interactive Grid:** Individual checkboxes per rendered page thumbnail.
3. **Page Rasterization:**
   - Selected format: `image/png`, `image/jpeg`, or `image/webp`.
   - DPI scale: $1.5\times$ (~150 DPI) or $2.5\times$ (~300 DPI).
   - In sequential chunks of 3–5 pages:
     - Retrieve page: `const page = await pdfDoc.getPage(pageNumber)`.
     - Get viewport: `const viewport = page.getViewport({ scale: dpiScale })`.
     - Create temporary canvas with width `viewport.width` and height `viewport.height`.
     - Render: `await page.render({ canvasContext, viewport }).promise`.
     - Export blob using `canvas.toBlob()`.
     - Immediately clear canvas dimensions (`canvas.width = 0; canvas.height = 0`) to free memory.
4. **Export & Download:**
   - Single page: Direct download `page-{num}.{ext}`.
   - Multiple pages: Bundle into `JSZip`. File names formatted with dynamic zero padding matching total page digits (e.g. `page-001.png` for a 150-page document via `String(num).padStart(digits, '0')`).
   - Trigger ZIP download via `saveAs(zipBlob, 'converted-pages.zip')`.

### 5.3 Pipeline C: Compress PDF
1. **Intake & Baseline:**
   - User uploads target PDF. Record exact byte length `originalSize`.
2. **Preset Configuration:**
   - **Extreme Compression:** Scale $1.0\times$ (approx 96 DPI), JPEG quality $0.50$.
   - **Recommended Compression:** Scale $1.5\times$ (approx 150 DPI), JPEG quality $0.75$.
   - **Less Compression:** Scale $2.0\times$ (approx 200 DPI), JPEG quality $0.90$.
3. **Re-encoding Engine:**
   - Notice & Warning: Display notice: *"Compressing rasterizes pages to optimized JPEG streams; best for scanned documents and slide decks."*
   - Sequentially iterate pages via `pdfjs-dist`.
   - Render page to canvas at preset DPI scale.
   - Export canvas as JPEG blob at preset quality.
   - Create lean `pdf-lib` document: embed JPEG stream per page matching original aspect ratio.
   - Strip unneeded metadata, XML packets, and structural tree overhead.
   - Generate compressed PDF bytes: `const compressedBytes = await newDoc.save()`.
4. **Negative Compression Safeguard:**
   - Compare `compressedBytes.length` against `originalSize`.
   - If `compressedBytes.length >= originalSize`:
     - System flags `isLargerThanOriginal = true`.
     - UI presents warning badge: *"Dokumen ini sudah sangat teroptimasi dalam bentuk vektor/teks. Mengompresi lebih lanjut akan membuat ukuran file lebih besar."*
     - User is offered to download the original file or keep the re-encoded version.
   - Otherwise, display success metric: *"Original: 12.4 MB -> Compressed: 3.1 MB (Hemat 75%)"*.

---

## 6. Memory Management & Scalability Safeguards

1. **Scale-to-Infinity Architecture:** 100% of CPU and RAM utilization occurs on client hardware. The hosting server serves static assets only, keeping infrastructure costs constant ($0/month on static tiers).
2. **Object URL Registration & Revocation:** Every created URL via `URL.createObjectURL` is registered in a centralized hook ref tracking set. Upon file removal, tab switch, or component unmount, `URL.revokeObjectURL(url)` is invoked immediately.
3. **Sequential Chunking & Canvas Reuse:** Batch processes never allocate all page canvases simultaneously. A single or small pool of reusable canvas elements processes pages in sequential chunks, explicitly zeroing buffer dimensions after export to trigger browser GC.
4. **Canvas API Fallbacks:** Primary export uses `canvas.toBlob()`, ensuring universal compatibility across mobile WebKit (Safari), Chrome, and Firefox without relying on unstable `OffscreenCanvas.convertToBlob()` implementations.

---

## 7. Error Handling & Edge Cases

| Scenario | Handling Strategy |
| :--- | :--- |
| **Corrupted File or Invalid Magic Bytes** | Header sniff test + try/catch on file load. Displays inline error badge on the specific card; remaining queue continues unhindered (*partial failure resilience*). |
| **Password-Protected PDF** | Catch `PasswordException` from `pdfjs-dist`. Render modal requesting password with instant retry in-memory. |
| **Transparent PNG / Alpha Channels** | Canvas context explicitly executes `ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, width, height)` before rendering image content, eliminating black background artifacts. |
| **Out-of-Range Page Syntax** | Range parser validates tokens against `1 <= page <= totalPages`. Clear visual helper highlights invalid tokens (e.g. "Halaman 99 melebihi total 12 halaman"). |
| **High Page Count Memory Cap** | Documents with $>50$ pages automatically throttle concurrency to 1 page at a time with a prominent progress indicator. |

---

## 8. Testing Strategy

1. **Unit Tests (Vitest):**
   - Page dimension and aspect ratio math for A4, Letter, and Fit-to-image with zero, small, and large margins.
   - Syntax parser for page ranges (e.g. `"1-3, 5, 8"` -> `[1, 2, 3, 5, 8]`).
   - Format sniffer utility validating MIME types and extensions.
   - Size reduction percentage and negative compression detection logic.
2. **Integration Tests (Components & Pipelines):**
   - `ImageToPdf`: Mock multi-image upload -> verify generated PDF blob has matching page count and layout coordinates.
   - `PdfToImage`: Upload sample vector PDF -> verify canvas rendering, page item array, and ZIP creation with dynamic zero-padding.
   - `CompressPdf`: Test re-encoding with high-res sample vs text-only sample to verify negative compression detection.
3. **Cross-Browser Verification:**
   - Chrome, Safari (Desktop & iOS), Firefox, Edge. Verify HEIC transpile on Safari and via WASM fallback on non-Apple browsers.

---

## 9. Git Commit & Repository Structure
- Branch: `main`
- Updated design doc committed at `docs/superpowers/specs/2026-10-04-pdf-converter-design.md`.
