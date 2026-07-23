import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { projectDCA, projectDRIP } from './dcaUtils';

const rp = (n: number) => 'Rp ' + Math.round(n).toLocaleString('id-ID');
const rpS = (n: number) => {
  const a = Math.abs(n);
  if (a >= 1e12) return 'Rp ' + (n / 1e12).toFixed(2).replace(/\.?0+$/, '') + 'T';
  if (a >= 1e9) return 'Rp ' + (n / 1e9).toFixed(2).replace(/\.?0+$/, '') + 'M';
  if (a >= 1e6) return 'Rp ' + (n / 1e6).toFixed(0) + 'jt';
  return 'Rp ' + Math.round(n).toLocaleString('id-ID');
};

const NumInput: React.FC<{ label: string; value: number; setValue: (n: number) => void; step?: number; small?: boolean }> = ({ label, value, setValue, step = 1, small }) => (
  <div className="space-y-1">
    <label className="text-[11px] font-bold text-on-surface-variant dark:text-slate-400">{label}</label>
    <input type="number" value={value} step={step} onChange={(e) => setValue(Number(e.target.value) || 0)}
      className={`w-full bg-surface-container-low dark:bg-white/5 border border-outline-variant/10 dark:border-white/10 rounded-xl px-3 py-2 ${small ? 'text-xs' : 'text-sm'} font-semibold text-on-surface dark:text-white outline-none focus:border-primary/50 tabular-nums`} />
  </div>
);

const DcaPlannerModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const [tab, setTab] = useState<'dca' | 'drip'>('dca');
  // DCA
  const [initial, setInitial] = useState(0);
  const [periodic, setPeriodic] = useState(1_000_000);
  const [freq, setFreq] = useState<12 | 52>(12);
  const [years, setYears] = useState(10);
  const [ret, setRet] = useState(8);
  // DRIP
  const [principal, setPrincipal] = useState(100_000_000);
  const [divYield, setDivYield] = useState(4);
  const [priceGrowth, setPriceGrowth] = useState(6);
  const [dripYears, setDripYears] = useState(10);

  const dca = useMemo(() => projectDCA({ initial, periodicAmount: periodic, periodsPerYear: freq, years, annualReturn: ret / 100 }), [initial, periodic, freq, years, ret]);
  const drip = useMemo(() => projectDRIP({ principal, dividendYield: divYield / 100, priceGrowth: priceGrowth / 100, years: dripYears }), [principal, divYield, priceGrowth, dripYears]);
  const chart = dca.points.map((p) => ({ year: p.year, Disetor: Math.round(p.invested), Nilai: Math.round(p.value) }));

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
              <div className="w-10 h-10 rounded-2xl bg-primary/10 dark:bg-[#a7c8ff]/15 flex items-center justify-center text-primary dark:text-[#a7c8ff]"><span className="material-symbols-outlined">savings</span></div>
              <div>
                <h2 className="text-lg font-black font-headline text-on-surface dark:text-white leading-none">Perencana Investasi</h2>
                <p className="text-[11px] text-on-surface-variant dark:text-slate-400 mt-1">DCA (nabung rutin) &amp; DRIP (reinvestasi dividen)</p>
              </div>
            </div>
            <button onClick={onClose} className="w-9 h-9 rounded-full bg-surface-container dark:bg-white/5 flex items-center justify-center text-on-surface dark:text-white cursor-pointer"><span className="material-symbols-outlined text-lg">close</span></button>
          </div>

          <div className="p-5 sm:p-6 space-y-4">
            <div className="flex bg-surface-container dark:bg-white/5 rounded-xl p-0.5">
              {(['dca', 'drip'] as const).map((t) => (
                <button key={t} onClick={() => setTab(t)} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${tab === t ? 'bg-white dark:bg-primary-container text-primary dark:text-white shadow-sm' : 'text-on-surface-variant dark:text-outline'}`}>
                  {t === 'dca' ? 'DCA — Nabung Rutin' : 'DRIP — Reinvestasi'}
                </button>
              ))}
            </div>

            {tab === 'dca' ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <NumInput label="Modal awal" value={initial} setValue={setInitial} step={1_000_000} small />
                  <NumInput label="Setoran / periode" value={periodic} setValue={setPeriodic} step={500_000} small />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-on-surface-variant dark:text-slate-400">Frekuensi</label>
                    <div className="flex bg-surface-container-low dark:bg-white/5 rounded-xl p-0.5">
                      <button onClick={() => setFreq(12)} className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold ${freq === 12 ? 'bg-white dark:bg-primary-container text-primary dark:text-white shadow-sm' : 'text-on-surface-variant'}`}>Bulan</button>
                      <button onClick={() => setFreq(52)} className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold ${freq === 52 ? 'bg-white dark:bg-primary-container text-primary dark:text-white shadow-sm' : 'text-on-surface-variant'}`}>Minggu</button>
                    </div>
                  </div>
                  <NumInput label="Durasi (thn)" value={years} setValue={setYears} small />
                  <NumInput label="Return %/th" value={ret} setValue={setRet} step={0.5} small />
                </div>

                <div className="grid grid-cols-3 gap-2.5">
                  <Tile label="Total disetor" value={rpS(dca.totalInvested)} />
                  <Tile label="Nilai akhir" value={rpS(dca.finalValue)} accent />
                  <Tile label="Keuntungan" value={`+${(dca.gainPct * 100).toFixed(0)}%`} good />
                </div>

                <div className="h-48 -ml-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chart} margin={{ top: 6, right: 8, bottom: 0, left: 6 }}>
                      <defs>
                        <linearGradient id="dcaVal" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#10b981" stopOpacity={0.3} /><stop offset="100%" stopColor="#10b981" stopOpacity={0.02} /></linearGradient>
                      </defs>
                      <XAxis dataKey="year" tickFormatter={(y) => `${y}th`} tick={{ fontSize: 10, fill: 'currentColor' }} axisLine={false} tickLine={false} className="text-on-surface-variant dark:text-slate-400" />
                      <YAxis tickFormatter={rpS} tick={{ fontSize: 9, fill: 'currentColor' }} axisLine={false} tickLine={false} width={42} className="text-on-surface-variant dark:text-slate-400" />
                      <Tooltip formatter={(v: number, n: string) => [rpS(v), n]} labelFormatter={(y) => `Tahun ke-${y}`} contentStyle={{ borderRadius: 12, border: '1px solid rgba(0,0,0,0.08)', fontSize: 12 }} />
                      <Area type="monotone" dataKey="Nilai" stroke="#10b981" strokeWidth={2.5} fill="url(#dcaVal)" dot={false} />
                      <Area type="monotone" dataKey="Disetor" stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="4 3" fill="none" dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                <div className="rounded-xl bg-primary/5 dark:bg-[#a7c8ff]/10 border border-primary/15 dark:border-[#a7c8ff]/15 p-3">
                  <p className="text-[11px] leading-relaxed text-on-surface-variant dark:text-slate-300"><b className="text-on-surface dark:text-white">Disiplin &gt; timing.</b> Menyetor {rp(periodic)} tiap {freq === 12 ? 'bulan' : 'minggu'} selama {years} tahun → potensi <b className="text-emerald-600 dark:text-emerald-400">{rpS(dca.gain)}</b> keuntungan (asumsi {ret}%/th). DCA meratakan harga beli & mengurangi risiko salah waktu.</p>
                </div>
              </>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <NumInput label="Modal awal" value={principal} setValue={setPrincipal} step={10_000_000} small />
                  <NumInput label="Durasi (thn)" value={dripYears} setValue={setDripYears} small />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <NumInput label="Yield dividen/kupon %/th" value={divYield} setValue={setDivYield} step={0.5} small />
                  <NumInput label="Pertumbuhan harga %/th" value={priceGrowth} setValue={setPriceGrowth} step={0.5} small />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-emerald-500/5 border border-emerald-500/25 p-4 text-center">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">Dividen direinvestasi</p>
                    <p className="text-lg font-black text-emerald-700 dark:text-emerald-300 mt-1 tabular-nums">{rpS(drip.withReinvest)}</p>
                  </div>
                  <div className="rounded-2xl bg-surface-container-low dark:bg-white/5 border border-outline-variant/10 dark:border-white/5 p-4 text-center">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-on-surface-variant dark:text-slate-400">Dividen diambil tunai</p>
                    <p className="text-lg font-black text-on-surface dark:text-white mt-1 tabular-nums">{rpS(drip.withoutReinvest)}</p>
                  </div>
                </div>
                <div className="rounded-xl bg-primary/5 dark:bg-[#a7c8ff]/10 border border-primary/15 dark:border-[#a7c8ff]/15 p-3">
                  <p className="text-[11px] leading-relaxed text-on-surface-variant dark:text-slate-300"><b className="text-on-surface dark:text-white">Kekuatan bunga-berbunga:</b> mereinvestasi dividen/kupon menambah <b className="text-emerald-600 dark:text-emerald-400">{rpS(drip.extra)}</b> ({(drip.extraPct * 100).toFixed(0)}% lebih tinggi) dalam {dripYears} tahun dibanding mengambilnya tunai. Semakin lama & tinggi yield, makin besar efeknya.</p>
                </div>
              </>
            )}
            <p className="text-[10px] text-on-surface-variant/60 dark:text-slate-500">Ilustrasi asumsi, bukan jaminan hasil. Return pasar berfluktuasi; sesuaikan angka dengan realita instrumen Anda.</p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

const Tile: React.FC<{ label: string; value: string; accent?: boolean; good?: boolean }> = ({ label, value, accent, good }) => (
  <div className={`rounded-2xl p-3 border ${accent ? 'bg-primary/5 dark:bg-[#a7c8ff]/10 border-primary/15 dark:border-[#a7c8ff]/15' : 'bg-surface-container-low dark:bg-white/5 border-outline-variant/10 dark:border-white/5'}`}>
    <p className="text-[10px] font-bold uppercase tracking-wide text-on-surface-variant dark:text-slate-400">{label}</p>
    <p className={`text-sm sm:text-base font-black mt-1 tabular-nums ${good ? 'text-emerald-600 dark:text-emerald-400' : accent ? 'text-primary dark:text-[#a7c8ff]' : 'text-on-surface dark:text-white'}`}>{value}</p>
  </div>
);

export default DcaPlannerModal;
