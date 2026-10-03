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
