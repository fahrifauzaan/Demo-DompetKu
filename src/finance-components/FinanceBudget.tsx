import React, { useState } from 'react';
import { useFinanceStore } from '../store/useFinanceStore';
import { FeatureCTA } from './MarketingCTAModal';
import CategoryRemapModal from './CategoryRemapModal';

interface FinanceBudgetProps {
  onShowCTA: (feature?: FeatureCTA) => void;
  onNavigate?: (tab: string) => void;
}

const FinanceBudget: React.FC<FinanceBudgetProps> = ({ onShowCTA, onNavigate }) => {
  const { budgetCategories, transactions, monthlyBudgets, updateMonthlyBudget } = useFinanceStore();
  
  // State for active date
  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [activeTab, setActiveTab] = useState<'EXPENSES' | 'INCOME' | 'SAVINGS' | 'INVESTMENT'>('EXPENSES');
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [showRemap, setShowRemap] = useState(false);

  const selectedYear = selectedDate.getFullYear();
  const selectedMonthNum = selectedDate.getMonth();
  const selectedMonthStr = selectedDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
  const selectedMonthKey = String(selectedMonthNum + 1).padStart(2, '0');
  const yearMonth = `${selectedYear}-${selectedMonthKey}`;

  const handlePrevMonth = () => {
    setSelectedDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setSelectedDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  // CFP Classification Keyword Helper (Needs vs Wants vs Savings)
  const getCFPClassification = (catName: string, type?: string, catId?: string): 'NEEDS' | 'WANTS' | 'SAVINGS' => {
    const isPemasukan = type ? type.toLowerCase() === 'pemasukan' : false;
    if (isPemasukan) return 'SAVINGS'; // Income contributes to potential savings

    // Try finding explicit classification first
    const cat = budgetCategories.find(c => c.id === catId || (c.name.toLowerCase() === catName.toLowerCase() && c.type === type));
    if (cat?.classification) {
      if (cat.classification === 'INVESTMENT') return 'SAVINGS'; // Investment grouped as savings in 50/30/20
      return cat.classification as 'NEEDS' | 'WANTS' | 'SAVINGS';
    }

    const norm = (catName || '').toLowerCase();
    
    // SAVINGS & INVESTMENT (Accumulation)
    if (
      norm.includes('saving') || 
      norm.includes('tabungan') || 
      norm.includes('darurat') || 
      norm.includes('emergency') || 
      norm.includes('sinking') ||
      norm.includes('invest') || 
      norm.includes('saham') || 
      norm.includes('stock') ||
      norm.includes('crypto') || 
      norm.includes('reksa') || 
      norm.includes('mutual') ||
      norm.includes('fund') ||
      norm.includes('bond') || 
      norm.includes('emas') || 
      norm.includes('gold') || 
      norm.includes('kripto') ||
      norm.includes('transfer') ||
      norm.includes('deposit') ||
      norm.includes('deposito') ||
      norm.includes('p2p') ||
      norm.includes('lending') ||
      norm.includes('peer') ||
      norm.includes('obligasi') ||
      norm.includes('sbn')
    ) {
      return 'SAVINGS';
    }
    
    // WANTS (Discretionary Consumption)
    if (
      norm.includes('entertainment') ||
      norm.includes('travel') ||
      norm.includes('flight') ||
      norm.includes('nonton') ||
      norm.includes('game') ||
      norm.includes('liburan') ||
      norm.includes('belanja') ||
      norm.includes('shopping') ||
      norm.includes('clothing') ||
      norm.includes('baju') ||
      norm.includes('gift') ||
      norm.includes('hadiah') ||
      norm.includes('subscription') ||
      norm.includes('langganan') ||
      norm.includes('netflix') ||
      norm.includes('spotify') ||
      norm.includes('personal care') ||
      norm.includes('spa') ||
      norm.includes('salon') ||
      norm.includes('lifestyle') ||
      norm.includes('hobi') ||
      norm.includes('hobby')
    ) {
      return 'WANTS';
    }
    
    // NEEDS (Essential Outlays)
    return 'NEEDS';
  };

  // Group Category Helper for Tab Layout
  const getCategoryGroup = (catName: string, type?: string, catId?: string) => {
    const isPemasukan = type ? type.toLowerCase() === 'pemasukan' : false;
    if (isPemasukan) return 'INCOME';
    
    // Try finding explicit classification first
    const cat = budgetCategories.find(c => c.id === catId || (c.name.toLowerCase() === catName.toLowerCase() && c.type === type));
    if (cat?.classification) {
      if (cat.classification === 'NEEDS' || cat.classification === 'WANTS') {
        return 'EXPENSES';
      }
      return cat.classification; // 'SAVINGS' or 'INVESTMENT'
    }
    
    const classification = getCFPClassification(catName, type, catId);
    if (classification === 'SAVINGS') {
      const norm = (catName || '').toLowerCase();
      if (
        norm.includes('invest') || 
        norm.includes('saham') || 
        norm.includes('stock') ||
        norm.includes('crypto') || 
        norm.includes('reksa') || 
        norm.includes('mutual') ||
        norm.includes('fund') ||
        norm.includes('bond') || 
        norm.includes('kripto') ||
        norm.includes('p2p') ||
        norm.includes('lending') ||
        norm.includes('peer') ||
        norm.includes('obligasi') ||
        norm.includes('sbn')
      ) {
        return 'INVESTMENT';
      }
      return 'SAVINGS';
    }
    return 'EXPENSES';
  };

  // Helper to get monthly budget amount
  const getBudgetAmount = (catId: string, catName: string): number => {
    if (monthlyBudgets[yearMonth] && monthlyBudgets[yearMonth][catName] !== undefined) {
      return monthlyBudgets[yearMonth][catName];
    }
    const cat = budgetCategories.find(c => c.id === catId);
    return cat ? cat.allocated : 0;
  };

  // Helper to get actual monthly transaction amount
  const getActualAmount = (catName: string, type?: string): number => {
    const isPemasukan = type ? type.toLowerCase() === 'pemasukan' : false;
    const isPengeluaran = type ? type.toLowerCase() === 'pengeluaran' : false;
    return Math.abs(
      transactions
        .filter(tx => {
          if (!tx.category || !catName) return false;
          if (tx.category.toLowerCase() !== catName.toLowerCase()) return false;
          if (isPemasukan && tx.type !== 'PEMASUKAN') return false;
          if (isPengeluaran && tx.type !== 'PENGELUARAN') return false;
          
          const txDate = new Date(tx.date);
          if (isNaN(txDate.getTime())) return false;
          return txDate.getFullYear() === selectedYear && txDate.getMonth() === selectedMonthNum;
        })
        .reduce((sum, tx) => sum + Math.abs(tx.amount), 0)
    );
  };

  // Process data for the active month
  const processGroupData = (group: 'INCOME' | 'EXPENSES' | 'SAVINGS' | 'INVESTMENT') => {
    const list = budgetCategories.filter(c => getCategoryGroup(c.name, c.type, c.id) === group);
    
    return list.map(cat => {
      const budget = getBudgetAmount(cat.id, cat.name);
      const actual = getActualAmount(cat.name, cat.type);
      const percent = budget > 0 ? Math.round((actual / budget) * 100) : 0;
      
      let status = 'DI BAWAH';
      if (percent >= 100) {
        status = 'MELEBIHI';
      } else if (percent >= 90) {
        status = 'MENDEKATI LIMIT';
      }

      return {
        ...cat,
        budget,
        actual,
        percent,
        status,
      };
    });
  };

  const processedData = {
    INCOME: processGroupData('INCOME'),
    EXPENSES: processGroupData('EXPENSES'),
    SAVINGS: processGroupData('SAVINGS'),
    INVESTMENT: processGroupData('INVESTMENT'),
  };

  // Monthly totals
  const getGroupTotals = (group: 'INCOME' | 'EXPENSES' | 'SAVINGS' | 'INVESTMENT') => {
    const list = processedData[group];
    const budgetTotal = list.reduce((sum, item) => sum + item.budget, 0);
    const actualTotal = list.reduce((sum, item) => sum + item.actual, 0);
    return { budgetTotal, actualTotal };
  };

  const totals = {
    INCOME: getGroupTotals('INCOME'),
    EXPENSES: getGroupTotals('EXPENSES'),
    SAVINGS: getGroupTotals('SAVINGS'),
    INVESTMENT: getGroupTotals('INVESTMENT'),
  };

  const totalBudgetOutflow = totals.EXPENSES.budgetTotal + totals.SAVINGS.budgetTotal + totals.INVESTMENT.budgetTotal;
  const totalActualOutflow = totals.EXPENSES.actualTotal + totals.SAVINGS.actualTotal + totals.INVESTMENT.actualTotal;
  
  const leftToAllocateBudget = totals.INCOME.budgetTotal - totalBudgetOutflow;
  const leftToAllocateActual = totals.INCOME.actualTotal - totalActualOutflow;

  const outflowPercent = totals.INCOME.budgetTotal > 0
    ? Math.round((totalBudgetOutflow / totals.INCOME.budgetTotal) * 100)
    : 0;
  const outflowActualPercent = totals.INCOME.actualTotal > 0
    ? Math.round((totalActualOutflow / totals.INCOME.actualTotal) * 100)
    : 0;

  // ==================== CFP 50/30/20 ALLOCATION CALCULATIONS ====================
  const getCFPAllocation = () => {
    let needsBudget = 0;
    let wantsBudget = 0;
    let savingsBudget = 0;

    budgetCategories.forEach(cat => {
      const budget = getBudgetAmount(cat.id, cat.name);
      const isPengeluaran = cat.type ? cat.type.toLowerCase() === 'pengeluaran' : true;
      if (isPengeluaran) {
        const classification = getCFPClassification(cat.name, cat.type, cat.id);
        if (classification === 'NEEDS') needsBudget += budget;
        else if (classification === 'WANTS') wantsBudget += budget;
        else if (classification === 'SAVINGS') savingsBudget += budget;
      }
    });

    const totalAllocated = needsBudget + wantsBudget + savingsBudget;
    return {
      needs: needsBudget,
      wants: wantsBudget,
      savings: savingsBudget,
      needsPercent: totalAllocated > 0 ? Math.round((needsBudget / totalAllocated) * 100) : 0,
      wantsPercent: totalAllocated > 0 ? Math.round((wantsBudget / totalAllocated) * 100) : 0,
      savingsPercent: totalAllocated > 0 ? Math.round((savingsBudget / totalAllocated) * 100) : 0,
      totalAllocated
    };
  };

  const cfpAlloc = getCFPAllocation();

  // ==================== SPENDING PACING / RUN-RATE PROJECTOR ====================
  const getMonthPacing = () => {
    const today = new Date();
    const daysInMonth = new Date(selectedYear, selectedMonthNum + 1, 0).getDate();
    const currentDay = (selectedYear === today.getFullYear() && selectedMonthNum === today.getMonth())
      ? today.getDate()
      : (selectedDate < today ? daysInMonth : 1);
    
    const elapsedPercent = (currentDay / daysInMonth) * 100;
    return {
      currentDay,
      daysInMonth,
      elapsedPercent
    };
  };

  const pacing = getMonthPacing();

  // Edit cell handler
  const handleEditClick = (catId: string, currentVal: number) => {
    setEditingCatId(catId);
    setEditValue(currentVal.toString());
  };

  const handleSave = async (catName: string) => {
    if (!editingCatId) return;
    const amount = Number(editValue) || 0;
    await updateMonthlyBudget(yearMonth, catName, amount);
    setEditingCatId(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent, catName: string) => {
    if (e.key === 'Enter') {
      handleSave(catName);
    } else if (e.key === 'Escape') {
      setEditingCatId(null);
    }
  };

  const activeItems = processedData[activeTab];

  return (
    <div className="space-y-5 sm:space-y-6 lg:space-y-8 animate-in fade-in duration-500 pb-10 lg:pb-16">

      {/* HEADER UTAMA & MONTH PICKER */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6 border-b border-black/[0.04] dark:border-white/5 pb-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black font-headline tracking-tight text-[#1d1d1f] dark:text-white">Budget vs Aktual</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 font-body text-[13px] sm:text-xs md:text-sm font-medium">
            Bandingkan rencana anggaran (budgeting) vs realisasi pengeluaran aktual pada periode aktif.
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {/* Month Selector Premium */}
          <div className="flex items-center bg-[#f5f5f7] dark:bg-[#1c1c1e] p-1 rounded-2xl border border-black/[0.04] dark:border-white/[0.04] shadow-inner select-none">
            <button onClick={handlePrevMonth} className="p-2 hover:bg-white dark:hover:bg-[#2c2c2e] rounded-xl transition-all flex items-center justify-center cursor-pointer shadow-sm border border-transparent hover:border-black/[0.02]">
              <span className="material-symbols-outlined text-slate-700 dark:text-slate-300 text-sm">chevron_left</span>
            </button>
            <span className="px-4 lg:px-6 font-headline font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider text-xs lg:text-sm">
              {selectedMonthStr}
            </span>
            <button onClick={handleNextMonth} className="p-2 hover:bg-white dark:hover:bg-[#2c2c2e] rounded-xl transition-all flex items-center justify-center cursor-pointer shadow-sm border border-transparent hover:border-black/[0.02]">
              <span className="material-symbols-outlined text-slate-700 dark:text-slate-300 text-sm">chevron_right</span>
            </button>
          </div>

          <button
            onClick={() => setShowRemap(true)}
            title="Samakan nama kategori transaksi dengan kategori Anggaran (mis. Makanan & Minuman → Food)"
            className="px-4 py-2 bg-surface-container dark:bg-white/10 text-on-surface dark:text-white hover:opacity-90 active:scale-95 transition-all text-xs font-bold flex items-center gap-2 rounded-xl h-10 shadow-sm border border-outline-variant/10 dark:border-white/10 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[1.1rem]">rule</span>
            Samakan Kategori
          </button>
          <button
            onClick={() => onNavigate && onNavigate('add-category')}
            className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-90 active:scale-95 transition-all text-xs font-bold flex items-center gap-2 rounded-xl h-10 shadow-sm border border-black/[0.05] cursor-pointer"
          >
            <span className="material-symbols-outlined text-[1.1rem]">add</span>
            Tambah Kategori
          </button>
        </div>
      </header>

      <CategoryRemapModal isOpen={showRemap} onClose={() => setShowRemap(false)} />

      {/* OVERALL PERFORMANCE BENTO PANELS */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
        
        {/* Card 1: 50/30/20 Allocation Rule */}
        <div className="bg-white/40 dark:bg-white/[0.02] p-4 sm:p-5 lg:p-6 rounded-2xl sm:rounded-3xl border border-black/[0.05] dark:border-white/[0.05] flex flex-col justify-between shadow-sm relative overflow-hidden group">
          <div>
            <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-2">Rasio Alokasi Anggaran (50/30/20)</span>
            <div className="space-y-3">
              {/* Compound Progress Bar */}
              <div className="h-2.5 w-full bg-black/[0.04] dark:bg-white/10 rounded-full flex overflow-hidden">
                <div style={{ width: `${cfpAlloc.needsPercent}%` }} className="bg-[#007aff] h-full" title={`Kebutuhan Pokok: ${cfpAlloc.needsPercent}%`} />
                <div style={{ width: `${cfpAlloc.wantsPercent}%` }} className="bg-[#ff9500] h-full" title={`Keinginan: ${cfpAlloc.wantsPercent}%`} />
                <div style={{ width: `${cfpAlloc.savingsPercent}%` }} className="bg-[#28cd41] h-full" title={`Tabungan: ${cfpAlloc.savingsPercent}%`} />
              </div>
              <div className="grid grid-cols-3 text-[10px] font-bold text-slate-500 dark:text-slate-400">
                <div className="flex flex-col">
                  <span className="text-[#007aff] font-black">Needs: {cfpAlloc.needsPercent}%</span>
                  <span className="text-[8px] opacity-75">Target: 50%</span>
                </div>
                <div className="flex flex-col text-center">
                  <span className="text-[#ff9500] font-black">Wants: {cfpAlloc.wantsPercent}%</span>
                  <span className="text-[8px] opacity-75">Target: 30%</span>
                </div>
                <div className="flex flex-col text-right">
                  <span className="text-[#28cd41] font-black">Savings: {cfpAlloc.savingsPercent}%</span>
                  <span className="text-[8px] opacity-75">Target: 20%</span>
                </div>
              </div>
            </div>
          </div>
          {(() => {
            const isSavingsHealthy = cfpAlloc.savingsPercent >= 20;
            const isNeedsExceeded = cfpAlloc.needsPercent > 55;
            
            let statusText = 'Alokasi Sehat';
            let statusClass = 'text-[#28cd41] dark:text-[#30d158]';
            
            if (isNeedsExceeded) {
              statusText = 'Needs Terlalu Tinggi';
              statusClass = 'text-[#ff3b30]';
            } else if (!isSavingsHealthy && cfpAlloc.totalAllocated > 0) {
              statusText = 'Tabungan Kurang dari 20%';
              statusClass = 'text-[#ff9500]';
            }

            return (
              <span className={`text-[10px] font-bold mt-4 block ${statusClass}`}>
                • {cfpAlloc.totalAllocated > 0 ? statusText : 'Belum ada anggaran'}
              </span>
            );
          })()}
        </div>

        {/* Card 2: Zero-Based Budgeting (ZBB) Evaluator */}
        <div className="bg-white/40 dark:bg-white/[0.02] p-4 sm:p-5 lg:p-6 rounded-2xl sm:rounded-3xl border border-black/[0.05] dark:border-white/[0.05] flex flex-col justify-between shadow-sm relative overflow-hidden group">
          <div>
            <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-2">Zero-Based Budgeting (ZBB)</span>
            <div className="flex flex-col gap-1">
              <div className="text-xs font-semibold text-slate-400 dark:text-slate-500">
                Income - Alokasi:
              </div>
              <div className={`text-2xl font-black font-headline tabular-nums ${leftToAllocateBudget === 0 ? 'text-[#28cd41]' : leftToAllocateBudget < 0 ? 'text-[#ff3b30]' : 'text-slate-700 dark:text-slate-300'}`}>
                Rp {leftToAllocateBudget.toLocaleString('id-ID')}
              </div>
            </div>
          </div>
          {(() => {
            let zbbText = 'Anggaran Nol tercapai. Semua uang teralokasikan!';
            let zbbColor = 'text-[#28cd41] dark:text-[#30d158]';
            if (leftToAllocateBudget > 0) {
              zbbText = `Ada sisa Rp ${leftToAllocateBudget.toLocaleString('id-ID')} belum dialokasikan.`;
              zbbColor = 'text-slate-500 dark:text-slate-400';
            } else if (leftToAllocateBudget < 0) {
              zbbText = 'Anggaran Defisit! Alokasi melebihi pendapatan.';
              zbbColor = 'text-[#ff3b30]';
            }
            return (
              <span className={`text-[10px] font-bold mt-4 block leading-tight ${zbbColor}`}>
                {totals.INCOME.budgetTotal > 0 ? zbbText : 'Isi anggaran pendapatan terlebih dahulu.'}
              </span>
            );
          })()}
        </div>

        {/* Card 3: Spending Outflow Panel */}
        <div className="bg-white/40 dark:bg-white/[0.02] p-4 sm:p-5 lg:p-6 rounded-2xl sm:rounded-3xl border border-black/[0.05] dark:border-white/[0.05] flex flex-col justify-between shadow-sm relative overflow-hidden group">
          <div>
            <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-2">Laju Pengeluaran & Tabungan</span>
            <div className="flex flex-col gap-1">
              <div className="text-xs font-semibold text-slate-400 dark:text-slate-500">
                Rencana: <span className="tabular-nums font-bold text-slate-700 dark:text-slate-300">Rp {totalBudgetOutflow.toLocaleString('id-ID')} ({outflowPercent}%)</span>
              </div>
              <div className={`text-2xl font-black font-headline tabular-nums ${totalActualOutflow > totalBudgetOutflow ? 'text-[#ff3b30]' : 'text-slate-800 dark:text-white'}`}>
                Aktual: Rp {totalActualOutflow.toLocaleString('id-ID')} ({outflowActualPercent}%)
              </div>
            </div>
          </div>
          <div className="mt-4 w-full bg-black/[0.04] dark:bg-white/10 h-1.5 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-1000 ${totalActualOutflow > totalBudgetOutflow ? 'bg-[#ff3b30]' : 'bg-[#007aff]'}`}
              style={{ width: `${totalBudgetOutflow > 0 ? Math.min((totalActualOutflow / totalBudgetOutflow) * 100, 100) : 0}%` }}
            ></div>
          </div>
        </div>
      </section>

      {/* 4 SEGMENTED NAVIGATION TABS */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-black/[0.05] dark:border-white/10 pb-2 select-none">
          {/* Tabs header */}
          <div className="flex flex-wrap gap-2 sm:gap-4">
            <button
              onClick={() => setActiveTab('EXPENSES')}
              className={`pb-3 text-xs sm:text-sm font-headline font-bold transition-all relative cursor-pointer ${activeTab === 'EXPENSES' ? 'text-[#007aff] dark:text-[#0a84ff]' : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-white'}`}
            >
              🛒 Belanja
              {activeTab === 'EXPENSES' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#007aff] rounded-full"></span>}
            </button>
            <button
              onClick={() => setActiveTab('INCOME')}
              className={`pb-3 text-xs sm:text-sm font-headline font-bold transition-all relative cursor-pointer ${activeTab === 'INCOME' ? 'text-[#28cd41] dark:text-[#30d158]' : 'text-slate-400 dark:text-slate-500 hover:text-[#28cd41] dark:hover:text-white'}`}
            >
              💵 Pendapatan
              {activeTab === 'INCOME' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#28cd41] rounded-full"></span>}
            </button>
            <button
              onClick={() => setActiveTab('SAVINGS')}
              className={`pb-3 text-xs sm:text-sm font-headline font-bold transition-all relative cursor-pointer ${activeTab === 'SAVINGS' ? 'text-[#ff9500] dark:text-[#ff9f0a]' : 'text-slate-400 dark:text-slate-500 hover:text-[#ff9500] dark:hover:text-white'}`}
            >
              🐖 Tabungan
              {activeTab === 'SAVINGS' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#ff9500] rounded-full"></span>}
            </button>
            <button
              onClick={() => setActiveTab('INVESTMENT')}
              className={`pb-3 text-xs sm:text-sm font-headline font-bold transition-all relative cursor-pointer ${activeTab === 'INVESTMENT' ? 'text-indigo-500 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500 hover:text-indigo-500 dark:hover:text-white'}`}
            >
              📈 Investasi
              {activeTab === 'INVESTMENT' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-full"></span>}
            </button>
          </div>
          
          <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 bg-[#f5f5f7] dark:bg-white/5 px-3 py-1.5 rounded-full border border-black/[0.02] dark:border-white/[0.02] shrink-0 self-start sm:self-auto">
            Total Rencana: <span className="text-[#007aff] font-extrabold">Rp {totals[activeTab].budgetTotal.toLocaleString('id-ID')}</span> • Aktual: <span className="font-extrabold">Rp {totals[activeTab].actualTotal.toLocaleString('id-ID')}</span>
          </div>
        </div>

        {/* DETAILED CATEGORIES LIST */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 lg:gap-6">
          {activeItems.length > 0 ? (
            activeItems.map((cat) => {
              const isEditing = editingCatId === cat.id;
              const isOver = cat.actual > cat.budget;
              const remaining = cat.budget - cat.actual;
              
              // Calculate spending pacing
              const isExpense = cat.type === 'Pengeluaran';
              const overPacingThreshold = pacing.elapsedPercent + 10;
              const isOverPacing = isExpense && cat.percent > overPacingThreshold;
              
              // Custom colors & styles based on budget health status
              let healthText = 'Normal';
              let healthBadgeClass = 'bg-[#e3fbe3] dark:bg-[#1a3822] text-[#28cd41] dark:text-[#30d158] border-[#28cd41]/10';
              let progressColor = 'bg-[#007aff] dark:bg-[#0a84ff]';
              
              if (isExpense) {
                if (isOver) {
                  healthText = 'Overbudget';
                  healthBadgeClass = 'bg-[#ffebeb] dark:bg-[#3a1d1d] text-[#ff3b30] border-[#ff3b30]/10';
                  progressColor = 'bg-[#ff3b30]';
                } else if (isOverPacing) {
                  healthText = 'Terlalu Cepat (Over-pacing)';
                  healthBadgeClass = 'bg-[#fff4e5] dark:bg-[#3d2c1d] text-[#ff9500] border-[#ff9500]/10';
                  progressColor = 'bg-[#ff9500]';
                }
              } else {
                // For income target tracking
                const achieved = cat.actual >= cat.budget;
                healthText = achieved ? 'Target Tercapai' : 'Progres Target';
                healthBadgeClass = achieved 
                  ? 'bg-[#e3fbe3] dark:bg-[#1a3822] text-[#28cd41] border-[#28cd41]/10' 
                  : 'bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 border-transparent';
                progressColor = 'bg-[#28cd41]';
              }

              return (
                <div 
                  key={cat.id} 
                  className="bg-white/40 dark:bg-white/[0.02] p-4 sm:p-5 lg:p-6 rounded-2xl sm:rounded-3xl border border-black/[0.05] dark:border-white/[0.05] flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow relative"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-[22%] bg-slate-100 dark:bg-white/5 flex items-center justify-center border border-black/[0.02] dark:border-white/[0.02]">
                        <span className="material-symbols-outlined text-slate-600 dark:text-slate-300 text-lg">{cat.icon}</span>
                      </div>
                      <div>
                        <h4 className="font-extrabold font-headline text-slate-800 dark:text-slate-200">{cat.name}</h4>
                        <span className={`inline-block mt-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${healthBadgeClass}`}>
                          {healthText}
                        </span>
                      </div>
                    </div>

                    {/* Rencana Budget Field */}
                    <div className="text-right">
                      <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Rencana (Budget)</span>
                      {isEditing ? (
                        <div className="flex items-center gap-1.5 mt-1">
                          <input
                            type="number"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={() => handleSave(cat.name)}
                            onKeyDown={(e) => handleKeyDown(e, cat.name)}
                            className="bg-[#f5f5f7] dark:bg-[#1c1c1e] border border-[#007aff]/30 px-2.5 py-1 rounded-xl text-right text-xs outline-none focus:ring-2 focus:ring-[#007aff]/15 font-bold dark:text-white w-24"
                            autoFocus
                          />
                        </div>
                      ) : (
                        <div 
                          onClick={() => handleEditClick(cat.id, cat.budget)}
                          className="text-sm font-bold text-[#007aff] dark:text-[#0a84ff] hover:underline cursor-pointer flex items-center gap-1 justify-end mt-1"
                        >
                          Rp {cat.budget.toLocaleString('id-ID')}
                          <span className="material-symbols-outlined text-xs opacity-50">edit</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* METRICS PROGRESS BAR */}
                  <div className="mt-6 space-y-2">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-400 dark:text-slate-500">Aktual Terpakai:</span>
                      <span className="font-extrabold tabular-nums text-slate-700 dark:text-slate-200">Rp {cat.actual.toLocaleString('id-ID')}</span>
                    </div>

                    <div className="w-full h-1.5 bg-black/[0.04] dark:bg-white/10 rounded-full overflow-hidden relative">
                      <div 
                        className={`h-full rounded-full transition-all duration-1000 ${progressColor}`}
                        style={{ width: `${Math.min(cat.percent, 100)}%` }}
                      ></div>
                    </div>

                    <div className="flex justify-between items-center text-[10px] font-bold mt-1.5">
                      <span className="text-slate-400 dark:text-slate-500">{cat.percent}% Terpakai</span>
                      {cat.type === 'Pemasukan' ? (
                        <span className={cat.actual >= cat.budget ? 'text-[#28cd41]' : 'text-slate-400'}>
                          {cat.actual >= cat.budget ? 'Target Tercapai!' : `Kurang Rp ${Math.abs(remaining).toLocaleString('id-ID')}`}
                        </span>
                      ) : (
                        <span className={isOver ? 'text-[#ff3b30]' : 'text-[#28cd41]'}>
                          {isOver ? `Kelebihan Rp ${Math.abs(remaining).toLocaleString('id-ID')}` : `Sisa Rp ${remaining.toLocaleString('id-ID')}`}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="col-span-2 bg-white/40 dark:bg-white/[0.02] border border-black/[0.05] dark:border-white/[0.05] py-16 rounded-2xl flex flex-col items-center gap-3 text-slate-400 dark:text-slate-500 opacity-60">
              <span className="material-symbols-outlined text-5xl">search_off</span>
              <p className="font-headline font-bold uppercase tracking-widest text-xs">Belum ada kategori di tab ini</p>
              <p className="text-[10px] text-center max-w-xs font-medium">Tambahkan kategori budget baru bertipe belanja, tabungan, investasi, atau pendapatan di tombol kanan atas.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default FinanceBudget;
