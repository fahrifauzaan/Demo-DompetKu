import React, { useState, useMemo } from 'react';
import { FeatureCTA } from './MarketingCTAModal';
import { useFinanceStore } from '../store/useFinanceStore';
import { motion, AnimatePresence } from 'motion/react';
import DebtFormModal, { Debt } from './DebtFormModal';
import DebtSimulatorModal from './DebtSimulatorModal';

// interface Debt removed as it is imported from DebtFormModal

interface FinanceDebtsProps {
  onShowCTA: (feature?: FeatureCTA) => void;
  onNavigate?: (tab: string) => void;
}

const FinanceDebts: React.FC<FinanceDebtsProps> = ({ onShowCTA, onNavigate }) => {
  const { debts, addDebt, updateDebt, deleteDebt, assets, accounts, budgetCategories } = useFinanceStore();
  const [strategy, setStrategy] = useState<'minimum' | 'snowball' | 'avalanche'>('snowball');
  const [extraPayment, setExtraPayment] = useState(5000000); // 5jt extra per month
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null);
  const [showActionId, setShowActionId] = useState<string | null>(null);

  const handleSaveDebt = (debt: Debt) => {
    if (editingDebt) {
      updateDebt(debt);
    } else {
      const { id, ...debtWithoutId } = debt;
      addDebt(debtWithoutId);
    }
    setEditingDebt(null);
  };

  const handleDeleteDebt = (id: string) => {
    deleteDebt(id);
    setShowActionId(null);
  };

  const openAddModal = () => {
    setEditingDebt(null);
    setIsModalOpen(true);
  };

  const openEditModal = (debt: Debt) => {
    setEditingDebt(debt);
    setIsModalOpen(true);
    setShowActionId(null);
  };

  // --- LOGIKA PERHITUNGAN PELUNASAN ---
  const payoffData = useMemo(() => {
    let currentDebts = debts.map(d => ({ ...d, currentBalance: d.balance }));
    const projection = [];
    let totalMonths = 0;
    let totalInterestPaid = 0;
    const maxMonths = 360; // Max 30 years

    // Push initial balance
    projection.push(currentDebts.reduce((sum, d) => sum + d.currentBalance, 0));

    while (currentDebts.some(d => d.currentBalance > 0) && totalMonths < maxMonths) {
      totalMonths++;
      let monthlyExtra = extraPayment;
      
      // Sort debts based on strategy
      let sortedDebts = [...currentDebts];
      if (strategy === 'snowball') {
        sortedDebts.sort((a, b) => a.currentBalance - b.currentBalance);
      } else if (strategy === 'avalanche') {
        sortedDebts.sort((a, b) => b.interestRate - a.interestRate);
      }

      // 1. Bayar bunga dan cicilan minimum
      sortedDebts = sortedDebts.map(d => {
        if (d.currentBalance <= 0) return d;
        const interest = (d.currentBalance * (d.interestRate / 100)) / 12;
        totalInterestPaid += interest;
        d.currentBalance += interest;
        
        const payment = Math.min(d.currentBalance, d.minPayment);
        d.currentBalance -= payment;
        return d;
      });

      // 2. Bayar extra payment ke prioritas utama
      for (let i = 0; i < sortedDebts.length; i++) {
        if (sortedDebts[i].currentBalance > 0 && monthlyExtra > 0) {
          const payment = Math.min(sortedDebts[i].currentBalance, monthlyExtra);
          sortedDebts[i].currentBalance -= payment;
          monthlyExtra -= payment;
        }
      }

      currentDebts = sortedDebts;
      const totalBalance = currentDebts.reduce((sum, d) => sum + Math.max(0, d.currentBalance), 0);
      projection.push(totalBalance);
    }

    return { projection, totalMonths, totalInterestPaid };
  }, [debts, strategy, extraPayment]);

  // --- LOGIKA PERHITUNGAN BASELINE (Min Payment Only) ---
  const minOnlyData = useMemo(() => {
    let currentDebts = debts.map(d => ({ ...d, currentBalance: d.balance }));
    const projection = [];
    let totalMonths = 0;
    let totalInterestPaid = 0;
    const maxMonths = 360;

    // Push initial balance
    projection.push(currentDebts.reduce((sum, d) => sum + d.currentBalance, 0));

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
      const totalBalance = currentDebts.reduce((sum, d) => sum + Math.max(0, d.currentBalance), 0);
      projection.push(totalBalance);
    }
    return { projection, totalMonths, totalInterestPaid };
  }, [debts]);

  const totalCurrentBalance = debts.reduce((sum, d) => sum + d.balance, 0);

  // CFA weighted interest calculation
  const weightedInterest = useMemo(() => {
    if (debts.length === 0 || totalCurrentBalance === 0) return 0;
    const sumProduct = debts.reduce((sum, d) => sum + (d.interestRate * d.balance), 0);
    return sumProduct / totalCurrentBalance;
  }, [debts, totalCurrentBalance]);

  // CFP Ratio metrics
  const totalAssets = useMemo(() => {
    const assetSum = assets ? assets.reduce((sum, a) => sum + (a.currentValue || 0), 0) : 0;
    const accountSum = accounts ? accounts.reduce((sum, ac) => sum + (ac.balance || 0), 0) : 0;
    return assetSum + accountSum;
  }, [assets, accounts]);

  const debtToAssetRatio = totalAssets > 0 ? (totalCurrentBalance / totalAssets) * 100 : 0;

  const monthlyIncome = useMemo(() => {
    if (!budgetCategories) return 0;
    return budgetCategories
      .filter(c => c.type === 'Pemasukan' || (c.type && c.type.toLowerCase() === 'pemasukan'))
      .reduce((sum, c) => sum + (c.allocated || 0), 0);
  }, [budgetCategories]);

  const totalMonthlyDebtPayments = debts.reduce((sum, d) => sum + d.minPayment, 0);
  const debtToIncomeRatio = monthlyIncome > 0 ? (totalMonthlyDebtPayments / monthlyIncome) * 100 : 0;

  // CFP Emergency Buffer
  const liquidAssets = useMemo(() => {
    if (!accounts) return 0;
    return accounts
      .filter(acc => acc.type === 'bank' || acc.type === 'wallet' || acc.type === 'cash')
      .reduce((sum, acc) => sum + (acc.balance || 0), 0);
  }, [accounts]);

  // CFP surplus cash calculation
  const surplusCash = useMemo(() => {
    let essentialExpenses = 0;
    if (budgetCategories) {
      budgetCategories.forEach(c => {
        const isPengeluaran = c.type ? c.type.toLowerCase() === 'pengeluaran' : true;
        if (isPengeluaran) {
          const norm = (c.name || '').toLowerCase();
          const isSavingOrInvest = norm.includes('saving') || norm.includes('tabungan') || norm.includes('darurat') || norm.includes('invest') || norm.includes('saham') || norm.includes('reksa') || norm.includes('crypto') || norm.includes('bond') || norm.includes('emas') || norm.includes('kripto') || norm.includes('p2p') || norm.includes('deposit');
          if (!isSavingOrInvest) {
            essentialExpenses += c.allocated;
          }
        }
      });
    }
    return Math.max(0, monthlyIncome - essentialExpenses - totalMonthlyDebtPayments);
  }, [monthlyIncome, budgetCategories, totalMonthlyDebtPayments]);

  // Good vs Bad Debt Classification
  const debtClassification = useMemo(() => {
    let goodDebt = 0;
    let badDebt = 0;
    
    debts.forEach(d => {
      const type = (d.type || '').toLowerCase();
      if (type.includes('kpr') || type.includes('rumah') || type.includes('pendidikan') || type.includes('school')) {
        goodDebt += d.balance;
      } else {
        badDebt += d.balance;
      }
    });
    
    const goodPercent = totalCurrentBalance > 0 ? Math.round((goodDebt / totalCurrentBalance) * 100) : 0;
    const badPercent = totalCurrentBalance > 0 ? Math.round((badDebt / totalCurrentBalance) * 100) : 0;
    
    return { goodDebt, badDebt, goodPercent, badPercent };
  }, [debts, totalCurrentBalance]);

  // Negative Amortization Finder
  const negativeAmortizationDebts = useMemo(() => {
    return debts.filter(d => {
      const monthlyInterest = (d.balance * (d.interestRate / 100)) / 12;
      return monthlyInterest >= d.minPayment;
    });
  }, [debts]);

  const generatePath = (data: number[]) => {
    if (data.length === 0) return "";
    const width = 800;
    const height = 200;
    const maxVal = Math.max(...data, totalCurrentBalance);
    
    let path = `M 0 ${height - (data[0] / maxVal) * height}`;
    const step = width / (data.length - 1);
    
    for (let i = 1; i < data.length; i++) {
      const x = i * step;
      const y = height - (data[i] / maxVal) * height;
      path += ` L ${x} ${y}`;
    }
    return path;
  };

  const currentPath = generatePath(payoffData.projection);
  const baselinePath = generatePath(minOnlyData.projection);

  const payoffYear = new Date().getFullYear() + Math.floor(payoffData.totalMonths / 12);
  const payoffMonth = new Date().toLocaleString('id-ID', { month: 'short' }) + " " + payoffYear;
  
  const minYear = new Date().getFullYear() + Math.floor(minOnlyData.totalMonths / 12);
  const minMonth = new Date().toLocaleString('id-ID', { month: 'short' }) + " " + minYear;
  
  const interestSaved = minOnlyData.totalInterestPaid - payoffData.totalInterestPaid;

  const startYear = new Date().getFullYear();
  const yearLabels = Array.from({ length: 5 }, (_, i) => startYear + i);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-16">
      {/* Page Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-black/[0.04] dark:border-white/5 pb-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black font-headline tracking-tight text-[#1d1d1f] dark:text-white">Rencana Pelunasan Utang</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 font-body text-xs md:text-sm font-medium">
            Optimalkan struktur pembayaran Anda untuk meminimalkan bunga dan mempercepat jalan menuju kebebasan finansial sesuai standar perencana keuangan profesional.
          </p>
        </div>
      </div>

      {/* 4 Premium Metric Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Card 1: Total Liabilitas */}
        <div className="bg-white/40 dark:bg-white/[0.02] p-6 rounded-3xl border border-black/[0.05] dark:border-white/[0.05] shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">Total Liabilitas</span>
            <span className="font-headline text-2xl font-black text-slate-800 dark:text-white tabular-nums">Rp {totalCurrentBalance.toLocaleString('id-ID')}</span>
          </div>
          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-2 block">
            • {debts.length} instrumen aktif
          </span>
        </div>

        {/* Card 2: Weighted APR */}
        <div className="bg-white/40 dark:bg-white/[0.02] p-6 rounded-3xl border border-black/[0.05] dark:border-white/[0.05] shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">Bunga Efektif (Weighted)</span>
            <span className="font-headline text-2xl font-black text-[#007aff] dark:text-[#a7c8ff] tabular-nums">{weightedInterest.toFixed(2)}%</span>
          </div>
          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-2 block">
            • Dihitung proporsional saldo
          </span>
        </div>

        {/* Card 3: Debt to Income (DTI) */}
        <div className="bg-white/40 dark:bg-white/[0.02] p-6 rounded-3xl border border-black/[0.05] dark:border-white/[0.05] shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">Rasio Cicilan / Pendapatan (DTI)</span>
            <span className="font-headline text-2xl font-black text-slate-800 dark:text-white tabular-nums">{debtToIncomeRatio.toFixed(1)}%</span>
          </div>
          {(() => {
            let status = 'Sangat Sehat';
            let colorClass = 'text-[#28cd41] dark:text-[#30d158]';
            if (debtToIncomeRatio > 45) {
              status = 'Kritis (Over-leveraged)';
              colorClass = 'text-[#ff3b30]';
            } else if (debtToIncomeRatio >= 36) {
              status = 'Waspada (Batas CFP)';
              colorClass = 'text-[#ff9500]';
            }
            return (
              <span className={`text-[10px] font-bold mt-2 block ${colorClass}`}>
                • {monthlyIncome > 0 ? status : 'Belum ada pendapatan'}
              </span>
            );
          })()}
        </div>

        {/* Card 4: Debt to Asset (DTA) */}
        <div className="bg-white/40 dark:bg-white/[0.02] p-6 rounded-3xl border border-black/[0.05] dark:border-white/[0.05] shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">Rasio Utang / Aset (DTA)</span>
            <span className="font-headline text-2xl font-black text-slate-800 dark:text-white tabular-nums">{debtToAssetRatio.toFixed(1)}%</span>
          </div>
          {(() => {
            let status = 'Batas Aman';
            let colorClass = 'text-[#28cd41] dark:text-[#30d158]';
            if (debtToAssetRatio >= 50) {
              status = 'Berisiko (> 50%)';
              colorClass = 'text-[#ff3b30]';
            }
            return (
              <span className={`text-[10px] font-bold mt-2 block ${colorClass}`}>
                • {totalAssets > 0 ? status : 'Belum ada aset'}
              </span>
            );
          })()}
        </div>
      </section>

      {/* Bento Grid / Celebratory State */}
      {debts.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative overflow-hidden rounded-3xl p-8 md:p-12 text-center border border-black/[0.05] dark:border-white/[0.05] bg-white/40 dark:bg-white/[0.02] shadow-xl flex flex-col items-center justify-center min-h-[450px]"
        >
          {/* Decorative Glowing Background */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] rounded-full bg-gradient-to-tr from-emerald-500/5 to-teal-500/5 blur-[80px] pointer-events-none" />
          
          {/* Animated Medal Badge Icon */}
          <motion.div
            initial={{ scale: 0.5, rotate: -10 }}
            animate={{ scale: [0.5, 1.1, 1], rotate: [0, 15, 0] }}
            transition={{ duration: 1.2, ease: "backOut" }}
            className="relative mb-6"
          >
            <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-emerald-400 to-teal-500 dark:from-[#34d399] dark:to-[#059669] flex items-center justify-center shadow-lg shadow-emerald-500/10 relative z-10">
              <span className="material-symbols-outlined text-[3.5rem] text-white" style={{ fontVariationSettings: "'FILL' 1" }}>verified_user</span>
            </div>
            {/* Soft glowing ring behind icon */}
            <div className="absolute inset-[-10px] rounded-full bg-emerald-500/10 dark:bg-[#34d399]/10 blur-md animate-pulse pointer-events-none" />
          </motion.div>

          <h3 className="font-headline text-2xl md:text-3xl font-extrabold text-[#1d1d1f] dark:text-white mb-3">Selamat! Anda Bebas dari Utang 🎉</h3>
          <p className="text-slate-500 dark:text-slate-400 max-w-xl text-sm md:text-base font-medium leading-relaxed mb-8">
            Luar biasa! Saat ini Anda tidak memiliki kewajiban utang aktif. Ini merupakan pencapaian finansial yang luar biasa dan fondasi kokoh untuk mempercepat kemerdekaan finansial Anda.
          </p>

          {/* Call to action to add debt */}
          <button 
            onClick={openAddModal}
            className="flex items-center gap-2 px-5 py-3 font-bold text-xs tracking-wider uppercase rounded-xl transition-all duration-300 shadow-sm bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-90 active:scale-95 cursor-pointer"
          >
            <span className="material-symbols-outlined text-lg">add</span>
            Catat Liabilitas / Utang Baru
          </button>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
          
          {/* Left Column: Strategy & CFP Panel */}
          <div className="lg:col-span-4 flex flex-col gap-6 lg:gap-8">
            {/* Payoff Strategy Toggle */}
            <div className="bg-white/40 dark:bg-white/[0.02] p-6 rounded-3xl border border-black/[0.05] dark:border-white/[0.05] shadow-sm">
              <h3 className="font-headline font-bold text-lg mb-6 flex items-center gap-2 text-slate-800 dark:text-white">
                <span className="material-symbols-outlined text-primary dark:text-[#a7c8ff]" style={{ fontVariationSettings: "'FILL' 1" }}>psychology</span>
                Strategi Pembayaran
              </h3>
              <div className="space-y-3">
                <label onClick={() => setStrategy('minimum')} className={`flex items-center p-3 rounded-xl border transition-colors cursor-pointer group ${strategy === 'minimum' ? 'bg-[#007aff]/5 border-[#007aff]/20' : 'border-transparent hover:bg-black/[0.02] dark:hover:bg-white/5'}`}>
                  <input readOnly checked={strategy === 'minimum'} className="w-4 h-4 text-primary focus:ring-primary border-outline dark:border-white/30 rounded-full" name="strategy" type="radio" value="minimum" />
                  <div className="ml-4">
                    <div className="font-bold text-sm text-slate-800 dark:text-white">Cicilan Minimum</div>
                    <div className="text-[10px] text-slate-400">Jadwal pembayaran standar</div>
                  </div>
                  {strategy === 'minimum' && <span className="ml-auto material-symbols-outlined text-[#007aff] text-lg">check_circle</span>}
                </label>

                <label onClick={() => setStrategy('snowball')} className={`flex items-center p-3 rounded-xl border transition-colors cursor-pointer group ${strategy === 'snowball' ? 'bg-[#007aff]/5 border-[#007aff]/20' : 'border-transparent hover:bg-black/[0.02] dark:hover:bg-white/5'}`}>
                  <input readOnly checked={strategy === 'snowball'} className="w-4 h-4 text-primary focus:ring-primary border-outline dark:border-white/30 rounded-full" name="strategy" type="radio" value="snowball" />
                  <div className="ml-4">
                    <div className="font-bold text-sm text-slate-800 dark:text-white">Saldo Terkecil (Snowball)</div>
                    <div className="text-[10px] text-slate-400">Fokus psikologis, lunas lebih cepat</div>
                  </div>
                  {strategy === 'snowball' && <span className="ml-auto material-symbols-outlined text-[#007aff] text-lg">check_circle</span>}
                </label>

                <label onClick={() => setStrategy('avalanche')} className={`flex items-center p-3 rounded-xl border transition-colors cursor-pointer group ${strategy === 'avalanche' ? 'bg-[#007aff]/5 border-[#007aff]/20' : 'border-transparent hover:bg-black/[0.02] dark:hover:bg-white/5'}`}>
                  <input readOnly checked={strategy === 'avalanche'} className="w-4 h-4 text-primary focus:ring-primary border-outline dark:border-white/30 rounded-full" name="strategy" type="radio" value="avalanche" />
                  <div className="ml-4">
                    <div className="font-bold text-sm text-slate-800 dark:text-white">Bunga Tertinggi (Avalanche)</div>
                    <div className="text-[10px] text-slate-400">Efisiensi maksimal, bunga lebih rendah</div>
                  </div>
                  {strategy === 'avalanche' && <span className="ml-auto material-symbols-outlined text-[#007aff] text-lg">check_circle</span>}
                </label>
              </div>
            </div>

            {/* CFP Advisory Panel */}
            <div className="bg-white/40 dark:bg-white/[0.02] p-6 rounded-3xl border border-black/[0.05] dark:border-white/[0.05] shadow-sm space-y-6">
              <h3 className="font-headline font-bold text-lg flex items-center gap-2 text-slate-800 dark:text-white">
                <span className="material-symbols-outlined text-primary dark:text-[#a7c8ff]">verified</span>
                Analisis & Rekomendasi CFP
              </h3>
              
              {/* Good vs Bad Debt Progress */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
                  <span>Struktur Utang</span>
                  <span>Produktif vs Konsumtif</span>
                </div>
                <div className="h-3 w-full bg-black/[0.04] dark:bg-white/10 rounded-full flex overflow-hidden">
                  <div style={{ width: `${debtClassification.goodPercent}%` }} className="bg-[#007aff] h-full" title={`Utang Produktif: ${debtClassification.goodPercent}%`} />
                  <div style={{ width: `${debtClassification.badPercent}%` }} className="bg-[#ff9500] h-full" title={`Utang Konsumtif: ${debtClassification.badPercent}%`} />
                </div>
                <div className="flex justify-between text-[10px] font-bold">
                  <span className="text-[#007aff]">Produktif: {debtClassification.goodPercent}%</span>
                  <span className="text-[#ff9500]">Konsumtif: {debtClassification.badPercent}%</span>
                </div>
                <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  {debtClassification.badPercent > 0 
                    ? "⚠️ Prioritaskan pelunasan ekstra pada utang konsumtif (seperti kartu kredit) yang berbiaya bunga tinggi." 
                    : "✅ Struktur utang optimal, hanya terdiri dari utang produktif untuk kepemilikan aset."}
                </p>
              </div>

              {/* Liquid Buffer Check */}
              <div className="pt-4 border-t border-black/[0.04] dark:border-white/5 space-y-2">
                <div className="flex justify-between items-center text-xs font-bold text-slate-500 dark:text-slate-400">
                  <span>Penyangga Kas Likuid</span>
                  {liquidAssets >= 10000000 ? (
                    <span className="text-[#28cd41] flex items-center gap-1"><span className="material-symbols-outlined text-sm">check_circle</span> Aman</span>
                  ) : (
                    <span className="text-[#ff9500] flex items-center gap-1"><span className="material-symbols-outlined text-sm">warning</span> Kurang</span>
                  )}
                </div>
                <div className="text-[10px] font-medium text-slate-500 dark:text-slate-400 leading-relaxed">
                  Total kas likuid saat ini: <span className="font-extrabold text-slate-700 dark:text-slate-300">Rp {liquidAssets.toLocaleString('id-ID')}</span>.
                  {liquidAssets < 10000000 ? (
                    <span className="text-amber-600 dark:text-[#ff9500] block mt-1">
                      ⚠️ CFP menyarankan menabung minimal Rp 5jt - 10jt sebagai starter emergency fund sebelum melunasi utang ekstra agar tidak terjerumus utang baru saat darurat.
                    </span>
                  ) : (
                    <span className="text-[#28cd41] block mt-1">
                      Kas likuid Anda mencukupi sebagai buffer darurat selama masa pelunasan utang terakselerasi.
                    </span>
                  )}
                </div>
              </div>

              {/* Negative Amortization Alerts */}
              {negativeAmortizationDebts.length > 0 && (
                <div className="pt-4 border-t border-red-500/10 dark:border-red-500/20 bg-red-50/30 dark:bg-[#ff3b30]/10 p-3 rounded-xl space-y-1">
                  <span className="text-xs font-black text-[#ff3b30] flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">error</span>
                    Amortisasi Negatif Terdeteksi!
                  </span>
                  <div className="text-[9px] font-bold text-[#ff3b30] leading-relaxed">
                    Cicilan minimum tidak cukup menutupi bunga bulanan pada:
                    <ul className="list-disc pl-3.5 mt-1 space-y-0.5">
                      {negativeAmortizationDebts.map(d => (
                        <li key={d.id} className="font-extrabold">{d.name} (Bunga: Rp {Math.round((d.balance * (d.interestRate / 100)) / 12).toLocaleString('id-ID')} vs Cicilan: Rp {d.minPayment.toLocaleString('id-ID')})</li>
                      ))}
                    </ul>
                    <span className="block mt-1 font-semibold opacity-90">Tingkatkan cicilan bulanan Anda untuk menghindari utang yang terus menggelembung!</span>
                  </div>
                </div>
              )}
            </div>

            {/* Comparison View Card */}
            <div className="bg-[#f5f5f7] dark:bg-[#1c1c1e] p-6 rounded-3xl border border-black/[0.05] dark:border-white/[0.05] relative overflow-hidden shadow-inner">
              <div className="relative z-10">
                <h3 className="font-headline font-bold text-lg mb-6 text-slate-800 dark:text-white">Perbandingan Proyeksi</h3>
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between items-end mb-2">
                      <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 tracking-wide">Cicilan Minimum Saja</span>
                      <span className="font-headline font-bold text-sm text-slate-700 dark:text-slate-300">{minMonth}</span>
                    </div>
                    <div className="h-2 w-full bg-black/[0.04] dark:bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-slate-400 w-full rounded-full"></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between items-end mb-2">
                      <span className="text-[10px] font-bold text-[#007aff] tracking-wide">Metode {strategy.charAt(0).toUpperCase() + strategy.slice(1)}</span>
                      <span className="font-headline font-bold text-[#007aff] text-sm">{payoffMonth}</span>
                    </div>
                    <div className="h-2 w-full bg-black/[0.04] dark:bg-white/10 rounded-full overflow-hidden relative">
                      <motion.div 
                        animate={{ width: `${(payoffData.totalMonths / minOnlyData.totalMonths) * 100}%` }}
                        className="h-full bg-[#007aff] rounded-full relative z-10"
                      />
                    </div>
                  </div>
                </div>
                <div className="mt-8 pt-6 border-t border-black/[0.04] dark:border-white/5">
                  <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Estimasi Penghematan Bunga</div>
                  <div className="text-2xl font-black font-headline mt-2 text-[#28cd41] dark:text-[#30d158] tabular-nums">
                    Rp {interestSaved > 0 ? interestSaved.toLocaleString('id-ID') : '0'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Data Visualization & Debt List */}
          <div className="lg:col-span-8 space-y-6 lg:space-y-8">
            
            {/* Debt Reduction Chart Area */}
            <div className="bg-white/40 dark:bg-white/[0.02] p-6 lg:p-8 rounded-3xl border border-black/[0.05] dark:border-white/[0.05] shadow-sm">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-8">
                <div>
                  <h3 className="font-headline font-bold text-xl text-slate-800 dark:text-white">Proyeksi Pengurangan Utang</h3>
                  <p className="text-[10px] font-medium text-slate-400 mt-1">Bandingkan kurva pelunasan metode minimum (garis putus-putus) vs akselerasi pilihan Anda (garis biru).</p>
                </div>
                <div className="flex items-center gap-4 text-xs font-bold text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-[#007aff] shadow-sm"></span>
                    Simulasi Akselerasi
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full border border-dashed border-slate-400 bg-transparent"></span>
                    Cicilan Minimum
                  </div>
                </div>
              </div>
              
              {/* Chart Representation */}
              <div className="relative h-64 w-full group">
                <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 800 200">
                  {/* Grid Lines */}
                  {[40, 80, 120, 160].map(y => (
                    <line key={y} stroke="currentColor" className="text-black/[0.04] dark:text-white/5" strokeWidth="1" x1="0" x2="800" y1={y} y2={y} />
                  ))}
                  
                  {/* Baseline dotted path */}
                  <AnimatePresence mode="wait">
                    <motion.path 
                      key="baseline-path"
                      initial={{ d: baselinePath, opacity: 0 }}
                      animate={{ d: baselinePath, opacity: 0.4 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.8, ease: "easeInOut" }}
                      d={baselinePath} 
                      fill="none" 
                      stroke="#94a3b8" 
                      strokeDasharray="4 4" 
                      strokeWidth="2" 
                    />
                  </AnimatePresence>

                  {/* Area Path */}
                  <AnimatePresence mode="wait">
                    <motion.path 
                      key={strategy}
                      initial={{ d: currentPath, opacity: 0 }}
                      animate={{ d: currentPath, opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.8, ease: "easeInOut" }}
                      d={currentPath + ` L 800 200 L 0 200 Z`} 
                      fill="url(#grad-debt)" 
                      fillOpacity="0.1"
                    />
                    {/* Line Path */}
                    <motion.path 
                      key={strategy + "-line"}
                      initial={{ d: currentPath, pathLength: 0 }}
                      animate={{ d: currentPath, pathLength: 1 }}
                      transition={{ duration: 1.5, ease: "easeOut" }}
                      d={currentPath} 
                      fill="none" 
                      stroke="url(#line-grad-debt)" 
                      strokeLinecap="round" 
                      strokeWidth="4"
                    />
                  </AnimatePresence>
                  
                  <defs>
                    <linearGradient id="grad-debt" x1="0%" x2="0%" y1="0%" y2="100%">
                      <stop offset="0%" stopColor="#007aff" stopOpacity="1"></stop>
                      <stop offset="100%" stopColor="#007aff" stopOpacity="0"></stop>
                    </linearGradient>
                    <linearGradient id="line-grad-debt" x1="0%" x2="100%" y1="0%" y2="0%">
                      <stop offset="0%" stopColor="#007aff"></stop>
                      <stop offset="100%" stopColor="#34c759"></stop>
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute bottom-[-16px] left-0 w-full flex justify-between px-2 pt-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  <span>Sekarang</span>
                  {yearLabels.slice(1).map(year => (
                    <span key={year} className="hidden sm:inline">{year}</span>
                  ))}
                </div>
                
                {/* Tooltip Overlay (Interaction Hook) */}
                <div onClick={() => setIsSimulatorOpen(true)} className="absolute inset-0 bg-transparent flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-[2px] rounded-2xl z-10 cursor-pointer">
                   <button className="bg-white dark:bg-[#1c1c1e] text-slate-800 dark:text-white px-4 py-2 font-bold text-xs uppercase tracking-widest rounded-xl shadow-md border border-black/[0.05] dark:border-white/[0.05]">Atur Simulator Ekstra</button>
                </div>
              </div>
            </div>

            {/* Active Debts Table */}
            <div className="bg-white/40 dark:bg-white/[0.02] rounded-3xl border border-black/[0.05] dark:border-white/[0.05] shadow-sm overflow-hidden">
              <div className="p-5 lg:p-6 border-b border-black/[0.04] dark:border-white/5 flex justify-between items-center bg-white/50 dark:bg-white/5 select-none">
                <h3 className="font-headline font-bold text-lg text-slate-800 dark:text-white">Kewajiban Aktif</h3>
                <button 
                  onClick={openAddModal}
                  className="px-3 py-1.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-90 active:scale-95 transition-all text-xs font-bold flex items-center gap-1.5 rounded-xl cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm font-bold">add</span> 
                  <span>Tambah Utang</span>
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left whitespace-nowrap lg:whitespace-normal">
                  <thead className="bg-slate-50 dark:bg-white/5">
                    <tr>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Instrumen</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Jenis & Status</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 text-right">Sisa Pokok</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 text-center">Bunga APR</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 text-right">Cicilan/Bulan</th>
                      <th className="px-6 py-4 text-right"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/[0.04] dark:divide-white/5">
                    {debts.map((debt, index) => {
                      const isGoodDebt = (debt.type || '').toLowerCase().includes('kpr') || (debt.type || '').toLowerCase().includes('rumah') || (debt.type || '').toLowerCase().includes('pendidikan') || (debt.type || '').toLowerCase().includes('school');
                      const isNegativeAmort = negativeAmortizationDebts.some(d => d.id === debt.id);

                      return (
                        <motion.tr 
                          layout
                          key={debt.id}
                          className={`${index % 2 === 1 ? 'bg-black/[0.01] dark:bg-white/[0.01]' : ''} hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors`}
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-white/5 flex items-center justify-center border border-black/[0.02] dark:border-white/[0.02]">
                                <span className="material-symbols-outlined text-base text-slate-500 dark:text-slate-400">{debt.icon}</span>
                              </div>
                              <div>
                                <div className="font-extrabold text-sm text-slate-800 dark:text-white flex items-center gap-2">
                                  {debt.name} 
                                  {debt.lender && <span className="text-[9px] font-extrabold bg-slate-200/50 dark:bg-white/10 px-2 py-0.5 rounded text-slate-500 dark:text-slate-300">{debt.lender}</span>}
                                </div>
                                <div className="text-[10px] text-slate-400 font-bold mt-0.5">{debt.type}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-1.5 items-start">
                              <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${
                                isGoodDebt 
                                  ? 'bg-sky-50 dark:bg-sky-950/20 text-sky-600 dark:text-sky-400 border border-sky-200/50 dark:border-sky-800/30' 
                                  : 'bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border border-amber-200/50 dark:border-amber-800/30'
                              }`}>
                                {isGoodDebt ? 'Utang Produktif' : 'Utang Konsumtif'}
                              </span>
                              <span className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded ${
                                debt.status === 'Lunas' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                                debt.status === 'Macet' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                'bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400'
                              }`}>
                                {debt.status || 'Aktif'}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="font-extrabold text-sm text-slate-700 dark:text-white tabular-nums">Rp {debt.balance.toLocaleString('id-ID')}</div>
                            {(debt.originalAmount ?? 0) > 0 && (
                              <div className="w-full mt-1.5 flex flex-col items-end gap-1">
                                <div className="w-24 h-1 bg-black/[0.04] dark:bg-white/10 rounded-full overflow-hidden">
                                  <div className="h-full bg-[#007aff] rounded-full" style={{ width: `${Math.min(100, Math.max(0, 100 - (debt.balance / (debt.originalAmount || 1)) * 100))}%` }}></div>
                                </div>
                                <div className="text-[9px] font-bold text-slate-400">
                                  Lunas {Math.round(100 - (debt.balance / (debt.originalAmount || 1)) * 100)}% dari Rp {(debt.originalAmount ?? 0).toLocaleString('id-ID')}
                                </div>
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="tabular-nums text-sm font-extrabold text-slate-700 dark:text-white">{debt.interestRate}%</div>
                            <div className="text-[9px] font-bold text-slate-400">{debt.interestType || 'Fixed/Flat'}</div>
                            {isNegativeAmort && (
                              <span className="inline-block mt-1 px-1.5 py-0.5 bg-red-100 dark:bg-red-950/20 text-red-700 dark:text-red-400 text-[8px] font-black uppercase tracking-wider rounded">
                                Amortisasi Negatif
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="tabular-nums text-sm font-extrabold text-slate-700 dark:text-slate-300">Rp {debt.minPayment.toLocaleString('id-ID')}</div>
                            {debt.dueDate && <div className="text-[9px] font-bold text-slate-400 mt-0.5">Jatuh Tempo: Tgl {debt.dueDate}</div>}
                          </td>
                          <td className="px-6 py-4 text-right relative">
                            <button 
                              onClick={() => setShowActionId(showActionId === debt.id ? null : debt.id)} 
                              className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-full text-slate-400 transition-colors cursor-pointer"
                            >
                              <span className="material-symbols-outlined text-[1.2rem]">more_vert</span>
                            </button>
                            
                            <AnimatePresence>
                              {showActionId === debt.id && (
                                <>
                                  <div className="fixed inset-0 z-40" onClick={() => setShowActionId(null)} />
                                  <motion.div 
                                    initial={{ opacity: 0, scale: 0.9, y: -10 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.9, y: -10 }}
                                    className="absolute right-6 top-12 w-32 bg-white dark:bg-[#191c1e] shadow-xl rounded-xl border border-slate-200 dark:border-white/10 z-50 overflow-hidden"
                                  >
                                    <button onClick={() => openEditModal(debt)} className="w-full px-4 py-2.5 text-xs font-bold text-left hover:bg-slate-50 dark:hover:bg-white/5 flex items-center gap-2 dark:text-white cursor-pointer">
                                      <span className="material-symbols-outlined text-sm">edit</span> Edit
                                    </button>
                                    <button onClick={() => handleDeleteDebt(debt.id)} className="w-full px-4 py-2.5 text-xs font-bold text-left hover:bg-red-50 dark:hover:bg-red-900/10 text-red-600 flex items-center gap-2 cursor-pointer">
                                      <span className="material-symbols-outlined text-sm">delete</span> Hapus
                                    </button>
                                  </motion.div>
                                </>
                              )}
                            </AnimatePresence>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
      <DebtFormModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveDebt}
        editingDebt={editingDebt}
      />
      <DebtSimulatorModal
        isOpen={isSimulatorOpen}
        onClose={() => setIsSimulatorOpen(false)}
        currentExtraPayment={extraPayment}
        onApply={setExtraPayment}
        debts={debts}
        monthlyIncome={monthlyIncome}
        weightedInterest={weightedInterest}
        surplusCash={surplusCash}
      />
    </div>
  );
};

export default FinanceDebts;
