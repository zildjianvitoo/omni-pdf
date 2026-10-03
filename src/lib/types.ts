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
