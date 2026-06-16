import React, { useState, useEffect } from 'react';
import { FeatureCTA } from './MarketingCTAModal';
import { useFinanceStore } from '../store/useFinanceStore';

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

interface FinancePerformanceReportProps {
  onShowCTA: (feature?: FeatureCTA) => void;
  onNavigate?: (tab: string) => void;
  hideHeader?: boolean;
  selectedPeriod?: string;
}

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

const SECTORS_META = {
  saham: {
    id: 'saham',
    name: 'Saham & Ekuitas',
    icon: 'bar_chart',
    iconBg: 'bg-primary-container dark:bg-primary/20 text-primary dark:text-[#a7c8ff]',
    divYield: '4.2%'
  },
  reksadana: {
    id: 'reksadana',
    name: 'Reksadana & Kolektif',
    icon: 'widgets',
    iconBg: 'bg-secondary-container dark:bg-white/10 text-primary dark:text-[#a7c8ff]',
    divYield: '3.5%'
  },
  sbn: {
    id: 'sbn',
    name: 'SBN & Pendapatan Tetap',
    icon: 'account_balance',
    iconBg: 'bg-amber-500/20 text-amber-500',
    divYield: '6.2%'
  }
};

const BASE_CHART_TREND = [
  { month: 'Jan', portfolio: 0, ihsg: 0 },
  { month: 'Feb', portfolio: 5, ihsg: 2 },
  { month: 'Mar', portfolio: 10, ihsg: -2 },
  { month: 'Apr', portfolio: 8, ihsg: 1 },
  { month: 'Mei', portfolio: 15, ihsg: 3 },
  { month: 'Jun', portfolio: 20, ihsg: 5 },
  { month: 'Jul', portfolio: 18, ihsg: 4 },
  { month: 'Ags', portfolio: 22, ihsg: 6 },
  { month: 'Sep', portfolio: 25, ihsg: 5 },
  { month: 'Okt', portfolio: 22, ihsg: 4 },
  { month: 'Nov', portfolio: 28, ihsg: 5 },
  { month: 'Des', portfolio: 32, ihsg: 6 },
];

