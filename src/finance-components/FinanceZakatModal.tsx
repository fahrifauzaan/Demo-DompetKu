import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useFinanceStore } from '../store/useFinanceStore';
import FinanceGuidePrinciple from './FinanceGuidePrinciple';
import {
  classAmounts,
  computeZakat,
  defaultDeduction,
  readGoldPrice,
  readInclude,
  mergeZakatSettings,
  DEFAULT_GOLD_PRICE,
  NISAB_GRAMS,
  type ZakatClassKey,
  type ZakatIncludeFlags,
} from './zakatUtils';

interface FinanceZakatModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const formatRp = (n: number) => `Rp ${Math.round(n || 0).toLocaleString('id-ID')}`;
const parseDigits = (s: string) => Number(s.replace(/\D/g, '')) || 0;

interface ClassRow {
  key: Exclude<ZakatClassKey, 'properti'>;
  label: string;
  icon: string;
  desc: string;
}

const ZAKATABLE_CLASSES: ClassRow[] = [
  { key: 'kas', label: 'Kas & rekening bank', icon: 'account_balance_wallet', desc: 'Tabungan, e-wallet, uang tunai' },
  { key: 'emas', label: 'Emas & logam mulia', icon: 'diamond', desc: 'Emas batangan, perhiasan, dinar' },
  { key: 'saham', label: 'Saham', icon: 'trending_up', desc: 'Kepemilikan ekuitas' },
  { key: 'reksadana', label: 'Reksadana', icon: 'donut_small', desc: 'Unit penyertaan reksa dana' },
  { key: 'kripto', label: 'Aset kripto', icon: 'currency_bitcoin', desc: 'Opini fikih kontemporer' },
  { key: 'fixedincome', label: 'Pendapatan tetap', icon: 'savings', desc: 'SBN, deposito, P2P, obligasi' },
];

// Toggle switch (pola konsisten dengan modal lain di app)
const Switch: React.FC<{ checked: boolean; onChange: (v: boolean) => void }> = ({ checked, onChange }) => (
  <label className="relative inline-flex items-center cursor-pointer shrink-0">
    <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="sr-only peer" />
    <div className="w-9 h-5 bg-surface-container-highest dark:bg-white/10 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500 dark:peer-checked:bg-emerald-400" />
  </label>
);

