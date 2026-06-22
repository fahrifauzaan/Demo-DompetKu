import React, { useState, useMemo } from 'react';
import { FeatureCTA } from './MarketingCTAModal';
import { useFinanceStore } from '../store/useFinanceStore';
import TaxGuideModal from './TaxGuideModal';

interface FinanceEquityLedgerProps {
  onShowCTA: (feature?: FeatureCTA) => void;
  onNavigate?: (tab: string) => void;
  onBack?: () => void;
}

// ===================== TYPES =====================

interface AssetClassSummary {
  label: string;
  icon: string;
  color: string;
  bgColor: string;
  darkColor: string;
  darkBgColor: string;
  totalCostBasis: number;
  totalMarketValue: number;
  unrealizedPL: number;
  unrealizedPLPercent: number;
  count: number;
}

type InstrumentStatus = 'active' | 'matured' | 'liquidated';

interface LedgerRow {
  id: string;
  date: string;
  ref: string;
  ticker: string;
  title: string;
  assetClass: string;
  assetClassLabel: string;
  type: 'Pembelian' | 'Penjualan' | 'Dividen Tunai' | 'Kupon' | 'Corporate Action';
  status: InstrumentStatus;
  volume: string;
  avgCost: number;
  lastPrice: number;
  costBasis: number;
  marketValue: number;
  unrealizedPL: number;
  unrealizedPLPercent: number;
  amount: number;
  isPositive: boolean;
  realizedProceeds?: number;
}

// ===================== HELPERS =====================

const ASSET_CLASS_CONFIG: Record<string, { label: string; icon: string; color: string; bgColor: string; darkColor: string; darkBgColor: string }> = {
  saham: { label: 'Saham', icon: 'show_chart', color: 'text-blue-600', bgColor: 'bg-blue-50', darkColor: 'text-blue-400', darkBgColor: 'bg-blue-900/20' },
  reksadana: { label: 'Reksadana', icon: 'account_balance', color: 'text-emerald-600', bgColor: 'bg-emerald-50', darkColor: 'text-emerald-400', darkBgColor: 'bg-emerald-900/20' },
  sbn: { label: 'SBN / Obligasi', icon: 'assured_workload', color: 'text-amber-600', bgColor: 'bg-amber-50', darkColor: 'text-amber-400', darkBgColor: 'bg-amber-900/20' },
  kripto: { label: 'Kripto', icon: 'currency_bitcoin', color: 'text-purple-600', bgColor: 'bg-purple-50', darkColor: 'text-purple-400', darkBgColor: 'bg-purple-900/20' },
  deposito: { label: 'Deposito', icon: 'savings', color: 'text-teal-600', bgColor: 'bg-teal-50', darkColor: 'text-teal-400', darkBgColor: 'bg-teal-900/20' },
};

const getAssetClassKey = (subType?: string): string => {
  if (!subType) return 'sbn';
  const lower = subType.toLowerCase();
  if (lower === 'saham') return 'saham';
  if (lower === 'reksadana') return 'reksadana';
  if (lower === 'kripto') return 'kripto';
  if (lower === 'deposito') return 'deposito';
  return 'sbn';
};

const formatCurrency = (val: number, compact?: boolean): string => {
  if (compact) {
    if (Math.abs(val) >= 1e12) return `Rp ${(val / 1e12).toFixed(2)}T`;
    if (Math.abs(val) >= 1e9) return `Rp ${(val / 1e9).toFixed(2)}M`;
    if (Math.abs(val) >= 1e6) return `Rp ${(val / 1e6).toFixed(1)}Jt`;
    if (Math.abs(val) >= 1e3) return `Rp ${(val / 1e3).toFixed(0)}Rb`;
  }
  return `Rp ${val.toLocaleString('id-ID')}`;
};

const formatDate = (dateStr: string): string => {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
};

// ===================== COMPONENT =====================

