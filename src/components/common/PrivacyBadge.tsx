import { Lock } from 'lucide-react';

export function PrivacyBadge() {
  return (
    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-xs font-medium">
      <Lock className="w-3.5 h-3.5 text-blue-600" />
      <span>File tidak pernah diunggah ke server mana pun. Privasi 100% terjamin.</span>
    </div>
  );
}
