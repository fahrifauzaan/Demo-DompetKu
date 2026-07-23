import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import { FeatureCTA } from './MarketingCTAModal';
import FinancePortfolioReport from './FinancePortfolioReport';
import FinancePerformanceReport from './FinancePerformanceReport';
import { parseTxnMonth as parseTransactionMonth } from './financeClassify';
import FinanceFIRECalculatorModal from './FinanceFIRECalculatorModal';
import FinanceEmergencyModal from './FinanceEmergencyModal';
import FinanceDebtFreedomModal from './FinanceDebtFreedomModal';
import FinanceRatioSimulatorModal, { RatioType } from './FinanceRatioSimulatorModal';
import FinanceZakatModal from './FinanceZakatModal';
import { useFinanceStore } from '../store/useFinanceStore';
import { computeZakat, readGoldPrice, readInclude, defaultDeduction } from './zakatUtils';
import { getUsdIdrRate, getUsdTickers, accountValueIDR, assetValueIDR } from './currencyUtils';
import HealthScoreCard from './HealthScoreCard';
import CashFlowStatementCard from './CashFlowStatementCard';
import SpendingInsightsCard from './SpendingInsightsCard';
import FinancialIndependenceCard from './FinancialIndependenceCard';
import NetWorthProjectionCard from './NetWorthProjectionCard';
import ScenarioPlannerModal from './ScenarioPlannerModal';


interface FinanceAnalyticsProps {
  onShowCTA: (feature?: FeatureCTA) => void;
  onNavigate?: (tab: string) => void;
}

