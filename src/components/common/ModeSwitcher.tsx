'use client';

import { Image, FileOutput, Minimize2 } from 'lucide-react';
import type { ConversionMode } from '@/lib/types';

interface ModeSwitcherProps {
  currentMode: ConversionMode;
  onSelectMode: (mode: ConversionMode) => void;
}

export function ModeSwitcher({ currentMode, onSelectMode }: ModeSwitcherProps) {
  const modes = [
    { id: 'image-to-pdf' as const, label: 'Gambar ke PDF', icon: Image },
    { id: 'pdf-to-image' as const, label: 'PDF ke Gambar', icon: FileOutput },
    { id: 'compress-pdf' as const, label: 'Kompres PDF', icon: Minimize2 },
  ];

  return (
    <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200 max-w-lg mx-auto">
      {modes.map(({ id, label, icon: Icon }) => {
        const isActive = currentMode === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onSelectMode(id)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs md:text-sm font-semibold transition-all ${
              isActive
                ? 'bg-white text-blue-600 shadow-sm border border-slate-200/60'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Icon className="w-4 h-4" />
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}
