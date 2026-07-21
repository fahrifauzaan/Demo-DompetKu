import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { parseDateSafe } from './calendarUtils';
import {
  amortizationScheduleFlat,
  amortizationScheduleEffective,
  flatToEffective,
  effectiveToFlat,
  approxFlatToEffective,
} from './amortizationUtils';

interface DebtLike {
  name: string;
  type?: string;
  balance: number;
  originalAmount?: number;
  interestRate: number;
  interestType?: string;
  startDate?: string;
  endDate?: string;
}

interface DebtAmortizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  debt: DebtLike | null;
}

const formatRp = (n: number) => `Rp ${Math.round(n || 0).toLocaleString('id-ID')}`;
const parseDigits = (s: string) => Number(s.replace(/\D/g, '')) || 0;

function deriveMonths(start?: string, end?: string): number {
  const s = parseDateSafe(start);
  const e = parseDateSafe(end);
  if (s && e && e.getTime() > s.getTime()) {
    return Math.max(1, Math.round((e.getTime() - s.getTime()) / (30.44 * 86400000)));
  }
  return 12;
}

export const DebtAmortizationModal: React.FC<DebtAmortizationModalProps> = ({ isOpen, onClose, debt }) => {
  const debtIsFlat = !debt?.interestType || /flat|fixed/i.test(debt?.interestType || '');

  const [principal, setPrincipal] = useState(0);
  const [months, setMonths] = useState(12);
  const [flatRate, setFlatRate] = useState(0);
  const [effRate, setEffRate] = useState(0);
  const [scheduleMode, setScheduleMode] = useState<'flat' | 'effective'>('flat');

  useEffect(() => {
    if (!isOpen || !debt) return;
    const p = debt.originalAmount && debt.originalAmount > 0 ? debt.originalAmount : debt.balance;
    const n = deriveMonths(debt.startDate, debt.endDate);
    setPrincipal(p);
    setMonths(n);
    if (debtIsFlat) {
      setFlatRate(debt.interestRate);
      setEffRate(flatToEffective(debt.interestRate, n));
      setScheduleMode('flat');
    } else {
      setEffRate(debt.interestRate);
      setFlatRate(effectiveToFlat(debt.interestRate, n));
      setScheduleMode('effective');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, debt]);

  // Cross-update converter (dihitung di handler → tanpa loop useEffect)
  const onFlatChange = (v: number) => { setFlatRate(v); setEffRate(flatToEffective(v, months)); };
  const onEffChange = (v: number) => { setEffRate(v); setFlatRate(effectiveToFlat(v, months)); };
  const onMonthsChange = (v: number) => {
    const n = Math.max(1, Math.min(600, v));
    setMonths(n);
    setEffRate(flatToEffective(flatRate, n)); // flat sbg anchor
  };

  const schedule = useMemo(() => {
    if (principal <= 0 || months <= 0) return { rows: [], monthlyPayment: 0, totalInterest: 0, totalPaid: 0 };
    return scheduleMode === 'flat'
      ? amortizationScheduleFlat(principal, flatRate, months)
      : amortizationScheduleEffective(principal, effRate, months);
  }, [principal, months, flatRate, effRate, scheduleMode]);

  const approxEff = useMemo(() => approxFlatToEffective(flatRate, months), [flatRate, months]);

  if (!isOpen || !debt) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[110] flex items-start sm:items-center justify-center p-2 sm:p-4 overflow-y-auto">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />

        <motion.div
          initial={{ opacity: 0, scale: 0.97, y: 30 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97, y: 30 }}
          transition={{ type: 'spring', damping: 28, stiffness: 240 }}
          className="relative w-full max-w-3xl my-auto bg-surface dark:bg-[#121416] rounded-3xl sm:rounded-[32px] shadow-2xl border border-outline-variant/20 dark:border-white/10 max-h-[96vh] sm:max-h-[92vh] overflow-y-auto custom-scrollbar"
        >
          {/* Header */}
          <div className="sticky top-0 z-10 flex items-center justify-between gap-3 px-5 sm:px-7 py-4 bg-surface/95 dark:bg-[#121416]/95 backdrop-blur border-b border-outline-variant/10 dark:border-white/5">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-2xl bg-primary/10 dark:bg-[#a7c8ff]/15 flex items-center justify-center text-primary dark:text-[#a7c8ff] shrink-0">
                <span className="material-symbols-outlined text-2xl">table_chart</span>
              </div>
              <div className="min-w-0">
                <h2 className="text-lg sm:text-xl font-black font-headline text-on-surface dark:text-white truncate">Tabel Amortisasi</h2>
                <p className="text-[10px] sm:text-[11px] text-on-surface-variant dark:text-slate-400 font-bold uppercase tracking-wider truncate">{debt.name}</p>
              </div>
            </div>
            <button onClick={onClose} className="w-9 h-9 rounded-full bg-surface-container hover:bg-surface-container-high dark:bg-white/5 dark:hover:bg-white/10 flex items-center justify-center text-on-surface dark:text-white transition-colors cursor-pointer shrink-0">
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>

          <div className="p-5 sm:p-7 space-y-6">
            {/* Parameter ringkas (editable) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-on-surface-variant dark:text-slate-400">Pokok Pinjaman</label>
                <div className="flex items-center gap-1.5 bg-surface-container-low dark:bg-white/5 px-3 py-2.5 rounded-2xl border border-outline-variant/10 dark:border-white/10 focus-within:border-primary/50">
                  <span className="text-[11px] font-bold text-on-surface-variant dark:text-slate-400">Rp</span>
                  <input type="text" inputMode="numeric" value={principal.toLocaleString('id-ID')}
                    onChange={(e) => setPrincipal(parseDigits(e.target.value))}
                    className="w-full bg-transparent border-none p-0 text-sm font-black text-on-surface dark:text-white tabular-nums outline-none focus:ring-0" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-on-surface-variant dark:text-slate-400">Tenor (bulan)</label>
                <input type="number" min={1} max={600} value={months}
                  onChange={(e) => onMonthsChange(Number(e.target.value))}
                  className="w-full bg-surface-container-low dark:bg-white/5 px-3 py-2.5 rounded-2xl border border-outline-variant/10 dark:border-white/10 text-sm font-black text-on-surface dark:text-white tabular-nums outline-none focus:ring-0 focus:border-primary/50" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-on-surface-variant dark:text-slate-400">Tipe bunga utang</label>
                <div className="px-3 py-2.5 rounded-2xl bg-surface-container-low dark:bg-white/5 border border-outline-variant/10 dark:border-white/10 text-sm font-black text-on-surface dark:text-white truncate">
                  {debt.interestType || 'Fixed/Flat'}
                </div>
              </div>
            </div>

            {/* Konverter bunga flat ↔ efektif */}
            <div className="rounded-2xl border border-outline-variant/15 dark:border-white/10 bg-surface-container-lowest dark:bg-white/[0.02] p-4 sm:p-5 space-y-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-600 dark:text-amber-400 text-lg">sync_alt</span>
                <h3 className="text-sm font-black text-on-surface dark:text-white">Konverter Bunga Flat ↔ Efektif</h3>
              </div>
              <div className="grid grid-cols-2 gap-3 items-center">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wide text-on-surface-variant dark:text-slate-400">Bunga Flat (p.a.)</label>
                  <div className="flex items-center gap-1 bg-surface-container dark:bg-white/5 px-3 py-2 rounded-xl border border-outline-variant/10 dark:border-white/10 focus-within:border-amber-500/60">
                    <input type="number" step={0.1} value={Number(flatRate.toFixed(2))}
                      onChange={(e) => onFlatChange(Number(e.target.value))}
                      className="w-full bg-transparent border-none p-0 text-base font-black text-on-surface dark:text-white tabular-nums outline-none focus:ring-0" />
                    <span className="text-xs font-bold text-on-surface-variant dark:text-slate-400">%</span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wide text-on-surface-variant dark:text-slate-400">≈ Bunga Efektif (p.a.)</label>
                  <div className="flex items-center gap-1 bg-amber-500/5 px-3 py-2 rounded-xl border border-amber-500/30 focus-within:border-amber-500/60">
                    <input type="number" step={0.1} value={Number(effRate.toFixed(2))}
                      onChange={(e) => onEffChange(Number(e.target.value))}
                      className="w-full bg-transparent border-none p-0 text-base font-black text-amber-700 dark:text-amber-300 tabular-nums outline-none focus:ring-0" />
                    <span className="text-xs font-bold text-amber-600/70 dark:text-amber-400/70">%</span>
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-on-surface-variant dark:text-slate-400 leading-relaxed">
                Bunga flat <strong className="text-on-surface dark:text-white">{flatRate.toFixed(2)}%</strong> pada tenor {months} bulan setara bunga efektif{' '}
                <strong className="text-amber-700 dark:text-amber-300">≈ {effRate.toFixed(2)}%</strong> p.a. (aproksimasi cepat ≈ {approxEff.toFixed(1)}%). Inilah biaya bunga sesungguhnya.
              </p>
            </div>

            {/* Toggle mode jadwal */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex bg-surface-container-low dark:bg-black/30 p-1 rounded-xl border border-outline-variant/10">
                <button onClick={() => setScheduleMode('flat')}
                  className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${scheduleMode === 'flat' ? 'bg-white dark:bg-[#2c3033] shadow text-primary dark:text-[#a7c8ff]' : 'text-on-surface-variant dark:text-slate-400'}`}>
                  Skema Flat
                </button>
                <button onClick={() => setScheduleMode('effective')}
                  className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${scheduleMode === 'effective' ? 'bg-white dark:bg-[#2c3033] shadow text-primary dark:text-[#a7c8ff]' : 'text-on-surface-variant dark:text-slate-400'}`}>
                  Skema Efektif (Anuitas)
                </button>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold uppercase tracking-wide text-on-surface-variant dark:text-slate-400">Angsuran / bulan</p>
                <p className="text-base font-black text-on-surface dark:text-white tabular-nums">{formatRp(schedule.monthlyPayment)}</p>
              </div>
            </div>

            {debtIsFlat && (
              <div className="flex items-start gap-2 rounded-2xl bg-amber-500/10 border border-amber-500/25 p-3">
                <span className="material-symbols-outlined text-[16px] text-amber-600 dark:text-amber-400 mt-px shrink-0">lightbulb</span>
                <p className="text-[11px] text-amber-800 dark:text-amber-200 leading-relaxed">
                  Utang ini berbunga <strong>flat</strong>. Total bunga yang Anda bayar tetap besar walau angka "{flatRate.toFixed(1)}%" terlihat kecil — setara <strong>≈ {effRate.toFixed(1)}% efektif</strong>. Bandingkan kedua skema di tabel.
                </p>
              </div>
            )}

            {/* Tabel amortisasi */}
            <div className="rounded-2xl border border-outline-variant/10 dark:border-white/5 overflow-hidden">
              <div className="overflow-x-auto max-h-[340px] overflow-y-auto custom-scrollbar">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-surface-container dark:bg-[#1b1e21] z-10">
                    <tr className="text-on-surface-variant dark:text-slate-400 text-[10px] uppercase tracking-wide">
                      <th className="px-3 py-2.5 text-left font-black">#</th>
                      <th className="px-3 py-2.5 text-right font-black">Angsuran</th>
                      <th className="px-3 py-2.5 text-right font-black">Pokok</th>
                      <th className="px-3 py-2.5 text-right font-black">Bunga</th>
                      <th className="px-3 py-2.5 text-right font-black">Sisa Pokok</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/10 dark:divide-white/5">
                    {schedule.rows.map((r) => (
                      <tr key={r.period} className="text-on-surface dark:text-slate-200 hover:bg-surface-container-low/50 dark:hover:bg-white/[0.03]">
                        <td className="px-3 py-2 text-left font-bold tabular-nums">{r.period}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{formatRp(r.payment)}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-emerald-600 dark:text-emerald-400">{formatRp(r.principal)}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-error dark:text-[#ffb4ab]">{formatRp(r.interest)}</td>
                        <td className="px-3 py-2 text-right tabular-nums font-bold">{formatRp(r.balance)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="sticky bottom-0 bg-surface-container dark:bg-[#1b1e21]">
                    <tr className="text-on-surface dark:text-white font-black border-t border-outline-variant/20 dark:border-white/10">
                      <td className="px-3 py-2.5 text-left">Total</td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{formatRp(schedule.totalPaid)}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-emerald-600 dark:text-emerald-400">{formatRp(principal)}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-error dark:text-[#ffb4ab]">{formatRp(schedule.totalInterest)}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums">Rp 0</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Disclaimer */}
            <div className="flex items-start gap-2 rounded-2xl bg-surface-container-low dark:bg-white/[0.03] border border-outline-variant/10 dark:border-white/5 p-3">
              <span className="material-symbols-outlined text-[15px] text-on-surface-variant dark:text-slate-400 mt-px shrink-0">info</span>
              <p className="text-[10.5px] text-on-surface-variant dark:text-slate-400 leading-relaxed">
                Hasil ini <strong>simulasi matematis</strong> (asumsi angsuran tetap tiap bulan). Angka dari bank bisa berbeda karena biaya admin, asuransi, provisi, atau pembulatan. Gunakan sebagai pembanding edukatif, bukan tagihan resmi.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default DebtAmortizationModal;