export const FinanceZakatModal: React.FC<FinanceZakatModalProps> = ({ isOpen, onClose }) => {
  const accounts = useFinanceStore((s) => s.accounts);
  const assets = useFinanceStore((s) => s.assets);
  const debts = useFinanceStore((s) => s.debts);
  const settings = useFinanceStore((s) => s.settings);
  const updateSettings = useFinanceStore((s) => s.updateSettings);

  const [goldPrice, setGoldPrice] = useState<number>(DEFAULT_GOLD_PRICE);
  const [include, setInclude] = useState<ZakatIncludeFlags>(readInclude([]));
  const [deductionOverride, setDeductionOverride] = useState<string | null>(null);
  const [goldSaved, setGoldSaved] = useState(false);

  // Initialise from persisted Settings each time the modal opens
  useEffect(() => {
    if (!isOpen) return;
    setGoldPrice(readGoldPrice(settings));
    setInclude(readInclude(settings));
    setDeductionOverride(null);
    setGoldSaved(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const amounts = useMemo(() => classAmounts(accounts, assets), [accounts, assets]);
  const autoDeduction = useMemo(() => defaultDeduction(debts), [debts]);
  const deduction = deductionOverride !== null ? parseDigits(deductionOverride) : autoDeduction;

  const result = useMemo(
    () => computeZakat(accounts, assets, { goldPrice, include, deduction }),
    [accounts, assets, goldPrice, include, deduction]
  );

  const hasData = accounts.length > 0 || assets.length > 0;

  // Persist gold price + toggles to Settings (updateSettings hanya menulis key yang berubah)
  const persist = (nextGold: number, nextInclude: ZakatIncludeFlags) => {
    void updateSettings(mergeZakatSettings(settings, nextGold, nextInclude));
  };

  const handleClose = () => {
    const safeGold = goldPrice > 0 ? goldPrice : DEFAULT_GOLD_PRICE;
    persist(safeGold, include);
    onClose();
  };

  const toggleClass = (key: ZakatClassKey) => {
    setInclude((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleGoldSave = () => {
    const safe = goldPrice > 0 ? goldPrice : DEFAULT_GOLD_PRICE;
    setGoldPrice(safe);
    persist(safe, include);
    setGoldSaved(true);
    window.setTimeout(() => setGoldSaved(false), 1800);
  };

  if (!isOpen) return null;

  const shortfall = Math.max(0, result.nisab - result.dasarZakat);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-start sm:items-center justify-center p-2 sm:p-4 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-md"
          onClick={handleClose}
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.97, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97, y: 30 }}
          transition={{ type: 'spring', damping: 28, stiffness: 240 }}
          className="relative w-full max-w-4xl my-auto bg-surface dark:bg-[#121416] rounded-3xl sm:rounded-[32px] shadow-2xl border border-outline-variant/20 dark:border-white/10 max-h-[96vh] sm:max-h-[92vh] overflow-y-auto custom-scrollbar"
        >
          {/* Header */}
          <div className="sticky top-0 z-10 flex items-center justify-between gap-3 px-5 sm:px-7 py-4 bg-surface/95 dark:bg-[#121416]/95 backdrop-blur border-b border-outline-variant/10 dark:border-white/5">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 dark:bg-emerald-400/15 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>volunteer_activism</span>
              </div>
              <div className="min-w-0">
                <h2 className="text-lg sm:text-xl font-black font-headline text-on-surface dark:text-white truncate">Kalkulator Zakat Maal</h2>
                <p className="text-[10px] sm:text-[11px] text-on-surface-variant dark:text-slate-400 font-bold uppercase tracking-wider">Dihitung langsung dari neraca Anda</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="w-9 h-9 rounded-full bg-surface-container hover:bg-surface-container-high dark:bg-white/5 dark:hover:bg-white/10 flex items-center justify-center text-on-surface dark:text-white transition-colors cursor-pointer shrink-0"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[1.35fr_1fr]">
            {/* LEFT — CONFIG */}
            <div className="p-5 sm:p-7 space-y-7 border-b md:border-b-0 md:border-r border-outline-variant/10 dark:border-white/5">

              {/* 1. PARAMETER */}
              <section className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 dark:bg-emerald-400/10 rounded-md px-2 py-0.5 uppercase tracking-widest">1 · Parameter</span>
                </div>
                <label className="text-xs font-bold text-on-surface-variant dark:text-slate-300 block">Harga emas per gram (Rp)</label>
                <div className="flex items-stretch gap-2">
                  <div className="flex-1 flex items-center gap-2 bg-surface-container-low dark:bg-white/5 px-3.5 py-2.5 rounded-2xl border border-outline-variant/10 dark:border-white/10 focus-within:border-emerald-500/60">
                    <span className="text-xs font-bold text-on-surface-variant dark:text-slate-400">Rp</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={goldPrice.toLocaleString('id-ID')}
                      onChange={(e) => setGoldPrice(parseDigits(e.target.value))}
                      onBlur={() => { if (goldPrice <= 0) setGoldPrice(DEFAULT_GOLD_PRICE); }}
                      className="w-full bg-transparent border-none p-0 text-base font-black text-on-surface dark:text-white tabular-nums outline-none focus:ring-0"
                    />
                  </div>
                  <button
                    onClick={handleGoldSave}
                    className={`px-4 rounded-2xl font-bold text-xs transition-all cursor-pointer shrink-0 ${
                      goldSaved
                        ? 'bg-emerald-500 text-white'
                        : 'bg-primary dark:bg-[#a7c8ff] text-white dark:text-[#001b3c] hover:opacity-90'
                    }`}
                  >
                    {goldSaved ? '✓ Tersimpan' : 'Simpan'}
                  </button>
                </div>
                <p className="text-[11px] text-on-surface-variant dark:text-slate-400 leading-relaxed">
                  Nisab = <strong className="text-on-surface dark:text-white">{NISAB_GRAMS} gram</strong> emas ={' '}
                  <strong className="text-emerald-600 dark:text-emerald-400 tabular-nums">{formatRp(result.nisab)}</strong>. Isi dengan harga emas hari ini agar akurat.
                </p>
              </section>

              {/* 2. CHECKLIST ASET */}
              <section className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 dark:bg-emerald-400/10 rounded-md px-2 py-0.5 uppercase tracking-widest">2 · Harta yang Dihitung</span>
                </div>
                <div className="space-y-2">
                  {ZAKATABLE_CLASSES.map((c) => {
                    const active = include[c.key];
                    const amt = amounts[c.key];
                    return (
                      <div
                        key={c.key}
                        className={`flex items-center gap-3 p-3 rounded-2xl border transition-colors ${
                          active
                            ? 'bg-surface-container-low dark:bg-white/[0.04] border-outline-variant/15 dark:border-white/10'
                            : 'bg-transparent border-outline-variant/10 dark:border-white/5 opacity-60'
                        }`}
                      >
                        <span className={`material-symbols-outlined text-xl shrink-0 ${active ? 'text-emerald-600 dark:text-emerald-400' : 'text-on-surface-variant dark:text-slate-500'}`}>{c.icon}</span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-on-surface dark:text-white leading-tight text-balance">{c.label}</p>
                          <p className="text-[10px] text-on-surface-variant dark:text-slate-400 truncate">{c.desc}</p>
                        </div>
                        <span className="text-xs font-black tabular-nums text-on-surface dark:text-white whitespace-nowrap">{formatRp(amt)}</span>
                        <Switch checked={active} onChange={() => toggleClass(c.key)} />
                      </div>
                    );
                  })}
                </div>

                {/* Properti — default tidak dihitung */}
                <div
                  className={`flex items-center gap-3 p-3 rounded-2xl border border-dashed transition-colors ${
                    include.properti
                      ? 'bg-amber-500/5 border-amber-500/40'
                      : 'bg-transparent border-outline-variant/20 dark:border-white/10'
                  }`}
                >
                  <span className={`material-symbols-outlined text-xl shrink-0 ${include.properti ? 'text-amber-600 dark:text-amber-400' : 'text-on-surface-variant dark:text-slate-500'}`}>home_work</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-on-surface dark:text-white leading-tight">Properti & kendaraan</p>
                    <p className="text-[10px] text-on-surface-variant dark:text-slate-400 leading-tight">Aset yang dipakai bukan objek zakat. Aktifkan hanya bila untuk diperjualbelikan.</p>
                  </div>
                  <span className="text-xs font-black tabular-nums text-on-surface-variant dark:text-slate-300 whitespace-nowrap">{formatRp(amounts.properti)}</span>
                  <Switch checked={include.properti} onChange={() => toggleClass('properti')} />
                </div>
              </section>

              {/* 3. PENGURANG */}
              <section className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 dark:bg-emerald-400/10 rounded-md px-2 py-0.5 uppercase tracking-widest">3 · Pengurang</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <label className="text-xs font-bold text-on-surface-variant dark:text-slate-300">Utang jatuh tempo dekat</label>
                  {deductionOverride !== null && (
                    <button onClick={() => setDeductionOverride(null)} className="text-[10px] font-bold text-primary dark:text-[#a7c8ff] hover:underline cursor-pointer">
                      Pakai otomatis ({formatRp(autoDeduction)})
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2 bg-surface-container-low dark:bg-white/5 px-3.5 py-2.5 rounded-2xl border border-outline-variant/10 dark:border-white/10 focus-within:border-red-400/60">
                  <span className="text-xs font-bold text-on-surface-variant dark:text-slate-400">Rp</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={deduction.toLocaleString('id-ID')}
                    onChange={(e) => setDeductionOverride(e.target.value)}
                    className="w-full bg-transparent border-none p-0 text-base font-black text-on-surface dark:text-white tabular-nums outline-none focus:ring-0"
                  />
                </div>
                <p className="text-[11px] text-on-surface-variant dark:text-slate-400 leading-relaxed">
                  Otomatis = saldo penuh kartu kredit / paylater + 1 bulan cicilan utang lain. Harta bersih yang dizakati dikurangi angka ini.
                </p>
              </section>
            </div>

            {/* RIGHT — RESULT (sticky on desktop) */}
            <div className="p-5 sm:p-7 md:sticky md:top-[68px] self-start">
              {!hasData ? (
                <div className="flex flex-col items-center text-center py-8 px-2">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/10 dark:bg-emerald-400/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-4">
                    <span className="material-symbols-outlined text-3xl">savings</span>
                  </div>
                  <h3 className="text-base font-black text-on-surface dark:text-white">Belum ada data harta</h3>
                  <p className="text-xs text-on-surface-variant dark:text-slate-400 mt-2 leading-relaxed max-w-[240px]">
                    Tambahkan akun & aset Anda di menu <strong>Aset</strong> terlebih dahulu. Zakat akan dihitung otomatis dari saldo dan investasi Anda.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Zakat hero */}
                  <div className={`rounded-3xl p-5 text-center border ${
                    result.wajib
                      ? 'bg-emerald-500/10 border-emerald-500/30'
                      : 'bg-surface-container-low dark:bg-white/[0.03] border-outline-variant/15 dark:border-white/10'
                  }`}>
                    <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant dark:text-slate-400 mb-1">Estimasi Zakat Maal</p>
                    <p className={`text-3xl sm:text-[34px] font-black font-headline tabular-nums leading-tight ${
                      result.wajib ? 'text-emerald-600 dark:text-emerald-400' : 'text-on-surface dark:text-white'
                    }`}>
                      {formatRp(result.zakat)}
                    </p>
                    <p className="text-[11px] text-on-surface-variant dark:text-slate-400 mt-1.5 leading-snug">
                      {result.wajib
                        ? '2,5% dari harta bersih zakatable / haul'
                        : `Kurang ${formatRp(shortfall)} untuk mencapai nisab`}
                    </p>
                    <span className={`inline-flex items-center gap-1 mt-3 text-[10px] font-black px-2.5 py-1 rounded-full border ${
                      result.wajib
                        ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 border-emerald-500/30'
                        : 'text-amber-700 dark:text-amber-300 bg-amber-500/10 border-amber-500/30'
                    }`}>
                      <span className="material-symbols-outlined text-[13px]">{result.wajib ? 'check_circle' : 'schedule'}</span>
                      {result.wajib ? 'Mencapai Nisab' : 'Belum Mencapai Nisab'}
                    </span>
                  </div>

                  {/* Breakdown */}
                  <div className="rounded-2xl border border-outline-variant/10 dark:border-white/5 divide-y divide-outline-variant/10 dark:divide-white/5 overflow-hidden">
                    {[
                      { label: 'Total harta zakatable', value: formatRp(result.zakatable), strong: false },
                      { label: 'Pengurang (utang)', value: `− ${formatRp(result.deduction)}`, strong: false },
                      { label: 'Dasar zakat (bersih)', value: formatRp(result.dasarZakat), strong: true },
                      { label: `Nisab (${NISAB_GRAMS}g emas)`, value: formatRp(result.nisab), strong: false },
                    ].map((r) => (
                      <div key={r.label} className="flex items-center justify-between px-3.5 py-2.5">
                        <span className={`text-xs ${r.strong ? 'font-black text-on-surface dark:text-white' : 'font-medium text-on-surface-variant dark:text-slate-400'}`}>{r.label}</span>
                        <span className={`text-xs tabular-nums ${r.strong ? 'font-black text-on-surface dark:text-white' : 'font-bold text-on-surface dark:text-slate-200'}`}>{r.value}</span>
                      </div>
                    ))}
                  </div>

                  {/* Haul note */}
                  <div className="flex items-start gap-2 rounded-2xl bg-surface-container-low dark:bg-white/[0.03] border border-outline-variant/10 dark:border-white/5 p-3">
                    <span className="material-symbols-outlined text-[16px] text-on-surface-variant dark:text-slate-400 mt-px shrink-0">history_toggle_off</span>
                    <p className="text-[10.5px] text-on-surface-variant dark:text-slate-400 leading-relaxed">
                      Zakat wajib bila harta bertahan di atas nisab selama <strong>1 haul (±354 hari)</strong>. DompetKu belum melacak haul otomatis — pastikan sendiri harta Anda telah mencapai haul.
                    </p>
                  </div>

                  {/* Distribusi CTA */}
                  <a
                    href="https://baznas.go.id"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-lg">volunteer_activism</span>
                    Tunaikan via BAZNAS
                    <span className="material-symbols-outlined text-sm">open_in_new</span>
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* FOOTER — disclaimer edukasi */}
          <div className="px-5 sm:px-7 pb-6 pt-1">
            <FinanceGuidePrinciple
              heading="Prinsip Zakat Maal"
              points={[
                { icon: 'balance', title: 'Nisab & Haul', text: `Wajib saat harta ≥ nisab (${NISAB_GRAMS}g emas) dan telah dimiliki genap 1 haul (±1 tahun).` },
                { icon: 'percent', title: '2,5% harta bersih', text: 'Zakat = 2,5% dari total harta zakatable setelah dikurangi utang jatuh tempo.' },
                { icon: 'menu_book', title: 'Perbedaan pendapat fikih', text: 'Sebagian ulama mengecualikan emas perhiasan yang dipakai. Sesuaikan toggle dengan keyakinan Anda.' },
                { icon: 'diversity_3', title: 'Salurkan ke amil resmi', text: 'Tunaikan lewat lembaga amil resmi (mis. BAZNAS) agar tepat sasaran dan tercatat.' },
              ]}
            />
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default FinanceZakatModal;
