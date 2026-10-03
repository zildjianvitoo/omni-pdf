import type { CompressionPreset } from '@/lib/types';
import { Zap, Sparkles, Sliders, Info } from 'lucide-react';

interface CompressionSettingsProps {
  preset: CompressionPreset;
  onSelectPreset: (preset: CompressionPreset) => void;
}

export function CompressionSettings({ preset, onSelectPreset }: CompressionSettingsProps) {
  const options = [
    {
      id: 'extreme' as const,
      title: 'Extreme Compression',
      desc: 'Ukuran file terkecil (~96 DPI, kualitas JPEG 50%). Ideal untuk email berbatas ukuran ketat.',
      icon: Zap,
    },
    {
      id: 'recommended' as const,
      title: 'Recommended (Optimal)',
      desc: 'Keseimbangan ideal (~150 DPI, kualitas JPEG 75%). Teks tetap jernih dan ukuran terpangkas drastis.',
      icon: Sparkles,
    },
    {
      id: 'less' as const,
      title: 'Less Compression',
      desc: 'Kualitas visual tinggi (~200 DPI, kualitas JPEG 90%). Cocok untuk cetak atau dokumen banyak grafis.',
      icon: Sliders,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-800 text-xs">
        <Info className="w-4 h-4 flex-shrink-0" />
        <span>
          Kompresi merasterisasi halaman PDF menjadi gambar JPEG yang dioptimasi; ideal untuk dokumen scan dan slide presentasi.
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {options.map(({ id, title, desc, icon: Icon }) => {
          const isSelected = preset === id;
          return (
            <div
              key={id}
              onClick={() => onSelectPreset(id)}
              className={`p-5 rounded-2xl border-2 cursor-pointer transition-all ${
                isSelected
                  ? 'border-blue-600 bg-blue-50/40 shadow-sm'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <div
                  className={`p-2 rounded-xl ${
                    isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <h4 className="text-sm font-bold text-slate-900">{title}</h4>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
