import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useFinanceStore } from '../store/useFinanceStore';
import { zakatPenghasilan, haulDueDate, readGoldPrice } from './zakatUtils';

const rp = (n: number) => 'Rp ' + Math.round(n).toLocaleString('id-ID');

const ZakatPenghasilanModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const settings = useFinanceStore((s) => s.settings);
  const goldPrice = readGoldPrice(settings);
  const incomeSetting = Number(settings.find((s) => s.key === 'monthlyIncome')?.value) || 0;

  const [income, setIncome] = useState(incomeSetting || 10_000_000);
  const [method, setMethod] = useState<'bruto' | 'neto'>('bruto');
  const [basicNeeds, setBasicNeeds] = useState(0);
  const [haulStart, setHaulStart] = useState('');

  const r = useMemo(() => zakatPenghasilan({ monthlyIncome: income, method, basicNeeds, goldPrice }), [income, method, basicNeeds, goldPrice]);
  const haulDue = haulStart ? haulDueDate(haulStart) : '';

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-start sm:items-center justify-center p-2 sm:p-4 overflow-y-auto">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />
        <motion.div initial={{ opacity: 0, scale: 0.97, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97, y: 20 }}
          transition={{ type: 'spring', damping: 28, stiffness: 240 }}
          className="relative w-full max-w-md my-auto bg-surface dark:bg-[#121416] rounded-3xl shadow-2xl border border-outline-variant/20 dark:border-white/10 max-h-[94vh] overflow-y-auto custom-scrollbar">
          <div className="sticky top-0 z-10 flex items-center justify-between px-5 sm:px-6 py-4 bg-surface/95 dark:bg-[#121416]/95 backdrop-blur border-b border-outline-variant/10 dark:border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-primary/10 dark:bg-[#a7c8ff]/15 flex items-center justify-center text-primary dark:text-[#a7c8ff]"><span className="material-symbols-outlined">volunteer_activism</span></div>
              <div>
                <h2 className="text-lg font-black font-headline text-on-surface dark:text-white leading-none">Zakat Penghasilan</h2>
                <p className="text-[11px] text-on-surface-variant dark:text-slate-400 mt-1">Zakat profesi 2,5% + pelacak haul</p>
              </div>
            </div>
            <button onClick={onClose} className="w-9 h-9 rounded-full bg-surface-container dark:bg-white/5 flex items-center justify-center text-on-surface dark:text-white cursor-pointer"><span className="material-symbols-outlined text-lg">close</span></button>
          </div>

          <div className="p-5 sm:p-6 space-y-4">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-on-surface-variant dark:text-slate-400">Penghasilan / bulan</label>
              <input type="number" value={income} step={1_000_000} onChange={(e) => setIncome(Number(e.target.value) || 0)}
                className="w-full bg-surface-container-low dark:bg-white/5 border border-outline-variant/10 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm font-semibold text-on-surface dark:text-white outline-none focus:border-primary/50 tabular-nums" />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-on-surface-variant dark:text-slate-400">Dasar perhitungan</label>
              <div className="flex bg-surface-container-low dark:bg-white/5 rounded-xl p-0.5">
                <button onClick={() => setMethod('bruto')} className={`flex-1 py-2 rounded-lg text-xs font-bold ${method === 'bruto' ? 'bg-white dark:bg-primary-container text-primary dark:text-white shadow-sm' : 'text-on-surface-variant'}`}>Bruto (kotor)</button>
                <button onClick={() => setMethod('neto')} className={`flex-1 py-2 rounded-lg text-xs font-bold ${method === 'neto' ? 'bg-white dark:bg-primary-container text-primary dark:text-white shadow-sm' : 'text-on-surface-variant'}`}>Neto (stlh kebutuhan pokok)</button>
              </div>
            </div>
            {method === 'neto' && (
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-on-surface-variant dark:text-slate-400">Kebutuhan pokok / bulan</label>
                <input type="number" value={basicNeeds} step={500_000} onChange={(e) => setBasicNeeds(Number(e.target.value) || 0)}
                  className="w-full bg-surface-container-low dark:bg-white/5 border border-outline-variant/10 dark:border-white/10 rounded-xl px-3 py-2 text-sm font-semibold text-on-surface dark:text-white outline-none focus:border-primary/50 tabular-nums" />
              </div>
            )}

            <div className="rounded-2xl border border-outline-variant/10 dark:border-white/5 overflow-hidden">
              <div className="flex justify-between px-4 py-2.5 border-b border-outline-variant/10 dark:border-white/5"><span className="text-xs font-semibold text-on-surface-variant dark:text-slate-400">Nisab (85 g emas/th)</span><span className="text-sm font-semibold tabular-nums text-on-surface dark:text-slate-300">{rp(r.nisabAnnual)}</span></div>
              <div className="flex justify-between px-4 py-2.5 border-b border-outline-variant/10 dark:border-white/5"><span className="text-xs font-semibold text-on-surface-variant dark:text-slate-400">Status</span><span className={`text-xs font-black ${r.wajib ? 'text-emerald-600 dark:text-emerald-400' : 'text-on-surface-variant'}`}>{r.wajib ? 'Wajib zakat ✓' : 'Belum wajib (< nisab)'}</span></div>
              <div className="bg-primary/5 dark:bg-[#a7c8ff]/10 px-4 py-3">
                <div className="flex justify-between items-center"><span className="text-sm font-black text-on-surface dark:text-white">Zakat / bulan</span><span className="text-lg font-black text-primary dark:text-[#a7c8ff] tabular-nums">{rp(r.monthlyZakat)}</span></div>
                <div className="flex justify-between items-center mt-1"><span className="text-[11px] text-on-surface-variant dark:text-slate-400">Setahun</span><span className="text-xs font-bold text-on-surface-variant dark:text-slate-300 tabular-nums">{rp(r.annualZakat)}</span></div>
              </div>
            </div>

            {/* Haul tracker */}
            <div className="rounded-2xl bg-surface-container-low dark:bg-white/5 border border-outline-variant/10 dark:border-white/5 p-4 space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-wide text-on-surface-variant dark:text-slate-400">Pelacak Haul (zakat maal)</p>
              <label className="text-[11px] text-on-surface-variant dark:text-slate-400">Tanggal harta mencapai nisab</label>
              <input type="date" value={haulStart} onChange={(e) => setHaulStart(e.target.value)}
                className="w-full bg-surface dark:bg-white/5 border border-outline-variant/10 dark:border-white/10 rounded-xl px-3 py-2 text-sm font-semibold text-on-surface dark:text-white outline-none focus:border-primary/50" />
              {haulDue && <p className="text-[13px] text-on-surface dark:text-white">🗓️ Haul jatuh sekitar <b className="text-primary dark:text-[#a7c8ff]">{haulDue}</b> (± 1 tahun Hijriah / 354 hari). Zakat maal 2,5% wajib jika harta masih ≥ nisab.</p>}
            </div>

            <div className="rounded-xl bg-primary/5 dark:bg-[#a7c8ff]/10 border border-primary/15 dark:border-[#a7c8ff]/15 p-3">
              <p className="text-[11px] leading-relaxed text-on-surface-variant dark:text-slate-300">
                Ada dua pendapat: zakat dari <b>bruto</b> (lebih hati-hati) atau <b>neto</b> (setelah kebutuhan pokok & utang). Keduanya sah menurut sebagian ulama. Salurkan via lembaga resmi (BAZNAS/LAZ) — juga menjadi pengurang PPh. Edukasi umum, bukan fatwa.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default ZakatPenghasilanModal;
