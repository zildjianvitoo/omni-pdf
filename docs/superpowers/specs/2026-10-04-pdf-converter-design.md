# Design Specification: Scalable Client-Side PDF Converter & Utility

- **Date:** 2026-10-04
- **Status:** Approved (Ready for Implementation Planning)
- **Target Platform:** Modern Web Browsers (Desktop & Mobile)
- **Architecture:** 100% Client-Side Processing on Next.js (App Router + TypeScript)

---

## 1. Executive Summary & Goals

### 1.1 Overview
The project is a high-performance, privacy-first web utility for converting images to PDF, converting PDF pages to images, and compressing PDF files. All processing occurs entirely within the client's browser (zero server upload, zero server compute costs), ensuring infinite scalability and absolute privacy for sensitive user documents.

### 1.2 Core Goals
1. **Universal Image to PDF Conversion:** Support popular web formats (JPG, JPEG, PNG, WebP, SVG, GIF, BMP) as well as mobile/scanner formats (HEIC/HEIF, TIFF). Support reordering, page sizing, orientation, and margin adjustments.
2. **High-Fidelity PDF to Image Extraction:** Render multi-page PDFs to PNG, JPG, or WebP with configurable DPI scaling, supporting single-page and bulk `.zip` downloads.
3. **Client-Side PDF Compression:** Re-encode and optimize PDF assets directly in-browser with three compression presets and real-time before/after size comparisons.
4. **Infinite Scalability & Zero Infrastructure Cost:** Eliminate server-side file processing, file storage, and bandwidth bottlenecks by running all workloads in browser Web Workers and OffscreenCanvas.
5. **Modern, Responsive UI/UX:** Clean, intuitive UI built with Tailwind CSS, Lucide icons, drag-and-drop reordering, and clipboard paste support.

### 1.3 Non-Goals (Out of Scope for MVP)
- Server-side background queue/cloud storage accounts (all operations are ephemeral in-memory).
- Full OCR (Optical Character Recognition) text layer extraction (reserved for future iteration).
- Password cracking/bypassing of encrypted PDFs (user must supply the password if encrypted).

---

## 2. Tech Stack & Library Selection

| Layer | Technology | Rationale |
| :--- | :--- | :--- |
| **Framework** | Next.js (App Router, React 19, TypeScript) | High SEO performance (landing pages, metadata per format), modern React features, static export capability. |
| **Styling & UI** | Tailwind CSS + Lucide React | Lightweight, responsive, utility-first styling with modern iconography. |
| **Drag & Drop** | `@hello-pangea/dnd` | Accessible, performant drag-and-drop reordering for thumbnail cards. |
| **PDF Manipulation** | `pdf-lib` | Pure JavaScript PDF creation, page addition, image embedding, and stream serialization. |
| **PDF Rendering** | `pdfjs-dist` | Mozilla's standard PDF engine for page rasterization to canvas at arbitrary DPIs. |
| **Extended Decoders** | `heic2any` & `utif` | Client-side WebAssembly/JS decoders for Apple HEIC and scanner TIFF formats. |
| **Archive Packaging** | `jszip` & `file-saver` | Fast in-browser zip archiving for multi-page batch image downloads. |
| **Concurrency** | Web Worker (`converter.worker.ts`) | Offloads heavy decoding, canvas drawing, and PDF generation from the UI thread. |

---

## 3. System Architecture & Component Hierarchy

### 3.1 Project File Structure
```text
pdf-converter/
├── docs/
│   └── superpowers/specs/
│       └── 2026-10-04-pdf-converter-design.md
├── public/
│   └── pdf.worker.min.mjs           # Static worker for pdfjs-dist
├── src/
│   ├── app/
│   │   ├── layout.tsx               # Root layout, metadata, fonts
│   │   ├── page.tsx                 # Universal converter hub with mode toggle
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
│   │   │   └── converter.worker.ts  # Web Worker executing heavy rasterization & decodes
│   │   ├── converters/
│   │   │   ├── image-to-pdf.ts      # pdf-lib builder with layout logic
│   │   │   ├── pdf-to-image.ts      # pdfjs-dist page iterator & canvas rasterizer
│   │   │   ├── compress-pdf.ts      # Page re-sampling and PDF stream re-compression
│   │   │   ├── heic-decoder.ts      # Wrapper around heic2any
│   │   │   └── tiff-decoder.ts      # Wrapper around utif
│   │   ├── utils/
│   │   │   ├── file-helpers.ts      # Format sniffer, size formatter, mime validator
│   │   │   └── canvas-helpers.ts    # Alpha-channel background flattener (transparent PNG to white)
│   │   └── types.ts                 # Shared TypeScript interfaces & types
│   └── hooks/
│       ├── useImageToPdf.ts         # Image queue, reorder state, conversion runner
│       ├── usePdfToImage.ts         # PDF parsing state, page selection, batch export
│       └── useCompressPdf.ts        # Compression state, progress, and size calculations
```

---

## 4. Workflows & Conversion Pipelines

### 4.1 Pipeline A: Image to PDF
1. **Intake & Normalization:**
   - User drops files or pastes images from clipboard.
   - For standard formats (JPG, PNG, WebP, SVG, GIF, BMP), create immediate object URLs for thumbnail display.
   - For HEIC/TIFF formats, invoke decoder helper to transpile to standard JPEG/PNG blobs.
