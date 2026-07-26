import React, { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { useFinanceStore } from '../store/useFinanceStore';
import { getUsdIdrRate } from './currencyUtils';
import {
  monthlyCashflow, currentMonthKey, completeMonths, burnRate, monthlyNet,
  liquidBalance, runwayMonths, avgByGroup,
} from './cashflowUtils';

const rp = (n: number) => 'Rp ' + Math.round(n).toLocaleString('id-ID');
const rpShort = (n: number) => {
  const a = Math.abs(n);
  if (a >= 1e9) return (n / 1e9).toFixed(1).replace('.0', '') + 'M';
  if (a >= 1e6) return (n / 1e6).toFixed(1).replace('.0', '') + 'jt';
  if (a >= 1e3) return Math.round(n / 1e3) + 'rb';
  return String(Math.round(n));
};

const CashFlowStatementCard: React.FC = () => {
  const transactions = useFinanceStore((s) => s.transactions);
  const accounts = useFinanceStore((s) => s.accounts);
  const settings = useFinanceStore((s) => s.settings);
  const [win, setWin] = useState<6 | 12 | 24>(6);

  const data = useMemo(() => {
    const list = monthlyCashflow(transactions, accounts, settings);
    const nowMonth = currentMonthKey();
    const rate = getUsdIdrRate(settings);
    const complete = completeMonths(list, nowMonth);
    const burn = burnRate(list, nowMonth, win);
    const net = monthlyNet(list, nowMonth, win);
    const liquid = liquidBalance(accounts, rate);
    const runway = runwayMonths(liquid, burn);
    const groups = avgByGroup(list, nowMonth, win);
    const chart = list.slice(-win).map((m) => ({
      month: m.month.slice(2), // 'YY-MM'
      Masuk: Math.round(m.income),
      Keluar: -Math.round(m.expense),
      net: Math.round(m.net),
    }));
    return { list, complete, burn, net, liquid, runway, groups, chart };
  }, [transactions, accounts, settings, win]);

  const enough = data.complete.length >= 2;
  const netPositive = data.net >= 0;

  return (
    <div className="liquid-glass rounded-2xl sm:rounded-[28px] border border-white/20 dark:border-white/10 p-4 sm:p-6 lg:p-7 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)]">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-primary/10 dark:bg-[#a7c8ff]/15 flex items-center justify-center text-primary dark:text-[#a7c8ff]">
            <span className="material-symbols-outlined">account_balance_wallet</span>
          </div>
          <div>
            <h3 className="text-lg font-black font-headline text-on-surface dark:text-white leading-none">Arus Kas</h3>
            <p className="text-[11px] text-on-surface-variant dark:text-slate-400 mt-1">Masuk vs keluar, burn rate &amp; runway · hanya bulan LENGKAP (tak mengikuti pemilih periode)</p>
          </div>
        </div>
        <div className="flex bg-surface-container dark:bg-white/5 rounded-xl p-0.5">
          {([6, 12, 24] as const).map((w) => (
            <button key={w} onClick={() => setWin(w)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${win === w ? 'bg-white dark:bg-primary-container text-primary dark:text-white shadow-sm' : 'text-on-surface-variant dark:text-outline'}`}>
              {w}bln
            </button>
          ))}
        </div>
      </div>

      {!enough ? (
        <div className="text-center py-8 text-sm text-on-surface-variant dark:text-slate-400">
          Belum cukup data (butuh ≥ 2 bulan lengkap) untuk menghitung burn rate &amp; runway.
        </div>
      ) : (
        <>
          {/* Summary tiles */}
          <div className="grid grid-cols-3 gap-2.5 sm:gap-3 mb-5">
            <div className="rounded-2xl bg-surface-container-low dark:bg-white/5 p-3 sm:p-4 border border-outline-variant/10 dark:border-white/5">
              <p className="text-[10px] font-bold uppercase tracking-wide text-on-surface-variant dark:text-slate-400">Arus Kas Bersih<span className="hidden sm:inline"> / bln</span></p>
              <p className={`text-base sm:text-xl font-black mt-1 tabular-nums ${netPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-error dark:text-[#ffb4ab]'}`}>
                {netPositive ? '+' : '−'}{rp(Math.abs(data.net))}
              </p>
              <p className="text-[10px] text-on-surface-variant/70 dark:text-slate-500 mt-0.5">{netPositive ? 'Surplus' : 'Defisit'} rata-rata</p>
            </div>
            <div className="rounded-2xl bg-surface-container-low dark:bg-white/5 p-3 sm:p-4 border border-outline-variant/10 dark:border-white/5">
              <p className="text-[10px] font-bold uppercase tracking-wide text-on-surface-variant dark:text-slate-400">Burn Rate<span className="hidden sm:inline"> / bln</span></p>
              <p className="text-base sm:text-xl font-black mt-1 tabular-nums text-on-surface dark:text-white">{rp(data.burn)}</p>
              <p className="text-[10px] text-on-surface-variant/70 dark:text-slate-500 mt-0.5">Biaya hidup rutin</p>
            </div>
            <div className="rounded-2xl bg-surface-container-low dark:bg-white/5 p-3 sm:p-4 border border-outline-variant/10 dark:border-white/5">
              <p className="text-[10px] font-bold uppercase tracking-wide text-on-surface-variant dark:text-slate-400">Runway</p>
              {data.runway === Infinity ? (
                <p className="text-base sm:text-xl font-black mt-1 text-emerald-600 dark:text-emerald-400">Surplus ∞</p>
              ) : (
                <p className={`text-base sm:text-xl font-black mt-1 tabular-nums ${data.runway < 3 ? 'text-error dark:text-[#ffb4ab]' : data.runway < 6 ? 'text-amber-600 dark:text-amber-400' : 'text-on-surface dark:text-white'}`}>
                  {data.runway.toFixed(1)} <span className="text-xs font-bold">bln</span>
                </p>
              )}
              <p className="text-[10px] text-on-surface-variant/70 dark:text-slate-500 mt-0.5">Tanpa pemasukan</p>
            </div>
          </div>

          {/* Bar chart */}
          <div className="h-44 sm:h-52 -ml-2 mb-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.chart} barGap={-2} margin={{ top: 6, right: 6, bottom: 0, left: 6 }}>
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'currentColor' }} axisLine={false} tickLine={false} className="text-on-surface-variant dark:text-slate-400" />
                <YAxis tickFormatter={rpShort} tick={{ fontSize: 10, fill: 'currentColor' }} axisLine={false} tickLine={false} width={38} className="text-on-surface-variant dark:text-slate-400" />
                <ReferenceLine y={0} stroke="currentColor" strokeOpacity={0.2} />
                <Tooltip
                  formatter={(v: number, name: string) => [rp(Math.abs(v)), name]}
                  contentStyle={{ borderRadius: 12, border: '1px solid rgba(0,0,0,0.08)', fontSize: 12 }}
                  cursor={{ fill: 'rgba(125,125,125,0.06)' }}
                />
                <Bar dataKey="Masuk" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={26} />
                <Bar dataKey="Keluar" fill="#f43f5e" radius={[0, 0, 4, 4]} maxBarSize={26} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* 3-section breakdown */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            {([
              ['Operasi', data.groups.operasi, 'Biaya hidup & gaji'],
              ['Investasi', data.groups.investasi, 'Alokasi aset'],
              ['Pendanaan', data.groups.pendanaan, 'Cicilan & pinjaman'],
            ] as const).map(([label, g, hint]) => (
              <div key={label} className="rounded-xl border border-outline-variant/10 dark:border-white/5 p-2.5">
                <p className="text-[10px] font-bold uppercase tracking-wide text-on-surface-variant dark:text-slate-400">{label}</p>
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1 tabular-nums">↑ {rpShort(g.in)}</p>
                <p className="text-[11px] text-error dark:text-[#ffb4ab] font-semibold tabular-nums">↓ {rpShort(g.out)}</p>
                <p className="text-[9px] text-on-surface-variant/60 dark:text-slate-500 mt-1 leading-tight">{hint}</p>
              </div>
            ))}
          </div>

          {/* Education callout */}
          <div className="rounded-xl bg-primary/5 dark:bg-[#a7c8ff]/10 border border-primary/15 dark:border-[#a7c8ff]/15 p-3 flex gap-2.5">
            <span className="material-symbols-outlined text-primary dark:text-[#a7c8ff] text-[20px] shrink-0">tips_and_updates</span>
            <p className="text-[11px] leading-relaxed text-on-surface-variant dark:text-slate-300">
              <b className="text-on-surface dark:text-white">Arus kas positif adalah fondasi piramida keuangan.</b> {netPositive
                ? 'Surplus Anda bisa diarahkan ke dana darurat, tujuan, lalu investasi.'
                : 'Defisit berulang menggerus tabungan — tinjau kategori terbesar di Wawasan.'} Runway = estimasi berapa lama kas likuid menutup biaya hidup bila pemasukan berhenti (patokan sehat ≥ 6 bulan).
            </p>
          </div>
        </>
      )}
    </div>
  );
};

export default CashFlowStatementCard;
