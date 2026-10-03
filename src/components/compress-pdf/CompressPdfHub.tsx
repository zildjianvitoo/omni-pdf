'use client';

import { useCompressPdf } from '@/hooks/useCompressPdf';
import { Dropzone } from '@/components/common/Dropzone';
import { ProgressBar } from '@/components/common/ProgressBar';
import { CompressionSettings } from './CompressionSettings';
import { CompressionResult } from './CompressionResult';
import { Minimize2, Trash2, KeyRound } from 'lucide-react';
import { formatBytes } from '@/lib/utils/file-helpers';

export function CompressPdfHub() {
  const {
    pdfFile,
    preset,
    setPreset,
    password,
    passwordError,
    setPassword,
    needsPassword,
    isCompressing,
    progress,
    result,
    loadPdf,
    startCompression,
    downloadResult,
    downloadOriginal,
    clearAll,
  } = useCompressPdf();

  return (
    <div className="space-y-6">
      {!pdfFile ? (
        <Dropzone
          accept="application/pdf"
          multiple={false}
          title="Pilih atau Tarik File PDF yang Ingin Dikompres"
          subtitle="Optimasi ukuran file PDF secara instan di browser Anda tanpa batas kuota."
          onFilesSelected={(files) => {
            if (files[0]) loadPdf(files[0]);
          }}
        />
      ) : needsPassword ? (
        <div className="p-8 bg-white rounded-3xl border border-amber-200 max-w-md mx-auto text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
            <KeyRound className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">PDF Terproteksi Kata Sandi</h3>
          <p className="text-xs text-slate-500">Masukkan kata sandi untuk mendekripsi dan mengompres dokumen.</p>
          {passwordError && (
            <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium">
              {passwordError}
            </div>
          )}
          <input
            type="password"
            placeholder="Masukkan kata sandi..."
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex items-center gap-2 justify-end">
            <button
              type="button"
              onClick={clearAll}
              className="px-4 py-2 rounded-xl text-slate-600 text-xs font-semibold hover:bg-slate-100"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={() => startCompression(password)}
              className="px-5 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700"
            >
              Lanjutkan Kompresi
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200">
            <div>
              <h2 className="text-base font-bold text-slate-900">{pdfFile.name}</h2>
              <p className="text-xs text-slate-500">Ukuran file awal: {formatBytes(pdfFile.size)}</p>
            </div>
            <button
              type="button"
              onClick={clearAll}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-red-600 hover:bg-red-50 text-xs font-semibold transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Ganti File</span>
            </button>
          </div>

          {!result && (
            <>
              <CompressionSettings preset={preset} onSelectPreset={setPreset} />

              {isCompressing && (
                <div className="p-4 bg-white rounded-2xl border border-blue-200 shadow-sm">
                  <ProgressBar
                    current={progress.current}
                    total={progress.total}
                    label="Mengompresi halaman PDF..."
                  />
                </div>
              )}

              <div className="flex justify-end pt-4">
                <button
                  type="button"
                  disabled={isCompressing}
                  onClick={() => startCompression()}
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold text-sm shadow-md shadow-blue-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Minimize2 className="w-4 h-4" />
                  <span>{isCompressing ? 'Sedang Mengompres...' : 'Mulai Kompresi'}</span>
                </button>
              </div>
            </>
          )}

          {result && (
            <CompressionResult
              result={result}
              onDownloadCompressed={downloadResult}
              onDownloadOriginal={downloadOriginal}
            />
          )}
        </div>
      )}
    </div>
  );
}
