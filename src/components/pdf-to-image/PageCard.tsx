import { Download, Check } from 'lucide-react';
import type { PdfPageItem } from '@/lib/types';

interface PageCardProps {
  item: PdfPageItem;
  onToggleSelect: (pageNumber: number) => void;
  onDownload: (pageNumber: number) => void;
}

export function PageCard({ item, onToggleSelect, onDownload }: PageCardProps) {
  return (
    <div
      className={`group relative bg-white rounded-2xl border transition-all overflow-hidden flex flex-col ${
        item.selected ? 'border-blue-500 shadow-sm' : 'border-slate-200 opacity-60'
      }`}
    >
      <div
        onClick={() => onToggleSelect(item.pageNumber)}
        className="absolute top-2 left-2 z-10 w-6 h-6 rounded-lg border flex items-center justify-center cursor-pointer transition-all bg-white"
        style={{ borderColor: item.selected ? '#2563eb' : '#cbd5e1' }}
      >
        {item.selected && <Check className="w-4 h-4 text-blue-600" />}
      </div>

      <div className="absolute top-2 right-2 z-10 bg-slate-900/70 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
        Hal. {item.pageNumber}
      </div>

      <div
        onClick={() => onToggleSelect(item.pageNumber)}
        className="h-48 bg-slate-100 p-3 flex items-center justify-center cursor-pointer overflow-hidden"
      >
        <img
          src={item.thumbnailUrl}
          alt={`Halaman ${item.pageNumber}`}
          className="max-h-full max-w-full object-contain shadow-xs"
        />
      </div>

      <div className="p-3 bg-white border-t border-slate-100 flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-700">Halaman {item.pageNumber}</span>
        <button
          type="button"
          onClick={() => onDownload(item.pageNumber)}
          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          title="Download halaman ini"
        >
          <Download className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
