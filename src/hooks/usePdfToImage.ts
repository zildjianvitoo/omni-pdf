'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import type { PdfPageItem, PdfToImageOptions } from '@/lib/types';
import {
  getPdfJs,
  renderPdfPageToBlob,
  extractPagesFromPdf,
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
  const [passwordError, setPasswordError] = useState<string | null>(null);
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
    setPasswordError(null);

    let pdfDoc: any = null;

    try {
      const buffer = await file.arrayBuffer();
      const pdfjsLib = await getPdfJs();
      const loadingTask = pdfjsLib.getDocument({
        data: buffer,
        password: suppliedPassword,
      });

      pdfDoc = await loadingTask.promise;
      setNeedsPassword(false);
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
        if (suppliedPassword) {
          setPasswordError('Kata sandi salah. Silakan coba lagi.');
        }
      } else {
        console.error('Failed to load PDF:', err);
        alert('Gagal membaca dokumen PDF. Pastikan file valid.');
      }
    } finally {
      if (pdfDoc) {
        try {
          await pdfDoc.destroy();
        } catch {}
      }
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
      const pdfDoc = await pdfjsLib.getDocument({
        data: buffer,
        password: password || undefined,
      }).promise;

      try {
        const blob = await renderPdfPageToBlob(pdfDoc, pageNumber, {
          format: options.format,
          dpiScale: options.dpiScale,
        });

        const ext = getExtensionFromMime(options.format);
        const filename = formatZipPageFilename(pageNumber, pages.length, ext);
        saveAs(blob, filename);
      } finally {
        try {
          await pdfDoc.destroy();
        } catch {}
      }
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
      const extractedBlobs = await extractPagesFromPdf(
        buffer,
        {
          ...options,
          pageSelection: 'custom',
          customPages: targetPages,
          password: password || undefined,
        },
        (current, total) => setProgress({ current, total })
      );

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
    setPasswordError(null);
  };

  return {
    pdfFile,
    pages,
    options,
    setOptions,
    needsPassword,
    password,
    passwordError,
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