const FinanceEquityLedger: React.FC<FinanceEquityLedgerProps> = ({ onShowCTA, onBack }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClass, setFilterClass] = useState<string>('Semua');
  const [filterType, setFilterType] = useState<string>('Semua');
  const [showSearchInput, setShowSearchInput] = useState(false);
  const [viewMode, setViewMode] = useState<'holdings' | 'activity'>('holdings');
  const [showMatured, setShowMatured] = useState(false);
  const [showTaxGuideModal, setShowTaxGuideModal] = useState(false);
  const [taxGuideInitialTab, setTaxGuideInitialTab] = useState('saham');

  const assets = useFinanceStore((state) => state.assets);
  const transactions = useFinanceStore((state) => state.transactions);
  const isSyncing = useFinanceStore((state) => state.isSyncing);
  const syncFromGoogleSheets = useFinanceStore((state) => state.syncFromGoogleSheets);

  // ===================== DERIVED DATA =====================

  // All investment assets (no hardcoded enrichment)
  const allInvestmentAssets = useMemo(() => {
    return assets.filter(a => a.category === 'investasi');
  }, [assets]);

  // Determine instrument status: active vs matured/liquidated
  const getInstrumentStatus = (a: any): InstrumentStatus => {
    const costBasis = a.purchasePrice || 0;
    const marketValue = a.currentValue || 0;
    const notesLower = (a.notes || '').toLowerCase();

    // If currentValue is 0 but had a costBasis, check if it was matured/liquidated
    if (marketValue === 0 && costBasis > 0) {
      // Check maturity date
      if (a.maturityDate) {
        const maturity = new Date(a.maturityDate);
        if (!isNaN(maturity.getTime()) && maturity <= new Date()) return 'matured';
      }
      // Check notes for liquidation indicators
      if (notesLower.includes('dicairkan') || notesLower.includes('jatuh tempo') || notesLower.includes('matured') || notesLower.includes('liquidated')) {
        return 'matured';
      }
      // Check if there's a pencairan/maturity transaction for this instrument
      const titleLower = (a.title || '').toLowerCase();
      const tickerLower = (a.ticker || '').toLowerCase();
      const hasLiquidationTx = transactions.some(t => {
        const descLower = (t.desc || '').toLowerCase();
        const isLiquidation = descLower.includes('pencairan') || descLower.includes('jatuh tempo') || descLower.includes('mature');
        const matchesInstrument = descLower.includes(titleLower.slice(0, 8)) || (tickerLower && descLower.includes(tickerLower));
        return isLiquidation && matchesInstrument;
      });
      if (hasLiquidationTx) return 'liquidated';
      // Default: if SBN/deposito with 0 value, likely matured
      const classKey = getAssetClassKey(a.subType);
      if (classKey === 'sbn' || classKey === 'deposito') return 'matured';
      return 'liquidated';
    }
    return 'active';
  };

  // Split into active and matured
  const activeAssets = useMemo(() => {
    return allInvestmentAssets.filter(a => getInstrumentStatus(a) === 'active');
  }, [allInvestmentAssets, transactions]);

  const maturedAssets = useMemo(() => {
    return allInvestmentAssets.filter(a => getInstrumentStatus(a) !== 'active');
  }, [allInvestmentAssets, transactions]);

  // Per-class summaries (only active assets)
  const classSummaries = useMemo((): Record<string, AssetClassSummary> => {
    const summaries: Record<string, AssetClassSummary> = {};

    activeAssets.forEach(a => {
      const classKey = getAssetClassKey(a.subType);
      const config = ASSET_CLASS_CONFIG[classKey] || ASSET_CLASS_CONFIG['sbn'];

      if (!summaries[classKey]) {
        summaries[classKey] = {
          ...config,
          totalCostBasis: 0,
          totalMarketValue: 0,
          unrealizedPL: 0,
          unrealizedPLPercent: 0,
          count: 0,
        };
      }

      const costBasis = a.purchasePrice || 0;
      const marketValue = a.currentValue || 0;

      summaries[classKey].totalCostBasis += costBasis;
      summaries[classKey].totalMarketValue += marketValue;
      summaries[classKey].count += 1;
    });

    // Calculate percentages
    Object.values(summaries).forEach(s => {
      s.unrealizedPL = s.totalMarketValue - s.totalCostBasis;
      s.unrealizedPLPercent = s.totalCostBasis > 0 ? (s.unrealizedPL / s.totalCostBasis) * 100 : 0;
    });

    return summaries;
  }, [activeAssets]);

  // Aggregate KPIs (only active instruments for unrealized metrics)
  const kpis = useMemo(() => {
    const totalCostBasis = Object.values(classSummaries).reduce((s, c) => s + c.totalCostBasis, 0);
    const totalMarketValue = Object.values(classSummaries).reduce((s, c) => s + c.totalMarketValue, 0);
    const unrealizedPL = totalMarketValue - totalCostBasis;
    const unrealizedPLPercent = totalCostBasis > 0 ? (unrealizedPL / totalCostBasis) * 100 : 0;

    // Dividend & Coupon income from transactions
    const incomeTransactions = transactions.filter(t => {
      const descLower = (t.desc || '').toLowerCase();
      return (
        descLower.includes('dividen') || descLower.includes('dividend') ||
        descLower.includes('kupon') || descLower.includes('coupon') ||
        descLower.includes('imbalan')
      );
    });
    const totalDividendCoupon = incomeTransactions.reduce((s, t) => s + Math.abs(t.amount || 0), 0);

    // Realized gains from sales
    const saleTransactions = transactions.filter(t => {
      const descLower = (t.desc || '').toLowerCase();
      return (
        descLower.includes('jual') || descLower.includes('penjualan') ||
        descLower.includes('sell') || descLower.includes('pencairan')
      );
    });
    const totalRealizedSales = saleTransactions.reduce((s, t) => s + Math.abs(t.amount || 0), 0);

    // Tax estimation per asset class
    let estTax = 0;
    const sahamSales = saleTransactions.filter(t => {
      const d = (t.desc || '').toLowerCase();
      return !d.includes('sbn') && !d.includes('sukuk') && !d.includes('obligasi') && !d.includes('kripto') && !d.includes('crypto') && !d.includes('reksadana') && !d.includes('deposito');
    });
    estTax += sahamSales.reduce((s, t) => s + Math.abs(t.amount || 0) * 0.001, 0);

    const sbnIncome = incomeTransactions.filter(t => {
      const d = (t.desc || '').toLowerCase();
      return d.includes('kupon') || d.includes('coupon') || d.includes('imbalan') || d.includes('sbn') || d.includes('sukuk') || d.includes('obligasi') || d.includes('st0');
    });
    estTax += sbnIncome.reduce((s, t) => s + Math.abs(t.amount || 0) * 0.10, 0);

    const kriptoSales = saleTransactions.filter(t => {
      const d = (t.desc || '').toLowerCase();
      return d.includes('kripto') || d.includes('crypto') || d.includes('bitcoin') || d.includes('btc') || d.includes('eth');
    });
    estTax += kriptoSales.reduce((s, t) => s + Math.abs(t.amount || 0) * 0.001, 0);

    const yieldOnCost = totalCostBasis > 0 ? (totalDividendCoupon / totalCostBasis) * 100 : 0;

    return {
      totalCostBasis,
      totalMarketValue,
      unrealizedPL,
      unrealizedPLPercent,
      totalDividendCoupon,
      totalRealizedSales,
      estTax: Math.round(estTax),
      yieldOnCost,
      activeCount: activeAssets.length,
      maturedCount: maturedAssets.length,
    };
  }, [classSummaries, transactions, activeAssets, maturedAssets]);

  // ===================== HELPER: Build row from asset =====================
  const buildAssetRow = (a: any): LedgerRow => {
    const classKey = getAssetClassKey(a.subType);
    const config = ASSET_CLASS_CONFIG[classKey] || ASSET_CLASS_CONFIG['sbn'];
    const status = getInstrumentStatus(a);
    const shares = a.shares || 1;
    const avgCost = a.avgCost || (a.purchasePrice / shares) || 0;
    const lastPrice = status === 'active' ? (a.currentPrice || a.currentNav || (a.currentValue / shares) || 0) : 0;
    const costBasis = a.purchasePrice || (avgCost * shares);
    const marketValue = status === 'active' ? (a.currentValue || (lastPrice * shares)) : 0;

    // For matured/liquidated instruments: P/L should reflect that principal was returned
    // Not a loss — the capital moved to a bank account
    const unrealizedPL = status === 'active' ? (marketValue - costBasis) : 0;
    const unrealizedPLPercent = status === 'active' && costBasis > 0 ? (unrealizedPL / costBasis) * 100 : 0;

    // Find realized proceeds for matured instruments
    let realizedProceeds = 0;
    if (status !== 'active') {
      const titleLower = (a.title || '').toLowerCase();
      const tickerLower = (a.ticker || '').toLowerCase();
      const relatedTx = transactions.filter(t => {
        const descLower = (t.desc || '').toLowerCase();
        const isLiquidation = descLower.includes('pencairan') || descLower.includes('jatuh tempo') || descLower.includes('mature') || descLower.includes('penjualan');
        const matchesInstrument = descLower.includes(titleLower.slice(0, 8)) || (tickerLower && descLower.includes(tickerLower));
        return isLiquidation && matchesInstrument;
      });
      realizedProceeds = relatedTx.reduce((s, t) => s + Math.abs(t.amount || 0), 0);
    }

    let volumeStr: string;
    if (classKey === 'saham') {
      const lots = shares / 100;
      volumeStr = lots >= 1 ? `${lots.toLocaleString('id-ID')} Lot` : `${shares.toLocaleString('id-ID')} Lbr`;
    } else if (classKey === 'reksadana') {
      volumeStr = `${shares.toLocaleString('id-ID', { maximumFractionDigits: 2 })} Unit`;
    } else if (classKey === 'kripto') {
      volumeStr = `${shares.toLocaleString('id-ID', { maximumFractionDigits: 8 })} Koin`;
    } else {
      volumeStr = shares === 1 ? 'Pokok' : `${shares.toLocaleString('id-ID')} Unit`;
    }

    return {
      id: a.id,
      date: a.purchaseDate || '',
      ref: `REF-${(a.purchaseDate || '').replace(/-/g, '').slice(0, 8)}-${a.ticker || classKey.toUpperCase()}`,
      ticker: a.ticker || classKey.toUpperCase(),
      title: a.title,
      assetClass: classKey,
      assetClassLabel: config.label,
      type: 'Pembelian' as const,
      status,
      volume: volumeStr,
      avgCost,
      lastPrice,
      costBasis,
      marketValue,
      unrealizedPL,
      unrealizedPLPercent,
      amount: costBasis,
      isPositive: false,
      realizedProceeds: realizedProceeds || undefined,
    };
  };

  // ===================== HOLDINGS TABLE (Active only) =====================
  const holdingsRows = useMemo((): LedgerRow[] => {
    return activeAssets.map(buildAssetRow).sort((a, b) => b.marketValue - a.marketValue);
  }, [activeAssets, transactions]);

  // ===================== MATURED INSTRUMENTS =====================
  const maturedRows = useMemo((): LedgerRow[] => {
    return maturedAssets.map(buildAssetRow).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [maturedAssets, transactions]);

  // ===================== ACTIVITY TABLE =====================
  const activityRows = useMemo((): LedgerRow[] => {
    return transactions
      .filter(t => {
        const descLower = (t.desc || '').toLowerCase();
        const catLower = (t.category || '').toLowerCase();
        const isDividend = descLower.includes('dividen') || descLower.includes('dividend');
        const isCoupon = descLower.includes('kupon') || descLower.includes('coupon') || descLower.includes('imbalan');
        const isSale = descLower.includes('jual') || descLower.includes('penjualan') || descLower.includes('sell') || descLower.includes('pencairan');
        const isPurchase = descLower.includes('beli') || descLower.includes('pembelian') || descLower.includes('buy') || descLower.includes('top up');
        const isInvestment = catLower.includes('investasi') || catLower.includes('pasar') || descLower.includes('saham') || descLower.includes('reksadana') || descLower.includes('sbn') || descLower.includes('sukuk') || descLower.includes('obligasi') || descLower.includes('kripto') || descLower.includes('crypto');
        return (isDividend || isCoupon || isSale || isPurchase) && isInvestment;
      })
      .map(t => {
        const descLower = (t.desc || '').toLowerCase();
        let type: LedgerRow['type'] = 'Pembelian';
        if (descLower.includes('dividen') || descLower.includes('dividend')) type = 'Dividen Tunai';
        else if (descLower.includes('kupon') || descLower.includes('coupon') || descLower.includes('imbalan')) type = 'Kupon';
        else if (descLower.includes('jual') || descLower.includes('penjualan') || descLower.includes('sell') || descLower.includes('pencairan')) type = 'Penjualan';

        // Determine asset class from description
        let assetClass = 'saham';
        if (descLower.includes('reksadana') || descLower.includes('schroder') || descLower.includes('bibit') || descLower.includes('vti')) assetClass = 'reksadana';
        else if (descLower.includes('sbn') || descLower.includes('sukuk') || descLower.includes('obligasi') || descLower.includes('st0') || descLower.includes('sr0') || descLower.includes('ori0')) assetClass = 'sbn';
        else if (descLower.includes('kripto') || descLower.includes('crypto') || descLower.includes('bitcoin') || descLower.includes('btc') || descLower.includes('eth')) assetClass = 'kripto';
        else if (descLower.includes('deposito')) assetClass = 'deposito';

        const config = ASSET_CLASS_CONFIG[assetClass] || ASSET_CLASS_CONFIG['sbn'];

        // Extract ticker
        let ticker = assetClass.toUpperCase();
        const tickerPatterns = ['BBCA', 'BUMI', 'BRMS', 'TLKM', 'BBRI', 'BMRI', 'AAPL', 'TSLA', 'VTI', 'ST012', 'SR0', 'ORI0'];
        for (const p of tickerPatterns) {
          if (descLower.includes(p.toLowerCase())) { ticker = p; break; }
        }
        if (descLower.includes('schroder')) ticker = 'SCHRODER';

        return {
          id: `tx-${t.id}`,
          date: t.date,
          ref: `TX-${t.id}`,
          ticker,
          title: t.desc,
          assetClass,
          assetClassLabel: config.label,
          type,
          volume: '-',
          avgCost: 0,
          lastPrice: 0,
          costBasis: 0,
          marketValue: 0,
          unrealizedPL: 0,
          unrealizedPLPercent: 0,
          amount: Math.abs(t.amount),
          isPositive: type === 'Dividen Tunai' || type === 'Kupon' || type === 'Penjualan',
          status: 'active' as InstrumentStatus,
        };
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions]);

  // ===================== FILTERING =====================
  const currentRows = viewMode === 'holdings' ? holdingsRows : activityRows;

  const filteredRows = useMemo(() => {
    return currentRows.filter(row => {
      const matchesSearch =
        row.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        row.ticker.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesClass = filterClass === 'Semua' || row.assetClass === filterClass;
      
      let matchesType = true;
      if (viewMode === 'activity' && filterType !== 'Semua') {
        if (filterType === 'Pembelian') matchesType = row.type === 'Pembelian';
        else if (filterType === 'Penjualan') matchesType = row.type === 'Penjualan';
        else if (filterType === 'Pendapatan') matchesType = row.type === 'Dividen Tunai' || row.type === 'Kupon';
      }

      return matchesSearch && matchesClass && matchesType;
    });
  }, [currentRows, searchTerm, filterClass, filterType, viewMode]);

  // Holdings totals
  const holdingsTotals = useMemo(() => {
    if (viewMode !== 'holdings') return null;
    const totalCost = filteredRows.reduce((s, r) => s + r.costBasis, 0);
    const totalMarket = filteredRows.reduce((s, r) => s + r.marketValue, 0);
    const totalPL = totalMarket - totalCost;
    const totalPLPercent = totalCost > 0 ? (totalPL / totalCost) * 100 : 0;
    return { totalCost, totalMarket, totalPL, totalPLPercent };
  }, [filteredRows, viewMode]);

  // ===================== INSIGHTS (only active instruments) =====================
  const insights = useMemo(() => {
    if (holdingsRows.length === 0) return null;

    const bestPerformer = [...holdingsRows].sort((a, b) => b.unrealizedPLPercent - a.unrealizedPLPercent)[0];
    const worstPerformer = [...holdingsRows].sort((a, b) => a.unrealizedPLPercent - b.unrealizedPLPercent)[0];

    // Concentration check
    const totalValue = holdingsRows.reduce((s, r) => s + r.marketValue, 0);
    const concentrated = holdingsRows.find(r => totalValue > 0 && (r.marketValue / totalValue) > 0.4);

    return { bestPerformer, worstPerformer, concentrated, totalValue };
  }, [holdingsRows]);

  // ===================== ALLOCATION BAR DATA =====================
  const allocationData = useMemo(() => {
    const totalMarketValue = Object.values(classSummaries).reduce((s, c) => s + c.totalMarketValue, 0);
    return Object.entries(classSummaries)
      .map(([key, summary]) => ({
        key,
        ...summary,
        percentage: totalMarketValue > 0 ? (summary.totalMarketValue / totalMarketValue) * 100 : 0,
      }))
      .sort((a, b) => b.totalMarketValue - a.totalMarketValue);
  }, [classSummaries]);

  // ===================== ASSET CLASS BADGE COLORS =====================
  const getClassBadge = (classKey: string) => {
    const cfg = ASSET_CLASS_CONFIG[classKey];
    if (!cfg) return { text: 'text-slate-600 dark:text-slate-400', bg: 'bg-slate-100 dark:bg-slate-800/30' };
    return {
      text: `${cfg.color} dark:${cfg.darkColor}`,
      bg: `${cfg.bgColor} dark:${cfg.darkBgColor}`,
    };
  };

  // ===================== RENDER =====================
  return (
    <div className="space-y-5 sm:space-y-6 lg:space-y-10 animate-in fade-in duration-500 pb-8 lg:pb-12">

      {/* ── HEADER ── */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-6">
        <div className="space-y-2">
          {onBack && (
            <button
              onClick={onBack}
              className="group flex items-center gap-2 text-on-surface-variant dark:text-outline hover:text-primary dark:hover:text-[#a7c8ff] transition-colors mb-4"
            >
              <span className="material-symbols-outlined text-base group-hover:-translate-x-1 transition-transform">arrow_back</span>
              <span className="text-xs font-bold uppercase tracking-widest">Kembali ke Aset</span>
            </button>
          )}
          <h2 className="font-headline text-3xl lg:text-4xl font-extrabold tracking-tight text-on-surface dark:text-white">
            Buku Besar Ekuitas
          </h2>
          <p className="text-on-surface-variant dark:text-outline text-sm lg:text-base max-w-2xl leading-relaxed">
            Pencatatan struktural seluruh posisi portofolio investasi — mencakup saham, reksadana, SBN, dan kripto — beserta unrealized gain/loss dan estimasi kewajiban pajak.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => syncFromGoogleSheets()}
            disabled={isSyncing}
            className="flex items-center gap-2 px-5 py-2.5 bg-surface-container-high dark:bg-white/10 text-primary dark:text-[#a7c8ff] font-bold text-xs uppercase tracking-widest rounded-lg border border-outline-variant/20 dark:border-white/10 hover:bg-surface-container-highest dark:hover:bg-white/20 transition-all disabled:opacity-50"
          >
            <span className={`material-symbols-outlined text-sm ${isSyncing ? 'animate-spin' : ''}`}>sync</span>
            {isSyncing ? 'Menyinkronkan...' : 'Refresh Data'}
          </button>

          <button
            onClick={() => onShowCTA({ title: "Advanced Ledger Export", description: "Ekspor seluruh riwayat transaksi ekuitas dalam format CSV/Excel terstruktur untuk kebutuhan audit atau pelaporan pajak." })}
            className="px-5 py-2.5 bg-primary dark:bg-[#a7c8ff] text-white dark:text-[#001b3c] font-bold text-xs uppercase tracking-widest rounded-lg hover:shadow-lg transition-all"
          >
            Ekspor Data
          </button>
        </div>
      </header>

      {/* ── 6 KPI CARDS ── */}
      <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 lg:gap-4">
        {/* 1. Total Portfolio Value */}
        <div className="col-span-2 md:col-span-1 lg:col-span-2 bg-gradient-to-br from-primary/5 to-primary/10 dark:from-[#a7c8ff]/5 dark:to-[#a7c8ff]/10 border border-primary/10 dark:border-[#a7c8ff]/10 p-4 sm:p-5 lg:p-6 rounded-2xl relative overflow-hidden">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-primary/5 dark:bg-[#a7c8ff]/5 rounded-full blur-2xl" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant dark:text-outline block mb-1.5">Nilai Pasar Portofolio</span>
          <h3 className="text-2xl lg:text-3xl font-extrabold font-headline text-on-surface dark:text-white tabular-nums tracking-tighter">
            {formatCurrency(kpis.totalMarketValue, true)}
          </h3>
          <p className="text-[10px] font-bold text-on-surface-variant dark:text-slate-400 mt-1.5 uppercase tracking-wider">
            {kpis.activeCount} Aktif{kpis.maturedCount > 0 ? ` · ${kpis.maturedCount} Jatuh Tempo` : ''}
          </p>
        </div>

        {/* 2. Total Cost Basis */}
        <div className="bg-surface-container-lowest dark:bg-white/5 border border-outline-variant/10 dark:border-white/10 p-4 sm:p-5 lg:p-6 rounded-2xl">
          <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant dark:text-outline block mb-1.5">Nilai Perolehan</span>
          <h4 className="text-lg lg:text-xl font-bold font-headline text-on-surface dark:text-white tabular-nums tracking-tight">
            {formatCurrency(kpis.totalCostBasis, true)}
          </h4>
          <p className="text-[10px] font-bold text-on-surface-variant dark:text-slate-400 mt-1 uppercase tracking-wider">Cost Basis</p>
        </div>

        {/* 3. Unrealized P/L */}
        <div className="bg-surface-container-lowest dark:bg-white/5 border border-outline-variant/10 dark:border-white/10 p-4 sm:p-5 lg:p-6 rounded-2xl">
          <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant dark:text-outline block mb-1.5">Unrealized P/L</span>
          <h4 className={`text-lg lg:text-xl font-bold font-headline tabular-nums tracking-tight ${kpis.unrealizedPL >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
            {kpis.unrealizedPL >= 0 ? '+' : ''}{formatCurrency(kpis.unrealizedPL, true)}
          </h4>
          <p className={`text-[10px] font-bold mt-1 uppercase tracking-wider ${kpis.unrealizedPL >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
            {kpis.unrealizedPLPercent >= 0 ? '+' : ''}{kpis.unrealizedPLPercent.toFixed(2)}%
          </p>
        </div>

        {/* 4. Dividen & Kupon */}
        <div className="bg-surface-container-lowest dark:bg-white/5 border border-outline-variant/10 dark:border-white/10 p-4 sm:p-5 lg:p-6 rounded-2xl">
          <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant dark:text-outline block mb-1.5">Dividen & Kupon</span>
          <h4 className="text-lg lg:text-xl font-bold font-headline text-tertiary-container dark:text-tertiary-fixed tabular-nums tracking-tight">
            {formatCurrency(kpis.totalDividendCoupon, true)}
          </h4>
          <p className="text-[10px] font-bold text-tertiary-container dark:text-tertiary-fixed mt-1 uppercase tracking-wider">
            Yield {kpis.yieldOnCost.toFixed(2)}%
          </p>
        </div>

        {/* 5. Realized Sales */}
        <div className="bg-surface-container-lowest dark:bg-white/5 border border-outline-variant/10 dark:border-white/10 p-4 sm:p-5 lg:p-6 rounded-2xl">
          <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant dark:text-outline block mb-1.5">Realisasi Penjualan</span>
          <h4 className="text-lg lg:text-xl font-bold font-headline text-on-surface dark:text-white tabular-nums tracking-tight">
            {formatCurrency(kpis.totalRealizedSales, true)}
          </h4>
          <p className="text-[10px] font-bold text-on-surface-variant dark:text-slate-400 mt-1 uppercase tracking-wider">Total Proceeds</p>
        </div>

        {/* 6. Est. Tax */}
        <div className="bg-surface-container-lowest dark:bg-white/5 border border-outline-variant/10 dark:border-white/10 p-4 sm:p-5 lg:p-6 rounded-2xl">
          <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant dark:text-outline block mb-1.5">Est. Pajak</span>
          <h4 className="text-lg lg:text-xl font-bold font-headline text-error dark:text-[#ffb4ab] tabular-nums tracking-tight">
            {formatCurrency(kpis.estTax, true)}
          </h4>
          <p className="text-[10px] font-bold text-on-surface-variant dark:text-slate-400 mt-1 uppercase tracking-wider">PPh Final</p>
        </div>
      </section>

      {/* ── ALLOCATION BAR ── */}
      {allocationData.length > 0 && (
        <section className="bg-surface-container-low dark:bg-transparent rounded-2xl p-4 sm:p-6 lg:p-8 border border-outline-variant/10 dark:border-white/10">
          <h4 className="font-headline text-sm font-bold text-on-surface dark:text-white uppercase tracking-widest mb-5">
            Alokasi Portofolio per Kelas Aset
          </h4>

          {/* Allocation Bar */}
          <div className="w-full h-4 rounded-full overflow-hidden flex bg-surface-container-high dark:bg-white/10 mb-5">
            {allocationData.map((item, idx) => {
              const colors: Record<string, string> = {
                saham: 'bg-blue-500',
                reksadana: 'bg-emerald-500',
                sbn: 'bg-amber-500',
                kripto: 'bg-purple-500',
                deposito: 'bg-teal-500',
              };
              return (
                <div
                  key={item.key}
                  className={`${colors[item.key] || 'bg-slate-500'} transition-all duration-700 ${idx === 0 ? 'rounded-l-full' : ''} ${idx === allocationData.length - 1 ? 'rounded-r-full' : ''}`}
                  style={{ width: `${Math.max(item.percentage, 1)}%` }}
                  title={`${item.label}: ${item.percentage.toFixed(1)}%`}
                />
              );
            })}
          </div>

          {/* Legend */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {allocationData.map(item => {
              const dotColors: Record<string, string> = {
                saham: 'bg-blue-500',
                reksadana: 'bg-emerald-500',
                sbn: 'bg-amber-500',
                kripto: 'bg-purple-500',
                deposito: 'bg-teal-500',
              };
              return (
                <div key={item.key} className="flex items-start gap-3">
                  <div className={`w-3 h-3 rounded-full ${dotColors[item.key] || 'bg-slate-500'} mt-0.5 shrink-0`} />
                  <div>
                    <p className="text-xs font-bold text-on-surface dark:text-white">{item.label}</p>
                    <p className="text-[10px] text-on-surface-variant dark:text-slate-400 font-medium tabular-nums">
                      {formatCurrency(item.totalMarketValue, true)} ({item.percentage.toFixed(1)}%)
                    </p>
                    <p className={`text-[10px] font-bold tabular-nums ${item.unrealizedPL >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                      {item.unrealizedPL >= 0 ? '▲' : '▼'} {item.unrealizedPLPercent.toFixed(2)}%
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── MAIN LEDGER TABLE ── */}
      <section className="bg-surface-container-low dark:bg-transparent rounded-2xl overflow-hidden border border-outline-variant/10 dark:border-white/10 shadow-md">

        {/* Table Header Toolbar */}
        <div className="px-6 lg:px-8 py-5 flex flex-col gap-4 border-b border-outline-variant/10 dark:border-white/10 bg-white/50 dark:bg-white/5">
          {/* Top row: Title + View Toggle */}
          <div className="flex items-center justify-between">
            <h4 className="font-headline text-sm lg:text-base font-bold text-on-surface dark:text-white uppercase tracking-widest">
              {viewMode === 'holdings' ? 'Posisi Kepemilikan' : 'Riwayat Aktivitas'}
            </h4>

            {/* View Mode Toggle */}
            <div className="flex bg-surface-container-high dark:bg-white/5 p-1 rounded-lg border border-outline-variant/10 dark:border-white/5">
              <button
                onClick={() => { setViewMode('holdings'); setFilterType('Semua'); }}
                className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded flex items-center gap-1.5 transition-colors ${viewMode === 'holdings'
                  ? 'bg-primary dark:bg-[#a7c8ff] text-white dark:text-[#001b3c]'
                  : 'text-on-surface-variant dark:text-outline hover:text-primary dark:hover:text-[#a7c8ff]'
                  }`}
              >
                <span className="material-symbols-outlined text-xs">account_balance_wallet</span>
                Holdings
              </button>
              <button
                onClick={() => setViewMode('activity')}
                className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded flex items-center gap-1.5 transition-colors ${viewMode === 'activity'
                  ? 'bg-primary dark:bg-[#a7c8ff] text-white dark:text-[#001b3c]'
                  : 'text-on-surface-variant dark:text-outline hover:text-primary dark:hover:text-[#a7c8ff]'
                  }`}
              >
                <span className="material-symbols-outlined text-xs">history</span>
                Aktivitas
              </button>
            </div>
          </div>

          {/* Bottom row: Filters + Search */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Asset Class Filter */}
            <div className="flex bg-surface-container-high dark:bg-white/5 p-1 rounded-lg border border-outline-variant/10 dark:border-white/5">
              {['Semua', ...Object.keys(classSummaries)].map(key => {
                const label = key === 'Semua' ? 'Semua' : (ASSET_CLASS_CONFIG[key]?.label || key);
                return (
                  <button
                    key={key}
                    onClick={() => setFilterClass(key)}
                    className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded transition-colors ${filterClass === key
                      ? 'bg-primary dark:bg-[#a7c8ff] text-white dark:text-[#001b3c]'
                      : 'text-on-surface-variant dark:text-outline hover:text-primary dark:hover:text-[#a7c8ff]'
                      }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {/* Activity Type Filter (only in activity mode) */}
            {viewMode === 'activity' && (
              <div className="flex bg-surface-container-high dark:bg-white/5 p-1 rounded-lg border border-outline-variant/10 dark:border-white/5">
                {['Semua', 'Pembelian', 'Penjualan', 'Pendapatan'].map(type => (
                  <button
                    key={type}
                    onClick={() => setFilterType(type)}
                    className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded transition-colors ${filterType === type
                      ? 'bg-primary dark:bg-[#a7c8ff] text-white dark:text-[#001b3c]'
                      : 'text-on-surface-variant dark:text-outline hover:text-primary dark:hover:text-[#a7c8ff]'
                      }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            )}

            {/* Search */}
            <div className="flex items-center gap-2 ml-auto">
              {showSearchInput && (
                <input
                  type="text"
                  placeholder="Cari emiten/ticker..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="px-3 py-1.5 text-xs bg-white dark:bg-white/5 border border-outline dark:border-white/10 rounded-lg focus:outline-none focus:border-primary dark:focus:border-[#a7c8ff] dark:text-white w-48"
                />
              )}
              <span
                onClick={() => setShowSearchInput(!showSearchInput)}
                className={`material-symbols-outlined text-on-surface-variant dark:text-outline p-2 hover:bg-surface-container-high dark:hover:bg-white/10 rounded-lg cursor-pointer transition-colors ${showSearchInput ? 'bg-surface-container-high dark:bg-white/10 text-primary dark:text-[#a7c8ff]' : ''}`}
              >
                search
              </span>
            </div>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto no-scrollbar">
          {viewMode === 'holdings' ? (
            /* ─── HOLDINGS TABLE ─── */
            <table className="w-full text-left border-collapse whitespace-nowrap min-w-[1100px]">
              <thead className="bg-surface-container-high/50 dark:bg-white/5 text-on-surface-variant dark:text-outline text-[10px] font-bold uppercase tracking-widest">
                <tr>
                  <th className="px-6 py-4">Instrumen</th>
                  <th className="px-4 py-4">Kelas</th>
                  <th className="px-4 py-4 text-right">Volume</th>
                  <th className="px-4 py-4 text-right">Avg Cost</th>
                  <th className="px-4 py-4 text-right">Last Price</th>
                  <th className="px-4 py-4 text-right">Cost Basis</th>
                  <th className="px-4 py-4 text-right">Market Value</th>
                  <th className="px-6 py-4 text-right">Unrealized P/L</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/5 dark:divide-white/5">
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-8 py-16 text-center text-on-surface-variant dark:text-outline text-sm font-medium">
                      <span className="material-symbols-outlined text-3xl mb-2 block opacity-30">inventory_2</span>
                      Tidak ada instrumen investasi yang ditemukan.
                    </td>
                  </tr>
                ) : (
                  <>
                    {filteredRows.map((row, idx) => {
                      const badge = getClassBadge(row.assetClass);
                      return (
                        <tr
                          key={row.id}
                          className={`${idx % 2 === 0 ? 'bg-surface-container-lowest dark:bg-transparent' : 'bg-surface-container-low/30 dark:bg-white/[0.02]'} hover:bg-surface-bright dark:hover:bg-white/5 transition-colors group`}
                        >
                          {/* Instrumen */}
                          <td className="px-6 py-5">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-xl ${badge.bg} flex items-center justify-center`}>
                                <span className={`font-bold text-[10px] ${badge.text}`}>{row.ticker.slice(0, 4)}</span>
                              </div>
                              <div>
                                <span className="font-bold text-sm text-on-surface dark:text-white block">{row.title}</span>
                                <span className="text-[10px] text-on-surface-variant dark:text-outline font-medium">{row.ticker}</span>
                              </div>
                            </div>
                          </td>
                          {/* Kelas */}
                          <td className="px-4 py-5">
                            <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded-md ${badge.bg} ${badge.text}`}>
                              {row.assetClassLabel}
                            </span>
                          </td>
                          {/* Volume */}
                          <td className="px-4 py-5 text-right text-xs font-medium tabular-nums text-on-surface-variant dark:text-slate-300">
                            {row.volume}
                          </td>
                          {/* Avg Cost */}
                          <td className="px-4 py-5 text-right text-xs font-medium tabular-nums text-on-surface-variant dark:text-slate-300">
                            {row.avgCost > 0 ? formatCurrency(row.avgCost) : '-'}
                          </td>
                          {/* Last Price */}
                          <td className="px-4 py-5 text-right text-xs font-medium tabular-nums text-on-surface-variant dark:text-slate-300">
                            {row.lastPrice > 0 ? formatCurrency(row.lastPrice) : '-'}
                          </td>
                          {/* Cost Basis */}
                          <td className="px-4 py-5 text-right text-xs font-bold tabular-nums text-on-surface dark:text-white">
                            {formatCurrency(row.costBasis)}
                          </td>
                          {/* Market Value */}
                          <td className="px-4 py-5 text-right text-xs font-bold tabular-nums text-on-surface dark:text-white">
                            {formatCurrency(row.marketValue)}
                          </td>
                          {/* Unrealized P/L */}
                          <td className="px-6 py-5 text-right">
                            <div className="flex flex-col items-end">
                              <span className={`text-xs font-bold tabular-nums ${row.unrealizedPL >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                                {row.unrealizedPL >= 0 ? '+' : ''}{formatCurrency(row.unrealizedPL)}
                              </span>
                              <span className={`text-[10px] font-bold tabular-nums ${row.unrealizedPL >= 0 ? 'text-emerald-500 dark:text-emerald-500' : 'text-red-400 dark:text-red-500'}`}>
                                {row.unrealizedPLPercent >= 0 ? '▲' : '▼'} {Math.abs(row.unrealizedPLPercent).toFixed(2)}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}

                    {/* SUMMARY FOOTER ROW */}
                    {holdingsTotals && (
                      <tr className="bg-surface-container-high/80 dark:bg-white/10 border-t-2 border-outline-variant/20 dark:border-white/20">
                        <td className="px-6 py-5 font-bold text-sm text-on-surface dark:text-white" colSpan={2}>
                          TOTAL ({filteredRows.length} instrumen)
                        </td>
                        <td colSpan={3} />
                        <td className="px-4 py-5 text-right text-sm font-extrabold tabular-nums text-on-surface dark:text-white">
                          {formatCurrency(holdingsTotals.totalCost)}
                        </td>
                        <td className="px-4 py-5 text-right text-sm font-extrabold tabular-nums text-on-surface dark:text-white">
                          {formatCurrency(holdingsTotals.totalMarket)}
                        </td>
                        <td className="px-6 py-5 text-right">
                          <div className="flex flex-col items-end">
                            <span className={`text-sm font-extrabold tabular-nums ${holdingsTotals.totalPL >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                              {holdingsTotals.totalPL >= 0 ? '+' : ''}{formatCurrency(holdingsTotals.totalPL)}
                            </span>
                            <span className={`text-[10px] font-bold tabular-nums ${holdingsTotals.totalPL >= 0 ? 'text-emerald-500 dark:text-emerald-500' : 'text-red-400 dark:text-red-500'}`}>
                              {holdingsTotals.totalPLPercent >= 0 ? '▲' : '▼'} {Math.abs(holdingsTotals.totalPLPercent).toFixed(2)}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                )}
              </tbody>
            </table>
          ) : (
            /* ─── ACTIVITY TABLE ─── */
            <table className="w-full text-left border-collapse whitespace-nowrap min-w-[900px]">
              <thead className="bg-surface-container-high/50 dark:bg-white/5 text-on-surface-variant dark:text-outline text-[10px] font-bold uppercase tracking-widest">
                <tr>
                  <th className="px-6 py-4">Tanggal</th>
                  <th className="px-4 py-4">Deskripsi</th>
                  <th className="px-4 py-4">Kelas</th>
                  <th className="px-4 py-4">Jenis</th>
                  <th className="px-6 py-4 text-right">Nominal (IDR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/5 dark:divide-white/5">
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-8 py-16 text-center text-on-surface-variant dark:text-outline text-sm font-medium">
                      <span className="material-symbols-outlined text-3xl mb-2 block opacity-30">history</span>
                      Tidak ada aktivitas transaksi yang ditemukan.
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row, idx) => {
                    const badge = getClassBadge(row.assetClass);
                    const typeColors: Record<string, string> = {
                      'Pembelian': 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
                      'Penjualan': 'bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400',
                      'Dividen Tunai': 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400',
                      'Kupon': 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400',
                      'Corporate Action': 'bg-slate-100 dark:bg-slate-800/30 text-slate-600 dark:text-slate-400',
                    };
                    return (
                      <tr
                        key={row.id}
                        className={`${idx % 2 === 0 ? 'bg-surface-container-lowest dark:bg-transparent' : 'bg-surface-container-low/30 dark:bg-white/[0.02]'} hover:bg-surface-bright dark:hover:bg-white/5 transition-colors`}
                      >
                        <td className="px-6 py-5">
                          <div className="flex flex-col">
                            <span className="font-bold text-sm dark:text-white">{formatDate(row.date)}</span>
                            <span className="text-[10px] text-on-surface-variant dark:text-outline font-medium tracking-wider">{row.ref}</span>
                          </div>
                        </td>
                        <td className="px-4 py-5">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg ${badge.bg} flex items-center justify-center`}>
                              <span className={`font-bold text-[10px] ${badge.text}`}>{row.ticker.slice(0, 4)}</span>
                            </div>
                            <span className="font-bold text-sm dark:text-white max-w-[300px] truncate">{row.title}</span>
                          </div>
                        </td>
                        <td className="px-4 py-5">
                          <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded-md ${badge.bg} ${badge.text}`}>
                            {row.assetClassLabel}
                          </span>
                        </td>
                        <td className="px-4 py-5">
                          <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded ${typeColors[row.type] || ''}`}>
                            {row.type}
                          </span>
                        </td>
                        <td className={`px-6 py-5 text-right font-bold text-sm tabular-nums ${row.isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-on-surface dark:text-white'}`}>
                          {row.isPositive ? '+' : '-'}{formatCurrency(row.amount)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>
      </section>
      {/* ── MATURED / LIQUIDATED INSTRUMENTS ── */}
      {maturedRows.length > 0 && (
        <section className="bg-surface-container-low dark:bg-transparent rounded-2xl overflow-hidden border border-outline-variant/10 dark:border-white/10">
          <button
            onClick={() => setShowMatured(!showMatured)}
            className="w-full px-6 lg:px-8 py-5 flex items-center justify-between bg-white/50 dark:bg-white/5 hover:bg-surface-container dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-base text-amber-600 dark:text-amber-400">event_available</span>
              <h4 className="font-headline text-sm lg:text-base font-bold text-on-surface dark:text-white uppercase tracking-widest">
                Instrumen Jatuh Tempo / Dicairkan
              </h4>
              <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 rounded-full">
                {maturedRows.length}
              </span>
            </div>
            <span className={`material-symbols-outlined text-on-surface-variant dark:text-outline transition-transform duration-300 ${showMatured ? 'rotate-180' : ''}`}>
              expand_more
            </span>
          </button>

          {showMatured && (
            <div className="border-t border-outline-variant/10 dark:border-white/10">
              {/* Explanation banner */}
              <div className="px-6 lg:px-8 py-3 bg-amber-50/50 dark:bg-amber-900/10 border-b border-amber-200/30 dark:border-amber-800/20">
                <p className="text-[11px] text-amber-700 dark:text-amber-400 leading-relaxed flex items-start gap-2">
                  <span className="material-symbols-outlined text-xs mt-0.5 shrink-0">info</span>
                  Instrumen berikut telah jatuh tempo atau dicairkan. Pokok investasi telah dikembalikan ke rekening Anda. Tidak ada unrealized gain/loss — seluruh return telah direalisasi.
                </p>
              </div>

              <div className="overflow-x-auto no-scrollbar">
                <table className="w-full text-left border-collapse whitespace-nowrap min-w-[800px]">
                  <thead className="bg-surface-container-high/50 dark:bg-white/5 text-on-surface-variant dark:text-outline text-[10px] font-bold uppercase tracking-widest">
                    <tr>
                      <th className="px-6 py-3">Instrumen</th>
                      <th className="px-4 py-3">Kelas</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Pokok Investasi</th>
                      <th className="px-6 py-3 text-right">Nilai Dicairkan</th>
                      <th className="px-6 py-3 text-right">Realized P/L</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/5 dark:divide-white/5">
                    {maturedRows.map((row, idx) => {
                      const badge = getClassBadge(row.assetClass);
                      const proceeds = row.realizedProceeds || row.costBasis;
                      const realizedPL = proceeds - row.costBasis;
                      const realizedPLPercent = row.costBasis > 0 ? (realizedPL / row.costBasis) * 100 : 0;
                      return (
                        <tr
                          key={row.id}
                          className={`${idx % 2 === 0 ? 'bg-surface-container-lowest dark:bg-transparent' : 'bg-surface-container-low/30 dark:bg-white/[0.02]'} opacity-75`}
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className={`w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800/30 flex items-center justify-center`}>
                                <span className="font-bold text-[10px] text-slate-500 dark:text-slate-400">{row.ticker.slice(0, 4)}</span>
                              </div>
                              <div>
                                <span className="font-bold text-sm text-on-surface dark:text-white block">{row.title}</span>
                                <span className="text-[10px] text-on-surface-variant dark:text-outline font-medium">{row.ticker} · {row.date ? formatDate(row.date) : '-'}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded-md ${badge.bg} ${badge.text}`}>
                              {row.assetClassLabel}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <span className="px-2.5 py-1 text-[10px] font-bold uppercase rounded-full bg-slate-200 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 flex items-center gap-1 w-fit">
                              <span className="material-symbols-outlined text-[10px]">check_circle</span>
                              {row.status === 'matured' ? 'Jatuh Tempo' : 'Dicairkan'}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-right text-xs font-medium tabular-nums text-on-surface-variant dark:text-slate-400">
                            {formatCurrency(row.costBasis)}
                          </td>
                          <td className="px-6 py-4 text-right text-xs font-bold tabular-nums text-on-surface dark:text-white">
                            {formatCurrency(proceeds)}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span className={`text-xs font-bold tabular-nums ${realizedPL >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                              {realizedPL === 0 ? 'Rp 0 (At Par)' : `${realizedPL >= 0 ? '+' : ''}${formatCurrency(realizedPL)} (${realizedPLPercent.toFixed(1)}%)`}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      )}

      {/* ── TAX BREAKDOWN ── */}
      <section className="bg-surface-container-low dark:bg-transparent rounded-2xl p-4 sm:p-6 lg:p-8 border border-outline-variant/10 dark:border-white/10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <h4 className="font-headline text-sm font-bold text-on-surface dark:text-white uppercase tracking-widest flex items-center gap-2">
            <span className="material-symbols-outlined text-base text-error dark:text-[#ffb4ab]">receipt_long</span>
            Estimasi Kewajiban Pajak per Kelas Aset
          </h4>
          <span className="text-[10px] font-bold text-on-surface-variant dark:text-outline bg-surface-container-high dark:bg-white/5 px-2.5 py-1 rounded-full uppercase tracking-wider">
            💡 Klik kartu untuk panduan pelaporan SPT
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Saham', key: 'saham', rate: 'PPh Final 0.1%', desc: 'Atas setiap transaksi jual saham', icon: 'show_chart', color: 'text-blue-600 dark:text-blue-400' },
            { label: 'SBN Kupon', key: 'sbn', rate: 'PPh 10%', desc: 'Atas kupon/imbalan yang diterima', icon: 'assured_workload', color: 'text-amber-600 dark:text-amber-400' },
            { label: 'Reksadana', key: 'reksadana', rate: 'Tax Exempt', desc: 'Tidak dikenakan PPh Final', icon: 'account_balance', color: 'text-emerald-600 dark:text-emerald-400' },
            { label: 'Kripto', key: 'kripto', rate: 'PPh Final 0.1%', desc: 'Atas setiap transaksi kripto', icon: 'currency_bitcoin', color: 'text-purple-600 dark:text-purple-400' },
          ].map(tax => (
            <div 
              key={tax.label} 
              onClick={() => {
                setTaxGuideInitialTab(tax.key);
                setShowTaxGuideModal(true);
              }}
              className="bg-surface-container-lowest dark:bg-white/5 rounded-xl p-5 border border-outline-variant/5 dark:border-white/5 cursor-pointer hover:bg-surface-container-low dark:hover:bg-white/10 hover:-translate-y-0.5 hover:shadow-md transition-all active:scale-[0.98] group"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`material-symbols-outlined text-sm ${tax.color}`}>{tax.icon}</span>
                  <span className="text-xs font-bold text-on-surface dark:text-white group-hover:text-primary dark:group-hover:text-[#a7c8ff] transition-colors">{tax.label}</span>
                </div>
                <span className="material-symbols-outlined text-[10px] text-on-surface-variant dark:text-outline opacity-0 group-hover:opacity-100 transition-opacity">info</span>
              </div>
              <p className="text-sm font-extrabold text-error dark:text-[#ffb4ab]">{tax.rate}</p>
              <p className="text-[10px] text-on-surface-variant dark:text-slate-400 mt-1 leading-relaxed">{tax.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── INSIGHT FOOTER ── */}
      {insights && insights.bestPerformer && (
        <footer className="bg-primary dark:bg-gradient-to-br dark:from-[#00174a] dark:to-[#002366] text-white p-6 lg:p-8 rounded-2xl shadow-lg relative overflow-hidden">
          <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-white/5 rounded-full blur-3xl" />
          <div className="relative z-10 space-y-5">
            <h5 className="font-headline font-bold text-base lg:text-lg flex items-center gap-2">
              <span className="material-symbols-outlined text-tertiary-fixed-dim dark:text-tertiary-fixed">insights</span>
              Insight Portofolio
            </h5>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Best Performer */}
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/60 block mb-1">Top Performer</span>
                <p className="font-bold text-sm">{insights.bestPerformer.title}</p>
                <p className="text-emerald-300 text-xs font-bold mt-0.5">
                  ▲ {insights.bestPerformer.unrealizedPLPercent.toFixed(2)}% ({insights.bestPerformer.unrealizedPL >= 0 ? '+' : ''}{formatCurrency(insights.bestPerformer.unrealizedPL, true)})
                </p>
              </div>

              {/* Worst Performer */}
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/60 block mb-1">Underperformer</span>
                <p className="font-bold text-sm">{insights.worstPerformer.title}</p>
                <p className={`text-xs font-bold mt-0.5 ${insights.worstPerformer.unrealizedPL < 0 ? 'text-red-300' : 'text-emerald-300'}`}>
                  {insights.worstPerformer.unrealizedPLPercent >= 0 ? '▲' : '▼'} {Math.abs(insights.worstPerformer.unrealizedPLPercent).toFixed(2)}% ({insights.worstPerformer.unrealizedPL >= 0 ? '+' : ''}{formatCurrency(insights.worstPerformer.unrealizedPL, true)})
                </p>
              </div>

              {/* Concentration Warning or All Clear */}
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/60 block mb-1">
                  {insights.concentrated ? 'Peringatan Konsentrasi' : 'Status Diversifikasi'}
                </span>
                {insights.concentrated ? (
                  <>
                    <p className="font-bold text-sm text-amber-300">⚠ Konsentrasi Tinggi</p>
                    <p className="text-[10px] text-white/80 mt-0.5">
                      {insights.concentrated.title} menguasai &gt;40% portofolio. Pertimbangkan rebalancing.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="font-bold text-sm text-emerald-300">✓ Terdiversifikasi</p>
                    <p className="text-[10px] text-white/80 mt-0.5">
                      Tidak ada instrumen yang menguasai &gt;40% portofolio Anda.
                    </p>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-white/10">
              <p className="text-on-primary-container dark:text-[#a7c8ff]/80 text-xs">
                Gunakan panduan pelaporan SPT Pajak untuk mempermudah pelaporan aset investasi tahunan Anda.
              </p>
              <button
                onClick={() => {
                  setTaxGuideInitialTab('saham');
                  setShowTaxGuideModal(true);
                }}
                className="bg-white text-primary px-5 py-2.5 rounded-xl font-extrabold text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-all shadow-md shrink-0"
              >
                Panduan Pajak SPT
              </button>
            </div>
          </div>
        </footer>
      )}

      {/* ── TAX GUIDE MODAL ── */}
      <TaxGuideModal
        isOpen={showTaxGuideModal}
        onClose={() => setShowTaxGuideModal(false)}
        initialTab={taxGuideInitialTab}
      />
    </div>
  );
};

export default FinanceEquityLedger;