const FinanceAnalytics: React.FC<FinanceAnalyticsProps> = ({ onShowCTA, onNavigate }) => {
  const [activeSubTab, setActiveSubTab] = useState<'summary' | 'diversification' | 'sector'>('summary');
  const [isScenarioOpen, setIsScenarioOpen] = useState(false);
  const [hoveredCashFlowIndex, setHoveredCashFlowIndex] = useState<number | null>(null);
  const [isFIREModalOpen, setIsFIREModalOpen] = useState(false);
  const [isEmergencyModalOpen, setIsEmergencyModalOpen] = useState(false);
  const [isZakatModalOpen, setIsZakatModalOpen] = useState(false);
  const [isDebtModalOpen, setIsDebtModalOpen] = useState(false);
  const [ratioModalConfig, setRatioModalConfig] = useState<{isOpen: boolean, type: RatioType}>({ isOpen: false, type: 'DTI' });

  // State for Income Mode (CFP Baseline average vs Actual)
  const [incomeMode, setIncomeMode] = useState<'actual' | 'baseline'>('actual');

  // Fetch from useFinanceStore
  const transactions = useFinanceStore((state) => state.transactions);
  const accounts = useFinanceStore((state) => state.accounts);
  const assets = useFinanceStore((state) => state.assets);
  const debts = useFinanceStore((state) => state.debts);
  const settings = useFinanceStore((state) => state.settings);
  const budgetCategories = useFinanceStore((state) => state.budgetCategories);

  // Calculate Net Worth — dinormalisasi ke IDR (F3.3; identity untuk aset/akun IDR)
  const usdRate = getUsdIdrRate(settings);
  const usdTickers = getUsdTickers(settings);
  const totalCash = accounts.reduce((acc, curr) => acc + accountValueIDR(curr, usdRate), 0);
  const totalAssets = assets.reduce((acc, curr) => acc + assetValueIDR(curr, usdRate, usdTickers), 0);
  const totalDebts = debts.reduce((acc, curr) => acc + curr.balance, 0);
  const netWorth = totalCash + totalAssets - totalDebts;

  // Format Helper for Millions/Billions
  const formatJt = (val: number) => {
    if (val >= 1e9) {
      return `Rp ${(val / 1e9).toFixed(2)}M`;
    }
    return `Rp ${(val / 1e6).toFixed(1)}Jt`;
  };

  // parseTransactionMonth kini dari util bersama ./financeClassify (diimpor sebagai alias).

  // Generate 12-Month Historical Net Worth
  const getHistoricalNetWorth = () => {
    const now = new Date();
    const monthKeys: string[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      monthKeys.push(`${yyyy}-${mm}`);
    }

    const monthlyChanges: Record<string, number> = {};
    transactions.forEach(tx => {
      const key = parseTransactionMonth(tx.date);
      const change = tx.type === 'PEMASUKAN' ? Math.abs(tx.amount) : tx.type === 'PENGELUARAN' ? -Math.abs(tx.amount) : 0;
      monthlyChanges[key] = (monthlyChanges[key] || 0) + change;
    });

    const history: { monthKey: string; label: string; netWorth: number }[] = [];
    let currentNW = netWorth;

    for (let i = 11; i >= 0; i--) {
      const key = monthKeys[i];
      const dateObj = new Date(parseInt(key.split('-')[0]), parseInt(key.split('-')[1]) - 1, 1);
      const label = dateObj.toLocaleDateString('id-ID', { month: 'short' }).toUpperCase();
      
      history.unshift({
        monthKey: key,
        label,
        netWorth: currentNW
      });

      const changeThisMonth = monthlyChanges[key] || 0;
      currentNW = currentNW - changeThisMonth;
    }
    return history;
  };

  const history = getHistoricalNetWorth();
  const nwValues = history.map(h => h.netWorth);
  const maxNW = Math.max(...nwValues, 1);
  const minNW = Math.min(...nwValues, 0);
  const nwRange = maxNW - minNW || 1;

  // State for Period Filtering (CFA/CFP best practice)
  const [selectedPeriod, setSelectedPeriod] = useState<string>('this_month');
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);

  // Budget Health Score calculation
  const currentMonthKey = new Date().toISOString().slice(0, 7); // '2026-06'
  
  const getPeriodFilterFn = (period: string) => {
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth();

    if (period === 'this_month') {
      return (txDateStr: string) => parseTransactionMonth(txDateStr) === currentMonthKey;
    }
    if (period === '3_months') {
      const last3Months = new Set<string>();
      for (let i = 0; i < 3; i++) {
        const d = new Date(curYear, curMonth - i, 1);
        last3Months.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
      }
      return (txDateStr: string) => last3Months.has(parseTransactionMonth(txDateStr));
    }
    if (period === '12_months') {
      const last12Months = new Set<string>();
      for (let i = 0; i < 12; i++) {
        const d = new Date(curYear, curMonth - i, 1);
        last12Months.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
      }
      return (txDateStr: string) => last12Months.has(parseTransactionMonth(txDateStr));
    }
    if (period === 'ytd') {
      const currentYearStr = String(curYear);
      return (txDateStr: string) => {
        const m = parseTransactionMonth(txDateStr);
        return m.startsWith(currentYearStr) && m <= currentMonthKey;
      };
    }
    // Specific month
    return (txDateStr: string) => parseTransactionMonth(txDateStr) === period;
  };

  const isTxInPeriod = getPeriodFilterFn(selectedPeriod);

  const getMonthsInPeriod = (period: string) => {
    if (period === 'this_month' || period.includes('-')) return 1;
    if (period === '3_months') return 3;
    if (period === '12_months') return 12;
    if (period === 'ytd') {
      return new Date().getMonth() + 1;
    }
    return 1;
  };
  const periodMonths = getMonthsInPeriod(selectedPeriod);

  const allocatedBudget = budgetCategories
    .filter(c => c.type === 'Pengeluaran')
    .reduce((acc, curr) => acc + curr.allocated, 0) * periodMonths;
  const currentMonthExpenses = transactions
    .filter(tx => tx.type === 'PENGELUARAN' && isTxInPeriod(tx.date))
    .reduce((acc, curr) => acc + Math.abs(curr.amount), 0);
  const budgetHealthScore = allocatedBudget > 0
    ? Math.max(0, Math.min(100, Math.round(((allocatedBudget - currentMonthExpenses) / allocatedBudget) * 100)))
    : 100;
  const remainingBudget = Math.max(0, allocatedBudget - currentMonthExpenses);

  // Dynamic Warning Category & Savings Rate
  let warningCat = "Tidak Ada";
  let warningPct = 0;
  const exceededCategory = budgetCategories.find(cat => {
    if (cat.type !== 'Pengeluaran') return false;
    const catExpenses = transactions
      .filter(tx => tx.type === 'PENGELUARAN' && tx.category === cat.name && isTxInPeriod(tx.date))
      .reduce((acc, curr) => acc + Math.abs(curr.amount), 0);
    return catExpenses > (cat.allocated * periodMonths);
  });
  if (exceededCategory) {
    const catExpenses = transactions
      .filter(tx => tx.type === 'PENGELUARAN' && tx.category === exceededCategory.name && isTxInPeriod(tx.date))
      .reduce((acc, curr) => acc + Math.abs(curr.amount), 0);
    warningCat = exceededCategory.name;
    warningPct = Math.round(((catExpenses - (exceededCategory.allocated * periodMonths)) / (exceededCategory.allocated * periodMonths)) * 100);
  }

  // --- NEW: CFO ADVISORY INSIGHTS & FIRE PREDICTOR LOGIC ---
  const currentMonthIncome = transactions
    .filter(tx => tx.type === 'PEMASUKAN' && isTxInPeriod(tx.date))
    .reduce((acc, curr) => acc + Math.abs(curr.amount), 0);

  // Calculate baseline income using 3-month average of active months
  const getHistoricalBaselineIncome = () => {
    const monthlyIncome: Record<string, number> = {};
    transactions.forEach(tx => {
      if (tx.type === 'PEMASUKAN') {
        const key = parseTransactionMonth(tx.date);
        if (key) {
          monthlyIncome[key] = (monthlyIncome[key] || 0) + Math.abs(tx.amount);
        }
      }
    });

    const historicalMonths = Object.keys(monthlyIncome)
      .filter(m => m !== currentMonthKey && monthlyIncome[m] > 0)
      .sort((a, b) => b.localeCompare(a));

    const last3Months = historicalMonths.slice(0, 3);
    if (last3Months.length === 0) {
      return 15000000; // Fallback to 15 Million
    }
    const sum = last3Months.reduce((acc, m) => acc + monthlyIncome[m], 0);
    return sum / last3Months.length;
  };

  const baselineIncomeValue = getHistoricalBaselineIncome() * periodMonths;
  const activeIncome = incomeMode === 'actual' ? currentMonthIncome : baselineIncomeValue;

  // Auto-set incomeMode to baseline on mount/update if currentMonthIncome is 0
  React.useEffect(() => {
    if (currentMonthIncome === 0) {
      setIncomeMode('baseline');
    } else {
      setIncomeMode('actual');
    }
  }, [currentMonthIncome]);
  
  const currentSavings = Math.max(0, currentMonthIncome - currentMonthExpenses);
  const savingsRate = currentMonthIncome > 0 ? Math.round((currentSavings / currentMonthIncome) * 100) : 0;
  
  // Calculate Net Worth Growth
  const lastMonthNW = history.length >= 2 ? history[history.length - 2].netWorth : netWorth;
  const nwGrowth = lastMonthNW > 0 ? ((netWorth - lastMonthNW) / lastMonthNW) * 100 : 0;
  
  // FIRE Predictor (Rule of 25 = 4% Safe Withdrawal Rate)
  // Target = 25 * Annual Expenses
  const annualExpenses = currentMonthExpenses * 12;
  const fireTarget = annualExpenses * 25;
  const fireShortfall = Math.max(0, fireTarget - netWorth);
  
  let yearsToFIRE = 0;
  if (fireShortfall <= 0 && fireTarget > 0) {
    yearsToFIRE = 0; // Already FI
  } else if (currentSavings > 0) {
    const annualSavings = currentSavings * 12;
    const r = 0.06;
    if (annualSavings > 0) {
      yearsToFIRE = Math.log((annualSavings + fireTarget * r) / (annualSavings + netWorth * r)) / Math.log(1 + r);
    } else {
      yearsToFIRE = 999;
    }
  } else {
    yearsToFIRE = 999; // Never reach FI
  }

  // Debt Freedom Calculator
  const totalMinPayment = debts.reduce((acc, curr) => acc + curr.minPayment, 0);
  const extraDebtPayment = Math.max(0, currentSavings * 0.10); // Assume 10% of savings goes to extra debt payment
  const totalMonthlyDebtPayment = totalMinPayment + extraDebtPayment;
  let monthsToDebtFree = 0;
  if (totalDebts > 0) {
    if (totalMonthlyDebtPayment <= 0) {
      monthsToDebtFree = 999;
    } else {
      monthsToDebtFree = Math.ceil(totalDebts / totalMonthlyDebtPayment);
    }
  }
  const debtFreeDate = new Date();
  debtFreeDate.setMonth(debtFreeDate.getMonth() + monthsToDebtFree);

  // --- NEW: FINANCIAL HEALTH KPI (DTI, LIQUIDITY, SOLVENCY) ---
  const dtiRatio = currentMonthIncome > 0 ? (totalMinPayment / currentMonthIncome) * 100 : 0;
  
  // Calculate average monthly expenses over the last 3 months for liquidity
  const getAvgExpenses = () => {
    const now = new Date();
    let total = 0;
    for (let i = 0; i < 3; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const key = `${yyyy}-${mm}`;
      const monthExp = transactions
        .filter(tx => tx.type === 'PENGELUARAN' && parseTransactionMonth(tx.date) === key)
        .reduce((acc, curr) => acc + Math.abs(curr.amount), 0);
      total += monthExp;
    }
    return Math.max(total / 3, 1000000); // Fallback to 1 Juta to avoid infinite months
  };
  const avgMonthlyExpenses = getAvgExpenses();
  const liquidityRatio = totalCash / avgMonthlyExpenses; // In months
  
  const debtToAssetRatio = totalAssets > 0 ? (totalDebts / totalAssets) * 100 : 0;

  // Monthly Cash Flow for last months (dynamically changes based on selectedPeriod)
  const getCashFlowData = () => {
    const now = new Date();
    const monthsToShow: string[] = [];
    
    if (selectedPeriod === '3_months') {
      for (let i = 2; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        monthsToShow.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
      }
    } else if (selectedPeriod === 'this_month') {
      for (let i = 3; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        monthsToShow.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
      }
    } else if (selectedPeriod === 'ytd') {
      const curYear = now.getFullYear();
      const curMonth = now.getMonth();
      for (let i = curMonth; i >= 0; i--) {
        const d = new Date(curYear, curMonth - i, 1);
        monthsToShow.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
      }
    } else if (selectedPeriod === '12_months') {
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        monthsToShow.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
      }
    } else if (selectedPeriod.includes('-')) {
      // Specific month selected. Show that month and the 3 months leading up to it
      const parts = selectedPeriod.split('-');
      const year = parseInt(parts[0]);
      const monthIdx = parseInt(parts[1]) - 1; // 0-indexed
      for (let i = 3; i >= 0; i--) {
        const d = new Date(year, monthIdx - i, 1);
        monthsToShow.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
      }
    } else {
      for (let i = 3; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        monthsToShow.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
      }
    }

    const flowGroup: Record<string, { rawIn: number; rawOut: number }> = {};
    monthsToShow.forEach(m => {
      flowGroup[m] = { rawIn: 0, rawOut: 0 };
    });

    transactions.forEach(tx => {
      const key = parseTransactionMonth(tx.date);
      if (flowGroup[key]) {
        if (tx.type === 'PEMASUKAN') flowGroup[key].rawIn += Math.abs(tx.amount);
        if (tx.type === 'PENGELUARAN') flowGroup[key].rawOut += -Math.abs(tx.amount);
      }
    });

    const list = monthsToShow.map(m => {
      const dateObj = new Date(parseInt(m.split('-')[0]), parseInt(m.split('-')[1]) - 1, 1);
      const label = dateObj.toLocaleDateString('id-ID', { month: 'short' });
      const rawIn = flowGroup[m].rawIn;
      const rawOut = flowGroup[m].rawOut;
      return {
        label,
        rawIn,
        rawOut,
      };
    });

    const maxVal = Math.max(...list.map(l => Math.max(Math.abs(l.rawIn), Math.abs(l.rawOut))), 1);
    return list.map(l => ({
      ...l,
      in: Math.max(5, Math.round((Math.abs(l.rawIn) / maxVal) * 90)),
      out: Math.max(5, Math.round((Math.abs(l.rawOut) / maxVal) * 90)),
      val: formatJt(l.rawIn),
    })).reverse(); // reverse so most recent is first
  };

  const cashFlowData = getCashFlowData();

  // Expense Breakdown
  const getExpenseBreakdown = () => {
    const currentExpenses = transactions.filter(tx => tx.type === 'PENGELUARAN' && isTxInPeriod(tx.date));
    if (currentExpenses.length === 0) {
      return {
        pctInvest: 0,
        pctPokok: 0,
        pctLifestyle: 0,
        pctUtang: 0,
        valLifestyle: 0,
      };
    }

    let totalInvestasi = 0;
    let totalPokok = 0;
    let totalLifestyle = 0;
    let totalUtang = 0;

    currentExpenses.forEach(tx => {
      const cat = tx.category.toLowerCase();
      const amt = Math.abs(tx.amount);
      if (cat.includes('investasi') || cat.includes('saham') || cat.includes('reksadana') || cat.includes('tabungan') || cat.includes('pasar') || cat.includes('investment')) {
        totalInvestasi += amt;
      } else if (cat.includes('cicilan') || cat.includes('utang') || cat.includes('kpr') || cat.includes('pinjaman') || cat.includes('debts') || cat.includes('debt')) {
        totalUtang += amt;
      } else if (cat.includes('gaya hidup') || cat.includes('shop') || cat.includes('hobi') || cat.includes('hiburan') || cat.includes('nonton') || cat.includes('netflix') || cat.includes('elektronik') || cat.includes('langganan') || cat.includes('entertainment') || cat.includes('subscription') || cat.includes('gift') || cat.includes('travel') || cat.includes('personal care')) {
        totalLifestyle += amt;
      } else {
        totalPokok += amt;
      }
    });

    const grandTotal = totalInvestasi + totalPokok + totalLifestyle + totalUtang || 1;
    const pctInvest = Math.round((totalInvestasi / grandTotal) * 100);
    const pctPokok = Math.round((totalPokok / grandTotal) * 100);
    const pctLifestyle = Math.round((totalLifestyle / grandTotal) * 100);
    const pctUtang = Math.max(0, 100 - pctInvest - pctPokok - pctLifestyle);

    return {
      pctInvest,
      pctPokok,
      pctLifestyle,
      pctUtang,
      valLifestyle: totalLifestyle,
    };
  };

  const { pctInvest, pctPokok, pctLifestyle, pctUtang, valLifestyle } = getExpenseBreakdown();

  // Settings for Emergency Fund
  const getSetting = (key: string, defaultValue: string) => {
    const item = settings.find(s => s.key === key);
    return item ? item.value : defaultValue;
  };
  const targetRaw = getSetting('emergencyFundTarget', '750000000');
  const currentRaw = getSetting('emergencyFundCurrent', '637500000');
  const emergencyTarget = parseFloat(targetRaw) || 50000000;
  const emergencyCurrent = parseFloat(currentRaw) || 42500000;
  const emergencyProgress = Math.min(100, Math.max(0, Math.round((emergencyCurrent / emergencyTarget) * 100)));

  // Estimasi Zakat Maal untuk kartu pemicu (pakai toggle & harga emas tersimpan; deduksi otomatis).
  // Kalkulasi presisi (dengan override) ada di dalam FinanceZakatModal.
  const zakatEstimate = computeZakat(accounts, assets, {
    goldPrice: readGoldPrice(settings),
    include: readInclude(settings),
    deduction: defaultDeduction(debts),
  });

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    const transactions = useFinanceStore.getState().transactions;
    if (transactions.length === 0) {
      alert("Tidak ada transaksi untuk diekspor!");
      return;
    }

    // Build CSV Content
    const headers = ["Tanggal", "Deskripsi", "Lokasi", "Nominal (IDR)", "Kategori", "Akun", "Tipe"];
    const rows = transactions.map(tx => [
      tx.date,
      `"${tx.desc.replace(/"/g, '""')}"`,
      `"${tx.location ? tx.location.replace(/"/g, '""') : ''}"`,
      tx.amount,
      tx.category,
      tx.account,
      tx.type
    ]);

    const csvString = [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${(import.meta.env.VITE_APP_NAME || 'dompetku').toLowerCase()}_transaksi_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getPeriodLabel = (period: string) => {
    if (period === 'this_month') return 'Bulan Ini';
    if (period === '3_months') return '3 Bulan Terakhir';
    if (period === '12_months') return '12 Bulan Terakhir';
    if (period === 'ytd') return 'Tahun Ini (YTD)';
    const parts = period.split('-');
    if (parts.length === 2) {
      const date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, 1);
      return date.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
    }
    return period;
  };

  const getUniqueTransactionMonths = () => {
    const months = new Set<string>();
    transactions.forEach(tx => {
      const key = parseTransactionMonth(tx.date);
      if (key) months.add(key);
    });
    months.add(currentMonthKey);
    return Array.from(months).sort((a, b) => b.localeCompare(a));
  };
  const availableMonths = getUniqueTransactionMonths();

  const totalPokokDanUtang = currentMonthExpenses * ((pctPokok + pctUtang) / 100);
  const totalWants = currentMonthExpenses * (pctLifestyle / 100);
  const totalInvestments = currentMonthExpenses * (pctInvest / 100);
  const activeSavingsValue = Math.max(0, activeIncome - currentMonthExpenses);
  const totalTabunganDanInvestasi = totalInvestments + activeSavingsValue;

  const widthSavings = Math.min(100, (totalTabunganDanInvestasi / (activeIncome || 1)) * 100);
  const widthNeeds = Math.min(100, (totalPokokDanUtang / (activeIncome || 1)) * 100);
  const widthWants = Math.min(100, (totalWants / (activeIncome || 1)) * 100);

  const isNeedsOver = totalPokokDanUtang > activeIncome * 0.5;
  const needsColor = isNeedsOver 
    ? 'bg-gradient-to-r from-amber-500 to-red-500 shadow-md' 
    : 'bg-blue-500 dark:bg-blue-600';

  const isWantsOver = totalWants > activeIncome * 0.3;
  const wantsColor = isWantsOver 
    ? 'bg-gradient-to-r from-red-500 to-rose-600 shadow-md' 
    : 'bg-orange-400 dark:bg-orange-500';

  const isSavingsUnder = totalTabunganDanInvestasi < activeIncome * 0.2;
  const savingsColor = isSavingsUnder
    ? 'bg-purple-400 dark:bg-purple-500'
    : 'bg-gradient-to-r from-purple-500 to-indigo-600';

  return (
    <div className="space-y-5 sm:space-y-6 lg:space-y-10 animate-in fade-in duration-500 pb-8 lg:pb-12">
      {/* Header & Filters Section */}
      <section className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl lg:text-2xl font-extrabold text-primary dark:text-[#a7c8ff] font-headline tracking-tight">Pusat Laporan & Analitik</h2>
          <p className="text-xs text-on-surface-variant dark:text-outline mt-1 font-medium">Wawasan komprehensif dari setiap pergerakan aset Anda.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto no-print">
          <div className="relative flex-1 sm:flex-none">
            <button 
              onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
              className="w-full bg-white/60 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 px-4 py-2 rounded-xl flex items-center justify-center gap-2 text-on-surface dark:text-white text-xs font-bold hover:bg-white/80 dark:hover:bg-white/10 transition-all active:scale-95 cursor-pointer shadow-sm"
            >
              <span className="material-symbols-outlined text-sm text-primary dark:text-[#a7c8ff]">calendar_today</span>
              <span>{getPeriodLabel(selectedPeriod)}</span>
              <span className="material-symbols-outlined text-xs transition-transform duration-300" style={{ transform: isFilterDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>keyboard_arrow_down</span>
            </button>

            <AnimatePresence>
              {isFilterDropdownOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setIsFilterDropdownOpen(false)}
                  />
                  <motion.div 
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="absolute right-0 mt-2 w-64 bg-white/70 dark:bg-black/70 backdrop-blur-2xl border border-white/30 dark:border-white/10 rounded-2xl shadow-2xl p-4 z-50 overflow-y-auto max-h-[350px] scrollbar-thin text-left border-t border-l"
                  >
                    <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 px-2">Rentang Cepat</div>
                    <div className="space-y-1 mb-3">
                      {[
                        { key: 'this_month', label: 'Bulan Ini' },
                        { key: '3_months', label: '3 Bulan Terakhir' },
                        { key: '12_months', label: '12 Bulan Terakhir' },
                        { key: 'ytd', label: 'Tahun Ini (YTD)' }
                      ].map(item => (
                        <button
                          key={item.key}
                          onClick={() => {
                            setSelectedPeriod(item.key);
                            setIsFilterDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between ${
                            selectedPeriod === item.key
                              ? 'bg-primary dark:bg-primary-container text-white'
                              : 'text-slate-700 dark:text-slate-350 hover:bg-slate-100/50 dark:hover:bg-white/5'
                          }`}
                        >
                          <span>{item.label}</span>
                          {selectedPeriod === item.key && (
                            <span className="material-symbols-outlined text-sm">check</span>
                          )}
                        </button>
                      ))}
                    </div>

                    <div className="border-t border-slate-200 dark:border-white/10 my-3" />

                    <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 px-2">Pilih Bulan</div>
                    <div className="space-y-1">
                      {availableMonths.map(month => {
                        const label = getPeriodLabel(month);
                        return (
                          <button
                            key={month}
                            onClick={() => {
                              setSelectedPeriod(month);
                              setIsFilterDropdownOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between ${
                              selectedPeriod === month
                                ? 'bg-primary dark:bg-primary-container text-white'
                                : 'text-slate-700 dark:text-slate-355 hover:bg-slate-100/50 dark:hover:bg-white/5'
                            }`}
                          >
                            <span>{label}</span>
                            {selectedPeriod === month && (
                              <span className="material-symbols-outlined text-sm">check</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
          {/* CSV Export Button */}
          <button 
            onClick={handleExportCSV}
            className="flex flex-1 sm:flex-none justify-center items-center gap-2 bg-surface-container-lowest dark:bg-white/5 text-primary dark:text-[#a7c8ff] border border-outline-variant/20 dark:border-white/10 px-4 py-2 rounded-xl font-bold text-xs hover:bg-surface-container-low transition-all active:scale-95 cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">csv</span>
            Ekspor (CSV)
          </button>

          {/* PDF Print Button */}
          <button 
            onClick={handlePrint}
            className="flex flex-1 sm:flex-none justify-center items-center gap-2 text-white bg-gradient-to-r from-primary to-primary-container dark:from-[#a7c8ff] dark:to-[#82b1ff] dark:text-[#001b3c] px-4 py-2 rounded-xl font-bold text-xs shadow-md shadow-primary/20 hover:opacity-90 active:scale-95 transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">file_download</span>
            Cetak (PDF)
          </button>
        </div>
      </section>

      {/* Sub-Tab Navigation */}
      <nav className="flex items-center gap-1 bg-surface-container-low dark:bg-white/5 p-1 rounded-2xl w-max border border-outline-variant/10 dark:border-white/5 shadow-inner">
        <button 
          onClick={() => setActiveSubTab('summary')}
          className={`px-5 py-2 rounded-xl text-xs font-bold transition-all ${activeSubTab === 'summary' ? 'bg-white dark:bg-primary-container text-primary dark:text-white shadow-sm' : 'text-on-surface-variant dark:text-outline hover:text-primary dark:hover:text-[#a7c8ff]'}`}
        >
          Ringkasan
        </button>
        <button 
          onClick={() => setActiveSubTab('diversification')}
          className={`px-5 py-2 rounded-xl text-xs font-bold transition-all ${activeSubTab === 'diversification' ? 'bg-white dark:bg-primary-container text-primary dark:text-white shadow-sm' : 'text-on-surface-variant dark:text-outline hover:text-primary dark:hover:text-[#a7c8ff]'}`}
        >
          Diversifikasi
        </button>
        <button 
          onClick={() => setActiveSubTab('sector')}
          className={`px-5 py-2 rounded-xl text-xs font-bold transition-all ${activeSubTab === 'sector' ? 'bg-white dark:bg-primary-container text-primary dark:text-white shadow-sm' : 'text-on-surface-variant dark:text-outline hover:text-primary dark:hover:text-[#a7c8ff]'}`}
        >
          Sektoral
        </button>
      </nav>

      {/* Conditional Content Rendering */}
      {activeSubTab === 'summary' && (
        <div className="space-y-5 sm:space-y-6 lg:space-y-8 animate-in slide-in-from-bottom-2 duration-300">
              {/* F3.4 Skor Kesehatan Finansial Komposit */}
              <HealthScoreCard />

              {/* F4.1 Laporan Arus Kas + Burn Rate & Runway */}
              <CashFlowStatementCard />

              {/* F4.2 Wawasan Pengeluaran & Deteksi Anomali */}
              <SpendingInsightsCard />

              {/* F5.2 Pelacak Kemandirian Finansial (FIRE) */}
              <FinancialIndependenceCard />

              {/* F5.1 Proyeksi Kekayaan Bersih */}
              <NetWorthProjectionCard />

              {/* F5.4 Perencana Skenario What-If (pemicu modal) */}
              <button onClick={() => setIsScenarioOpen(true)}
                className="w-full flex items-center gap-4 p-4 sm:p-5 rounded-2xl sm:rounded-[28px] liquid-glass border border-white/20 dark:border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] hover:-translate-y-0.5 transition-transform text-left cursor-pointer">
                <div className="w-11 h-11 rounded-2xl bg-primary/10 dark:bg-[#a7c8ff]/15 flex items-center justify-center text-primary dark:text-[#a7c8ff] shrink-0"><span className="material-symbols-outlined">alt_route</span></div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-black font-headline text-on-surface dark:text-white">Perencana Skenario "What-If"</h3>
                  <p className="text-[12px] text-on-surface-variant dark:text-slate-400 mt-0.5">Uji dampak resign, beli rumah, biaya naik, atau tambahan penghasilan ke runway & net worth</p>
                </div>
                <span className="material-symbols-outlined text-on-surface-variant dark:text-slate-400">chevron_right</span>
              </button>

              {/* --- NEW: CFO ADVISORY INSIGHT BENTO BOX --- */}
              <div className="bg-gradient-to-br from-primary-container/40 to-surface-container-lowest dark:from-[#a7c8ff]/10 dark:to-transparent border border-primary/20 dark:border-[#a7c8ff]/20 p-4 sm:p-6 lg:p-8 rounded-2xl sm:rounded-[28px] lg:rounded-[32px] shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                  <span className="material-symbols-outlined text-9xl">analytics</span>
                </div>
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-6">
                    <span className="material-symbols-outlined text-primary dark:text-[#a7c8ff] animate-pulse">insights</span>
                    <h3 className="font-extrabold text-lg text-primary dark:text-[#a7c8ff] tracking-tight">CFO Advisory Insight</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
                    <div className="bg-white/60 dark:bg-black/20 backdrop-blur-md border border-white/40 dark:border-white/5 rounded-2xl p-5">
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${nwGrowth >= 0 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                          <span className="material-symbols-outlined text-sm">{nwGrowth >= 0 ? 'trending_up' : 'trending_down'}</span>
                        </div>
                        <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">Kekayaan Bersih</h4>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                        Kekayaan bersih Anda {nwGrowth >= 0 ? 'naik' : 'turun'} sebesar <strong className="text-slate-900 dark:text-white">{Math.abs(nwGrowth).toFixed(1)}%</strong> bulan ini. {nwGrowth >= 0 ? 'Pertahankan momentum positif ini dengan terus meningkatkan aset.' : 'Evaluasi kembali pengeluaran untuk menstabilkan neraca.'}
                      </p>
                    </div>
                    <div className="bg-white/60 dark:bg-black/20 backdrop-blur-md border border-white/40 dark:border-white/5 rounded-2xl p-5">
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${warningPct > 0 ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'}`}>
                          <span className="material-symbols-outlined text-sm">{warningPct > 0 ? 'warning' : 'check_circle'}</span>
                        </div>
                        <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">Arus Kas & Anggaran</h4>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                        {warningPct > 0 
                          ? <>Pengeluaran <strong className="text-slate-900 dark:text-white">{warningCat}</strong> melebihi anggaran sebesar <strong className="text-orange-600 dark:text-orange-400">{warningPct}%</strong>. Kurangi pengeluaran opsional minggu ini.</>
                          : <>Semua kategori pengeluaran Anda masih dalam batas anggaran. Manajemen arus kas yang sangat baik bulan ini!</>}
                      </p>
                    </div>
                    <div className="bg-white/60 dark:bg-black/20 backdrop-blur-md border border-white/40 dark:border-white/5 rounded-2xl p-5">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 flex items-center justify-center">
                          <span className="material-symbols-outlined text-sm">savings</span>
                        </div>
                        <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">Tingkat Tabungan</h4>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                        Anda menabung <strong className="text-purple-700 dark:text-purple-400">{savingsRate}%</strong> dari pendapatan Anda. {savingsRate >= 20 ? 'Ini berada di atas standar emas (20%). Masa depan finansial Anda sangat cerah!' : 'Coba tingkatkan menuju target ideal 20% untuk mempercepat kemandirian finansial.'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* --- NEW: CASH FLOW WATERFALL --- */}
              <div className="bg-surface-container-lowest dark:bg-transparent border border-outline-variant/10 dark:border-white/10 p-4 sm:p-6 lg:p-8 rounded-2xl sm:rounded-[28px] lg:rounded-[32px] shadow-sm">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-extrabold text-base lg:text-lg text-on-surface dark:text-white tracking-tight uppercase">Visualisasi Arus Kas Bulan Ini</h3>
                      {incomeMode === 'baseline' && (
                        <span className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-0.5 rounded text-[10px] font-bold">
                          Estimasi Baseline
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Ke mana perginya uang Anda? (Alokasi Kebutuhan vs Keinginan vs Tabungan)</p>
                  </div>
                  
                  <div className="flex items-center gap-2 bg-surface-container dark:bg-white/5 p-1 rounded-xl no-print">
                    <button
                      onClick={() => setIncomeMode('actual')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        incomeMode === 'actual'
                          ? 'bg-white dark:bg-primary-container text-primary dark:text-white shadow-sm'
                          : 'text-on-surface-variant dark:text-outline hover:text-primary dark:hover:text-white'
                      }`}
                    >
                      Aktual
                    </button>
                    <button
                      onClick={() => setIncomeMode('baseline')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        incomeMode === 'baseline'
                          ? 'bg-white dark:bg-primary-container text-primary dark:text-white shadow-sm'
                          : 'text-on-surface-variant dark:text-outline hover:text-primary dark:hover:text-white'
                      }`}
                    >
                      Rata-rata
                    </button>
                  </div>
                </div>
                
                <div className="flex flex-col gap-4">
                  {/* Income Row */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-0">
                    <div className="w-full sm:w-48 text-left sm:text-right sm:pr-4 text-xs font-bold text-slate-700 dark:text-slate-300">Pendapatan</div>
                    <div className="w-full sm:flex-1 h-8 bg-surface-container dark:bg-white/5 rounded-lg sm:rounded-l-none sm:rounded-r-lg relative overflow-hidden">
                      {/* Background Text (visible on empty track) */}
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-700 dark:text-slate-300 drop-shadow-sm whitespace-nowrap z-0">
                        Rp {activeIncome.toLocaleString('id-ID')}
                      </span>
                      {/* Colored Bar (Clipped wrapper) */}
                      <div className="absolute top-0 left-0 h-full bg-green-500 dark:bg-green-600 rounded-lg sm:rounded-l-none sm:rounded-r-lg transition-all duration-500 overflow-hidden z-10" style={{ width: '100%' }}>
                        {/* Foreground Text (White, exact same position) */}
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-white drop-shadow-sm whitespace-nowrap">
                          Rp {activeIncome.toLocaleString('id-ID')}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Savings/Investments Row */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-0">
                    <div className="w-full sm:w-48 text-left sm:text-right sm:pr-4 text-xs font-bold text-slate-700 dark:text-slate-300">Tabungan & Investasi</div>
                    <div className="w-full sm:flex-1 h-8 bg-surface-container dark:bg-white/5 rounded-lg sm:rounded-l-none sm:rounded-r-lg relative overflow-hidden">
                      {/* Background Text (visible on empty track) */}
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-700 dark:text-slate-300 drop-shadow-sm whitespace-nowrap z-0">
                        Rp {totalTabunganDanInvestasi.toLocaleString('id-ID')} (Target 20%: Rp {(activeIncome * 0.2).toLocaleString('id-ID')})
                      </span>
                      {/* Colored Bar (Clipped wrapper) */}
                      <div className={`absolute top-0 left-0 h-full ${savingsColor} rounded-lg sm:rounded-l-none sm:rounded-r-lg transition-all duration-500 overflow-hidden z-10`} style={{ width: `${widthSavings}%` }}>
                        {/* Foreground Text (White, exact same position) */}
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-white drop-shadow-sm whitespace-nowrap">
                          Rp {totalTabunganDanInvestasi.toLocaleString('id-ID')} (Target 20%: Rp {(activeIncome * 0.2).toLocaleString('id-ID')})
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Needs Row */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-0">
                    <div className="w-full sm:w-48 text-left sm:text-right sm:pr-4 text-xs font-bold text-slate-700 dark:text-slate-300">Kebutuhan Pokok & Utang</div>
                    <div className="w-full sm:flex-1 h-8 bg-surface-container dark:bg-white/5 rounded-lg sm:rounded-l-none sm:rounded-r-lg relative overflow-hidden">
                      {/* Background Text (visible on empty track) */}
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-700 dark:text-slate-300 drop-shadow-sm whitespace-nowrap z-0">
                        Rp {totalPokokDanUtang.toLocaleString('id-ID')} (Target 50%: Rp {(activeIncome * 0.5).toLocaleString('id-ID')})
                      </span>
                      {/* Colored Bar (Clipped wrapper) */}
                      <div className={`absolute top-0 left-0 h-full ${needsColor} rounded-lg sm:rounded-l-none sm:rounded-r-lg transition-all duration-500 overflow-hidden z-10`} style={{ width: `${widthNeeds}%` }}>
                        {/* Foreground Text (White, exact same position) */}
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-white drop-shadow-sm whitespace-nowrap">
                          Rp {totalPokokDanUtang.toLocaleString('id-ID')} (Target 50%: Rp {(activeIncome * 0.5).toLocaleString('id-ID')})
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Wants Row */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-0">
                    <div className="w-full sm:w-48 text-left sm:text-right sm:pr-4 text-xs font-bold text-slate-700 dark:text-slate-300">Gaya Hidup (Wants)</div>
                    <div className="w-full sm:flex-1 h-8 bg-surface-container dark:bg-white/5 rounded-lg sm:rounded-l-none sm:rounded-r-lg relative overflow-hidden">
                      {/* Background Text (visible on empty track) */}
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-700 dark:text-slate-300 drop-shadow-sm whitespace-nowrap z-0">
                        Rp {totalWants.toLocaleString('id-ID')} (Target 30%: Rp {(activeIncome * 0.3).toLocaleString('id-ID')})
                      </span>
                      {/* Colored Bar (Clipped wrapper) */}
                      <div className={`absolute top-0 left-0 h-full ${wantsColor} rounded-lg sm:rounded-l-none sm:rounded-r-lg transition-all duration-500 overflow-hidden z-10`} style={{ width: `${widthWants}%` }}>
                        {/* Foreground Text (White, exact same position) */}
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-white drop-shadow-sm whitespace-nowrap">
                          Rp {totalWants.toLocaleString('id-ID')} (Target 30%: Rp {(activeIncome * 0.3).toLocaleString('id-ID')})
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 lg:gap-6">
            
            {/* Net Worth Trend Card */}
            <div className="lg:col-span-8 bg-surface-container-lowest dark:bg-transparent border border-outline-variant/10 dark:border-white/10 p-4 sm:p-5 lg:p-6 rounded-2xl lg:rounded-[24px] shadow-sm">
              <div className="flex justify-between items-start mb-8 flex-col sm:flex-row gap-4 sm:gap-0">
                <div>
                  <h3 className="font-headline text-on-surface-variant dark:text-outline text-xs uppercase tracking-widest font-bold mb-1">Tren Kekayaan Bersih</h3>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="font-headline text-2xl lg:text-3xl font-extrabold tabular-nums dark:text-white">Rp {netWorth.toLocaleString('id-ID')}</span>
                    <span className="text-tertiary-container dark:text-tertiary-fixed text-[10px] font-bold flex items-center bg-tertiary-fixed/30 dark:bg-tertiary-fixed/20 px-2 py-0.5 rounded-full">
                      <span className="material-symbols-outlined text-[10px] mr-0.5">arrow_upward</span>
                      12.4%
                    </span>
                  </div>
                </div>
                <div className="flex gap-2 items-center bg-surface-container-low dark:bg-white/5 px-3 py-1.5 rounded-xl">
                  <span className="w-2.5 h-2.5 rounded-full bg-primary dark:bg-[#a7c8ff]"></span>
                  <span className="text-[10px] text-on-surface flex items-center gap-1 font-bold dark:text-slate-300">
                    Total Aset
                    <span className="material-symbols-outlined text-[12px] text-outline" title="Total akumulasi nilai wajar (market value) seluruh aset">info</span>
                  </span>
                </div>
              </div>

              {/* Dynamic Line Chart */}
              <div className="h-64 w-full relative">
                <div className="absolute inset-0 flex items-end justify-between px-2 pb-6">
                  <div className="w-full h-full flex items-end gap-[4px] sm:gap-2">
                    {history.map((h, i) => {
                      const isCurrent = i === 11;
                      const heightPercent = Math.max(10, Math.round(((h.netWorth - minNW) / nwRange) * 80)) + 10;
                      if (!isCurrent) {
                        return (
                          <div key={i} className="flex-1 bg-primary/5 dark:bg-[#a7c8ff]/10 rounded-t-sm relative group transition-all duration-300 hover:bg-primary/20 dark:hover:bg-[#a7c8ff]/30" style={{ height: `${heightPercent}%` }}>
                            <div className="absolute -top-1 left-0 right-0 h-0.5 bg-primary dark:bg-[#a7c8ff] rounded-full"></div>
                            <div className="absolute opacity-0 group-hover:opacity-100 -top-8 left-1/2 -translate-x-1/2 bg-surface-variant dark:bg-white text-on-surface dark:text-[#001b3c] text-[10px] font-bold px-2 py-1 rounded shadow-md pointer-events-none transition-opacity whitespace-nowrap z-10">
                              {formatJt(h.netWorth)}
                            </div>
                          </div>
                        );
                      } else {
                        return (
                          <div key={i} className="flex-1 bg-primary/20 dark:bg-[#a7c8ff]/30 rounded-t-sm relative ring-2 ring-primary dark:ring-[#a7c8ff]/50" style={{ height: `${heightPercent}%` }}>
                            <div className="absolute -top-1 left-0 right-0 h-0.5 bg-primary dark:bg-[#a7c8ff]"></div>
                            <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-primary dark:bg-[#a7c8ff] text-white dark:text-[#001b3c] text-[10px] font-bold px-2 py-1 rounded shadow-md whitespace-nowrap z-10">
                              {formatJt(h.netWorth)}
                            </div>
                          </div>
                        );
                      }
                    })}
                  </div>
                </div>
                
                {/* X Axis */}
                <div className="absolute bottom-0 w-full flex justify-between text-[10px] text-outline font-bold px-4">
                  {history.map((h, i) => (
                    <span key={i} className={i % 2 === 0 ? "hidden sm:inline" : ""}>{h.label}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Budget Health Card */}
            <div className="lg:col-span-4 bg-surface-container-lowest dark:bg-transparent border border-outline-variant/10 dark:border-white/10 p-4 sm:p-5 lg:p-6 rounded-2xl lg:rounded-[24px] flex flex-col shadow-sm">
              <h3 className="font-headline text-on-surface-variant dark:text-outline text-xs uppercase tracking-widest font-bold mb-6">Budget Health Score</h3>
              <div className="space-y-6 flex-1 flex flex-col justify-center">
                
                <div className="relative flex items-center justify-center h-48 group">
                  <svg className="w-40 h-40 transform -rotate-90">
                    <circle className="text-surface-container-high dark:text-white/10 transition-colors" cx="80" cy="80" fill="transparent" r="72" stroke="currentColor" strokeWidth="12"></circle>
                    <circle 
                      className="text-tertiary-fixed-dim dark:text-tertiary-fixed transition-all duration-1000 ease-out" 
                      cx="80" 
                      cy="80" 
                      fill="transparent" 
                      r="72" 
                      stroke="currentColor" 
                      strokeWidth="12" 
                      strokeLinecap="round"
                      strokeDasharray="452.4"
                      strokeDashoffset={452.4 - (452.4 * budgetHealthScore) / 100}
                    ></circle>
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-4xl font-extrabold font-headline tabular-nums dark:text-white mb-1 tracking-tighter">{budgetHealthScore}<span className="text-2xl opacity-50">%</span></span>
                    <span className="text-[10px] font-bold text-tertiary-container dark:text-tertiary-fixed bg-tertiary-fixed/30 dark:bg-tertiary-fixed/20 px-2 py-0.5 rounded-full tracking-widest">{budgetHealthScore >= 70 ? 'AMAN' : budgetHealthScore >= 40 ? 'WASPADA' : 'BAHAYA'}</span>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-medium text-on-surface-variant dark:text-slate-300">Sisa Anggaran Global</span>
                    <span className="font-bold tabular-nums dark:text-white">Rp {remainingBudget.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="h-1.5 w-full bg-surface-container-high dark:bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-tertiary-fixed-dim dark:bg-tertiary-fixed rounded-full" style={{ width: `${budgetHealthScore}%` }}></div>
                  </div>
                  <p className="text-xs text-on-surface-variant dark:text-outline leading-relaxed border-t border-outline-variant/10 dark:border-white/10 pt-4 mt-4">
                    Pengeluaran Anda bulan ini <strong className="text-primary dark:text-[#a7c8ff]">Rp {currentMonthExpenses.toLocaleString('id-ID')}</strong> dari total anggaran <strong className="text-primary dark:text-[#a7c8ff]">Rp {allocatedBudget.toLocaleString('id-ID')}</strong>. Pertahankan tren positif ini.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Secondary Analysis Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
            
            {/* Cash Flow Table/Chart */}
            <div className="bg-surface-container-lowest dark:bg-transparent border border-outline-variant/10 dark:border-white/10 rounded-[24px] overflow-hidden shadow-sm flex flex-col">
              <div className="p-6 flex-1 flex flex-col md:p-8">
                <div className="flex justify-between items-center mb-8">
                  <div className="flex items-center gap-2">
                    <h3 className="font-headline text-on-surface-variant dark:text-outline text-xs uppercase tracking-widest font-bold">Arus Kas Bulanan</h3>
                    {cashFlowData.length > 0 && (() => {
                      const currentMonthFlow = cashFlowData[0];
                      const netCashFlow = currentMonthFlow ? (currentMonthFlow.rawIn + currentMonthFlow.rawOut) : 0;
                      return (
                        <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold flex items-center gap-0.5 ${
                          netCashFlow >= 0 
                            ? 'bg-green-500/10 text-green-600 dark:bg-green-500/20 dark:text-green-400' 
                            : 'bg-red-500/10 text-red-600 dark:bg-red-500/20 dark:text-red-400'
                        }`}>
                          Net: {netCashFlow >= 0 ? '+' : ''}Rp {netCashFlow.toLocaleString('id-ID')}
                        </span>
                      );
                    })()}
                  </div>
                </div>
                <div className="h-64 mt-4 w-full relative z-10">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={cashFlowData} margin={{ top: 20, right: 10, left: 10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="pemasukanGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#34d399" stopOpacity={1} />
                          <stop offset="100%" stopColor="#059669" stopOpacity={0.6} />
                        </linearGradient>
                        <linearGradient id="pengeluaranGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#f87171" stopOpacity={1} />
                          <stop offset="100%" stopColor="#ef4444" stopOpacity={0.6} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#888', fontWeight: 'bold' }} />
                      <YAxis width={65} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#888', fontWeight: 'bold' }} tickFormatter={(val) => formatJt(val)} />
                      <Tooltip 
                        cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                        contentStyle={{ backgroundColor: '#191c1e', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                        itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                        formatter={(val: number) => [`Rp ${Math.abs(val).toLocaleString('id-ID')}`, '']}
                      />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
                      <Bar dataKey="rawIn" name="Pemasukan" fill="url(#pemasukanGrad)" radius={[6, 6, 0, 0]} barSize={14} />
                      <Bar dataKey="rawOut" name="Pengeluaran" fill="url(#pengeluaranGrad)" radius={[6, 6, 0, 0]} barSize={14} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Expense Categories Breakdown */}
            <div className="bg-surface-container-lowest dark:bg-transparent border border-outline-variant/10 dark:border-white/10 rounded-2xl lg:rounded-[24px] p-4 sm:p-6 lg:p-8 flex flex-col shadow-sm">
              <div className="flex justify-between items-center mb-8">
                <h3 className="font-headline text-on-surface-variant dark:text-outline text-xs uppercase tracking-widest font-bold">Alokasi Pengeluaran</h3>
                <button onClick={() => onNavigate?.('transactions')} className="text-primary dark:text-[#a7c8ff] text-xs font-bold hover:underline cursor-pointer">Log Transaksi</button>
              </div>
              
              <div className="flex flex-col sm:flex-row items-center gap-8 flex-1">
                <div className="relative w-48 h-48 shrink-0 flex items-center justify-center">
                  <div className="absolute flex flex-col items-center justify-center text-center pointer-events-none z-20">
                    <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 tracking-widest uppercase">Total Belanja</span>
                    <span className="text-xs md:text-sm font-black text-slate-800 dark:text-white mt-0.5 tabular-nums whitespace-nowrap">
                      Rp {currentMonthExpenses.toLocaleString('id-ID')}
                    </span>
                  </div>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={currentMonthExpenses > 0 ? [
                          { name: 'Investasi', value: pctInvest, fill: '#8b5cf6' },
                          { name: 'Kebutuhan Pokok', value: pctPokok, fill: '#3b82f6' },
                          { name: 'Gaya Hidup', value: pctLifestyle, fill: '#10b981' },
                          { name: 'Cicilan/Utang', value: pctUtang, fill: '#f43f5e' }
                        ].filter(i => i.value > 0) : [
                          { name: 'Belum Ada Transaksi', value: 100, fill: 'rgba(128,128,128,0.1)' }
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius={70}
                        outerRadius={82}
                        paddingAngle={currentMonthExpenses > 0 ? 3 : 0}
                        dataKey="value"
                        stroke="none"
                      >
                        {currentMonthExpenses > 0 ? (
                          [
                            { name: 'Investasi', value: pctInvest, fill: '#8b5cf6' },
                            { name: 'Kebutuhan Pokok', value: pctPokok, fill: '#3b82f6' },
                            { name: 'Gaya Hidup', value: pctLifestyle, fill: '#10b981' },
                            { name: 'Cicilan/Utang', value: pctUtang, fill: '#f43f5e' }
                          ].filter(i => i.value > 0).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))
                        ) : (
                          <Cell key="cell-empty" fill="rgba(128,128,128,0.1)" />
                        )}
                      </Pie>
                      {currentMonthExpenses > 0 && (
                        <Tooltip formatter={(value) => `${value}%`} contentStyle={{ borderRadius: '8px', border: 'none', backgroundColor: '#191c1e', color: '#fff' }} />
                      )}
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                
                <div className="flex-1 space-y-3 w-full">
                  {currentMonthExpenses > 0 ? (
                    [
                      { name: 'Investasi', val: pctInvest, amount: currentMonthExpenses * (pctInvest / 100), color: '#8b5cf6' },
                      { name: 'Kebutuhan Pokok', val: pctPokok, amount: currentMonthExpenses * (pctPokok / 100), color: '#3b82f6' },
                      { name: 'Gaya Hidup', val: pctLifestyle, amount: currentMonthExpenses * (pctLifestyle / 100), color: '#10b981' },
                      { name: 'Cicilan/Utang', val: pctUtang, amount: currentMonthExpenses * (pctUtang / 100), color: '#f43f5e' },
                    ]
                      .filter(item => item.val > 0)
                      .map((item, i) => (
                        <div 
                          key={i} 
                          className="p-3 bg-white/40 dark:bg-white/[0.02] backdrop-blur-md border border-white/20 dark:border-white/5 rounded-2xl flex flex-col gap-1.5 hover:bg-white/60 dark:hover:bg-white/[0.05] transition-all group"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 group-hover:text-primary dark:group-hover:text-white transition-colors">{item.name}</span>
                            </div>
                            <div className="flex items-center justify-between gap-2 shrink-0">
                              <span className="text-[9px] font-black text-slate-800 dark:text-white bg-slate-200/50 dark:bg-white/10 px-2 py-0.5 rounded-full">{item.val}%</span>
                              <span className="text-xs font-black tabular-nums text-slate-800 dark:text-white whitespace-nowrap">Rp {Math.round(item.amount).toLocaleString('id-ID')}</span>
                            </div>
                          </div>
                          <div className="w-full h-1 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
                            <div 
                              className="h-full rounded-full transition-all duration-500" 
                              style={{ width: `${item.val}%`, backgroundColor: item.color }}
                            />
                          </div>
                        </div>
                      ))
                  ) : (
                    <div className="p-5 bg-white/40 dark:bg-white/[0.02] backdrop-blur-md border border-white/10 dark:border-white/5 rounded-2xl flex flex-col items-center justify-center text-center py-8">
                      <span className="material-symbols-outlined text-4xl text-outline mb-2">payments</span>
                      <p className="text-xs text-on-surface-variant dark:text-outline font-bold">Tidak ada pengeluaran</p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 max-w-[200px] leading-relaxed">Belum ada transaksi pengeluaran yang tercatat untuk periode ini.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Insights Cards Grid */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
            
            {/* FIRE Predictor Insight */}
            <div 
              onClick={() => setIsFIREModalOpen(true)}
              className="bg-primary-container dark:bg-gradient-to-br dark:from-[#001b3c] dark:to-[#002f5e] text-white p-4 sm:p-5 lg:p-6 rounded-2xl lg:rounded-[24px] relative overflow-hidden group shadow-md flex flex-col justify-between cursor-pointer hover:scale-[1.02] transition-transform"
            >
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-4">
                  <span className="material-symbols-outlined text-tertiary-fixed-dim dark:text-tertiary-fixed text-3xl group-hover:rotate-12 transition-transform">local_fire_department</span>
                  <div className="bg-white/20 px-2 py-1 rounded text-[10px] font-bold tracking-widest uppercase flex items-center gap-1">
                    FIRE Predictor <span className="material-symbols-outlined text-[10px]">open_in_new</span>
                  </div>
                </div>
                <h4 className="font-headline font-bold mb-1 text-lg">Kebebasan Finansial</h4>
                {yearsToFIRE === 0 ? (
                  <p className="text-2xl font-extrabold text-white mt-2">Tercapai! 🎉</p>
                ) : yearsToFIRE === 999 ? (
                  <p className="text-xl font-extrabold text-white mt-2">Belum Tersedia</p>
                ) : (
                  <div className="mt-2">
                    <p className="text-3xl font-extrabold text-white tabular-nums">{yearsToFIRE.toFixed(1)} <span className="text-lg font-medium opacity-80">Tahun Lagi</span></p>
                    <p className="text-xs text-primary-fixed dark:text-slate-300 mt-2 opacity-90">
                      Jika menabung <strong className="text-white">{savingsRate}%</strong> dari pendapatan Anda terus menerus.
                    </p>
                  </div>
                )}
              </div>
              <div className="absolute -right-4 -bottom-4 opacity-10 blur-[2px] pointer-events-none group-hover:scale-110 transition-transform duration-700">
                <span className="material-symbols-outlined text-9xl">landscape</span>
              </div>
            </div>

            {/* Emergency Goal Insight */}
            <div 
              onClick={() => setIsEmergencyModalOpen(true)}
              className="bg-surface-container-low dark:bg-white/5 dark:border dark:border-white/10 p-4 sm:p-5 lg:p-6 rounded-2xl lg:rounded-[24px] border border-outline-variant/10 flex flex-col justify-between cursor-pointer hover:shadow-md transition-shadow relative"
            >
              <div className="absolute top-4 right-4 bg-primary/10 dark:bg-white/20 text-primary dark:text-white px-2 py-1 rounded text-[8px] font-bold tracking-widest uppercase flex items-center gap-1">
                SIMULATOR <span className="material-symbols-outlined text-[10px]">open_in_new</span>
              </div>
              <div>
                <span className="material-symbols-outlined text-primary dark:text-[#a7c8ff] mb-4 text-2xl">savings</span>
                <h4 className="font-headline font-bold mb-2 text-on-surface dark:text-white">Target Dana Darurat</h4>
                <div className="mb-2 flex justify-between items-end mt-4">
                  <span className="text-[10px] text-outline font-bold tracking-widest">PROGRESS</span>
                  <span className="text-xl font-extrabold tabular-nums dark:text-white text-primary">{emergencyProgress}%</span>
                </div>
                <div className="h-2 w-full bg-surface-container-high dark:bg-white/10 rounded-full overflow-hidden mt-1">
                  <div className="h-full bg-primary dark:bg-[#a7c8ff] rounded-full shadow-inner" style={{ width: `${emergencyProgress}%` }}></div>
                </div>
              </div>
              <p className="text-[10px] mt-4 font-bold text-outline flex justify-between">
                <span>Rp {emergencyCurrent.toLocaleString('id-ID')}</span>
                <span>Rp {emergencyTarget.toLocaleString('id-ID')}</span>
              </p>
            </div>

            {/* Zakat Maal Calculator */}
            <div
              onClick={() => setIsZakatModalOpen(true)}
              className="bg-surface-container-low dark:bg-white/5 dark:border dark:border-white/10 p-4 sm:p-5 lg:p-6 rounded-2xl lg:rounded-[24px] border border-outline-variant/10 flex flex-col justify-between cursor-pointer hover:shadow-md transition-shadow relative"
            >
              <div className="absolute top-4 right-4 bg-emerald-500/10 text-emerald-700 dark:bg-white/20 dark:text-white px-2 py-1 rounded text-[8px] font-bold tracking-widest uppercase flex items-center gap-1">
                KALKULATOR <span className="material-symbols-outlined text-[10px]">open_in_new</span>
              </div>
              <div>
                <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400 mb-4 text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>volunteer_activism</span>
                <h4 className="font-headline font-bold mb-2 text-on-surface dark:text-white">Zakat Maal</h4>
                {zakatEstimate.wajib ? (
                  <>
                    <p className="text-[10px] text-outline font-bold tracking-widest mt-4">ESTIMASI ZAKAT / HAUL</p>
                    <p className="text-xl font-extrabold tabular-nums text-emerald-600 dark:text-emerald-400 mt-1">Rp {Math.round(zakatEstimate.zakat).toLocaleString('id-ID')}</p>
                  </>
                ) : zakatEstimate.zakatable > 0 ? (
                  <>
                    <p className="text-[10px] text-outline font-bold tracking-widest mt-4">STATUS NISAB</p>
                    <p className="text-sm font-extrabold text-on-surface dark:text-white mt-1">Belum mencapai nisab</p>
                  </>
                ) : (
                  <>
                    <p className="text-[10px] text-outline font-bold tracking-widest mt-4">HITUNG ZAKAT</p>
                    <p className="text-sm font-extrabold text-on-surface dark:text-white mt-1">Dari harta Anda</p>
                  </>
                )}
              </div>
              <p className="text-[10px] mt-4 font-bold text-outline flex items-center gap-1">
                <span className="material-symbols-outlined text-[12px]">{zakatEstimate.wajib ? 'check_circle' : 'savings'}</span>
                {zakatEstimate.wajib ? 'Mencapai nisab · 2,5%' : `Nisab Rp ${Math.round(zakatEstimate.nisab).toLocaleString('id-ID')}`}
              </p>
            </div>

            {/* Debt Freedom Projection */}
            <div 
              onClick={() => setIsDebtModalOpen(true)}
              className="bg-surface-container-low dark:bg-white/5 dark:border dark:border-white/10 p-4 sm:p-5 lg:p-6 rounded-2xl lg:rounded-[24px] border border-outline-variant/10 flex flex-col justify-between cursor-pointer hover:shadow-md transition-shadow relative"
            >
              <div className="absolute top-4 right-4 bg-green-500/10 text-green-700 dark:bg-white/20 dark:text-white px-2 py-1 rounded text-[8px] font-bold tracking-widest uppercase flex items-center gap-1">
                SIMULATOR <span className="material-symbols-outlined text-[10px]">open_in_new</span>
              </div>
              <div>
                <div className="flex justify-between items-start mb-4">
                  <span className="material-symbols-outlined text-green-600 dark:text-green-400 text-3xl">task_alt</span>
                </div>
                <h4 className="font-headline font-bold mb-1 text-on-surface dark:text-white">Bebas Utang Pada</h4>
                {totalDebts <= 0 ? (
                  <p className="text-2xl font-extrabold text-green-600 dark:text-green-400 mt-2">Bebas Utang! 🎊</p>
                ) : monthsToDebtFree === 999 ? (
                  <p className="text-xl font-extrabold text-error mt-2">Risiko Gagal Bayar</p>
                ) : (
                  <div className="mt-2">
                    <p className="text-2xl font-extrabold text-on-surface dark:text-white tabular-nums">
                      {debtFreeDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
                    </p>
                    <p className="text-xs text-on-surface-variant dark:text-outline mt-2 leading-relaxed">
                      Lakukan pembayaran ekstra minimal <strong className="text-primary dark:text-[#a7c8ff]">Rp {extraDebtPayment.toLocaleString('id-ID')}</strong>/bulan untuk mencapai target ini.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* --- NEW: FINANCIAL HEALTH SCORECARD --- */}
          <div className="mt-8">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-extrabold font-headline text-lg text-on-surface dark:text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-primary dark:text-[#a7c8ff]">health_and_safety</span>
                Financial Health Scorecard
              </h3>
            </div>
            <section className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
              
              {/* DTI Ratio */}
              <div 
                onClick={() => setRatioModalConfig({ isOpen: true, type: 'DTI' })}
                className="bg-surface-container-lowest dark:bg-black/20 p-4 sm:p-5 lg:p-6 rounded-2xl lg:rounded-[24px] border border-outline-variant/20 dark:border-white/5 flex flex-col justify-between hover:shadow-md transition-shadow cursor-pointer relative"
              >
                <div className="absolute top-4 right-4 bg-outline-variant/20 dark:bg-white/10 text-on-surface-variant dark:text-white px-2 py-1 rounded text-[8px] font-bold tracking-widest uppercase flex items-center gap-1">
                  SIMULATOR <span className="material-symbols-outlined text-[10px]">open_in_new</span>
                </div>
                <div>
                  <div className="flex justify-between items-start mb-4 pr-24">
                    <span className="material-symbols-outlined text-outline dark:text-slate-500 text-3xl">account_balance</span>
                    <div className={`px-2 py-1 rounded text-[10px] font-bold tracking-widest uppercase ${dtiRatio < 35 ? 'bg-green-500/10 text-green-600 dark:text-green-400' : dtiRatio < 50 ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400' : 'bg-red-500/10 text-red-600 dark:text-red-400'}`}>
                      {dtiRatio < 35 ? 'Sehat' : dtiRatio < 50 ? 'Hati-hati' : 'Berisiko'}
                    </div>
                  </div>
                  <h4 className="font-headline font-bold mb-1 text-sm text-on-surface-variant dark:text-slate-400">Debt-to-Income (DTI)</h4>
                  <div className="mt-2 flex items-baseline gap-1">
                    <p className={`text-3xl font-extrabold tabular-nums ${dtiRatio < 35 ? 'text-on-surface dark:text-white' : dtiRatio < 50 ? 'text-orange-600 dark:text-orange-400' : 'text-error dark:text-[#ffb4ab]'}`}>
                      {dtiRatio.toFixed(1)}%
                    </p>
                  </div>
                  <p className="text-xs text-on-surface-variant dark:text-slate-500 mt-2 leading-relaxed">
                    Beban cicilan utang bulanan terhadap total pendapatan. Standar bank max 35%.
                  </p>
                </div>
              </div>

              {/* Liquidity Ratio */}
              <div 
                onClick={() => setRatioModalConfig({ isOpen: true, type: 'LIQUIDITY' })}
                className="bg-surface-container-lowest dark:bg-black/20 p-4 sm:p-5 lg:p-6 rounded-2xl lg:rounded-[24px] border border-outline-variant/20 dark:border-white/5 flex flex-col justify-between hover:shadow-md transition-shadow cursor-pointer relative"
              >
                <div className="absolute top-4 right-4 bg-outline-variant/20 dark:bg-white/10 text-on-surface-variant dark:text-white px-2 py-1 rounded text-[8px] font-bold tracking-widest uppercase flex items-center gap-1">
                  SIMULATOR <span className="material-symbols-outlined text-[10px]">open_in_new</span>
                </div>
                <div>
                  <div className="flex justify-between items-start mb-4 pr-24">
                    <span className="material-symbols-outlined text-outline dark:text-slate-500 text-3xl">water_drop</span>
                    <div className={`px-2 py-1 rounded text-[10px] font-bold tracking-widest uppercase ${liquidityRatio >= 6 ? 'bg-green-500/10 text-green-600 dark:text-green-400' : liquidityRatio >= 3 ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400' : 'bg-red-500/10 text-red-600 dark:text-red-400'}`}>
                      {liquidityRatio >= 6 ? 'Sangat Aman' : liquidityRatio >= 3 ? 'Cukup' : 'Rentan'}
                    </div>
                  </div>
                  <h4 className="font-headline font-bold mb-1 text-sm text-on-surface-variant dark:text-slate-400">Rasio Likuiditas Kas</h4>
                  <div className="mt-2 flex items-baseline gap-1">
                    <p className={`text-3xl font-extrabold tabular-nums ${liquidityRatio >= 3 ? 'text-on-surface dark:text-white' : 'text-error dark:text-[#ffb4ab]'}`}>
                      {liquidityRatio.toFixed(1)}
                    </p>
                    <span className="text-sm font-medium text-on-surface-variant dark:text-slate-500">Bulan</span>
                  </div>
                  <p className="text-xs text-on-surface-variant dark:text-slate-500 mt-2 leading-relaxed">
                    Berapa lama aset cair menutupi pengeluaran tanpa pemasukan. Target aman 6+ bulan.
                  </p>
                </div>
              </div>

              {/* Debt-to-Asset Ratio */}
              <div 
                onClick={() => setRatioModalConfig({ isOpen: true, type: 'SOLVENCY' })}
                className="bg-surface-container-lowest dark:bg-black/20 p-4 sm:p-5 lg:p-6 rounded-2xl lg:rounded-[24px] border border-outline-variant/20 dark:border-white/5 flex flex-col justify-between hover:shadow-md transition-shadow cursor-pointer relative"
              >
                <div className="absolute top-4 right-4 bg-outline-variant/20 dark:bg-white/10 text-on-surface-variant dark:text-white px-2 py-1 rounded text-[8px] font-bold tracking-widest uppercase flex items-center gap-1">
                  SIMULATOR <span className="material-symbols-outlined text-[10px]">open_in_new</span>
                </div>
                <div>
                  <div className="flex justify-between items-start mb-4 pr-24">
                    <span className="material-symbols-outlined text-outline dark:text-slate-500 text-3xl">scale</span>
                    <div className={`px-2 py-1 rounded text-[10px] font-bold tracking-widest uppercase ${debtToAssetRatio < 30 ? 'bg-green-500/10 text-green-600 dark:text-green-400' : debtToAssetRatio < 50 ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400' : 'bg-red-500/10 text-red-600 dark:text-red-400'}`}>
                      {debtToAssetRatio < 30 ? 'Kuat' : debtToAssetRatio < 50 ? 'Wajar' : 'Berbahaya'}
                    </div>
                  </div>
                  <h4 className="font-headline font-bold mb-1 text-sm text-on-surface-variant dark:text-slate-400">Rasio Solvabilitas</h4>
                  <div className="mt-2 flex items-baseline gap-1">
                    <p className={`text-3xl font-extrabold tabular-nums ${debtToAssetRatio < 50 ? 'text-on-surface dark:text-white' : 'text-error dark:text-[#ffb4ab]'}`}>
                      {debtToAssetRatio.toFixed(1)}%
                    </p>
                  </div>
                  <p className="text-xs text-on-surface-variant dark:text-slate-500 mt-2 leading-relaxed">
                    Persentase aset yang dibiayai oleh utang (Debt-to-Asset). Idealnya selalu di bawah 50%.
                  </p>
                </div>
              </div>

            </section>
          </div>

        </div>
      )}

      {activeSubTab === 'diversification' && (
        <div className="animate-in slide-in-from-right-4 duration-500">
           <FinancePortfolioReport onShowCTA={onShowCTA} onNavigate={onNavigate} hideHeader selectedPeriod={selectedPeriod} />
        </div>
      )}

      {activeSubTab === 'sector' && (
        <div className="animate-in slide-in-from-right-4 duration-500">
          <FinancePerformanceReport onShowCTA={onShowCTA} onNavigate={onNavigate} hideHeader selectedPeriod={selectedPeriod} />
        </div>
      )}

      {/* FIRE Calculator Modal */}
      <FinanceFIRECalculatorModal 
        isOpen={isFIREModalOpen} 
        onClose={() => setIsFIREModalOpen(false)} 
        initialNetWorth={netWorth}
        initialMonthlyExpense={currentMonthExpenses}
        initialMonthlySavings={currentSavings}
      />

      <FinanceEmergencyModal
        isOpen={isEmergencyModalOpen}
        onClose={() => setIsEmergencyModalOpen(false)}
        currentCash={totalCash}
        monthlyExpenses={avgMonthlyExpenses}
      />

      <FinanceZakatModal
        isOpen={isZakatModalOpen}
        onClose={() => setIsZakatModalOpen(false)}
      />

      <FinanceDebtFreedomModal
        isOpen={isDebtModalOpen}
        onClose={() => setIsDebtModalOpen(false)}
        totalDebts={totalDebts}
        totalMinPayment={totalMinPayment}
        currentSavings={currentSavings}
      />

      <FinanceRatioSimulatorModal
        isOpen={ratioModalConfig.isOpen}
        onClose={() => setRatioModalConfig(prev => ({ ...prev, isOpen: false }))}
        ratioType={ratioModalConfig.type}
        initialIncome={currentMonthIncome}
        initialDebtPayment={totalMinPayment}
        initialCash={totalCash}
        initialExpenses={avgMonthlyExpenses}
        initialAssets={totalAssets}
        initialLiabilities={totalDebts}
      />

      <ScenarioPlannerModal isOpen={isScenarioOpen} onClose={() => setIsScenarioOpen(false)} />
    </div>
  );
};

export default FinanceAnalytics;
