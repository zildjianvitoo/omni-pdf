import Link from 'next/link';
import { FileText, ShieldCheck } from 'lucide-react';

export function Navbar() {
  return (
    <header className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-xl text-slate-900">
          <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm">
            <FileText className="w-5 h-5" />
          </div>
          <span>OmniPDF</span>
        </Link>
        <div className="flex items-center gap-2 text-xs md:text-sm font-medium text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>100% Client-Side & Privat</span>
        </div>
      </div>
    </header>
  );
}
