import type { ImageToPdfOptions } from '@/lib/types';

interface PageSettingsBarProps {
  options: ImageToPdfOptions;
  onChange: (options: ImageToPdfOptions) => void;
}

export function PageSettingsBar({ options, onChange }: PageSettingsBarProps) {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
      <div>
        <label className="block text-xs font-bold text-slate-700 mb-1.5">Ukuran Kertas</label>
        <select
          value={options.pageSize}
          onChange={(e) => onChange({ ...options, pageSize: e.target.value as ImageToPdfOptions['pageSize'] })}
          className="w-full text-xs font-semibold bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="a4">A4 (Standar)</option>
          <option value="letter">US Letter</option>
          <option value="fit">Fit to Image (Asli)</option>
        </select>
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-700 mb-1.5">Orientasi</label>
        <select
          value={options.orientation}
          onChange={(e) => onChange({ ...options, orientation: e.target.value as ImageToPdfOptions['orientation'] })}
          className="w-full text-xs font-semibold bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="portrait">Portrait</option>
          <option value="landscape">Landscape</option>
          <option value="auto">Auto (Sesuai Foto)</option>
        </select>
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-700 mb-1.5">Margin</label>
        <select
          value={options.margin}
          onChange={(e) => onChange({ ...options, margin: e.target.value as ImageToPdfOptions['margin'] })}
          className="w-full text-xs font-semibold bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="none">Tanpa Margin (0)</option>
          <option value="small">Margin Kecil (10mm)</option>
          <option value="large">Margin Besar (20mm)</option>
        </select>
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-700 mb-1.5">Kualitas Gambar</label>
        <select
          value={options.quality}
          onChange={(e) => onChange({ ...options, quality: e.target.value as ImageToPdfOptions['quality'] })}
          className="w-full text-xs font-semibold bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="high">High (Original)</option>
          <option value="medium">Medium (Compressed)</option>
          <option value="low">Low (Small File)</option>
        </select>
      </div>
    </div>
  );
}
