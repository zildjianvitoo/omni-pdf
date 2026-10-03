'use client';

import { useRef, useState, useEffect } from 'react';
import { UploadCloud } from 'lucide-react';

interface DropzoneProps {
  accept: string;
  multiple?: boolean;
  onFilesSelected: (files: File[]) => void;
  title: string;
  subtitle: string;
}

export function Dropzone({
  accept,
  multiple = true,
  onFilesSelected,
  title,
  subtitle,
}: DropzoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFilesSelected(Array.from(e.dataTransfer.files));
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (e.clipboardData?.files && e.clipboardData.files.length > 0) {
        onFilesSelected(Array.from(e.clipboardData.files));
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [onFilesSelected]);

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={() => fileInputRef.current?.click()}
      className={`border-2 border-dashed rounded-3xl p-8 md:p-12 text-center cursor-pointer transition-all ${
        isDragOver
          ? 'border-blue-500 bg-blue-50/50 scale-[1.01]'
          : 'border-slate-300 hover:border-slate-400 bg-white hover:bg-slate-50/50'
      }`}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            onFilesSelected(Array.from(e.target.files));
            e.target.value = '';
          }
        }}
      />
      <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4 border border-blue-100 shadow-sm">
        <UploadCloud className="w-8 h-8" />
      </div>
      <h3 className="text-base md:text-lg font-bold text-slate-800 mb-1">{title}</h3>
      <p className="text-xs md:text-sm text-slate-500 max-w-md mx-auto">{subtitle}</p>
      <div className="mt-4 inline-block text-xs font-medium text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
        Mendukung Drag & Drop atau Paste (Ctrl+V)
      </div>
    </div>
  );
}
