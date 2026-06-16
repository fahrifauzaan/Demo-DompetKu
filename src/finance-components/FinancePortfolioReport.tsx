import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { FeatureCTA } from './MarketingCTAModal';
import { useFinanceStore } from '../store/useFinanceStore';

interface FinancePortfolioReportProps {
  onShowCTA: (feature?: FeatureCTA) => void;
  onNavigate?: (tab: string) => void;
  hideHeader?: boolean;
  selectedPeriod?: string;
}

const getMonthsBetween = (startDateStr: string | undefined, maturityDateStr: string | undefined, totalTenorMonths: number) => {
  if (!startDateStr) return 0;
  try {
    const start = new Date(startDateStr);
    const now = new Date();
    if (start > now) return 0;
    
    let end = now;
    if (maturityDateStr) {
      const maturity = new Date(maturityDateStr);
      if (maturity < now) {
        end = maturity;
      }
    }
    
    const diffYears = end.getFullYear() - start.getFullYear();
    const diffMonths = (end.getMonth() - start.getMonth()) + (diffYears * 12);
    
    return Math.max(0, Math.min(totalTenorMonths, diffMonths));
  } catch (e) {
    return 0;
  }
};

const getPeriodStartAndEnd = (period: string) => {
  const now = new Date();
  const curYear = now.getFullYear();
  const curMonth = now.getMonth();

  let start: Date;
  let end: Date = now;

  if (period === 'this_month') {
    start = new Date(curYear, curMonth, 1);
  } else if (period === '3_months') {
    start = new Date(curYear, curMonth - 2, 1);
  } else if (period === '12_months') {
    start = new Date(curYear, curMonth - 11, 1);
  } else if (period === 'ytd') {
    start = new Date(curYear, 0, 1);
  } else if (period.includes('-')) {
    const parts = period.split('-');
    const year = parseInt(parts[0]);
    const month = parseInt(parts[1]) - 1;
    start = new Date(year, month, 1);
    end = new Date(year, month + 1, 0, 23, 59, 59, 999);
  } else {
    start = new Date(curYear, curMonth, 1);
  }
  return { start, end };
};

const getPeriodMonthsBetween = (
  startDateStr: string | undefined,
  maturityDateStr: string | undefined,
  totalTenorMonths: number,
  periodStart: Date,
  periodEnd: Date
) => {
  if (!startDateStr) return 0;
  try {
    const earnStart = new Date(startDateStr);
    let earnEnd = new Date();
    if (maturityDateStr) {
      const maturity = new Date(maturityDateStr);
      if (maturity < earnEnd) {
        earnEnd = maturity;
      }
    }

    // Intersection
    const overlapStart = earnStart > periodStart ? earnStart : periodStart;
    const overlapEnd = earnEnd < periodEnd ? earnEnd : periodEnd;

    if (overlapStart >= overlapEnd) return 0;

    const dayDiff = (overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60 * 24);
    const months = dayDiff / 30.44;

    return Math.max(0, Math.min(totalTenorMonths, parseFloat(months.toFixed(2))));
  } catch (e) {
    return 0;
  }
};



