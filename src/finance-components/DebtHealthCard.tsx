import React, { useMemo } from 'react';
import { useFinanceStore } from '../store/useFinanceStore';
import { simulatePayoff, debtToIncome, debtFreeMonth } from './debtStrategyUtils';

/**
 * Fase 7 — Kartu Kesehatan Utang. Melengkapi DebtSimulatorModal (yang sudah membandingkan Snowball/
 * Avalanche interaktif) dengan yang belum ada: DTI, TANGGAL bebas-utang, dan URUTAN pelunasan.
 */

const rpS = (n: number) => {
  const a = Math.abs(n);
  if (a >= 1e9) return 'Rp ' + (n / 1e9).toFixed(2).replace(/\.?0+$/, '') + 'M';
  if (a >= 1e6) return 'Rp ' + (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'jt';
  return 'Rp ' + Math.round(n).toLocaleString('id-ID');
};
const MONTHS_ID = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];
const fmtMonth = (ym: string) => { const [y, m] = ym.split('-'); return `${MONTHS_ID[Number(m) - 1]} ${y}`; };

const DebtHealthCard: React.FC<{ extraPayment?: number }> = ({ extraPayment = 0 }) => {
  const debts = useFinanceStore((s) => s.debts);
  const settings = useFinanceStore((s) => s.settings);
  const monthlyIncome = Number(settings.find((s) => s.key === 'monthlyIncome')?.value) || 0;

  const active = useMemo(() => debts.filter((d) => (d.balance || 0) > 0), [debts]);
  const dti = debtToIncome(debts, monthlyIncome);
  const avalanche = useMemo(() => (active.length ? simulatePayoff(active, extraPayment, 'avalanche') : null), [active, extraPayment]);

  if (active.length === 0) return null;

  const dtiColor = dti <= 0.35 ? 'text-emerald-600 dark:text-emerald-400' : dti <= 0.45 ? 'text-amber-600 dark:text-amber-400' : 'text-error dark:text-[#ffb4ab]';
  const dtiBar = dti <= 0.35 ? 'bg-emerald-500' : dti <= 0.45 ? 'bg-amber-500' : 'bg-error';

  return (
    <div className="liquid-glass rounded-2xl sm:rounded-[28px] border border-white/20 dark:border-white/10 p-4 sm:p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)]">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-2xl bg-primary/10 dark:bg-[#a7c8ff]/15 flex items-center justify-center text-primary dark:text-[#a7c8ff]"><span className="material-symbols-outlined">health_and_safety</span></div>
        <div><h3 className="text-base font-black font-headline text-on-surface dark:text-white leading-none">Kesehatan Utang</h3><p className="text-[11px] text-on-surface-variant dark:text-slate-400 mt-1">DTI · perkiraan bebas-utang · urutan lunas</p></div>
      </div>

      {/* DTI */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-[11px] font-bold uppercase tracking-wide text-on-surface-variant dark:text-slate-400">Rasio Cicilan / Penghasilan</span>
          <span className={`text-sm font-black tabular-nums ${monthlyIncome > 0 ? dtiColor : 'text-on-surface-variant'}`}>{monthlyIncome > 0 ? (dti * 100).toFixed(0) + '%' : 'atur gaji di Pengaturan'}</span>
        </div>
        <div className="h-2 rounded-full bg-surface-container dark:bg-white/10 overflow-hidden"><div className={`h-full rounded-full ${dtiBar}`} style={{ width: `${Math.min(100, dti * 100)}%` }} /></div>
        <p className="text-[10px] text-on-surface-variant/70 dark:text-slate-500 mt-1">Sehat ≤ 35% · waspada 36–45% · bahaya &gt; 45%</p>
      </div>

      {avalanche && avalanche.feasible ? (
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-primary/5 dark:bg-[#a7c8ff]/10 border border-primary/15 dark:border-[#a7c8ff]/15 p-3">
            <p className="text-[10px] font-bold uppercase tracking-wide text-primary dark:text-[#a7c8ff]">Perkiraan bebas utang</p>
            <p className="text-base font-black text-primary dark:text-[#a7c8ff] mt-1">{fmtMonth(debtFreeMonth(avalanche.months, new Date()))}</p>
            <p className="text-[10px] text-on-surface-variant/70 dark:text-slate-500 mt-0.5">{avalanche.months} bln (metode avalanche{extraPayment > 0 ? ' + ekstra' : ', bayar minimum'})</p>
          </div>
          <div className="rounded-2xl bg-surface-container-low dark:bg-white/5 border border-outline-variant/10 dark:border-white/5 p-3">
            <p className="text-[10px] font-bold uppercase tracking-wide text-on-surface-variant dark:text-slate-400">Total bunga</p>
            <p className="text-base font-black text-on-surface dark:text-white mt-1 tabular-nums">{rpS(avalanche.totalInterest)}</p>
            <p className="text-[10px] text-on-surface-variant/70 dark:text-slate-500 mt-0.5 truncate">urutan: {avalanche.order.join(' → ')}</p>
          </div>
        </div>
      ) : avalanche && !avalanche.feasible ? (
        <div className="rounded-xl bg-error/5 border border-error/25 p-3 text-[12px] text-error dark:text-[#ffb4ab]">Dengan pembayaran minimum saja, cicilan tak menutup bunga — utang tak akan lunas. Buka "Simulasi Akselerasi" untuk cari ekstra bayar yang diperlukan.</div>
      ) : null}
      <p className="text-[10px] text-on-surface-variant/60 dark:text-slate-500 mt-3">Perkiraan dari saldo, bunga &amp; minimum utang Anda. Untuk banding Snowball vs Avalanche interaktif, buka "Simulasi Akselerasi". Edukasi, bukan nasihat.</p>
    </div>
  );
};

export default DebtHealthCard;
