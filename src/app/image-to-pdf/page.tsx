import type { Metadata } from 'next';
import { ImageToPdfClientView } from '@/components/image-to-pdf/ImageToPdfClientView';

export const metadata: Metadata = {
  title: 'Konversi Gambar ke PDF Gratis - OmniPDF',
  description: 'Gabungkan file JPG, PNG, WebP, SVG, HEIC, TIFF ke PDF instan di browser Anda dengan urutan & margin kustom.',
};

export default function ImageToPdfPage() {
  return <ImageToPdfClientView />;
}
