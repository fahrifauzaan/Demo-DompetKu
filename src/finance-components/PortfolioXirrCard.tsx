import React, { useMemo, useState } from 'react';
import { useFinanceStore } from '../store/useFinanceStore';
import { computePortfolioReturns } from './portfolioReturns';

const formatRp = (n: number) => `Rp ${Math.round(n || 0).toLocaleString('id-ID')}`;
const formatRpShort = (n: number) => {
  const abs = Math.abs(n);
  if (abs >= 1e9) return `${n < 0 ? '−' : ''}Rp ${(abs / 1e9).toFixed(2)} M`;
  if (abs >= 1e6) return `${n < 0 ? '−' : ''}Rp ${(abs / 1e6).toFixed(1)} jt`;
  return formatRp(n);
};
const formatPct = (v: number | null) => (v === null ? 'N/A' : `${v >= 0 ? '+' : ''}${(v * 100).toFixed(1)}%`);

const PortfolioXirrCard: React.FC = () => {
  const assets = useFinanceStore((s) => s.assets);
  const transactions = useFinanceStore((s) => s.transactions);
  const settings = useFinanceStore((s) => s.settings);
  const [mode, setMode] = useState<'xirr' | 'simple'>('xirr');

  const data = useMemo(() => computePortfolioReturns(assets, transactions, settings), [assets, transactions, settings]);

  if (data.holdings.length === 0) return null;

  const aggReturn = mode === 'xirr' ? data.portfolioXirr : data.portfolioSimple;
  const sortedHoldings = [...data.holdings].sort((a, b) => b.marketIDR - a.marketIDR);

  const pctColor = (v: number | null) =>
    v === null ? 'text-on-surface-variant dark:text-slate-400' : v >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-error dark:text-[#ffb4ab]';

  return (
    <div className="bg-surface-container-lowest dark:bg-white/[0.02] border border-outline-variant/10 dark:border-white/10 rounded-2xl lg:rounded-[24px] p-5 sm:p-6 lg:p-8 space-y-5">
      {/* Header + toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary dark:text-[#a7c8ff]">show_chart</span>
          <div>
            <h3 className="font-headline font-bold text-base sm:text-lg text-on-surface dark:text-white">Imbal Hasil Portofolio</h3>
            <p className="text-[11px] text-on-surface-variant dark:text-slate-400">Return tertimbang-uang (money-weighted) per instrumen</p>
          </div>
        </div>
        <div className="flex bg-surface-container-low dark:bg-black/30 p-1 rounded-xl border border-outline-variant/10 self-start">
          <button onClick={() => setMode('xirr')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${mode === 'xirr' ? 'bg-white dark:bg-[#2c3033] shadow text-primary dark:text-[#a7c8ff]' : 'text-on-surface-variant dark:text-slate-400'}`}>
            XIRR
          </button>
          <button onClick={() => setMode('simple')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${mode === 'simple' ? 'bg-white dark:bg-[#2c3033] shadow text-primary dark:text-[#a7c8ff]' : 'text-on-surface-variant dark:text-slate-400'}`}>
            Sederhana
          </button>
        </div>
      </div>

      {/* Aggregate cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-surface-container-low dark:bg-white/[0.03] rounded-2xl p-4 border border-outline-variant/10 dark:border-white/5">
          <p className="text-[10px] font-bold uppercase tracking-wide text-on-surface-variant dark:text-slate-400">{mode === 'xirr' ? 'XIRR Portofolio' : 'Return Sederhana'} (p.a.)</p>
          <p className={`text-2xl font-black tabular-nums mt-1 ${pctColor(aggReturn)}`}>{formatPct(aggReturn)}</p>
          <p className="text-[10px] text-on-surface-variant/70 dark:text-slate-500 mt-1">{mode === 'xirr' ? 'Disetahunkan, memperhitungkan waktu' : 'Total (nilai+income) vs modal'}</p>
        </div>
        <div className="bg-surface-container-low dark:bg-white/[0.03] rounded-2xl p-4 border border-outline-variant/10 dark:border-white/5">
          <p className="text-[10px] font-bold uppercase tracking-wide text-on-surface-variant dark:text-slate-400">Unrealized P/L</p>
          <p className={`text-2xl font-black tabular-nums mt-1 ${pctColor(data.totalUnrealized === 0 ? 0 : data.totalUnrealized > 0 ? 1 : -1)}`}>{formatRpShort(data.totalUnrealized)}</p>
          <p className="text-[10px] text-on-surface-variant/70 dark:text-slate-500 mt-1">Nilai pasar − harga perolehan</p>
        </div>
        <div className="bg-surface-container-low dark:bg-white/[0.03] rounded-2xl p-4 border border-outline-variant/10 dark:border-white/5">
          <p className="text-[10px] font-bold uppercase tracking-wide text-on-surface-variant dark:text-slate-400">Income Diterima</p>
          <p className="text-2xl font-black tabular-nums mt-1 text-emerald-600 dark:text-emerald-400">{formatRpShort(data.totalIncome)}</p>
          <p className="text-[10px] text-on-surface-variant/70 dark:text-slate-500 mt-1">Dividen/kupon (termasuk taksiran)</p>
        </div>
      </div>

      {/* Per-holding table */}
      <div className="rounded-2xl border border-outline-variant/10 dark:border-white/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[520px]">
            <thead className="bg-surface-container dark:bg-[#1b1e21]">
              <tr className="text-on-surface-variant dark:text-slate-400 text-[10px] uppercase tracking-wide text-left">
                <th className="px-3 py-2.5 font-black">Instrumen</th>
                <th className="px-3 py-2.5 font-black text-right">Modal</th>
                <th className="px-3 py-2.5 font-black text-right">Nilai Kini</th>
                <th className="px-3 py-2.5 font-black text-right">Income</th>
                <th className="px-3 py-2.5 font-black text-right">{mode === 'xirr' ? 'XIRR' : 'Return'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10 dark:divide-white/5">
              {sortedHoldings.map((h) => {
                const val = mode === 'xirr' ? h.xirr : h.simple;
                return (
                  <tr key={h.id} className="text-on-surface dark:text-slate-200">
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold truncate max-w-[160px]">{h.title}</span>
                        {h.isEstimate && <span className="text-[8px] font-black uppercase text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded shrink-0">est</span>}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{formatRpShort(h.costIDR)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{formatRpShort(h.marketIDR)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-emerald-600 dark:text-emerald-400">{h.incomeIDR > 0 ? formatRpShort(h.incomeIDR) : '—'}</td>
                    <td className={`px-3 py-2.5 text-right tabular-nums font-black ${pctColor(val)}`}>{formatPct(val)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edukasi */}
      <div className="flex items-start gap-2 rounded-2xl bg-surface-container-low dark:bg-white/[0.03] border border-outline-variant/10 dark:border-white/5 p-3">
        <span className="material-symbols-outlined text-[15px] text-on-surface-variant dark:text-slate-400 mt-px shrink-0">info</span>
        <p className="text-[10.5px] text-on-surface-variant dark:text-slate-400 leading-relaxed">
          <strong>XIRR</strong> = return tahunan tertimbang-uang: lebih jujur dari return sederhana karena memperhitungkan
          <em> kapan</em> uang masuk/keluar. <strong>N/A</strong> muncul bila data arus kas belum cukup (mis. &lt; 30 hari).
          Baris <strong>“est”</strong> memakai tanggal beli taksiran. Ini edukasi, bukan nasihat investasi.
        </p>
      </div>
    </div>
  );
};

export default PortfolioXirrCard;
