import type { Metadata } from 'next';
import './globals.css';
import { Navbar } from '@/components/common/Navbar';
import { Footer } from '@/components/common/Footer';

export const metadata: Metadata = {
  title: 'OmniPDF - Free Client-Side Image to PDF & PDF Converter',
  description:
    'Convert any image (JPG, PNG, WebP, SVG, HEIC, TIFF) to PDF, extract PDF pages to images, and compress PDFs 100% locally in your browser with zero server uploads.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
