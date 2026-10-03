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
