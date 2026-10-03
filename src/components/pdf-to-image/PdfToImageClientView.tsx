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
