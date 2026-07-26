import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import { FeatureCTA } from './MarketingCTAModal';
import FinancePerformanceReport from './FinancePerformanceReport';
import AssetCardVisual from './AssetCardVisual';
import { useFinanceStore, formatDateString, type Account } from '../store/useFinanceStore';
import AccountReconcileModal from './AccountReconcileModal';
import FinanceSPTExportModal from './FinanceSPTExportModal';
import FinanceInsuranceSection from './FinanceInsuranceSection';
import FinanceRetirementSection from './FinanceRetirementSection';
import AssetSellModal from './AssetSellModal';
import RealizedGainCard from './RealizedGainCard';

interface FinanceAssetsProps {
  onShowCTA: (feature?: FeatureCTA) => void;
  onNavigate?: (tab: string) => void;
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

const getAssetAbbreviation = (title: string) => {
  const safeTitle = title || '';
  const tickerMatch = safeTitle.match(/\(([^)]+)\)/);
  if (tickerMatch) {
    const ticker = tickerMatch[1].trim();
    if (ticker.length <= 4) {
      return ticker.toUpperCase();
    }
  }

  // Get initials from title
  const cleanTitle = safeTitle.replace(/\([^)]+\)/g, '').trim();
  const words = cleanTitle.split(/\s+/).filter(w => w.length > 0 && !/^(dan|di|ke|dari|dengan|atau|&|and|or|of|in|on|at|by|for)$/i.test(w));

  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }
  return 'AS';
};

// Strict 2-letter initials from the title — never uses parenthesized ticker.
// Used for non-saham assets (reksadana, crypto, etc) so the icon stays compact.
const getAssetInitials = (title: string) => {
  const cleanTitle = (title || '').replace(/\([^)]+\)/g, '').trim();
  const words = cleanTitle.split(/\s+/).filter(w => w.length > 0 && !/^(dan|di|ke|dari|dengan|atau|&|and|or|of|in|on|at|by|for)$/i.test(w));
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return 'AS';
};

// IDX lot size: 1 Lot = 100 Lembar (Bursa Efek Indonesia standard).
const LOT_SIZE_IDX = 100;

// Industry-standard decimals per asset class.
const getPriceDecimals = (subType?: string): number => {
  if (subType === 'kripto' || subType === 'crypto') return 8;
  if (subType === 'reksadana') return 4;
  if (subType === 'saham') return 0;
  return 2;
};

// Format a number to Indonesian decimal display: 29440.09 -> "29.440,09".
const formatPriceID = (value: number, decimals: number): string => {
  if (!Number.isFinite(value)) return '';
  return value.toLocaleString('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
};

// Parse Indonesian-formatted decimal string: "29.440,09" -> 29440.09.
// Dots are thousand separators, comma is the decimal mark.
const parsePriceID = (input: string): number => {
  if (!input) return 0;
  const cleaned = input.replace(/\./g, '').replace(/,/g, '.');
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
};

// Group integer digits with Indonesian thousand separators (dots), string-based so
// arbitrarily long numbers keep full precision. Strips leading zeros (keeps a lone 0).
const groupThousandsID = (digits: string): string =>
  digits.replace(/^0+(?=\d)/, '').replace(/\B(?=(\d{3})+(?!\d))/g, '.');

// Live-format a price the user is typing: group the integer part while PRESERVING an
// in-progress decimal part (comma = decimal). Decimal digits are capped at `decimals`;
// when decimals === 0 (e.g. saham) any comma is dropped so only whole numbers remain.
const formatPriceInputID = (raw: string, decimals: number): string => {
  const s = (raw || '').replace(/[^0-9.,]/g, '');
  const firstComma = s.indexOf(',');
  if (decimals > 0 && firstComma !== -1) {
    const intDigits = s.slice(0, firstComma).replace(/\D/g, '');
    const decDigits = s.slice(firstComma + 1).replace(/\D/g, '').slice(0, decimals);
    return (intDigits ? groupThousandsID(intDigits) : '0') + ',' + decDigits;
  }
  const intDigits = s.replace(/\D/g, '');
  return intDigits ? groupThousandsID(intDigits) : '';
};

// IDX shares display: "4 Lot (400 Lembar)" when divisible by 100; otherwise raw.
const formatShares = (shares: number, subType?: string): string => {
  const s = shares || 0;
  if (subType === 'saham') {
    if (s >= LOT_SIZE_IDX && s % LOT_SIZE_IDX === 0) {
      const lots = s / LOT_SIZE_IDX;
      return `${lots.toLocaleString('id-ID')} Lot (${s.toLocaleString('id-ID')} Lembar)`;
    }
    return `${s.toLocaleString('id-ID')} Lembar`;
  }
  if (subType === 'kripto' || subType === 'crypto') {
    return `${s.toLocaleString('id-ID', { maximumFractionDigits: 8 })} Koin`;
  }
  return `${s.toLocaleString('id-ID', { maximumFractionDigits: 4 })} Unit`;
};

// Honest data-freshness label per asset class.
// GoogleFinance IDX is delayed ~20 min; reksadana NAV publishes T+1.
const getPriceFreshnessLabel = (subType?: string): string => {
  if (subType === 'reksadana') return 'NAV per akhir hari kerja (T+1)';
  if (subType === 'kripto' || subType === 'crypto') return 'Harga pasar (delayed ~5 menit)';
  if (subType === 'saham') return 'Harga pasar (delayed ~20 menit)';
  return 'Harga pasar (delayed)';
};

// Default effective date for a manual price entry.
// Reksadana NAV publishes T+1 → previous business day; others → today.
const getDefaultPriceDate = (subType?: string): string => {
  const d = new Date();
  if (subType === 'reksadana') {
    d.setDate(d.getDate() - 1);
    if (d.getDay() === 0) d.setDate(d.getDate() - 2); // Sun → Fri
    else if (d.getDay() === 6) d.setDate(d.getDate() - 1); // Sat → Fri
  }
  return d.toISOString().split('T')[0];
};

// Tier of price-change anomaly for sanity-check UI.
type PriceChangeTier = 'normal' | 'warn' | 'severe';
const classifyPriceChange = (oldPrice: number, newPrice: number): { tier: PriceChangeTier; deltaPct: number } => {
  if (!oldPrice || oldPrice <= 0) return { tier: 'normal', deltaPct: 0 };
  const deltaPct = ((newPrice - oldPrice) / oldPrice) * 100;
  const ratio = newPrice / oldPrice;
  if (ratio > 5 || ratio < 0.2) return { tier: 'severe', deltaPct };
  if (Math.abs(deltaPct) > 20) return { tier: 'warn', deltaPct };
  return { tier: 'normal', deltaPct };
};

const getAssetGradient = (text: string) => {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = text.charCodeAt(i) + ((hash << 5) - hash);
  }
  const gradients = [
    'from-blue-500/10 to-indigo-500/10 text-blue-600 dark:text-blue-400 border border-blue-200/20',
    'from-emerald-500/10 to-teal-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200/20',
    'from-purple-500/10 to-pink-500/10 text-purple-600 dark:text-purple-400 border border-purple-200/20',
    'from-amber-500/10 to-orange-500/10 text-amber-600 dark:text-amber-400 border border-amber-200/20',
    'from-rose-500/10 to-red-500/10 text-rose-600 dark:text-rose-400 border border-rose-200/20',
    'from-cyan-500/10 to-sky-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-200/20'
  ];
  const index = Math.abs(hash) % gradients.length;
  return gradients[index];
};

// F1.5: hari sejak rekonsiliasi terakhir (null bila belum pernah / tanggal invalid)
const reconcileDaysSince = (dateStr?: string): number | null => {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  d.setHours(0, 0, 0, 0);
  const now = new Date(); now.setHours(0, 0, 0, 0);
  return Math.floor((now.getTime() - d.getTime()) / 86400000);
};
// Badge "perlu rekonsiliasi" hanya untuk akun likuid yang PERNAH direkonsiliasi & >45 hari.
// (Akun tanpa lastValuationUpdate tidak di-nag agar tidak berisik; rekonsiliasi tetap bisa via menu.)
const accountNeedsReconcile = (acc: Account): boolean => {
  if (acc.type === 'investment') return false;
  const d = reconcileDaysSince(acc.lastValuationUpdate);
  return d !== null && d > 45;
};