const FinancePerformanceReport: React.FC<FinancePerformanceReportProps> = ({ onShowCTA, hideHeader, selectedPeriod = 'this_month' }) => {
  const assets = useFinanceStore((state) => state.assets);

  const { start: periodStart, end: periodEnd } = getPeriodStartAndEnd(selectedPeriod);

  const [expandedSector, setExpandedSector] = useState<string | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const settings = useFinanceStore((state) => state.settings);
  
  const getSettingNum = (key: string, def: number) => {
    const val = settings.find(s => s.key.toLowerCase() === key.toLowerCase())?.value;
    return val && !isNaN(parseFloat(val)) ? parseFloat(val) : def;
  };

  const ihsgPrice = getSettingNum('IHSG_PRICE', 7320);
  const ihsgInitial = getSettingNum('IHSG_INITIAL', 6890);

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

    return {
      ...item,
      ticker,
      initial,
      marketValue,
      pl,
      percentChange,
      isFixedIncome,
      couponsReceived
    };
  });

  // Group into 3 sectors
  const sectorAssets: Record<string, any[]> = {
    saham: [],
    reksadana: [],
    sbn: []
  };

  portfolioItemsWithLive.forEach(item => {
    const subType = item.subType || 'saham';
    if (subType === 'saham') {
      sectorAssets.saham.push(item);
    } else if (subType === 'reksadana') {
      sectorAssets.reksadana.push(item);
    } else {
      sectorAssets.sbn.push(item);
    }
  });

  // Calculate sector metrics in real-time
  const sectorPerformance = Object.keys(SECTORS_META).reduce((acc, sectorKey) => {
    const items = sectorAssets[sectorKey] || [];
    let totalInitial = 0;
    let totalMarketValue = 0;
    let totalPL = 0;

    items.forEach(item => {
      totalInitial += item.initial;
      totalMarketValue += item.marketValue;
      totalPL += item.pl;
    });

    const percentChange = totalInitial > 0 ? (totalPL / totalInitial) * 100 : 0;

    acc[sectorKey] = {
      totalInitial,
      totalMarketValue,
      pl: totalPL,
      percentChange,
      itemCount: items.length
    };
    return acc;
  }, {} as Record<string, { totalInitial: number; totalMarketValue: number; pl: number; percentChange: number; itemCount: number }>);

  const totalMarketValueAll = Object.values(sectorPerformance).reduce((sum, item) => sum + item.totalMarketValue, 0);
  const totalInitialAll = Object.values(sectorPerformance).reduce((sum, item) => sum + item.totalInitial, 0);
  const totalPLAll = Object.values(sectorPerformance).reduce((sum, item) => sum + item.pl, 0);
  const portfolioReturnAll = totalInitialAll > 0 ? (totalPLAll / totalInitialAll) * 100 : 0;

  const pctSaham = totalMarketValueAll > 0 ? Math.round((sectorPerformance.saham?.totalMarketValue || 0) / totalMarketValueAll * 100) : 0;
  const pctReksadana = totalMarketValueAll > 0 ? Math.round((sectorPerformance.reksadana?.totalMarketValue || 0) / totalMarketValueAll * 100) : 0;
  const pctSbn = totalMarketValueAll > 0 ? Math.max(0, 100 - pctSaham - pctReksadana) : 0;

  // IHSG baseline return (dynamic based on selectedPeriod)
  const ytdReturn = ihsgInitial > 0 ? ((ihsgPrice - ihsgInitial) / ihsgInitial) * 100 : 6.2;
  let ihsgReturn = ytdReturn;
  if (selectedPeriod === 'this_month') {
    ihsgReturn = ytdReturn / 12;
  } else if (selectedPeriod === '3_months') {
    ihsgReturn = ytdReturn / 4;
  } else if (selectedPeriod === '12_months') {
    ihsgReturn = ytdReturn;
  } else if (selectedPeriod === 'ytd') {
    ihsgReturn = ytdReturn;
  } else if (selectedPeriod.includes('-')) {
    ihsgReturn = ytdReturn / 12;
  }

  const liveAlpha = portfolioReturnAll - ihsgReturn;

  // Generate dynamic chart data based on selectedPeriod
  const getDynamicPerformanceTrend = () => {
    const now = new Date();
    
    if (selectedPeriod === 'this_month') {
      return Array.from({ length: 4 }).map((_, idx) => {
        const label = `M ${idx + 1}`;
        const factor = idx / 3;
        const baseVal = BASE_CHART_TREND[idx + 8] || { portfolio: 20, ihsg: 5 };
        return {
          month: label,
          portfolio: portfolioReturnAll * factor * (baseVal.portfolio / 32 || 1),
          ihsg: ihsgReturn * factor * (baseVal.ihsg / 6 || 1),
        };
      });
    }
    
    if (selectedPeriod === '3_months') {
      const months = [];
      for (let i = 2; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push(d.toLocaleDateString('id-ID', { month: 'short' }));
      }
      return Array.from({ length: 3 }).map((_, idx) => {
        const factor = idx / 2;
        const baseVal = BASE_CHART_TREND[idx + 9] || { portfolio: 25, ihsg: 5 };
        return {
          month: months[idx],
          portfolio: portfolioReturnAll * factor * (baseVal.portfolio / 32 || 1),
          ihsg: ihsgReturn * factor * (baseVal.ihsg / 6 || 1),
        };
      });
    }
    
    if (selectedPeriod === '12_months') {
      const months = [];
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push(d.toLocaleDateString('id-ID', { month: 'short' }));
      }
      return BASE_CHART_TREND.map((d, i) => {
        const factor = i / (BASE_CHART_TREND.length - 1);
        return {
          month: months[i],
          portfolio: portfolioReturnAll * factor * (d.portfolio / 32 || 1),
          ihsg: ihsgReturn * factor * (d.ihsg / 6 || 1),
        };
      });
    }
    
    if (selectedPeriod === 'ytd') {
      const currentMonthIndex = now.getMonth();
      const length = Math.max(2, currentMonthIndex + 1);
      const trend = [];
      for (let idx = 0; idx < length; idx++) {
        const d = new Date(now.getFullYear(), idx, 1);
        const monthName = d.toLocaleDateString('id-ID', { month: 'short' });
        const factor = idx / (length - 1);
        const baseVal = BASE_CHART_TREND[idx % 12];
        trend.push({
          month: monthName,
          portfolio: portfolioReturnAll * factor * ((baseVal?.portfolio || 10) / 32 || 1),
          ihsg: ihsgReturn * factor * ((baseVal?.ihsg || 2) / 6 || 1),
        });
      }
      return trend;
    }
    
    if (selectedPeriod.includes('-')) {
      return Array.from({ length: 4 }).map((_, idx) => {
        const label = `M ${idx + 1}`;
        const factor = idx / 3;
        const baseVal = BASE_CHART_TREND[idx + 8] || { portfolio: 20, ihsg: 5 };
        return {
          month: label,
          portfolio: portfolioReturnAll * factor * (baseVal.portfolio / 32 || 1),
          ihsg: ihsgReturn * factor * (baseVal.ihsg / 6 || 1),
        };
      });
    }

    // Default 12 months
    const months = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(d.toLocaleDateString('id-ID', { month: 'short' }));
    }
    return BASE_CHART_TREND.map((d, i) => {
      const factor = i / (BASE_CHART_TREND.length - 1);
      return {
        month: months[i],
        portfolio: portfolioReturnAll * factor * (d.portfolio / 32 || 1),
        ihsg: ihsgReturn * factor * (d.ihsg / 6 || 1),
      };
    });
  };

  const chartData = getDynamicPerformanceTrend();

  const getRiskMetrics = () => {
    const pReturns = [];
    const bReturns = [];
    for (let i = 1; i < chartData.length; i++) {
      pReturns.push(chartData[i].portfolio - chartData[i-1].portfolio);
      bReturns.push(chartData[i].ihsg - chartData[i-1].ihsg);
    }
    
    if (pReturns.length === 0) {
      return { stdDev: 11.8, beta: 1.08, sharpe: 2.28, jensenAlpha: 33.10, treynor: 30.65 };
    }
    
    const pMean = pReturns.reduce((s, r) => s + r, 0) / pReturns.length;
    const bMean = bReturns.reduce((s, r) => s + r, 0) / bReturns.length;
    
    // Variance & Std Dev of portfolio (annualized)
    const pVar = pReturns.reduce((s, r) => s + Math.pow(r - pMean, 2), 0) / (pReturns.length - 1 || 1);
    const stdDev = Math.sqrt(pVar) * Math.sqrt(12); // Annualized Std Dev
    
    // Covariance of portfolio and benchmark
    let cov = 0;
    for (let i = 0; i < pReturns.length; i++) {
      cov += (pReturns[i] - pMean) * (bReturns[i] - bMean);
    }
    cov = cov / (pReturns.length - 1 || 1);
    
    // Variance of benchmark
    const bVar = bReturns.reduce((s, r) => s + Math.pow(r - bMean, 2), 0) / (bReturns.length - 1 || 1);
    
    // Beta = Covariance(P, B) / Variance(B)
    let beta = bVar > 0.0001 ? cov / bVar : 1.0;
    
    // Sharpe Ratio = (Portfolio Return - Risk Free Rate) / Std Dev
    // Let's assume a risk-free rate of 5.5% (BI-Rate standard in Indonesia)
    const riskFreeRate = 5.5;
    const sharpe = stdDev > 0.1 ? (portfolioReturnAll - riskFreeRate) / stdDev : 0;
    const jensenAlpha = portfolioReturnAll - (riskFreeRate + beta * (ihsgReturn - riskFreeRate));
    const treynor = beta > 0.01 ? (portfolioReturnAll - riskFreeRate) / beta : 0;
    
    return {
      stdDev: Math.max(2.0, Math.min(30.0, stdDev)),
      beta: Math.max(0.2, Math.min(2.5, beta)),
      sharpe: Math.max(-10.0, Math.min(10.0, sharpe)),
      jensenAlpha,
      treynor
    };
  };

  const { stdDev, beta, sharpe, jensenAlpha, treynor } = getRiskMetrics();

  const handleExportCSV = () => {
    const headers = ["Sektor", "Simbol / Aset", "Lembar / Unit", "Modal Awal (IDR)", "Nilai Pasar (IDR)", "Return (%)"];
    const rows: (string | number)[][] = [];

    Object.entries(sectorAssets).forEach(([sectorKey, items]) => {
      const secName = SECTORS_META[sectorKey as keyof typeof SECTORS_META]?.name || sectorKey;
      items.forEach(item => {
        const ticker = item.ticker || item.title;
        const shares = item.shares || 1;
        const initial = item.purchasePrice || item.currentValue;
        let marketValue = item.currentValue;
        const pl = marketValue - initial;
        const ret = initial > 0 ? (pl / initial) * 100 : 0;

        rows.push([
          secName,
          ticker,
          shares,
          initial,
          marketValue,
          ret.toFixed(2)
        ]);
      });
    });

    const csvString = [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${(import.meta.env.VITE_APP_NAME || 'dompetku').toLowerCase()}_sektoral_performa_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const toggleSector = (sector: string) => {
    if (expandedSector === sector) {
      setExpandedSector(null);
    } else {
      setExpandedSector(sector);
    }
  };

  // Helper to calculate SVG Y coordinate (Inverse: 0 is top, 200 is bottom)
  const getY = (val: number) => {
    const min = Math.min(-10, portfolioReturnAll - 10, ihsgReturn - 10);
    const max = Math.max(40, portfolioReturnAll + 10, ihsgReturn + 10);
    const range = max - min;
    return 180 - ((val - min) / range) * 160;
  };

  // Generate paths
  const portfolioPoints = chartData.map((d, i) => `${(i / (chartData.length - 1)) * 1000},${getY(d.portfolio)}`).join(' ');
  const ihsgPoints = chartData.map((d, i) => `${(i / (chartData.length - 1)) * 1000},${getY(d.ihsg)}`).join(' ');

  const formatM = (val: number) => {
    if (val >= 1e9) {
      return `Rp ${(val / 1e9).toFixed(2)} M`;
    }
    if (val >= 1e6) {
      return `Rp ${(val / 1e6).toFixed(2)} Jt`;
    }
    if (val >= 1e3) {
      return `Rp ${(val / 1e3).toFixed(0)} Rb`;
    }
    return `Rp ${val}`;
  };

  // Identify underperforming sector
  const sortedSectors = Object.entries(sectorPerformance).sort((a, b) => a[1].percentChange - b[1].percentChange);
  const worstSectorKey = sortedSectors[0]?.[0] || 'saham';
  const worstSectorName = SECTORS_META[worstSectorKey as keyof typeof SECTORS_META]?.name || worstSectorKey;
  const worstSectorRet = sortedSectors[0]?.[1]?.percentChange || 0;

  // Sort sectors by totalMarketValue descending to place the largest sector first
  const renderOrder = Object.keys(SECTORS_META).sort((a, b) => {
    const aVal = sectorPerformance[a]?.totalMarketValue || 0;
    const bVal = sectorPerformance[b]?.totalMarketValue || 0;
    return bVal - aVal;
  });

  return (
    <div className="space-y-8 lg:space-y-12 animate-in fade-in duration-500 pb-12">
      
      {/* Header */}
      {!hideHeader && (
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="font-headline text-2xl lg:text-3xl font-extrabold tracking-tighter text-primary dark:text-[#a7c8ff]">Analisis Sektor Saham & Investasi</h2>
            <p className="text-on-surface-variant dark:text-outline text-sm lg:text-base mt-2 max-w-xl">Evaluasi mendalam distribusi modal dan performa sektoral dalam portofolio institusi Anda.</p>
          </div>
          <div className="flex flex-wrap gap-3 no-print">
            <button 
              onClick={handleExportCSV}
              className="px-4 py-2.5 bg-surface-container-low dark:bg-white/5 text-primary dark:text-[#a7c8ff] border border-outline-variant/20 dark:border-white/10 font-semibold text-sm rounded-xl hover:bg-surface-container-high dark:hover:bg-white/10 transition-colors flex-1 md:flex-none justify-center flex items-center gap-2 cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">csv</span> Ekspor (CSV)
            </button>
            <button 
              onClick={() => window.print()}
              className="px-4 py-2.5 bg-surface-container-low dark:bg-white/5 text-primary dark:text-[#a7c8ff] border border-outline-variant/20 dark:border-white/10 font-semibold text-sm rounded-xl hover:bg-surface-container-high dark:hover:bg-white/10 transition-colors flex-1 md:flex-none justify-center flex items-center gap-2 cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">file_download</span> Cetak (PDF)
            </button>
          </div>
        </header>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
        
        {/* Performance Benchmark vs IHSG */}
        <section className="lg:col-span-8 bg-surface-container-lowest dark:bg-transparent border border-outline-variant/10 dark:border-white/10 p-6 lg:p-8 rounded-[24px] shadow-sm flex flex-col">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
            <div>
              <h3 className="font-headline text-sm uppercase tracking-widest font-bold text-on-surface dark:text-white">Benchmark IHSG</h3>
              <p className="text-xs text-on-surface-variant dark:text-slate-400 mt-1 font-medium">Perbandingan performa kumulatif 12 bulan terakhir</p>
            </div>
            <div className="flex gap-4 text-xs font-semibold bg-surface-container-low dark:bg-white/5 py-1.5 px-3 rounded-xl border border-outline-variant/10 dark:border-white/10">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#3b82f6' }}></span>
                <span className="text-on-surface dark:text-white">Portofolio</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#64748b' }}></span>
                <span className="text-on-surface-variant dark:text-slate-400">IHSG</span>
              </div>
            </div>
          </div>

          {/* Interactive SVG Line Chart */}
          <div className="h-56 relative flex items-end justify-between gap-1 px-2 border-b border-outline-variant/20 dark:border-white/10 mb-4 cursor-crosshair group">
            <svg className="absolute inset-0 w-full h-full preserve-3d" fill="none" preserveAspectRatio="none" viewBox="0 0 1000 200">
              {/* Grid Lines */}
              {[40, 80, 120, 160].map((y) => (
                <line key={y} x1="0" y1={y} x2="1000" y2={y} stroke="currentColor" className="text-outline-variant dark:text-white/10" strokeWidth="1" strokeDasharray="4" opacity="0.3" />
              ))}
              
              {/* IHSG Path */}
              <polyline 
                points={ihsgPoints} 
                stroke="#64748b" 
                strokeWidth="2" 
                strokeLinejoin="round" 
                vectorEffect="non-scaling-stroke" 
                style={{ filter: 'drop-shadow(0px 3px 6px rgba(100, 116, 139, 0.35))' }}
              />
              
              {/* Portfolio Path */}
              <polyline 
                points={portfolioPoints} 
                stroke="#3b82f6" 
                strokeWidth="3" 
                strokeLinejoin="round" 
                vectorEffect="non-scaling-stroke" 
                style={{ filter: 'drop-shadow(0px 3px 6px rgba(59, 130, 246, 0.4))' }}
              />
              
              {/* Hover Indicator Line */}
              {hoveredIndex !== null && (
                <line 
                  x1={(hoveredIndex / (chartData.length - 1)) * 1000} 
                  y1="0" 
                  x2={(hoveredIndex / (chartData.length - 1)) * 1000} 
                  y2="200" 
                  stroke="currentColor" 
                  className="text-primary dark:text-[#a7c8ff] opacity-30" 
                  strokeWidth="1" 
                  strokeDasharray="4" 
                />
              )}

              {/* Hover Points */}
              {hoveredIndex !== null && chartData[hoveredIndex] && (
                <>
                  <circle 
                    cx={(hoveredIndex / (chartData.length - 1)) * 1000} 
                    cy={getY(chartData[hoveredIndex].ihsg)} 
                    r="4" 
                    fill="white" 
                    stroke="#64748b" 
                    strokeWidth="2" 
                  />
                  <circle 
                    cx={(hoveredIndex / (chartData.length - 1)) * 1000} 
                    cy={getY(chartData[hoveredIndex].portfolio)} 
                    r="5" 
                    fill="white" 
                    stroke="#3b82f6" 
                    strokeWidth="2.5" 
                  />
                </>
              )}

              {/* Interaction Zones */}
              {chartData.map((_, i) => (
                <rect
                  key={i}
                  x={(i / (chartData.length - 1)) * 1000 - 500 / (chartData.length - 1)}
                  y="0"
                  width={1000 / (chartData.length - 1)}
                  height="200"
                  fill="transparent"
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredIndex(i)}
                  onMouseLeave={() => setHoveredIndex(null)}
                />
              ))}
            </svg>
            
            {/* Dynamic Tooltip */}
            {hoveredIndex !== null && chartData[hoveredIndex] && (
              <div 
                className="absolute bg-white/95 dark:bg-[#191c1e]/95 backdrop-blur-xl border border-slate-200/50 dark:border-white/10 p-3.5 rounded-2xl shadow-2xl pointer-events-none transition-all duration-200 z-10 min-w-[160px]"
                style={{ 
                  left: `${(hoveredIndex / (chartData.length - 1)) * 100}%`,
                  bottom: '60%',
                  transform: 'translateX(-50%)'
                }}
              >
                <div className="font-bold text-slate-700 dark:text-white mb-2 border-b border-slate-200/20 dark:border-white/10 pb-1.5">{chartData[hoveredIndex].month} 2026</div>
                <div className="flex flex-col gap-1.5 font-semibold">
                  <div className="text-[#3b82f6] flex justify-between gap-6 items-center">
                    <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#3b82f6' }}></span> Portofolio:</span> 
                    <span className="font-bold tabular-nums">{chartData[hoveredIndex].portfolio >= 0 ? '+' : ''}{chartData[hoveredIndex].portfolio.toFixed(1)}%</span>
                  </div>
                  <div className="text-slate-400 dark:text-slate-500 flex justify-between gap-6 items-center">
                    <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#64748b' }}></span> IHSG:</span> 
                    <span className="font-bold tabular-nums">{chartData[hoveredIndex].ihsg >= 0 ? '+' : ''}{chartData[hoveredIndex].ihsg.toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            )}

            {/* Month Labels */}
            <div className="absolute -bottom-6 w-full flex justify-between text-[10px] font-bold text-on-surface-variant dark:text-outline uppercase tracking-wider">
              {chartData.filter((_, i) => i % 2 === 0 || i === 11).map((d, i) => (
                <span key={i}>{d.month}</span>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 md:gap-6 mt-12">
            <div className="bg-surface-container-low/50 dark:bg-white/5 p-3 md:p-4 rounded-xl border border-outline-variant/10 dark:border-white/10 transition-colors duration-500">
              <span className="text-[10px] font-bold text-on-surface-variant dark:text-slate-400 uppercase tracking-widest block mb-1">Return Portofolio</span>
              <div className="flex items-baseline gap-1">
                <span className="text-base md:text-lg font-bold text-primary dark:text-[#a7c8ff]">{portfolioReturnAll >= 0 ? '+' : ''}{portfolioReturnAll.toFixed(1)}%</span>
                <span className="text-[10px] text-tertiary-container dark:text-tertiary-fixed font-bold">YTD</span>
              </div>
            </div>
            <div className="bg-surface-container-low/50 dark:bg-white/5 p-3 md:p-4 rounded-xl border border-outline-variant/10 dark:border-white/10 transition-colors duration-500">
              <span className="text-[10px] font-bold text-on-surface-variant dark:text-slate-400 uppercase tracking-widest block mb-1">Return IHSG</span>
              <div className="flex items-baseline gap-1">
                <span className="text-base md:text-lg font-bold text-on-surface-variant dark:text-slate-300">{ihsgReturn >= 0 ? '+' : ''}{ihsgReturn.toFixed(1)}%</span>
                <span className="text-[10px] text-on-surface-variant dark:text-slate-500 font-bold">YTD</span>
              </div>
            </div>
            <div className="bg-primary/5 dark:bg-[#a7c8ff]/10 p-3 md:p-4 rounded-xl border border-primary/10 dark:border-[#a7c8ff]/20">
              <span className="text-[10px] font-bold text-primary dark:text-[#a7c8ff] uppercase tracking-widest block mb-1 truncate">Alpha (Outperform)</span>
              <div className="flex items-baseline gap-1">
                <span className={`text-base md:text-lg font-bold ${liveAlpha >= 0 ? 'text-primary dark:text-[#a7c8ff]' : 'text-error'}`}>
                  {liveAlpha >= 0 ? '+' : ''}{liveAlpha.toFixed(1)}%
                </span>
                <span className="material-symbols-outlined text-sm text-primary dark:text-[#a7c8ff]">trending_up</span>
              </div>
            </div>
          </div>
        </section>

        {/* Risk Metrics Summary & Heatmap */}
        <section className="lg:col-span-4 space-y-6 lg:space-y-8 flex flex-col justify-between">
          <div className="bg-surface-container-lowest dark:bg-transparent p-6 lg:p-8 rounded-[24px] shadow-sm border border-outline-variant/10 dark:border-white/10 flex-1">
            <h3 className="font-headline text-sm uppercase tracking-widest font-bold text-on-surface dark:text-white mb-6">Metrik Risiko & Alpha (CFA Standards)</h3>
            <div className="space-y-4">
              {/* Excess Return Card */}
              <div className="flex justify-between items-center p-4 rounded-xl bg-surface-container-low/50 dark:bg-white/5 border border-outline-variant/5 dark:border-white/5 hover:bg-surface-container-high/50 dark:hover:bg-white/10 transition-all">
                <div className="pr-4">
                  <span className="text-xs font-bold text-on-surface-variant dark:text-slate-300 block uppercase tracking-wider flex items-center gap-1">
                    Excess Return vs IHSG
                    <span className="material-symbols-outlined text-[14px] cursor-help text-slate-400" title="R_p - R_m: Kelebihan return portofolio langsung di atas pasar.">info</span>
                  </span>
                  <p className="text-[10px] text-on-surface-variant/70 dark:text-slate-400 leading-tight mt-1">Kelebihan return aritmatika terhadap benchmark</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-2xl font-headline font-extrabold text-primary dark:text-[#a7c8ff]">{liveAlpha.toFixed(2)}%</span>
                  <span className="text-[10px] block font-bold text-tertiary-container dark:text-tertiary-fixed bg-tertiary-fixed/30 dark:bg-tertiary-fixed/20 px-2 py-0.5 rounded-md mt-1">
                    {liveAlpha > 5 ? 'Outperform Tinggi' : liveAlpha > 0 ? 'Outperform' : 'Underperform'}
                  </span>
                </div>
              </div>

              {/* Jensen's Alpha (CAPM) Card */}
              <div className="flex justify-between items-center p-4 rounded-xl bg-surface-container-low/50 dark:bg-white/5 border border-outline-variant/5 dark:border-white/5 hover:bg-surface-container-high/50 dark:hover:bg-white/10 transition-all">
                <div className="pr-4">
                  <span className="text-xs font-bold text-on-surface-variant dark:text-slate-300 block uppercase tracking-wider flex items-center gap-1">
                    Jensen's Alpha (CAPM)
                    <span className="material-symbols-outlined text-[14px] cursor-help text-slate-400" title="Alpha = R_p - [R_f + Beta * (R_m - R_f)]. Mengukur abnormal return yang disesuaikan dengan risiko pasar. Rf = 5.5% (BI-Rate).">info</span>
                  </span>
                  <p className="text-[10px] text-on-surface-variant/70 dark:text-slate-400 leading-tight mt-1">Kemampuan manager menghasilkan return adjusted risk</p>
                </div>
                <div className="text-right shrink-0">
                  <span className={`text-2xl font-headline font-extrabold ${jensenAlpha >= 0 ? 'text-green-500' : 'text-red-500'}`}>{jensenAlpha >= 0 ? '+' : ''}{jensenAlpha.toFixed(2)}%</span>
                  <span className={`text-[9px] block font-bold px-2 py-0.5 rounded-md mt-1 text-center ${jensenAlpha >= 0 ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                    {jensenAlpha > 0 ? 'Abnormal Gain' : 'Underperform'}
                  </span>
                </div>
              </div>

              {/* Beta Card */}
              <div className="flex justify-between items-center p-4 rounded-xl bg-surface-container-low/50 dark:bg-white/5 border border-outline-variant/5 dark:border-white/5 hover:bg-surface-container-high/50 dark:hover:bg-white/10 transition-all">
                <div className="pr-4">
                  <span className="text-xs font-bold text-on-surface-variant dark:text-slate-300 block uppercase tracking-wider flex items-center gap-1">
                    Beta Portofolio
                    <span className="material-symbols-outlined text-[14px] cursor-help text-slate-400" title="Beta = Covariance(R_p, R_m) / Variance(R_m). Mengukur risiko sistematis relatif terhadap IHSG.">info</span>
                  </span>
                  <p className="text-[10px] text-on-surface-variant/70 dark:text-slate-400 leading-tight mt-1">Sensitivitas pergerakan terhadap indeks pasar</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-2xl font-headline font-extrabold text-on-surface dark:text-white">{beta.toFixed(2)}</span>
                  <span className="text-[10px] block font-bold text-on-surface-variant dark:text-slate-300 bg-surface-variant dark:bg-slate-700 px-2 py-0.5 rounded-md mt-1 text-center">
                    {beta > 1.2 ? 'Agresif (Tinggi)' : beta > 0.8 ? 'Moderat' : 'Defensif (Rendah)'}
                  </span>
                </div>
              </div>
              
              {/* Bottom 3-column Risk metrics grid */}
              <div className="pt-4 mt-2 border-t border-outline-variant/10 dark:border-white/10 grid grid-cols-3 gap-2">
                <div className="bg-surface-container-low/30 dark:bg-white/5 p-2 rounded-lg flex flex-col justify-between hover:bg-white/10 transition-colors">
                  <span className="text-[9px] text-on-surface-variant dark:text-slate-400 uppercase font-bold text-center block">Sharpe Ratio</span>
                  <span className="font-bold text-xs dark:text-white text-center mt-1 block">{sharpe.toFixed(2)}</span>
                </div>
                <div className="bg-surface-container-low/30 dark:bg-white/5 p-2 rounded-lg flex flex-col justify-between hover:bg-white/10 transition-colors">
                  <span className="text-[9px] text-on-surface-variant dark:text-slate-400 uppercase font-bold text-center block">Treynor Ratio</span>
                  <span className="font-bold text-xs dark:text-white text-center mt-1 block">{treynor.toFixed(2)}</span>
                </div>
                <div className="bg-surface-container-low/30 dark:bg-white/5 p-2 rounded-lg flex flex-col justify-between hover:bg-white/10 transition-colors">
                  <span className="text-[9px] text-on-surface-variant dark:text-slate-400 uppercase font-bold text-center block">Std. Dev</span>
                  <span className="font-bold text-xs dark:text-white text-center mt-1 block">{stdDev.toFixed(1)}%</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Quick Heatmap preview */}
          <div 
            className="bg-surface-container-low dark:bg-transparent dark:border dark:border-white/10 p-6 rounded-[24px] hover:shadow-md transition-shadow group"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-headline text-xs uppercase tracking-widest font-bold text-on-surface dark:text-white group-hover:text-primary dark:group-hover:text-[#a7c8ff] transition-colors">Peta Panas Sektor</h3>
              <div className="w-16 h-1.5 rounded-full bg-gradient-to-r from-error dark:from-error-container via-surface-container-high dark:via-slate-600 to-tertiary-fixed-dim dark:to-tertiary-fixed"></div>
            </div>
            <div className="grid grid-cols-3 gap-2 h-24">
              <div className="rounded-lg p-3 flex flex-col justify-between transition-colors bg-orange-500/10 border border-orange-500/20">
                <span className="text-[10px] text-orange-500 font-bold uppercase">Saham</span>
                <span className="text-sm font-bold text-slate-800 dark:text-white">+{sectorPerformance.saham?.percentChange.toFixed(1)}%</span>
              </div>
              <div className="rounded-lg p-3 flex flex-col justify-between transition-colors bg-blue-500/10 border border-blue-500/20">
                <span className="text-[10px] text-blue-500 font-bold uppercase">Kolektif</span>
                <span className="text-sm font-bold text-slate-800 dark:text-white">+{sectorPerformance.reksadana?.percentChange.toFixed(1)}%</span>
              </div>
              <div className="rounded-lg p-3 flex flex-col justify-between transition-colors bg-emerald-500/10 border border-emerald-500/20">
                <span className="text-[10px] text-emerald-500 font-bold uppercase">SBN</span>
                <span className="text-sm font-bold text-slate-800 dark:text-white">+{sectorPerformance.sbn?.percentChange.toFixed(1)}%</span>
              </div>
            </div>
          </div>
        </section>

        {/* Visualisasi Alokasi Modal (Treemap Mockup sorted dynamically) */}
        <section className="lg:col-span-8 bg-surface-container-lowest dark:bg-transparent border border-outline-variant/10 dark:border-white/10 p-6 lg:p-8 rounded-[24px] shadow-sm flex flex-col justify-between">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 gap-2">
            <h3 className="font-headline text-sm uppercase tracking-widest font-bold text-on-surface dark:text-white">Visualisasi Alokasi Modal Sektoral</h3>
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant dark:text-slate-400 bg-surface-container-low dark:bg-white/5 py-1 px-2.5 rounded shadow-sm">
              <span className="material-symbols-outlined text-sm">pie_chart</span> Porsi Portofolio
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-5 md:grid-rows-2 gap-3 h-auto md:h-72">
            {renderOrder.map((key, index) => {
              const isMain = index === 0;
              const meta = SECTORS_META[key as keyof typeof SECTORS_META];
              const perf = sectorPerformance[key] || { totalInitial: 0, totalMarketValue: 0, pl: 0, percentChange: 0, itemCount: 0 };
              const pct = key === 'saham' ? pctSaham : key === 'reksadana' ? pctReksadana : pctSbn;
              
              let cardBg = '';
              let textCol = '';
              let titleCol = '';
              let pctBadge = '';
              let hoverBorder = '';
              let icon = meta.icon;
              
              if (key === 'saham') {
                cardBg = isMain 
                  ? 'bg-gradient-to-br from-[#f97316] to-[#d97706] text-white' 
                  : 'bg-orange-50/50 dark:bg-orange-500/5 border border-orange-100 dark:border-orange-500/10 text-orange-600 dark:text-orange-400';
                textCol = isMain ? 'text-white/80' : 'text-orange-600 dark:text-orange-450';
                titleCol = isMain ? 'text-white' : 'text-slate-800 dark:text-slate-200';
                pctBadge = isMain ? 'bg-white/15 text-white' : 'bg-orange-500/10 text-orange-600 dark:text-orange-400';
                hoverBorder = 'hover:border-orange-500';
              } else if (key === 'reksadana') {
                cardBg = isMain 
                  ? 'bg-gradient-to-br from-[#3b82f6] to-[#2563eb] text-white' 
                  : 'bg-blue-50/50 dark:bg-blue-500/5 border border-blue-100 dark:border-blue-500/10 text-blue-600 dark:text-blue-400';
                textCol = isMain ? 'text-white/80' : 'text-blue-600 dark:text-blue-400';
                titleCol = isMain ? 'text-white' : 'text-slate-800 dark:text-slate-200';
                pctBadge = isMain ? 'bg-white/15 text-white' : 'bg-blue-500/10 text-blue-600 dark:text-blue-400';
                hoverBorder = 'hover:border-blue-500';
              } else {
                cardBg = isMain 
                  ? 'bg-gradient-to-br from-[#10b981] to-[#059669] text-white' 
                  : 'bg-emerald-50/50 dark:bg-emerald-500/5 border border-emerald-100 dark:border-emerald-500/10 text-emerald-600 dark:text-emerald-400';
                textCol = isMain ? 'text-white/80' : 'text-emerald-600 dark:text-emerald-450';
                titleCol = isMain ? 'text-white' : 'text-slate-800 dark:text-slate-200';
                pctBadge = isMain ? 'bg-white/15 text-white' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-450';
                hoverBorder = 'hover:border-emerald-500';
              }

              const targetPct = key === 'saham' ? 50 : key === 'reksadana' ? 30 : 20;
              const deviation = pct - targetPct;
              const devText = deviation === 0 
                ? 'On Target' 
                : `${deviation > 0 ? '+' : ''}${deviation}% deviasi`;

              return (
                <div 
                  key={key}
                  className={`rounded-[20px] p-6 flex flex-col justify-between group cursor-pointer border-2 border-transparent transition-all shadow-md relative overflow-hidden ${cardBg} ${hoverBorder} ${
                    isMain ? 'md:col-span-3 md:row-span-2 h-auto md:h-72' : 'md:col-span-2'
                  }`}
                  onClick={() => toggleSector(key)}
                >
                  <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-125 transition-transform duration-700 pointer-events-none">
                    <span className="material-symbols-outlined text-9xl">{icon}</span>
                  </div>
                  <div className="relative z-10 flex flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className={`text-[10px] md:text-xs font-bold uppercase tracking-widest px-2.5 py-1 rounded ${pctBadge}`}>{pct}% Portofolio</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${isMain ? 'bg-white/10 text-white' : (deviation > 0 ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' : 'bg-blue-500/10 text-blue-600 dark:text-blue-400')}`}>{devText}</span>
                    </div>
                    <h4 className={`font-headline font-bold mt-2 ${isMain ? 'text-2xl md:text-3xl text-white' : 'text-lg md:text-xl text-on-surface dark:text-white'}`}>{meta.name}</h4>
                  </div>
                  <div className="flex justify-between items-end relative z-10 mt-6 md:mt-0">
                    <div className="flex flex-col">
                      <span className={`text-xl md:text-2xl font-bold tabular-nums ${perf.percentChange >= 0 ? (isMain ? 'text-white' : 'text-green-500') : (isMain ? 'text-white' : 'text-red-500')}`}>
                        {perf.percentChange >= 0 ? '+' : ''}{perf.percentChange.toFixed(1)}%
                      </span>
                      <span className={`text-[10px] ${isMain ? 'text-white/60' : 'text-slate-400 dark:text-slate-500'} font-medium`}>Target: {targetPct}%</span>
                    </div>
                    {isMain && (
                      <span className="material-symbols-outlined text-white opacity-20 group-hover:opacity-100 transition-opacity translate-y-2 group-hover:translate-y-0 text-3xl">trending_up</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Advisor Insight Box */}
        <section className="lg:col-span-4 flex flex-col">
          <div className="bg-primary dark:bg-gradient-to-br dark:from-[#00174a] dark:to-[#002366] p-6 lg:p-8 rounded-[24px] text-white relative overflow-hidden h-full flex flex-col justify-center shadow-lg group">
            <div className="absolute -right-4 -top-4 opacity-5 group-hover:rotate-12 group-hover:scale-110 transition-all duration-700 pointer-events-none">
              <span className="material-symbols-outlined text-9xl text-white">lightbulb</span>
            </div>
            <h3 className="font-headline text-sm uppercase tracking-widest font-bold mb-6 flex items-center gap-2 relative z-10 text-tertiary-fixed-dim dark:text-tertiary-fixed">
              <span className="material-symbols-outlined text-lg">insights</span> Wawasan Riset & Analitik
            </h3>
            <div className="space-y-4 relative z-10">
              <div 
                className="bg-white/10 dark:bg-white/5 p-5 rounded-2xl border border-white/10 backdrop-blur-md hover:bg-white/20 transition-colors"
              >
                <p className="text-[10px] text-primary-fixed dark:text-[#a7c8ff] font-bold uppercase tracking-widest mb-2 flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">flag</span> Strategi Benchmark</p>
                <p className="text-sm md:text-xs lg:text-sm leading-relaxed text-blue-50">Portofolio Anda mempertahankan <strong className="text-white">Alpha Positif</strong> sebesar {liveAlpha.toFixed(1)}% vs IHSG. Kelebihan return didominasi kuat oleh efek pemilihan aset saham ekuitas Anda.</p>
              </div>
              <div 
                className="bg-white/10 dark:bg-white/5 p-5 rounded-2xl border border-white/10 backdrop-blur-md hover:bg-white/20 transition-colors"
              >
                <p className="text-[10px] text-tertiary-fixed dark:text-tertiary-fixed font-bold uppercase tracking-widest mb-2 flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">my_location</span> Peluang Strategis</p>
                <p className="text-sm md:text-xs lg:text-sm leading-relaxed text-blue-50">Sektor <strong className="text-white">{worstSectorName}</strong> ({worstSectorRet.toFixed(1)}%) adalah alokasi dengan performa terendah Anda. Evaluasi diversifikasi berkala disarankan.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Breakdown Performa Sektor Table */}
        <section className="col-span-1 lg:col-span-12">
          <div className="bg-surface-container-lowest dark:bg-transparent rounded-[24px] shadow-sm overflow-hidden border border-outline-variant/10 dark:border-white/10">
            <div className="p-6 lg:p-8 border-b border-outline-variant/10 dark:border-white/10">
              <h3 className="font-headline text-sm uppercase tracking-widest font-bold text-on-surface dark:text-white">Rincian Performa Sektoral</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-surface-container-low/50 dark:bg-white/5 text-on-surface-variant dark:text-outline text-[10px] font-bold uppercase tracking-widest">
                    <th className="px-6 lg:px-8 py-5">Sektor & Emiten</th>
                    <th className="px-6 lg:px-8 py-5 text-right">Total Investasi (IDR)</th>
                    <th className="px-6 lg:px-8 py-5 text-right">Capital Gain/Loss</th>
                    <th className="px-6 lg:px-8 py-5 text-right">Yield Dividen (Est)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/5 dark:divide-white/5">
                  {renderOrder.map((sectorKey) => {
                    const meta = SECTORS_META[sectorKey as keyof typeof SECTORS_META];
                    const perf = sectorPerformance[sectorKey] || { totalInitial: 0, totalMarketValue: 0, pl: 0, percentChange: 0, itemCount: 0 };
                    const items = sectorAssets[sectorKey] || [];
                    const isExpanded = expandedSector === sectorKey;
                    
                    const pct = sectorKey === 'saham' ? pctSaham : sectorKey === 'reksadana' ? pctReksadana : pctSbn;
                    const targetPct = sectorKey === 'saham' ? 50 : sectorKey === 'reksadana' ? 30 : 20;
                    const deviation = pct - targetPct;

                    return (
                      <React.Fragment key={sectorKey}>
                        <tr 
                          className="group hover:bg-surface-bright/50 dark:hover:bg-white/5 transition-all cursor-pointer" 
                          onClick={() => toggleSector(sectorKey)}
                        >
                          <td className="px-6 lg:px-8 py-6">
                            <div className="flex items-center gap-4">
                              <div className={`w-10 h-10 rounded-xl ${meta.iconBg} flex items-center justify-center`}>
                                <span className="material-symbols-outlined">{meta.icon}</span>
                              </div>
                              <div>
                                <span className="font-headline font-bold text-on-surface dark:text-white block group-hover:text-primary dark:group-hover:text-[#a7c8ff] transition-colors flex items-center gap-2">
                                  {meta.name}
                                  <span className={`material-symbols-outlined text-lg transition-transform ${isExpanded ? 'rotate-180' : ''}`}>expand_more</span>
                                </span>
                                <span className="text-xs text-on-surface-variant dark:text-slate-400">
                                  {perf.itemCount} Aset Aktif • Porsi: <strong className="dark:text-slate-200">{pct}%</strong> <span className="text-[10px] text-slate-450 dark:text-slate-500">(Target: {targetPct}% | Dev: {deviation > 0 ? '+' : ''}{deviation}%)</span>
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 lg:px-8 py-6 text-right tabular-nums font-semibold text-sm dark:text-slate-300">
                            Rp {perf.totalMarketValue.toLocaleString('id-ID')}
                          </td>
                          <td className={`px-6 lg:px-8 py-6 text-right tabular-nums font-bold text-sm transition-colors duration-500 ${perf.percentChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {perf.percentChange >= 0 ? '+' : ''}{perf.percentChange.toFixed(2)}%
                          </td>
                          <td className="px-6 lg:px-8 py-6 text-right tabular-nums text-on-surface-variant dark:text-slate-400 text-sm">
                            {meta.divYield}
                          </td>
                        </tr>

                        {/* Accordion detail */}
                        {isExpanded && (
                          <tr className="bg-surface-container-low/30 dark:bg-white/5">
                            <td colSpan={4} className="px-6 lg:px-12 py-6 border-b border-outline-variant/10 dark:border-white/10">
                              {items.length === 0 ? (
                                <p className="text-xs text-on-surface-variant dark:text-slate-400 italic">Tidak ada instrumen aktif di sektor ini.</p>
                              ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 animate-in slide-in-from-top-4 fade-in duration-300">
                                  {items.map((item) => {
                                    const ticker = item.ticker || item.title;
                                    const initial = item.initial;
                                    const marketValue = item.marketValue;
                                    const itemReturn = item.percentChange;
                                    const isFixedIncome = item.isFixedIncome;
                                    const couponsReceived = item.couponsReceived;

                                    return (
                                      <div 
                                        key={item.id}
                                        className="bg-surface-container-lowest dark:bg-black/20 p-4 rounded-xl border border-outline-variant/10 dark:border-white/10 transition-colors"
                                      >
                                        <div className="flex justify-between items-start mb-2">
                                          <span className="text-xs font-bold font-headline text-primary dark:text-[#a7c8ff] truncate max-w-[120px]">{ticker}</span>
                                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold tracking-widest transition-colors duration-500 ${itemReturn >= 0 ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                                            {itemReturn >= 0 ? '+' : ''}{itemReturn.toFixed(1)}%
                                          </span>
                                        </div>
                                        <div className="flex flex-col gap-0.5">
                                          <span className="text-xs font-semibold text-on-surface dark:text-white">Rp {marketValue.toLocaleString('id-ID')}</span>
                                          <span className="text-[9px] text-on-surface-variant dark:text-slate-400">Modal: Rp {initial.toLocaleString('id-ID')}</span>
                                          {isFixedIncome && couponsReceived > 0 && (
                                            <span className="text-[9px] text-slate-400 dark:text-slate-500 font-semibold mt-0.5">Kupon: +{formatM(couponsReceived)}</span>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>

      </div>

      {/* Metric Footer Summary */}
      <footer className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 lg:gap-6">
        <div className="bg-primary/5 dark:bg-white/5 p-6 rounded-[20px] border-l-4 border-primary dark:border-[#a7c8ff] flex flex-col justify-center">
          <span className="text-[10px] font-bold text-on-surface-variant dark:text-slate-400 uppercase tracking-widest block mb-2">Total Nilai Sektoral</span>
          <span className="text-xl md:text-2xl font-headline font-extrabold text-primary dark:text-white truncate">
            {formatM(totalMarketValueAll)}
          </span>
        </div>
        <div className="bg-tertiary-fixed-dim/20 dark:bg-tertiary-fixed/10 p-6 rounded-[20px] border-l-4 border-tertiary-container dark:border-tertiary-fixed flex flex-col justify-center">
          <span className="text-[10px] font-bold text-on-surface-variant dark:text-slate-400 uppercase tracking-widest block mb-1">Alpha Portofolio</span>
          <span className="text-sm font-bold text-tertiary-container dark:text-tertiary-fixed mb-1 flex items-center gap-1 transition-colors duration-500">
            {liveAlpha >= 0 ? '+' : ''}{liveAlpha.toFixed(2)}% vs IHSG
          </span>
          <span className="text-xl md:text-2xl font-headline font-extrabold text-tertiary-container dark:text-tertiary-fixed truncate">Live Analysis</span>
        </div>
        <div className="bg-error-container/20 dark:bg-error/10 p-6 rounded-[20px] border-l-4 border-error dark:border-[#ffb4ab] flex flex-col justify-center">
          <span className="text-[10px] font-bold text-on-surface-variant dark:text-slate-400 uppercase tracking-widest block mb-2">Sektor Underperform</span>
          <span className="text-xl md:text-2xl font-headline font-extrabold text-error dark:text-[#ffb4ab] truncate">
            {worstSectorName} ({worstSectorRet.toFixed(1)}%)
          </span>
        </div>
      </footer>

    </div>
  );
};

export default FinancePerformanceReport;
