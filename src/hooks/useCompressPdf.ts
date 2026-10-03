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
