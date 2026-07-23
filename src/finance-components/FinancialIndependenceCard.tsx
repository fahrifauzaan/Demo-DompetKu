import React, { useMemo } from 'react';
import { useFinanceStore } from '../store/useFinanceStore';
import { getUsdIdrRate, getUsdTickers } from './currencyUtils';
import { monthlyCashflow, currentMonthKey, completeMonths, monthlyNet } from './cashflowUtils';
import {
  annualExpenseFromCashflow, fiNumber, investableAssets, pctFI, realReturn, yearsToFI, coastFireNumber, savingsRate,
} from './fiUtils';

const rp = (n: number) => 'Rp ' + Math.round(n).toLocaleString('id-ID');
const rpS = (n: number) => {
  const a = Math.abs(n);
  if (a >= 1e12) return (n / 1e12).toFixed(2).replace(/\.?0+$/, '') + 'T';
  if (a >= 1e9) return (n / 1e9).toFixed(2).replace(/\.?0+$/, '') + 'M';
  if (a >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'jt';
  return Math.round(n).toLocaleString('id-ID');
};

const FinancialIndependenceCard: React.FC = () => {
  const transactions = useFinanceStore((s) => s.transactions);
  const accounts = useFinanceStore((s) => s.accounts);
  const assets = useFinanceStore((s) => s.assets);
  const settings = useFinanceStore((s) => s.settings);

  const num = (k: string, def: number) => {
    const v = settings.find((s) => s.key === k)?.value;
    const n = Number(v);
    return v != null && v !== '' && !isNaN(n) ? n : def;
  };

  const d = useMemo(() => {
    const rate = getUsdIdrRate(settings);
    const usdTickers = getUsdTickers(settings);
    const list = monthlyCashflow(transactions, accounts, settings);
    const nowMonth = currentMonthKey();
    const complete = completeMonths(list, nowMonth).slice(-6);

    const swr = num('fi_swr', 0.04);
    const inflation = num('fi_inflation', 0.035);
    const nominalRet = num('fi_nominal_return', 0.08);
    const curAge = num('fi_current_age', 30);
    const retAge = num('fi_retire_age', 55);
    const realRet = realReturn(nominalRet, inflation);

    const annualExp = annualExpenseFromCashflow(list, nowMonth, 6);
    const investable = investableAssets(assets, accounts, rate, usdTickers);
    const fiNum = fiNumber(annualExp, swr);
    const pct = pctFI(investable, fiNum);
    const annualContribution = Math.max(0, monthlyNet(list, nowMonth, 6)) * 12;
    const years = yearsToFI(investable, fiNum, annualContribution, realRet);
    const coast = coastFireNumber(curAge, retAge, annualExp, realRet, swr);
    const coastAchieved = investable >= coast && coast > 0;

    const avgIncome = complete.length ? complete.reduce((s, m) => s + m.income, 0) / complete.length : 0;
    const avgExpense = complete.length ? complete.reduce((s, m) => s + m.expense, 0) / complete.length : 0;
    const sRate = savingsRate(avgIncome, avgExpense);

    return {
      enough: annualExp > 0 && complete.length >= 2,
      annualExp, investable, fiNum, pct, years, coast, coastAchieved, sRate,
      lean: fiNumber(annualExp * 0.7, swr), fat: fiNumber(annualExp * 1.5, swr),
      annualContribution, curAge, retAge,
    };
  }, [transactions, accounts, assets, settings]);

  const pctClamped = Math.min(100, Math.max(0, d.pct * 100));
  const yearsTxt = d.years === Infinity ? '—' : d.years <= 0 ? 'Tercapai! 🎉' : `${d.years.toFixed(1)} thn`;

  return (
    <div className="liquid-glass rounded-2xl sm:rounded-[28px] border border-white/20 dark:border-white/10 p-4 sm:p-6 lg:p-7 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)]">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-11 h-11 rounded-2xl bg-primary/10 dark:bg-[#a7c8ff]/15 flex items-center justify-center text-primary dark:text-[#a7c8ff]">
          <span className="material-symbols-outlined">rocket_launch</span>
        </div>
        <div>
          <h3 className="text-lg font-black font-headline text-on-surface dark:text-white leading-none">Kemandirian Finansial</h3>
          <p className="text-[11px] text-on-surface-variant dark:text-slate-400 mt-1">Seberapa dekat Anda menuju bebas finansial (FIRE)</p>
        </div>
      </div>

      {!d.enough ? (
        <div className="text-center py-8 text-sm text-on-surface-variant dark:text-slate-400">
          Belum cukup data biaya hidup (butuh ≥ 2 bulan lengkap) untuk menghitung angka FIRE.
        </div>
      ) : (
        <>
          {/* Progress %FI */}
          <div className="mb-5">
            <div className="flex items-end justify-between mb-1.5">
              <div>
                <span className="text-3xl sm:text-4xl font-black text-primary dark:text-[#a7c8ff] tabular-nums">{(d.pct * 100).toFixed(1)}%</span>
                <span className="text-xs font-semibold text-on-surface-variant dark:text-slate-400 ml-2">menuju FI</span>
              </div>
              <span className="text-xs font-bold text-on-surface-variant dark:text-slate-400">{yearsTxt}</span>
            </div>
            <div className="h-3 rounded-full bg-surface-container dark:bg-white/10 overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-primary to-primary-container dark:from-[#a7c8ff] dark:to-[#82b1ff] transition-all" style={{ width: `${pctClamped}%` }} />
            </div>
            <div className="flex justify-between text-[11px] text-on-surface-variant dark:text-slate-400 mt-1.5 tabular-nums">
              <span>Terkumpul {rpS(d.investable)}</span>
              <span>Target {rpS(d.fiNum)}</span>
            </div>
          </div>

          {/* Metrics grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-4">
            <Tile label="FI Number" value={rpS(d.fiNum)} hint={`SWR ${(num('fi_swr', 0.04) * 100).toFixed(0)}% · pengeluaran ${rpS(d.annualExp)}/th`} />
            <Tile label="Coast FIRE" value={d.coastAchieved ? 'Tercapai ✓' : rpS(d.coast)} hint={d.coastAchieved ? 'Cukup, tinggal biarkan tumbuh' : `perlu di usia ${d.curAge}`} good={d.coastAchieved} />
            <Tile label="Tingkat Menabung" value={`${(d.sRate * 100).toFixed(0)}%`} hint="pengungkit terbesar" good={d.sRate >= 0.2} warn={d.sRate < 0.1} />
            <Tile label="Tahun ke FI" value={yearsTxt} hint={`setor ~${rpS(d.annualContribution)}/th`} />
          </div>

          {/* Lean / Fat variants */}
          <div className="flex gap-2 mb-4">
            <Variant label="Lean FIRE" value={rpS(d.lean)} sub="gaya hemat (×0,7)" />
            <Variant label="FIRE" value={rpS(d.fiNum)} sub="gaya sekarang" active />
            <Variant label="Fat FIRE" value={rpS(d.fat)} sub="gaya nyaman (×1,5)" />
          </div>

          <div className="rounded-xl bg-primary/5 dark:bg-[#a7c8ff]/10 border border-primary/15 dark:border-[#a7c8ff]/15 p-3 flex gap-2.5">
            <span className="material-symbols-outlined text-primary dark:text-[#a7c8ff] text-[20px] shrink-0">savings</span>
            <p className="text-[11px] leading-relaxed text-on-surface-variant dark:text-slate-300">
              <b className="text-on-surface dark:text-white">Naikkan tingkat menabung = jalan tercepat.</b> Angka memakai aturan SWR {(num('fi_swr', 0.04) * 100).toFixed(0)}% & asumsi return riil {(realReturn(num('fi_nominal_return', 0.08), num('fi_inflation', 0.035)) * 100).toFixed(1)}%/th (bisa diubah di Pengaturan). Ini <b>ilustrasi edukatif</b>, bukan jaminan — pasar berfluktuasi.
            </p>
          </div>
        </>
      )}
    </div>
  );
};

const Tile: React.FC<{ label: string; value: string; hint?: string; good?: boolean; warn?: boolean }> = ({ label, value, hint, good, warn }) => (
  <div className="rounded-2xl bg-surface-container-low dark:bg-white/5 p-3 border border-outline-variant/10 dark:border-white/5">
    <p className="text-[10px] font-bold uppercase tracking-wide text-on-surface-variant dark:text-slate-400">{label}</p>
    <p className={`text-sm sm:text-base font-black mt-1 tabular-nums ${good ? 'text-emerald-600 dark:text-emerald-400' : warn ? 'text-error dark:text-[#ffb4ab]' : 'text-on-surface dark:text-white'}`}>{value}</p>
    {hint && <p className="text-[9px] text-on-surface-variant/70 dark:text-slate-500 mt-0.5 leading-tight">{hint}</p>}
  </div>
);

const Variant: React.FC<{ label: string; value: string; sub: string; active?: boolean }> = ({ label, value, sub, active }) => (
  <div className={`flex-1 rounded-xl p-2.5 text-center border ${active ? 'border-primary/30 dark:border-[#a7c8ff]/30 bg-primary/5 dark:bg-[#a7c8ff]/10' : 'border-outline-variant/10 dark:border-white/5'}`}>
    <p className="text-[10px] font-bold text-on-surface-variant dark:text-slate-400">{label}</p>
    <p className={`text-xs font-black mt-0.5 tabular-nums ${active ? 'text-primary dark:text-[#a7c8ff]' : 'text-on-surface dark:text-white'}`}>{value}</p>
    <p className="text-[9px] text-on-surface-variant/60 dark:text-slate-500 mt-0.5">{sub}</p>
  </div>
);

export default FinancialIndependenceCard;
