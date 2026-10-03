'use client';

import { useImageToPdf } from '@/hooks/useImageToPdf';
import { Dropzone } from '@/components/common/Dropzone';
import { ProgressBar } from '@/components/common/ProgressBar';
import { ImageGrid } from './ImageGrid';
import { PageSettingsBar } from './PageSettingsBar';
import { Plus, Trash2, ArrowRight } from 'lucide-react';

export function ImageToPdfHub() {
  const {
    images,
    options,
    setOptions,
    isConverting,
    progress,
    addFiles,
    removeImage,
    rotateImage,
    reorderImages,
    convertToPdf,
    clearAll,
  } = useImageToPdf();

  return (
    <div className="space-y-6">
      {images.length === 0 ? (
        <Dropzone
          accept="image/*,.heic,.heif,.tiff,.tif"
          title="Pilih atau Tarik File Gambar ke Sini"
          subtitle="Mendukung JPG, PNG, WebP, SVG, GIF, BMP, HEIC iPhone, dan scanner TIFF."
          onFilesSelected={addFiles}
        />
      ) : (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200">
            <div>
              <h2 className="text-base font-bold text-slate-900">{images.length} Gambar Dipilih</h2>
              <p className="text-xs text-slate-500">Tarik kartu gambar untuk mengatur urutan halaman.</p>
            </div>
            <div className="flex items-center gap-2">
              <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors">
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Gambar</span>
                <input
                  type="file"
                  accept="image/*,.heic,.heif,.tiff,.tif"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files) addFiles(Array.from(e.target.files));
                    e.target.value = '';
                  }}
                />
              </label>
              <button
                type="button"
                onClick={clearAll}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-red-600 hover:bg-red-50 text-xs font-semibold transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus Semua</span>
              </button>
            </div>
          </div>

          <PageSettingsBar options={options} onChange={setOptions} />

          <ImageGrid
            images={images}
            onReorder={reorderImages}
            onRotate={rotateImage}
            onRemove={removeImage}
          />

          {isConverting && (
            <div className="p-4 bg-white rounded-2xl border border-blue-200 shadow-sm">
              <ProgressBar
                current={progress.current}
                total={progress.total}
                label="Menghasilkan dokumen PDF..."
              />
            </div>
          )}

          <div className="flex justify-end pt-4">
            <button
              type="button"
              disabled={isConverting}
              onClick={convertToPdf}
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold text-sm shadow-md shadow-blue-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <span>{isConverting ? 'Sedang Memproses...' : 'Konversi ke PDF'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
