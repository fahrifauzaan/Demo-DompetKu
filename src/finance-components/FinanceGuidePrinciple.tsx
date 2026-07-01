import React from 'react';

export interface PrinciplePoint {
  icon: string;
  title: string;
  text: string;
}

interface FinanceGuidePrincipleProps {
  points: PrinciplePoint[];
  /** Optional heading override. */
  heading?: string;
}

/**
 * A consistent "best practice" callout used across every guide section, framing
 * the feature with general CFP® / CFA® planning principles. Purely educational —
 * always paired with the disclaimer that this is not personalised financial advice.
 */
const FinanceGuidePrinciple: React.FC<FinanceGuidePrincipleProps> = ({ points, heading }) => {
  return (
    <div className="rounded-2xl border border-indigo-200/60 dark:border-indigo-400/20 bg-gradient-to-br from-indigo-50/80 to-blue-50/40 dark:from-indigo-950/20 dark:to-blue-950/10 p-5 sm:p-6">
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="w-9 h-9 rounded-xl bg-indigo-500/10 dark:bg-indigo-400/15 flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-indigo-600 dark:text-indigo-300" style={{ fontVariationSettings: "'FILL' 1" }}>workspace_premium</span>
        </div>
        <h4 className="font-bold text-on-surface dark:text-white text-sm sm:text-base">
          {heading || 'Prinsip Perencana Keuangan'}
        </h4>
        <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest bg-indigo-500/10 dark:bg-indigo-400/15 text-indigo-600 dark:text-indigo-300">
          CFP® · CFA®
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {points.map(p => (
          <div key={p.title} className="flex gap-3 items-start rounded-xl bg-white/70 dark:bg-white/[0.03] border border-indigo-100/70 dark:border-white/5 p-3.5">
            <span className="material-symbols-outlined text-indigo-500 dark:text-indigo-300 text-lg shrink-0">{p.icon}</span>
            <div>
              <p className="text-xs font-bold text-on-surface dark:text-white leading-tight">{p.title}</p>
              <p className="text-[11px] text-on-surface-variant dark:text-slate-400 mt-1 leading-relaxed">{p.text}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-start gap-2 mt-4 pt-3 border-t border-indigo-200/40 dark:border-white/5">
        <span className="material-symbols-outlined text-[15px] text-on-surface-variant dark:text-outline mt-px shrink-0">info</span>
        <p className="text-[10px] text-on-surface-variant dark:text-slate-500 leading-relaxed">
          Prinsip di atas bersifat <strong className="font-semibold">edukasi umum</strong> mengikuti kerangka perencanaan keuangan yang lazim (CFP®/CFA®), bukan nasihat keuangan personal. Sesuaikan dengan kondisi dan tujuan Anda sendiri.
        </p>
      </div>
    </div>
  );
};

export default FinanceGuidePrinciple;
