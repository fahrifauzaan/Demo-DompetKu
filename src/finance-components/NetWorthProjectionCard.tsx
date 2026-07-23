import React, { useMemo, useState } from 'react';
import { AreaChart, Area, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { useFinanceStore } from '../store/useFinanceStore';
import { getUsdIdrRate, getUsdTickers } from './currencyUtils';
import { monthlyCashflow, currentMonthKey, monthlyNet } from './cashflowUtils';
import { annualExpenseFromCashflow, fiNumber } from './fiUtils';
import { currentNetWorth, projectBands, projectDeterministic, monteCarloFinal, crossingYear } from './netWorthProjectionUtils';

const rpS = (n: number) => {
  const a = Math.abs(n); const s = n < 0 ? '−' : '';
  if (a >= 1e12) return s + 'Rp ' + (a / 1e12).toFixed(2).replace(/\.?0+$/, '') + 'T';
  if (a >= 1e9) return s + 'Rp ' + (a / 1e9).toFixed(2).replace(/\.?0+$/, '') + 'M';
  if (a >= 1e6) return s + 'Rp ' + (a / 1e6).toFixed(0) + 'jt';
  return s + 'Rp ' + Math.round(a).toLocaleString('id-ID');
};

const NetWorthProjectionCard: React.FC = () => {
  const transactions = useFinanceStore((s) => s.transactions);
  const accounts = useFinanceStore((s) => s.accounts);
  const assets = useFinanceStore((s) => s.assets);
  const debts = useFinanceStore((s) => s.debts);
  const settings = useFinanceStore((s) => s.settings);
  const [years, setYears] = useState<10 | 20 | 30>(20);

  const num = (k: string, def: number) => {
    const v = settings.find((s) => s.key === k)?.value; const n = Number(v);
    return v != null && v !== '' && !isNaN(n) ? n : def;
  };

  const d = useMemo(() => {
    const rate = getUsdIdrRate(settings);
    const usdTickers = getUsdTickers(settings);
    const list = monthlyCashflow(transactions, accounts, settings);
    const nowMonth = currentMonthKey();

    const start = currentNetWorth(accounts, assets, debts, rate, usdTickers);
    const monthlyContribution = Math.max(0, monthlyNet(list, nowMonth, 6));
    const basisRet = num('proj_return_basis', 0.08);
    const spread = num('proj_return_spread', 0.04);
    const volatility = num('proj_volatility', 0.15);
    const returns = { konservatif: Math.max(0, basisRet - spread), basis: basisRet, optimis: basisRet + spread };

    const bands = projectBands({ start, monthlyContribution, years, returns });
    const basisLine = projectDeterministic({ start, monthlyContribution, annualReturn: basisRet, years });
    const annualExp = annualExpenseFromCashflow(list, nowMonth, 6);
    const fiNum = annualExp > 0 ? fiNumber(annualExp, num('fi_swr', 0.04)) : 0;
    const fiYear = fiNum > 0 ? crossingYear(basisLine, fiNum) : null;
    const mc = monteCarloFinal({ start, monthlyContribution, meanReturn: basisRet, stdev: volatility, years, runs: 400 });
    const finalBasis = basisLine[basisLine.length - 1].value;

    const chart = bands.map((p) => ({ year: p.year, Konservatif: Math.round(p.konservatif), Basis: Math.round(p.basis), Optimis: Math.round(p.optimis) }));
    return { start, monthlyContribution, returns, bands, chart, fiNum, fiYear, mc, finalBasis, hasData: monthlyContribution > 0 || start > 0 };
  }, [transactions, accounts, assets, debts, settings, years]);

  return (
    <div className="liquid-glass rounded-2xl sm:rounded-[28px] border border-white/20 dark:border-white/10 p-4 sm:p-6 lg:p-7 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)]">
      <div className="flex items-start justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-primary/10 dark:bg-[#a7c8ff]/15 flex items-center justify-center text-primary dark:text-[#a7c8ff]">
            <span className="material-symbols-outlined">trending_up</span>
          </div>
          <div>
            <h3 className="text-lg font-black font-headline text-on-surface dark:text-white leading-none">Proyeksi Kekayaan Bersih</h3>
            <p className="text-[11px] text-on-surface-variant dark:text-slate-400 mt-1">Ke mana arah net worth Anda — dengan rentang realistis</p>
          </div>
        </div>
        <div className="flex bg-surface-container dark:bg-white/5 rounded-xl p-0.5">
          {([10, 20, 30] as const).map((y) => (
            <button key={y} onClick={() => setYears(y)} className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${years === y ? 'bg-white dark:bg-primary-container text-primary dark:text-white shadow-sm' : 'text-on-surface-variant dark:text-outline'}`}>{y}th</button>
          ))}
        </div>
      </div>

      {!d.hasData ? (
        <div className="text-center py-8 text-sm text-on-surface-variant dark:text-slate-400">Belum ada data net worth/surplus untuk diproyeksikan.</div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2.5 mb-4">
            <div className="rounded-2xl bg-surface-container-low dark:bg-white/5 p-3 border border-outline-variant/10 dark:border-white/5">
              <p className="text-[10px] font-bold uppercase tracking-wide text-on-surface-variant dark:text-slate-400">Sekarang</p>
              <p className="text-sm sm:text-base font-black mt-1 tabular-nums text-on-surface dark:text-white">{rpS(d.start)}</p>
            </div>
            <div className="rounded-2xl bg-primary/5 dark:bg-[#a7c8ff]/10 p-3 border border-primary/15 dark:border-[#a7c8ff]/15">
              <p className="text-[10px] font-bold uppercase tracking-wide text-primary dark:text-[#a7c8ff]">Proyeksi {years} th (basis)</p>
              <p className="text-sm sm:text-base font-black mt-1 tabular-nums text-primary dark:text-[#a7c8ff]">{rpS(d.finalBasis)}</p>
            </div>
            <div className="rounded-2xl bg-surface-container-low dark:bg-white/5 p-3 border border-outline-variant/10 dark:border-white/5">
              <p className="text-[10px] font-bold uppercase tracking-wide text-on-surface-variant dark:text-slate-400">Setoran/bln</p>
              <p className="text-sm sm:text-base font-black mt-1 tabular-nums text-on-surface dark:text-white">{rpS(d.monthlyContribution)}</p>
            </div>
          </div>

          <div className="h-52 sm:h-60 -ml-2 mb-3">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={d.chart} margin={{ top: 6, right: 8, bottom: 0, left: 6 }}>
                <defs>
                  <linearGradient id="nwBand" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.28} />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="year" tickFormatter={(y) => `${y}th`} tick={{ fontSize: 10, fill: 'currentColor' }} axisLine={false} tickLine={false} className="text-on-surface-variant dark:text-slate-400" />
                <YAxis tickFormatter={rpS} tick={{ fontSize: 9, fill: 'currentColor' }} axisLine={false} tickLine={false} width={44} className="text-on-surface-variant dark:text-slate-400" />
                <Tooltip formatter={(v: number, n: string) => [rpS(v), n]} labelFormatter={(y) => `Tahun ke-${y}`} contentStyle={{ borderRadius: 12, border: '1px solid rgba(0,0,0,0.08)', fontSize: 12 }} />
                <Area type="monotone" dataKey="Optimis" stroke="#10b981" strokeWidth={1} strokeDasharray="4 3" fill="none" dot={false} />
                <Area type="monotone" dataKey="Basis" stroke="#3b82f6" strokeWidth={2.5} fill="url(#nwBand)" dot={false} />
                <Line type="monotone" dataKey="Konservatif" stroke="#f59e0b" strokeWidth={1} strokeDasharray="4 3" dot={false} />
                {d.fiNum > 0 && <ReferenceLine y={d.fiNum} stroke="#a855f7" strokeDasharray="5 4" label={{ value: 'FI', fontSize: 10, fill: '#a855f7', position: 'insideTopLeft' }} />}
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] mb-3 justify-center">
            <span className="flex items-center gap-1.5 text-on-surface-variant dark:text-slate-400"><i className="w-3 h-0.5 bg-emerald-500 inline-block" />Optimis {(d.returns.optimis * 100).toFixed(0)}%</span>
            <span className="flex items-center gap-1.5 text-on-surface-variant dark:text-slate-400"><i className="w-3 h-0.5 bg-blue-500 inline-block" />Basis {(d.returns.basis * 100).toFixed(0)}%</span>
            <span className="flex items-center gap-1.5 text-on-surface-variant dark:text-slate-400"><i className="w-3 h-0.5 bg-amber-500 inline-block" />Konservatif {(d.returns.konservatif * 100).toFixed(0)}%</span>
          </div>

          {d.fiYear != null && (
            <div className="rounded-xl bg-purple-500/5 border border-purple-500/20 p-2.5 mb-2 text-center">
              <p className="text-[12px] text-on-surface-variant dark:text-slate-300">🎯 Menyentuh <b className="text-purple-600 dark:text-purple-300">angka kemandirian (FI)</b> di sekitar <b>tahun ke-{d.fiYear.toFixed(1)}</b> (skenario basis)</p>
            </div>
          )}

          <div className="rounded-xl bg-primary/5 dark:bg-[#a7c8ff]/10 border border-primary/15 dark:border-[#a7c8ff]/15 p-3 flex gap-2.5">
            <span className="material-symbols-outlined text-primary dark:text-[#a7c8ff] text-[20px] shrink-0">casino</span>
            <p className="text-[11px] leading-relaxed text-on-surface-variant dark:text-slate-300">
              <b className="text-on-surface dark:text-white">Simulasi Monte Carlo ({d.mc.runs} lintasan, {years} th):</b> 10% terburuk ~{rpS(d.mc.p10)} · median ~{rpS(d.mc.p50)} · 10% terbaik ~{rpS(d.mc.p90)}. Proyeksi = <b>ilustrasi asumsi</b>, bukan jaminan; return & inflasi bisa diubah di Pengaturan.
            </p>
          </div>
        </>
      )}
    </div>
  );
};

export default NetWorthProjectionCard;