2. **Reordering & Customization:**
   - User reorders thumbnails via drag-and-drop.
   - Per-image rotations ($0^\circ, 90^\circ, 180^\circ, 270^\circ$) adjust internal transform metadata.
   - Global settings:
     - **Page Size:** A4 ($595.28 \times 841.89$ pt), US Letter ($612 \times 792$ pt), or Fit to Image.
     - **Orientation:** Portrait, Landscape, or Auto (derives orientation from individual image aspect ratio).
     - **Margins:** None ($0$), Small ($10\text{ mm} \approx 28.35\text{ pt}$), Large ($20\text{ mm} \approx 56.7\text{ pt}$).
3. **PDF Generation (`pdf-lib`):**
   - Instantiate `PDFDocument.create()`.
   - Iterate images sequentially:
     - Alpha flattening: Draw transparent PNGs onto white background canvas.
     - Embed image as JPEG or PNG into PDF document.
     - Compute scaled dimensions preserving aspect ratio within printable boundary.
     - Center image on page with margin offsets.
   - Serialize document into `Uint8Array`.
4. **Delivery:**
   - Package as a `Blob` (`application/pdf`) and trigger browser download.

### 4.2 Pipeline B: PDF to Image
1. **Intake & Document Parsing:**
   - User uploads a `.pdf` file.
   - Load document via `pdfjs-dist.getDocument({ data: arrayBuffer })`.
   - Extract metadata: page count, initial thumbnail preview of Page 1.
2. **Page Rasterization:**
   - User configures target format (`PNG`, `JPEG`, or `WebP`) and DPI scale factor ($1.5\times$ for web standard, $2.5\times$ for high-resolution print sharpness).
   - In chunks of 3–5 pages to conserve memory, render each page onto an `OffscreenCanvas`.
   - Export canvas as Blob (`canvas.convertToBlob({ type, quality })`).
3. **Packaging & Delivery:**
   - If single page: direct image download.
   - If multiple pages: add blobs to `JSZip` archive named `page-01.png`, `page-02.png`, etc., and download `.zip`.

### 4.3 Pipeline C: Compress PDF
1. **Intake:**
   - User uploads target PDF file. Record initial byte size.
2. **Preset Configuration:**
   - **Extreme Compression:** Scale $1.0\times$ (approx 72–96 DPI), JPEG quality $0.50$.
   - **Recommended Compression:** Scale $1.5\times$ (approx 150 DPI), JPEG quality $0.75$.
   - **Less Compression:** Scale $2.0\times$ (approx 200–300 DPI), JPEG quality $0.90$.
3. **Re-encoding Engine:**
   - Render pages sequentially via `pdfjs-dist`.
   - Downsample canvas images according to chosen preset.
   - Construct lean `pdf-lib` document with compressed page images.
   - Remove redundant metadata tags and compress stream objects.
4. **Result Verification:**
   - Measure new byte size.
   - Display comparison: Original Size vs New Size, percentage reduction (e.g. `12.5 MB -> 2.8 MB (Saved 77%)`).
   - Deliver optimized PDF download.

---

## 5. Memory Management & Scalability Safeguards

1. **Client-Side Scalability:** Zero compute load on backend server. Scalability scales linearly with user client devices at zero hosting cost.
2. **Object URL Lifecycle:** Every `URL.createObjectURL` is registered in a tracking set and freed via `URL.revokeObjectURL` on file deletion, queue reset, or component unmount.
3. **Sequential Chunking:** Large PDFs (e.g. 50+ pages) are processed in chunks of 3 to 5 pages. Canvases are zeroed (`canvas.width = 0; canvas.height = 0`) after each render to trigger immediate browser garbage collection.
4. **Transparent PNG Fallback:** To avoid the common bug where transparent images render black on dark or PDF outputs, canvases are pre-filled with `#FFFFFF` solid fill before draw operations.

---

## 6. Error Handling & Edge Cases

| Scenario | Handling Strategy |
| :--- | :--- |
| **Corrupted Image/PDF File** | Header magic byte check + try/catch on decode. Marked with red badge on the specific card with friendly error message; remaining queue continues unhindered. |
| **Password-Protected PDF** | Detect `PasswordException` from `pdfjs-dist`. Show password input modal to allow user to decrypt in-memory. |
| **Unsupported Exotic Formats** | Clear error toast indicating supported formats with suggestions for conversion. |
| **Out-of-Memory Risk on Low-End Mobile** | Automatically fall back to scale factor $1.0\times$ if viewport or memory warning is detected, processing 1 page at a time. |

---

## 7. Testing Strategy

1. **Unit Tests (Vitest):**
   - Page dimension and aspect ratio math for A4, Letter, and Fit-to-image with varying margins.
   - Format sniffer utility validating MIME types and extensions.
   - Size reduction percentage and unit format calculations.
2. **Integration Tests (Component & Pipeline):**
   - `ImageToPdf`: Mock multi-image upload -> verify generated PDF blob has matching page count.
   - `PdfToImage`: Upload sample vector PDF -> verify canvas rendering and ZIP creation with expected file names.
   - `CompressPdf`: Verify output byte array is smaller than input for image-heavy PDFs.
3. **Cross-Browser Verification:**
   - Chrome, Firefox, Safari (desktop & iOS), Edge. Verify HEIC support on Safari and via WASM fallback on Chrome/Firefox.

---

## 8. Git Commit & Repository Structure
- Branch: `main`
- Initial commit of design doc at `docs/superpowers/specs/2026-10-04-pdf-converter-design.md`.