const FinancePortfolioReport: React.FC<FinancePortfolioReportProps> = ({ onShowCTA, hideHeader, selectedPeriod = 'this_month' }) => {
  const accounts = useFinanceStore((state) => state.accounts);
  const assets = useFinanceStore((state) => state.assets);

  const { start: periodStart, end: periodEnd } = getPeriodStartAndEnd(selectedPeriod);

  const [activePointIndex, setActivePointIndex] = useState<number | null>(null);
  const [timeframe, setTimeframe] = useState<'monthly' | 'yearly'>('monthly');

  // Filter out fully liquidated assets (both purchasePrice and currentValue are 0)
  const portfolioItems = assets
    .filter(a => a.category === 'investasi' && (a.purchasePrice > 0 || a.currentValue > 0))
    .map(a => {
      const titleLower = (a.title || '').toLowerCase();
      let subType = a.subType || '';
      if (!subType) {
        if (titleLower.includes('st012') || titleLower.includes('sbn') || titleLower.includes('sukuk') || titleLower.includes('obligasi') || titleLower.includes('ori') || titleLower.includes('deposito') || titleLower.includes('p2p')) {
          subType = 'sbn';
        } else if (titleLower.includes('reksadana') || titleLower.includes('mutual fund') || titleLower.includes('kolektif') || titleLower.includes('schroder') || titleLower.includes('indeks')) {
          subType = 'reksadana';
        } else {
          subType = 'saham';
        }
      }
      return {
        ...a,
        ticker: a.ticker || a.title.split(' ')[0] || 'ASSET',
        shares: a.shares || 1,
        avgCost: a.avgCost || a.purchasePrice || a.currentValue,
        subType
      };
    });

  const portfolioItemsWithLive = portfolioItems.map(item => {
    const ticker = item.ticker || '';
    const initial = item.purchasePrice || item.currentValue;
    
    const isFixedIncome = item.subType === 'sbn' || item.subType === 'deposito' || item.subType === 'p2p' || (item.title || '').includes('ST012');
    
    // Standard CFA valuation: SBN held to maturity is capital-guaranteed. If current value is 0, default to principal.
    let marketValue = item.currentValue;
    if (isFixedIncome && marketValue === 0 && initial > 0) {
      marketValue = initial;
    }

    let pl = marketValue - initial;
    let percentChange = initial > 0 ? (pl / initial) * 100 : 0;
    let couponsReceived = 0;

    if (isFixedIncome && initial > 0) {
      const principal = initial;
      // @ts-ignore
      const couponRate = item.interestRate || (item.subType === 'deposito' ? 4.5 : item.subType === 'p2p' ? 12.0 : 6.4);
      // @ts-ignore
      const taxRate = item.tax !== undefined ? item.tax : (item.subType === 'deposito' ? 0.20 : item.subType === 'p2p' ? 0.15 : 0.10);
      const yearlyGross = principal * (couponRate / 100);
      const yearlyNet = yearlyGross * (1 - taxRate);
      const monthlyNet = Math.round(yearlyNet / 12);
      // @ts-ignore
      const totalTenorMonths = item.tenor !== undefined ? (item.subType === 'sbn' ? item.tenor * 12 : item.tenor) : (item.subType === 'sbn' ? 24 : 12);
      
      // Calculate accrued coupons earned within the selected period range
      const elapsedMonths = getPeriodMonthsBetween(item.purchaseDate, item.maturityDate, totalTenorMonths, periodStart, periodEnd);
      couponsReceived = Math.round(monthlyNet * elapsedMonths);
      
      // CFA Total Return = Capital Gain/Loss + Interest/Coupon Income
      pl = (marketValue - initial) + couponsReceived;
      percentChange = (pl / initial) * 100;
    }
    
    let color = 'bg-blue-500';
    if (item.subType === 'reksadana') color = 'bg-orange-500';
    else if (item.subType === 'sbn') color = 'bg-amber-500';
    else if (item.subType === 'deposito') color = 'bg-yellow-500';
    else if (ticker === 'AAPL') color = 'bg-slate-400';
    else if (ticker === 'TSLA') color = 'bg-red-500';
    else if (ticker === 'BUMI') color = 'bg-blue-600';
    else if (ticker === 'BRMS') color = 'bg-green-500';

    return {
      ...item,
      symbol: ticker,
      name: item.title,
      initial,
      marketValue,
      percentChange,
      color,
      flash: null,
      isFixedIncome,
      couponsReceived,
      pl
    };
  });

  // 6 Asset Classes calculation according to CFP guidelines
  const cashAccounts = accounts.filter(a => a.type !== 'investment');
  const investmentAccounts = accounts.filter(a => a.type === 'investment');
  
  let totalCashFromAccounts = cashAccounts.reduce((sum, a) => sum + a.balance, 0);
  let totalCryptoFromAccounts = 0;
  let totalEquitiesFromAccounts = 0;
  
  investmentAccounts.forEach(a => {
    const nameLower = a.name.toLowerCase();
    if (nameLower.includes('kripto') || nameLower.includes('crypto') || nameLower.includes('btc') || nameLower.includes('eth') || nameLower.includes('binance') || nameLower.includes('indodax')) {
      totalCryptoFromAccounts += a.balance;
    } else {
      totalEquitiesFromAccounts += a.balance;
    }
  });

  // Calculate portfolio items classification
  let totalFixedIncomeClass = 0;
  let totalEquitiesClass = totalEquitiesFromAccounts;
  let totalCryptoClass = totalCryptoFromAccounts;
  let cashAssetsVal = 0;

  portfolioItemsWithLive.forEach(item => {
    const subType = item.subType || '';
    const title = item.title || '';
    const val = item.marketValue;
    
    if (subType === 'deposito') {
      cashAssetsVal += val;
    } else if (subType === 'sbn' || subType === 'obligasi' || subType === 'p2p' || title.includes('ST012')) {
      totalFixedIncomeClass += val;
    } else if (subType === 'saham' || subType === 'reksadana') {
      totalEquitiesClass += val;
    } else if (subType === 'kripto') {
      totalCryptoClass += val;
    } else {
      totalEquitiesClass += val;
    }
  });

  const totalCashClass = totalCashFromAccounts + cashAssetsVal;
  const totalRealEstateClass = assets.filter(a => a.category === 'real-estat').reduce((sum, a) => sum + a.currentValue, 0);
  const totalOthersClass = assets.filter(a => a.category === 'kendaraan' || a.category === 'koleksi').reduce((sum, a) => sum + a.currentValue, 0);

  const grandTotal = totalCashClass + totalFixedIncomeClass + totalEquitiesClass + totalCryptoClass + totalRealEstateClass + totalOthersClass || 1;

  // For the main 3-group Treemap diagram
  const totalInvestments = totalFixedIncomeClass + totalEquitiesClass + totalCryptoClass;
  const totalCash = totalCashClass;
  const totalPhysical = totalRealEstateClass + totalOthersClass;

  const pctInvest = Math.round((totalInvestments / grandTotal) * 100);
  const pctCash = Math.round((totalCash / grandTotal) * 100);
  const pctPhysical = Math.max(0, 100 - pctInvest - pctCash);

  // 1. Herfindahl-Hirschman Index (HHI) for Diversification Score
  const wCash = totalCashClass / grandTotal;
  const wFixed = totalFixedIncomeClass / grandTotal;
  const wEquities = totalEquitiesClass / grandTotal;
  const wCrypto = totalCryptoClass / grandTotal;
  const wRealEstate = totalRealEstateClass / grandTotal;
  const wOthers = totalOthersClass / grandTotal;

  const hhi = (wCash*wCash) + (wFixed*wFixed) + (wEquities*wEquities) + (wCrypto*wCrypto) + (wRealEstate*wRealEstate) + (wOthers*wOthers);
  // Diversification score from 1.0 to 10.0
  const divScore = Math.max(1, Math.min(10, parseFloat((10 * (1 - (hhi - 0.167) / (1 - 0.167))).toFixed(1))));
  
  let divRating = '';
  if (divScore >= 8.0) divRating = 'Sangat Baik';
  else if (divScore >= 6.0) divRating = 'Baik';
  else if (divScore >= 4.0) divRating = 'Moderat';
  else divRating = 'Kurang';

  // 2. Highest Sector/Asset Concentration Calculation
  const classValues = [
    { name: 'Kas & Setara Kas', val: totalCashClass },
    { name: 'Pendapatan Tetap', val: totalFixedIncomeClass },
    { name: 'Saham & Reksa Dana', val: totalEquitiesClass },
    { name: 'Aset Kripto', val: totalCryptoClass },
    { name: 'Properti & Real Estate', val: totalRealEstateClass },
    { name: 'Aset Fisik & Alternatif', val: totalOthersClass }
  ];
  
  // Sort classes by value descending
  const sortedClasses = [...classValues].sort((a, b) => b.val - a.val);
  const maxClass = sortedClasses[0];
  const maxClassPct = Math.round((maxClass.val / grandTotal) * 100);
  
  let concentrationRating = '';
  if (maxClassPct > 50) concentrationRating = 'Tinggi';
  else if (maxClassPct >= 25) concentrationRating = 'Sedang';
  else concentrationRating = 'Rendah';

  // 3. Dynamic Risk Score Calculation
  const weightedRisk = (totalCashClass * 1.0 + totalFixedIncomeClass * 2.0 + (totalRealEstateClass + totalOthersClass) * 3.0 + totalEquitiesClass * 4.0 + totalCryptoClass * 5.0) / grandTotal;
  
  let riskProfileName = '';
  let riskProfileDesc = '';
  if (weightedRisk < 1.8) {
    riskProfileName = 'Konservatif';
    riskProfileDesc = 'Portofolio Anda didominasi oleh kas dan setara kas. Sangat stabil terhadap gejolak pasar, namun memiliki pertumbuhan rendah yang rentan terhadap gerusan inflasi jangka panjang.';
  } else if (weightedRisk < 2.6) {
    riskProfileName = 'Moderat Konservatif';
    riskProfileDesc = 'Alokasi portofolio Anda condong ke arah perlindungan modal dengan porsi kas dan pendapatan tetap yang cukup tebal, disertai sedikit eksposur pada aset pertumbuhan.';
  } else if (weightedRisk < 3.4) {
    riskProfileName = 'Moderat';
    riskProfileDesc = 'Portofolio Anda seimbang antara instrumen likuiditas, properti riil, dan aset pertumbuhan. Memberikan apresiasi nilai jangka panjang yang stabil dengan tingkat risiko terukur.';
  } else if (weightedRisk < 4.2) {
    riskProfileName = 'Moderat Agresif';
    riskProfileDesc = 'Portofolio Anda didominasi oleh instrumen investasi pertumbuhan seperti ekuitas saham dan reksa dana. Sangat baik untuk akumulasi kekayaan jangka menengah-panjang dengan volatilitas sedang.';
  } else {
    riskProfileName = 'Agresif';
    riskProfileDesc = 'Portofolio Anda sangat agresif dengan porsi ekuitas tinggi atau alokasi aset digital yang signifikan. Potensi imbal hasil eksponensial dengan konsekuensi siap menghadapi fluktuasi pasar yang tajam.';
  }

  // 4. Dynamic Rebalancing Recommendations
  // Standard liquid targets based on Risk Profile
  let targetCash = 20;
  let targetFixed = 30;
  let targetEquities = 45;
  let targetCrypto = 5;

  if (riskProfileName === 'Konservatif') {
    targetCash = 50; targetFixed = 40; targetEquities = 10; targetCrypto = 0;
  } else if (riskProfileName === 'Moderat Konservatif') {
    targetCash = 35; targetFixed = 45; targetEquities = 20; targetCrypto = 0;
  } else if (riskProfileName === 'Moderat') {
    targetCash = 20; targetFixed = 30; targetEquities = 45; targetCrypto = 5;
  } else if (riskProfileName === 'Moderat Agresif') {
    targetCash = 15; targetFixed = 20; targetEquities = 60; targetCrypto = 5;
  } else if (riskProfileName === 'Agresif') {
    targetCash = 5; targetFixed = 15; targetEquities = 70; targetCrypto = 10;
  }

  const liquidTotal = totalCashClass + totalFixedIncomeClass + totalEquitiesClass + totalCryptoClass || 1;
  const wCashLiquid = totalCashClass / liquidTotal;
  const wFixedLiquid = totalFixedIncomeClass / liquidTotal;
  const wEquitiesLiquid = totalEquitiesClass / liquidTotal;
  const wCryptoLiquid = totalCryptoClass / liquidTotal;

  const diffCash = Math.round((wCashLiquid * 100) - targetCash);
  const diffFixed = Math.round((wFixedLiquid * 100) - targetFixed);
  const diffEquities = Math.round((wEquitiesLiquid * 100) - targetEquities);
  const diffCrypto = Math.round((wCryptoLiquid * 100) - targetCrypto);

  const rawRecs = [];
  if (Math.abs(diffCash) >= 2) {
    rawRecs.push({
      act: diffCash > 0 ? 'Alokasikan surplus kas ke instrumen investasi produktif' : 'Tingkatkan cadangan kas untuk memperkuat likuiditas',
      dir: diffCash > 0 ? 'Kurangi' : 'Tambah',
      target: `${diffCash > 0 ? '-' : '+'}${Math.abs(diffCash)}.0%`,
      color: diffCash > 0 ? 'text-rose-400 dark:text-rose-300' : 'text-emerald-400 dark:text-emerald-300',
      absVal: Math.abs(diffCash)
    });
  }
  if (Math.abs(diffFixed) >= 2) {
    rawRecs.push({
      act: diffFixed > 0 ? 'Kurangi porsi obligasi untuk realokasi aset pertumbuhan' : 'Tambah porsi obligasi/SBN untuk pendapatan pasif stabil',
      dir: diffFixed > 0 ? 'Kurangi' : 'Tambah',
      target: `${diffFixed > 0 ? '-' : '+'}${Math.abs(diffFixed)}.0%`,
      color: diffFixed > 0 ? 'text-rose-400 dark:text-rose-300' : 'text-emerald-400 dark:text-emerald-300',
      absVal: Math.abs(diffFixed)
    });
  }
  if (Math.abs(diffEquities) >= 2) {
    rawRecs.push({
      act: diffEquities > 0 ? 'Kurangi eksposur saham/reksadana untuk amankan profit' : 'Akumulasi saham/reksadana saham untuk pertumbuhan jangka panjang',
      dir: diffEquities > 0 ? 'Kurangi' : 'Tambah',
      target: `${diffEquities > 0 ? '-' : '+'}${Math.abs(diffEquities)}.0%`,
      color: diffEquities > 0 ? 'text-rose-400 dark:text-rose-300' : 'text-emerald-400 dark:text-emerald-300',
      absVal: Math.abs(diffEquities)
    });
  }
  if (Math.abs(diffCrypto) >= 2) {
    rawRecs.push({
      act: diffCrypto > 0 ? 'Ambil untung (TP) kripto untuk kurangi risiko volatilitas' : 'Akumulasi bertahap aset kripto berkapitalisasi besar',
      dir: diffCrypto > 0 ? 'Kurangi' : 'Tambah',
      target: `${diffCrypto > 0 ? '-' : '+'}${Math.abs(diffCrypto)}.0%`,
      color: diffCrypto > 0 ? 'text-rose-400 dark:text-rose-300' : 'text-emerald-400 dark:text-emerald-300',
      absVal: Math.abs(diffCrypto)
    });
  }

  // Sort recommendations by deviation size descending
  const sortedRecs = [...rawRecs].sort((a, b) => b.absVal - a.absVal);
  const finalRecs = sortedRecs.slice(0, 3);
  if (finalRecs.length === 0) {
    finalRecs.push({
      act: 'Alokasi portofolio Anda sudah optimal dan sesuai profil risiko',
      dir: 'Aksi',
      target: '0.0%',
      color: 'text-emerald-400 dark:text-emerald-300',
      absVal: 0
    });
  }

  // Format Helper for Millions/Billions
  const formatM = (val: number) => {
    if (val >= 1e9) {
      return `Rp ${(val / 1e9).toFixed(2)}M`;
    }
    return `Rp ${(val / 1e6).toFixed(1)}Jt`;
  };

  const getDynamicTrend = () => {
    const now = new Date();
    if (selectedPeriod === 'this_month') {
      return Array.from({ length: 4 }).map((_, idx) => {
        const label = `M ${idx + 1}`;
        const factor = idx / 3;
        return {
          label,
          invest: totalInvestments * (0.9 + factor * 0.1),
          cash: totalCash * (0.95 + factor * 0.05),
          physical: totalPhysical * (0.98 + factor * 0.02),
        };
      });
    }
    if (selectedPeriod === '3_months') {
      return Array.from({ length: 3 }).map((_, idx) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (2 - idx), 1);
        const label = d.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' });
        const factor = idx / 2;
        return {
          label,
          invest: totalInvestments * (0.85 + factor * 0.15),
          cash: totalCash * (0.9 + factor * 0.1),
          physical: totalPhysical * (0.97 + factor * 0.03),
        };
      });
    }
    if (selectedPeriod === '12_months') {
      return Array.from({ length: 12 }).map((_, idx) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (11 - idx), 1);
        const label = d.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' });
        const factor = idx / 11;
        return {
          label,
          invest: totalInvestments * (0.8 + factor * 0.2),
          cash: totalCash * (0.9 + factor * 0.1),
          physical: totalPhysical * (0.95 + factor * 0.05),
        };
      });
    }
    if (selectedPeriod === 'ytd') {
      const currentMonthIndex = now.getMonth();
      const length = Math.max(2, currentMonthIndex + 1);
      return Array.from({ length }).map((_, idx) => {
        const d = new Date(now.getFullYear(), idx, 1);
        const label = d.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' });
        const factor = idx / (length - 1);
        return {
          label,
          invest: totalInvestments * (0.75 + factor * 0.25),
          cash: totalCash * (0.85 + factor * 0.15),
          physical: totalPhysical * (0.95 + factor * 0.05),
        };
      });
    }
    if (selectedPeriod.includes('-')) {
      const parts = selectedPeriod.split('-');
      return Array.from({ length: 4 }).map((_, idx) => {
        const label = `M ${idx + 1}`;
        const factor = idx / 3;
        return {
          label,
          invest: totalInvestments * (0.9 + factor * 0.1),
          cash: totalCash * (0.95 + factor * 0.05),
          physical: totalPhysical * (0.98 + factor * 0.02),
        };
      });
    }

    return Array.from({ length: 12 }).map((_, idx) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (11 - idx), 1);
      const label = d.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' });
      const factor = idx / 11;
      return {
        label,
        invest: totalInvestments * (0.8 + factor * 0.2),
        cash: totalCash * (0.9 + factor * 0.1),
        physical: totalPhysical * (0.95 + factor * 0.05),
      };
    });
  };

  const getDynamicYearlyTrend = () => {
    const now = new Date();
    return Array.from({ length: 5 }).map((_, idx) => {
      const label = String(now.getFullYear() - (4 - idx));
      const factor = idx / 4;
      return {
        label,
        invest: totalInvestments * (0.5 + factor * 0.5),
        cash: totalCash * (0.7 + factor * 0.3),
        physical: totalPhysical * (0.8 + factor * 0.2),
      };
    });
  };

  const handleExportCSV = () => {
    const headers = ["Simbol", "Nama Aset", "Modal Awal (IDR)", "Nilai Pasar (IDR)", "Return (%)"];
    const rows = portfolioItemsWithLive.map(item => [
      item.symbol,
      `"${item.name.replace(/"/g, '""')}"`,
      item.initial,
      item.marketValue,
      item.percentChange.toFixed(2)
    ]);

    const csvString = [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${(import.meta.env.VITE_APP_NAME || 'dompetku').toLowerCase()}_portofolio_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const currentData = timeframe === 'monthly' ? getDynamicTrend() : getDynamicYearlyTrend();
  const allValues = currentData.flatMap(d => [d.invest, d.cash, d.physical]);
  const maxVal = Math.max(...allValues, 0.1) * 1.1;

  return (
    <div className="space-y-8 lg:space-y-12 animate-in fade-in duration-500 pb-12">
      
      {/* Header Section */}
      {!hideHeader && (
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl lg:text-3xl font-extrabold font-headline tracking-tight text-primary dark:text-[#a7c8ff] mb-2">Laporan Diversifikasi</h2>
            <p className="text-on-surface-variant dark:text-outline text-sm lg:text-base font-medium">Ringkasan kesehatan portofolio aset Anda per hari ini</p>
          </div>
          <div className="flex flex-wrap gap-3 no-print">
            <button 
              onClick={handleExportCSV}
              className="px-4 py-2 bg-surface-container-low dark:bg-white/5 border border-outline-variant/20 dark:border-white/10 text-primary dark:text-[#a7c8ff] font-semibold rounded-xl flex items-center gap-2 hover:bg-surface-container-high dark:hover:bg-white/10 transition-colors flex-1 md:flex-none justify-center text-sm cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">csv</span> Ekspor (CSV)
            </button>
            <button 
              onClick={() => window.print()}
              className="px-4 py-2 bg-surface-container-low dark:bg-white/5 border border-outline-variant/20 dark:border-white/10 text-primary dark:text-[#a7c8ff] font-semibold rounded-xl flex items-center gap-2 hover:bg-surface-container-high dark:hover:bg-white/10 transition-colors flex-1 md:flex-none justify-center text-sm cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">file_download</span> Cetak (PDF)
            </button>
          </div>
        </header>
      )}

      {/* Top Overview Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Asset Allocation Treemap */}
        <div className="lg:col-span-4 bg-surface-container-lowest dark:bg-transparent border border-outline-variant/10 dark:border-white/10 p-6 lg:p-8 rounded-[24px] flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-headline font-bold text-sm uppercase tracking-widest text-on-surface-variant dark:text-outline">Alokasi Aset Utama</h3>
              <span className="material-symbols-outlined text-primary dark:text-[#a7c8ff] text-xl opacity-50">account_tree</span>
            </div>
            
            <div className="w-full h-52 mb-6 relative flex items-center justify-center">
              <div className="absolute flex flex-col items-center justify-center text-center pointer-events-none z-20">
                <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 tracking-widest uppercase">Total Kekayaan (Saat Ini)</span>
                <span className="text-sm lg:text-base font-black text-slate-800 dark:text-white mt-1 tabular-nums tracking-tight whitespace-nowrap">
                  {formatM(totalCash + totalInvestments + totalPhysical)}
                </span>
              </div>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Investasi Berjalan', value: pctInvest, fill: '#3b82f6' },
                      { name: 'Aset Lancar (Kas)', value: pctCash, fill: '#f97316' },
                      { name: 'Aset Fisik/Tetap', value: pctPhysical, fill: '#64748b' }
                    ].filter(i => i.value > 0)}
                    cx="50%"
                    cy="50%"
                    innerRadius={72}
                    outerRadius={85}
                    paddingAngle={3}
                    cornerRadius={4}
                    dataKey="value"
                    stroke="none"
                  >
                    {
                      [
                        { name: 'Investasi Berjalan', value: pctInvest, fill: '#3b82f6' },
                        { name: 'Aset Lancar (Kas)', value: pctCash, fill: '#f97316' },
                        { name: 'Aset Fisik/Tetap', value: pctPhysical, fill: '#64748b' }
                      ].filter(i => i.value > 0).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))
                    }
                  </Pie>
                  <Tooltip formatter={(value) => `${value}%`} contentStyle={{ borderRadius: '8px', border: 'none', backgroundColor: '#191c1e', color: '#fff' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          <div className="space-y-3 font-semibold">
            <div className="flex items-center justify-between group">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#3b82f6' }}></div>
                <span className="text-xs font-semibold text-on-surface dark:text-slate-300 uppercase tracking-wider group-hover:text-primary transition-colors">Investasi Berjalan</span>
              </div>
              <span className="text-sm font-bold dark:text-white">{pctInvest}%</span>
            </div>
            <div className="flex items-center justify-between group">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#f97316' }}></div>
                <span className="text-xs font-semibold text-on-surface dark:text-slate-300 uppercase tracking-wider group-hover:text-tertiary transition-colors">Aset Lancar (Kas)</span>
              </div>
              <span className="text-sm font-bold dark:text-white">{pctCash}%</span>
            </div>
            <div className="flex items-center justify-between group">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#64748b' }}></div>
                <span className="text-xs font-semibold text-on-surface dark:text-slate-300 uppercase tracking-wider group-hover:text-primary-fixed transition-colors">Aset Fisik/Tetap</span>
              </div>
              <span className="text-sm font-bold dark:text-white">{pctPhysical}%</span>
            </div>
          </div>
        </div>

        {/* Investment Portfolio Details Card */}
        <div className="lg:col-span-8 bg-surface-container-lowest dark:bg-transparent border border-outline-variant/10 dark:border-white/10 p-6 lg:p-8 rounded-[24px] shadow-sm overflow-hidden flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-headline font-bold text-sm uppercase tracking-widest text-on-surface-variant dark:text-outline">Rincian Portofolio Investasi</h3>
            <div className="p-2 bg-green-500/10 text-green-600 dark:text-green-400 text-[10px] font-bold rounded-md flex items-center gap-1 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span> Update Real-time
            </div>
          </div>

          <div className="overflow-x-auto -mx-6 lg:-mx-8">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="text-[10px] font-bold text-on-surface-variant dark:text-slate-500 uppercase tracking-widest border-b border-outline-variant/10 dark:border-white/10">
                  <th className="text-left px-8 py-4">Instrumen</th>
                  <th className="text-right px-8 py-4">Modal Awal</th>
                  <th className="text-right px-8 py-4">Nilai Pasar</th>
                  <th className="text-right px-8 py-4">Return (%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/5 dark:divide-white/5">
                {portfolioItemsWithLive.map((item, idx) => {
                  const percentChange = item.percentChange;
                  const marketValue = item.marketValue;
                  const hasFlash = item.flash;
                  
                  const getSubtypeLabel = (sub: string) => {
                    if (sub === 'sbn') return 'SBN (Obligasi)';
                    if (sub === 'reksadana') return 'Reksa Dana';
                    if (sub === 'saham') return 'Saham';
                    if (sub === 'deposito') return 'Deposito';
                    if (sub === 'p2p') return 'P2P Lending';
                    return sub.toUpperCase();
                  };
                  
                  return (
                    <tr 
                      key={idx} 
                      className={`group hover:bg-surface-container-low dark:hover:bg-white/5 transition-all ${
                        hasFlash === 'up' ? 'bg-green-500/5' : hasFlash === 'down' ? 'bg-red-500/5' : ''
                      }`} 
                    >
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-xl ${item.color.replace('bg-', 'bg-opacity-10 text-')} flex items-center justify-center shrink-0`}>
                            <span className="material-symbols-outlined text-lg">
                              {item.subType === 'saham' ? 'show_chart' : item.subType === 'reksadana' ? 'account_balance' : item.subType === 'sbn' ? 'payments' : 'star'}
                            </span>
                          </div>
                          <div>
                            <div className="font-bold text-sm text-on-surface dark:text-white group-hover:text-primary dark:group-hover:text-[#a7c8ff] transition-colors">{item.name}</div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] text-on-surface-variant dark:text-slate-500 font-medium">{item.symbol}</span>
                              <span className="text-[9px] bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-white/10 px-1.5 py-0.2 rounded font-bold uppercase tracking-wide">
                                {getSubtypeLabel(item.subType)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-5 text-right font-bold text-sm text-on-surface dark:text-white">Rp {item.initial.toLocaleString('id-ID')}</td>
                      <td className={`px-8 py-5 text-right font-bold text-sm tabular-nums transition-colors duration-500 ${hasFlash === 'up' ? 'text-green-500' : hasFlash === 'down' ? 'text-red-500' : 'text-on-surface dark:text-white'}`}>
                        Rp {marketValue.toLocaleString('id-ID')}
                      </td>
                      <td className="px-8 py-5 text-right font-bold text-sm tabular-nums">
                        <div className="flex flex-col items-end gap-0.5">
                          <span className={`flex items-center gap-1 font-bold text-sm transition-colors duration-500 ${percentChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            <span className="material-symbols-outlined text-xs font-black">
                              {percentChange >= 0 ? 'trending_up' : 'trending_down'}
                            </span>
                            {percentChange >= 0 ? '+' : ''}{percentChange.toFixed(2)}%
                          </span>
                          {item.isFixedIncome && item.couponsReceived > 0 && (
                            <span className="text-[10px] text-slate-400 dark:text-slate-500/70 font-semibold">
                              Kupon: +{formatM(item.couponsReceived)}
                            </span>
                          )}
                          {!item.isFixedIncome && item.pl !== 0 && (
                            <span className="text-[10px] text-slate-400 dark:text-slate-500/70 font-semibold">
                              Gain: {item.pl >= 0 ? '+' : ''}{formatM(item.pl)}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Middle Section: Analysis & Rebalancing */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Diversification Analysis */}
        <div className="bg-surface-container-low dark:bg-transparent border border-outline-variant/10 dark:border-white/10 p-6 lg:p-8 rounded-[24px]">
          <h3 className="font-headline font-bold text-sm uppercase tracking-widest text-on-surface-variant dark:text-outline mb-6 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary dark:text-[#a7c8ff]">analytics</span> Analisis Diversifikasi
          </h3>
          <div className="space-y-8">
            <div>
              <div className="flex justify-between items-center mb-2 font-semibold flex-wrap gap-1">
                <span className="text-xs md:text-sm font-medium dark:text-white">Konsentrasi Kelas Terbesar ({maxClass.name})</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                  concentrationRating === 'Tinggi' ? 'text-rose-600 dark:text-rose-400 bg-rose-500/10' :
                  concentrationRating === 'Sedang' ? 'text-amber-600 dark:text-amber-400 bg-amber-500/10' :
                  'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10'
                }`}>
                  {concentrationRating} ({maxClassPct}%)
                </span>
              </div>
              <div className="w-full h-1.5 bg-surface-container-high dark:bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-primary dark:bg-[#a7c8ff] rounded-full transition-all duration-500" style={{ width: `${maxClassPct}%` }}></div>
              </div>
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-2 font-semibold">
                <span className="text-xs md:text-sm font-medium dark:text-white">Skor Diversifikasi Portofolio</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                  divRating === 'Sangat Baik' ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10' :
                  divRating === 'Baik' ? 'text-teal-600 dark:text-teal-400 bg-teal-500/10' :
                  divRating === 'Moderat' ? 'text-amber-600 dark:text-amber-400 bg-amber-500/10' :
                  'text-rose-600 dark:text-rose-400 bg-rose-500/10'
                }`}>
                  {divRating} ({divScore.toFixed(1)}/10)
                </span>
              </div>
              <div className="w-full h-1.5 bg-surface-container-high dark:bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${divScore * 10}%` }}></div>
              </div>
              <p className="text-[10px] text-on-surface-variant dark:text-slate-400/70 mt-1.5 font-medium leading-tight">
                * Dihitung secara real-time berdasarkan Indeks Herfindahl-Hirschman (HHI) lintas 6 kelas aset.
              </p>
            </div>
            
            <div 
              className="p-5 bg-surface-container-lowest dark:bg-white/5 border border-outline-variant/10 dark:border-white/10 rounded-2xl flex items-start gap-4 hover:border-primary/50 dark:hover:border-[#a7c8ff]/50 transition-colors"
            >
              <div className="mt-1 w-10 h-10 flex-shrink-0 rounded-full bg-primary-fixed dark:bg-[#a7c8ff]/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-primary dark:text-[#a7c8ff]">security</span>
              </div>
              <div>
                <p className="text-sm font-bold mb-1 dark:text-white">Profil Risiko Portofolio: {riskProfileName}</p>
                <p className="text-xs text-on-surface-variant dark:text-slate-300 leading-relaxed">{riskProfileDesc}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Rebalancing Recommendations */}
        <div className="bg-primary-container dark:bg-gradient-to-br dark:from-[#001b3c] dark:to-[#002f5e] text-white p-6 lg:p-8 rounded-[24px] relative overflow-hidden flex flex-col justify-between shadow-md group">
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-700">
            <span className="material-symbols-outlined text-9xl">balance</span>
          </div>
          <div className="flex flex-col h-full justify-between">
            <div>
              <h3 className="font-headline font-bold text-sm uppercase tracking-widest text-[#a7c8ff] mb-6 relative z-10 flex items-center gap-2">
                <span className="material-symbols-outlined">lightbulb</span> Rekomendasi Rebalancing Portofolio
              </h3>
              <div className="space-y-3 relative z-10">
                {finalRecs.map((rec, i) => (
                  <div key={i} className="bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/10 flex items-center justify-between hover:bg-white/20 transition-colors cursor-pointer" onClick={() => onShowCTA({title: "Auto Execution System", description: "Beri izin pada Robo-Advisor untuk mengeksekusi order rebalancing portofolio ini secara otomatis dengan satu klik."})}>
                    <div className="flex flex-col max-w-[75%]">
                      <span className="text-[9px] opacity-75 uppercase tracking-widest mb-1">{rec.dir}</span>
                      <span className="text-xs font-bold text-white shadow-sm leading-snug">{rec.act}</span>
                    </div>
                    <div className="text-right font-semibold shrink-0">
                      <span className="text-[9px] opacity-75 block mb-1 uppercase tracking-widest">Penyesuaian</span>
                      <span className={`text-xs font-bold ${rec.color} bg-black/20 px-2 py-0.5 rounded`}>{rec.target}</span>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Target vs Actual Asset Allocation Progress */}
              <div className="mt-6 pt-5 border-t border-white/15 relative z-10">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#a7c8ff] mb-3">Target vs Aktual (Aset Likuid)</h4>
                <div className="grid grid-cols-2 gap-3 text-[11px]">
                  <div className="bg-white/5 border border-white/5 p-2 rounded-lg">
                    <div className="flex justify-between font-bold text-white mb-1.5">
                      <span className="opacity-90">Kas</span>
                      <span className="tabular-nums">{Math.round(wCashLiquid * 100)}% <span className="opacity-50">/ {targetCash}%</span></span>
                    </div>
                    <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-orange-450 rounded-full" style={{ width: `${Math.min(100, (wCashLiquid * 100 / targetCash) * 100)}%`, backgroundColor: '#f97316' }}></div>
                    </div>
                  </div>
                  <div className="bg-white/5 border border-white/5 p-2 rounded-lg">
                    <div className="flex justify-between font-bold text-white mb-1.5">
                      <span className="opacity-90">Pend. Tetap</span>
                      <span className="tabular-nums">{Math.round(wFixedLiquid * 100)}% <span className="opacity-50">/ {targetFixed}%</span></span>
                    </div>
                    <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-450 rounded-full" style={{ width: `${Math.min(100, (wFixedLiquid * 100 / targetFixed) * 100)}%`, backgroundColor: '#f59e0b' }}></div>
                    </div>
                  </div>
                  <div className="bg-white/5 border border-white/5 p-2 rounded-lg">
                    <div className="flex justify-between font-bold text-white mb-1.5">
                      <span className="opacity-90">Saham & RD</span>
                      <span className="tabular-nums">{Math.round(wEquitiesLiquid * 100)}% <span className="opacity-50">/ {targetEquities}%</span></span>
                    </div>
                    <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-450 rounded-full" style={{ width: `${Math.min(100, (wEquitiesLiquid * 100 / targetEquities) * 100)}%`, backgroundColor: '#3b82f6' }}></div>
                    </div>
                  </div>
                  <div className="bg-white/5 border border-white/5 p-2 rounded-lg">
                    <div className="flex justify-between font-bold text-white mb-1.5">
                      <span className="opacity-90">Kripto</span>
                      <span className="tabular-nums">{Math.round(wCryptoLiquid * 100)}% <span className="opacity-50">/ {targetCrypto}%</span></span>
                    </div>
                    <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-purple-450 rounded-full" style={{ width: `${Math.min(100, (wCryptoLiquid * 100 / targetCrypto) * 100)}%`, backgroundColor: '#a855f7' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <p className="text-[9px] opacity-75 mt-6 relative z-10 leading-tight">
              * Rekomendasi dihitung berdasarkan perbandingan alokasi likuid Anda saat ini dengan target ideal profil risiko <strong>{riskProfileName}</strong>.
            </p>
          </div>
        </div>
      </div>

      {/* Bottom Chart: Trend Diversification */}
      <div className="bg-surface-container-lowest dark:bg-transparent border border-outline-variant/10 dark:border-white/10 p-6 lg:p-8 rounded-[24px] shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10">
          <div>
            <h3 className="font-headline font-bold text-sm uppercase tracking-widest text-on-surface-variant dark:text-outline mb-1">Tren Diversifikasi</h3>
            <p className="text-xs md:text-sm text-on-surface-variant dark:text-slate-400 font-medium">Perbandingan performa kelas aset secara historis</p>
          </div>
          <div className="flex gap-2 font-semibold">
            <button 
              onClick={() => { setTimeframe('monthly'); setActivePointIndex(null); }}
              className={`px-4 py-1.5 text-xs font-bold rounded-full transition-all cursor-pointer ${timeframe === 'monthly' ? 'bg-primary dark:bg-[#a7c8ff] text-white dark:text-[#001b3c]' : 'text-on-surface-variant dark:text-slate-400 hover:bg-surface-container-low dark:hover:bg-white/10'}`}
            >
              Bulanan
            </button>
            <button 
              onClick={() => { setTimeframe('yearly'); setActivePointIndex(null); }}
              className={`px-4 py-1.5 text-xs font-bold rounded-full transition-all cursor-pointer ${timeframe === 'yearly' ? 'bg-primary dark:bg-[#a7c8ff] text-white dark:text-[#001b3c]' : 'text-on-surface-variant dark:text-slate-400 hover:bg-surface-container-low dark:hover:bg-white/10'}`}
            >
              Tahunan
            </button>
          </div>
        </div>
        
        <div className="h-56 md:h-72 w-full relative group">
          <>
            <AnimatePresence>
              {activePointIndex !== null && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="absolute z-20 bg-white/95 dark:bg-[#191c1e]/95 backdrop-blur-xl border border-slate-200/50 dark:border-white/10 p-4 rounded-2xl shadow-2xl pointer-events-none min-w-[200px]"
                  style={{ 
                    left: `calc(${(activePointIndex / (currentData.length - 1)) * 100}% + ${activePointIndex > currentData.length / 2 ? '-220px' : '20px'})`,
                    top: '10%'
                  }}
                >
                  <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3 border-b border-slate-200/20 dark:border-white/10 pb-2">{currentData[activePointIndex].label}</div>
                  <div className="space-y-3 font-semibold">
                    <div className="flex justify-between items-center gap-4">
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#3b82f6' }}></div>
                        <span className="text-xs font-medium text-slate-650 dark:text-slate-300">Investasi</span>
                      </div>
                      <span className="text-sm font-bold dark:text-white tabular-nums text-right whitespace-nowrap">{formatM(currentData[activePointIndex].invest)}</span>
                    </div>
                    <div className="flex justify-between items-center gap-4">
                      <div className="flex items-center gap-2 shrink-0">
                         <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#f97316' }}></div>
                         <span className="text-xs font-medium text-slate-650 dark:text-slate-300">Stabilitas Kas</span>
                      </div>
                      <span className="text-sm font-bold dark:text-white tabular-nums text-right whitespace-nowrap">{formatM(currentData[activePointIndex].cash)}</span>
                    </div>
                    <div className="flex justify-between items-center gap-4">
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#64748b' }}></div>
                        <span className="text-xs font-medium text-slate-650 dark:text-slate-300">Aset Fisik</span>
                      </div>
                      <span className="text-sm font-bold dark:text-white tabular-nums text-right whitespace-nowrap">{formatM(currentData[activePointIndex].physical)}</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <svg className="w-full h-full overflow-visible" viewBox="0 0 1000 200" preserveAspectRatio="none">
              <defs>
                <linearGradient id="trendGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="currentColor" className="text-primary dark:text-[#a7c8ff]" stopOpacity="0.1" />
                  <stop offset="100%" stopColor="currentColor" className="text-primary dark:text-[#a7c8ff]" stopOpacity="0" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              {[40, 80, 120, 160].map((y) => (
                <line key={y} x1="0" y1={y} x2="1000" y2={y} stroke="currentColor" className="text-outline-variant dark:text-white/10" strokeWidth="1" strokeDasharray="4" opacity="0.4" />
              ))}

              {/* Dynamic Lines */}
              {(() => {
                const points = currentData.map((d, i) => ({
                  x: (i / (currentData.length - 1)) * 1000,
                  yInvest: 200 - (d.invest / maxVal) * 160,
                  yCash: 200 - (d.cash / maxVal) * 160,
                  yPhysical: 200 - (d.physical / maxVal) * 160,
                }));

                const generatePath = (type: 'yInvest' | 'yCash' | 'yPhysical') => {
                  return points.reduce((acc, p, i) => {
                     if (i === 0) return `M ${p.x},${p[type]}`;
                     return `${acc} L ${p.x},${p[type]}`;
                  }, "");
                };

                return (
                  <>
                     {/* Areas */}
                     <motion.path 
                      initial={false}
                      animate={{ d: `${generatePath('yInvest')} V 200 H 0 Z` }}
                      fill="url(#trendGrad)" 
                      className="transition-all duration-300"
                     />

                     <motion.path 
                      initial={false} 
                      animate={{ d: generatePath('yInvest') }} 
                      transition={{ duration: 0.8, ease: "easeInOut" }}
                      d={generatePath('yInvest')} 
                      fill="none" 
                      stroke="#3b82f6" 
                      strokeWidth="3" 
                      vectorEffect="non-scaling-stroke"
                      style={{ filter: 'drop-shadow(0px 3px 6px rgba(59, 130, 246, 0.4))' }}
                     />
                     <motion.path 
                      initial={false} 
                      animate={{ d: generatePath('yCash') }} 
                      transition={{ duration: 0.8, ease: "easeInOut" }}
                      d={generatePath('yCash')} 
                      fill="none" 
                      stroke="#f97316" 
                      strokeWidth="2" 
                      vectorEffect="non-scaling-stroke"
                      style={{ filter: 'drop-shadow(0px 3px 6px rgba(249, 115, 22, 0.4))' }}
                     />
                     <motion.path 
                      initial={false} 
                      animate={{ d: generatePath('yPhysical') }} 
                      transition={{ duration: 0.8, ease: "easeInOut" }}
                      d={generatePath('yPhysical')} 
                      fill="none" 
                      stroke="#64748b" 
                      strokeWidth="2" 
                      vectorEffect="non-scaling-stroke"
                      style={{ filter: 'drop-shadow(0px 3px 6px rgba(100, 116, 139, 0.4))' }}
                     />

                     {/* Vertical Scanner Line */}
                     {activePointIndex !== null && (
                       <motion.line 
                          x1={points[activePointIndex].x} 
                          y1="0" 
                          x2={points[activePointIndex].x} 
                          y2="200" 
                          stroke="currentColor" 
                          className="text-primary dark:text-[#a7c8ff]" 
                          strokeWidth="1" 
                          strokeDasharray="4 2"
                       />
                     )}

                     {/* Points/Markers */}
                     {activePointIndex !== null && (
                       <>
                          <circle cx={points[activePointIndex].x} cy={points[activePointIndex].yInvest} r="5" fill="white" stroke="#3b82f6" strokeWidth="2" />
                          <circle cx={points[activePointIndex].x} cy={points[activePointIndex].yCash} r="4" fill="white" stroke="#f97316" strokeWidth="2" />
                          <circle cx={points[activePointIndex].x} cy={points[activePointIndex].yPhysical} r="4" fill="white" stroke="#64748b" strokeWidth="2" />
                       </>
                     )}

                     {/* Interaction Zones */}
                     {points.map((p, i) => (
                       <rect 
                          key={`${timeframe}-${i}`} 
                          x={i === 0 ? 0 : p.x - (1000 / (points.length - 1)) / 2} 
                          y="0" 
                          width={1000 / (points.length - 1)} 
                          height="200" 
                          fill="transparent" 
                          onMouseEnter={() => setActivePointIndex(i)} 
                          className="cursor-crosshair"
                       />
                     ))}
                  </>
                );
              })()}
            </svg>
            
            <div className="absolute bottom-0 left-0 right-0 flex justify-between mt-4 text-[10px] font-bold text-on-surface-variant dark:text-outline uppercase tracking-widest px-2 pointer-events-none">
              {timeframe === 'monthly' ? (
                currentData.filter((_, i) => i % 3 === 0 || i === currentData.length - 1).map((d, i) => (
                  <span key={i}>{d.label}</span>
                ))
              ) : (
                currentData.map((d, i) => (
                  <span key={i}>{d.label}</span>
                ))
              )}
            </div>
          </>
        </div>
        
        <div className="mt-10 pt-6 border-t border-outline-variant/10 dark:border-white/10 flex flex-wrap gap-4 md:gap-8 justify-center font-semibold">
          <div className="flex items-center gap-2 group">
            <span className="w-4 h-1 rounded-full" style={{ backgroundColor: '#3b82f6' }}></span>
            <span className="text-xs text-on-surface-variant dark:text-slate-300 transition-colors">Pertumbuhan Investasi</span>
          </div>
          <div className="flex items-center gap-2 group">
            <span className="w-4 h-1 rounded-full" style={{ backgroundColor: '#f97316' }}></span>
            <span className="text-xs text-on-surface-variant dark:text-slate-300 transition-colors">Stabilitas Kas</span>
          </div>
          <div className="flex items-center gap-2 group">
            <span className="w-4 h-1 rounded-full" style={{ backgroundColor: '#64748b' }}></span>
            <span className="text-xs text-on-surface-variant dark:text-slate-300 transition-colors">Aset Fisik</span>
          </div>
        </div>
      </div>

    </div>
  );
};

export default FinancePortfolioReport;
