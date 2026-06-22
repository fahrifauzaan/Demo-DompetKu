import React from 'react';
import { FeatureCTA } from './MarketingCTAModal';
import { useFinanceStore } from '../store/useFinanceStore';
import { motion, AnimatePresence } from 'motion/react';

interface FinanceDashboardProps {
  onShowCTA: (feature?: FeatureCTA) => void;
  onNavigate?: (tab: string) => void;
}

const FinanceDashboard: React.FC<FinanceDashboardProps> = ({ onShowCTA, onNavigate }) => {
  const [chartPeriod, setChartPeriod] = React.useState<'6B' | '1T' | 'SEMUA'>('1T');
  const [hoveredPoint, setHoveredPoint] = React.useState<number | null>(null);
  const [activeTab, setActiveTab] = React.useState<'overview' | 'ratios' | 'balanceSheet'>('overview');

  // Fetch all dynamic data from Zustand store
  const { transactions, accounts, assets, debts, settings } = useFinanceStore();

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      
      const day = date.getDate();
      const monthNames = [
        'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
        'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'
      ];
      const month = monthNames[date.getMonth()];
      const year = date.getFullYear();
      
      return `${day}-${month}-${year}`;
    } catch (e) {
      return dateStr;
    }
  };

  // ==================== CFP & CFA FINANCIAL CALCULATIONS ====================

  // 1. Core Capital structure
  const totalCash = accounts.reduce((sum, a) => sum + a.balance, 0);
  const totalInvestments = assets.filter(a => a.category === 'investasi').reduce((sum, a) => sum + a.currentValue, 0);
  const totalPhysical = assets.filter(a => a.category !== 'investasi').reduce((sum, a) => sum + a.currentValue, 0);
  const totalDebts = debts.reduce((sum, d) => sum + d.balance, 0);
  const totalAssets = totalCash + totalInvestments + totalPhysical;
  const netWorth = totalAssets - totalDebts;

  // Helper to distinguish between consumption and asset allocation
  const isAssetAllocation = (catName: string): boolean => {
    const norm = (catName || '').toLowerCase();
    if (norm.includes('income') || norm.includes('dividend') || norm.includes('kupon') || norm.includes('bunga')) {
      return false;
    }
    return (
      norm.includes('saving') || 
      norm.includes('tabungan') || 
      norm.includes('darurat') || 
      norm.includes('emergency') || 
      norm.includes('sinking') ||
      norm.includes('invest') || 
      norm.includes('saham') || 
      norm.includes('crypto') || 
      norm.includes('reksa') || 
      norm.includes('bond') || 
      norm.includes('emas') || 
      norm.includes('gold') || 
      norm.includes('kripto') ||
      norm.includes('deposito') ||
      norm.includes('transfer')
    );
  };

  // 2. Average Monthly Expenses (CFP methodology)
  const expensesByMonth: Record<string, number> = {};
  transactions.forEach(t => {
    if (t.type === 'PENGELUARAN' && t.date && !isAssetAllocation(t.category)) {
      const monthKey = t.date.substring(0, 7); // YYYY-MM
      expensesByMonth[monthKey] = (expensesByMonth[monthKey] || 0) + Math.abs(t.amount);
    }
  });
  const monthsCount = Object.keys(expensesByMonth).length;
  const avgMonthlyExpense = monthsCount > 0 
    ? Object.values(expensesByMonth).reduce((a, b) => a + b, 0) / monthsCount 
    : 15000000; // fallback default 15jt IDR

  // 3. Emergency Fund Coverage (CFP Liquidity Index)
  const emergencyFundMonths = avgMonthlyExpense > 0 ? (totalCash / avgMonthlyExpense) : 0;
  const emergencyTargetMonths = 6;
  const emergencyCoveragePercent = Math.min(Math.round((emergencyFundMonths / emergencyTargetMonths) * 100), 100);

  // 4. Monthly Savings Rate (CFP standard: target >= 20%)
  const totalIncome = transactions
    .filter(t => t.type === 'PEMASUKAN' && !isAssetAllocation(t.category))
    .reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = Math.abs(
    transactions
      .filter(t => t.type === 'PENGELUARAN' && !isAssetAllocation(t.category))
      .reduce((sum, t) => sum + t.amount, 0)
  );

  const now = new Date();
  const currentMonthTx = transactions.filter(t => {
    if (!t.date) return false;
    try {
      const txDate = new Date(t.date);
      return txDate.getMonth() === now.getMonth() && txDate.getFullYear() === now.getFullYear();
    } catch {
      return false;
    }
  });

  const currentMonthIncome = currentMonthTx
    .filter(t => t.type === 'PEMASUKAN' && !isAssetAllocation(t.category))
    .reduce((sum, t) => sum + t.amount, 0);
  const currentMonthExpense = Math.abs(
    currentMonthTx
      .filter(t => t.type === 'PENGELUARAN' && !isAssetAllocation(t.category))
      .reduce((sum, t) => sum + t.amount, 0)
  );

  const displayIncome = (currentMonthIncome > 0 || currentMonthExpense > 0) ? currentMonthIncome : totalIncome;
  const displayExpense = (currentMonthIncome > 0 || currentMonthExpense > 0) ? currentMonthExpense : totalExpense;
  const displaySavings = displayIncome - displayExpense;
  
  const savingsRate = displayIncome > 0 ? (displaySavings / displayIncome) * 100 : 0;

  // 5. Solvency Ratio (CFP standard: Debt-to-Asset <= 35%)
  const solvencyRatio = totalAssets > 0 ? (totalDebts / totalAssets) * 100 : 0;

  // 6. Debt Service Ratio (CFP standard: monthly debt payments / gross income <= 35%)
  const monthlyDebtPayments = debts.reduce((sum, d) => sum + (d.minPayment || 0), 0);
  const settingMonthlyIncome = parseInt(settings.find(s => s.key === 'monthlyIncome')?.value || '0', 10) || displayIncome || 30000000;
  const debtServiceRatio = settingMonthlyIncome > 0 ? (monthlyDebtPayments / settingMonthlyIncome) * 100 : 0;

  // 7. Capital Quality Index (Productive vs. Consumptive Assets)
  const productiveAssets = totalCash + totalInvestments;
  const capitalQualityIndex = totalAssets > 0 ? (productiveAssets / totalAssets) * 100 : 0;

  // 8. Weighted Interest Cost of Debt
  const totalWeightedInterest = debts.reduce((sum, d) => sum + (d.balance * d.interestRate), 0);
  const debtCostIndex = totalDebts > 0 ? (totalWeightedInterest / totalDebts) : 0;

  // Portfolio Allocation percentages
  const realEstatPercent = totalAssets > 0 ? Math.round((totalPhysical / totalAssets) * 100) : 0;
  const ekuitasPercent = totalAssets > 0 ? Math.round((totalInvestments / totalAssets) * 100) : 0;
  const kasPercent = totalAssets > 0 ? Math.round((totalCash / totalAssets) * 100) : 0;
  const debtPercent = totalAssets > 0 ? Math.round((totalDebts / totalAssets) * 100) : 0;

  // ==================== DYNAMIC CHART GENERATION ====================
  const getDynamicChartData = (period: '6B' | '1T' | 'SEMUA') => {
    let numMonths = 12;
    if (period === '6B') numMonths = 6;
    else if (period === '1T') numMonths = 12;
    else numMonths = 12;

    const monthKeys: string[] = [];
    for (let i = numMonths - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      monthKeys.push(`${yyyy}-${mm}`);
    }

    const monthlyChanges: Record<string, number> = {};
    transactions.forEach(tx => {
      if (!tx.date) return;
      const key = tx.date.slice(0, 7);
      const change = tx.type === 'PEMASUKAN' ? tx.amount : tx.type === 'PENGELUARAN' ? -tx.amount : 0;
      if (!isAssetAllocation(tx.category)) {
        monthlyChanges[key] = (monthlyChanges[key] || 0) + change;
      }
    });

    const history: { label: string; val: number; x: number; y: number }[] = [];
    let currentNW = netWorth;

    for (let i = monthKeys.length - 1; i >= 0; i--) {
      const mKey = monthKeys[i];
      const d = new Date(mKey + '-02');
      const label = d.toLocaleDateString('id-ID', { month: 'short' });
      history.unshift({
        label,
        val: currentNW,
        x: 0,
        y: 0
      });
      const changeThisMonth = monthlyChanges[mKey] || 0;
      currentNW -= changeThisMonth;
    }

    const vals = history.map(h => h.val);
    const maxNW = Math.max(...vals);
    const minNW = Math.min(...vals);
    const diff = maxNW - minNW;

    return history.map((h, index) => {
      const x = (index / (history.length - 1)) * 100;
      const y = diff > 0 ? 85 - ((h.val - minNW) / diff) * 70 : 50;
      return {
        label: h.label,
        val: h.val,
        x,
        y
      };
    });
  };

  const currentData = getDynamicChartData(chartPeriod);

  const generatePath = (data: typeof currentData) => {
    if (data.length < 2) return "";
    let path = `M${data[0].x},${data[0].y}`;
    for (let i = 0; i < data.length - 1; i++) {
      const xmid = (data[i].x + data[i+1].x) / 2;
      path += ` C${xmid},${data[i].y} ${xmid},${data[i+1].y} ${data[i+1].x},${data[i+1].y}`;
    }
    return path;
  };

  return (
    <div className="space-y-5 sm:space-y-6 lg:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Header and Subtitle */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-black/[0.04] dark:border-white/5 pb-4">
        <div>
          <h1 className="font-headline font-black text-2xl md:text-3xl text-[#1d1d1f] dark:text-white flex flex-wrap items-center gap-2 tracking-tight">
            Konsol Kekayaan Bersih
            <span className="text-[9px] bg-slate-900/5 dark:bg-white/10 text-slate-700 dark:text-slate-300 px-2.5 py-1 rounded-full font-sans font-bold uppercase tracking-wider shrink-0">Analisis Finansial</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs md:text-sm mt-1 font-medium">
            Monitor, analisis, dan proyeksikan struktur portofolio aset, kesehatan finansial, serta solvabilitas modal secara institusional.
          </p>
        </div>

        {/* Tab Switcher - Apple Segmented Control (W-Full on Mobile, centered) */}
        <div className="flex w-full md:w-auto bg-[#f5f5f7] dark:bg-[#1c1c1e] p-1 rounded-2xl border border-black/[0.04] dark:border-white/[0.04] shadow-inner select-none">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex-1 md:flex-initial justify-center px-3 md:px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'overview'
                ? 'bg-white dark:bg-[#2c2c2e] text-[#007aff] dark:text-white shadow-sm border border-black/[0.04] dark:border-white/[0.04]'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            <span className="material-symbols-outlined text-[1rem]">dashboard</span>
            <span>Ikhtisar</span>
          </button>
          <button
            onClick={() => setActiveTab('ratios')}
            className={`flex-1 md:flex-initial justify-center px-3 md:px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'ratios'
                ? 'bg-white dark:bg-[#2c2c2e] text-[#007aff] dark:text-white shadow-sm border border-black/[0.04] dark:border-white/[0.04]'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            <span className="material-symbols-outlined text-[1rem]">analytics</span>
            <span className="hidden md:inline">Rasio Kesehatan Keuangan</span>
            <span className="md:hidden">Rasio Kesehatan</span>
          </button>
          <button
            onClick={() => setActiveTab('balanceSheet')}
            className={`flex-1 md:flex-initial justify-center px-3 md:px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'balanceSheet'
                ? 'bg-white dark:bg-[#2c2c2e] text-[#007aff] dark:text-white shadow-sm border border-black/[0.04] dark:border-white/[0.04]'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            <span className="material-symbols-outlined text-[1rem]">account_balance</span>
            <span className="hidden md:inline">Neraca & Portfolio</span>
            <span className="md:hidden">Neraca</span>
          </button>
        </div>
      </div>

      {/* Tab Contents */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          transition={{ duration: 0.3 }}
        >
          
          {/* ==================== TAB 1: OVERVIEW ==================== */}
          {activeTab === 'overview' && (
            <div className="space-y-5 sm:space-y-6 lg:space-y-8">
              {/* Hero Section: Net Worth Overview & Quick Actions (Grid-span adjusts for desktop/tablet/mobile) */}
              <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5 lg:gap-6">

                {/* Total Net Worth Card */}
                <div className="relative overflow-hidden lg:col-span-2 p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-[#ffffff] via-[#fbfbfb] to-[#f5f5f7] dark:from-[#1c1c1e] dark:via-[#151517] dark:to-[#1c1c1e] border border-black/[0.06] dark:border-white/[0.08] shadow-[0_4px_24px_-4px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_24px_-4px_rgba(0,0,0,0.4)] flex flex-col justify-between group transition-all duration-500 min-h-[180px] sm:min-h-[200px] liquid-shine">
                  <div className="relative z-10">
                    <p className="font-label text-[#8e8e93] dark:text-slate-500 font-bold tracking-wider mb-2 uppercase text-[9px]">
                      Kekayaan Bersih Aktual (Net Worth)
                    </p>
                    <h2 className="font-headline text-2xl sm:text-4xl lg:text-5xl font-black text-[#1d1d1f] dark:text-white tabular-nums tracking-tight break-words">
                      Rp {netWorth.toLocaleString('id-ID')}
                    </h2>
                    <div className="mt-4 sm:mt-6 flex flex-wrap items-center gap-3">
                      <span className="flex items-center text-[#28cd41] dark:text-[#30d158] bg-[#28cd41]/10 px-3 py-1 rounded-full text-xs font-bold border border-[#28cd41]/15">
                        <span className="material-symbols-outlined text-[1rem] mr-1 font-bold">trending_up</span>
                        +12.5% YoY
                      </span>
                      <span className="text-slate-400 dark:text-slate-500 text-xs font-semibold">vs Tahun Lalu</span>
                    </div>
                  </div>
                  
                  {/* Subtle Monochrome SVGWaves */}
                  <div className="absolute bottom-0 left-0 right-0 h-24 sm:h-32 opacity-20 dark:opacity-25 pointer-events-none">
                    <svg className="w-full h-full" viewBox="0 0 1000 300" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="hero-grad" x1="0" x2="0" y1="0" y2="1">
                          <stop offset="0%" stopColor="#007aff" stopOpacity="0.25" />
                          <stop offset="100%" stopColor="transparent" stopOpacity="0" />
                        </linearGradient>
                        <linearGradient id="hero-line-grad" x1="0" x2="1" y1="0" y2="0">
                          <stop offset="0%" stopColor="#8e8e93" />
                          <stop offset="100%" stopColor="#007aff" />
                        </linearGradient>
                      </defs>
                      <g>
                        <path d={generatePath(currentData.map(d => ({...d, y: d.y * 2 + 50})))} fill="none" stroke="#007aff" strokeWidth="6" strokeLinecap="round" className="blur-[6px]" opacity="0.1" />
                        <path d={generatePath(currentData.map(d => ({...d, y: d.y * 2 + 50})))} fill="none" stroke="url(#hero-line-grad)" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
                        <path d={generatePath(currentData.map(d => ({...d, y: d.y * 2 + 50}))) + " L100,300 L0,300 Z"} fill="url(#hero-grad)" opacity="0.15" />
                      </g>
                    </svg>
                  </div>
                </div>

                {/* Quick Actions Grid - Apple Style (2x2 Mobile, 1x4 Tablet, 2x2 Desktop) */}
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-4">
                  <button 
                    onClick={() => onNavigate?.('add-transaction')} 
                    className="relative overflow-hidden bg-white/50 dark:bg-white/[0.02] hover:bg-white/80 dark:hover:bg-white/[0.04] flex flex-col items-center justify-center p-4 sm:p-6 rounded-3xl group cursor-pointer border border-black/[0.05] dark:border-white/[0.06] active:scale-95 transition-all duration-300 shadow-sm"
                  >
                    <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-[22%] bg-slate-100 dark:bg-white/5 flex items-center justify-center mb-2 sm:mb-3 transition-transform duration-300 group-hover:scale-105 border border-black/[0.02] dark:border-white/[0.02]">
                      <span className="material-symbols-outlined text-slate-700 dark:text-slate-300 text-lg">add_card</span>
                    </div>
                    <span className="text-[11px] sm:text-xs font-semibold text-slate-700 dark:text-slate-200 tracking-tight text-center">Tambah Transaksi</span>
                  </button>
                  
                  <button 
                    onClick={() => onNavigate?.('add-asset')} 
                    className="relative overflow-hidden bg-white/50 dark:bg-white/[0.02] hover:bg-white/80 dark:hover:bg-white/[0.04] flex flex-col items-center justify-center p-4 sm:p-6 rounded-3xl group cursor-pointer border border-black/[0.05] dark:border-white/[0.06] active:scale-95 transition-all duration-300 shadow-sm"
                  >
                    <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-[22%] bg-slate-100 dark:bg-white/5 flex items-center justify-center mb-2 sm:mb-3 transition-transform duration-300 group-hover:scale-105 border border-black/[0.02] dark:border-white/[0.02]">
                      <span className="material-symbols-outlined text-slate-700 dark:text-slate-300 text-lg">account_balance_wallet</span>
                    </div>
                    <span className="text-[11px] sm:text-xs font-semibold text-slate-700 dark:text-slate-200 tracking-tight text-center">Tambah Aset</span>
                  </button>
                  
                  <button 
                    onClick={() => onNavigate?.('analytics')} 
                    className="relative overflow-hidden bg-white/50 dark:bg-white/[0.02] hover:bg-white/80 dark:hover:bg-white/[0.04] flex flex-col items-center justify-center p-4 sm:p-6 rounded-3xl group cursor-pointer border border-black/[0.05] dark:border-white/[0.06] active:scale-95 transition-all duration-300 shadow-sm"
                  >
                    <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-[22%] bg-slate-100 dark:bg-white/5 flex items-center justify-center mb-2 sm:mb-3 transition-transform duration-300 group-hover:scale-105 border border-black/[0.02] dark:border-white/[0.02]">
                      <span className="material-symbols-outlined text-slate-700 dark:text-slate-300 text-lg">assessment</span>
                    </div>
                    <span className="text-[11px] sm:text-xs font-semibold text-slate-700 dark:text-slate-200 tracking-tight text-center">Laporan</span>
                  </button>
                  
                  <button 
                    onClick={() => onNavigate?.('notifications')} 
                    className="relative overflow-hidden bg-white/50 dark:bg-white/[0.02] hover:bg-white/80 dark:hover:bg-white/[0.04] flex flex-col items-center justify-center p-4 sm:p-6 rounded-3xl group cursor-pointer border border-black/[0.05] dark:border-white/[0.06] active:scale-95 transition-all duration-300 shadow-sm"
                  >
                    <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-[22%] bg-slate-100 dark:bg-white/5 flex items-center justify-center mb-2 sm:mb-3 transition-transform duration-300 group-hover:scale-105 border border-black/[0.02] dark:border-white/[0.02]">
                      <span className="material-symbols-outlined text-slate-700 dark:text-slate-300 text-lg">notifications_active</span>
                    </div>
                    <span className="text-[11px] sm:text-xs font-semibold text-slate-700 dark:text-slate-200 tracking-tight text-center">Notifikasi</span>
                  </button>
                </div>
              </section>

              {/* Secondary Metrics - Minimalist Clean Cards (1 col Mobile, 3 cols Tablet/Desktop) */}
              <section className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
                
                {/* Total Income */}
                <div className="relative overflow-hidden p-4 sm:p-5 lg:p-6 rounded-2xl sm:rounded-3xl bg-white/40 dark:bg-white/[0.02] border border-black/[0.05] dark:border-white/[0.05] shadow-sm group hover:scale-[1.01] transition-all duration-300">
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-9 h-9 bg-slate-100 dark:bg-white/5 rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-300 border border-black/[0.02] dark:border-white/[0.02]">
                      <span className="material-symbols-outlined text-base font-bold">payments</span>
                    </div>
                    <span className="px-2 py-0.5 bg-[#e3fbe3] dark:bg-[#1a3822] text-[#28cd41] dark:text-[#30d158] border border-[#28cd41]/10 rounded-full text-[9px] font-bold tracking-wide">
                      Inflow
                    </span>
                  </div>
                  <p className="text-slate-400 dark:text-slate-500 font-label text-[9px] uppercase font-bold tracking-wider mb-1">
                    Pendapatan Bulanan
                  </p>
                  <h3 className="font-headline text-xl font-extrabold text-slate-800 dark:text-slate-100 tabular-nums tracking-tight">
                    Rp {displayIncome.toLocaleString('id-ID')}
                  </h3>
                </div>

                {/* Total Expense */}
                <div className="relative overflow-hidden p-4 sm:p-5 lg:p-6 rounded-2xl sm:rounded-3xl bg-white/40 dark:bg-white/[0.02] border border-black/[0.05] dark:border-white/[0.05] shadow-sm group hover:scale-[1.01] transition-all duration-300">
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-9 h-9 bg-slate-100 dark:bg-white/5 rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-300 border border-black/[0.02] dark:border-white/[0.02]">
                      <span className="material-symbols-outlined text-base font-bold">shopping_bag</span>
                    </div>
                    <span className="px-2 py-0.5 bg-[#ffebeb] dark:bg-[#3a1d1d] text-[#ff3b30] dark:text-[#ff453a] border border-[#ff3b30]/10 rounded-full text-[9px] font-bold tracking-wide">
                      Outflow
                    </span>
                  </div>
                  <p className="text-slate-400 dark:text-slate-500 font-label text-[9px] uppercase font-bold tracking-wider mb-1">
                    Pengeluaran Bulanan
                  </p>
                  <h3 className="font-headline text-xl font-extrabold text-slate-800 dark:text-slate-100 tabular-nums tracking-tight">
                    Rp {displayExpense.toLocaleString('id-ID')}
                  </h3>
                </div>

                {/* Monthly Savings */}
                <div className="relative overflow-hidden p-4 sm:p-5 lg:p-6 rounded-2xl sm:rounded-3xl bg-white/40 dark:bg-white/[0.02] border border-black/[0.05] dark:border-white/[0.05] shadow-sm group hover:scale-[1.01] transition-all duration-300">
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-9 h-9 bg-slate-100 dark:bg-white/5 rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-300 border border-black/[0.02] dark:border-white/[0.02]">
                      <span className="material-symbols-outlined text-base font-bold">savings</span>
                    </div>
                    <span className="px-2 py-0.5 bg-[#e8f4ff] dark:bg-[#1d2d44] text-[#007aff] dark:text-[#0a84ff] border border-[#007aff]/10 rounded-full text-[9px] font-bold tracking-wide">
                      Rasio: {Math.round(savingsRate)}%
                    </span>
                  </div>
                  <p className="text-slate-400 dark:text-slate-500 font-label text-[9px] uppercase font-bold tracking-wider mb-1">
                    Tabungan Bersih
                  </p>
                  <h3 className={`font-headline text-xl font-extrabold tabular-nums tracking-tight ${displaySavings >= 0 ? 'text-slate-800 dark:text-slate-100' : 'text-rose-500 dark:text-rose-400'}`}>
                    Rp {displaySavings.toLocaleString('id-ID')}
                  </h3>
                </div>
              </section>

              {/* Net Worth Trend Graph and Portfolio Allocation breakdown */}
              <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
                
                {/* Net Worth Trend Chart */}
                <div className="relative lg:col-span-2 p-4 sm:p-6 lg:p-8 rounded-2xl sm:rounded-3xl bg-white/40 dark:bg-white/[0.02] border border-black/[0.05] dark:border-white/[0.05] shadow-sm flex flex-col justify-between">
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6 z-10">
                    <div>
                      <h4 className="font-headline text-lg font-extrabold text-[#1d1d1f] dark:text-white tracking-tight">
                        Tren Kekayaan Bersih
                      </h4>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 font-semibold">
                        Apresiasi portofolio dan akumulasi modal 12 bulan terakhir
                      </p>
                    </div>
                    
                    {/* Apple Segmented Period Switcher */}
                    <div className="relative flex bg-[#f5f5f7] dark:bg-[#1c1c1e] p-1 rounded-full text-xs font-semibold border border-black/[0.03] dark:border-white/[0.03] backdrop-blur-md self-start sm:self-auto">
                      {(['6B', '1T', 'SEMUA'] as const).map(p => (
                        <button 
                          key={p}
                          onClick={() => setChartPeriod(p)}
                          className={`relative px-3 py-1.5 rounded-full transition-all duration-300 text-[10px] font-bold tracking-wide cursor-pointer focus:outline-none ${
                            chartPeriod === p 
                              ? 'text-slate-800 dark:text-white' 
                              : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-white'
                          }`}
                        >
                          {chartPeriod === p && (
                            <motion.div 
                              layoutId="activePeriodIndicator"
                              className="absolute inset-0 bg-white dark:bg-[#2c2c2e] shadow-[0_1px_4px_rgba(0,0,0,0.04)] rounded-full -z-10 border border-black/[0.02] dark:border-white/[0.02]"
                              transition={{ type: "spring", stiffness: 380, damping: 30 }}
                            />
                          )}
                          <span className="relative z-10">{p}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div className="h-48 sm:h-64 relative w-full mt-4">
                    {/* Tooltip Overlay */}
                    <AnimatePresence>
                      {hoveredPoint !== null && currentData[hoveredPoint] && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="absolute z-20 pointer-events-none font-sans"
                          style={{ 
                            left: currentData[hoveredPoint].x > 85 ? 'auto' : currentData[hoveredPoint].x < 15 ? '0' : `${currentData[hoveredPoint].x}%`,
                            right: currentData[hoveredPoint].x > 85 ? '0' : 'auto',
                            top: `${currentData[hoveredPoint].y}%`,
                            transform: `translate(${
                              currentData[hoveredPoint].x > 85 ? '0%' : currentData[hoveredPoint].x < 15 ? '0%' : '-50%'
                            }, -120%)`
                          }}
                        >
                          <div className="bg-slate-900/90 dark:bg-[#1c1c1e]/90 backdrop-blur-md px-3.5 py-2.5 rounded-2xl shadow-xl border border-white/10 min-w-[140px]">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-0.5">{currentData[hoveredPoint].label}</p>
                            <p className="text-xs font-bold text-white">
                              Rp {currentData[hoveredPoint].val.toLocaleString('id-ID')}
                            </p>
                          </div>
                          <div 
                            className="w-2.5 h-2.5 bg-slate-900/90 dark:bg-[#1c1c1e]/90 border-r border-b border-white/10 absolute -translate-x-1/2 -bottom-1.2 rotate-45"
                            style={{
                              left: currentData[hoveredPoint].x > 85 ? 'auto' : currentData[hoveredPoint].x < 15 ? '20px' : '50%',
                              right: currentData[hoveredPoint].x > 85 ? '10px' : 'auto'
                            }}
                          ></div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Chart Grid */}
                    <div className="absolute inset-0 flex flex-col justify-between pt-2 pb-6 opacity-20">
                      {[0, 1, 2, 3].map(i => (
                        <div key={i} className="border-t border-slate-300 dark:border-white/5 w-full h-0"></div>
                      ))}
                    </div>
                    
                    {/* SVG Chart */}
                    <svg className="absolute inset-0 w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 100">
                      <defs>
                        <linearGradient id="chart-grad" x1="0" x2="0" y1="0" y2="1">
                          <stop offset="0%" stopColor="rgba(0, 122, 255, 0.15)" />
                          <stop offset="100%" stopColor="rgba(0, 122, 255, 0)" />
                        </linearGradient>
                        <linearGradient id="chart-stroke-grad" x1="0" x2="1" y1="0" y2="0">
                          <stop offset="0%" stopColor="#0a84ff" />
                          <stop offset="100%" stopColor="#5e5ce6" />
                        </linearGradient>
                      </defs>
                      <g>
                        <path d={generatePath(currentData) + " L100,100 L0,100 Z"} fill="url(#chart-grad)" />
                        {hoveredPoint !== null && currentData[hoveredPoint] && (
                          <line x1={currentData[hoveredPoint].x} y1="0" x2={currentData[hoveredPoint].x} y2="100" stroke="rgba(0, 122, 255, 0.25)" strokeWidth="0.5" strokeDasharray="4" />
                        )}
                        <path d={generatePath(currentData)} fill="none" stroke="url(#chart-stroke-grad)" strokeWidth="2" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
                        {currentData.map((p, i) => (
                          <g key={i}>
                            {hoveredPoint === i && (
                              <circle cx={p.x} cy={p.y} r={6} fill="rgba(0, 122, 255, 0.2)" vectorEffect="non-scaling-stroke" />
                            )}
                            <circle 
                              cx={p.x} cy={p.y} 
                              r={hoveredPoint === i ? 4 : 3} 
                              fill={hoveredPoint === i ? "#ffffff" : "#007aff"} 
                              stroke={hoveredPoint === i ? "#0a84ff" : "none"}
                              strokeWidth="1.5"
                              vectorEffect="non-scaling-stroke" 
                              onMouseEnter={() => setHoveredPoint(i)}
                              onMouseLeave={() => setHoveredPoint(null)}
                              className="cursor-pointer transition-all duration-200"
                            />
                          </g>
                        ))}
                      </g>
                    </svg>
                    
                    {/* Axis Labels */}
                    <div className="absolute bottom-0 w-full flex justify-between text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-1 font-sans">
                      {currentData.map((p, i) => (
                        <span key={i}>{p.label}</span>
                      ))}
                    </div>
                  </div>
                </div>
                
                {/* Brief Allocation Breakdown */}
                <div className="relative overflow-hidden p-4 sm:p-6 lg:p-8 rounded-2xl sm:rounded-3xl bg-white/40 dark:bg-white/[0.02] border border-black/[0.05] dark:border-white/[0.05] shadow-sm flex flex-col justify-between">
                  <h4 className="font-headline text-lg font-extrabold text-[#1d1d1f] dark:text-white tracking-tight mb-6">
                    Alokasi Portofolio
                  </h4>
                  <div className="space-y-5 flex-grow">
                    {/* Real Estat */}
                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="font-label text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Aset Fisik / Properti</span>
                        <span className="font-body text-xs font-semibold text-slate-800 dark:text-slate-200">{realEstatPercent}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-black/[0.04] dark:bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-[#007aff] to-[#5e5ce6] rounded-full transition-all duration-500" style={{ width: `${realEstatPercent}%` }}></div>
                      </div>
                    </div>
                    
                    {/* Ekuitas / Saham */}
                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="font-label text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Aset Investasi (Pasar Modal)</span>
                        <span className="font-body text-xs font-semibold text-slate-800 dark:text-slate-200">{ekuitasPercent}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-black/[0.04] dark:bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-[#30d158] to-[#34c759] rounded-full transition-all duration-500" style={{ width: `${ekuitasPercent}%` }}></div>
                      </div>
                    </div>
                    
                    {/* Kas */}
                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="font-label text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Kas & Setara Kas</span>
                        <span className="font-body text-xs font-semibold text-slate-800 dark:text-slate-200">{kasPercent}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-black/[0.04] dark:bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-[#8e8e93] to-[#aeaeB2] rounded-full transition-all duration-500" style={{ width: `${kasPercent}%` }}></div>
                      </div>
                    </div>
                    
                    {/* Liabilitas */}
                    <div className="pt-4 border-t border-black/[0.04] dark:border-white/5 mt-2">
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="font-label text-xs text-rose-500 dark:text-rose-400 font-bold uppercase tracking-wider">Kewajiban (Utang)</span>
                        <span className="font-body text-xs font-semibold text-rose-500 dark:text-rose-400">{debtPercent}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-rose-500/[0.05] dark:bg-rose-500/10 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-[#ff453a] to-[#ff3b30] rounded-full transition-all duration-500" style={{ width: `${debtPercent}%` }}></div>
                      </div>
                    </div>
                  </div>

                  <button 
                    onClick={() => setActiveTab('balanceSheet')}
                    className="mt-6 text-center text-primary dark:text-[#a7c8ff] font-extrabold text-xs tracking-wider uppercase hover:underline active:opacity-80 transition-all flex items-center justify-center gap-1.5 group cursor-pointer animate-pulse-subtle"
                  >
                    Rincian Balance Sheet
                    <span className="material-symbols-outlined text-[1rem] transition-transform duration-300 group-hover:translate-x-1">arrow_forward_ios</span>
                  </button>
                </div>
              </section>

              {/* Recent Activity Table */}
              <section className="relative overflow-hidden rounded-3xl bg-white/40 dark:bg-white/[0.02] border border-black/[0.05] dark:border-white/[0.05] shadow-sm">
                <div className="px-6 lg:px-8 py-5 flex justify-between items-center border-b border-black/[0.05] dark:border-white/[0.05] bg-black/[0.01] dark:bg-white/[0.01]">
                  <h4 className="font-headline text-base font-extrabold text-[#1d1d1f] dark:text-white tracking-tight">
                    Aktivitas Transaksi Terkini
                  </h4>
                  <button 
                    onClick={() => onNavigate?.('transactions')}
                    className="text-xs font-bold text-[#007aff] dark:text-[#0a84ff] uppercase tracking-wider hover:underline cursor-pointer"
                  >
                    Lihat Semua
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left whitespace-nowrap">
                    <thead className="bg-black/[0.01] dark:bg-white/[0.01] text-slate-400 dark:text-slate-500 font-label text-[9px] uppercase tracking-wider hidden sm:table-header-group border-b border-black/[0.02] dark:border-white/[0.02]">
                      <tr>
                        <th className="px-6 lg:px-8 py-3.5 font-bold">Deskripsi Transaksi</th>
                        <th className="px-6 lg:px-8 py-3.5 font-bold">Kategori</th>
                        <th className="px-6 lg:px-8 py-3.5 font-bold">Status</th>
                        <th className="px-6 lg:px-8 py-3.5 text-right font-bold">Jumlah</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/[0.03] dark:divide-white/[0.03]">
                      {transactions.slice(0, 5).map((t, idx) => {
                        const isNegative = t.amount < 0;
                        return (
                          <tr key={`${t.id}-${idx}`} className="hover:bg-black/[0.01] dark:hover:bg-white/[0.01] transition-colors flex flex-wrap sm:table-row p-4 sm:p-0">
                            <td className="w-full sm:w-auto px-0 sm:px-6 lg:px-8 py-2 sm:py-4 order-1 sm:order-none">
                              <div className="flex items-center gap-3">
                                <div 
                                  className="w-10 h-10 shrink-0 rounded-[22%] flex items-center justify-center border"
                                  style={{
                                    backgroundColor: isNegative ? 'rgba(255, 59, 48, 0.08)' : 'rgba(40, 205, 65, 0.08)',
                                    borderColor: isNegative ? 'rgba(255, 59, 48, 0.12)' : 'rgba(40, 205, 65, 0.12)'
                                  }}
                                >
                                  <span className={`material-symbols-outlined text-base font-bold ${isNegative ? 'text-[#ff3b30]' : 'text-[#28cd41]'}`}>
                                    {t.icon}
                                  </span>
                                </div>
                                <div>
                                  <span className="font-body font-bold text-slate-800 dark:text-slate-200 block text-sm tracking-tight border-none">
                                    {t.desc}
                                  </span>
                                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold mt-0.5 flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[11px]">calendar_today</span>
                                    {formatDate(t.date)}
                                    <span className="sm:hidden ml-1">• {t.category}</span>
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="hidden sm:table-cell px-6 lg:px-8 py-4">
                              <span className="px-2 py-1 bg-black/[0.03] dark:bg-white/5 text-slate-500 dark:text-slate-300 rounded-lg text-[9px] font-bold uppercase tracking-wider border border-black/[0.02] dark:border-white/[0.02]">
                                {t.category}
                              </span>
                            </td>
                            <td className="hidden sm:table-cell px-6 lg:px-8 py-4">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${t.status === 'Selesai' ? 'bg-[#e3fbe3] dark:bg-[#1a3822] text-[#28cd41] dark:text-[#30d158] border-[#28cd41]/10' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/10'}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${t.status === 'Selesai' ? 'bg-[#28cd41] dark:bg-[#30d158]' : 'bg-amber-500'}`} />
                                {t.status}
                              </span>
                            </td>
                            <td className={`w-full sm:w-auto px-0 sm:px-6 lg:px-8 py-2 sm:py-4 text-left sm:text-right font-bold tabular-nums order-2 sm:order-none text-sm flex justify-between sm:block items-center ${isNegative ? 'text-[#ff3b30]' : 'text-[#28cd41]'}`}>
                              <span className="sm:hidden text-xs text-slate-400 font-semibold">{t.status}</span>
                              <span>
                                {isNegative ? '-' : '+'}Rp {Math.abs(t.amount).toLocaleString('id-ID')}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          )}

          {/* ==================== TAB 2: HEALTH RATIOS (CFP® STANDARDS) ==================== */}
          {activeTab === 'ratios' && (
            <div className="space-y-5 sm:space-y-6 lg:space-y-8">
              
              {/* Educational Banner */}
              <div className="p-4 sm:p-5 lg:p-6 rounded-2xl sm:rounded-3xl bg-[#f5f5f7] dark:bg-white/[0.02] border border-black/[0.04] dark:border-white/[0.04] flex gap-3 sm:gap-4 items-start shadow-sm">
                <span className="material-symbols-outlined text-[#007aff] dark:text-[#0a84ff] text-xl shrink-0 mt-0.5">info</span>
                <div className="space-y-1">
                  <h4 className="font-headline font-bold text-slate-900 dark:text-white text-xs md:text-sm">Rasio Kesehatan Keuangan Standard Profesional</h4>
                  <p className="text-[11px] md:text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                    Indikator di bawah ini dievaluasi secara dinamis berdasarkan standar perencanaan keuangan personal profesional untuk memastikan kekayaan Anda terakumulasi secara sehat, likuid, dan memiliki mitigasi risiko utang yang aman.
                  </p>
                </div>
              </div>

              {/* Ratios Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 lg:gap-6">
                
                {/* Ratio 1: Savings Rate */}
                <div className="p-4 sm:p-5 lg:p-6 rounded-2xl sm:rounded-3xl bg-white/40 dark:bg-white/[0.02] border border-black/[0.05] dark:border-white/[0.05] shadow-sm space-y-4 hover:scale-[1.01] transition-transform duration-300">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Rasio Menabung</span>
                      <h4 className="font-headline font-extrabold text-base text-slate-800 dark:text-slate-100 mt-1">Savings Rate</h4>
                    </div>
                    {(() => {
                      const isGood = savingsRate >= 20;
                      const isOk = savingsRate >= 10 && savingsRate < 20;
                      const isLow = savingsRate >= 0 && savingsRate < 10;
                      
                      let badgeColor = 'bg-[#ffebeb] text-[#ff3b30] dark:bg-[#3a1d1d] dark:text-[#ff453a] border-[#ff3b30]/10';
                      let statusText = 'Perlu Perbaikan';
                      
                      if (isGood) {
                        badgeColor = 'bg-[#e3fbe3] dark:bg-[#1a3822] text-[#28cd41] dark:text-[#30d158] border-[#28cd41]/10';
                        statusText = 'Optimal (>=20%)';
                      } else if (isOk) {
                        badgeColor = 'bg-amber-500/10 text-amber-500 border-amber-500/10';
                        statusText = 'Sehat (10-20%)';
                      } else if (isLow) {
                        badgeColor = 'bg-orange-500/10 text-orange-500 border-orange-500/10';
                        statusText = 'Rendah (<10%)';
                      } else if (savingsRate < 0) {
                        statusText = 'Defisit (<0%)';
                      }
                      
                      return (
                        <span className={`px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-full border ${badgeColor}`}>
                          {statusText}
                        </span>
                      );
                    })()}
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-baseline">
                      <span className="text-2xl font-black text-slate-800 dark:text-slate-100 font-headline">{savingsRate.toFixed(1)}%</span>
                      <span className="text-xs text-slate-400 font-medium">Target Standard: &ge; 20%</span>
                    </div>
                    <div className="h-1.5 w-full bg-black/[0.04] dark:bg-white/10 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-1000 ${savingsRate >= 20 ? 'bg-[#28cd41]' : savingsRate >= 10 ? 'bg-amber-500' : 'bg-[#ff3b30]'}`} 
                        style={{ width: `${Math.min(Math.max(savingsRate, 0), 100)}%` }}
                      ></div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-sans font-medium">
                    Mengukur seberapa besar porsi pendapatan bulanan Anda yang dialokasikan kembali untuk investasi dan tabungan setelah dikurangi seluruh biaya operasional konsumsi.
                  </p>
                </div>

                {/* Ratio 2: Emergency Fund */}
                <div className="p-4 sm:p-5 lg:p-6 rounded-2xl sm:rounded-3xl bg-white/40 dark:bg-white/[0.02] border border-black/[0.05] dark:border-white/[0.05] shadow-sm space-y-4 hover:scale-[1.01] transition-transform duration-300">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Rasio Dana Darurat</span>
                      <h4 className="font-headline font-extrabold text-base text-slate-800 dark:text-slate-100 mt-1">Liquidity Coverage</h4>
                    </div>
                    {(() => {
                      const isGood = emergencyFundMonths >= 6;
                      const isOk = emergencyFundMonths >= 3 && emergencyFundMonths < 6;
                      const isLow = emergencyFundMonths < 3;
                      
                      let badgeColor = 'bg-[#ffebeb] text-[#ff3b30] dark:bg-[#3a1d1d] dark:text-[#ff453a] border-[#ff3b30]/10';
                      let statusText = 'Rentan';
                      
                      if (isGood) {
                        badgeColor = 'bg-[#e3fbe3] dark:bg-[#1a3822] text-[#28cd41] dark:text-[#30d158] border-[#28cd41]/10';
                        statusText = 'Sangat Aman';
                      } else if (isOk) {
                        badgeColor = 'bg-amber-500/10 text-amber-500 border-amber-500/10';
                        statusText = 'Aman (3-6 Bln)';
                      } else if (isLow && emergencyFundMonths >= 1) {
                        badgeColor = 'bg-orange-500/10 text-orange-500 border-orange-500/10';
                        statusText = 'Waspada (<3 Bln)';
                      } else if (emergencyFundMonths < 1) {
                        statusText = 'Kritis (<1 Bln)';
                      }
                      
                      return (
                        <span className={`px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-full border ${badgeColor}`}>
                          {statusText}
                        </span>
                      );
                    })()}
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-baseline">
                      <span className="text-2xl font-black text-slate-800 dark:text-slate-100 font-headline">{emergencyFundMonths.toFixed(1)} Bulan</span>
                      <span className="text-xs text-slate-400 font-medium">Standard Target: 3.0 - 6.0 Bulan</span>
                    </div>
                    <div className="h-1.5 w-full bg-black/[0.04] dark:bg-white/10 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-1000 ${emergencyFundMonths >= 6 ? 'bg-[#28cd41]' : emergencyFundMonths >= 3 ? 'bg-amber-500' : 'bg-[#ff3b30]'}`} 
                        style={{ width: `${emergencyCoveragePercent}%` }}
                      ></div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-sans font-medium">
                    Mengukur daya tahan keuangan keluarga Anda jika seluruh arus masuk pendapatan terhenti tiba-tiba. Aset likuid (Kas) dibagi rata-rata pengeluaran bulanan Anda.
                  </p>
                </div>

                {/* Ratio 3: Solvency */}
                <div className="p-4 sm:p-5 lg:p-6 rounded-2xl sm:rounded-3xl bg-white/40 dark:bg-white/[0.02] border border-black/[0.05] dark:border-white/[0.05] shadow-sm space-y-4 hover:scale-[1.01] transition-transform duration-300">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Rasio Leverage Modal</span>
                      <h4 className="font-headline font-extrabold text-base text-slate-800 dark:text-slate-100 mt-1">Solvency Ratio (Debt-to-Asset)</h4>
                    </div>
                    {(() => {
                      const isHealthy = solvencyRatio < 35;
                      const isModerate = solvencyRatio >= 35 && solvencyRatio <= 50;
                      
                      let badgeColor = 'bg-[#ffebeb] text-[#ff3b30] dark:bg-[#3a1d1d] dark:text-[#ff453a] border-[#ff3b30]/10';
                      let statusText = 'Over-leveraged (>50%)';
                      
                      if (isHealthy) {
                        badgeColor = 'bg-[#e3fbe3] dark:bg-[#1a3822] text-[#28cd41] dark:text-[#30d158] border-[#28cd41]/10';
                        statusText = 'Sangat Sehat (<35%)';
                      } else if (isModerate) {
                        badgeColor = 'bg-amber-500/10 text-amber-500 border-amber-500/10';
                        statusText = 'Menengah (35-50%)';
                      }
                      
                      return (
                        <span className={`px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-full border ${badgeColor}`}>
                          {statusText}
                        </span>
                      );
                    })()}
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-baseline">
                      <span className="text-2xl font-black text-slate-800 dark:text-slate-100 font-headline">{solvencyRatio.toFixed(1)}%</span>
                      <span className="text-xs text-slate-400 font-medium">Batas Maks Standard: &le; 35%</span>
                    </div>
                    <div className="h-1.5 w-full bg-black/[0.04] dark:bg-white/10 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-1000 ${solvencyRatio < 35 ? 'bg-[#28cd41]' : solvencyRatio <= 50 ? 'bg-amber-500' : 'bg-[#ff3b30]'}`} 
                        style={{ width: `${Math.min(Math.max(solvencyRatio, 0), 100)}%` }}
                      ></div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-sans font-medium">
                    Mengukur persentase aset kekayaan bersih Anda yang dibiayai oleh utang. Semakin rendah angkanya, semakin tinggi kebebasan modal yang Anda miliki secara aktual.
                  </p>
                </div>

                {/* Ratio 4: Debt Service Ratio */}
                <div className="p-4 sm:p-5 lg:p-6 rounded-2xl sm:rounded-3xl bg-white/40 dark:bg-white/[0.02] border border-black/[0.05] dark:border-white/[0.05] shadow-sm space-y-4 hover:scale-[1.01] transition-transform duration-300">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Rasio Beban Cicilan</span>
                      <h4 className="font-headline font-extrabold text-base text-slate-800 dark:text-slate-100 mt-1">Debt Service Ratio</h4>
                    </div>
                    {(() => {
                      const isHealthy = debtServiceRatio < 35;
                      const isHigh = debtServiceRatio >= 35 && debtServiceRatio <= 45;
                      
                      let badgeColor = 'bg-[#ffebeb] text-[#ff3b30] dark:bg-[#3a1d1d] dark:text-[#ff453a] border-[#ff3b30]/10';
                      let statusText = 'Kritis (>45%)';
                      
                      if (isHealthy) {
                        badgeColor = 'bg-[#e3fbe3] dark:bg-[#1a3822] text-[#28cd41] dark:text-[#30d158] border-[#28cd41]/10';
                        statusText = 'Aman (<35%)';
                      } else if (isHigh) {
                        badgeColor = 'bg-amber-500/10 text-amber-500 border-amber-500/10';
                        statusText = 'Waspada (35-45%)';
                      }
                      
                      return (
                        <span className={`px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-full border ${badgeColor}`}>
                          {statusText}
                        </span>
                      );
                    })()}
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-baseline">
                      <span className="text-2xl font-black text-slate-800 dark:text-slate-100 font-headline">{debtServiceRatio.toFixed(1)}%</span>
                      <span className="text-xs text-slate-400 font-medium">Batas Aman Standard: &le; 35%</span>
                    </div>
                    <div className="h-1.5 w-full bg-black/[0.04] dark:bg-white/10 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-1000 ${debtServiceRatio < 35 ? 'bg-[#28cd41]' : debtServiceRatio <= 45 ? 'bg-amber-500' : 'bg-[#ff3b30]'}`} 
                        style={{ width: `${Math.min(Math.max(debtServiceRatio, 0), 100)}%` }}
                      ></div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-sans font-medium">
                    Mengukur beban cicilan utang bulanan Anda terhadap pendapatan kotor. Batas aman 35% menjaga agar Anda tetap memiliki ruang untuk menabung dan konsumsi primer.
                  </p>
                </div>

              </div>
            </div>
          )}

          {/* ==================== TAB 3: BALANCE SHEET (CFA® PORTFOLIO) ==================== */}
          {activeTab === 'balanceSheet' && (
            <div className="space-y-5 sm:space-y-6 lg:space-y-8">
              
              {/* Balance Sheet Statement */}
              <div className="rounded-3xl border border-black/[0.05] dark:border-white/[0.08] bg-white/40 dark:bg-white/[0.02] shadow-sm overflow-hidden backdrop-blur-xl">
                <div className="px-6 py-5 bg-[#f5f5f7] dark:bg-white/5 border-b border-black/[0.05] dark:border-white/[0.08] flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                  <div>
                    <h3 className="font-headline font-black text-lg text-[#1d1d1f] dark:text-white">Neraca Kekayaan Bersih Konsolidasi</h3>
                    <p className="text-[10px] text-slate-400 font-semibold mt-0.5 uppercase tracking-wide">Institutional Statement of Financial Position</p>
                  </div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono tracking-wider">Per Tanggal: {new Date().toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'})}</span>
                </div>
                
                {/* Two Column Balance Sheet (1 col Mobile, 2 cols Tablet/Desktop) */}
                <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-black/[0.05] dark:divide-white/[0.08]">
                  
                  {/* Left Column: ASSETS */}
                  <div className="p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6">
                    <div className="flex justify-between items-center border-b border-black/[0.04] dark:border-white/5 pb-2">
                      <span className="font-headline font-black text-slate-800 dark:text-white uppercase tracking-wider text-xs">1. ASET (ASSETS)</span>
                      <span className="font-mono text-[10px] font-bold text-slate-400">AKTIVA</span>
                    </div>

                    {/* Subtype Aset Likuid */}
                    <div className="space-y-3">
                      <div className="flex justify-between text-[11px] font-extrabold text-slate-400 uppercase tracking-widest">
                        <span>Aset Likuid (Kas & Bank)</span>
                        <span>Rp {totalCash.toLocaleString('id-ID')}</span>
                      </div>
                      <div className="space-y-2 pl-3">
                        {accounts.map(acc => (
                          <div key={acc.id} className="flex justify-between text-xs gap-4">
                            <span className="text-slate-600 dark:text-slate-300 font-semibold flex items-center gap-1.5 break-all">
                              <span className="material-symbols-outlined text-sm text-[#007aff] shrink-0">{acc.icon}</span>
                              {acc.name}
                            </span>
                            <span className="font-mono text-slate-800 dark:text-slate-200 font-semibold shrink-0">Rp {acc.balance.toLocaleString('id-ID')}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Subtype Aset Investasi */}
                    <div className="space-y-3 pt-3 border-t border-black/[0.04] dark:border-white/5">
                      <div className="flex justify-between text-[11px] font-extrabold text-slate-400 uppercase tracking-widest">
                        <span>Aset Investasi (Pasar Modal / SBN)</span>
                        <span>Rp {totalInvestments.toLocaleString('id-ID')}</span>
                      </div>
                      <div className="space-y-2 pl-3">
                        {assets.filter(a => a.category === 'investasi').map(ast => (
                          <div key={ast.id} className="flex justify-between text-xs gap-4">
                            <span className="text-slate-600 dark:text-slate-300 font-semibold flex items-center gap-1.5 break-all">
                              <span className="material-symbols-outlined text-sm text-[#28cd41] shrink-0">{ast.icon}</span>
                              {ast.title}
                            </span>
                            <span className="font-mono text-slate-800 dark:text-slate-200 font-semibold shrink-0">Rp {ast.currentValue.toLocaleString('id-ID')}</span>
                          </div>
                        ))}
                        {assets.filter(a => a.category === 'investasi').length === 0 && (
                          <span className="text-[11px] text-slate-400 italic font-medium">Tidak ada aset investasi pasar modal</span>
                        )}
                      </div>
                    </div>

                    {/* Subtype Aset Fisik */}
                    <div className="space-y-3 pt-3 border-t border-black/[0.04] dark:border-white/5">
                      <div className="flex justify-between text-[11px] font-extrabold text-slate-400 uppercase tracking-widest">
                        <span>Aset Fisik / Properti / Koleksi</span>
                        <span>Rp {totalPhysical.toLocaleString('id-ID')}</span>
                      </div>
                      <div className="space-y-2 pl-3">
                        {assets.filter(a => a.category !== 'investasi').map(ast => (
                          <div key={ast.id} className="flex justify-between text-xs gap-4">
                            <span className="text-slate-600 dark:text-slate-300 font-semibold flex items-center gap-1.5 break-all">
                              <span className="material-symbols-outlined text-sm text-[#8e8e93] shrink-0">{ast.icon}</span>
                              {ast.title}
                            </span>
                            <span className="font-mono text-slate-800 dark:text-slate-200 font-semibold shrink-0">Rp {ast.currentValue.toLocaleString('id-ID')}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Total Assets Footer */}
                    <div className="flex justify-between items-center pt-4 border-t border-black/[0.08] dark:border-white/10 bg-black/[0.01] dark:bg-white/[0.01] -mx-6 lg:-mx-8 px-6 lg:px-8 py-3 mt-4">
                      <span className="font-headline font-black text-slate-800 dark:text-white uppercase tracking-wider text-xs">TOTAL ASET</span>
                      <span className="font-mono text-sm font-black text-[#007aff] dark:text-[#0a84ff]">Rp {totalAssets.toLocaleString('id-ID')}</span>
                    </div>

                  </div>

                  {/* Right Column: LIABILITIES & EQUITIES */}
                  <div className="p-4 sm:p-6 lg:p-8 flex flex-col justify-between">
                    <div className="space-y-6">
                      <div className="flex justify-between items-center border-b border-black/[0.04] dark:border-white/5 pb-2">
                        <span className="font-headline font-black text-slate-800 dark:text-white uppercase tracking-wider text-xs">2. LIABILITAS & EKUITAS</span>
                        <span className="font-mono text-[10px] font-bold text-slate-400">PASIVA</span>
                      </div>

                      {/* Liabilities */}
                      <div className="space-y-3">
                        <div className="flex justify-between text-[11px] font-extrabold text-slate-400 uppercase tracking-widest">
                          <span>Kewajiban / Utang Jangka Panjang & Pendek</span>
                          <span>Rp {totalDebts.toLocaleString('id-ID')}</span>
                        </div>
                        <div className="space-y-2 pl-3">
                          {debts.map(d => (
                            <div key={d.id} className="flex justify-between text-xs gap-4">
                              <span className="text-slate-600 dark:text-slate-300 font-semibold flex items-center gap-1.5 break-all">
                                <span className="material-symbols-outlined text-sm text-[#ff3b30] shrink-0">{d.icon}</span>
                                {d.name} ({d.interestRate}%)
                              </span>
                              <span className="font-mono text-[#ff3b30] font-semibold shrink-0">Rp {d.balance.toLocaleString('id-ID')}</span>
                            </div>
                          ))}
                          {debts.length === 0 && (
                            <span className="text-[11px] text-[#28cd41] font-semibold flex items-center gap-1">
                              <span className="material-symbols-outlined text-xs">check_circle</span>
                              Bebas Utang / Liabilities Nihil!
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Equities (Net Worth Representation) */}
                      <div className="space-y-3 pt-6 border-t border-black/[0.04] dark:border-white/5 bg-[#f5f5f7] dark:bg-white/[0.01] p-4 rounded-2xl border border-black/[0.04] dark:border-white/5">
                        <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Ekuitas Bersih (Capital Balance)</span>
                        <div className="flex justify-between items-baseline mt-1 gap-2">
                          <span className="font-headline font-extrabold text-xs text-slate-600 dark:text-slate-300">Kekayaan Bersih Aktual</span>
                          <span className="font-mono text-base font-black text-slate-800 dark:text-white shrink-0">Rp {netWorth.toLocaleString('id-ID')}</span>
                        </div>
                        <p className="text-[10px] text-slate-400 leading-relaxed font-sans mt-2 font-medium">
                          Mencerminkan nilai aset murni milik pribadi setelah dikurangi kewajiban pelunasan hak pihak ketiga (solvabilitas total).
                        </p>
                      </div>
                    </div>

                    {/* Total Liabilities & Net Worth Footer */}
                    <div className="flex justify-between items-center pt-4 border-t border-black/[0.08] dark:border-white/10 bg-black/[0.01] dark:bg-white/[0.01] -mx-6 lg:-mx-8 px-6 lg:px-8 py-3 mt-8">
                      <span className="font-headline font-black text-slate-800 dark:text-white uppercase tracking-wider text-xs">TOTAL PASIVA</span>
                      <span className="font-mono text-sm font-black text-slate-800 dark:text-white">Rp {(totalDebts + netWorth).toLocaleString('id-ID')}</span>
                    </div>

                  </div>
                </div>
              </div>

              {/* CFA Portfolio Analysis Panel */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 lg:gap-6">
                
                {/* Productive Capital Quality */}
                <div className="p-4 sm:p-5 lg:p-6 rounded-2xl sm:rounded-3xl bg-white/40 dark:bg-white/[0.02] border border-black/[0.05] dark:border-white/[0.05] shadow-sm space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Asset Efficiency Index</span>
                    <span className={`px-2 py-0.5 text-[9px] font-bold rounded-full ${capitalQualityIndex >= 60 ? 'bg-[#e3fbe3] dark:bg-[#1a3822] text-[#28cd41] dark:text-[#30d158]' : 'bg-amber-500/10 text-amber-500'}`}>
                      {capitalQualityIndex >= 70 ? 'Efisiensi Tinggi' : capitalQualityIndex >= 40 ? 'Cukup Efektif' : 'Kurang Efektif'}
                    </span>
                  </div>
                  
                  <div>
                    <h4 className="font-headline font-black text-slate-800 dark:text-white text-sm">Capital Quality Index (Rasio Aset Produktif)</h4>
                    <div className="flex justify-between items-baseline mt-2 gap-2 flex-wrap">
                      <span className="text-xl font-headline font-black text-slate-800 dark:text-white">{capitalQualityIndex.toFixed(1)}%</span>
                      <span className="text-xs text-slate-400 font-semibold">Aset Produktif: Rp {productiveAssets.toLocaleString('id-ID')}</span>
                    </div>
                  </div>

                  <div className="h-1.5 w-full bg-black/[0.04] dark:bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-[#007aff] to-[#30d158] rounded-full" style={{ width: `${capitalQualityIndex}%` }}></div>
                  </div>

                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-sans font-medium">
                    Persentase portofolio Anda yang ditempatkan pada aset likuid atau investasi pasar modal yang menghasilkan pendapatan dividen/kupon/apresiasi kapital (dibandingkan aset konsumtif seperti mobil/koleksi).
                  </p>
                </div>

                {/* Weighted Borrowing Cost */}
                <div className="p-4 sm:p-5 lg:p-6 rounded-2xl sm:rounded-3xl bg-white/40 dark:bg-white/[0.02] border border-black/[0.05] dark:border-white/[0.05] shadow-sm space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Leverage Cost Index</span>
                    <span className={`px-2 py-0.5 text-[9px] font-bold rounded-full ${debtCostIndex === 0 ? 'bg-[#e3fbe3] dark:bg-[#1a3822] text-[#28cd41] dark:text-[#30d158]' : debtCostIndex < 10 ? 'bg-amber-500/10 text-amber-500' : 'bg-[#ffebeb] text-[#ff3b30]'}`}>
                      {debtCostIndex === 0 ? 'Optimal (Nihil)' : debtCostIndex < 10 ? 'Beban Rendah' : 'Beban Tinggi'}
                    </span>
                  </div>

                  <div>
                    <h4 className="font-headline font-black text-slate-800 dark:text-white text-sm">Weighted Debt Interest (Biaya Bunga Rata-Rata)</h4>
                    <div className="flex justify-between items-baseline mt-2 gap-2 flex-wrap">
                      <span className="text-xl font-headline font-black text-slate-800 dark:text-white">{debtCostIndex.toFixed(2)}%</span>
                      <span className="text-xs text-slate-400 font-semibold">Total Kewajiban: Rp {totalDebts.toLocaleString('id-ID')}</span>
                    </div>
                  </div>

                  <div className="h-1.5 w-full bg-black/[0.04] dark:bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-[#28cd41] to-[#ff3b30] rounded-full" style={{ width: `${Math.min(debtCostIndex * 5, 100)}%` }}></div>
                  </div>

                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-sans font-medium">
                    Suku bunga efektif rata-rata tertimbang dari seluruh pinjaman Anda. Suku bunga tertimbang yang rendah mempercepat kemampuan pelunasan utang dan mengurangi risiko likuiditas modal.
                  </p>
                </div>

              </div>
              
              {/* Integration Button */}
              <div className="flex justify-end gap-3 mt-6">
                <button 
                  onClick={() => onNavigate && onNavigate('integration')} 
                  className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-black/[0.01] dark:bg-white/[0.01] hover:bg-black/[0.03] dark:hover:bg-white/[0.03] border border-dashed border-black/10 dark:border-white/10 text-slate-600 dark:text-slate-300 font-bold text-xs hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer animate-pulse-subtle"
                >
                  <span className="material-symbols-outlined text-[1.1rem]">add_link</span>
                  Tambah Akun Integrasi Perbankan / Sekuritas
                </button>
              </div>
            </div>
          )}

        </motion.div>
      </AnimatePresence>
      
    </div>
  );
};

export default FinanceDashboard;
