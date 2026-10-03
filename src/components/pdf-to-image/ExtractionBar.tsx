import type { PdfToImageOptions } from '@/lib/types';

interface ExtractionBarProps {
  options: PdfToImageOptions;
  onChange: (options: PdfToImageOptions) => void;
  selectedCount: number;
  totalCount: number;
  onSelectAll: (val: boolean) => void;
}

export function ExtractionBar({
  options,
  onChange,
  selectedCount,
  totalCount,
  onSelectAll,
}: ExtractionBarProps) {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Format Output</label>
            <select
              value={options.format}
              onChange={(e) =>
                onChange({ ...options, format: e.target.value as PdfToImageOptions['format'] })
              }
              className="text-xs font-semibold bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="image/png">PNG (Lossless & Jernih)</option>
              <option value="image/jpeg">JPG (Ukuran Kompak)</option>
              <option value="image/webp">WebP (Modern Web)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Resolusi / DPI</label>
            <select
              value={options.dpiScale}
              onChange={(e) =>
                onChange({ ...options, dpiScale: parseFloat(e.target.value) })
              }
              className="text-xs font-semibold bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="1.5">Standar (~150 DPI)</option>
              <option value="2.5">Tinggi (~300 DPI Sharp)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Mode Halaman</label>
            <select
              value={options.pageSelection}
              onChange={(e) =>
                onChange({ ...options, pageSelection: e.target.value as PdfToImageOptions['pageSelection'] })
              }
              className="text-xs font-semibold bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Pilih Manual / Semua</option>
              <option value="range">Range Sintaks</option>
            </select>
          </div>
        </div>

        {options.pageSelection !== 'range' && (
          <div className="flex items-center gap-3 text-xs font-semibold">
            <span className="text-slate-500">
              {selectedCount} dari {totalCount} halaman dipilih
            </span>
            <button
              type="button"
              onClick={() => onSelectAll(selectedCount !== totalCount)}
              className="text-blue-600 hover:underline"
            >
              {selectedCount === totalCount ? 'Batal Pilih Semua' : 'Pilih Semua'}
            </button>
          </div>
        )}
      </div>

      {options.pageSelection === 'range' && (
        <div className="bg-white p-3 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center gap-2">
          <label className="text-xs font-bold text-slate-700 min-w-fit">Range Halaman:</label>
          <input
            type="text"
            placeholder="Contoh: 1-3, 5, 8-10"
            value={options.pageRange || ''}
            onChange={(e) => onChange({ ...options, pageRange: e.target.value })}
            className="flex-1 text-xs border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-[11px] text-slate-400">Total dokumen: {totalCount} hal.</span>
        </div>
      )}
    </div>
  );
}
