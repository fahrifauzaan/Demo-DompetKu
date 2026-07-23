import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useFinanceStore } from '../store/useFinanceStore';
import { getUsdIdrRate, getUsdTickers } from './currencyUtils';
import { monthlyCashflow, currentMonthKey, completeMonths, burnRate, monthlyNet, liquidBalance } from './cashflowUtils';
import { currentNetWorth } from './netWorthProjectionUtils';
import {
  scenarioJobLoss, scenarioBuyAsset, scenarioExpenseChange, scenarioIncomeChange, type Baseline,
} from './scenarioUtils';

const rp = (n: number) => (n < 0 ? '−Rp ' : 'Rp ') + Math.round(Math.abs(n)).toLocaleString('id-ID');
const rwTxt = (m: number) => (m === Infinity ? 'Surplus ∞' : `${m.toFixed(1)} bln`);

type Scn = 'jobloss' | 'buy' | 'expense' | 'income';
const TABS: { id: Scn; label: string; icon: string }[] = [
  { id: 'jobloss', label: 'Kehilangan Kerja', icon: 'work_off' },
  { id: 'buy', label: 'Beli Aset', icon: 'home' },
  { id: 'expense', label: 'Biaya Naik', icon: 'trending_up' },
  { id: 'income', label: 'Penghasilan Naik', icon: 'payments' },
];

const ScenarioPlannerModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { transactions, accounts, assets, debts, settings } = useFinanceStore();
  const [scn, setScn] = useState<Scn>('jobloss');
  // params
  const [months, setMonths] = useState(6);
  const [price, setPrice] = useState(500_000_000);
  const [dpPct, setDpPct] = useState(20);
  const [tenor, setTenor] = useState(180);
  const [rate, setRate] = useState(11);
  const [expPct, setExpPct] = useState(25);
  const [addIncome, setAddIncome] = useState(3_000_000);

  const base: Baseline = useMemo(() => {
    const r = getUsdIdrRate(settings); const usdT = getUsdTickers(settings);
    const list = monthlyCashflow(transactions, accounts, settings);
    const nm = currentMonthKey();
    const complete = completeMonths(list, nm).slice(-6);
    const monthlyIncome = complete.length ? complete.reduce((s, m) => s + m.income, 0) / complete.length : 0;
    return {
      monthlyIncome,
      monthlyExpense: burnRate(list, nm, 6),
      monthlySurplus: monthlyNet(list, nm, 6),
      liquid: liquidBalance(accounts, r),
      netWorth: currentNetWorth(accounts, assets, debts, r, usdT),
    };
  }, [transactions, accounts, assets, debts, settings]);

  if (!isOpen) return null;

  const jl = scenarioJobLoss(base, { months });
  const by = scenarioBuyAsset(base, { price, dpPct: dpPct / 100, tenorMonths: tenor, annualRate: rate });
  const ex = scenarioExpenseChange(base, expPct / 100);
  const inc = scenarioIncomeChange(base, addIncome);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-start sm:items-center justify-center p-2 sm:p-4 overflow-y-auto">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />
        <motion.div initial={{ opacity: 0, scale: 0.97, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97, y: 20 }}
          transition={{ type: 'spring', damping: 28, stiffness: 240 }}
          className="relative w-full max-w-lg my-auto bg-surface dark:bg-[#121416] rounded-3xl shadow-2xl border border-outline-variant/20 dark:border-white/10 max-h-[94vh] overflow-y-auto custom-scrollbar">
          <div className="sticky top-0 z-10 flex items-center justify-between px-5 sm:px-6 py-4 bg-surface/95 dark:bg-[#121416]/95 backdrop-blur border-b border-outline-variant/10 dark:border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-primary/10 dark:bg-[#a7c8ff]/15 flex items-center justify-center text-primary dark:text-[#a7c8ff]"><span className="material-symbols-outlined">alt_route</span></div>
              <div>
                <h2 className="text-lg font-black font-headline text-on-surface dark:text-white leading-none">Skenario "What-If"</h2>
                <p className="text-[11px] text-on-surface-variant dark:text-slate-400 mt-1">Uji dampak keputusan besar ke keuangan</p>
              </div>
            </div>
            <button onClick={onClose} className="w-9 h-9 rounded-full bg-surface-container dark:bg-white/5 flex items-center justify-center text-on-surface dark:text-white cursor-pointer"><span className="material-symbols-outlined text-lg">close</span></button>
          </div>

          <div className="p-5 sm:p-6 space-y-4">
            {/* Scenario tabs */}
            <div className="grid grid-cols-2 gap-2">
              {TABS.map((t) => (
                <button key={t.id} onClick={() => setScn(t.id)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${scn === t.id ? 'bg-primary dark:bg-[#a7c8ff] text-white dark:text-[#001b3c]' : 'bg-surface-container-low dark:bg-white/5 text-on-surface-variant dark:text-slate-300'}`}>
                  <span className="material-symbols-outlined text-[18px]">{t.icon}</span>{t.label}
                </button>
              ))}
            </div>

            {/* Baseline mini */}
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-on-surface-variant dark:text-slate-400 px-1">
              <span>Pemasukan <b className="text-on-surface dark:text-white tabular-nums">{rp(base.monthlyIncome)}</b>/bln</span>
              <span>Biaya hidup <b className="text-on-surface dark:text-white tabular-nums">{rp(base.monthlyExpense)}</b>/bln</span>
              <span>Surplus <b className={`tabular-nums ${base.monthlySurplus >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-error dark:text-[#ffb4ab]'}`}>{rp(base.monthlySurplus)}</b>/bln</span>
              <span>Likuid <b className="text-on-surface dark:text-white tabular-nums">{rp(base.liquid)}</b></span>
            </div>

            {/* Params + result per scenario */}
            {scn === 'jobloss' && (
              <>
                <Slider label={`Tanpa pemasukan selama`} value={months} setValue={setMonths} min={1} max={24} suffix=" bln" />
                <Result rows={[
                  ['Bertahan', rwTxt(jl.survivesMonths), jl.survivesMonths >= months ? 'good' : 'bad'],
                  ['Target Anda', `${months} bln`, 'neutral'],
                  [jl.covered ? 'Aman' : 'Kekurangan', jl.covered ? 'Kas cukup ✓' : rp(jl.shortfallAtTarget), jl.covered ? 'good' : 'bad'],
                ]} note={jl.covered ? `Kas likuid menutup ${months} bulan tanpa gaji.` : `Kurang ${rp(jl.shortfallAtTarget)} untuk bertahan ${months} bulan. Perkuat dana darurat.`} />
              </>
            )}

            {scn === 'buy' && (
              <>
                <NumInput label="Harga aset" value={price} setValue={setPrice} step={10_000_000} />
                <div className="grid grid-cols-3 gap-2">
                  <NumInput label="DP %" value={dpPct} setValue={setDpPct} step={5} small />
                  <NumInput label="Tenor (bln)" value={tenor} setValue={setTenor} step={12} small />
                  <NumInput label="Bunga %/th" value={rate} setValue={setRate} step={0.5} small />
                </div>
                <Result rows={[
                  ['DP (dari kas)', rp(by.dp), 'neutral'],
                  ['Cicilan/bln', rp(by.installment), 'bad'],
                  ['Surplus baru', rp(by.newSurplus), by.newSurplus >= 0 ? 'good' : 'bad'],
                  ['DTI (cicilan/gaji)', `${(by.dti * 100).toFixed(0)}%`, by.dti <= 0.35 ? 'good' : 'bad'],
                ]} note={by.dti > 0.35 ? 'DTI > 35% — beban cicilan tinggi, hati-hati.' : by.newSurplus < 0 ? 'Surplus jadi negatif — cicilan melebihi kemampuan.' : 'Masih dalam batas sehat.'} />
              </>
            )}

            {scn === 'expense' && (
              <>
                <Slider label="Biaya hidup berubah" value={expPct} setValue={setExpPct} min={-50} max={100} suffix="%" />
                <Result rows={[
                  ['Biaya baru/bln', rp(ex.newExpense), 'neutral'],
                  ['Surplus baru/bln', rp(ex.newSurplus), ex.newSurplus >= 0 ? 'good' : 'bad'],
                  ['Runway baru', rwTxt(ex.newRunway), ex.newRunway >= 6 ? 'good' : 'bad'],
                ]} note={ex.newSurplus < 0 ? 'Pengeluaran melebihi pemasukan — defisit.' : 'Masih surplus.'} />
              </>
            )}

            {scn === 'income' && (
              <>
                <NumInput label="Tambahan penghasilan/bln" value={addIncome} setValue={setAddIncome} step={500_000} />
                <Result rows={[
                  ['Pemasukan baru/bln', rp(inc.newIncome), 'good'],
                  ['Surplus baru/bln', rp(inc.newSurplus), inc.newSurplus >= 0 ? 'good' : 'bad'],
                  ['Tingkat menabung', `${(inc.newSavingsRate * 100).toFixed(0)}%`, inc.newSavingsRate >= 0.2 ? 'good' : 'neutral'],
                ]} note={`Tambahan ${rp(addIncome)}/bln mempercepat semua tujuan & kemandirian finansial Anda.`} />
              </>
            )}

            <p className="text-[10px] text-on-surface-variant/60 dark:text-slate-500">Alat berpikir, bukan ramalan. Semua asumsi bisa diubah; angka dasar dari rata-rata 6 bulan terakhir Anda.</p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

const Slider: React.FC<{ label: string; value: number; setValue: (n: number) => void; min: number; max: number; suffix?: string }> = ({ label, value, setValue, min, max, suffix }) => (
  <div>
    <div className="flex justify-between mb-1.5"><label className="text-xs font-bold text-on-surface-variant dark:text-slate-400">{label}</label><span className="text-sm font-black text-primary dark:text-[#a7c8ff] tabular-nums">{value}{suffix}</span></div>
    <input type="range" min={min} max={max} value={value} onChange={(e) => setValue(Number(e.target.value))} className="w-full accent-primary dark:accent-[#a7c8ff]" />
  </div>
);

const NumInput: React.FC<{ label: string; value: number; setValue: (n: number) => void; step?: number; small?: boolean }> = ({ label, value, setValue, step = 1, small }) => (
  <div className="space-y-1">
    <label className="text-[11px] font-bold text-on-surface-variant dark:text-slate-400">{label}</label>
    <input type="number" value={value} step={step} onChange={(e) => setValue(Number(e.target.value) || 0)}
      className={`w-full bg-surface-container-low dark:bg-white/5 border border-outline-variant/10 dark:border-white/10 rounded-xl px-3 py-2 ${small ? 'text-xs' : 'text-sm'} font-semibold text-on-surface dark:text-white outline-none focus:border-primary/50 tabular-nums`} />
  </div>
);

const Result: React.FC<{ rows: [string, string, 'good' | 'bad' | 'neutral'][]; note: string }> = ({ rows, note }) => (
  <div className="rounded-2xl border border-outline-variant/10 dark:border-white/5 overflow-hidden">
    {rows.map(([k, v, tone], i) => (
      <div key={k} className={`flex items-center justify-between px-4 py-2.5 ${i > 0 ? 'border-t border-outline-variant/10 dark:border-white/5' : ''} ${i % 2 ? 'bg-surface-container-low/50 dark:bg-white/[0.02]' : ''}`}>
        <span className="text-xs font-semibold text-on-surface-variant dark:text-slate-400">{k}</span>
        <span className={`text-sm font-black tabular-nums ${tone === 'good' ? 'text-emerald-600 dark:text-emerald-400' : tone === 'bad' ? 'text-error dark:text-[#ffb4ab]' : 'text-on-surface dark:text-white'}`}>{v}</span>
      </div>
    ))}
    <div className="px-4 py-2.5 bg-primary/5 dark:bg-[#a7c8ff]/10 border-t border-primary/15 dark:border-[#a7c8ff]/15"><p className="text-[11px] text-on-surface-variant dark:text-slate-300 leading-relaxed">{note}</p></div>
  </div>
);

export default ScenarioPlannerModal;
