import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';

export interface Debt {
  id: string;
  name: string;
  type: string;
  balance: number;
  interestRate: number;
  minPayment: number;
  icon: string;
  originalAmount?: number;
  interestType?: string;
  startDate?: string;
  endDate?: string;
  dueDate?: number;
  lender?: string;
  status?: string;
}

interface DebtSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentExtraPayment: number;
  onApply: (newExtraPayment: number) => void;
  debts: Debt[];
  monthlyIncome: number;
  weightedInterest: number;
  surplusCash: number;
}

const DebtSimulatorModal: React.FC<DebtSimulatorModalProps> = ({ 
  isOpen, 
  onClose, 
  currentExtraPayment, 
  onApply,
  debts,
  monthlyIncome,
  weightedInterest,
  surplusCash
}) => {
  const [sliderValue, setSliderValue] = useState(currentExtraPayment);

  useEffect(() => {
    if (isOpen) {
      setSliderValue(currentExtraPayment);
    }
  }, [isOpen, currentExtraPayment]);

  const handleApply = () => {
    onApply(sliderValue);
    onClose();
  };

  // --- BASELINE SIMULATION (Cicilan Minimum) ---
  const baseline = useMemo(() => {
    let currentDebts = debts.map(d => ({ ...d, currentBalance: d.balance }));
    let totalMonths = 0;
    let totalInterestPaid = 0;
    const maxMonths = 360;

    while (currentDebts.some(d => d.currentBalance > 0) && totalMonths < maxMonths) {
      totalMonths++;
      currentDebts = currentDebts.map(d => {
        if (d.currentBalance <= 0) return d;
        const interest = (d.currentBalance * (d.interestRate / 100)) / 12;
        totalInterestPaid += interest;
        d.currentBalance += interest;
        const payment = Math.min(d.currentBalance, d.minPayment);
        d.currentBalance -= payment;
        return d;
      });
    }
    return { totalMonths, totalInterestPaid };
  }, [debts]);

  // --- STRATEGY SIMULATION (Snowball or Avalanche) ---
  const runSimulation = (strat: 'snowball' | 'avalanche', extra: number) => {
    let currentDebts = debts.map(d => ({ ...d, currentBalance: d.balance }));
    let totalMonths = 0;
    let totalInterestPaid = 0;
    const maxMonths = 360;

    while (currentDebts.some(d => d.currentBalance > 0) && totalMonths < maxMonths) {
      totalMonths++;
      let monthlyExtra = extra;
      
      let sortedDebts = [...currentDebts];
      if (strat === 'snowball') {
        sortedDebts.sort((a, b) => a.currentBalance - b.currentBalance);
      } else if (strat === 'avalanche') {
        sortedDebts.sort((a, b) => b.interestRate - a.interestRate);
      }

      // 1. Pay interest and minimum payment
      sortedDebts = sortedDebts.map(d => {
        if (d.currentBalance <= 0) return d;
        const interest = (d.currentBalance * (d.interestRate / 100)) / 12;
        totalInterestPaid += interest;
        d.currentBalance += interest;
        const payment = Math.min(d.currentBalance, d.minPayment);
        d.currentBalance -= payment;
        return d;
      });

      // 2. Pay extra payment to priority debt
      for (let i = 0; i < sortedDebts.length; i++) {
        if (sortedDebts[i].currentBalance > 0 && monthlyExtra > 0) {
          const payment = Math.min(sortedDebts[i].currentBalance, monthlyExtra);
          sortedDebts[i].currentBalance -= payment;
          monthlyExtra -= payment;
        }
      }

      currentDebts = sortedDebts;
    }
    return { totalMonths, totalInterestPaid };
  };

  const snowball = useMemo(() => runSimulation('snowball', sliderValue), [debts, sliderValue]);
  const avalanche = useMemo(() => runSimulation('avalanche', sliderValue), [debts, sliderValue]);

  // Calculations for insights
  const snowballMonthsSaved = Math.max(0, baseline.totalMonths - snowball.totalMonths);
  const snowballInterestSaved = Math.max(0, baseline.totalInterestPaid - snowball.totalInterestPaid);

  const avalancheMonthsSaved = Math.max(0, baseline.totalMonths - avalanche.totalMonths);
  const avalancheInterestSaved = Math.max(0, baseline.totalInterestPaid - avalanche.totalInterestPaid);

  const marketReturnRate = 7.0; // historical long term market expected return in %
  const isPrepayEfficient = weightedInterest > marketReturnRate;

  const isExceedingSurplus = sliderValue > surplusCash;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[120] flex items-start sm:items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 30 }}
            className="relative w-full max-w-md sm:max-w-xl md:max-w-2xl my-auto bg-white dark:bg-[#191c1e] rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden border border-slate-200/50 dark:border-white/10 flex flex-col max-h-[calc(100vh-1.5rem)] sm:max-h-[calc(100vh-2rem)]"
          >
            {/* Header */}
            <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-white/5 flex justify-between items-center bg-slate-50/50 dark:bg-white/5 shrink-0">
              <div>
                <h3 className="text-base sm:text-lg lg:text-xl font-bold text-blue-950 dark:text-white font-headline flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary dark:text-[#a7c8ff]">speed</span>
                  Simulator Kebebasan Finansial
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
                  Simulasikan dampak cicilan ekstra menggunakan strategi alokasi CFP® & CFA®.
                </p>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-white/10 rounded-full transition-colors text-slate-400 shrink-0">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 overflow-y-auto flex-1">
              {/* Slider Control */}
              <div className="space-y-4 bg-slate-50 dark:bg-white/5 p-5 rounded-2xl border border-slate-100 dark:border-white/5">
                <div className="flex justify-between items-center flex-wrap gap-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Tambahan Cicilan (Per Bulan)</label>
                  <div className="font-headline text-xl font-black text-[#007aff] dark:text-[#a7c8ff] tabular-nums bg-white dark:bg-black/20 px-4 py-1.5 rounded-xl border border-black/[0.04] dark:border-white/[0.04]">
                    Rp {sliderValue.toLocaleString('id-ID')}
                  </div>
                </div>
                
                <div className="relative pt-6 pb-2">
                  <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-2 bg-slate-200 dark:bg-white/10 rounded-full" />
                  <div 
                    className="absolute left-0 top-1/2 -translate-y-1/2 h-2 bg-[#007aff] rounded-full transition-all duration-100 ease-out" 
                    style={{ width: `${Math.min(100, (sliderValue / 15000000) * 100)}%` }} 
                  />
                  <input
                    type="range"
                    min="0"
                    max="15000000"
                    step="100000"
                    value={sliderValue}
                    onChange={(e) => {
                      setSliderValue(parseInt(e.target.value));
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div 
                    className="absolute top-1/2 -translate-y-1/2 w-6 h-6 bg-white border-2 border-[#007aff] rounded-full shadow-md pointer-events-none transition-all duration-100 ease-out"
                    style={{ left: `calc(${Math.min(100, (sliderValue / 15000000) * 100)}% - 12px)` }}
                  >
                    <div className="absolute inset-1.5 bg-[#007aff] rounded-full" />
                  </div>
                </div>
                
                <div className="flex justify-between text-[9px] font-black text-slate-400 uppercase tracking-widest">
                  <span>Rp 0</span>
                  <span>Maksimal Efektif (Rp 15 Jt)</span>
                </div>
              </div>

              {/* CFP Budget Surplus Check */}
              <div className={`p-4 rounded-2xl border text-xs font-bold ${
                isExceedingSurplus 
                  ? 'bg-red-50/50 dark:bg-red-950/10 border-red-500/20 text-[#ff3b30]'
                  : 'bg-emerald-50/50 dark:bg-emerald-950/10 border-emerald-500/20 text-[#28cd41] dark:text-[#30d158]'
              }`}>
                {isExceedingSurplus ? (
                  <div className="flex items-start gap-2.5">
                    <span className="material-symbols-outlined text-base mt-0.5">warning</span>
                    <p className="leading-relaxed">
                      Peringatan CFP: Tambahan cicilan Rp {sliderValue.toLocaleString('id-ID')} melebihi sisa surplus kas bulanan Anda (Rp {surplusCash.toLocaleString('id-ID')}). Hal ini berisiko mengganggu likuiditas belanja harian Anda.
                    </p>
                  </div>
                ) : (
                  <div className="flex items-start gap-2.5">
                    <span className="material-symbols-outlined text-base mt-0.5">check_circle</span>
                    <p className="leading-relaxed">
                      Sesuai Kapasitas: Tambahan cicilan berada di dalam batas aman sisa surplus kas bulanan Anda (Rp {surplusCash.toLocaleString('id-ID')}).
                    </p>
                  </div>
                )}
              </div>

              {/* Side by Side Strategies comparison */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                
                {/* Avalanche Method Card */}
                <div className="border border-black/[0.05] dark:border-white/[0.05] p-5 rounded-2xl space-y-4 bg-white/40 dark:bg-white/[0.02]">
                  <div className="flex items-center justify-between border-b border-black/[0.04] dark:border-white/5 pb-2.5">
                    <h4 className="font-headline font-black text-sm text-slate-800 dark:text-white flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-indigo-500 text-sm">filter_hdr</span>
                      Metode Avalanche
                    </h4>
                    <span className="text-[8px] font-black text-[#007aff] uppercase tracking-wider bg-[#007aff]/5 px-2 py-0.5 rounded">CFA Efisien</span>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Waktu Pelunasan</span>
                      <span className="text-xl font-headline font-black text-slate-800 dark:text-white">{avalanche.totalMonths} <span className="text-xs font-bold text-slate-400">Bulan</span></span>
                      <span className="text-[9px] font-bold text-[#28cd41] dark:text-[#30d158] block mt-0.5">✓ Lebih cepat {avalancheMonthsSaved} bln</span>
                    </div>
                    <div>
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Bunga Terselamatkan</span>
                      <span className="text-lg font-headline font-black text-[#28cd41] dark:text-[#30d158] tabular-nums">Rp {avalancheInterestSaved.toLocaleString('id-ID')}</span>
                    </div>
                  </div>
                </div>

                {/* Snowball Method Card */}
                <div className="border border-black/[0.05] dark:border-white/[0.05] p-5 rounded-2xl space-y-4 bg-white/40 dark:bg-white/[0.02]">
                  <div className="flex items-center justify-between border-b border-black/[0.04] dark:border-white/5 pb-2.5">
                    <h4 className="font-headline font-black text-sm text-slate-800 dark:text-white flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-amber-500 text-sm">ac_unit</span>
                      Metode Snowball
                    </h4>
                    <span className="text-[8px] font-black text-amber-600 uppercase tracking-wider bg-amber-500/5 px-2 py-0.5 rounded">CFP Psikologis</span>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Waktu Pelunasan</span>
                      <span className="text-xl font-headline font-black text-slate-800 dark:text-white">{snowball.totalMonths} <span className="text-xs font-bold text-slate-400">Bulan</span></span>
                      <span className="text-[9px] font-bold text-[#28cd41] dark:text-[#30d158] block mt-0.5">✓ Lebih cepat {snowballMonthsSaved} bln</span>
                    </div>
                    <div>
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Bunga Terselamatkan</span>
                      <span className="text-lg font-headline font-black text-[#28cd41] dark:text-[#30d158] tabular-nums">Rp {snowballInterestSaved.toLocaleString('id-ID')}</span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Opportunity Cost / CFA Analysis Card */}
              <div className="bg-[#f5f5f7] dark:bg-[#1c1c1e] p-5 rounded-2xl border border-black/[0.04] dark:border-white/[0.04] space-y-2.5">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Analisis Opportunity Cost (CFA Standard)</span>
                <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 leading-relaxed">
                  Bunga efektif tertimbang portofolio Anda saat ini adalah <span className="font-extrabold text-slate-700 dark:text-slate-200">{weightedInterest.toFixed(2)}%</span> dibandingkan estimasi pengembalian investasi saham pasar jangka panjang (<span className="font-extrabold text-slate-700 dark:text-slate-200">{marketReturnRate.toFixed(1)}%</span>).
                </p>
                <p className="text-[10px] font-bold text-[#007aff] leading-relaxed">
                  {isPrepayEfficient ? (
                    <span>☞ Karena bunga utang Anda lebih tinggi ({weightedInterest.toFixed(1)}% &gt; {marketReturnRate.toFixed(1)}%), melunasi utang lebih awal memberikan "garansi return" bebas risiko yang lebih menguntungkan daripada berinvestasi.</span>
                  ) : (
                    <span>☞ Karena bunga utang Anda lebih rendah ({weightedInterest.toFixed(1)}% &lt; {marketReturnRate.toFixed(1)}%), secara matematis menginvestasikan surplus dana di portofolio reksadana/saham berpotensi menghasilkan kekayaan bersih lebih tinggi.</span>
                  )}
                </p>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="p-6 bg-slate-50 dark:bg-[#191c1e] border-t border-slate-100 dark:border-white/5 flex gap-3 shrink-0">
               <button
                  onClick={onClose}
                  className="flex-1 px-4 py-3 rounded-xl border border-slate-200 dark:border-white/10 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  onClick={handleApply}
                  className="flex-[2] bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-4 py-3 rounded-xl text-sm font-bold hover:opacity-90 transition-opacity cursor-pointer flex items-center justify-center gap-1.5"
                >
                  Terapkan Tambahan Rp {sliderValue.toLocaleString('id-ID')}
                </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default DebtSimulatorModal;
