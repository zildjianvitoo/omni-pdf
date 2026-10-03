import { Download, AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { CompressPdfResult } from '@/lib/types';
import { formatBytes } from '@/lib/utils/file-helpers';

interface CompressionResultProps {
  result: CompressPdfResult;
  onDownloadCompressed: () => void;
  onDownloadOriginal: () => void;
}

export function CompressionResult({
  result,
  onDownloadCompressed,
  onDownloadOriginal,
}: CompressionResultProps) {
  return (
    <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-6">
      <div className="flex items-center gap-3">
        {result.isLargerThanOriginal ? (
          <div className="p-2.5 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200">
            <AlertTriangle className="w-6 h-6" />
          </div>
        ) : (
          <div className="p-2.5 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        )}
        <div>
          <h3 className="text-lg font-bold text-slate-900">
            {result.isLargerThanOriginal
              ? 'File Asli Sudah Sangat Teroptimasi'
              : 'Kompresi Berhasil!'}
          </h3>
          <p className="text-xs text-slate-500">
            {result.isLargerThanOriginal
              ? 'Dokumen ini berbasis vektor murni. Merasterisasi ke gambar akan membuat ukuran lebih besar.'
              : `Ukuran dokumen berhasil dihemat sebesar ${result.savingsPercent}%.`}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
        <div>
          <span className="block text-[11px] font-semibold text-slate-400">Ukuran Asli</span>
          <span className="text-sm font-bold text-slate-700">
            {formatBytes(result.originalSize)}
          </span>
        </div>
        <div>
          <span className="block text-[11px] font-semibold text-slate-400">Ukuran Baru</span>
          <span className="text-sm font-bold text-blue-600">
            {formatBytes(result.compressedSize)}
          </span>
        </div>
        <div className="col-span-2 sm:col-span-1">
          <span className="block text-[11px] font-semibold text-slate-400">Penghematan</span>
          <span
            className={`text-sm font-bold ${
              result.isLargerThanOriginal ? 'text-amber-600' : 'text-emerald-600'
            }`}
          >
            {result.isLargerThanOriginal ? '0% (Tetap)' : `-${result.savingsPercent}%`}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-3">
        {result.isLargerThanOriginal && (
          <button
            type="button"
            onClick={onDownloadOriginal}
            className="px-5 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all"
          >
            Gunakan File Asli Saja
          </button>
        )}
        <button
          type="button"
          onClick={onDownloadCompressed}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all"
        >
          <Download className="w-4 h-4" />
          <span>Download PDF Terkompresi</span>
        </button>
      </div>
    </div>
  );
}
