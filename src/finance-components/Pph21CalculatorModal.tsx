import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useFinanceStore } from '../store/useFinanceStore';
import { computePph21, ptkp, TAX_YEAR, type Pph21Input } from './pph21Utils';

const rp = (n: number) => (n < 0 ? '−Rp ' : 'Rp ') + Math.round(Math.abs(n)).toLocaleString('id-ID');

const Pph21CalculatorModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const settings = useFinanceStore((s) => s.settings);
  const monthlyIncomeSetting = Number(settings.find((s) => s.key === 'monthlyIncome')?.value) || 0;

  const [tab, setTab] = useState<'hitung' | 'rencana'>('hitung');
  const [monthlyGross, setMonthlyGross] = useState(monthlyIncomeSetting || 10_000_000);
  const [married, setMarried] = useState(false);
  const [dependents, setDependents] = useState(0);
  const [monthlyPension, setMonthlyPension] = useState(0);
  const [zakat, setZakat] = useState(0);
  const [monthlyWithheld, setMonthlyWithheld] = useState(0);

  const input: Pph21Input = {
    grossAnnual: monthlyGross * 12, married, dependents,
    pensionContribution: monthlyPension * 12, zakat, monthlyWithheld,
  };
  const r = useMemo(() => computePph21(input), [monthlyGross, married, dependents, monthlyPension, zakat, monthlyWithheld]);
  const ptkpCode = `${married ? 'K' : 'TK'}/${Math.min(3, dependents)}`;

  // F6.4 — dampak pengurang legal (marginal): berapa pajak turun per +Rp1jt zakat & pensiun
  const savePerJutaZakat = useMemo(() => {
    const withMore = computePph21({ ...input, zakat: zakat + 1_000_000 });
    return r.tax - withMore.tax;
  }, [r, input, zakat]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-start sm:items-center justify-center p-2 sm:p-4 overflow-y-auto">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />
        <motion.div initial={{ opacity: 0, scale: 0.97, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97, y: 20 }}
          transition={{ type: 'spring', damping: 28, stiffness: 240 }}
          className="relative w-full max-w-lg my-auto bg-surface dark:bg-[#121416] rounded-3xl shadow-2xl border border-outline-variant/20 dark:border-white/10 max-h-[94vh] overflow-y-auto custom-scrollbar">
          <div className="sticky top-0 z-10 flex items-center justify-between px-5 sm:px-6 py-4 bg-surface/95 dark:bg-[#121416]/95 backdrop-blur border-b border-outline-variant/10 dark:border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-primary/10 dark:bg-[#a7c8ff]/15 flex items-center justify-center text-primary dark:text-[#a7c8ff]"><span className="material-symbols-outlined">receipt_long</span></div>
              <div>
                <h2 className="text-lg font-black font-headline text-on-surface dark:text-white leading-none">Estimator PPh 21</h2>
                <p className="text-[11px] text-on-surface-variant dark:text-slate-400 mt-1">Pajak penghasilan pribadi · tahun {TAX_YEAR}</p>
              </div>
            </div>
            <button onClick={onClose} className="w-9 h-9 rounded-full bg-surface-container dark:bg-white/5 flex items-center justify-center text-on-surface dark:text-white cursor-pointer"><span className="material-symbols-outlined text-lg">close</span></button>
          </div>

          <div className="p-5 sm:p-6 space-y-4">
            <div className="flex bg-surface-container dark:bg-white/5 rounded-xl p-0.5">
              {(['hitung', 'rencana'] as const).map((t) => (
                <button key={t} onClick={() => setTab(t)} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${tab === t ? 'bg-white dark:bg-primary-container text-primary dark:text-white shadow-sm' : 'text-on-surface-variant dark:text-outline'}`}>
                  {t === 'hitung' ? 'Hitung Pajak' : 'Perencanaan'}
                </button>
              ))}
            </div>

            {tab === 'hitung' ? (
              <>
                <NumInput label="Penghasilan bruto / bulan" value={monthlyGross} setValue={setMonthlyGross} step={1_000_000} />
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-on-surface-variant dark:text-slate-400">Status kawin</label>
                    <div className="flex bg-surface-container-low dark:bg-white/5 rounded-xl p-0.5">
                      <button onClick={() => setMarried(false)} className={`flex-1 py-1.5 rounded-lg text-xs font-bold ${!married ? 'bg-white dark:bg-primary-container text-primary dark:text-white shadow-sm' : 'text-on-surface-variant'}`}>TK</button>
                      <button onClick={() => setMarried(true)} className={`flex-1 py-1.5 rounded-lg text-xs font-bold ${married ? 'bg-white dark:bg-primary-container text-primary dark:text-white shadow-sm' : 'text-on-surface-variant'}`}>Kawin</button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-on-surface-variant dark:text-slate-400">Tanggungan (maks 3)</label>
                    <div className="flex bg-surface-container-low dark:bg-white/5 rounded-xl p-0.5">
                      {[0, 1, 2, 3].map((d) => (
                        <button key={d} onClick={() => setDependents(d)} className={`flex-1 py-1.5 rounded-lg text-xs font-bold ${dependents === d ? 'bg-white dark:bg-primary-container text-primary dark:text-white shadow-sm' : 'text-on-surface-variant'}`}>{d}</button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <NumInput label="Iuran pensiun/JHT / bln" value={monthlyPension} setValue={setMonthlyPension} step={100_000} small />
                  <NumInput label="PPh dipotong / bln" value={monthlyWithheld} setValue={setMonthlyWithheld} step={100_000} small />
                </div>
                <NumInput label="Zakat via lembaga resmi / th (pengurang)" value={zakat} setValue={setZakat} step={1_000_000} small />

                {/* Result */}
                <div className="rounded-2xl border border-outline-variant/10 dark:border-white/5 overflow-hidden">
                  <Row k={`Penghasilan bruto (setahun)`} v={rp(r.gross)} />
                  <Row k="− Biaya jabatan (5%, maks 6jt)" v={rp(-r.biayaJabatan)} />
                  {r.pension > 0 && <Row k="− Iuran pensiun/JHT" v={rp(-r.pension)} />}
                  {r.zakat > 0 && <Row k="− Zakat (lembaga resmi)" v={rp(-r.zakat)} />}
                  <Row k={`− PTKP (${ptkpCode})`} v={rp(-r.ptkp)} />
                  <Row k="Penghasilan Kena Pajak (PKP)" v={rp(r.pkp)} bold />
                  <div className="bg-primary/5 dark:bg-[#a7c8ff]/10 border-t border-primary/15 dark:border-[#a7c8ff]/15 px-4 py-3 flex items-center justify-between">
                    <span className="text-sm font-black text-on-surface dark:text-white">PPh 21 terutang / tahun</span>
                    <span className="text-lg font-black text-primary dark:text-[#a7c8ff] tabular-nums">{rp(r.tax)}</span>
                  </div>
                </div>

                {/* Bracket breakdown */}
                {r.brackets.length > 0 && (
                  <div className="text-[11px] text-on-surface-variant dark:text-slate-400 space-y-1">
                    <p className="font-bold uppercase tracking-wide">Rincian lapisan tarif</p>
                    {r.brackets.map((b, i) => (
                      <div key={i} className="flex justify-between"><span>{b.range} @ {(b.rate * 100).toFixed(0)}%</span><span className="tabular-nums">{rp(b.tax)}</span></div>
                    ))}
                    <div className="flex justify-between pt-1 border-t border-outline-variant/10 dark:border-white/5"><span>Tarif efektif</span><span className="tabular-nums">{(r.effectiveRate * 100).toFixed(1)}% dari bruto</span></div>
                  </div>
                )}

                {/* Reconciliation */}
                {monthlyWithheld > 0 && (
                  <div className={`rounded-xl p-3 border ${r.balance > 0 ? 'bg-error/5 border-error/25' : 'bg-emerald-500/5 border-emerald-500/25'}`}>
                    <p className="text-[12px] text-on-surface-variant dark:text-slate-300">
                      Dipotong setahun {rp(r.annualWithheld)} vs terutang {rp(r.tax)} → {r.balance > 0
                        ? <b className="text-error dark:text-[#ffb4ab]">kurang bayar {rp(r.balance)}</b>
                        : <b className="text-emerald-600 dark:text-emerald-400">lebih bayar {rp(-r.balance)}</b>}.
                    </p>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="rounded-2xl bg-emerald-500/5 border border-emerald-500/25 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">Dampak pengurang legal</p>
                  <p className="text-sm text-on-surface dark:text-white mt-1.5 leading-relaxed">
                    Setiap <b>Rp1.000.000</b> zakat/sumbangan via lembaga resmi (atau iuran pensiun) menurunkan PPh Anda sekitar
                    <b className="text-emerald-600 dark:text-emerald-400"> {rp(savePerJutaZakat)}</b> — sesuai lapisan tarif marginal Anda ({(r.brackets.at(-1)?.rate ?? 0) * 100 || 5}%).
                  </p>
                </div>
                <ul className="space-y-2 text-[13px] text-on-surface-variant dark:text-slate-300">
                  {[
                    ['savings', 'Zakat/sumbangan keagamaan wajib via lembaga resmi (BAZNAS/LAZ) = pengurang penghasilan bruto.'],
                    ['elderly', 'Iuran pensiun/JHT & DPLK bagian karyawan mengurangi penghasilan neto.'],
                    ['redeem', 'THR/bonus menambah bruto — bisa mendorong ke lapisan tarif lebih tinggi; siapkan kasnya.'],
                    ['event', 'Tenggat SPT Tahunan OP: 31 Maret. Siapkan bukti potong 1721-A1 & daftar harta.'],
                  ].map(([ic, txt]) => (
                    <li key={txt} className="flex gap-2.5"><span className="material-symbols-outlined text-primary dark:text-[#a7c8ff] text-[19px] shrink-0">{ic}</span>{txt}</li>
                  ))}
                </ul>
                <p className="text-[11px] text-on-surface-variant/70 dark:text-slate-500">Perencanaan pajak legal (tax planning) ≠ penggelapan pajak. Ini edukasi umum.</p>
              </>
            )}

            <p className="text-[10px] text-on-surface-variant/60 dark:text-slate-500">Estimasi tahun pajak {TAX_YEAR} (UU HPP), bukan perhitungan resmi. Verifikasi & lapor via DJP Online / konsultan pajak.</p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

const NumInput: React.FC<{ label: string; value: number; setValue: (n: number) => void; step?: number; small?: boolean }> = ({ label, value, setValue, step = 1, small }) => (
  <div className="space-y-1">
    <label className="text-[11px] font-bold text-on-surface-variant dark:text-slate-400">{label}</label>
    <input type="number" value={value} step={step} onChange={(e) => setValue(Number(e.target.value) || 0)}
      className={`w-full bg-surface-container-low dark:bg-white/5 border border-outline-variant/10 dark:border-white/10 rounded-xl px-3 py-2 ${small ? 'text-xs' : 'text-sm'} font-semibold text-on-surface dark:text-white outline-none focus:border-primary/50 tabular-nums`} />
  </div>
);

const Row: React.FC<{ k: string; v: string; bold?: boolean }> = ({ k, v, bold }) => (
  <div className={`flex items-center justify-between px-4 py-2.5 border-b border-outline-variant/10 dark:border-white/5 ${bold ? 'bg-surface-container-low/60 dark:bg-white/[0.03]' : ''}`}>
    <span className={`text-xs ${bold ? 'font-black text-on-surface dark:text-white' : 'font-semibold text-on-surface-variant dark:text-slate-400'}`}>{k}</span>
    <span className={`text-sm tabular-nums ${bold ? 'font-black text-on-surface dark:text-white' : 'font-semibold text-on-surface dark:text-slate-300'}`}>{v}</span>
  </div>
);

export default Pph21CalculatorModal;
