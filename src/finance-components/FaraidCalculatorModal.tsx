import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { computeFaraid, type FaraidInput } from './faraidUtils';

const rp = (n: number) => 'Rp ' + Math.round(n).toLocaleString('id-ID');

const FaraidCalculatorModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const [estate, setEstate] = useState(1_000_000_000);
  const [spouse, setSpouse] = useState<FaraidInput['spouse']>('istri');
  const [father, setFather] = useState(true);
  const [mother, setMother] = useState(true);
  const [sons, setSons] = useState(1);
  const [daughters, setDaughters] = useState(1);

  const r = computeFaraid({ estate, spouse, father, mother, sons, daughters });
  if (!isOpen) return null;

  const Counter: React.FC<{ label: string; value: number; set: (n: number) => void }> = ({ label, value, set }) => (
    <div className="space-y-1">
      <label className="text-[11px] font-bold text-on-surface-variant dark:text-slate-400">{label}</label>
      <div className="flex items-center gap-2">
        <button onClick={() => set(Math.max(0, value - 1))} className="w-8 h-8 rounded-lg bg-surface-container dark:bg-white/10 text-on-surface dark:text-white font-black cursor-pointer">−</button>
        <span className="flex-1 text-center text-sm font-black text-on-surface dark:text-white tabular-nums">{value}</span>
        <button onClick={() => set(value + 1)} className="w-8 h-8 rounded-lg bg-surface-container dark:bg-white/10 text-on-surface dark:text-white font-black cursor-pointer">+</button>
      </div>
    </div>
  );

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-start sm:items-center justify-center p-2 sm:p-4 overflow-y-auto">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />
        <motion.div initial={{ opacity: 0, scale: 0.97, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97, y: 20 }}
          transition={{ type: 'spring', damping: 28, stiffness: 240 }}
          className="relative w-full max-w-lg my-auto bg-surface dark:bg-[#121416] rounded-3xl shadow-2xl border border-outline-variant/20 dark:border-white/10 max-h-[94vh] overflow-y-auto custom-scrollbar">
          <div className="sticky top-0 z-10 flex items-center justify-between px-5 sm:px-6 py-4 bg-surface/95 dark:bg-[#121416]/95 backdrop-blur border-b border-outline-variant/10 dark:border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-primary/10 dark:bg-[#a7c8ff]/15 flex items-center justify-center text-primary dark:text-[#a7c8ff]"><span className="material-symbols-outlined">diversity_3</span></div>
              <div>
                <h2 className="text-lg font-black font-headline text-on-surface dark:text-white leading-none">Kalkulator Waris (Faraid)</h2>
                <p className="text-[11px] text-on-surface-variant dark:text-slate-400 mt-1">Estimasi pembagian · struktur keluarga umum</p>
              </div>
            </div>
            <button onClick={onClose} className="w-9 h-9 rounded-full bg-surface-container dark:bg-white/5 flex items-center justify-center text-on-surface dark:text-white cursor-pointer"><span className="material-symbols-outlined text-lg">close</span></button>
          </div>

          <div className="p-5 sm:p-6 space-y-4">
            {/* Disclaimer atas */}
            <div className="rounded-xl bg-amber-500/5 border border-amber-500/25 p-3 text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">
              <b>Edukasi, bukan fatwa.</b> Cakupan: pasangan, anak, &amp; orang tua. Belum mencakup saudara/i, kakek/nenek, cucu, wasiat, atau utang almarhum. Untuk kasus lain &amp; keputusan final, konsultasikan <b>ahli faraid / KUA / Pengadilan Agama</b>.
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-on-surface-variant dark:text-slate-400">Total harta warisan (setelah utang &amp; wasiat)</label>
              <input type="number" value={estate} step={10_000_000} onChange={(e) => setEstate(Number(e.target.value) || 0)}
                className="w-full bg-surface-container-low dark:bg-white/5 border border-outline-variant/10 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm font-semibold text-on-surface dark:text-white outline-none focus:border-primary/50 tabular-nums" />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-on-surface-variant dark:text-slate-400">Pasangan (yang masih hidup)</label>
              <div className="flex bg-surface-container-low dark:bg-white/5 rounded-xl p-0.5">
                {([['istri', 'Istri'], ['suami', 'Suami'], ['tidak', 'Tidak ada']] as const).map(([v, l]) => (
                  <button key={v} onClick={() => setSpouse(v)} className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold ${spouse === v ? 'bg-white dark:bg-primary-container text-primary dark:text-white shadow-sm' : 'text-on-surface-variant'}`}>{l}</button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setFather(!father)} className={`py-2.5 rounded-xl text-xs font-bold border ${father ? 'bg-primary/10 dark:bg-[#a7c8ff]/15 border-primary/30 text-primary dark:text-[#a7c8ff]' : 'bg-surface-container-low dark:bg-white/5 border-outline-variant/10 dark:border-white/10 text-on-surface-variant'}`}>Ayah {father ? '✓' : '—'}</button>
              <button onClick={() => setMother(!mother)} className={`py-2.5 rounded-xl text-xs font-bold border ${mother ? 'bg-primary/10 dark:bg-[#a7c8ff]/15 border-primary/30 text-primary dark:text-[#a7c8ff]' : 'bg-surface-container-low dark:bg-white/5 border-outline-variant/10 dark:border-white/10 text-on-surface-variant'}`}>Ibu {mother ? '✓' : '—'}</button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Counter label="Anak laki-laki" value={sons} set={setSons} />
              <Counter label="Anak perempuan" value={daughters} set={setDaughters} />
            </div>

            {/* Hasil */}
            {r.outOfScope ? (
              <div className="rounded-xl bg-error/5 border border-error/25 p-3 text-[12px] text-error dark:text-[#ffb4ab]">Tidak ada ahli waris yang didukung dipilih.</div>
            ) : (
              <div className="rounded-2xl border border-outline-variant/10 dark:border-white/5 overflow-hidden">
                {r.shares.map((s, i) => (
                  <div key={i} className={`flex items-center justify-between px-4 py-2.5 ${i > 0 ? 'border-t border-outline-variant/10 dark:border-white/5' : ''}`}>
                    <div><span className="text-sm font-bold text-on-surface dark:text-white">{s.label}</span>{s.note && <span className="text-[10px] text-on-surface-variant/70 dark:text-slate-500 ml-1.5">{s.note}</span>}</div>
                    <div className="text-right"><span className="text-sm font-black text-on-surface dark:text-white tabular-nums">{rp(s.amount)}</span><span className="text-[10px] text-on-surface-variant dark:text-slate-400 ml-1.5">({s.fraction})</span></div>
                  </div>
                ))}
                {(r.usedAwl || r.usedRadd) && (
                  <div className="px-4 py-2 bg-primary/5 dark:bg-[#a7c8ff]/10 border-t border-primary/15 dark:border-[#a7c8ff]/15 text-[11px] text-on-surface-variant dark:text-slate-300">
                    {r.usedAwl && "Total saham > 1 → diberlakukan 'Aul (saham dikecilkan proporsional). "}
                    {r.usedRadd && 'Ada sisa → diberlakukan Radd (dikembalikan ke ahli waris non-pasangan).'}
                  </div>
                )}
              </div>
            )}
            <p className="text-[10px] text-on-surface-variant/60 dark:text-slate-500">Metode ashab al-furud + ashabah. Verifikasi ke ahli faraid sebelum pembagian nyata.</p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default FaraidCalculatorModal;
