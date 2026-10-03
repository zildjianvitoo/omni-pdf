import type { Metadata } from 'next';
import { PdfToImageClientView } from '@/components/pdf-to-image/PdfToImageClientView';

export const metadata: Metadata = {
  title: 'Konversi PDF ke Gambar (PNG, JPG, WebP) - OmniPDF',
  description: 'Ekstrak setiap halaman PDF menjadi gambar resolusi tinggi tanpa batasan file langsung di perangkat Anda.',
};

export default function PdfToImagePage() {
  return <PdfToImageClientView />;
}
