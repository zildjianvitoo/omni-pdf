export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-slate-50 py-8 mt-16 text-center text-sm text-slate-500">
      <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p>© 2026 OmniPDF Converter. Semua pemrosesan berlangsung lokal di browser Anda.</p>
        <div className="flex items-center gap-4 text-slate-600">
          <span>Zero Server Uploads</span>
          <span>•</span>
          <span>Scale-to-Infinity</span>
        </div>
      </div>
    </footer>
  );
}
