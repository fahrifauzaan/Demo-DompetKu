import React, { useMemo } from 'react';
import { useFinanceStore } from '../store/useFinanceStore';
import { buildMonthlySummary } from './monthlySummaryUtils';

/** Fase 7 — Rangkuman Bulanan Naratif ("bulan ini dalam bahasa manusia"). */
const MonthlySummaryCard: React.FC = () => {
  const transactions = useFinanceStore((s) => s.transactions);
  const accounts = useFinanceStore((s) => s.accounts);
  const monthlyBudgets = useFinanceStore((s) => s.monthlyBudgets);
  const budgetCategories = useFinanceStore((s) => s.budgetCategories);
  const settings = useFinanceStore((s) => s.settings);

  const s = useMemo(
    () => buildMonthlySummary(transactions, accounts, monthlyBudgets, budgetCategories, settings),
    [transactions, accounts, monthlyBudgets, budgetCategories, settings],
  );

  if (!s.hasData) return null;

  return (
    <div className={`rounded-2xl sm:rounded-[28px] border p-4 sm:p-6 lg:p-7 shadow-sm relative overflow-hidden ${s.positive ? 'bg-gradient-to-br from-emerald-500/10 to-transparent border-emerald-500/20' : 'bg-gradient-to-br from-amber-500/10 to-transparent border-amber-500/20'}`}>
      <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none"><span className="material-symbols-outlined text-8xl">auto_awesome</span></div>
      <div className="relative">
        <div className="flex items-center gap-2 mb-1">
          <span className="material-symbols-outlined text-primary dark:text-[#a7c8ff]">auto_awesome</span>
          <span className="text-[11px] font-black uppercase tracking-wider text-on-surface-variant dark:text-slate-400">Rangkuman {s.monthLabel}</span>
        </div>
        <h3 className={`text-xl sm:text-2xl font-black font-headline mb-3 ${s.positive ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'}`}>{s.headline}</h3>
        <ul className="space-y-2">
          {s.lines.map((l, i) => (
            <li key={i} className="flex gap-2.5 text-[13px] text-on-surface dark:text-slate-200 leading-relaxed">
              <span className="material-symbols-outlined text-[19px] text-primary dark:text-[#a7c8ff] shrink-0">{l.icon}</span>{l.text}
            </li>
          ))}
        </ul>
        <p className="text-[10px] text-on-surface-variant/60 dark:text-slate-500 mt-3">Ringkasan otomatis dari bulan lengkap terakhir Anda. Bukan nasihat keuangan personal.</p>
      </div>
    </div>
  );
};

export default MonthlySummaryCard;
