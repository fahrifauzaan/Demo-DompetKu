import React, { useMemo, useState } from 'react';
import { useFinanceStore } from '../store/useFinanceStore';
import { computePassiveIncome } from './passiveIncomeUtils';

const formatRp = (n: number) => `Rp ${Math.round(n || 0).toLocaleString('id-ID')}`;
const formatRpShort = (n: number) => {
  const abs = Math.abs(n);
  if (abs >= 1e9) return `Rp ${(n / 1e9).toFixed(2)} M`;
  if (abs >= 1e6) return `Rp ${(n / 1e6).toFixed(1)} jt`;
  if (abs >= 1e3) return `Rp ${Math.round(n / 1e3)} rb`;
  return formatRp(n);
};

const PassiveIncomeCard: React.FC = () => {
  const assets = useFinanceStore((s) => s.assets);
  const transactions = useFinanceStore((s) => s.transactions);
  const [activeMonth, setActiveMonth] = useState<number | null>(null);

  const data = useMemo(() => computePassiveIncome(assets, transactions), [assets, transactions]);

  // Rata-rata pengeluaran bulanan (3 bulan terakhir) untuk rasio kemandirian
  const avgMonthlyExpense = useMemo(() => {
    const now = new Date();
    let total = 0; const months = new Set<string>();
    transactions.forEach((t) => {
      if (t.type !== 'PENGELUARAN') return;
      const d = new Date(t.date);
      if (isNaN(d.getTime())) return;
      const diffM = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
      if (diffM >= 0 && diffM < 3) { total += Math.abs(t.amount || 0); months.add(`${d.getFullYear()}-${d.getMonth()}`); }
    });
    const n = Math.max(1, months.size);
    return total / n;
  }, [transactions]);

  if (!data.hasData) return null;

  const maxMonth = Math.max(1, ...data.months.map((m) => m.total));
  const fireRatio = avgMonthlyExpense > 0 ? (data.avgMonthly / avgMonthlyExpense) * 100 : 0;
  const shown = activeMonth !== null ? data.months[activeMonth] : null;

  return (
    <div className="bg-surface-container-lowest dark:bg-white/[0.02] border border-outline-variant/10 dark:border-white/10 rounded-2xl lg:rounded-[24px] p-5 sm:p-6 lg:p-8 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400">savings</span>
        <div>
          <h3 className="font-headline font-bold text-base sm:text-lg text-on-surface dark:text-white">Kalender Pendapatan Pasif</h3>
          <p className="text-[11px] text-on-surface-variant dark:text-slate-400">Proyeksi kupon/bunga bersih 12 bulan ke depan</p>
        </div>
      </div>

      {/* Ringkasan */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4">
          <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">Rata-rata / bulan</p>
          <p className="text-2xl font-black tabular-nums mt-1 text-emerald-600 dark:text-emerald-400">{formatRpShort(data.avgMonthly)}</p>
          <p className="text-[10px] text-on-surface-variant/70 dark:text-slate-500 mt-1">Total setahun {formatRpShort(data.total12m)}</p>
        </div>
        <div className="bg-surface-container-low dark:bg-white/[0.03] rounded-2xl p-4 border border-outline-variant/10 dark:border-white/5">
          <p className="text-[10px] font-bold uppercase tracking-wide text-on-surface-variant dark:text-slate-400">Menutup Pengeluaran</p>
          <p className="text-2xl font-black tabular-nums mt-1 text-on-surface dark:text-white">{fireRatio > 0 ? `${fireRatio.toFixed(1)}%` : '—'}</p>
          <p className="text-[10px] text-on-surface-variant/70 dark:text-slate-500 mt-1">Progres menuju kemandirian finansial</p>
        </div>
        <div className="bg-surface-container-low dark:bg-white/[0.03] rounded-2xl p-4 border border-outline-variant/10 dark:border-white/5">
          <p className="text-[10px] font-bold uppercase tracking-wide text-on-surface-variant dark:text-slate-400">Dividen (estimasi)</p>
          <p className="text-2xl font-black tabular-nums mt-1 text-on-surface dark:text-white">{data.dividendEstimateMonthly > 0 ? formatRpShort(data.dividendEstimateMonthly) : '—'}</p>
          <p className="text-[10px] text-on-surface-variant/70 dark:text-slate-500 mt-1">Rata-rata historis 12 bln (bukan jadwal)</p>
        </div>
      </div>

      {/* Bar chart 12 bulan */}
      <div>
        <div className="flex items-end justify-between gap-1 sm:gap-1.5 h-32 px-1">
          {data.months.map((m, i) => {
            const h = m.total > 0 ? Math.max(6, (m.total / maxMonth) * 100) : 2;
            const active = activeMonth === i;
            return (
              <button key={m.key} onClick={() => setActiveMonth(active ? null : i)}
                className="flex-1 flex flex-col items-center justify-end h-full group cursor-pointer" title={`${m.label}: ${formatRp(m.total)}`}>
                <div className={`w-full rounded-t-md transition-all ${m.total > 0 ? (active ? 'bg-emerald-500' : 'bg-emerald-500/50 group-hover:bg-emerald-500/80') : 'bg-surface-container-high dark:bg-white/10'}`} style={{ height: `${h}%` }} />
                <span className={`text-[8px] sm:text-[9px] font-bold mt-1 ${active ? 'text-emerald-600 dark:text-emerald-400' : 'text-on-surface-variant dark:text-slate-500'}`}>{m.label.split(' ')[0]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Detail bulan terpilih */}
      {shown && shown.events.length > 0 && (
        <div className="rounded-2xl border border-outline-variant/10 dark:border-white/5 divide-y divide-outline-variant/10 dark:divide-white/5 overflow-hidden">
          <div className="px-4 py-2 bg-surface-container dark:bg-[#1b1e21] flex justify-between items-center">
            <span className="text-xs font-black text-on-surface dark:text-white">{shown.label} · {shown.events.length} pembayaran</span>
            <span className="text-xs font-black tabular-nums text-emerald-600 dark:text-emerald-400">{formatRp(shown.total)}</span>
          </div>
          {shown.events.map((ev, idx) => (
            <div key={idx} className="px-4 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <span className="material-symbols-outlined text-[16px] text-emerald-600 dark:text-emerald-400 shrink-0">{ev.kind === 'maturity' ? 'event_available' : 'paid'}</span>
                <span className="text-xs font-semibold text-on-surface dark:text-slate-200 truncate">{ev.title}</span>
                <span className="text-[10px] text-on-surface-variant dark:text-slate-500 shrink-0">tgl {ev.day}</span>
              </div>
              <span className="text-xs font-bold tabular-nums text-on-surface dark:text-white">{formatRp(ev.amount)}</span>
            </div>
          ))}
        </div>
      )}
      {!shown && <p className="text-[11px] text-center text-on-surface-variant dark:text-slate-500">Ketuk batang bulan untuk melihat rincian pembayaran.</p>}

      <div className="flex items-start gap-2 rounded-2xl bg-surface-container-low dark:bg-white/[0.03] border border-outline-variant/10 dark:border-white/5 p-3">
        <span className="material-symbols-outlined text-[15px] text-on-surface-variant dark:text-slate-400 mt-px shrink-0">info</span>
        <p className="text-[10.5px] text-on-surface-variant dark:text-slate-400 leading-relaxed">
          Proyeksi kupon bersih (setelah pajak) dari instrumen fixed income aktif. Dividen saham ditampilkan sebagai <strong>estimasi historis</strong>, bukan jadwal pasti. Edukasi, bukan jaminan imbal hasil.
        </p>
      </div>
    </div>
  );
};

export default PassiveIncomeCard;
