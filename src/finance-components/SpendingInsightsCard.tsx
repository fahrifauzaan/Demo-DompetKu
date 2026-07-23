import React, { useMemo } from 'react';
import { useFinanceStore } from '../store/useFinanceStore';
import { categoryTrends, detectAnomalies, budgetPace, buildInsights, type Sev } from './insightsUtils';

const SEV: Record<Sev, { ring: string; bg: string; ic: string }> = {
  peringatan: { ring: 'border-amber-500/25', bg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400', ic: 'text-amber-600 dark:text-amber-400' },
  positif: { ring: 'border-emerald-500/25', bg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400', ic: 'text-emerald-600 dark:text-emerald-400' },
  info: { ring: 'border-primary/20 dark:border-[#a7c8ff]/20', bg: 'bg-primary/10 dark:bg-[#a7c8ff]/15 text-primary dark:text-[#a7c8ff]', ic: 'text-primary dark:text-[#a7c8ff]' },
};

const SpendingInsightsCard: React.FC = () => {
  const transactions = useFinanceStore((s) => s.transactions);
  const monthlyBudgets = useFinanceStore((s) => s.monthlyBudgets);
  const budgetCategories = useFinanceStore((s) => s.budgetCategories);
  const settings = useFinanceStore((s) => s.settings);

  const getNum = (key: string, def: number) => {
    const v = settings.find((s) => s.key === key)?.value;
    const n = Number(v);
    return v != null && v !== '' && !isNaN(n) ? n : def;
  };

  const insights = useMemo(() => {
    const z = getNum('insight_anomaly_z', 2);
    const trendPct = getNum('insight_trend_pct', 25);
    const maxN = getNum('insight_max', 5);
    const trends = categoryTrends(transactions, 3);
    const anomalies = detectAnomalies(transactions, z);
    const pace = budgetPace(transactions, monthlyBudgets, budgetCategories);
    return buildInsights(trends, anomalies, pace, { maxN, trendPct });
  }, [transactions, monthlyBudgets, budgetCategories, settings]);

  return (
    <div className="liquid-glass rounded-2xl sm:rounded-[28px] border border-white/20 dark:border-white/10 p-4 sm:p-6 lg:p-7 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)]">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-11 h-11 rounded-2xl bg-primary/10 dark:bg-[#a7c8ff]/15 flex items-center justify-center text-primary dark:text-[#a7c8ff]">
          <span className="material-symbols-outlined">lightbulb</span>
        </div>
        <div>
          <h3 className="text-lg font-black font-headline text-on-surface dark:text-white leading-none">Wawasan</h3>
          <p className="text-[11px] text-on-surface-variant dark:text-slate-400 mt-1">Perubahan &amp; anomali pengeluaran otomatis</p>
        </div>
      </div>

      {insights.length === 0 ? (
        <div className="rounded-xl bg-emerald-500/5 border border-emerald-500/20 p-4 flex items-center gap-3">
          <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400">check_circle</span>
          <p className="text-sm text-on-surface-variant dark:text-slate-300">Semua terkendali — tak ada lonjakan atau anomali menonjol dari kebiasaan Anda.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {insights.map((it) => {
            const s = SEV[it.severity];
            return (
              <div key={it.id} className={`flex gap-3 p-3 rounded-2xl border ${s.ring} bg-surface-container-low dark:bg-white/5`}>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${s.bg}`}>
                  <span className="material-symbols-outlined text-[20px]">{it.icon}</span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-on-surface dark:text-white leading-snug">{it.title}</p>
                  <p className="text-[12px] text-on-surface-variant dark:text-slate-400 mt-0.5 leading-relaxed">{it.detail}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <p className="text-[10px] text-on-surface-variant/60 dark:text-slate-500 mt-3">Observasi otomatis dari riwayat transaksi — ambang bisa diatur di Pengaturan. Bukan nasihat keuangan personal.</p>
    </div>
  );
};

export default SpendingInsightsCard;
