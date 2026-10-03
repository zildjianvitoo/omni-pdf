import type { PdfPageItem } from '@/lib/types';
import { PageCard } from './PageCard';

interface PdfPreviewGridProps {
  pages: PdfPageItem[];
  onToggleSelect: (pageNumber: number) => void;
  onDownloadPage: (pageNumber: number) => void;
}

export function PdfPreviewGrid({
  pages,
  onToggleSelect,
  onDownloadPage,
}: PdfPreviewGridProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
      {pages.map((p) => (
        <PageCard
          key={p.pageNumber}
          item={p}
          onToggleSelect={onToggleSelect}
          onDownload={onDownloadPage}
        />
      ))}
    </div>
  );
}
