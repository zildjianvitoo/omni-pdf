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
  const [passwordError, setPasswordError] = useState<string | null>(null);
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
    setPasswordError(null);
  };

  const startCompression = async (suppliedPassword?: string) => {
    if (!pdfFile) return;

    if (result?.downloadUrl) {
      URL.revokeObjectURL(result.downloadUrl);
      objectUrlsRef.current.delete(result.downloadUrl);
    }

    setIsCompressing(true);
    setProgress({ current: 0, total: 0 });
    setPasswordError(null);

    try {
      const buffer = await pdfFile.arrayBuffer();
      const presetValues = getCompressionPresetValues(preset);
      const effectivePassword = suppliedPassword || password || undefined;
      const options: CompressPdfOptions = {
        preset,
        dpiScale: presetValues.dpiScale,
        jpegQuality: presetValues.jpegQuality,
        password: effectivePassword,
      };

      const compressResult = await compressPdfDocument(
        buffer,
        options,
        (current, total) => setProgress({ current, total })
      );

      setNeedsPassword(false);
      objectUrlsRef.current.add(compressResult.downloadUrl);
      setResult(compressResult);
    } catch (err: unknown) {
      const errorObj = err as { name?: string };
      if (errorObj?.name === 'PasswordException') {
        setNeedsPassword(true);
        if (suppliedPassword || password) {
          setPasswordError('Kata sandi salah. Silakan coba lagi.');
        }
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
    setPasswordError(null);
  };

  return {
    pdfFile,
    preset,
    setPreset,
    password,
    passwordError,
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
