import { RotateCw, Trash2, GripVertical, AlertCircle } from 'lucide-react';
import type { ImageFileItem } from '@/lib/types';
import { formatBytes } from '@/lib/utils/file-helpers';
import type { DraggableProvidedDragHandleProps } from '@hello-pangea/dnd';

interface ImageCardProps {
  item: ImageFileItem;
  index: number;
  onRotate: (id: string) => void;
  onRemove: (id: string) => void;
  dragHandleProps?: DraggableProvidedDragHandleProps | null;
}

export function ImageCard({
  item,
  index,
  onRotate,
  onRemove,
  dragHandleProps,
}: ImageCardProps) {
  const isError = item.status === 'error';

  return (
    <div
      className={`group relative bg-white rounded-2xl border overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col ${
        isError ? 'border-red-400 bg-red-50/20' : 'border-slate-200'
      }`}
    >
      <div className="absolute top-2 left-2 z-10 bg-slate-900/70 backdrop-blur-sm text-white text-[11px] font-bold px-2 py-0.5 rounded-full">
        #{index + 1}
      </div>

      {!isError && (
        <div
          {...dragHandleProps}
          className="absolute top-2 right-2 z-10 bg-white/90 backdrop-blur-sm text-slate-700 p-1.5 rounded-lg shadow-sm cursor-grab active:cursor-grabbing hover:bg-white"
          title="Geser untuk mengubah urutan"
        >
          <GripVertical className="w-4 h-4" />
        </div>
      )}

      <div className="h-44 bg-slate-100 flex items-center justify-center p-3 overflow-hidden">
        {isError ? (
          <div className="text-center p-4 text-red-500 space-y-1">
            <AlertCircle className="w-8 h-8 mx-auto" />
            <p className="text-xs font-semibold">{item.error || 'Gagal memuat'}</p>
          </div>
        ) : (
          <img
            src={item.previewUrl}
            alt={item.name}
            className="max-h-full max-w-full object-contain transition-transform duration-200"
            style={{ transform: `rotate(${item.rotation}deg)` }}
          />
        )}
      </div>

      <div className="p-3 bg-white flex items-center justify-between border-t border-slate-100">
        <div className="min-w-0 pr-2">
          <p className="text-xs font-semibold text-slate-800 truncate">{item.name}</p>
          <p className="text-[10px] text-slate-400">{formatBytes(item.size)}</p>
        </div>
        <div className="flex items-center gap-1">
          {!isError && (
            <button
              type="button"
              onClick={() => onRotate(item.id)}
              className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Putar 90°"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={() => onRemove(item.id)}
            className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Hapus gambar"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
