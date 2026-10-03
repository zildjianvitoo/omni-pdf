'use client';

import { usePdfToImage } from '@/hooks/usePdfToImage';
import { Dropzone } from '@/components/common/Dropzone';
import { ProgressBar } from '@/components/common/ProgressBar';
import { ExtractionBar } from './ExtractionBar';
import { PdfPreviewGrid } from './PdfPreviewGrid';
import { FileArchive, Trash2, KeyRound } from 'lucide-react';

export function PdfToImageHub() {
  const {
    pdfFile,
    pages,
    options,
    setOptions,
    needsPassword,
    password,
    passwordError,
    setPassword,
    handlePasswordSubmit,
    isLoadingDoc,
    isExtracting,
    progress,
    loadPdf,
    togglePageSelection,
    selectAll,
    downloadSinglePage,
    downloadAllZip,
    clearAll,
  } = usePdfToImage();

  return (
    <div className="space-y-6">
      {!pdfFile ? (
        <Dropzone
          accept="application/pdf"
          multiple={false}
          title="Pilih atau Tarik File PDF ke Sini"
          subtitle="Mendukung konversi dokumen PDF multi-halaman ke file gambar PNG, JPG, atau WebP."
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
          <p className="text-xs text-slate-500">Masukkan kata sandi untuk mendekripsi dan membaca dokumen di browser.</p>
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
              onClick={handlePasswordSubmit}
              className="px-5 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700"
            >
              Buka PDF
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200">
            <div>
              <h2 className="text-base font-bold text-slate-900">{pdfFile.name}</h2>
              <p className="text-xs text-slate-500">Total {pages.length} halaman terdeteksi.</p>
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

          <ExtractionBar
            options={options}
            onChange={setOptions}
            selectedCount={pages.filter((p) => p.selected).length}
            totalCount={pages.length}
            onSelectAll={selectAll}
          />

          {isLoadingDoc ? (
            <div className="py-12 text-center text-slate-500 text-sm">
              Memuat dan merender pratinjau halaman PDF...
            </div>
          ) : (
            <PdfPreviewGrid
              pages={pages}
              onToggleSelect={togglePageSelection}
              onDownloadPage={downloadSinglePage}
            />
          )}

          {isExtracting && (
            <div className="p-4 bg-white rounded-2xl border border-blue-200 shadow-sm">
              <ProgressBar
                current={progress.current}
                total={progress.total}
                label="Mengekstrak halaman dan mengompres ke ZIP..."
              />
            </div>
          )}

          <div className="flex justify-end pt-4">
            <button
              type="button"
              disabled={isExtracting || (options.pageSelection === 'all' && pages.filter((p) => p.selected).length === 0)}
              onClick={downloadAllZip}
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold text-sm shadow-md shadow-blue-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <FileArchive className="w-4 h-4" />
              <span>
                {isExtracting
                  ? 'Sedang Mengompres...'
                  : options.pageSelection === 'range' && options.pageRange
                  ? `Download Range (${options.pageRange}) (.ZIP)`
                  : `Download ${pages.filter((p) => p.selected).length} Halaman (.ZIP)`}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
