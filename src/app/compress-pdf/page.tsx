import type { Metadata } from 'next';
import { CompressPdfClientView } from '@/components/compress-pdf/CompressPdfClientView';

export const metadata: Metadata = {
  title: 'Kompres PDF Online Cepat & Aman - OmniPDF',
  description: 'Perkecil ukuran dokumen PDF Anda 100% lokal di browser dengan proteksi kualitas visual dan privasi total.',
};

export default function CompressPdfPage() {
  return <CompressPdfClientView />;
}