const FinanceAssets: React.FC<FinanceAssetsProps> = ({ onShowCTA, onNavigate }) => {
  const [activeTab, setActiveTab] = useState<'ikhtisar' | 'real-estat' | 'ekuitas' | 'koleksi'>('ikhtisar');
  const [subTab, setSubTab] = useState<'saham-reksa' | 'sbn-deposito' | 'analisis'>('saham-reksa');

  // Search & Filter states for Portofolio Investasi
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);

  // Liquidation Modal states
  const [isLiquidationOpen, setIsLiquidationOpen] = useState(false);
  const [isLiquidating, setIsLiquidating] = useState(false);
  const [liquidationSuccess, setLiquidationSuccess] = useState(false);
  const [selectedAccountIdForLiquidation, setSelectedAccountIdForLiquidation] = useState<string>('');
  const [selectedAssetForLiquidation, setSelectedAssetForLiquidation] = useState<any>(null);

  // Account Action states
  const [accountActionId, setAccountActionId] = useState<string | null>(null);
  const [deletingAccountId, setDeletingAccountId] = useState<string | null>(null);
  const [reconcileAccount, setReconcileAccount] = useState<Account | null>(null);
  const [isSptExportOpen, setIsSptExportOpen] = useState(false);
  const [sellAsset, setSellAsset] = useState<any>(null);

  // Physical Asset Action states
  const [assetActionId, setAssetActionId] = useState<string | null>(null);
  const [deletingAssetId, setDeletingAssetId] = useState<string | null>(null);

  // Edit Last Price / Balance / Valuation Modal states
  const [isEditPriceOpen, setIsEditPriceOpen] = useState(false);
  const [editType, setEditType] = useState<'account' | 'physical' | 'investment'>('investment');
  const [editingAsset, setEditingAsset] = useState<any>(null);
  const [editingAccount, setEditingAccount] = useState<any>(null);
  const [newLastPriceInput, setNewLastPriceInput] = useState('');
  // Effective date of the manually-entered price ("Harga per tanggal").
  const [editPriceEffectiveDate, setEditPriceEffectiveDate] = useState<string>('');
  // In-session ids whose price has been manually overridden — drives "Manual" badge.
  const [manualOverrideIds, setManualOverrideIds] = useState<Set<string>>(new Set());

  // Physical Asset detailed edit states
  const [editTitle, setEditTitle] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editPurchasePrice, setEditPurchasePrice] = useState('');
  const [editPurchaseDate, setEditPurchaseDate] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editUsefulLife, setEditUsefulLife] = useState('10');
  const [editDepreciationMethod, setEditDepreciationMethod] = useState<'Garis Lurus Tahunan' | 'Garis Lurus Bulanan' | 'Tidak Menyusut'>('Tidak Menyusut');
  const [editLandArea, setEditLandArea] = useState('');
  const [editBuildingArea, setEditBuildingArea] = useState('');
  const [editMfgYear, setEditMfgYear] = useState('');
  const [editSpecification, setEditSpecification] = useState('');
  const [editSubType, setEditSubType] = useState('Electronics');

  // Print Modal states
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printMonth, setPrintMonth] = useState(new Date().getMonth());
  const [printYear, setPrintYear] = useState(new Date().getFullYear());

  // Store Accounts and Assets
  const accounts = useFinanceStore((state) => state.accounts);
  const assets = useFinanceStore((state) => state.assets);
  const debts = useFinanceStore((state) => state.debts);
  const transactions = useFinanceStore((state) => state.transactions);
  const settings = useFinanceStore((state) => state.settings);

  // Store actions
  const addTransaction = useFinanceStore((state) => state.addTransaction);
  const updateAccount = useFinanceStore((state) => state.updateAccount);
  const deleteAccount = useFinanceStore((state) => state.deleteAccount);
  const updateAsset = useFinanceStore((state) => state.updateAsset);
  const deleteAsset = useFinanceStore((state) => state.deleteAsset);
  const syncFromGoogleSheets = useFinanceStore((state) => state.syncFromGoogleSheets);
  const setReportPrintPeriod = useFinanceStore((state) => state.setReportPrintPeriod);



  const totalAccounts = accounts.reduce((acc, curr) => acc + curr.balance, 0);
  const totalAssets = assets.reduce((acc, curr) => acc + curr.currentValue, 0);
  const totalDebts = debts.reduce((acc, curr) => acc + curr.balance, 0);
  const netWorth = totalAccounts + totalAssets - totalDebts;

  const physicalAssets = assets.filter(a => a.category === 'real-estat' || a.category === 'kendaraan' || a.category === 'koleksi');
  const physicalAppreciation = physicalAssets.reduce((acc, curr) => acc + (curr.currentValue - curr.purchasePrice), 0);
  const appreciationSign = physicalAppreciation >= 0 ? '+' : '-';
  const formattedAppreciation = `${appreciationSign}Rp ${Math.abs(physicalAppreciation).toLocaleString('id-ID')}`;

  const investmentAssets = assets.filter(a => a.category === 'investasi');

  // Filtered assets for the "Portofolio Investasi" section on Ikhtisar tab
  const filteredInvestmentAssets = useMemo(() => {
    return investmentAssets.filter(asset => {
      // 1. Filter by Asset Type / status
      const isFixedIncome = asset.subType === 'sbn' || asset.subType === 'deposito' || asset.subType === 'p2p' || (asset.title || '').includes('ST012');
      const isMatured = asset.maturityDate ? new Date(asset.maturityDate) < new Date() : false;
      const isLiquidated = asset.currentValue === 0 && (isMatured || asset.purchasePrice === 0);
      const isSaham = asset.subType === 'saham';
      const isReksadana = asset.subType === 'reksadana';
      const safeTitle = asset.title || '';
      const isSbn = asset.subType === 'sbn' || safeTitle.toLowerCase().includes('st012') || safeTitle.toLowerCase().includes('sukuk');

      if (selectedFilter !== 'all') {
        if (selectedFilter === 'dicairkan') {
          if (!isLiquidated) return false;
        } else {
          if (isLiquidated) return false;
          if (selectedFilter === 'saham' && !isSaham) return false;
          if (selectedFilter === 'reksadana' && !isReksadana) return false;
          if (selectedFilter === 'sbn' && !isSbn) return false;
          if (selectedFilter === 'deposito' && asset.subType !== 'deposito') return false;
          if (selectedFilter === 'p2p' && asset.subType !== 'p2p') return false;
          if (selectedFilter === 'kripto' && asset.subType !== 'kripto') return false;
        }
      }

      // 2. Filter by Search Query
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase().trim();
        const titleMatch = (asset.title || '').toLowerCase().includes(query);
        const notesMatch = (asset.notes || '').toLowerCase().includes(query);
        const tickerMatch = (asset.ticker || '').toLowerCase().includes(query);
        const subTypeMatch = (asset.subType || '').toLowerCase().includes(query);
        
        // extract ticker from title parenthesized like "Aset (TICKER)"
        const match = (asset.title || '').match(/\(([^)]+)\)/);
        const extractedTicker = match ? match[1].toLowerCase() : '';
        const extractedTickerMatch = extractedTicker.includes(query);

        if (!titleMatch && !notesMatch && !tickerMatch && !subTypeMatch && !extractedTickerMatch) {
          return false;
        }
      }

      return true;
    });
  }, [investmentAssets, selectedFilter, searchQuery]);

  // Asset allocation values
  const lancarValue = totalAccounts;
  const propertiValue = assets.filter(a => a.category === 'real-estat').reduce((sum, a) => sum + a.currentValue, 0);
  const investasiValue = assets.filter(a => a.category === 'investasi').reduce((sum, a) => sum + a.currentValue, 0);
  const fisikKoleksiValue = assets.filter(a => a.category === 'kendaraan' || a.category === 'koleksi').reduce((sum, a) => sum + a.currentValue, 0);
  const totalCombinedAssets = lancarValue + propertiValue + investasiValue + fisikKoleksiValue;
  
  const pctLancar = totalCombinedAssets > 0 ? (lancarValue / totalCombinedAssets * 100) : 0;
  const pctProperti = totalCombinedAssets > 0 ? (propertiValue / totalCombinedAssets * 100) : 0;
  const pctInvestasi = totalCombinedAssets > 0 ? (investasiValue / totalCombinedAssets * 100) : 0;
  const pctFisikKoleksi = totalCombinedAssets > 0 ? (fisikKoleksiValue / totalCombinedAssets * 100) : 0;

  // ===================== CFA/CFP REBALANCING CALCULATIONS =====================
  // Classify assets into 6 standard asset classes (CFA Investment Classification)
  const cashAccounts = accounts.filter(a => a.type !== 'investment');
  const investmentAccounts = accounts.filter(a => a.type === 'investment');

  let rbTotalCashFromAccounts = cashAccounts.reduce((sum, a) => sum + a.balance, 0);
  let rbTotalCryptoFromAccounts = 0;
  let rbTotalEquitiesFromAccounts = 0;

  investmentAccounts.forEach(a => {
    const nameLower = a.name.toLowerCase();
    if (nameLower.includes('kripto') || nameLower.includes('crypto') || nameLower.includes('btc') || nameLower.includes('eth') || nameLower.includes('binance') || nameLower.includes('indodax')) {
      rbTotalCryptoFromAccounts += a.balance;
    } else {
      rbTotalEquitiesFromAccounts += a.balance;
    }
  });

  let rbFixedIncomeClass = 0;
  let rbEquitiesClass = rbTotalEquitiesFromAccounts;
  let rbCryptoClass = rbTotalCryptoFromAccounts;
  let rbCashAssetsVal = 0;

  const portfolioItems = assets.filter(a => a.category === 'investasi' && (a.purchasePrice > 0 || a.currentValue > 0));
  portfolioItems.forEach(item => {
    const subType = item.subType || '';
    const title = item.title || '';
    const isFixedIncome = subType === 'sbn' || subType === 'deposito' || subType === 'p2p' || subType === 'obligasi' || title.includes('ST012');
    let val = item.currentValue;
    if (isFixedIncome && val === 0 && item.purchasePrice > 0) val = item.purchasePrice;

    if (subType === 'deposito') {
      rbCashAssetsVal += val;
    } else if (subType === 'sbn' || subType === 'obligasi' || subType === 'p2p' || title.includes('ST012')) {
      rbFixedIncomeClass += val;
    } else if (subType === 'kripto') {
      rbCryptoClass += val;
    } else {
      rbEquitiesClass += val;
    }
  });

  const rbCashClass = rbTotalCashFromAccounts + rbCashAssetsVal;
  const rbRealEstateClass = assets.filter(a => a.category === 'real-estat').reduce((sum, a) => sum + a.currentValue, 0);
  const rbOthersClass = assets.filter(a => a.category === 'kendaraan' || a.category === 'koleksi').reduce((sum, a) => sum + a.currentValue, 0);
  const rbGrandTotal = rbCashClass + rbFixedIncomeClass + rbEquitiesClass + rbCryptoClass + rbRealEstateClass + rbOthersClass || 1;

  // CFA Weighted Risk Score (1.0-5.0 scale)
  const rbWeightedRisk = (rbCashClass * 1.0 + rbFixedIncomeClass * 2.0 + (rbRealEstateClass + rbOthersClass) * 3.0 + rbEquitiesClass * 4.0 + rbCryptoClass * 5.0) / rbGrandTotal;

  // Risk Profile Determination
  let rbRiskProfileName = '';
  let rbRiskProfileDesc = '';
  if (rbWeightedRisk < 1.8) {
    rbRiskProfileName = 'Konservatif';
    rbRiskProfileDesc = 'Portofolio Anda didominasi oleh kas. Sangat stabil namun rentan terhadap gerusan inflasi.';
  } else if (rbWeightedRisk < 2.6) {
    rbRiskProfileName = 'Moderat Konservatif';
    rbRiskProfileDesc = 'Alokasi condong ke perlindungan modal dengan sedikit eksposur pada aset pertumbuhan.';
  } else if (rbWeightedRisk < 3.4) {
    rbRiskProfileName = 'Moderat';
    rbRiskProfileDesc = 'Portofolio seimbang antara likuiditas, properti riil, dan aset pertumbuhan.';
  } else if (rbWeightedRisk < 4.2) {
    rbRiskProfileName = 'Moderat Agresif';
    rbRiskProfileDesc = 'Didominasi instrumen pertumbuhan. Baik untuk akumulasi kekayaan jangka panjang.';
  } else {
    rbRiskProfileName = 'Agresif';
    rbRiskProfileDesc = 'Porsi ekuitas/kripto sangat tinggi. Potensi tinggi dengan volatilitas tinggi.';
  }

  // CFP Standard Target Allocations per Risk Profile (liquid assets only)
  let rbTargetCash = 20, rbTargetFixed = 30, rbTargetEquities = 45, rbTargetCrypto = 5;
  if (rbRiskProfileName === 'Konservatif') {
    rbTargetCash = 50; rbTargetFixed = 40; rbTargetEquities = 10; rbTargetCrypto = 0;
  } else if (rbRiskProfileName === 'Moderat Konservatif') {
    rbTargetCash = 35; rbTargetFixed = 45; rbTargetEquities = 20; rbTargetCrypto = 0;
  } else if (rbRiskProfileName === 'Moderat') {
    rbTargetCash = 20; rbTargetFixed = 30; rbTargetEquities = 45; rbTargetCrypto = 5;
  } else if (rbRiskProfileName === 'Moderat Agresif') {
    rbTargetCash = 15; rbTargetFixed = 20; rbTargetEquities = 60; rbTargetCrypto = 5;
  } else if (rbRiskProfileName === 'Agresif') {
    rbTargetCash = 5; rbTargetFixed = 15; rbTargetEquities = 70; rbTargetCrypto = 10;
  }

  // Deviation Analysis (actual vs target for liquid assets)
  const rbLiquidTotal = rbCashClass + rbFixedIncomeClass + rbEquitiesClass + rbCryptoClass || 1;
  const rbActCash = Math.round((rbCashClass / rbLiquidTotal) * 100);
  const rbActFixed = Math.round((rbFixedIncomeClass / rbLiquidTotal) * 100);
  const rbActEquities = Math.round((rbEquitiesClass / rbLiquidTotal) * 100);
  const rbActCrypto = Math.round((rbCryptoClass / rbLiquidTotal) * 100);

  const rbDiffCash = rbActCash - rbTargetCash;
  const rbDiffFixed = rbActFixed - rbTargetFixed;
  const rbDiffEquities = rbActEquities - rbTargetEquities;
  const rbDiffCrypto = rbActCrypto - rbTargetCrypto;

  // Generate rebalancing recommendations (sorted by deviation magnitude)
  const rbRawRecs: { act: string; dir: string; target: string; color: string; absVal: number }[] = [];
  if (Math.abs(rbDiffCash) >= 2) {
    rbRawRecs.push({
      act: rbDiffCash > 0 ? 'Alokasikan surplus kas ke instrumen investasi produktif' : 'Tingkatkan cadangan kas untuk memperkuat likuiditas',
      dir: rbDiffCash > 0 ? 'Kurangi' : 'Tambah',
      target: `${rbDiffCash > 0 ? '-' : '+'}${Math.abs(rbDiffCash)}.0%`,
      color: rbDiffCash > 0 ? 'text-rose-400' : 'text-emerald-400',
      absVal: Math.abs(rbDiffCash)
    });
  }
  if (Math.abs(rbDiffFixed) >= 2) {
    rbRawRecs.push({
      act: rbDiffFixed > 0 ? 'Kurangi porsi obligasi untuk realokasi aset pertumbuhan' : 'Tambah porsi obligasi/SBN untuk pendapatan pasif stabil',
      dir: rbDiffFixed > 0 ? 'Kurangi' : 'Tambah',
      target: `${rbDiffFixed > 0 ? '-' : '+'}${Math.abs(rbDiffFixed)}.0%`,
      color: rbDiffFixed > 0 ? 'text-rose-400' : 'text-emerald-400',
      absVal: Math.abs(rbDiffFixed)
    });
  }
  if (Math.abs(rbDiffEquities) >= 2) {
    rbRawRecs.push({
      act: rbDiffEquities > 0 ? 'Kurangi eksposur saham/reksadana untuk amankan profit' : 'Akumulasi saham/reksadana untuk pertumbuhan jangka panjang',
      dir: rbDiffEquities > 0 ? 'Kurangi' : 'Tambah',
      target: `${rbDiffEquities > 0 ? '-' : '+'}${Math.abs(rbDiffEquities)}.0%`,
      color: rbDiffEquities > 0 ? 'text-rose-400' : 'text-emerald-400',
      absVal: Math.abs(rbDiffEquities)
    });
  }
  if (Math.abs(rbDiffCrypto) >= 2) {
    rbRawRecs.push({
      act: rbDiffCrypto > 0 ? 'Ambil untung (TP) kripto untuk kurangi volatilitas' : 'Akumulasi bertahap kripto berkapitalisasi besar',
      dir: rbDiffCrypto > 0 ? 'Kurangi' : 'Tambah',
      target: `${rbDiffCrypto > 0 ? '-' : '+'}${Math.abs(rbDiffCrypto)}.0%`,
      color: rbDiffCrypto > 0 ? 'text-rose-400' : 'text-emerald-400',
      absVal: Math.abs(rbDiffCrypto)
    });
  }
  const rbSortedRecs = [...rbRawRecs].sort((a, b) => b.absVal - a.absVal);
  const rbFinalRecs = rbSortedRecs.slice(0, 3);
  if (rbFinalRecs.length === 0) {
    rbFinalRecs.push({
      act: 'Alokasi portofolio Anda sudah optimal dan sesuai profil risiko',
      dir: 'Optimal',
      target: '0.0%',
      color: 'text-emerald-400',
      absVal: 0
    });
  }

  // Find the largest asset class for the dynamic subtitle
  const rbClassValues = [
    { name: 'Kas & Setara Kas', val: rbCashClass },
    { name: 'Pendapatan Tetap', val: rbFixedIncomeClass },
    { name: 'Saham & Reksa Dana', val: rbEquitiesClass },
    { name: 'Aset Kripto', val: rbCryptoClass },
    { name: 'Properti & Real Estate', val: rbRealEstateClass },
    { name: 'Aset Fisik & Alternatif', val: rbOthersClass }
  ].sort((a, b) => b.val - a.val);
  const rbMaxClass = rbClassValues[0];
  const rbMaxClassPct = Math.round((rbMaxClass.val / rbGrandTotal) * 100);

  // HHI Diversification Score
  const rbWCash = rbCashClass / rbGrandTotal;
  const rbWFixed = rbFixedIncomeClass / rbGrandTotal;
  const rbWEquities = rbEquitiesClass / rbGrandTotal;
  const rbWCrypto = rbCryptoClass / rbGrandTotal;
  const rbWRealEstate = rbRealEstateClass / rbGrandTotal;
  const rbWOthers = rbOthersClass / rbGrandTotal;
  const rbHHI = (rbWCash*rbWCash) + (rbWFixed*rbWFixed) + (rbWEquities*rbWEquities) + (rbWCrypto*rbWCrypto) + (rbWRealEstate*rbWRealEstate) + (rbWOthers*rbWOthers);
  const rbDivScore = Math.max(1, Math.min(10, parseFloat((10 * (1 - (rbHHI - 0.167) / (1 - 0.167))).toFixed(1))));

  // Dynamic Liquidity Score
  // Calculate average monthly expenses from last 3 months of transaction data
  const now = new Date();
  const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
  const recentExpenses = transactions.filter(t => {
    if (t.type !== 'PENGELUARAN') return false;
    try {
      const tDate = new Date(t.date);
      return tDate >= threeMonthsAgo && tDate <= now;
    } catch { return false; }
  });
  const totalRecentExpenses = recentExpenses.reduce((sum, t) => sum + Math.abs(t.amount), 0);
  // Calculate elapsed months (min 1 to avoid division by zero)
  const elapsedExpenseMonths = Math.max(1, Math.min(3, (now.getTime() - threeMonthsAgo.getTime()) / (1000 * 60 * 60 * 24 * 30.44)));
  const avgMonthlyExpense = totalRecentExpenses > 0 ? totalRecentExpenses / elapsedExpenseMonths : (parseFloat(settings.find(s => s.key === 'monthlyIncome')?.value || '0') * 0.6 || 4000000);

  const rbLiquidCash = rbCashClass; // Cash + deposito for liquidity
  const rbMonthsCovered = avgMonthlyExpense > 0 ? rbLiquidCash / avgMonthlyExpense : 0;
  // Map months covered to 0-10 score (3 months = 3.0, 6 months = 5.0, 12 months = 7.5, 18+ months = 9.0+, 24+ = 10.0)
  let rbLiquidityScore: number;
  if (rbMonthsCovered >= 24) rbLiquidityScore = 10.0;
  else if (rbMonthsCovered >= 18) rbLiquidityScore = 9.0 + (rbMonthsCovered - 18) / 6 * 1.0;
  else if (rbMonthsCovered >= 12) rbLiquidityScore = 7.5 + (rbMonthsCovered - 12) / 6 * 1.5;
  else if (rbMonthsCovered >= 6) rbLiquidityScore = 5.0 + (rbMonthsCovered - 6) / 6 * 2.5;
  else if (rbMonthsCovered >= 3) rbLiquidityScore = 3.0 + (rbMonthsCovered - 3) / 3 * 2.0;
  else rbLiquidityScore = rbMonthsCovered;
  rbLiquidityScore = parseFloat(Math.max(0, Math.min(10, rbLiquidityScore)).toFixed(1));

  let rbLiquidityLabel = '';
  let rbLiquidityColor = '';
  if (rbLiquidityScore >= 8.0) { rbLiquidityLabel = 'Luar biasa'; rbLiquidityColor = 'text-emerald-500 dark:text-emerald-400'; }
  else if (rbLiquidityScore >= 6.0) { rbLiquidityLabel = 'Baik'; rbLiquidityColor = 'text-blue-500 dark:text-blue-400'; }
  else if (rbLiquidityScore >= 4.0) { rbLiquidityLabel = 'Cukup'; rbLiquidityColor = 'text-amber-500 dark:text-amber-400'; }
  else { rbLiquidityLabel = 'Perlu ditingkatkan'; rbLiquidityColor = 'text-rose-500 dark:text-rose-400'; }

  // Investment-specific performance calculations
  const activeInvestments = investmentAssets.filter(a => {
    const isFixedIncome = a.subType === 'sbn' || a.subType === 'deposito' || a.subType === 'p2p' || (a.title || '').includes('ST012');
    const isMatured = a.maturityDate ? new Date(a.maturityDate) < new Date() : false;
    const isLiquidated = a.currentValue === 0 && (isMatured || a.purchasePrice === 0);
    return !isLiquidated && (a.currentValue > 0 || a.purchasePrice > 0);
  });

  const liquidatedInvestments = investmentAssets.filter(a => {
    const isFixedIncome = a.subType === 'sbn' || a.subType === 'deposito' || a.subType === 'p2p' || (a.title || '').includes('ST012');
    const isMatured = a.maturityDate ? new Date(a.maturityDate) < new Date() : false;
    const isLiquidated = a.currentValue === 0 && (isMatured || a.purchasePrice === 0);
    return isLiquidated;
  });

  const totalInvestedPrincipal = investmentAssets.reduce((sum, a) => sum + a.purchasePrice, 0);
  
  // Calculate active market value defaulting SBN to principal if currentValue is 0
  const activeMarketValue = activeInvestments.reduce((sum, a) => {
    const isFixedIncome = a.subType === 'sbn' || a.subType === 'deposito' || a.subType === 'p2p' || (a.title || '').includes('ST012');
    const val = a.currentValue === 0 && isFixedIncome ? a.purchasePrice : a.currentValue;
    return sum + val;
  }, 0);

  // Unrealized P/L for active holdings including coupon interest earned to date for SBN
  const totalUnrealizedPL = activeInvestments.reduce((sum, a) => {
    const isFixedIncome = a.subType === 'sbn' || a.subType === 'deposito' || a.subType === 'p2p' || (a.title || '').includes('ST012');
    const initial = a.purchasePrice;
    let marketValue = a.currentValue;
    if (isFixedIncome && marketValue === 0 && initial > 0) {
      marketValue = initial;
    }
    
    if (isFixedIncome && initial > 0) {
      const couponRate = a.interestRate || (a.subType === 'deposito' ? 4.5 : a.subType === 'p2p' ? 12.0 : 6.4);
      // @ts-ignore
      const taxRate = a.tax !== undefined ? a.tax : (a.subType === 'deposito' ? 0.20 : a.subType === 'p2p' ? 0.15 : 0.10);
      const yearlyGross = initial * (couponRate / 100);
      const yearlyNet = yearlyGross * (1 - taxRate);
      const monthlyNet = Math.round(yearlyNet / 12);
      // @ts-ignore
      const totalTenorMonths = a.tenor !== undefined ? (a.subType === 'sbn' ? a.tenor * 12 : a.tenor) : (a.subType === 'sbn' ? 24 : 12);
      
      const elapsedMonths = getMonthsBetween(a.purchaseDate, a.maturityDate, totalTenorMonths);
      const couponsReceived = monthlyNet * elapsedMonths;
      
      return sum + (marketValue - initial) + couponsReceived;
    } else {
      return sum + (marketValue - initial);
    }
  }, 0);
  const unrealizedPLPercent = totalInvestedPrincipal > 0 ? (totalUnrealizedPL / totalInvestedPrincipal * 100) : 0;

  // Realized P/L (Coupon/Interest earned for liquidated/matured fixed income assets)
  const totalRealizedPL = liquidatedInvestments.reduce((sum, a) => {
    const isFixedIncome = a.subType === 'sbn' || a.subType === 'deposito' || a.subType === 'p2p' || (a.title || '').includes('ST012');
    if (isFixedIncome) {
      const principal = a.purchasePrice || 0;
      if (principal === 0) return sum;
      const couponRate = a.interestRate || (a.subType === 'deposito' ? 4.5 : a.subType === 'p2p' ? 12.0 : 6.4);
      // @ts-ignore
      const taxRate = a.tax !== undefined ? a.tax : (a.subType === 'deposito' ? 0.20 : a.subType === 'p2p' ? 0.15 : 0.10);
      const yearlyGross = principal * (couponRate / 100);
      const yearlyNet = yearlyGross * (1 - taxRate);
      const monthlyNet = Math.round(yearlyNet / 12);
      // @ts-ignore
      const totalTenorMonths = a.tenor !== undefined ? (a.subType === 'sbn' ? a.tenor * 12 : a.tenor) : (a.subType === 'sbn' ? 24 : 12);
      return sum + (monthlyNet * totalTenorMonths);
    }
    return sum;
  }, 0);
  const realizedPLPercent = totalInvestedPrincipal > 0 ? (totalRealizedPL / totalInvestedPrincipal * 100) : 0;

  const getAssetImage = (category: string, title: string) => {
    const lower = (title || '').toLowerCase();
    if (category === 'real-estat' || lower.includes('rumah') || lower.includes('apartemen') || lower.includes('park') || lower.includes('office')) {
      if (lower.includes('office') || lower.includes('senayan')) {
        return "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=800";
      }
      return "https://images.unsplash.com/photo-1518780664697-55e3ad937233?auto=format&fit=crop&q=80&w=800";
    }
    if (category === 'kendaraan' || lower.includes('porsche') || lower.includes('mobil') || lower.includes('motor')) {
      return "https://images.unsplash.com/photo-1542282088-fe8426682b8f?auto=format&fit=crop&q=80&w=800";
    }
    if (lower.includes('patek') || lower.includes('watch') || lower.includes('jam')) {
      return "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=800";
    }
    if (lower.includes('affandi') || lower.includes('paint') || lower.includes('lukisan') || lower.includes('art')) {
      return "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&q=80&w=800";
    }
    return "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&q=80&w=800";
  };



  const handleDownloadCSV = () => {
    const headers = ["Tipe", "Kategori/Sub-Tipe", "Nama Aset", "Lokasi/Keterangan", "Nilai Perolehan (Harga Beli)", "Nilai Sekarang (Valuasi)", "Selisih P/L", "Tanggal Pembelian", "Pengingat Valuasi Aktif", "Pembaruan Terakhir"];
    const rows = [headers];

    accounts.forEach(acc => {
      const category = acc.type === 'bank' ? 'Bank' : acc.type === 'wallet' ? 'E-Wallet' : acc.type === 'investment' ? 'Investasi' : 'Lainnya';
      rows.push([
        "Aset Lancar",
        category,
        acc.name || "",
        acc.name.split(' - ')[0] || "-",
        "0",
        String(acc.balance || 0),
        "0",
        "-",
        acc.valuationReminder ? "Aktif" : "Nonaktif",
        acc.lastValuationUpdate || "-"
      ]);
    });

    physicalAssets.forEach(asset => {
      const category = asset.category === 'real-estat' ? 'Real Estat' : asset.category === 'kendaraan' ? 'Kendaraan' : 'Barang Koleksi';
      rows.push([
        "Aset Fisik / Non-Lancar",
        category,
        asset.title || "",
        asset.category === 'real-estat' ? (asset.location || "") : (asset.notes || ""),
        String(asset.purchasePrice || 0),
        String(asset.currentValue || 0),
        String((asset.currentValue || 0) - (asset.purchasePrice || 0)),
        asset.purchaseDate || "",
        asset.valuationReminder ? "Aktif" : "Nonaktif",
        asset.lastValuationUpdate || "-"
      ]);
    });

    investmentAssets.forEach(asset => {
      const isFixedIncome = asset.subType === 'sbn' || asset.subType === 'deposito' || asset.subType === 'p2p' || (asset.title || '').includes('ST012');
      const isMatured = asset.maturityDate ? new Date(asset.maturityDate) < new Date() : false;
      const isLiquidated = asset.currentValue === 0 && (isMatured || asset.purchasePrice === 0);

      let pl = 0;
      if (isFixedIncome && asset.purchasePrice > 0) {
        const principal = asset.purchasePrice;
        const couponRate = asset.interestRate || (asset.subType === 'deposito' ? 4.5 : asset.subType === 'p2p' ? 12.0 : 6.4);
        const taxRate = asset.tax !== undefined ? asset.tax : (asset.subType === 'deposito' ? 0.20 : asset.subType === 'p2p' ? 0.15 : 0.10);
        const yearlyGross = principal * (couponRate / 100);
        const yearlyNet = yearlyGross * (1 - taxRate);
        const monthlyNet = Math.round(yearlyNet / 12);
        const totalTenorMonths = asset.tenor !== undefined ? (asset.subType === 'sbn' ? asset.tenor * 12 : asset.tenor) : (asset.subType === 'sbn' ? 24 : 12);
        
        const elapsedMonths = isLiquidated ? totalTenorMonths : getMonthsBetween(asset.purchaseDate, asset.maturityDate, totalTenorMonths);
        const couponsReceived = monthlyNet * elapsedMonths;
        const marketValue = (asset.currentValue === 0 && !isMatured) ? principal : asset.currentValue;
        
        pl = (marketValue - principal) + couponsReceived;
      } else {
        pl = (asset.currentValue || 0) - (asset.purchasePrice || 0);
      }

      rows.push([
        "Portofolio Investasi",
        asset.subType || "Investasi",
        asset.title || "",
        asset.location || "",
        String(asset.purchasePrice || 0),
        String(asset.currentValue || 0),
        String(pl),
        asset.purchaseDate || "",
        "Nonaktif",
        asset.lastValuationUpdate || "-"
      ]);
    });

    const csvContent = "\uFEFF" + rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.setAttribute("href", url);
    const today = new Date().toISOString().split('T')[0];
    link.setAttribute("download", `${(import.meta.env.VITE_APP_NAME || 'DompetKu').replace(/\s+/g, '_')}_Wealth_Portfolio_${today}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePriceInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (editType === 'investment') {
      // Group thousands live while preserving an in-progress decimal (comma).
      setNewLastPriceInput(formatPriceInputID(val, getPriceDecimals(editingAsset?.subType)));
    } else {
      const num = val.replace(/\D/g, '');
      setNewLastPriceInput(num ? Number(num).toLocaleString('id-ID') : '');
    }
  };

  const handleOpenEditPrice = (asset: any) => {
    const currentPrice = asset.subType === 'reksadana'
      ? asset.currentNav || asset.currentPrice
      : asset.currentPrice || (asset.currentValue / (asset.shares || 1));
    const decimals = getPriceDecimals(asset.subType);
    setEditingAsset(asset);
    setEditType('investment');
    // Pre-fill with Indonesian-locale formatting so the parser (dot = thousand,
    // comma = decimal) round-trips correctly.
    setNewLastPriceInput(currentPrice ? formatPriceID(currentPrice, decimals) : '');
    // Default effective date: reksadana NAV publishes T+1, so prior business day;
    // saham/kripto default to today.
    setEditPriceEffectiveDate(getDefaultPriceDate(asset.subType));
    setIsEditPriceOpen(true);
  };

  const handleOpenEditPhysical = (asset: any) => {
    setEditingAsset(asset);
    setEditType('physical');
    setNewLastPriceInput(asset.currentValue.toLocaleString('id-ID'));
    setEditTitle(asset.title || '');
    setEditLocation(asset.location || '');
    setEditPurchasePrice((asset.purchasePrice || 0).toLocaleString('id-ID'));
    setEditPurchaseDate(formatDateString(asset.purchaseDate) || new Date().toISOString().split('T')[0]);
    setEditNotes(asset.notes || '');
    setEditUsefulLife(String(asset.usefulLife || '10'));
    setEditDepreciationMethod(asset.depreciationMethod || 'Tidak Menyusut');
    
    setEditLandArea(asset.landArea ? String(asset.landArea) : '');
    setEditBuildingArea(asset.buildingArea ? String(asset.buildingArea) : '');
    setEditMfgYear(asset.mfgYear ? String(asset.mfgYear) : '');
    setEditSpecification(asset.specification || '');
    setEditSubType(asset.subType || 'Electronics');
    
    setIsEditPriceOpen(true);
  };

  const handleSaveLastPrice = async () => {
    if (editType === 'account') {
      if (!editingAccount) return;
      const cleanPrice = newLastPriceInput.replace(/\D/g, '');
      const parsedNewBalance = parseInt(cleanPrice, 10) || 0;
      
      const updatedAcc = {
        ...editingAccount,
        balance: parsedNewBalance,
        lastValuationUpdate: new Date().toISOString().split('T')[0]
      };
      
      const accountName = editingAccount.name;
      setIsEditPriceOpen(false);
      setEditingAccount(null);
      
      try {
        await updateAccount(updatedAcc);
        alert(`Sukses: Saldo rekening "${accountName}" berhasil diperbarui!`);
        setTimeout(() => {
          syncFromGoogleSheets();
        }, 500);
      } catch (err) {
        console.error(err);
        alert(`Gagal menyimpan perubahan untuk rekening "${accountName}". Silakan coba lagi.`);
      }
    } else if (editType === 'physical') {
      if (!editingAsset) return;
      
      const cleanPrice = newLastPriceInput.replace(/\D/g, '');
      const parsedNewValue = parseInt(cleanPrice, 10) || 0;
      
      const cleanPurchasePrice = editPurchasePrice.replace(/\D/g, '');
      const parsedPurchasePrice = parseInt(cleanPurchasePrice, 10) || 0;

      const isProperty = editingAsset.category === 'real-estat';
      const isVehicle = editingAsset.category === 'kendaraan';
      
      let noteText = editNotes;
      if (isProperty) {
        noteText = `Property • Luas Tanah: ${editLandArea || '-'} m², Luas Bangunan: ${editBuildingArea || '-'} m²`;
      } else if (isVehicle) {
        noteText = `Vehicle • No. Pol: ${editSpecification || '-'} • Masa Manfaat: ${editUsefulLife} Tahun`;
      } else {
        noteText = `Personal Asset • Sub-Type: ${editSubType} • Masa Manfaat: ${editUsefulLife} Tahun`;
      }

      const updatedAs = {
        ...editingAsset,
        title: editTitle,
        purchasePrice: parsedPurchasePrice,
        currentValue: parsedNewValue,
        purchaseDate: formatDateString(editPurchaseDate),
        location: editLocation,
        notes: noteText,
        usefulLife: Number(editUsefulLife) || 10,
        depreciationMethod: editDepreciationMethod,
        landArea: editLandArea ? Number(editLandArea) : undefined,
        buildingArea: editBuildingArea ? Number(editBuildingArea) : undefined,
        mfgYear: editMfgYear ? Number(editMfgYear) : undefined,
        specification: editSpecification || undefined,
        subType: editSubType || undefined,
        lastValuationUpdate: new Date().toISOString().split('T')[0]
      };
      
      const assetTitle = editTitle;
      setIsEditPriceOpen(false);
      setEditingAsset(null);
      
      try {
        await updateAsset(updatedAs);
        alert(`Sukses: Detail dan valuasi aset "${assetTitle}" berhasil diperbarui!`);
        setTimeout(() => {
          syncFromGoogleSheets();
        }, 500);
      } catch (err) {
        console.error(err);
        alert(`Gagal menyimpan perubahan untuk aset "${assetTitle}". Silakan coba lagi.`);
      }
    } else {
      // Investment
      if (!editingAsset) return;
      const parsedNewPrice = parsePriceID(newLastPriceInput);
      if (parsedNewPrice <= 0) return;

      // Sanity check on extreme price changes — guards against decimal typos.
      const oldPrice = editingAsset.subType === 'reksadana'
        ? editingAsset.currentNav || editingAsset.currentPrice
        : editingAsset.currentPrice || (editingAsset.currentValue / (editingAsset.shares || 1));
      const decimals = getPriceDecimals(editingAsset.subType);
      const { tier, deltaPct } = classifyPriceChange(oldPrice || 0, parsedNewPrice);
      if (tier === 'severe') {
        const ok = window.confirm(
          `⚠️ Harga berubah ${deltaPct >= 0 ? '+' : ''}${deltaPct.toFixed(1)}% (${formatPriceID(oldPrice || 0, decimals)} → ${formatPriceID(parsedNewPrice, decimals)}).\n\nIni kemungkinan besar salah ketik desimal/pemisah ribuan. Yakin lanjut simpan?`
        );
        if (!ok) return;
      } else if (tier === 'warn') {
        const ok = window.confirm(
          `Harga berubah ${deltaPct >= 0 ? '+' : ''}${deltaPct.toFixed(1)}% (>±20%). Konfirmasi simpan?`
        );
        if (!ok) return;
      }

      const shares = editingAsset.shares || 1;
      const updatedValue = Math.round(parsedNewPrice * shares);
      const effectiveDate = editPriceEffectiveDate || new Date().toISOString().split('T')[0];

      const updatedAsset = {
        ...editingAsset,
        // Reksadana harga per-unit disimpan di kolom 'Current Price' (sama seperti Saham). DULU di-set
        // undefined (harga baru hanya masuk currentNav) → saat menulis, kolom 'Current Price' cocok ke
        // key `currentPrice` (undefined) lebih dulu → nilai lama dipertahankan (harga "kembali sendiri").
        // Set currentPrice ke harga baru untuk SEMUA jenis; currentNav tetap diisi utk reksadana (display).
        currentPrice: parsedNewPrice,
        currentNav: editingAsset.subType === 'reksadana' ? parsedNewPrice : undefined,
        currentValue: updatedValue,
        lastValuationUpdate: effectiveDate,
      };

      const assetTitle = editingAsset.title;
      const assetId = editingAsset.id;
      setIsEditPriceOpen(false);
      setEditingAsset(null);
      setManualOverrideIds(prev => {
        const next = new Set(prev);
        next.add(assetId);
        return next;
      });

      try {
        await updateAsset(updatedAsset);
        alert(`Sukses: Harga "${assetTitle}" diperbarui ke Rp ${formatPriceID(parsedNewPrice, decimals)} (per ${effectiveDate}).`);
        setTimeout(() => {
          syncFromGoogleSheets();
        }, 500);
      } catch (err) {
        console.error(err);
        alert(`Gagal memperbarui harga instrumen "${assetTitle}". Silakan coba lagi.`);
      }
    }
  };

  const handleConfirmLiquidation = async () => {
    if (!selectedAssetForLiquidation) return;
    setIsLiquidating(true);
    const targetAccount = accounts.find(a => a.id === selectedAccountIdForLiquidation) || accounts[0];
    const principalAmount = selectedAssetForLiquidation.purchasePrice || 100000000;
    try {
      await addTransaction({
        date: new Date().toISOString().split('T')[0],
        desc: `Pencairan Pokok SBN ${selectedAssetForLiquidation.title} (Jatuh Tempo)`,
        location: selectedAssetForLiquidation.location || 'Bibit',
        amount: principalAmount,
        category: 'Investasi Pasar',
        icon: selectedAssetForLiquidation.icon || 'account_balance',
        status: 'Completed',
        account: targetAccount?.name || 'Tabungan BCA',
        type: 'PEMASUKAN'
      });
      if (targetAccount) {
        await updateAccount({ ...targetAccount, balance: targetAccount.balance + principalAmount });
      }
      await updateAsset({ 
        ...selectedAssetForLiquidation, 
        currentValue: 0, 
        purchasePrice: 0, 
        notes: `Telah dicairkan ke ${targetAccount?.name || 'Tabungan BCA'}` 
      });
      setIsLiquidating(false);
      setLiquidationSuccess(true);
      setTimeout(() => {
        syncFromGoogleSheets();
      }, 1500);
    } catch (err) {
      console.error(err);
      setIsLiquidating(false);
    }
  };

  return (
    <div className="space-y-6 md:space-y-8 lg:space-y-12 animate-in fade-in duration-500">
      {/* Summary Header (Editorial Style) */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 lg:gap-12 items-start md:items-end">
        <div>
          <span className="text-on-surface-variant dark:text-outline font-label text-[10px] lg:text-xs uppercase tracking-widest mb-1.5 md:mb-2 block font-bold">Posisi Kekayaan Bersih</span>
          <h2 className="font-headline text-[28px] sm:text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight text-on-surface dark:text-white tabular-nums leading-[1.1] break-all">Rp {netWorth.toLocaleString('id-ID')}</h2>
          <p className="text-tertiary-container dark:text-tertiary-fixed text-[11px] sm:text-xs lg:text-sm mt-2 md:mt-3 flex items-center gap-1 font-bold">
            <span className="material-symbols-outlined text-sm">trending_up</span>
            +12,4% dari kuartal terakhir
          </p>
        </div>
        <div className="flex flex-wrap gap-2 sm:gap-3 lg:gap-4 md:justify-end">
          <button onClick={() => onNavigate && onNavigate('add-asset')} className="bg-gradient-to-r from-primary to-primary-container dark:from-[#a7c8ff] dark:to-[#82b1ff] text-white dark:text-[#001b3c] px-4 sm:px-6 py-2.5 sm:py-3 rounded-full font-bold shadow-lg shadow-primary-container/20 dark:shadow-[#a7c8ff]/20 hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center gap-2 text-xs sm:text-sm">
            <span className="material-symbols-outlined text-lg sm:text-xl">add</span>
            <span className="hidden sm:block">Tambah Aset</span>
            <span className="sm:hidden">Tambah</span>
          </button>
          <div className="flex bg-surface-container-low dark:bg-white/5 border border-outline-variant/20 dark:border-white/10 rounded-lg overflow-hidden shrink-0">
            <button
              onClick={handleDownloadCSV}
              className="px-3 sm:px-4 py-2.5 text-primary dark:text-[#a7c8ff] hover:bg-surface-container dark:hover:bg-white/10 transition-colors flex items-center gap-2 font-bold text-xs lg:text-sm"
              title="Unduh CSV"
              aria-label="Unduh Laporan CSV"
            >
              <span className="material-symbols-outlined text-[18px]">table_chart</span>
              <span className="hidden sm:block">Unduh Laporan</span>
            </button>
            <div className="w-px bg-outline-variant/20 dark:bg-white/10"></div>
            <button
              onClick={() => setIsPrintModalOpen(true)}
              className="px-3 sm:px-4 py-2.5 text-primary dark:text-[#a7c8ff] hover:bg-surface-container dark:hover:bg-white/10 transition-colors flex items-center gap-2 font-bold text-xs lg:text-sm"
              title="Cetak PDF"
              aria-label="Cetak Laporan PDF"
            >
              <span className="material-symbols-outlined text-[18px]">picture_as_pdf</span>
              <span className="hidden sm:block">Cetak (PDF)</span>
            </button>
            <div className="w-px bg-outline-variant/20 dark:bg-white/10"></div>
            <button
              onClick={() => setIsSptExportOpen(true)}
              className="px-3 sm:px-4 py-2.5 text-primary dark:text-[#a7c8ff] hover:bg-surface-container dark:hover:bg-white/10 transition-colors flex items-center gap-2 font-bold text-xs lg:text-sm"
              title="Ekspor Daftar Harta untuk SPT Tahunan"
              aria-label="Ekspor Daftar Harta SPT"
            >
              <span className="material-symbols-outlined text-[18px]">description</span>
              <span className="hidden sm:block">Daftar Harta (SPT)</span>
            </button>
          </div>
        </div>
      </section>

      {/* Tonal Sectioning (Assets Categories) */}
      <div className="bg-surface-container-low dark:bg-transparent rounded-2xl p-4 sm:p-6 md:p-8 lg:p-10 space-y-6 sm:space-y-8 md:space-y-10 lg:space-y-12 border border-outline-variant/10 dark:border-white/10">
        {/* Category Tabs - Apple Glassmorphism Capsule Segmented Control */}
        <div className="flex justify-start w-full overflow-x-auto no-scrollbar py-2 border-b border-outline-variant/15 dark:border-white/10">
          <div className="inline-flex p-1 bg-surface-container/60 dark:bg-white/[0.03] backdrop-blur-2xl border border-outline-variant/10 dark:border-white/[0.05] rounded-full shadow-inner relative whitespace-nowrap">
            {([
              { id: 'ikhtisar', label: 'Ikhtisar', icon: 'dashboard' },
              { id: 'real-estat', label: 'Real Estat', icon: 'domain' },
              { id: 'ekuitas', label: 'Portofolio Investasi', icon: 'show_chart' },
              { id: 'koleksi', label: 'Barang Koleksi', icon: 'diamond' }
            ] as const).map(tab => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative px-3.5 sm:px-4 lg:px-5 py-2 sm:py-2.5 rounded-full text-[11px] sm:text-xs lg:text-sm font-semibold tracking-tight transition-all duration-300 flex items-center gap-1.5 sm:gap-2 cursor-pointer z-10 select-none active:scale-[0.98] ${
                    isActive
                      ? 'text-primary dark:text-[#a7c8ff]'
                      : 'text-on-surface-variant dark:text-slate-400 hover:text-primary dark:hover:text-[#a7c8ff]'
                  }`}
                >
                  {/* Sliding Active Tab Background Indicator */}
                  {isActive && (
                    <motion.div
                      layoutId="activeAssetTabIndicator"
                      className="absolute inset-0 bg-white dark:bg-white/[0.07] shadow-sm backdrop-blur-xl border border-black/[0.02] dark:border-white/[0.08] rounded-full -z-10"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                  <span className="material-symbols-outlined text-[15px] sm:text-base lg:text-lg" style={{ fontVariationSettings: isActive ? "'FILL' 1, 'wght' 500" : "'FILL' 0, 'wght' 400" }}>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {activeTab === 'ikhtisar' && (
          <div className="animate-in fade-in duration-500 space-y-6 sm:space-y-8 lg:space-y-12 mt-4 sm:mt-6 lg:mt-8">
            {/* Visual Asset Allocation */}
            <section className="bg-surface-container-lowest dark:bg-white/5 border border-outline-variant/10 dark:border-white/5 rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 shadow-sm">
              <h3 className="font-headline text-base sm:text-lg lg:text-xl font-bold tracking-tight dark:text-white mb-2">Alokasi Kelas Aset</h3>
              <p className="text-on-surface-variant dark:text-outline text-[11px] sm:text-xs lg:text-sm font-medium mb-4 sm:mb-6">Distribusi portofolio kekayaan Anda berdasarkan likuiditas dan jenis instrumen.</p>
              
              {/* Premium Segmented Progress Bar */}
              <div className="w-full h-4 bg-surface-container dark:bg-white/10 rounded-full overflow-hidden flex mb-6 border border-outline-variant/5 dark:border-white/5">
                {pctLancar > 0 && (
                  <div 
                    style={{ width: `${pctLancar}%` }} 
                    className="h-full bg-emerald-500 dark:bg-emerald-400 transition-all duration-500 relative group"
                    title={`Kas & Setara Kas: ${pctLancar.toFixed(1)}%`}
                  />
                )}
                {pctInvestasi > 0 && (
                  <div 
                    style={{ width: `${pctInvestasi}%` }} 
                    className="h-full bg-blue-500 dark:bg-[#a7c8ff] transition-all duration-500 relative group"
                    title={`Investasi: ${pctInvestasi.toFixed(1)}%`}
                  />
                )}
                {pctProperti > 0 && (
                  <div 
                    style={{ width: `${pctProperti}%` }} 
                    className="h-full bg-teal-600 dark:bg-teal-500 transition-all duration-500 relative group"
                    title={`Properti & Real Estat: ${pctProperti.toFixed(1)}%`}
                  />
                )}
                {pctFisikKoleksi > 0 && (
                  <div 
                    style={{ width: `${pctFisikKoleksi}%` }} 
                    className="h-full bg-amber-500 dark:bg-amber-400 transition-all duration-500 relative group"
                    title={`Aset Fisik & Koleksi: ${pctFisikKoleksi.toFixed(1)}%`}
                  />
                )}
              </div>

              {/* Legends with values and percentages */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="flex items-start gap-3 p-3 rounded-2xl hover:bg-surface-bright dark:hover:bg-white/[0.02] transition-all">
                  <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 dark:bg-emerald-400 mt-1 shrink-0" />
                  <div>
                    <p className="text-on-surface-variant dark:text-outline text-[10px] uppercase font-bold tracking-wider mb-0.5">Kas &amp; Setara Kas</p>
                    <p className="font-headline font-bold text-sm dark:text-white tabular-nums">Rp {lancarValue.toLocaleString('id-ID')}</p>
                    <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-extrabold">{pctLancar.toFixed(1)}% dari portofolio</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-2xl hover:bg-surface-bright dark:hover:bg-white/[0.02] transition-all">
                  <span className="w-3.5 h-3.5 rounded-full bg-blue-500 dark:bg-[#a7c8ff] mt-1 shrink-0" />
                  <div>
                    <p className="text-on-surface-variant dark:text-outline text-[10px] uppercase font-bold tracking-wider mb-0.5">Investasi Portofolio</p>
                    <p className="font-headline font-bold text-sm dark:text-white tabular-nums">Rp {investasiValue.toLocaleString('id-ID')}</p>
                    <p className="text-[10px] text-blue-600 dark:text-[#a7c8ff] font-extrabold">{pctInvestasi.toFixed(1)}% dari portofolio</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-2xl hover:bg-surface-bright dark:hover:bg-white/[0.02] transition-all">
                  <span className="w-3.5 h-3.5 rounded-full bg-teal-600 dark:bg-teal-500 mt-1 shrink-0" />
                  <div>
                    <p className="text-on-surface-variant dark:text-outline text-[10px] uppercase font-bold tracking-wider mb-0.5">Properti &amp; Real Estat</p>
                    <p className="font-headline font-bold text-sm dark:text-white tabular-nums">Rp {propertiValue.toLocaleString('id-ID')}</p>
                    <p className="text-[10px] text-teal-600 dark:text-teal-400 font-extrabold">{pctProperti.toFixed(1)}% dari portofolio</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-2xl hover:bg-surface-bright dark:hover:bg-white/[0.02] transition-all">
                  <span className="w-3.5 h-3.5 rounded-full bg-amber-500 dark:bg-amber-400 mt-1 shrink-0" />
                  <div>
                    <p className="text-on-surface-variant dark:text-outline text-[10px] uppercase font-bold tracking-wider mb-0.5">Aset Fisik &amp; Koleksi</p>
                    <p className="font-headline font-bold text-sm dark:text-white tabular-nums">Rp {fisikKoleksiValue.toLocaleString('id-ID')}</p>
                    <p className="text-[10px] text-amber-600 dark:text-amber-400 font-extrabold">{pctFisikKoleksi.toFixed(1)}% dari portofolio</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Liquid Assets Grid */}
            <section>
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-6 lg:mb-8">
                <div>
                  <h3 className="font-headline text-lg sm:text-xl lg:text-2xl font-bold tracking-tight text-primary dark:text-white">Aset Lancar</h3>
                  <p className="text-on-surface-variant dark:text-outline text-[11px] sm:text-xs lg:text-sm font-medium">Total: Rp {totalAccounts.toLocaleString('id-ID')}</p>
                </div>
                <button
                  onClick={() => onNavigate?.('add-account')}
                  className="self-start sm:self-auto flex items-center gap-2 px-4 py-2 bg-primary/10 dark:bg-[#a7c8ff]/10 text-primary dark:text-[#a7c8ff] rounded-xl text-xs font-extrabold border border-primary/20 hover:bg-primary/20 transition-all active:scale-95 shadow-sm"
                >
                  <span className="material-symbols-outlined text-base">add_circle</span>
                  <span className="hidden sm:inline">Tambah Akun Baru</span>
                  <span className="sm:hidden">Tambah</span>
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
                {accounts.map(acc => (
                  <div key={acc.id} className="bg-surface-container-lowest dark:bg-white/5 border border-outline-variant/10 dark:border-white/5 p-4 sm:p-5 lg:p-6 rounded-2xl hover:bg-surface-bright dark:hover:bg-white/10 transition-all group cursor-pointer shadow-sm">
                    <div className="flex justify-between items-start mb-3 sm:mb-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        acc.type === 'bank' ? 'bg-blue-50 dark:bg-blue-900/40 text-primary dark:text-[#a7c8ff]' :
                        acc.type === 'wallet' ? 'bg-slate-100 dark:bg-slate-800/50 text-primary dark:text-[#a7c8ff]' :
                        acc.type === 'investment' ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400' :
                        'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400'
                      }`}>
                        <span className="material-symbols-outlined">{acc.icon || (acc.type === 'bank' ? 'account_balance_wallet' : 'savings')}</span>
                      </div>
                      <div className="relative">
                        <button onClick={(e) => { e.stopPropagation(); setAccountActionId(accountActionId === acc.id ? null : acc.id); }} className="text-outline hover:text-primary transition-colors p-1 rounded-full hover:bg-surface-variant dark:hover:bg-white/10 opacity-0 group-hover:opacity-100">
                          <span className="material-symbols-outlined">more_vert</span>
                        </button>
                        {accountActionId === acc.id && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setAccountActionId(null); }} />
                            <div className="absolute right-0 top-8 w-40 bg-white dark:bg-[#191c1e] shadow-xl rounded-xl border border-slate-200 dark:border-white/10 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                              {acc.type !== 'investment' && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setAccountActionId(null);
                                    setReconcileAccount(acc);
                                  }}
                                  className="w-full px-4 py-2.5 text-xs font-bold text-left hover:bg-surface-container dark:hover:bg-white/10 text-on-surface dark:text-white flex items-center gap-2 border-b border-outline-variant/10 dark:border-white/5"
                                >
                                  <span className="material-symbols-outlined text-sm text-primary dark:text-[#a7c8ff]">balance</span> Rekonsiliasi
                                </button>
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setAccountActionId(null);
                                  setEditingAccount(acc);
                                  setEditType('account');
                                  setNewLastPriceInput(acc.balance.toLocaleString('id-ID'));
                                  setIsEditPriceOpen(true);
                                }}
                                className="w-full px-4 py-2.5 text-xs font-bold text-left hover:bg-surface-container dark:hover:bg-white/10 text-on-surface dark:text-white flex items-center gap-2 border-b border-outline-variant/10 dark:border-white/5"
                              >
                                <span className="material-symbols-outlined text-sm">edit</span> Edit Saldo
                              </button>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setAccountActionId(null);
                                  setDeletingAccountId(acc.id);
                                }}
                                className="w-full px-4 py-2.5 text-xs font-bold text-left hover:bg-red-50 dark:hover:bg-red-900/10 text-error flex items-center gap-2"
                              >
                                <span className="material-symbols-outlined text-sm">delete</span> Hapus
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                    <p className="text-on-surface-variant dark:text-outline text-[10px] sm:text-xs font-bold uppercase tracking-wider mb-1">{acc.name}</p>
                    <p className="font-headline text-xl lg:text-2xl font-bold tabular-nums dark:text-white">Rp {acc.balance.toLocaleString('id-ID')}</p>
                    {accountNeedsReconcile(acc) && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setReconcileAccount(acc); }}
                        className="mt-2 inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-300 bg-amber-500/10 border border-amber-500/30 px-2 py-1 rounded-md hover:bg-amber-500/20 transition-colors cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[11px]">balance</span> Perlu rekonsiliasi
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {/* Non-Liquid Assets */}
            <section>
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 mb-6">
                <h3 className="font-headline text-lg lg:text-xl font-bold tracking-tight dark:text-white">Fisik &amp; Non-Lancar</h3>
                <span className="text-on-surface-variant dark:text-outline text-xs lg:text-sm font-bold">Apresiasi: {formattedAppreciation}</span>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
                {physicalAssets.map(asset => {
                  const isLunas = asset.equity === 100;
                  const isProperty = asset.category === 'real-estat';
                  const isVehicle = asset.category === 'kendaraan';
                  const borderClass = isProperty ? 'border-l-primary dark:border-l-[#a7c8ff]' : isVehicle ? 'border-l-secondary-fixed-dim dark:border-l-slate-400' : 'border-l-tertiary dark:border-l-amber-500';
                  
                  // Calculate rich depreciation / appreciation details
                  const purchasePrice = asset.purchasePrice || 0;
                  const currentValue = asset.currentValue || 0;
                  
                  let elapsedTimeText = '-';
                  let periodicDepStr = '-';
                  let accumulatedDep = 0;
                  let plAmount = 0;
                  let plPercent = 0;
                  
                  const isDepreciating = asset.depreciationMethod && asset.depreciationMethod !== 'Tidak Menyusut';
                  
                  if (isDepreciating) {
                    try {
                      const purchaseDate = new Date(asset.purchaseDate || new Date());
                      const now = new Date();
                      const diffYears = now.getFullYear() - purchaseDate.getFullYear();
                      const diffMonths = (now.getMonth() - purchaseDate.getMonth()) + (diffYears * 12);
                      const elapsedMonths = Math.max(0, diffMonths);
                      const elapsedYears = Math.floor(elapsedMonths / 12);
                      
                      if (asset.depreciationMethod === 'Garis Lurus Tahunan') {
                        elapsedTimeText = `${elapsedYears} Tahun`;
                        const yearlyDep = purchasePrice / (asset.usefulLife || 10);
                        periodicDepStr = `Rp ${Math.round(yearlyDep).toLocaleString('id-ID')} / Thn`;
                        accumulatedDep = Math.min(purchasePrice, Math.round(yearlyDep * elapsedYears));
                      } else if (asset.depreciationMethod === 'Garis Lurus Bulanan' || (asset.depreciationMethod as string) === 'Garis Lurus') {
                        elapsedTimeText = `${elapsedMonths} Bulan`;
                        const monthlyDep = purchasePrice / ((asset.usefulLife || 10) * 12);
                        periodicDepStr = `Rp ${Math.round(monthlyDep).toLocaleString('id-ID')} / Bln`;
                        accumulatedDep = Math.min(purchasePrice, Math.round(monthlyDep * elapsedMonths));
                      }
                    } catch (e) {
                      console.error(e);
                    }
                  } else {
                    elapsedTimeText = 'Tidak Menyusut';
                    plAmount = currentValue - purchasePrice;
                    plPercent = purchasePrice > 0 ? (plAmount / purchasePrice) * 100 : 0;
                  }

                  return (
                    <div key={asset.id} className={`bg-surface-container-lowest dark:bg-white/5 rounded-2xl overflow-hidden flex flex-col sm:flex-row shadow-sm hover:shadow-md transition-shadow border border-outline-variant/10 dark:border-white/5 border-l-4 ${borderClass}`}>
                      <div className="w-full sm:w-2/5 h-48 sm:h-auto overflow-hidden relative group p-[6px]">
                        <AssetCardVisual asset={asset} />
                      </div>
                      <div className="p-6 flex-1 flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-start gap-2">
                            <div>
                              <h4 className="font-bold text-lg text-primary dark:text-[#a7c8ff]">{asset.title}</h4>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {isProperty && plAmount > 0 && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-tertiary-fixed dark:bg-tertiary-fixed/20 text-on-tertiary-fixed dark:text-tertiary-fixed">
                                  +{plPercent.toFixed(1)}% Up
                                </span>
                              )}
                              {isDepreciating && accumulatedDep > 0 && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-error-container dark:bg-error-container/30 text-on-error-container dark:text-[#ffb4ab]">
                                  -{Math.round((accumulatedDep / purchasePrice) * 100)}% Depr
                                </span>
                              )}
                              <div className="relative">
                                <button 
                                  onClick={(e) => { 
                                    e.stopPropagation(); 
                                    setAssetActionId(assetActionId === asset.id ? null : asset.id); 
                                  }} 
                                  className="text-outline hover:text-primary dark:hover:text-white transition-colors p-1.5 rounded-full hover:bg-surface-variant dark:hover:bg-white/10"
                                >
                                  <span className="material-symbols-outlined text-sm font-bold">more_vert</span>
                                </button>
                                {assetActionId === asset.id && (
                                  <>
                                    <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setAssetActionId(null); }} />
                                    <div className="absolute right-0 top-8 w-36 bg-white dark:bg-[#191c1e] shadow-xl rounded-xl border border-slate-200 dark:border-white/10 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-left">
                                      <button 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setAssetActionId(null);
                                          handleOpenEditPhysical(asset);
                                        }}
                                        className="w-full px-4 py-2.5 text-xs font-bold text-left hover:bg-surface-container dark:hover:bg-white/10 text-on-surface dark:text-white flex items-center gap-2 border-b border-outline-variant/10 dark:border-white/5"
                                      >
                                        <span className="material-symbols-outlined text-sm">edit</span> Edit Valuasi
                                      </button>
                                      <button 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setAssetActionId(null);
                                          setDeletingAssetId(asset.id);
                                        }}
                                        className="w-full px-4 py-2.5 text-xs font-bold text-left hover:bg-red-50 dark:hover:bg-red-900/10 text-error flex items-center gap-2"
                                      >
                                        <span className="material-symbols-outlined text-sm">delete</span> Hapus
                                      </button>
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {/* Location & Specs */}
                          <p className="text-on-surface-variant dark:text-outline text-xs flex items-center gap-1 mt-1 font-semibold leading-relaxed">
                            <span className="material-symbols-outlined text-xs">
                              {isProperty ? 'location_on' : isVehicle ? 'directions_car' : 'diamond'}
                            </span>
                            {isProperty ? asset.location : asset.notes}
                          </p>
                          
                          {/* Specific columns in sheet for properties/vehicles */}
                          {isProperty && (asset.landArea || asset.buildingArea) && (
                            <p className="text-[10px] font-bold text-outline-variant uppercase tracking-widest mt-1.5 flex gap-3">
                              {asset.landArea && <span>Luas Tanah: {asset.landArea} m²</span>}
                              {asset.buildingArea && <span>Luas Bangunan: {asset.buildingArea} m²</span>}
                            </p>
                          )}
                          {isVehicle && asset.specification && (
                            <p className="text-[10px] font-bold text-outline-variant uppercase tracking-widest mt-1.5">
                              No. Polisi: {asset.specification} {asset.mfgYear && `• Tahun: ${asset.mfgYear}`}
                            </p>
                          )}
                          {!isProperty && !isVehicle && asset.specification && (
                            <p className="text-[10px] font-bold text-outline-variant uppercase tracking-widest mt-1.5">
                              Detail: {asset.specification}
                            </p>
                          )}
                          {asset.documentLink && (
                            <div className="mt-2.5 flex">
                              <a 
                                href={asset.documentLink} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 dark:bg-white/5 dark:hover:bg-white/10 border border-primary/20 dark:border-white/10 rounded-lg text-[10px] font-bold text-primary dark:text-[#a7c8ff] transition-all cursor-pointer shadow-sm hover:scale-[1.02] duration-300"
                              >
                                <span className="material-symbols-outlined text-[13px] font-bold text-primary dark:text-[#a7c8ff]">cloud_queue</span>
                                Lihat Dokumen Aset
                              </a>
                            </div>
                          )}
                        </div>

                        {/* Financial and Depreciation columns */}
                        <div className="mt-5 grid grid-cols-2 gap-4 border-t border-outline-variant/10 dark:border-white/10 pt-4">
                          <div>
                            <p className="text-[10px] uppercase tracking-widest text-on-surface-variant dark:text-outline mb-0.5 font-bold">Harga Beli</p>
                            <p className="font-headline font-bold text-sm lg:text-base tabular-nums text-on-surface-variant dark:text-slate-400">
                              Rp {purchasePrice.toLocaleString('id-ID')}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] uppercase tracking-widest text-on-surface-variant dark:text-outline mb-0.5 font-bold">
                              {isProperty ? 'Nilai Pasar' : 'Nilai Sisa'}
                            </p>
                            <p className="font-headline font-bold text-sm lg:text-base tabular-nums text-on-surface dark:text-white">
                              Rp {currentValue.toLocaleString('id-ID')}
                            </p>
                          </div>

                          {/* Extra Depreciation detail columns */}
                          {isDepreciating && (
                            <>
                              <div>
                                <p className="text-[10px] uppercase tracking-widest text-on-surface-variant dark:text-outline mb-0.5 font-bold">Akumulasi Penyusutan</p>
                                <p className="font-headline font-bold text-xs tabular-nums text-error dark:text-[#ffb4ab]">
                                  Rp {accumulatedDep.toLocaleString('id-ID')} <span className="text-[9px] font-semibold text-outline-variant">({elapsedTimeText})</span>
                                </p>
                              </div>
                              <div>
                                <p className="text-[10px] uppercase tracking-widest text-on-surface-variant dark:text-outline mb-0.5 font-bold">Biaya Penyusutan</p>
                                <p className="font-headline font-bold text-xs tabular-nums text-on-surface dark:text-slate-300">
                                  {periodicDepStr}
                                </p>
                              </div>
                            </>
                          )}

                          {isProperty && plAmount > 0 && (
                            <div className="col-span-2">
                              <p className="text-[10px] uppercase tracking-widest text-on-surface-variant dark:text-outline mb-0.5 font-bold">Akumulasi Apresiasi (Kenaikan)</p>
                              <p className="font-headline font-bold text-xs tabular-nums text-tertiary-container dark:text-tertiary-fixed">
                                +Rp {plAmount.toLocaleString('id-ID')} <span className="text-[9px] font-bold text-outline-variant">({plPercent.toFixed(1)}% dari pembelian)</span>
                              </p>
                            </div>
                          )}
                        </div>

                        <div className="mt-4 pt-3 border-t border-outline-variant/10 dark:border-white/10 flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-on-tertiary-container dark:text-tertiary-fixed">
                          <span>Ekuitas: {asset.equity}% {isLunas ? 'Lunas' : 'dimiliki'}</span>
                          {isDepreciating && (
                            <span className="text-outline-variant">{asset.depreciationMethod}</span>
                          )}
                          {!isDepreciating && isProperty && (
                            <span className="text-outline-variant">Mengalami Apresiasi</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Investment Performance Summary Cards */}
            <section className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                <div>
                  <h3 className="font-headline text-lg lg:text-xl font-bold tracking-tight dark:text-white">Ringkasan Kinerja Investasi</h3>
                  <p className="text-on-surface-variant dark:text-outline text-xs font-medium mt-0.5">Analisis keuntungan mengambang (floating) dan keuntungan kupon terealisasi.</p>
                </div>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-surface-container-lowest dark:bg-white/5 border border-outline-variant/10 dark:border-white/5 p-5 rounded-2xl shadow-sm">
                  <p className="text-on-surface-variant dark:text-outline text-[10px] uppercase font-bold tracking-wider mb-1.5">Nilai Portofolio Aktif</p>
                  <p className="font-headline text-lg sm:text-xl font-bold dark:text-white tabular-nums">Rp {activeMarketValue.toLocaleString('id-ID')}</p>
                  <p className="text-[10px] text-on-surface-variant dark:text-outline font-semibold mt-1">Hanya instrumen aktif berjalan</p>
                </div>
                <div className="bg-surface-container-lowest dark:bg-white/5 border border-outline-variant/10 dark:border-white/5 p-5 rounded-2xl shadow-sm">
                  <p className="text-on-surface-variant dark:text-outline text-[10px] uppercase font-bold tracking-wider mb-1.5">Total Modal Masuk</p>
                  <p className="font-headline text-lg sm:text-xl font-bold dark:text-white tabular-nums">Rp {totalInvestedPrincipal.toLocaleString('id-ID')}</p>
                  <p className="text-[10px] text-on-surface-variant dark:text-outline font-semibold mt-1">Termasuk modal yang sudah cair</p>
                </div>
                <div className="bg-surface-container-lowest dark:bg-white/5 border border-outline-variant/10 dark:border-white/5 p-5 rounded-2xl shadow-sm">
                  <p className="text-on-surface-variant dark:text-outline text-[10px] uppercase font-bold tracking-wider mb-1.5">P/L Belum Direalisasi</p>
                  <p className="font-headline text-lg sm:text-xl font-bold tabular-nums text-on-surface dark:text-white">
                    <span className={totalUnrealizedPL >= 0 ? "text-tertiary-container dark:text-tertiary-fixed font-bold" : "text-error dark:text-[#ffb4ab] font-bold"}>
                      {totalUnrealizedPL >= 0 ? '+' : '-'}Rp {Math.abs(totalUnrealizedPL).toLocaleString('id-ID')}
                    </span>
                  </p>
                  <p className={`text-[10px] font-extrabold mt-1 ${totalUnrealizedPL >= 0 ? "text-tertiary-container dark:text-tertiary-fixed" : "text-error dark:text-[#ffb4ab]"}`}>
                    {totalUnrealizedPL >= 0 ? '+' : ''}{unrealizedPLPercent.toFixed(1)}% (Floating)
                  </p>
                </div>
                <div className="bg-surface-container-lowest dark:bg-white/5 border border-outline-variant/10 dark:border-white/5 p-5 rounded-2xl shadow-sm">
                  <p className="text-on-surface-variant dark:text-outline text-[10px] uppercase font-bold tracking-wider mb-1.5">P/L Direalisasikan</p>
                  <p className="font-headline text-lg sm:text-xl font-bold tabular-nums text-tertiary-container dark:text-tertiary-fixed font-bold">
                    +Rp {totalRealizedPL.toLocaleString('id-ID')}
                  </p>
                  <p className="text-[10px] text-tertiary-container dark:text-tertiary-fixed font-extrabold mt-1">
                    +{realizedPLPercent.toFixed(1)}% (Kupon Bersih)
                  </p>
                </div>
              </div>
            </section>

            {/* Investment Assets Table */}
            <section>
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
                <h3 className="font-headline text-base sm:text-lg lg:text-xl font-bold tracking-tight dark:text-white">Portofolio Investasi</h3>
                <div className="flex items-center gap-2 self-stretch sm:self-auto w-full sm:w-auto">
                  {/* Search Input Field */}
                  <div className={`relative transition-all duration-300 ${isSearchOpen ? 'flex-1 sm:w-64 sm:flex-none opacity-100' : 'w-0 opacity-0 overflow-hidden'}`}>
                    <input
                      type="text"
                      placeholder="Cari nama aset, ticker, catatan..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-8 py-2 text-xs lg:text-sm bg-surface-container dark:bg-white/5 border border-outline-variant/20 dark:border-white/10 rounded-xl focus:outline-none focus:border-primary dark:focus:border-[#a7c8ff] text-on-surface dark:text-white transition-all font-bold placeholder:font-normal"
                      disabled={!isSearchOpen}
                      ref={(input) => {
                        if (input && isSearchOpen) {
                          input.focus();
                        }
                      }}
                    />
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant dark:text-outline text-sm lg:text-base opacity-75">search</span>
                    {searchQuery && (
                      <button 
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant dark:text-outline hover:text-primary dark:hover:text-[#a7c8ff]"
                      >
                        <span className="material-symbols-outlined text-xs lg:text-sm">close</span>
                      </button>
                    )}
                  </div>

                  {/* Toggle Search Button */}
                  <button 
                    onClick={() => {
                      setIsSearchOpen(!isSearchOpen);
                      if (isSearchOpen) setSearchQuery(''); // clear query when closing
                    }}
                    className={`p-2 hover:bg-surface-container dark:hover:bg-white/10 rounded-lg transition-colors border border-outline-variant/20 dark:border-white/10 ${isSearchOpen ? 'bg-primary/10 border-primary dark:bg-[#a7c8ff]/10 dark:border-[#a7c8ff] text-primary dark:text-[#a7c8ff]' : 'text-on-surface-variant dark:text-white'}`}
                    title="Cari"
                  >
                    <span className="material-symbols-outlined text-sm lg:text-base">
                      {isSearchOpen ? 'search_off' : 'search'}
                    </span>
                  </button>

                  {/* Filter Dropdown */}
                  <div className="relative">
                    <button 
                      onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
                      className={`p-2 hover:bg-surface-container dark:hover:bg-white/10 rounded-lg transition-colors border border-outline-variant/20 dark:border-white/10 flex items-center justify-center relative ${
                        selectedFilter !== 'all' 
                          ? 'bg-primary/10 border-primary dark:bg-[#a7c8ff]/10 dark:border-[#a7c8ff] text-primary dark:text-[#a7c8ff]' 
                          : 'text-on-surface-variant dark:text-white'
                      }`}
                      title="Filter Kelas Aset"
                    >
                      <span className="material-symbols-outlined text-sm lg:text-base">filter_list</span>
                      {selectedFilter !== 'all' && (
                        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-primary dark:bg-[#a7c8ff] rounded-full ring-1 ring-surface dark:ring-[#1a2333]"></span>
                      )}
                    </button>
                    
                    {isFilterDropdownOpen && (
                      <>
                        <div className="fixed inset-0 z-20" onClick={() => setIsFilterDropdownOpen(false)}></div>
                        <div className="absolute right-0 mt-2 w-48 bg-surface-container-highest dark:bg-[#1e293b] border border-outline-variant/10 dark:border-white/10 rounded-2xl shadow-xl z-30 py-2 animate-in fade-in slide-in-from-top-2 duration-200">
                          <div className="px-4 py-1.5 text-[9px] font-extrabold uppercase tracking-widest text-on-surface-variant dark:text-outline border-b border-outline-variant/10 dark:border-white/5 mb-1.5">
                            Filter Kelas Aset
                          </div>
                          {[
                            { value: 'all', label: 'Semua Aset' },
                            { value: 'saham', label: 'Saham' },
                            { value: 'reksadana', label: 'Reksadana' },
                            { value: 'sbn', label: 'SBN / Obligasi' },
                            { value: 'deposito', label: 'Deposito' },
                            { value: 'p2p', label: 'P2P Lending' },
                            { value: 'kripto', label: 'Kripto' },
                            { value: 'dicairkan', label: 'Sudah Dicairkan' }
                          ].map(opt => (
                            <button
                              key={opt.value}
                              onClick={() => {
                                setSelectedFilter(opt.value);
                                setIsFilterDropdownOpen(false);
                              }}
                              className={`w-full text-left px-4 py-2 text-xs lg:text-sm font-bold flex items-center justify-between hover:bg-surface-container dark:hover:bg-white/5 transition-colors ${
                                selectedFilter === opt.value 
                                  ? 'text-primary dark:text-[#a7c8ff] bg-primary/5 dark:bg-[#a7c8ff]/5' 
                                  : 'text-on-surface-variant dark:text-slate-300'
                              }`}
                            >
                              <span>{opt.label}</span>
                              {selectedFilter === opt.value && (
                                <span className="material-symbols-outlined text-xs lg:text-sm shrink-0">check</span>
                              )}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="bg-surface-container-lowest dark:bg-transparent rounded-2xl overflow-hidden border border-outline-variant/10 dark:border-white/10 shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse whitespace-nowrap min-w-[800px]">
                    <thead>
                      <tr className="bg-surface-container-low dark:bg-white/5 border-b border-outline-variant/10 dark:border-white/10">
                        <th className="px-6 lg:px-8 py-4 font-label text-[10px] lg:text-xs uppercase tracking-widest text-on-surface-variant dark:text-outline font-bold">Kelas Aset</th>
                        <th className="px-6 lg:px-8 py-4 font-label text-[10px] lg:text-xs uppercase tracking-widest text-on-surface-variant dark:text-outline font-bold text-right">Modal Investasi</th>
                        <th className="px-6 lg:px-8 py-4 font-label text-[10px] lg:text-xs uppercase tracking-widest text-on-surface-variant dark:text-outline font-bold text-right">Nilai Pasar</th>
                        <th className="px-6 lg:px-8 py-4 font-label text-[10px] lg:text-xs uppercase tracking-widest text-on-surface-variant dark:text-outline font-bold text-right">P/L (Total)</th>
                        <th className="px-6 lg:px-8 py-4 font-label text-[10px] lg:text-xs uppercase tracking-widest text-on-surface-variant dark:text-outline font-bold text-right">Imbal Hasil</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/10 dark:divide-white/5">
                      {filteredInvestmentAssets.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="text-center py-12 text-on-surface-variant dark:text-outline">
                            <div className="flex flex-col items-center justify-center space-y-2">
                              <span className="material-symbols-outlined text-4xl opacity-50">search_off</span>
                              <p className="text-sm font-bold">Tidak ada aset investasi yang cocok</p>
                              <p className="text-xs opacity-75">Coba sesuaikan kata kunci pencarian atau filter Anda.</p>
                              {(searchQuery || selectedFilter !== 'all') && (
                                <button 
                                  onClick={() => {
                                    setSearchQuery('');
                                    setSelectedFilter('all');
                                  }}
                                  className="mt-2 text-xs font-bold text-primary dark:text-[#a7c8ff] hover:underline cursor-pointer"
                                >
                                  Reset Pencarian &amp; Filter
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ) : (
                        filteredInvestmentAssets.map(asset => {
                          const isFixedIncome = asset.subType === 'sbn' || asset.subType === 'deposito' || asset.subType === 'p2p' || (asset.title || '').includes('ST012');
                        const isMatured = asset.maturityDate ? new Date(asset.maturityDate) < new Date() : false;
                        const isLiquidated = asset.currentValue === 0 && (isMatured || asset.purchasePrice === 0);

                        let pl = 0;
                        let plPercent = 0;
                        let marketValue = asset.currentValue;
                        if (isFixedIncome && marketValue === 0 && asset.purchasePrice > 0 && !isMatured) {
                          marketValue = asset.purchasePrice;
                        }

                        if (isFixedIncome && asset.purchasePrice > 0) {
                          const principal = asset.purchasePrice;
                          const couponRate = asset.interestRate || (asset.subType === 'deposito' ? 4.5 : asset.subType === 'p2p' ? 12.0 : 6.4);
                          // @ts-ignore
                          const taxRate = asset.tax !== undefined ? asset.tax : (asset.subType === 'deposito' ? 0.20 : asset.subType === 'p2p' ? 0.15 : 0.10);
                          const yearlyGross = principal * (couponRate / 100);
                          const yearlyNet = yearlyGross * (1 - taxRate);
                          const monthlyNet = Math.round(yearlyNet / 12);
                          // @ts-ignore
                          const totalTenorMonths = asset.tenor !== undefined ? (asset.subType === 'sbn' ? asset.tenor * 12 : asset.tenor) : (asset.subType === 'sbn' ? 24 : 12);
                          
                          const elapsedMonths = isLiquidated ? totalTenorMonths : getMonthsBetween(asset.purchaseDate, asset.maturityDate, totalTenorMonths);
                          const couponsReceived = monthlyNet * elapsedMonths;
                          pl = (marketValue - principal) + couponsReceived;
                          plPercent = principal > 0 ? (pl / principal * 100) : 0;
                        } else {
                          pl = marketValue - asset.purchasePrice;
                          plPercent = asset.purchasePrice > 0 ? (pl / asset.purchasePrice * 100) : 0;
                        }

                        const plSign = pl >= 0 ? '+' : '-';
                        const plColorClass = pl >= 0 ? 'text-tertiary-container dark:text-tertiary-fixed font-bold' : 'text-error dark:text-[#ffb4ab] font-bold';
                        const plPercentBgClass = pl >= 0 ? 'bg-tertiary-fixed dark:bg-tertiary-fixed/20 text-on-tertiary-fixed dark:text-tertiary-fixed' : 'bg-error-container dark:bg-error-container/30 text-on-error-container dark:text-[#ffb4ab]';
                        
                        // Extract ticker or get fallback abbreviation
                        const safeTitle = asset.title || '';
                        const displayAbbr = getAssetAbbreviation(safeTitle);
                        const gradientClass = getAssetGradient(displayAbbr);
                        const cleanTitle = safeTitle.replace(/\([^)]+\)/, '').trim();

                        // Visual styling details
                        const isSaham = asset.subType === 'saham';
                        const isReksadana = asset.subType === 'reksadana';
                        const isSbn = asset.subType === 'sbn' || safeTitle.toLowerCase().includes('st012') || safeTitle.toLowerCase().includes('sukuk');
                        
                        let badgeText = 'Investasi';
                        let badgeColor = 'bg-slate-100 text-slate-600 dark:bg-slate-800/40 dark:text-slate-400';
                        if (isLiquidated) {
                          badgeText = 'Dicairkan';
                          badgeColor = 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/30';
                        } else if (isSaham) {
                          badgeText = 'Saham';
                          badgeColor = 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 border border-blue-200/20';
                        } else if (isReksadana) {
                          badgeText = 'Reksadana';
                          badgeColor = 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400 border border-purple-200/20';
                        } else if (isSbn) {
                          badgeText = 'SBN';
                          badgeColor = 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400 border border-amber-200/20';
                        }

                        return (
                          <tr key={asset.id} className={`hover:bg-surface-bright dark:hover:bg-white/[0.02] transition-colors ${isLiquidated ? 'opacity-80' : ''}`}>
                            <td className="px-6 lg:px-8 py-4 lg:py-5">
                              <div className="flex items-center gap-3 lg:gap-4">
                                <div className={`w-8 h-8 lg:w-10 lg:h-10 rounded-xl bg-gradient-to-br ${gradientClass} flex items-center justify-center font-bold text-[10px] lg:text-xs tracking-wider shadow-sm shrink-0`}>
                                  {displayAbbr}
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <p className="font-bold text-sm lg:text-base dark:text-white">{cleanTitle}</p>
                                    <span className={`px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide rounded-md ${badgeColor}`}>
                                      {badgeText}
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-on-surface-variant dark:text-outline uppercase font-medium mt-0.5">{asset.notes}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 lg:px-8 py-4 lg:py-5 text-right tabular-nums text-sm lg:text-base text-on-surface-variant dark:text-slate-300">Rp {asset.purchasePrice.toLocaleString('id-ID')}</td>
                            <td className="px-6 lg:px-8 py-4 lg:py-5 text-right tabular-nums text-sm lg:text-base font-bold dark:text-white">
                              {isLiquidated ? (
                                <div className="flex flex-col items-end">
                                  <span>Rp 0</span>
                                  <span className="text-[9px] font-semibold text-outline-variant uppercase">Sudah Likuid</span>
                                </div>
                              ) : (
                                `Rp ${marketValue.toLocaleString('id-ID')}`
                              )}
                            </td>
                            <td className="px-6 lg:px-8 py-4 lg:py-5 text-right tabular-nums">
                              <span className={`${plColorClass} text-sm lg:text-base`}>{plSign}Rp {Math.abs(pl).toLocaleString('id-ID')}</span>
                            </td>
                            <td className="px-6 lg:px-8 py-4 lg:py-5 text-right tabular-nums">
                              <span className={`px-2.5 py-1 lg:py-1.5 ${plPercentBgClass} text-[10px] lg:text-xs font-bold rounded-md`}>{plSign}{Math.abs(plPercent).toFixed(1)}%</span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          </div>
        )}

        {activeTab === 'ekuitas' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8 pt-4">
            {/* Sub-tab Navigation (Premium Glassmorphism Style) */}
            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 sm:gap-4 border-b border-outline-variant/10 dark:border-white/10 pb-4">
              <div className="flex bg-surface-container-low dark:bg-white/5 p-1 sm:p-1.5 rounded-2xl border border-outline-variant/10 dark:border-white/5 w-full sm:w-auto overflow-x-auto no-scrollbar snap-x snap-mandatory">
                <button
                  onClick={() => setSubTab('saham-reksa')}
                  className={`flex-1 sm:flex-none snap-start whitespace-nowrap px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl font-bold text-[11px] sm:text-xs lg:text-sm transition-all duration-300 flex items-center justify-center gap-1.5 sm:gap-2 ${
                    subTab === 'saham-reksa'
                      ? 'bg-primary dark:bg-[#a7c8ff] text-white dark:text-[#001b3c] shadow-md shadow-primary/20 dark:shadow-[#a7c8ff]/10'
                      : 'text-on-surface-variant dark:text-outline hover:text-primary dark:hover:text-[#a7c8ff]'
                  }`}
                >
                  <span className="material-symbols-outlined text-[15px] sm:text-sm lg:text-base">trending_up</span>
                  Saham &amp; Reksadana
                </button>
                <button
                  onClick={() => setSubTab('sbn-deposito')}
                  className={`flex-1 sm:flex-none snap-start whitespace-nowrap px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl font-bold text-[11px] sm:text-xs lg:text-sm transition-all duration-300 flex items-center justify-center gap-1.5 sm:gap-2 ${
                    subTab === 'sbn-deposito'
                      ? 'bg-primary dark:bg-[#a7c8ff] text-white dark:text-[#001b3c] shadow-md shadow-primary/20 dark:shadow-[#a7c8ff]/10'
                      : 'text-on-surface-variant dark:text-outline hover:text-primary dark:hover:text-[#a7c8ff]'
                  }`}
                >
                  <span className="material-symbols-outlined text-[15px] sm:text-sm lg:text-base">account_balance</span>
                  SBN &amp; Deposito
                </button>
                <button
                  onClick={() => setSubTab('analisis')}
                  className={`flex-1 sm:flex-none snap-start whitespace-nowrap px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl font-bold text-[11px] sm:text-xs lg:text-sm transition-all duration-300 flex items-center justify-center gap-1.5 sm:gap-2 ${
                    subTab === 'analisis'
                      ? 'bg-primary dark:bg-[#a7c8ff] text-white dark:text-[#001b3c] shadow-md shadow-primary/20 dark:shadow-[#a7c8ff]/10'
                      : 'text-on-surface-variant dark:text-outline hover:text-primary dark:hover:text-[#a7c8ff]'
                  }`}
                >
                  <span className="material-symbols-outlined text-[15px] sm:text-sm lg:text-base">analytics</span>
                  <span className="hidden sm:inline">Kinerja &amp; Benchmark</span>
                  <span className="sm:hidden">Kinerja</span>
                </button>
              </div>

              <div className="flex gap-3 w-full sm:w-auto">
                <button
                  onClick={() => onNavigate && onNavigate('equity-ledger')}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-surface-container-low dark:bg-white/5 border border-outline-variant/20 dark:border-white/10 text-primary dark:text-[#a7c8ff] font-bold text-xs lg:text-sm rounded-xl hover:bg-surface-container hover:-translate-y-0.5 transition-all shadow-sm"
                >
                  <span className="material-symbols-outlined text-base">menu_book</span>
                  Buka Buku Besar
                </button>
              </div>
            </div>

            {/* Sub-tab Content: Saham & Reksadana */}
            {subTab === 'saham-reksa' && (() => {
              const stocksAndMutualFunds = assets.filter(a => a.category === 'investasi').map(a => {
                const safeTitle = a.title || '';
                const titleLower = safeTitle.toLowerCase();
                let subType = a.subType || 'saham';
                if (titleLower.includes('reksadana') || titleLower.includes('schroder') || titleLower.includes('indeks')) subType = 'reksadana';
                if (titleLower.includes('st012') || titleLower.includes('sukuk') || titleLower.includes('sbn')) subType = 'sbn';
                
                const displayTicker = subType === 'saham'
                  ? (a.ticker || getAssetAbbreviation(safeTitle) || 'ASSET')
                  : getAssetInitials(safeTitle);

                return {
                  ...a,
                  ticker: displayTicker,
                  shares: a.shares || 1,
                  avgCost: a.avgCost || a.purchasePrice || a.currentValue,
                  subType
                };
              }).filter(a => 
                a.subType === 'saham' || a.subType === 'reksadana'
              );

              let liveTotalMarketValue = 0;
              let liveTotalPurchasePrice = 0;

              const stocksAndMutualFundsWithLive = stocksAndMutualFunds.map(a => {
                const shares = a.shares || 1;
                const purchasePrice = a.purchasePrice || a.currentValue;
                const currentValue = a.currentValue;
                
                liveTotalMarketValue += currentValue;
                liveTotalPurchasePrice += purchasePrice;

                const pl = currentValue - purchasePrice;
                const plPercent = purchasePrice > 0 ? (pl / purchasePrice) * 100 : 0;

                return {
                  ...a,
                  purchasePrice,
                  currentValue,
                  pl,
                  plPercent,
                  livePrice: a.currentPrice || (currentValue / shares),
                  flash: null
                };
              });

              const totalPL = liveTotalMarketValue - liveTotalPurchasePrice;
              const plPercentTotal = liveTotalPurchasePrice > 0 ? (totalPL / liveTotalPurchasePrice) * 100 : 0;

              return (
                <div className="space-y-5 sm:space-y-6 lg:space-y-8 animate-in fade-in duration-500">
                  {/* Top Live Performance Metrics bar */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
                    <div className="bg-surface-container-lowest dark:bg-white/5 border border-outline-variant/10 dark:border-white/5 p-4 sm:p-5 lg:p-6 rounded-2xl shadow-sm flex flex-col justify-between gap-2">
                      <span className="text-[9px] sm:text-[10px] font-bold text-on-surface-variant dark:text-outline uppercase tracking-widest block">Nilai Ekuitas (Live)</span>
                      <h4 className="text-xl sm:text-2xl font-headline font-extrabold text-primary dark:text-[#a7c8ff] tabular-nums break-all leading-tight">Rp {liveTotalMarketValue.toLocaleString('id-ID')}</h4>
                      <p className="text-[11px] sm:text-xs text-on-surface-variant dark:text-outline font-medium">Saham delayed ~20 mnt · Reksadana NAV T+1</p>
                    </div>
                    <div className="bg-surface-container-lowest dark:bg-white/5 border border-outline-variant/10 dark:border-white/5 p-4 sm:p-5 lg:p-6 rounded-2xl shadow-sm flex flex-col justify-between gap-2">
                      <span className="text-[9px] sm:text-[10px] font-bold text-on-surface-variant dark:text-outline uppercase tracking-widest block">Modal Diinvestasikan</span>
                      <h4 className="text-xl sm:text-2xl font-headline font-extrabold text-on-surface dark:text-white tabular-nums break-all leading-tight">Rp {liveTotalPurchasePrice.toLocaleString('id-ID')}</h4>
                      <p className="text-[11px] sm:text-xs text-on-surface-variant dark:text-outline font-medium">Total modal historis</p>
                    </div>
                    <div className={`border p-4 sm:p-5 lg:p-6 rounded-2xl shadow-sm flex flex-col justify-between gap-2 transition-all duration-500 ${
                      totalPL >= 0
                        ? 'bg-tertiary-container/10 border-tertiary-container dark:bg-tertiary-fixed/5 dark:border-tertiary-fixed/30 text-on-tertiary-container dark:text-tertiary-fixed'
                        : 'bg-error-container/10 border-error-container dark:bg-error-container/5 dark:border-error-container/30 text-error dark:text-[#ffb4ab]'
                    }`}>
                      <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest block">Capital Gain / Loss</span>
                      <h4 className="text-xl sm:text-2xl font-headline font-extrabold tabular-nums leading-tight break-all">
                        {totalPL >= 0 ? '+' : '-'}Rp {Math.abs(totalPL).toLocaleString('id-ID')}
                      </h4>
                      <span className={`text-[11px] sm:text-xs font-bold px-2 py-0.5 rounded-md w-fit ${
                        totalPL >= 0
                          ? 'bg-tertiary-fixed dark:bg-tertiary-fixed/20 text-on-tertiary-fixed dark:text-tertiary-fixed'
                          : 'bg-error-container dark:bg-error-container/20 text-on-error-container dark:text-[#ffb4ab]'
                      }`}>
                        {totalPL >= 0 ? '+' : ''}{plPercentTotal.toFixed(2)}% Live Return
                      </span>
                    </div>
                  </div>

                  {/* Stock Cards Grid (Extremely Premium Layout) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
                    {stocksAndMutualFundsWithLive.map(asset => {
                      const isProfit = asset.pl >= 0;
                      const subtypeText = asset.subType === 'saham' ? 'Saham' : 'Reksadana';
                      const subtypeColor = asset.subType === 'saham' 
                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-200/50 dark:border-blue-900/30' 
                        : 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 border-purple-200/50 dark:border-purple-900/30';
                      
                      const flashBorderClass = asset.flash === 'up' 
                        ? 'border-emerald-500 dark:border-emerald-500 scale-[1.01] shadow-lg shadow-emerald-500/10' 
                        : asset.flash === 'down' 
                        ? 'border-red-500 dark:border-red-500 scale-[1.01] shadow-lg shadow-red-500/10' 
                        : 'border-outline-variant/10 dark:border-white/5 hover:border-primary/20 dark:hover:border-[#a7c8ff]/20';

                      return (
                        <div key={asset.id} className={`bg-surface-container-lowest dark:bg-white/5 border rounded-2xl sm:rounded-[22px] p-4 sm:p-5 lg:p-6 space-y-4 sm:space-y-5 lg:space-y-6 flex flex-col justify-between shadow-sm hover:shadow-md transition-all duration-500 group ${flashBorderClass}`}>
                          {/* Card Header */}
                          <div className="flex justify-between items-start gap-3 sm:gap-4">
                            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${getAssetGradient(asset.ticker || 'AS')} flex items-center justify-center font-extrabold text-xs tracking-wider shrink-0`}>
                                {asset.ticker}
                              </div>
                              <div className="min-w-0">
                                <h4 className="font-headline font-bold text-sm lg:text-base text-on-surface dark:text-white leading-tight group-hover:text-primary dark:group-hover:text-[#a7c8ff] transition-colors truncate">{asset.title}</h4>
                                <p className="text-[10px] text-on-surface-variant dark:text-outline font-bold uppercase tracking-wider mt-1 truncate">{asset.location}</p>
                              </div>
                            </div>
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap shrink-0 ${subtypeColor}`}>
                              {subtypeText}
                            </span>
                          </div>

                          {/* Holding Details */}
                          <div className="grid grid-cols-2 gap-4 py-3 border-y border-outline-variant/10 dark:border-white/5 text-xs">
                            <div>
                              <p className="text-on-surface-variant dark:text-outline text-[10px] uppercase font-bold tracking-wider mb-1">Kepemilikan</p>
                              <p className="font-bold text-on-surface dark:text-slate-300 tabular-nums">
                                {formatShares(asset.shares || 0, asset.subType)}
                              </p>
                            </div>
                            <div>
                              <p className="text-on-surface-variant dark:text-outline text-[10px] uppercase font-bold tracking-wider mb-1">Harga Avg</p>
                              <p className="font-bold text-on-surface-variant dark:text-slate-400 tabular-nums">
                                Rp {formatPriceID(asset.avgCost || 0, getPriceDecimals(asset.subType))}
                              </p>
                            </div>
                          </div>

                          {/* Live Ticking Prices */}
                          <div className="flex justify-between items-center py-1">
                            <div>
                              <div className="flex items-center gap-1.5 group/edit">
                                <p className="text-on-surface-variant dark:text-outline text-[10px] uppercase font-bold tracking-wider mb-0.5">Harga Terakhir</p>
                                {manualOverrideIds.has(asset.id) && (
                                  <span className="px-1.5 py-px rounded text-[8px] font-extrabold uppercase tracking-wider bg-amber-500/15 text-amber-400 border border-amber-500/30" title="Diupdate manual selama sesi ini">Manual</span>
                                )}
                                <button
                                  onClick={() => handleOpenEditPrice(asset)}
                                  className="opacity-0 group-hover:opacity-100 group-hover/edit:opacity-100 transition-opacity p-0.5 rounded hover:bg-surface-container dark:hover:bg-white/10 flex items-center justify-center text-primary dark:text-[#a7c8ff]"
                                  title="Edit Harga Terakhir"
                                >
                                  <span className="material-symbols-outlined text-[13px] font-bold">edit</span>
                                </button>
                              </div>
                              <p className={`font-headline font-extrabold text-sm lg:text-base transition-colors duration-300 tabular-nums ${
                                asset.flash === 'up' ? 'text-emerald-500 scale-[1.05]' : asset.flash === 'down' ? 'text-red-500 scale-[1.05]' : 'dark:text-white'
                              }`}>
                                Rp {formatPriceID(asset.livePrice || 0, getPriceDecimals(asset.subType))}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-on-surface-variant dark:text-outline text-[10px] uppercase font-bold tracking-wider mb-0.5">Nilai Pasar</p>
                              <p className="font-headline font-extrabold text-sm lg:text-base dark:text-white tabular-nums">
                                Rp {asset.currentValue.toLocaleString('id-ID')}
                              </p>
                            </div>
                          </div>

                          {/* Profit Loss Indicator */}
                          <div className={`mt-2 p-3 rounded-xl flex items-center justify-between text-xs font-bold border transition-colors ${
                            isProfit
                              ? 'bg-tertiary-container/10 border-tertiary-container/30 dark:bg-tertiary-fixed/5 dark:border-tertiary-fixed/15 text-tertiary-container dark:text-tertiary-fixed'
                              : 'bg-error-container/10 border-error-container/30 dark:bg-error-container/5 dark:border-error-container/15 text-error dark:text-[#ffb4ab]'
                          }`}>
                            <span className="flex items-center gap-1">
                              <span className="material-symbols-outlined text-sm">{isProfit ? 'trending_up' : 'trending_down'}</span>
                              Live P/L:
                            </span>
                            <span className="tabular-nums">
                              {isProfit ? '+' : '-'}Rp {Math.abs(asset.pl).toLocaleString('id-ID')} ({isProfit ? '+' : ''}{asset.plPercent.toFixed(1)}%)
                            </span>
                          </div>

                          {/* Wave B: Jual holding */}
                          {asset.currentValue > 0 && (
                            <button
                              onClick={() => setSellAsset(asset)}
                              className="mt-2 w-full py-2 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-emerald-500/20 border border-emerald-500/20 transition-colors cursor-pointer"
                            >
                              <span className="material-symbols-outlined text-sm">sell</span> Jual
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* Sub-tab Content: SBN & Deposito */}
            {subTab === 'sbn-deposito' && (() => {
              const fixedIncomeAssets = assets.filter(a => 
                a.category === 'investasi' && 
                (a.subType === 'sbn' || a.subType === 'deposito' || a.subType === 'p2p' || (a.title || '').includes('ST012'))
              );

              return (
                <div className="space-y-5 sm:space-y-6 lg:space-y-8 animate-in fade-in duration-500">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 mb-2">
                    <div>
                      <h3 className="font-headline text-base sm:text-lg lg:text-xl font-bold tracking-tight dark:text-white">Portofolio Surat Berharga Negara (SBN) &amp; Pendapatan Tetap</h3>
                      <p className="text-on-surface-variant dark:text-outline text-[11px] sm:text-xs lg:text-sm font-medium mt-1">Investasi dengan imbal hasil teratur dan terjamin aman (SBN, Deposito Terjamin, &amp; P2P Lending).</p>
                    </div>
                  </div>

                  {fixedIncomeAssets.length === 0 ? (
                    <div className="bg-surface-container-low dark:bg-white/5 border border-outline-variant/10 dark:border-white/5 rounded-2xl p-8 sm:p-12 text-center text-on-surface-variant dark:text-outline space-y-4">
                      <span className="material-symbols-outlined text-5xl text-outline-variant dark:text-outline/40">account_balance</span>
                      <p className="text-sm font-bold">Belum ada instrumen Pendapatan Tetap.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
                      {fixedIncomeAssets.map(asset => {
                        const isMatured = asset.maturityDate ? new Date(asset.maturityDate) < new Date() : false;
                        const isLiquidated = asset.currentValue === 0 && (isMatured || asset.purchasePrice === 0);

                        // Kupon calculations
                        const principal = asset.purchasePrice;
                        const couponRate = asset.interestRate || (asset.subType === 'deposito' ? 4.5 : asset.subType === 'p2p' ? 12.0 : 6.4);
                        const taxRate = asset.tax !== undefined ? asset.tax : (asset.subType === 'deposito' ? 0.20 : asset.subType === 'p2p' ? 0.15 : 0.10);
                        const yearlyGross = principal * (couponRate / 100);
                        const yearlyNet = yearlyGross * (1 - taxRate);
                        const monthlyNet = Math.round(yearlyNet / 12);
                        const totalTenorMonths = asset.tenor !== undefined ? (asset.subType === 'sbn' ? asset.tenor * 12 : asset.tenor) : (asset.subType === 'sbn' ? 24 : 12);
                        
                        const elapsedMonths = isLiquidated ? totalTenorMonths : getMonthsBetween(asset.purchaseDate, asset.maturityDate, totalTenorMonths);
                        const progressPercent = Math.round((elapsedMonths / totalTenorMonths) * 100);
                        const totalReceivedNet = monthlyNet * elapsedMonths;

                        let tagText = 'Surat Berharga Negara';
                        let iconName = 'account_balance';
                        let subDesc = `Pembelian via ${asset.location} • SBSN Kementerian Keuangan`;
                        let payoutLabel = 'Kupon Bulanan';
                        let iconClass = 'bg-amber-500/10 dark:bg-amber-400/10 border-amber-500/20 text-amber-600 dark:text-amber-400';
                        let tagClass = 'text-amber-600 dark:text-amber-400 bg-amber-500/10 dark:bg-amber-400/10 border border-amber-500/20';

                        if (asset.subType === 'deposito') {
                          tagText = 'Deposito Berjangka';
                          iconName = 'savings';
                          subDesc = `Penempatan via ${asset.location} • Jaminan LPS`;
                          payoutLabel = 'Bunga Bulanan';
                          iconClass = 'bg-blue-500/10 dark:bg-blue-400/10 border-blue-500/20 text-blue-600 dark:text-blue-400';
                          tagClass = 'text-blue-600 dark:text-blue-400 bg-blue-500/10 dark:bg-blue-400/10 border border-blue-500/20';
                        } else if (asset.subType === 'p2p') {
                          tagText = 'P2P Lending';
                          iconName = 'group';
                          subDesc = `Pendanaan via ${asset.location} • Proteksi Asuransi`;
                          payoutLabel = 'Imbal Hasil';
                          iconClass = 'bg-green-500/10 dark:bg-green-400/10 border-green-500/20 text-green-600 dark:text-green-400';
                          tagClass = 'text-green-600 dark:text-green-400 bg-green-500/10 dark:bg-green-400/10 border border-green-500/20';
                        }

                        return (
                          <div key={asset.id} className="bg-surface-container-lowest dark:bg-white/5 rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 border border-outline-variant/10 dark:border-white/5 shadow-sm space-y-4 sm:space-y-6 flex flex-col justify-between relative overflow-hidden group">

                            {/* Decorative background logo */}
                            <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-primary/5 rounded-full blur-2xl group-hover:scale-110 transition-transform duration-700 pointer-events-none"></div>

                            <div className="space-y-4 sm:space-y-6">
                              {/* Card Header */}
                              <div className="flex justify-between items-start gap-3 sm:gap-4">
                                <div className="flex items-start gap-3 sm:gap-4 min-w-0">
                                  <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl border flex items-center justify-center shrink-0 ${iconClass}`}>
                                    <span className="material-symbols-outlined text-xl sm:text-2xl">{iconName}</span>
                                  </div>
                                  <div className="min-w-0">
                                    <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md inline-block ${tagClass}`}>{tagText}</span>
                                    <h4 className="font-headline font-extrabold text-base sm:text-lg lg:text-xl dark:text-white mt-1.5 leading-tight">{asset.title}</h4>
                                    <p className="text-[11px] sm:text-xs text-on-surface-variant dark:text-outline font-semibold mt-1">{subDesc}</p>
                                  </div>
                                </div>
                              </div>

                              {/* Key Metrics Breakdown */}
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-4 border-y border-outline-variant/10 dark:border-white/5 text-xs">
                                <div>
                                  <p className="text-on-surface-variant dark:text-outline text-[10px] uppercase font-bold tracking-wider mb-1">Nilai Pokok</p>
                                  <p className="font-headline font-extrabold text-sm sm:text-base text-on-surface dark:text-white tabular-nums">
                                    Rp {principal.toLocaleString('id-ID')}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-on-surface-variant dark:text-outline text-[10px] uppercase font-bold tracking-wider mb-1">Imbal Hasil</p>
                                  <p className="font-headline font-extrabold text-sm sm:text-base text-emerald-600 dark:text-[#a7c8ff] tabular-nums">
                                    {couponRate.toFixed(2)}% p.a.
                                  </p>
                                </div>
                                <div>
                                  <p className="text-on-surface-variant dark:text-outline text-[10px] uppercase font-bold tracking-wider mb-1">{payoutLabel}</p>
                                  <p className="font-headline font-extrabold text-sm sm:text-base text-on-surface dark:text-slate-300 tabular-nums">
                                    Rp {monthlyNet.toLocaleString('id-ID')}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-on-surface-variant dark:text-outline text-[10px] uppercase font-bold tracking-wider mb-1">Pajak Final</p>
                                  <p className="font-headline font-extrabold text-sm sm:text-base text-on-surface-variant dark:text-slate-400 tabular-nums">
                                    {(taxRate * 100).toFixed(0)}%
                                  </p>
                                </div>
                              </div>

                              {/* Progress and Tenure details */}
                              <div className="space-y-3">
                                <div className="flex justify-between text-xs font-bold text-on-surface-variant dark:text-outline">
                                  <span>Progres Tenor: {elapsedMonths}/{totalTenorMonths} Bulan ({progressPercent}% Selesai)</span>
                                  <span className="text-amber-600 dark:text-amber-400 font-extrabold">Jatuh Tempo: {asset.maturityDate ? new Date(asset.maturityDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Selesai'}</span>
                                </div>
                                <div className="w-full h-2.5 bg-surface-container-high dark:bg-white/10 rounded-full overflow-hidden border border-outline-variant/10 dark:border-white/5">
                                  <div className="h-full bg-gradient-to-r from-amber-500 to-amber-400 dark:from-amber-400 dark:to-amber-300 rounded-full relative transition-all duration-500 shadow-[0_0_8px_rgba(245,158,11,0.2)]" style={{ width: `${progressPercent}%` }}></div>
                                </div>
                                <p className="text-[10px] text-tertiary-container dark:text-tertiary-fixed font-bold uppercase tracking-wider flex items-center gap-1.5 mt-2">
                                  <span className="material-symbols-outlined text-[14px]">monetization_on</span>
                                  Total Kumulatif Bunga Diterima: Rp {totalReceivedNet.toLocaleString('id-ID')} (Net setelah Pajak)
                                </p>
                              </div>
                            </div>

                            {/* Matured Action Box */}
                            <div className="mt-8 pt-6 border-t border-outline-variant/10 dark:border-white/5">
                              {isLiquidated ? (
                                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-5 flex items-start gap-4">
                                  <span className="material-symbols-outlined text-emerald-500 text-3xl font-bold">task_alt</span>
                                  <div className="space-y-1">
                                    <h5 className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">Pencairan Berhasil (Likuid)</h5>
                                    <p className="text-xs text-on-surface-variant dark:text-slate-300 leading-relaxed font-medium">
                                      Dana pokok sebesar <strong className="dark:text-white">Rp {principal.toLocaleString('id-ID')}</strong> telah berhasil dilikuidasi ({asset.notes || 'Telah dicairkan'}) secara instan.
                                    </p>
                                  </div>
                                </div>
                              ) : isMatured ? (
                                <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                  <div className="space-y-1 flex-1">
                                    <h5 className="text-sm font-extrabold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                                      <span className="material-symbols-outlined text-[18px]">verified</span>
                                      {asset.subType === 'deposito' ? 'Deposito Telah Jatuh Tempo!' : asset.subType === 'p2p' ? 'Investasi Telah Selesai!' : 'SBN Telah Jatuh Tempo!'}
                                    </h5>
                                    <p className="text-xs text-on-surface-variant dark:text-slate-300 leading-relaxed font-medium">
                                      {asset.subType === 'deposito' 
                                        ? `Instrumen deposito ini telah mencapai jatuh tempo penuh. Cairkan dana pokok investasi Anda kembali ke rekening pilihan Anda sekarang.` 
                                        : asset.subType === 'p2p'
                                          ? `Penyaluran pendanaan ini telah selesai sepenuhnya. Cairkan dana pokok investasi Anda kembali ke rekening pilihan Anda sekarang.`
                                          : `Surat berharga ini telah mencapai jatuh tempo penuh. Cairkan dana pokok investasi Anda kembali ke rekening pilihan Anda sekarang.`}
                                    </p>
                                  </div>
                                  <button
                                    onClick={() => {
                                      const defaultAcc = accounts.find(a => a.name.toLowerCase().includes('bca')) || accounts[0];
                                      if (defaultAcc) {
                                        setSelectedAccountIdForLiquidation(defaultAcc.id);
                                        setSelectedAssetForLiquidation(asset);
                                        setIsLiquidationOpen(true);
                                      }
                                    }}
                                    className="bg-amber-500 dark:bg-amber-400 text-white dark:text-black font-bold text-xs px-4 py-2.5 rounded-xl hover:bg-amber-600 dark:hover:bg-amber-300 shadow-sm active:scale-95 transition-all shrink-0 cursor-pointer"
                                  >
                                    Cairkan Sekarang
                                  </button>
                                </div>
                              ) : (
                                <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-5 flex items-start gap-4">
                                  <span className="material-symbols-outlined text-blue-600 dark:text-[#a7c8ff] text-3xl font-bold">shield_with_heart</span>
                                  <div className="space-y-1">
                                    <h5 className="text-sm font-extrabold text-blue-600 dark:text-[#a7c8ff]">Investasi Aktif &amp; Berjalan</h5>
                                    <p className="text-xs text-on-surface-variant dark:text-slate-300 leading-relaxed font-medium font-semibold">
                                      Instrumen ini aktif menghasilkan kupon bersih sebesar <strong className="dark:text-white">Rp {monthlyNet.toLocaleString('id-ID')}/bulan</strong>. Nilai pokok dijamin penuh dan akan jatuh tempo pada tanggal <strong className="dark:text-white">{asset.maturityDate ? new Date(asset.maturityDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}</strong>.
                                    </p>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Sub-tab Content: Kinerja & Benchmark */}
            {subTab === 'analisis' && (
              <div className="animate-in fade-in duration-500 space-y-6">
                <RealizedGainCard />
                <FinancePerformanceReport onShowCTA={onShowCTA} onNavigate={onNavigate} hideHeader={true} />
              </div>
            )}
          </div>
        )}

        {activeTab === 'real-estat' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6 sm:space-y-8 lg:space-y-12 pt-4 sm:pt-6 lg:pt-8">
            <section>
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-6 lg:mb-8">
                <div>
                  <h3 className="font-headline text-lg sm:text-xl lg:text-2xl font-extrabold tracking-tight dark:text-white">Daftar Properti &amp; Tanah</h3>
                  <p className="text-on-surface-variant dark:text-outline text-[11px] sm:text-xs lg:text-sm mt-1">Estimasi nilai pasar berdasarkan data transaksi terkini di area sekitarnya.</p>
                </div>
                <button
                  onClick={() => onNavigate && onNavigate('add-asset')}
                  className="self-start sm:self-auto px-4 py-2 bg-primary/10 dark:bg-white/5 text-primary dark:text-[#a7c8ff] rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 border border-outline-variant/20 dark:border-white/10 hover:bg-primary/20 transition-all"
                >
                  <span className="material-symbols-outlined text-lg">add_home</span>
                  <span className="hidden sm:inline">Tambah Properti</span>
                  <span className="sm:hidden">Tambah</span>
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
                {assets.filter(a => a.category === 'real-estat').map(asset => {
                  const isLunas = asset.equity === 100;
                  return (
                    <div key={asset.id} className="bg-surface-container-lowest dark:bg-white/5 rounded-2xl overflow-hidden flex flex-col md:flex-row shadow-sm border border-outline-variant/10 dark:border-white/10 group">
                      <div className="w-full md:w-2/5 h-44 sm:h-48 md:h-auto overflow-hidden relative p-[6px]">
                        <AssetCardVisual asset={asset} />
                      </div>
                      <div className="p-4 sm:p-6 md:p-8 flex-1 flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-start gap-2">
                            <h4 className="font-headline font-extrabold text-xl text-primary dark:text-white">{asset.title}</h4>
                            <div className="relative">
                              <button 
                                onClick={(e) => { 
                                  e.stopPropagation(); 
                                  setAssetActionId(assetActionId === asset.id ? null : asset.id); 
                                }} 
                                className="text-outline hover:text-primary dark:hover:text-white transition-colors p-1.5 rounded-full hover:bg-surface-variant dark:hover:bg-white/10"
                              >
                                <span className="material-symbols-outlined text-sm font-bold">more_vert</span>
                              </button>
                              {assetActionId === asset.id && (
                                <>
                                  <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setAssetActionId(null); }} />
                                  <div className="absolute right-0 top-8 w-36 bg-white dark:bg-[#191c1e] shadow-xl rounded-xl border border-slate-200 dark:border-white/10 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-left">
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setAssetActionId(null);
                                        handleOpenEditPhysical(asset);
                                      }}
                                      className="w-full px-4 py-2.5 text-xs font-bold text-left hover:bg-surface-container dark:hover:bg-white/10 text-on-surface dark:text-white flex items-center gap-2 border-b border-outline-variant/10 dark:border-white/5"
                                    >
                                      <span className="material-symbols-outlined text-sm">edit</span> Edit Valuasi
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setAssetActionId(null);
                                        setDeletingAssetId(asset.id);
                                      }}
                                      className="w-full px-4 py-2.5 text-xs font-bold text-left hover:bg-red-50 dark:hover:bg-red-900/10 text-error flex items-center gap-2"
                                    >
                                      <span className="material-symbols-outlined text-sm">delete</span> Hapus
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                          <p className="text-on-surface-variant dark:text-outline text-xs flex items-center gap-1 mt-1">
                            <span className="material-symbols-outlined text-xs">location_on</span> {asset.location}
                          </p>
                          {asset.documentLink && (
                            <div className="mt-2.5 flex">
                              <a 
                                href={asset.documentLink} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 dark:bg-white/5 dark:hover:bg-white/10 border border-primary/20 dark:border-white/10 rounded-lg text-[10px] font-bold text-primary dark:text-[#a7c8ff] transition-all cursor-pointer shadow-sm hover:scale-[1.02] duration-300"
                              >
                                <span className="material-symbols-outlined text-[13px] font-bold text-primary dark:text-[#a7c8ff]">cloud_queue</span>
                                Lihat Dokumen Properti
                              </a>
                            </div>
                          )}
                        </div>
                        <div className="mt-8 grid grid-cols-2 gap-6">
                          <div>
                            <p className="text-[10px] uppercase tracking-widest text-on-surface-variant dark:text-outline mb-1 font-bold">Harga Beli</p>
                            <p className="font-headline font-bold text-base tabular-nums text-slate-400 dark:text-slate-500">Rp {asset.purchasePrice.toLocaleString('id-ID')}</p>
                          </div>
                          <div>
                            <p className="text-[10px] uppercase tracking-widest text-on-surface-variant dark:text-outline mb-1 font-bold">Nilai Pasar</p>
                            <p className="font-headline font-bold text-base tabular-nums text-on-surface dark:text-white">Rp {asset.currentValue.toLocaleString('id-ID')}</p>
                          </div>
                        </div>
                        <div className="mt-6 pt-5 border-t border-outline-variant/10 dark:border-white/10">
                          <div className="flex justify-between items-center mb-2">
                            <p className="text-[10px] text-tertiary-container dark:text-tertiary-fixed font-bold uppercase tracking-wider">Ekuitas: {asset.equity}% {isLunas ? 'Lunas' : 'dimiliki'}</p>
                            {!isLunas && <p className="text-[10px] text-on-surface-variant dark:text-outline font-bold">{asset.notes}</p>}
                          </div>
                          <div className="w-full h-2 bg-surface-container-high dark:bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full bg-tertiary-fixed-dim dark:bg-tertiary-fixed rounded-full shadow-[0_0_8px_rgba(149,212,179,0.5)]" style={{ width: `${asset.equity}%` }}></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        )}

        {activeTab === 'koleksi' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6 sm:space-y-8 lg:space-y-12 pt-4 sm:pt-6 lg:pt-8">
            <section>
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-6 lg:mb-8">
                <div>
                  <h3 className="font-headline text-lg sm:text-xl lg:text-2xl font-extrabold tracking-tight dark:text-white">Barang Koleksi &amp; Hobi</h3>
                  <p className="text-on-surface-variant dark:text-outline text-[11px] sm:text-xs lg:text-sm mt-1">Estimasi nilai likuidasi berdasarkan lelang internasional dan harga pasar kolektor.</p>
                </div>
                <button
                  onClick={() => onNavigate && onNavigate('add-asset')}
                  className="self-start sm:self-auto px-4 py-2 bg-primary/10 dark:bg-white/5 text-primary dark:text-[#a7c8ff] rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 border border-outline-variant/20 dark:border-white/10 hover:bg-primary/20 transition-all"
                >
                  <span className="material-symbols-outlined text-lg">diamond</span>
                  <span className="hidden sm:inline">Tambah Koleksi</span>
                  <span className="sm:hidden">Tambah</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
                {assets.filter(a => a.category === 'koleksi' || a.category === 'kendaraan').map(asset => {
                  const gain = asset.currentValue - asset.purchasePrice;
                  const gainPercent = asset.purchasePrice > 0 ? (gain / asset.purchasePrice * 100) : 0;
                  const formattedGain = gain !== 0 ? `${gain >= 0 ? '+' : '-'}${Math.abs(gainPercent).toFixed(0)}% ${gain >= 0 ? 'Appreciation' : 'Depreciation'}` : 'Stable Value';
                  const gainClass = gain >= 0 ? 'bg-tertiary-fixed dark:bg-tertiary-fixed/20 text-on-tertiary-fixed dark:text-tertiary-fixed' : 'bg-error-container dark:bg-error-container/30 text-on-error-container dark:text-[#ffb4ab]';
                  return (
                    <div key={asset.id} className="bg-surface-container-lowest dark:bg-white/5 rounded-2xl overflow-hidden shadow-sm border border-outline-variant/10 dark:border-white/10 group flex flex-col">
                      <div className="h-44 sm:h-48 overflow-hidden relative p-[6px]">
                        <AssetCardVisual asset={asset} />
                      </div>
                      <div className="p-4 sm:p-5 lg:p-6 flex-1 flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-start gap-2">
                            <h4 className="font-headline font-bold text-lg text-primary dark:text-white">{asset.title}</h4>
                            <div className="relative">
                              <button 
                                onClick={(e) => { 
                                  e.stopPropagation(); 
                                  setAssetActionId(assetActionId === asset.id ? null : asset.id); 
                                }} 
                                className="text-outline hover:text-primary dark:hover:text-white transition-colors p-1.5 rounded-full hover:bg-surface-variant dark:hover:bg-white/10"
                              >
                                <span className="material-symbols-outlined text-sm font-bold">more_vert</span>
                              </button>
                              {assetActionId === asset.id && (
                                <>
                                  <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setAssetActionId(null); }} />
                                  <div className="absolute right-0 top-8 w-36 bg-white dark:bg-[#191c1e] shadow-xl rounded-xl border border-slate-200 dark:border-white/10 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-left">
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setAssetActionId(null);
                                        handleOpenEditPhysical(asset);
                                      }}
                                      className="w-full px-4 py-2.5 text-xs font-bold text-left hover:bg-surface-container dark:hover:bg-white/10 text-on-surface dark:text-white flex items-center gap-2 border-b border-outline-variant/10 dark:border-white/5"
                                    >
                                      <span className="material-symbols-outlined text-sm">edit</span> Edit Valuasi
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setAssetActionId(null);
                                        setDeletingAssetId(asset.id);
                                      }}
                                      className="w-full px-4 py-2.5 text-xs font-bold text-left hover:bg-red-50 dark:hover:bg-red-900/10 text-error flex items-center gap-2"
                                    >
                                      <span className="material-symbols-outlined text-sm">delete</span> Hapus
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                          <p className="text-on-surface-variant dark:text-outline text-xs mt-1">{asset.notes}</p>
                          {asset.documentLink && (
                            <div className="mt-2.5 flex">
                              <a 
                                href={asset.documentLink} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 dark:bg-white/5 dark:hover:bg-white/10 border border-primary/20 dark:border-white/10 rounded-lg text-[10px] font-bold text-primary dark:text-[#a7c8ff] transition-all cursor-pointer shadow-sm hover:scale-[1.02] duration-300"
                              >
                                <span className="material-symbols-outlined text-[13px] font-bold text-primary dark:text-[#a7c8ff]">cloud_queue</span>
                                Lihat Dokumen Koleksi
                              </a>
                            </div>
                          )}
                        </div>
                        <div className="mt-6 flex justify-between items-end border-t border-outline-variant/10 dark:border-white/10 pt-4">
                          <div>
                            <p className="text-[10px] uppercase tracking-widest text-on-surface-variant dark:text-outline mb-1 font-bold">Nilai Estimasi</p>
                            <p className="font-headline font-bold text-base tabular-nums dark:text-white">Rp {asset.currentValue.toLocaleString('id-ID')}</p>
                          </div>
                          <span className={`px-2 py-1 ${gainClass} text-[10px] font-bold rounded`}>{formattedGain}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        )}
      </div>

      {/* Strategic Insights — Dynamic CFA/CFP Rebalancing */}
      {activeTab === 'ikhtisar' && (
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
        <div className="md:col-span-2 bg-primary-container dark:bg-gradient-to-br dark:from-[#001b3c] dark:to-[#002f5e] text-white p-6 lg:p-8 rounded-2xl relative overflow-hidden group shadow-lg">
          <div className="relative z-10 space-y-5">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <h4 className="font-headline text-xl lg:text-2xl font-bold">Rekomendasi Rebalancing Strategis</h4>
                <span className={`text-[9px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-lg border ${
                  rbFinalRecs[0]?.absVal === 0 
                    ? 'bg-emerald-500/20 border-emerald-400/30 text-emerald-300' 
                    : 'bg-amber-500/20 border-amber-400/30 text-amber-300'
                }`}>
                  {rbRiskProfileName}
                </span>
              </div>
              <p className="text-on-primary-container dark:text-[#a7c8ff]/90 text-xs lg:text-sm max-w-lg leading-relaxed font-medium">
                {rbFinalRecs[0]?.absVal === 0 
                  ? `Alokasi portofolio Anda sudah seimbang dan sesuai profil risiko ${rbRiskProfileName}. Tidak ada penyesuaian signifikan yang dibutuhkan saat ini.`
                  : `Eksposur ${rbMaxClass.name} Anda saat ini di ${rbMaxClassPct}% dari total kekayaan. Berdasarkan profil ${rbRiskProfileName}, berikut rekomendasi penyesuaian portofolio untuk menjaga keseimbangan risiko.`
                }
              </p>
            </div>

            {/* Rebalancing Recommendations */}
            <div className="space-y-2">
              {rbFinalRecs.map((rec, i) => (
                <div key={i} className="bg-white/10 backdrop-blur-md p-3.5 rounded-xl border border-white/10 flex items-center justify-between">
                  <div className="flex flex-col max-w-[72%]">
                    <span className="text-[9px] opacity-75 uppercase tracking-widest mb-0.5">{rec.dir}</span>
                    <span className="text-xs font-bold text-white leading-snug">{rec.act}</span>
                  </div>
                  <div className="text-right font-semibold shrink-0">
                    <span className="text-[9px] opacity-75 block mb-0.5 uppercase tracking-widest">Penyesuaian</span>
                    <span className={`text-xs font-bold ${rec.color} bg-black/20 px-2 py-0.5 rounded`}>{rec.target}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Target vs Actual Mini Progress */}
            <div className="pt-4 border-t border-white/15">
              <h5 className="text-[10px] font-bold uppercase tracking-widest text-[#a7c8ff] mb-3">Target vs Aktual (Aset Likuid)</h5>
              <div className="grid grid-cols-2 gap-2.5 text-[11px]">
                <div className="bg-white/5 border border-white/5 p-2 rounded-lg">
                  <div className="flex justify-between font-bold text-white mb-1.5">
                    <span className="opacity-90">Kas</span>
                    <span className="tabular-nums">{rbActCash}% <span className="opacity-50">/ {rbTargetCash}%</span></span>
                  </div>
                  <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${Math.min(100, rbTargetCash > 0 ? (rbActCash / rbTargetCash) * 100 : 0)}%`, backgroundColor: '#f97316' }}></div>
                  </div>
                </div>
                <div className="bg-white/5 border border-white/5 p-2 rounded-lg">
                  <div className="flex justify-between font-bold text-white mb-1.5">
                    <span className="opacity-90">Pend. Tetap</span>
                    <span className="tabular-nums">{rbActFixed}% <span className="opacity-50">/ {rbTargetFixed}%</span></span>
                  </div>
                  <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${Math.min(100, rbTargetFixed > 0 ? (rbActFixed / rbTargetFixed) * 100 : 0)}%`, backgroundColor: '#f59e0b' }}></div>
                  </div>
                </div>
                <div className="bg-white/5 border border-white/5 p-2 rounded-lg">
                  <div className="flex justify-between font-bold text-white mb-1.5">
                    <span className="opacity-90">Saham & RD</span>
                    <span className="tabular-nums">{rbActEquities}% <span className="opacity-50">/ {rbTargetEquities}%</span></span>
                  </div>
                  <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${Math.min(100, rbTargetEquities > 0 ? (rbActEquities / rbTargetEquities) * 100 : 0)}%`, backgroundColor: '#3b82f6' }}></div>
                  </div>
                </div>
                <div className="bg-white/5 border border-white/5 p-2 rounded-lg">
                  <div className="flex justify-between font-bold text-white mb-1.5">
                    <span className="opacity-90">Kripto</span>
                    <span className="tabular-nums">{rbActCrypto}% <span className="opacity-50">/ {rbTargetCrypto}%</span></span>
                  </div>
                  <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${Math.min(100, rbTargetCrypto > 0 ? (rbActCrypto / rbTargetCrypto) * 100 : 0)}%`, backgroundColor: '#a855f7' }}></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <p className="text-[9px] opacity-60 leading-tight max-w-[60%]">
                * Rekomendasi dihitung real-time berdasarkan CFA Weighted Risk Model & CFP Standard Allocation untuk profil <strong>{rbRiskProfileName}</strong>. Skor Diversifikasi (HHI): {rbDivScore.toFixed(1)}/10.
              </p>
              <button
                onClick={() => { setActiveTab('ekuitas'); setSubTab('analisis'); }}
                className="bg-white text-primary px-4 py-2 rounded-lg font-extrabold text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-colors shadow-md active:scale-95 flex items-center gap-1.5 w-fit cursor-pointer shrink-0"
              >
                <span className="material-symbols-outlined text-sm">analytics</span>
                Laporan Lengkap
              </button>
            </div>
          </div>
          {/* Abstract pattern */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-20 -mt-20 group-hover:scale-110 transition-transform duration-700"></div>
          <div className="absolute bottom-0 right-0 w-32 h-32 bg-on-primary-container/10 dark:bg-[#a7c8ff]/10 rounded-full blur-2xl mr-10 mb-10"></div>
        </div>

        {/* Dynamic Liquidity Score Card */}
        <div className="bg-surface-container-highest dark:bg-white/5 p-6 lg:p-8 rounded-2xl flex flex-col justify-between shadow-sm border border-outline-variant/10 dark:border-white/10">
          <div>
            <p className="text-[10px] lg:text-xs font-label uppercase tracking-widest text-on-surface-variant dark:text-outline mb-2 font-bold">Skor Likuiditas</p>
            <div className="flex items-baseline gap-2">
              <span className={`text-4xl lg:text-5xl font-headline font-extrabold ${rbLiquidityColor}`}>{rbLiquidityScore.toFixed(1)}</span>
              <span className="text-on-surface-variant dark:text-outline text-xs lg:text-sm font-bold">/ 10</span>
            </div>
            <p className="text-xs lg:text-sm text-on-surface-variant dark:text-outline mt-4 leading-snug font-medium">
              {rbLiquidityLabel}. Cadangan kas Anda dapat menutupi pengeluaran operasional selama <strong className="dark:text-white">{Math.floor(rbMonthsCovered)} bulan</strong>.
            </p>
          </div>
          <div className="mt-6 pt-5 border-t border-outline-variant/10 dark:border-white/10 space-y-3">
            <div>
              <div className="flex justify-between text-[10px] font-bold text-on-surface-variant dark:text-slate-400 mb-1">
                <span>Coverage Ratio</span>
                <span className="dark:text-white">{Math.floor(rbMonthsCovered)}/{rbLiquidityScore >= 8 ? '6' : rbLiquidityScore >= 5 ? '6' : '6'} Bulan</span>
              </div>
              <div className="w-full h-1.5 bg-surface-container-high dark:bg-white/10 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-500 ${
                  rbLiquidityScore >= 8 ? 'bg-emerald-500' : rbLiquidityScore >= 5 ? 'bg-blue-500' : rbLiquidityScore >= 3 ? 'bg-amber-500' : 'bg-rose-500'
                }`} style={{ width: `${Math.min(100, (rbMonthsCovered / 24) * 100)}%` }}></div>
              </div>
            </div>
            <p className="text-[9px] text-on-surface-variant/60 dark:text-slate-500 italic leading-tight">
              * Dihitung dari rata-rata pengeluaran {Math.round(elapsedExpenseMonths)} bulan terakhir: Rp {Math.round(avgMonthlyExpense).toLocaleString('id-ID')}/bln
            </p>
          </div>
        </div>
      </section>
      )}

      {/* F2.3 Proteksi / Asuransi */}
      <div className="mt-8 pt-8 border-t border-outline-variant/10 dark:border-white/10 space-y-6 sm:space-y-8">
        <FinanceInsuranceSection />

        <FinanceRetirementSection />
      </div>

      {/* Liquidation Confirmation Modal */}
      {isLiquidationOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-surface-container-lowest dark:bg-[#121318]/95 border border-outline-variant/20 dark:border-white/10 p-6 md:p-8 rounded-3xl max-w-md w-full space-y-6 shadow-2xl relative overflow-hidden text-on-surface dark:text-white">
            
            {/* Background Glow */}
            <div className="absolute right-0 top-0 translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-amber-500/10 rounded-full blur-2xl pointer-events-none"></div>

            {/* Success State */}
            {liquidationSuccess ? (
              <div className="space-y-6 text-center py-4 animate-in zoom-in-95 duration-300">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
                  <span className="material-symbols-outlined text-4xl font-bold">check_circle</span>
                </div>
                <div className="space-y-2">
                  <h4 className="font-headline font-extrabold text-xl text-on-surface dark:text-white">Pencairan Berhasil!</h4>
                  <p className="text-sm text-on-surface-variant dark:text-slate-300 leading-relaxed font-medium">
                    Dana pokok investasi sebesar <strong className="text-on-surface dark:text-white">Rp 100.000.000</strong> telah ditransfer ke <strong className="text-on-surface dark:text-white">Tabungan BCA</strong> Anda dan transaksi pencairan telah tercatat secara real-time.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setIsLiquidationOpen(false);
                    setLiquidationSuccess(false);
                  }}
                  className="w-full bg-emerald-500 hover:bg-emerald-400 text-white font-extrabold py-3 rounded-xl transition-all shadow-lg shadow-emerald-500/20 active:scale-95 text-xs lg:text-sm uppercase tracking-wider cursor-pointer"
                >
                  Selesai
                </button>
              </div>
            ) : (
              // Confirmation State
              <div className="space-y-6 animate-in zoom-in-95 duration-300">
                <div className="flex justify-between items-start">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shadow-md shadow-amber-500/5">
                    <span className="material-symbols-outlined text-2xl">info</span>
                  </div>
                  <button 
                    onClick={() => setIsLiquidationOpen(false)}
                    className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg text-on-surface-variant dark:text-slate-400 hover:text-on-surface dark:hover:text-white transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-xl">close</span>
                  </button>
                </div>

                <div className="space-y-2">
                  <h4 className="font-headline font-extrabold text-xl text-on-surface dark:text-white">
                    Konfirmasi Pencairan {selectedAssetForLiquidation?.subType === 'deposito' ? 'Deposito' : selectedAssetForLiquidation?.subType === 'p2p' ? 'P2P Lending' : 'SBN'}
                  </h4>
                  <p className="text-sm text-on-surface-variant dark:text-slate-300 leading-relaxed font-medium">
                    Apakah Anda yakin ingin mencairkan dana pokok investasi <strong className="text-on-surface dark:text-white">{selectedAssetForLiquidation?.title || 'Investasi'}</strong> sebesar <strong className="text-on-surface dark:text-white">Rp {(selectedAssetForLiquidation?.purchasePrice || 100000000).toLocaleString('id-ID')}</strong>?
                  </p>
                </div>

                {/* Info Card */}
                <div className="bg-surface-container dark:bg-white/5 border border-outline-variant/10 dark:border-white/5 rounded-2xl p-4 space-y-3 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-on-surface-variant dark:text-slate-400 font-semibold">Tujuan Rekening Penampung</span>
                    <select
                      value={selectedAccountIdForLiquidation}
                      onChange={(e) => setSelectedAccountIdForLiquidation(e.target.value)}
                      className="bg-surface-container dark:bg-[#1e293b] border border-outline-variant/20 dark:border-white/10 rounded-lg px-2.5 py-1 text-on-surface dark:text-white font-bold focus:outline-none focus:border-amber-500 cursor-pointer"
                    >
                      {accounts.map(acc => (
                        <option key={acc.id} value={acc.id} className="bg-surface-container dark:bg-[#1e293b] text-on-surface dark:text-white">
                          {acc.name} (Rp {acc.balance.toLocaleString('id-ID')})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant dark:text-slate-400 font-semibold">Jumlah Dana Dicairkan</span>
                    <span className="text-amber-400 font-extrabold">Rp {(selectedAssetForLiquidation?.purchasePrice || 100000000).toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant dark:text-slate-400 font-semibold">Biaya Pencairan</span>
                    <span className="text-emerald-400 font-bold">Bebas Biaya (Rp 0)</span>
                  </div>
                </div>

                <p className="text-[11px] text-on-surface-variant dark:text-slate-400 leading-normal italic font-medium">
                  * Tindakan ini akan mengupdate saldo rekening {accounts.find(a => a.id === selectedAccountIdForLiquidation)?.name || 'pilihan Anda'} sebesar +Rp{(selectedAssetForLiquidation?.purchasePrice || 100000000).toLocaleString('id-ID')}, mencatat transaksi masuk di sistem, dan mengubah nilai aset menjadi Rp0 secara otomatis di cloud database Google Sheets.
                </p>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setIsLiquidationOpen(false)}
                    disabled={isLiquidating}
                    className="flex-1 px-4 py-3 bg-surface-container dark:bg-white/5 border border-outline-variant/20 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10 text-on-surface dark:text-white font-extrabold rounded-xl text-xs lg:text-sm uppercase tracking-wider transition-colors active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    onClick={handleConfirmLiquidation}
                    disabled={isLiquidating}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white font-extrabold rounded-xl text-xs lg:text-sm uppercase tracking-wider shadow-lg shadow-amber-500/20 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isLiquidating ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-on-surface dark:text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Memproses...
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-sm">payments</span>
                        Konfirmasi
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit Last Price Modal */}
      {isEditPriceOpen && (editingAsset || editingAccount) && (() => {
        const isAccount = editType === 'account';
        const isPhysical = editType === 'physical';
        const isInvestment = editType === 'investment';

        const titleText = isAccount 
          ? "Update Saldo Rekening" 
          : isPhysical 
            ? "Update Valuasi Aset" 
            : "Update Harga Terakhir";
            
        const descText = isAccount 
          ? "Sesuaikan saldo tersimpan untuk rekening ini." 
          : isPhysical 
            ? "Sesuaikan taksiran nilai pasar/nilai sisa terkini untuk aset fisik Anda." 
            : "Sesuaikan harga live terkini secara manual untuk merefleksikan portofolio Anda.";

        const targetAsset = editingAsset || {};
        const shares = targetAsset.shares || 0;
        const targetSubType: string | undefined = targetAsset.subType;
        const isSahamSub = targetSubType === 'saham';
        const isReksadanaSub = targetSubType === 'reksadana';
        const isKriptoSub = targetSubType === 'kripto' || targetSubType === 'crypto';
        const unitLabelSingular = isSahamSub ? 'Lembar' : isKriptoSub ? 'Koin' : 'Unit';
        const priceLabel = isSahamSub ? 'Harga per Lembar' : isReksadanaSub ? 'NAV per Unit' : isKriptoSub ? 'Harga per Koin' : `Harga per ${unitLabelSingular}`;
        const priceDecimals = getPriceDecimals(targetSubType);

        const parsedNewPrice = isInvestment ? parsePriceID(newLastPriceInput) : 0;
        const newCurrentValue = Math.round(parsedNewPrice * shares);

        const oldPriceForCompare = isReksadanaSub
          ? (targetAsset.currentNav || targetAsset.currentPrice || 0)
          : (targetAsset.currentPrice || (shares > 0 ? targetAsset.currentValue / shares : 0));
        const avgCost = targetAsset.avgCost || (shares > 0 ? (targetAsset.purchasePrice || 0) / shares : 0);

        const purchasePrice = targetAsset.purchasePrice || (targetAsset.avgCost ? targetAsset.avgCost * shares : targetAsset.currentValue || 0);
        const newPL = newCurrentValue - purchasePrice;
        const newPLPercent = purchasePrice > 0 ? (newPL / purchasePrice) * 100 : 0;
        const newPLIsProfit = newPL >= 0;

        const change = classifyPriceChange(oldPriceForCompare, parsedNewPrice);
        const changeIsPositive = change.deltaPct >= 0;
        const newVsAvgPct = avgCost > 0 ? ((parsedNewPrice - avgCost) / avgCost) * 100 : 0;

        return (
          <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-3 sm:p-4 md:p-6 bg-black/60 backdrop-blur-md animate-in fade-in duration-300 overflow-y-auto">
            <div className="bg-surface-container-lowest dark:bg-[#121318]/95 border border-outline-variant/20 dark:border-white/10 rounded-2xl sm:rounded-3xl max-w-md md:max-w-lg w-full my-auto shadow-2xl relative text-on-surface dark:text-white animate-in zoom-in-95 duration-300 max-h-[calc(100vh-1.5rem)] sm:max-h-[calc(100vh-2rem)] flex flex-col overflow-hidden">

              <div className="absolute right-0 top-0 translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-primary/10 rounded-full blur-2xl pointer-events-none"></div>

              <div className="flex-1 overflow-y-auto px-5 sm:px-6 md:px-8 pt-5 sm:pt-6 md:pt-7 pb-2 space-y-5 scrollbar-thin">

              <div className="flex justify-between items-start">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 text-primary dark:text-[#a7c8ff] flex items-center justify-center shadow-md shadow-primary/5">
                  <span className="material-symbols-outlined text-2xl">
                    {isAccount ? 'account_balance_wallet' : isPhysical ? 'home_storage' : 'edit_document'}
                  </span>
                </div>
                <button 
                  onClick={() => {
                    setIsEditPriceOpen(false);
                    setEditingAsset(null);
                    setEditingAccount(null);
                  }}
                  className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg text-on-surface-variant dark:text-slate-400 hover:text-on-surface dark:hover:text-white transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-xl">close</span>
                </button>
              </div>

              <div className="space-y-1">
                <h4 className="font-headline font-extrabold text-xl text-on-surface dark:text-white">{titleText}</h4>
                <p className="text-xs text-on-surface-variant dark:text-slate-400 leading-relaxed font-medium">
                  {descText}
                </p>
              </div>

              {isAccount ? (
                <div className="bg-surface-container dark:bg-white/5 border border-outline-variant/10 dark:border-white/5 rounded-2xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 dark:bg-[#a7c8ff]/10 flex items-center justify-center text-primary dark:text-[#a7c8ff]">
                      <span className="material-symbols-outlined text-sm">{editingAccount?.icon || 'account_balance'}</span>
                    </div>
                    <div>
                      <h5 className="font-bold text-sm text-on-surface dark:text-white">{editingAccount?.name}</h5>
                      <p className="text-[10px] text-on-surface-variant dark:text-slate-400 font-bold uppercase tracking-wider">{editingAccount?.name.split(' - ')[0] || '-'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-on-surface-variant dark:text-slate-400 text-[10px] uppercase font-bold tracking-wider">Currency</p>
                    <p className="font-bold text-sm text-on-surface dark:text-white">{editingAccount?.currency || 'IDR'}</p>
                  </div>
                </div>
              ) : (
                <div className="bg-surface-container dark:bg-white/5 border border-outline-variant/10 dark:border-white/5 rounded-2xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 dark:bg-[#a7c8ff]/10 flex items-center justify-center text-primary dark:text-[#a7c8ff] font-extrabold text-xs">
                      {isPhysical ? (
                        <span className="material-symbols-outlined text-sm">{editingAsset?.icon || 'category'}</span>
                      ) : (
                        editingAsset?.ticker || 'ASSET'
                      )}
                    </div>
                    <div>
                      <h5 className="font-bold text-sm text-on-surface dark:text-white">{(editingAsset?.title || '').replace(/\([^)]+\)/, '').trim()}</h5>
                      <p className="text-[10px] text-on-surface-variant dark:text-slate-400 font-bold uppercase tracking-wider">{isPhysical ? (editingAsset?.category === 'real-estat' ? 'Real Estat' : editingAsset?.category === 'kendaraan' ? 'Kendaraan' : 'Koleksi') : editingAsset?.location}</p>
                    </div>
                  </div>
                  {!isPhysical && (
                    <div className="text-right">
                      <p className="text-on-surface-variant dark:text-slate-400 text-[10px] uppercase font-bold tracking-wider">Kepemilikan</p>
                      <p className="font-bold text-sm text-on-surface dark:text-white">{formatShares(shares, targetSubType)}</p>
                    </div>
                  )}
                </div>
              )}

              {isPhysical ? (
                <div className="space-y-4 text-left">
                  {/* General Fields */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-on-surface-variant dark:text-slate-400 font-bold uppercase tracking-wider block">Nama / Merk Aset</label>
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      placeholder="Contoh: Apple, Toyota, Grand Indonesia"
                      className="w-full px-3 py-2 bg-surface-container dark:bg-white/5 border border-outline-variant/20 dark:border-white/10 focus:border-primary/50 rounded-xl text-on-surface dark:text-white font-bold outline-none text-sm placeholder:text-on-surface-variant dark:text-slate-400 dark:placeholder:text-slate-600"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-on-surface-variant dark:text-slate-400 font-bold uppercase tracking-wider block">Harga Beli (Rp)</label>
                      <input
                        type="text"
                        value={editPurchasePrice}
                        onChange={(e) => {
                          const num = e.target.value.replace(/\D/g, '');
                          setEditPurchasePrice(num ? Number(num).toLocaleString('id-ID') : '');
                        }}
                        className="w-full px-3 py-2 bg-surface-container dark:bg-white/5 border border-outline-variant/20 dark:border-white/10 focus:border-primary/50 rounded-xl text-on-surface dark:text-white font-bold outline-none text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-on-surface-variant dark:text-slate-400 font-bold uppercase tracking-wider block">Valuasi Saat Ini (Rp)</label>
                      <input
                        type="text"
                        value={newLastPriceInput}
                        onChange={handlePriceInputChange}
                        className="w-full px-3 py-2 bg-surface-container dark:bg-white/5 border border-outline-variant/20 dark:border-white/10 focus:border-primary/50 rounded-xl text-on-surface dark:text-white font-bold outline-none text-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] text-on-surface-variant dark:text-slate-400 font-bold uppercase tracking-wider block">Tanggal Pembelian</label>
                    <input
                      type="date"
                      value={editPurchaseDate}
                      onChange={(e) => setEditPurchaseDate(e.target.value)}
                      className="w-full px-3 py-2 bg-surface-container dark:bg-white/5 border border-outline-variant/20 dark:border-white/10 focus:border-primary/50 rounded-xl text-on-surface dark:text-white font-bold outline-none text-sm [color-scheme:light] dark:[color-scheme:dark]"
                    />
                  </div>

                  {/* Category-Specific fields */}
                  {editingAsset?.category === 'real-estat' && (
                    <>
                      <div className="space-y-1.5">
                        <label className="text-[10px] text-on-surface-variant dark:text-slate-400 font-bold uppercase tracking-wider block">Lokasi Aset</label>
                        <input
                          type="text"
                          value={editLocation}
                          onChange={(e) => setEditLocation(e.target.value)}
                          placeholder="Alamat atau Gedung"
                          className="w-full px-3 py-2 bg-surface-container dark:bg-white/5 border border-outline-variant/20 dark:border-white/10 focus:border-primary/50 rounded-xl text-on-surface dark:text-white font-bold outline-none text-sm placeholder:text-on-surface-variant dark:text-slate-400 dark:placeholder:text-slate-600"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label className="text-[10px] text-on-surface-variant dark:text-slate-400 font-bold uppercase tracking-wider block">Luas Tanah (m²)</label>
                          <input
                            type="number"
                            value={editLandArea}
                            onChange={(e) => setEditLandArea(e.target.value)}
                            placeholder="0"
                            className="w-full px-3 py-2 bg-surface-container dark:bg-white/5 border border-outline-variant/20 dark:border-white/10 focus:border-primary/50 rounded-xl text-on-surface dark:text-white font-bold outline-none text-sm"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] text-on-surface-variant dark:text-slate-400 font-bold uppercase tracking-wider block">Luas Bangunan (m²)</label>
                          <input
                            type="number"
                            value={editBuildingArea}
                            onChange={(e) => setEditBuildingArea(e.target.value)}
                            placeholder="0"
                            className="w-full px-3 py-2 bg-surface-container dark:bg-white/5 border border-outline-variant/20 dark:border-white/10 focus:border-primary/50 rounded-xl text-on-surface dark:text-white font-bold outline-none text-sm"
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {editingAsset?.category === 'kendaraan' && (
                    <>
                      <div className="space-y-1.5">
                        <label className="text-[10px] text-on-surface-variant dark:text-slate-400 font-bold uppercase tracking-wider block">Nomor Polisi / Spesifikasi</label>
                        <input
                          type="text"
                          value={editSpecification}
                          onChange={(e) => setEditSpecification(e.target.value)}
                          placeholder="Contoh: B 1234 ABC"
                          className="w-full px-3 py-2 bg-surface-container dark:bg-white/5 border border-outline-variant/20 dark:border-white/10 focus:border-primary/50 rounded-xl text-on-surface dark:text-white font-bold outline-none text-sm placeholder:text-on-surface-variant dark:text-slate-400 dark:placeholder:text-slate-600"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label className="text-[10px] text-on-surface-variant dark:text-slate-400 font-bold uppercase tracking-wider block">Tahun Pembuatan</label>
                          <input
                            type="number"
                            value={editMfgYear}
                            onChange={(e) => setEditMfgYear(e.target.value)}
                            placeholder="Contoh: 2023"
                            className="w-full px-3 py-2 bg-surface-container dark:bg-white/5 border border-outline-variant/20 dark:border-white/10 focus:border-primary/50 rounded-xl text-on-surface dark:text-white font-bold outline-none text-sm"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] text-on-surface-variant dark:text-slate-400 font-bold uppercase tracking-wider block">Masa Manfaat (Tahun)</label>
                          <input
                            type="number"
                            value={editUsefulLife}
                            onChange={(e) => setEditUsefulLife(e.target.value)}
                            placeholder="10"
                            className="w-full px-3 py-2 bg-surface-container dark:bg-white/5 border border-outline-variant/20 dark:border-white/10 focus:border-primary/50 rounded-xl text-on-surface dark:text-white font-bold outline-none text-sm"
                          />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] text-on-surface-variant dark:text-slate-400 font-bold uppercase tracking-wider block">Metode Penyusutan</label>
                        <select
                          value={editDepreciationMethod}
                          onChange={(e) => setEditDepreciationMethod(e.target.value as any)}
                          className="w-full px-3 py-2 bg-surface-container dark:bg-[#1e293b] border border-outline-variant/20 dark:border-white/10 focus:border-primary/50 rounded-xl text-on-surface dark:text-white font-bold outline-none text-sm cursor-pointer"
                        >
                          <option value="Tidak Menyusut">Tidak Menyusut (Mengalami Apresiasi)</option>
                          <option value="Garis Lurus Tahunan">Garis Lurus Tahunan</option>
                          <option value="Garis Lurus Bulanan">Garis Lurus Bulanan</option>
                        </select>
                      </div>
                    </>
                  )}

                  {(editingAsset?.category === 'koleksi' || editingAsset?.category === 'collections') && (
                    <>
                      <div className="space-y-1.5">
                        <label className="text-[10px] text-on-surface-variant dark:text-slate-400 font-bold uppercase tracking-wider block">Sub-Tipe Aset</label>
                        <select
                          value={editSubType}
                          onChange={(e) => setEditSubType(e.target.value)}
                          className="w-full px-3 py-2 bg-surface-container dark:bg-[#1e293b] border border-outline-variant/20 dark:border-white/10 focus:border-primary/50 rounded-xl text-on-surface dark:text-white font-bold outline-none text-sm cursor-pointer"
                        >
                          <option value="Electronics">Electronics (Gadget, Laptop, TV)</option>
                          <option value="Watches">Jam Tangan Mewah</option>
                          <option value="Jewelry">Perhiasan &amp; Emas</option>
                          <option value="Home Furnishings">Furnitur / Perabot Rumah</option>
                          <option value="Other">Lainnya / Barang Hobi</option>
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] text-on-surface-variant dark:text-slate-400 font-bold uppercase tracking-wider block">Model / Spesifikasi / Rincian</label>
                        <input
                          type="text"
                          value={editSpecification}
                          onChange={(e) => setEditSpecification(e.target.value)}
                          placeholder="Contoh: iPhone 15 Pro, Rolex Submariner"
                          className="w-full px-3 py-2 bg-surface-container dark:bg-white/5 border border-outline-variant/20 dark:border-white/10 focus:border-primary/50 rounded-xl text-on-surface dark:text-white font-bold outline-none text-sm placeholder:text-on-surface-variant dark:text-slate-400 dark:placeholder:text-slate-600"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label className="text-[10px] text-on-surface-variant dark:text-slate-400 font-bold uppercase tracking-wider block">Masa Manfaat (Tahun)</label>
                          <input
                            type="number"
                            value={editUsefulLife}
                            onChange={(e) => setEditUsefulLife(e.target.value)}
                            placeholder="10"
                            className="w-full px-3 py-2 bg-surface-container dark:bg-white/5 border border-outline-variant/20 dark:border-white/10 focus:border-primary/50 rounded-xl text-on-surface dark:text-white font-bold outline-none text-sm"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] text-on-surface-variant dark:text-slate-400 font-bold uppercase tracking-wider block">Metode Penyusutan</label>
                          <select
                            value={editDepreciationMethod}
                            onChange={(e) => setEditDepreciationMethod(e.target.value as any)}
                            className="w-full px-3 py-2 bg-surface-container dark:bg-[#1e293b] border border-outline-variant/20 dark:border-white/10 focus:border-primary/50 rounded-xl text-on-surface dark:text-white font-bold outline-none text-sm cursor-pointer"
                          >
                            <option value="Tidak Menyusut">Tidak Menyusut</option>
                            <option value="Garis Lurus Tahunan">Garis Lurus Tahunan</option>
                            <option value="Garis Lurus Bulanan">Garis Lurus Bulanan</option>
                          </select>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <label className="text-xs text-on-surface-variant dark:text-slate-400 font-bold uppercase tracking-wider block">
                      {isAccount ? "Saldo Rekening Baru" : `${priceLabel} Baru`}
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant dark:text-slate-400 text-sm font-bold">Rp</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={newLastPriceInput}
                        onChange={handlePriceInputChange}
                        placeholder={isInvestment
                          ? (isSahamSub ? "Contoh: 6.225" : isKriptoSub ? "Contoh: 1.045.500,12345678" : "Contoh: 29.440,0904")
                          : "Contoh: 15.000.000"}
                        className="w-full pl-10 pr-4 py-3 bg-surface-container dark:bg-white/5 border border-outline-variant/20 dark:border-white/10 focus:border-primary/50 dark:focus:border-[#a7c8ff]/50 rounded-xl text-on-surface dark:text-white font-bold outline-none transition-all placeholder:text-on-surface-variant dark:text-slate-400 dark:placeholder:text-slate-600 focus:bg-white/[0.08] tabular-nums"
                        autoFocus
                      />
                    </div>
                    <p className="text-[10px] text-slate-500 italic">
                      {isInvestment
                        ? `* Format Indonesia: titik (.) = pemisah ribuan, koma (,) = desimal. Max ${priceDecimals} digit desimal.`
                        : "* Masukkan nilai bulat tanpa desimal."}
                    </p>
                  </div>

                  {isInvestment && (
                    <div className="space-y-2">
                      <label className="text-xs text-on-surface-variant dark:text-slate-400 font-bold uppercase tracking-wider block">Harga per Tanggal</label>
                      <input
                        type="date"
                        value={editPriceEffectiveDate}
                        max={new Date().toISOString().split('T')[0]}
                        onChange={(e) => setEditPriceEffectiveDate(e.target.value)}
                        className="w-full px-4 py-3 bg-surface-container dark:bg-white/5 border border-outline-variant/20 dark:border-white/10 focus:border-primary/50 rounded-xl text-on-surface dark:text-white font-bold outline-none text-sm [color-scheme:light] dark:[color-scheme:dark]"
                      />
                      <p className="text-[10px] text-slate-500 italic">
                        {isReksadanaSub
                          ? "* NAV reksadana publikasi T+1 — default ke hari kerja sebelumnya."
                          : "* Tanggal efektif harga ini berlaku."}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {isInvestment && parsedNewPrice > 0 && (
                <div className="bg-surface-container dark:bg-white/5 border border-outline-variant/10 dark:border-white/5 rounded-2xl p-4 space-y-3 text-xs animate-in fade-in duration-300">
                  {/* Old → New comparison */}
                  <div className="flex justify-between items-center pb-3 border-b border-outline-variant/10 dark:border-white/5">
                    <div>
                      <p className="text-on-surface-variant dark:text-slate-400 text-[10px] uppercase font-bold tracking-wider">Harga Lama</p>
                      <p className="text-on-surface-variant dark:text-slate-300 font-semibold tabular-nums text-[13px]">Rp {formatPriceID(oldPriceForCompare, priceDecimals)}</p>
                    </div>
                    <span className="material-symbols-outlined text-slate-500 text-base">arrow_forward</span>
                    <div className="text-right">
                      <p className="text-on-surface-variant dark:text-slate-400 text-[10px] uppercase font-bold tracking-wider">Harga Baru</p>
                      <p className="text-on-surface dark:text-white font-extrabold tabular-nums text-[13px]">Rp {formatPriceID(parsedNewPrice, priceDecimals)}</p>
                    </div>
                  </div>

                  {/* Delta % */}
                  {oldPriceForCompare > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-on-surface-variant dark:text-slate-400 font-semibold">Δ Perubahan</span>
                      <span className={`px-2 py-0.5 rounded font-extrabold tabular-nums text-[11px] ${
                        change.tier === 'severe'
                          ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                          : change.tier === 'warn'
                            ? 'bg-yellow-500/10 text-yellow-300 border border-yellow-500/20'
                            : changeIsPositive
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-red-500/10 text-red-400 border border-red-500/20'
                      }`}>
                        {changeIsPositive ? '+' : ''}{change.deltaPct.toFixed(2)}%
                      </span>
                    </div>
                  )}

                  {/* Sanity warning */}
                  {change.tier === 'severe' && (
                    <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-200 text-[11px] font-semibold leading-relaxed">
                      <span className="material-symbols-outlined text-sm mt-px">warning</span>
                      <span>Perubahan ekstrem (&gt;5× / &lt;0.2×). Cek apakah ada salah ketik desimal/pemisah ribuan. Konfirmasi akan diminta saat simpan.</span>
                    </div>
                  )}

                  {/* Avg Cost vs Harga Baru */}
                  {avgCost > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-on-surface-variant dark:text-slate-400 font-semibold">Avg Cost vs Baru</span>
                      <span className="text-on-surface-variant dark:text-slate-300 tabular-nums">
                        Rp {formatPriceID(avgCost, priceDecimals)} <span className={`${newVsAvgPct >= 0 ? 'text-emerald-400' : 'text-red-400'} font-bold`}>({newVsAvgPct >= 0 ? '+' : ''}{newVsAvgPct.toFixed(1)}%)</span>
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between pt-2 border-t border-outline-variant/10 dark:border-white/5">
                    <span className="text-on-surface-variant dark:text-slate-400 font-semibold">Estimasi Nilai Pasar Baru</span>
                    <span className="text-on-surface dark:text-white font-bold tabular-nums">Rp {newCurrentValue.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-on-surface-variant dark:text-slate-400 font-semibold">Estimasi Unrealized P/L</span>
                    <span className={`px-2.5 py-0.5 rounded font-extrabold tabular-nums text-[11px] ${
                      newPLIsProfit
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-red-500/10 text-red-400 border border-red-500/20'
                    }`}>
                      {newPLIsProfit ? '+' : '-'}Rp {Math.abs(newPL).toLocaleString('id-ID')} ({newPLIsProfit ? '+' : ''}{newPLPercent.toFixed(1)}%)
                    </span>
                  </div>

                  <p className="text-[10px] text-slate-500 italic pt-1">
                    Sumber default: {getPriceFreshnessLabel(targetSubType)}. Override manual ini akan ditandai sebagai <strong className="text-on-surface-variant dark:text-slate-300">Manual</strong> sampai sinkronisasi berikutnya.
                  </p>
                </div>
              )}

              </div>

              <div className="flex gap-3 px-5 sm:px-6 md:px-8 py-4 border-t border-outline-variant/10 dark:border-white/5 bg-surface-container-lowest dark:bg-[#121318]/95 backdrop-blur-sm">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditPriceOpen(false);
                    setEditingAsset(null);
                    setEditingAccount(null);
                  }}
                  className="flex-1 px-4 py-3 bg-surface-container dark:bg-white/5 border border-outline-variant/20 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10 text-on-surface dark:text-white font-extrabold rounded-xl text-xs lg:text-sm uppercase tracking-wider transition-colors active:scale-95 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSaveLastPrice}
                  disabled={!newLastPriceInput}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-primary to-primary-container dark:from-[#a7c8ff] dark:to-[#82b1ff] text-white dark:text-[#001b3c] font-extrabold rounded-xl text-xs lg:text-sm uppercase tracking-wider shadow-lg shadow-primary-container/20 dark:shadow-[#a7c8ff]/20 hover:shadow-xl hover:-translate-y-0.5 transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">save</span>
                  Simpan
                </button>
              </div>
            </div>
          </div>
        );
      })()}
      {/* Delete Account Confirmation Modal */}
      {deletingAccountId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface-container-lowest dark:bg-[#191c1e] w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 zoom-in-95 duration-200 border border-outline-variant/10 dark:border-white/10 p-8">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-6 text-error dark:text-[#ffb4ab]">
                <span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
              </div>
              <h3 className="text-xl font-bold font-headline text-on-surface dark:text-white mb-2">Hapus Akun?</h3>
              <p className="text-sm text-on-surface-variant dark:text-outline mb-8">Akun <strong className="dark:text-white">{accounts.find(a => a.id === deletingAccountId)?.name}</strong> beserta seluruh history transaksinya akan dihapus secara permanen. Tindakan ini tidak dapat dibatalkan.</p>
              <div className="flex gap-3 w-full">
                <button 
                  onClick={() => setDeletingAccountId(null)}
                  className="flex-1 py-3 bg-surface-container dark:bg-white/10 text-on-surface-variant dark:text-outline rounded-xl font-bold hover:bg-surface-bright dark:hover:bg-white/20 transition-colors active:scale-95"
                >
                  Batal
                </button>
                <button 
                  onClick={async () => {
                    if (!deletingAccountId) return;
                    const accName = accounts.find(a => a.id === deletingAccountId)?.name || "";
                    setDeletingAccountId(null);
                    try {
                      await deleteAccount(deletingAccountId);
                      alert(`Sukses: Rekening "${accName}" berhasil dihapus!`);
                      setTimeout(() => {
                        syncFromGoogleSheets();
                      }, 500);
                    } catch (err) {
                      console.error(err);
                      alert(`Gagal menghapus rekening "${accName}". Silakan coba lagi.`);
                    }
                  }}
                  className="flex-1 py-3 bg-error text-white rounded-xl font-bold hover:opacity-90 active:scale-95 transition-all"
                >
                  Ya, Hapus
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Delete Asset Confirmation Modal */}
      {deletingAssetId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface-container-lowest dark:bg-[#191c1e] w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 zoom-in-95 duration-200 border border-outline-variant/10 dark:border-white/10 p-8">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-6 text-error dark:text-[#ffb4ab]">
                <span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
              </div>
              <h3 className="text-xl font-bold font-headline text-on-surface dark:text-white mb-2">Hapus Aset?</h3>
              <p className="text-sm text-on-surface-variant dark:text-outline mb-8">Aset <strong className="dark:text-white">{assets.find(a => a.id === deletingAssetId)?.title}</strong> akan dihapus secara permanen dari database. Tindakan ini tidak dapat dibatalkan.</p>
              <div className="flex gap-3 w-full">
                <button 
                  onClick={() => setDeletingAssetId(null)}
                  className="flex-1 py-3 bg-surface-container dark:bg-white/10 text-on-surface-variant dark:text-outline rounded-xl font-bold hover:bg-surface-bright dark:hover:bg-white/20 transition-colors active:scale-95"
                >
                  Batal
                </button>
                <button 
                  onClick={async () => {
                    if (!deletingAssetId) return;
                    const assetTitle = assets.find(a => a.id === deletingAssetId)?.title || "";
                    setDeletingAssetId(null);
                    try {
                      await deleteAsset(deletingAssetId);
                      alert(`Sukses: Aset "${assetTitle}" berhasil dihapus!`);
                      setTimeout(() => {
                        syncFromGoogleSheets();
                      }, 500);
                    } catch (err) {
                      console.error(err);
                      alert(`Gagal menghapus aset "${assetTitle}". Silakan coba lagi.`);
                    }
                  }}
                  className="flex-1 py-3 bg-error text-white rounded-xl font-bold hover:opacity-90 active:scale-95 transition-all"
                >
                  Ya, Hapus
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Print Modal */}
      {isPrintModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface-container-lowest dark:bg-[#191c1e] w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 zoom-in-95 duration-200 border border-outline-variant/10 dark:border-white/10 p-8">
            <div className="flex flex-col">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-primary/10 dark:bg-[#a7c8ff]/10 flex items-center justify-center text-primary dark:text-[#a7c8ff]">
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>picture_as_pdf</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold font-headline text-on-surface dark:text-white leading-tight">Cetak Laporan PDF</h3>
                  <p className="text-xs text-on-surface-variant dark:text-outline mt-0.5">Pilih periode laporan yang ingin dicetak</p>
                </div>
              </div>

              <div className="space-y-4 mb-8">
                <div>
                  <label className="text-xs font-bold text-on-surface-variant dark:text-outline uppercase tracking-wider mb-2 block">Bulan</label>
                  <select
                    value={printMonth}
                    onChange={(e) => setPrintMonth(Number(e.target.value))}
                    className="w-full bg-surface-container dark:bg-[#202429] border border-outline-variant/30 dark:border-white/10 text-on-surface dark:text-white text-sm rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary dark:focus:ring-[#a7c8ff] focus:outline-none transition-all"
                  >
                    {['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'].map((m, i) => (
                      <option key={i} value={i}>{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-on-surface-variant dark:text-outline uppercase tracking-wider mb-2 block">Tahun</label>
                  <select
                    value={printYear}
                    onChange={(e) => setPrintYear(Number(e.target.value))}
                    className="w-full bg-surface-container dark:bg-[#202429] border border-outline-variant/30 dark:border-white/10 text-on-surface dark:text-white text-sm rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary dark:focus:ring-[#a7c8ff] focus:outline-none transition-all"
                  >
                    {[2024, 2025, 2026, 2027, 2028].map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
                <div className="bg-primary-container/30 dark:bg-primary-container/10 border border-primary-container p-3 rounded-xl flex gap-3">
                  <span className="material-symbols-outlined text-primary dark:text-[#a7c8ff] text-base mt-0.5">info</span>
                  <p className="text-[10px] text-on-surface-variant dark:text-outline leading-relaxed">
                    Filter periode ini <b>hanya berlaku</b> untuk tabel "IV. Anggaran Bulanan & Realisasi Kategori" pada laporan PDF.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 w-full">
                <button 
                  onClick={() => setIsPrintModalOpen(false)}
                  className="flex-1 py-3 bg-surface-container dark:bg-white/10 text-on-surface-variant dark:text-outline rounded-xl font-bold hover:bg-surface-bright dark:hover:bg-white/20 transition-colors active:scale-95"
                >
                  Batal
                </button>
                <button 
                  onClick={() => {
                    setReportPrintPeriod(printMonth, printYear);
                    useFinanceStore.getState().setPrintType('report');
                    setIsPrintModalOpen(false);
                    // Add slight delay so modal disappears before print dialog captures screen
                    setTimeout(() => window.print(), 100);
                  }}
                  className="flex-1 py-3 bg-gradient-to-r from-primary to-primary-container dark:from-[#a7c8ff] dark:to-[#82b1ff] text-white dark:text-[#001b3c] rounded-xl font-bold hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-primary-container/20 flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-sm">print</span>
                  Cetak PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <AccountReconcileModal
        isOpen={reconcileAccount !== null}
        onClose={() => setReconcileAccount(null)}
        account={reconcileAccount}
      />

      <FinanceSPTExportModal
        isOpen={isSptExportOpen}
        onClose={() => setIsSptExportOpen(false)}
      />

      <AssetSellModal
        isOpen={sellAsset !== null}
        onClose={() => setSellAsset(null)}
        asset={sellAsset}
      />
    </div>
  );
};

export default FinanceAssets;
