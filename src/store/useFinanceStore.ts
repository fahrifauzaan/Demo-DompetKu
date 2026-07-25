import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { TRANSACTIONS_DATA, DEBTS_DATA } from '../finance-components/FinanceData';
import { useAuthStore } from './useAuthStore';
import { addRowToSheet, appendRowsToSheet, updateRowInSheet, deleteRowFromSheet, fetchAllDataFromSheets } from '../services/googleApiService';

// ===================== TYPES =====================

export type TransactionType = 'PENGELUARAN' | 'PEMASUKAN' | 'TRANSFER';

export interface Transaction {
  id: string;
  date: string;
  desc: string;
  location: string;
  amount: number;
  category: string;
  icon: string;
  status: string;
  account: string;
  type: TransactionType;
}

export interface Account {
  id: string;
  name: string;
  type: 'bank' | 'wallet' | 'investment' | 'cash';
  balance: number;
  currency: string;
  icon: string;
  startDate: string;
  valuationReminder?: boolean;
  lastValuationUpdate?: string;
}

export interface Asset {
  id: string;
  title: string;
  category: 'real-estat' | 'kendaraan' | 'investasi' | 'koleksi';
  purchasePrice: number;
  currentValue: number;
  purchaseDate: string;
  location: string;
  icon: string;
  equity: number;
  notes: string;
  ticker?: string;
  shares?: number;
  avgCost?: number;
  currentPrice?: number;
  interestRate?: number;
  maturityDate?: string;
  subType?: string;
  usefulLife?: number;
  depreciationMethod?: 'Garis Lurus Tahunan' | 'Garis Lurus Bulanan' | 'Tidak Menyusut';
  landArea?: number;
  buildingArea?: number;
  mfgYear?: number;
  specification?: string;
  valuationReminder?: boolean;
  lastValuationUpdate?: string;
  currentNav?: number;
  documentLink?: string;
  // Fixed Income Fields
  fixedIncomeType?: string;
  bondType?: string;
  depositType?: string;
  type?: string;
  issuer?: string;
  tenor?: number;
  tenorUnit?: string;
  couponType?: string;
  tax?: number;
  paymentDate?: number;
  interestPaymentPeriod?: string;
}

export interface BudgetCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: 'Pengeluaran' | 'Pemasukan';
  allocated: number;
  includeInTotal: boolean;
  alertAt: number;
  classification?: 'NEEDS' | 'WANTS' | 'SAVINGS' | 'INVESTMENT';
}

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

export interface Setting {
  key: string;
  value: string;
}

// ── Fase 2 (v2.0) ──────────────────────────────────────────────────────────
export interface Goal {
  id: string;
  name: string;
  icon: string;
  color: string;
  goalType: 'goal' | 'sinking';
  targetAmount: number;
  targetDate: string;
  startDate: string;
  initialAmount: number;
  expectedReturn: number; // % tahunan
  monthlyContribution: number;
  priority: number; // 1 Tinggi · 2 Sedang · 3 Rendah
  status: string; // Aktif | Tercapai | Dibatalkan
  notes: string;
}

export interface Recurring {
  id: string;
  name: string;
  type: 'PEMASUKAN' | 'PENGELUARAN';
  amount: number;
  category: string;
  account: string;
  frequency: 'MONTHLY' | 'WEEKLY' | 'YEARLY';
  dayOfMonth: number; // MONTHLY:1-31 · WEEKLY:1-7 (Sen-Min)
  startDate: string;
  endDate: string;
  lastPostedDate: string;
  autoPost: boolean; // v1 selalu false
  notes: string;
}

export interface Insurance {
  id: string;
  name: string;
  insType: 'Jiwa' | 'Kesehatan' | 'Kendaraan' | 'Properti' | 'Lainnya';
  provider: string;
  policyNumber: string;
  premium: number;
  premiumFrequency: 'Bulanan' | 'Tahunan';
  coverageAmount: number; // Uang Pertanggungan (UP)
  startDate: string;
  renewalDate: string;
  insured: string;
  beneficiary: string;
  status: string; // Aktif | Lapse | Selesai
  notes: string;
}

// Dana Pensiun Indonesia (F5.3): BPJS Ketenagakerjaan (JHT/JP), DPLK/DPPK, dsb.
export interface Retirement {
  id: string;
  name: string;
  progType: 'JHT' | 'JP' | 'DPLK' | 'DPPK' | 'Lainnya';
  provider: string;             // BPJS TK, pengelola DPLK, dst.
  currentBalance: number;
  monthlyContribution: number;
  contributionType: 'nominal' | 'persen'; // nominal/bln atau % gaji
  employerContribution: number; // kontribusi pemberi kerja (nominal/bln)
  startDate: string;
  targetAge: number;            // usia target pensiun (mis. 56/58)
  expectedReturn: number;       // % per tahun
  status: string;               // Aktif | Nonaktif
  notes: string;
}

export interface Promo {
  id: string;
  title: string;
  message: string;
  date: string;
  url: string;
  icon: string;
  isActive: boolean | string;
}

// Multi-profil: tiap profil menunjuk ke SATU Google Sheet sendiri (mis. anggota
// keluarga / entitas usaha). Daftar profil disimpan lokal (localStorage) — bukan di
// Sheet mana pun — sehingga TIDAK perlu migrasi Apps Script. Beralih profil = mengganti
// koneksi aktif (googleSheetUrl/spreadsheetId) lalu sinkron ulang dari Sheet tersebut.
export interface Profile {
  id: string;
  name: string;
  emoji: string;          // avatar sederhana (👤 👩 👨 🏢 …)
  color: string;          // hex untuk aksen
  googleSheetUrl: string; // URL Web App (mode makro)
  spreadsheetId: string;  // ID spreadsheet (mode API/OAuth) — boleh kosong
}

// ===================== STORE STATE =====================

interface FinanceState {
  // Data
  transactions: Transaction[];
  accounts: Account[];
  assets: Asset[];
  budgetCategories: BudgetCategory[];
  debts: Debt[];
  goals: Goal[];
  recurring: Recurring[];
  insurance: Insurance[];
  retirement: Retirement[];
  settings: Setting[];
  promos: Promo[];
  readPromos: string[];
  fetchPromos: (url: string) => Promise<void>;
  markPromoRead: (id: string) => void;
  markAllPromosRead: () => void;
  googleSheetUrl: string;
  googleAccessToken: string | null;
  spreadsheetId: string | null;
  profiles: Profile[];
  activeProfileId: string | null;
  isSyncing: boolean;
  lastSyncAt: string | null;
  syncError: string | null;
  pendingWrites: number;      // jumlah penulisan ke Google Sheets yang sedang berjalan
  saveError: string | null;   // pesan error penyimpanan terakhir
  clearSaveError: () => void;

  // Actions — Google Sheets URL
  setGoogleSheetUrl: (url: string) => void;
  setGoogleCredentials: (token: string, sheetId: string) => void;
  setSpreadsheetId: (sheetId: string) => void;

  // Actions — Multi-profil
  addProfile: (p: Omit<Profile, 'id'>) => string;
  updateProfile: (p: Profile) => void;
  deleteProfile: (id: string) => void;
  switchProfile: (id: string) => Promise<void>;
  captureCurrentAsProfile: (name: string, emoji: string, color: string) => string;

  // Actions — Generic CRUD
  addTransaction: (tx: Omit<Transaction, 'id'>) => Promise<void>;
  addTransactionsBulk: (txns: (Omit<Transaction, 'id'> & { id?: string })[]) => Promise<{ ok: boolean; saved: number; failed: number }>;
  updateTransaction: (tx: Transaction) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  addAccount: (account: Omit<Account, 'id'>) => Promise<void>;
  updateAccount: (account: Account) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;
  addAsset: (asset: Omit<Asset, 'id'>) => Promise<void>;
  updateAsset: (asset: Asset) => Promise<void>;
  deleteAsset: (id: string) => Promise<void>;
  addBudgetCategory: (cat: Omit<BudgetCategory, 'id'>) => Promise<void>;
  updateBudgetCategory: (cat: BudgetCategory) => Promise<void>;
  deleteBudgetCategory: (id: string) => Promise<void>;
  addDebt: (debt: Omit<Debt, 'id'>) => Promise<void>;
  updateDebt: (debt: Debt) => Promise<void>;
  deleteDebt: (id: string) => Promise<void>;
  addGoal: (goal: Omit<Goal, 'id'>) => Promise<void>;
  updateGoal: (goal: Goal) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
  addRecurring: (rec: Omit<Recurring, 'id'>) => Promise<void>;
  updateRecurring: (rec: Recurring) => Promise<void>;
  deleteRecurring: (id: string) => Promise<void>;
  addInsurance: (ins: Omit<Insurance, 'id'>) => Promise<void>;
  updateInsurance: (ins: Insurance) => Promise<void>;
  deleteInsurance: (id: string) => Promise<void>;
  addRetirement: (r: Omit<Retirement, 'id'>) => Promise<void>;
  updateRetirement: (r: Retirement) => Promise<void>;
  deleteRetirement: (id: string) => Promise<void>;
  updateSettings: (settings: Setting[]) => Promise<void>;
  monthlyBudgets: Record<string, Record<string, number>>;
  updateMonthlyBudget: (yearMonth: string, categoryName: string, amount: number) => Promise<void>;
  migrateMonthlyBudgetsToTab: (blob: Record<string, Record<string, number>>) => Promise<void>;

  // Print Settings
  reportPrintMonth: number;
  reportPrintYear: number;
  setReportPrintPeriod: (month: number, year: number) => void;
  printType: 'report' | 'ledger' | 'spt' | null;
  setPrintType: (type: 'report' | 'ledger' | 'spt' | null) => void;
  ledgerPrintTransactions: any[];
  setLedgerPrintTransactions: (txs: any[]) => void;
  sptPrintRows: any[];
  setSptPrintRows: (rows: any[]) => void;

  // Actions — Full Sync
  syncFromGoogleSheets: () => Promise<void>;
  resetFinance: () => void;

  // Security
  isAuthenticated2FA: boolean;
  setIsAuthenticated2FA: (val: boolean) => void;
}

// ===================== HELPERS =====================

export function formatDateString(dateStr: any): string {
  if (!dateStr) return '';
  let str = String(dateStr).trim();
  
  // If it contains T, split by T first to get the date part
  if (str.includes('T')) {
    const part = str.split('T')[0];
    if (/^\d{4}-\d{2}-\d{2}$/.test(part)) {
      return part;
    }
  }

  // If it's already in YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }
  
  try {
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  } catch (e) {
    // Ignore error
  }
  
  return str;
}

export function parseNumber(val: any): number {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    let s = val.toUpperCase().replace(/RP/g, '').replace(/IDR/g, '').replace(/\s/g, '');
    // If we only have numbers, minus, dots and commas left:
    // Typical IDR: 10.000.000,00 -> remove dots, replace comma with dot -> 10000000.00
    // Typical US: 10,000,000.00 -> if there is a dot AND comma, we need care. But assume IDR mostly.
    
    // Simplest approach for IDR:
    const dotCount = (s.match(/\./g) || []).length;
    const commaCount = (s.match(/,/g) || []).length;
    
    if (dotCount > 0 && commaCount === 1) {
      // Like 10.000.000,50
      s = s.replace(/\./g, '').replace(/,/g, '.');
    } else if (commaCount > 0 && dotCount === 1) {
      // Like 10,000,000.50 (US format)
      s = s.replace(/,/g, '');
    } else if (dotCount > 0 && commaCount === 0) {
      // Like 10.000.000 (IDR whole)
      s = s.replace(/\./g, '');
    } else if (commaCount > 0 && dotCount === 0) {
      // Like 10,000 (could be US thousands or IDR decimal, assume IDR decimal if 1 comma)
      s = s.replace(/,/g, '.');
    }
    
    const parsed = Number(s);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
}

async function postToSheet(url: string, token: string | null, spreadsheetId: string | null, sheet: string, action: string, data: Record<string, unknown>) {
  // Hanya lacak indikator loading bila ADA target tulis nyata (bukan mode demo tanpa sheet).
  const hasTarget = !!((token && spreadsheetId) || url);
  if (hasTarget) useFinanceStore.setState((s) => ({ pendingWrites: s.pendingWrites + 1, saveError: null }));
  try {
    if (token && spreadsheetId) {
      try {
        if (action === 'add') await addRowToSheet(token, spreadsheetId, sheet, data);
        else if (action === 'update') await updateRowInSheet(token, spreadsheetId, sheet, data);
        else if (action === 'delete') await deleteRowFromSheet(token, spreadsheetId, sheet, String(data.id || data.key));
        console.log(`[FinanceStore] ✅ ${action} → ${sheet} synced via API`);
        return;
      } catch (apiError: any) {
        console.warn(`[FinanceStore] Direct API sync failed for ${sheet}, trying Web App URL fallback:`, apiError);
        if (!url) throw apiError;
        // Fall through to try Web App URL macro sync below
      }
    }

    if (!url) return;
    await fetch(url, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, sheet, data })
    });
    console.log(`[FinanceStore] ✅ ${action} → ${sheet} synced via Macro`);
  } catch (error) {
    console.error(`[FinanceStore] ❌ Gagal sync ${sheet}:`, error);
    if (hasTarget) useFinanceStore.setState({ saveError: 'Gagal menyimpan ke Google Sheets — periksa koneksi Anda.' });
  } finally {
    if (hasTarget) useFinanceStore.setState((s) => ({ pendingWrites: Math.max(0, s.pendingWrites - 1) }));
  }
}

function getAssetSheetName(category?: string, subType?: string): string {
  if (subType === 'saham') return 'Saham';
  if (subType === 'kripto') return 'Crypto';
  if (subType === 'reksadana') return 'Reksadana';
  if (category === 'real-estat' || category === 'kendaraan' || category === 'koleksi') return 'AssetsNonLiquid';
  return 'Fixed Income Investment';
}

function formatAssetForSheet(asset: Asset): Record<string, unknown> {
  const base: any = { ...asset };
  if (base.purchaseDate) {
    base.purchaseDate = formatDateString(base.purchaseDate);
  }
  if (asset.subType === 'kripto') {
    base.coins = asset.shares;
  }
  if (asset.subType === 'reksadana') {
    base.units = asset.shares;
    base.navPerUnit = asset.avgCost;
    // Save the total current value as Current_NAV in the Google Sheet (matching user sheet pattern)
    base.currentNav = asset.currentValue || (asset.shares * (asset.currentPrice || asset.currentNav || 0));
  }
  return base as Record<string, unknown>;
}

function calculateDepreciatedValue(purchasePrice: number, purchaseDateStr: string, usefulLife: number, method?: string): number {
  if (!method || method === 'Tidak Menyusut') return purchasePrice;
  
  try {
    const purchaseDate = new Date(purchaseDateStr);
    
    // Safety check: if date is invalid, we cannot calculate depreciation
    if (isNaN(purchaseDate.getTime())) {
      return purchasePrice;
    }

    const now = new Date();
    
    const diffYears = now.getFullYear() - purchaseDate.getFullYear();
    const diffMonths = (now.getMonth() - purchaseDate.getMonth()) + (diffYears * 12);
    const elapsedMonths = Math.max(0, diffMonths);
    const elapsedYears = Math.floor(elapsedMonths / 12);
    
    if (method === 'Garis Lurus Tahunan') {
      const yearlyDep = purchasePrice / (usefulLife || 10);
      const accumulated = Math.min(purchasePrice, yearlyDep * elapsedYears);
      return Math.round(purchasePrice - accumulated);
    } else if (method === 'Garis Lurus Bulanan' || method === 'Garis Lurus') {
      const monthlyDep = purchasePrice / ((usefulLife || 10) * 12);
      const accumulated = Math.min(purchasePrice, monthlyDep * elapsedMonths);
      return Math.round(purchasePrice - accumulated);
    }
  } catch (e) {
    console.error('[FinanceStore] Error calculating depreciation:', e);
  }
  return purchasePrice;
}

// ===================== DEFAULT DATA =====================

const DEFAULT_ACCOUNTS: Account[] = [
  { id: 'acc1', name: 'Tabungan Mandiri', type: 'bank', balance: 1263000000, currency: 'IDR', icon: 'account_balance_wallet', startDate: '2023-01-15' },
  { id: 'acc2', name: 'Tabungan BCA', type: 'bank', balance: 4431000000, currency: 'IDR', icon: 'savings', startDate: '2022-06-01' },
  { id: 'acc3', name: 'Dompet Kripto (BTC/ETH)', type: 'investment', balance: 486750000, currency: 'IDR', icon: 'currency_bitcoin', startDate: '2024-03-10' },
];

const DEFAULT_BUDGET_CATEGORIES: BudgetCategory[] = [
  { id: 'bcat1', name: 'Housing', icon: 'home', color: '#1565c0', type: 'Pengeluaran', allocated: 46400000, includeInTotal: true, alertAt: 80 },
  { id: 'bcat2', name: 'Food', icon: 'restaurant', color: '#ba1a1a', type: 'Pengeluaran', allocated: 8700000, includeInTotal: true, alertAt: 80 },
  { id: 'bcat3', name: 'Healthcare', icon: 'medical_services', color: '#ef6c00', type: 'Pengeluaran', allocated: 58000000, includeInTotal: true, alertAt: 90 },
  { id: 'bcat4', name: 'Transportation', icon: 'directions_car', color: '#00695c', type: 'Pengeluaran', allocated: 6525000, includeInTotal: true, alertAt: 80 },
];

const DEFAULT_ASSETS: Asset[] = [
  { id: 'ast1', title: 'Highland Park Residence', category: 'real-estat', purchasePrice: 12750000000, currentValue: 16800000000, purchaseDate: '2020-08-15', location: 'Jakarta Selatan', icon: 'home', equity: 75, notes: 'KPR sisa Rp 4,25M' },
  { id: 'ast2', title: 'Porsche 911 Carrera S', category: 'kendaraan', purchasePrice: 1725000000, currentValue: 2137500000, purchaseDate: '2021-11-22', location: 'Jakarta', icon: 'directions_car', equity: 100, notes: 'Lunas' },
  { id: 'ast3', title: 'Senayan Office Suite', category: 'real-estat', purchasePrice: 4500000000, currentValue: 5200000000, purchaseDate: '2019-04-01', location: 'Jakarta Pusat', icon: 'domain', equity: 100, notes: 'Lunas, disewakan' },
  { id: 'ast4', title: 'Reksadana Indeks Saham (VTI)', category: 'investasi', purchasePrice: 7203600000, currentValue: 9186000000, purchaseDate: '2021-03-10', location: 'Bibit', icon: 'trending_up', equity: 100, notes: 'ETF • 2.400 Lembar' },
  { id: 'ast5', title: 'Saham Apple (AAPL)', category: 'investasi', purchasePrice: 1807500000, currentValue: 2463300000, purchaseDate: '2022-07-15', location: 'Ajaib Sekuritas', icon: 'trending_up', equity: 100, notes: 'Saham • 850 Lembar' },
  { id: 'ast6', title: 'Saham Tesla (TSLA)', category: 'investasi', purchasePrice: 1380000000, currentValue: 1175100000, purchaseDate: '2023-01-20', location: 'Ajaib Sekuritas', icon: 'trending_up', equity: 100, notes: 'Saham • 320 Lembar' },
  { id: 'ast7', title: 'Patek Philippe Nautilus', category: 'koleksi', purchasePrice: 1650000000, currentValue: 1850000000, purchaseDate: '2022-05-10', location: 'Jakarta', icon: 'watch', equity: 100, notes: 'Ref. 5711/1A-010 • Full Set' },
  { id: 'ast8', title: 'Affandi: Borobudur Pagi', category: 'koleksi', purchasePrice: 12500000000, currentValue: 12500000000, purchaseDate: '2018-09-20', location: 'Jakarta', icon: 'palette', equity: 100, notes: 'Oil on Canvas • 1983 • Certified' }
];

const DEFAULT_SETTINGS: Setting[] = [
  { key: 'userName', value: 'Chaerobby Fakhri Fauzaan P.' },
  { key: 'email', value: '' },
  { key: 'phone', value: '' },
  { key: 'currency', value: 'IDR' },
  { key: 'language', value: 'Bahasa Indonesia' },
  { key: 'emergencyFundTarget', value: '750000000' },
  { key: 'emergencyFundCurrent', value: '637500000' },
  { key: 'monthlyIncome', value: '28100000' },
];

// ===================== STORE =====================

export const useFinanceStore = create<FinanceState>()(
  persist(
    (set, get) => ({
      // Initial State
      transactions: TRANSACTIONS_DATA as Transaction[],
      accounts: DEFAULT_ACCOUNTS,
      assets: DEFAULT_ASSETS,
      budgetCategories: DEFAULT_BUDGET_CATEGORIES,
      debts: DEBTS_DATA as Debt[],
      goals: [],
      recurring: [],
      insurance: [],
      retirement: [],
      settings: DEFAULT_SETTINGS,
      promos: [],
      readPromos: [],
      googleSheetUrl: 'https://script.google.com/macros/s/AKfycbzhD4TrmhBhb1484U7thVyEJDvZAFYtAbiG0bRK_jcWCiLKwy1EtBFCOQKikaj9l6yL2Q/exec',
      googleAccessToken: null,
      spreadsheetId: null,
      profiles: [],
      activeProfileId: null,
      isSyncing: false,
      lastSyncAt: null,
      syncError: null,
      pendingWrites: 0,
      saveError: null,
      clearSaveError: () => set({ saveError: null }),
      monthlyBudgets: {},
      reportPrintMonth: new Date().getMonth(),
      reportPrintYear: new Date().getFullYear(),
      printType: null,
      ledgerPrintTransactions: [],
      sptPrintRows: [],

      // Security
      isAuthenticated2FA: false,
      setIsAuthenticated2FA: (val) => set({ isAuthenticated2FA: val }),

      // ---- Promos ----
      fetchPromos: async (url) => {
        try {
          // fetch using credentials: omit to prevent CORS errors when user is logged into Google
          const res = await fetch(url, { redirect: 'follow', credentials: 'omit' });
          const data = await res.json();
          set({ promos: data || [] });
        } catch (e) {
          console.error('[FinanceStore] Gagal fetch promo:', e);
        }
      },
      markPromoRead: (id) => {
        set((state) => ({ readPromos: [...state.readPromos, id] }));
      },
      markAllPromosRead: () => {
        set((state) => ({ readPromos: state.promos.map(p => p.id) }));
      },

      // ---- URL Management ----
      setGoogleSheetUrl: (url) => {
        set({ googleSheetUrl: url });
        try {
          import('./useAuthStore').then(module => {
            const state = module.useAuthStore.getState();
            if (state.user && state.user.email !== (import.meta.env.VITE_DEMO_EMAIL || 'demo@dompetku.com')) {
              state.updateUserSheetUrl(state.user.email, url);
            }
          });
        } catch (e) {
          console.error(e);
        }
      },
      setGoogleCredentials: (token, sheetId) => {
        let cleanId = sheetId;
        if (sheetId && sheetId.includes('/d/')) {
          const match = sheetId.match(/\/[d]\/([a-zA-Z0-9-_]+)/);
          if (match) cleanId = match[1];
        }
        set({ googleAccessToken: token, spreadsheetId: cleanId });
        try {
          import('./useAuthStore').then(module => {
            const state = module.useAuthStore.getState();
            if (state.user && state.user.email !== (import.meta.env.VITE_DEMO_EMAIL || 'demo@dompetku.com')) {
              state.updateUserSpreadsheetId(state.user.email, cleanId);
            }
          });
        } catch (e) { console.error(e); }
      },
      setSpreadsheetId: (sheetId) => {
        let cleanId = sheetId;
        if (sheetId && sheetId.includes('/d/')) {
          const match = sheetId.match(/\/[d]\/([a-zA-Z0-9-_]+)/);
          if (match) cleanId = match[1];
        }
        set({ spreadsheetId: cleanId });
        try {
          import('./useAuthStore').then(module => {
            const state = module.useAuthStore.getState();
            if (state.user && state.user.email !== (import.meta.env.VITE_DEMO_EMAIL || 'demo@dompetku.com')) {
              state.updateUserSpreadsheetId(state.user.email, cleanId);
            }
          });
        } catch (e) { console.error(e); }
      },

      // ---- MULTI-PROFIL ----
      addProfile: (p) => {
        const id = generateId();
        set((state) => ({ profiles: [...state.profiles, { ...p, id }] }));
        return id;
      },
      updateProfile: (p) => {
        set((state) => ({ profiles: state.profiles.map((x) => (x.id === p.id ? p : x)) }));
        // Bila profil aktif yang diedit, terapkan koneksinya secara langsung.
        if (get().activeProfileId === p.id) {
          set({ googleSheetUrl: p.googleSheetUrl || '', spreadsheetId: p.spreadsheetId ? p.spreadsheetId : null });
        }
      },
      deleteProfile: (id) => {
        set((state) => ({
          profiles: state.profiles.filter((x) => x.id !== id),
          activeProfileId: state.activeProfileId === id ? null : state.activeProfileId,
        }));
      },
      switchProfile: async (id) => {
        const prof = get().profiles.find((p) => p.id === id);
        if (!prof) return;
        // Ganti koneksi aktif langsung (tanpa menyentuh catatan sheet user utama di authStore),
        // lalu tarik ulang seluruh data dari Sheet profil tersebut.
        set({
          activeProfileId: id,
          googleSheetUrl: prof.googleSheetUrl || '',
          spreadsheetId: prof.spreadsheetId ? prof.spreadsheetId : null,
        });
        await get().syncFromGoogleSheets();
      },
      captureCurrentAsProfile: (name, emoji, color) => {
        const id = generateId();
        const prof: Profile = {
          id, name, emoji, color,
          googleSheetUrl: get().googleSheetUrl || '',
          spreadsheetId: get().spreadsheetId || '',
        };
        set((state) => ({ profiles: [...state.profiles, prof], activeProfileId: id }));
        return id;
      },

      // ---- TRANSACTIONS ----
      addTransaction: async (transaction) => {
        const newTx = { ...transaction, id: generateId() } as Transaction;
        set((state) => ({ transactions: [newTx, ...state.transactions] }));
        await postToSheet(get().googleSheetUrl, get().googleAccessToken, get().spreadsheetId, 'Transactions', 'add', newTx as unknown as Record<string, unknown>);
      },

      // Impor massal: SATU panggilan tulis untuk semua baris (bukan N panggilan berurutan).
      // Loop per-baris menembus kuota tulis Google Sheets (rate limit) lalu error-nya
      // ditelan diam-diam → transaksi tampil di state lokal tapi tak pernah sampai ke Sheet
      // (tampak "tersimpan" lalu hilang saat sinkron ulang). Batch = atomik + jujur.
      addTransactionsBulk: async (txns) => {
        // Hormati id yang sudah ditentukan pemanggil (mis. id deterministik untuk auto-post → idempotent);
        // impor biasa tak mengirim id sehingga tetap di-generate acak.
        const withIds = txns.map((t) => ({ ...t, id: t.id || generateId() } as Transaction));
        if (!withIds.length) return { ok: true, saved: 0, failed: 0 };

        // Optimistic: tampilkan seluruh batch sekaligus.
        set((state) => ({ transactions: [...withIds, ...state.transactions] }));

        const token = get().googleAccessToken;
        const spreadsheetId = get().spreadsheetId;
        const url = get().googleSheetUrl;
        const hasTarget = !!((token && spreadsheetId) || url);
        if (!hasTarget) return { ok: true, saved: withIds.length, failed: 0 }; // mode lokal (tanpa target tulis)

        set((s) => ({ pendingWrites: s.pendingWrites + 1, saveError: null }));
        try {
          if (token && spreadsheetId) {
            // Mode API/OAuth: satu append berisi semua baris — anti rate-limit, atomik.
            await appendRowsToSheet(token, spreadsheetId, 'Transactions', withIds);
          } else if (url) {
            // Mode makro (Web App URL): Apps Script belum punya aksi batch → kirim berurutan.
            for (const tx of withIds) {
              await fetch(url, {
                method: 'POST', mode: 'no-cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'add', sheet: 'Transactions', data: tx }),
              });
            }
          }
          console.log(`[FinanceStore] ✅ bulk add ${withIds.length} → Transactions`);
          return { ok: true, saved: withIds.length, failed: 0 };
        } catch (error) {
          console.error('[FinanceStore] ❌ Gagal impor massal ke Transactions:', error);
          // Rollback optimistic agar UI jujur: baris yang gagal simpan TIDAK ditampilkan seolah tersimpan.
          set((state) => ({
            transactions: state.transactions.filter((t) => !withIds.some((w) => w.id === t.id)),
            saveError: 'Sebagian/semua transaksi impor gagal disimpan ke Google Sheets.',
          }));
          return { ok: false, saved: 0, failed: withIds.length };
        } finally {
          set((s) => ({ pendingWrites: Math.max(0, s.pendingWrites - 1) }));
        }
      },

      updateTransaction: async (transaction) => {
        set((state) => ({
          transactions: state.transactions.map(t => t.id === transaction.id ? transaction : t)
        }));
        await postToSheet(get().googleSheetUrl, get().googleAccessToken, get().spreadsheetId, 'Transactions', 'update', transaction as unknown as Record<string, unknown>);
      },

      deleteTransaction: async (id) => {
        set((state) => ({
          transactions: state.transactions.filter(t => t.id !== id)
        }));
        await postToSheet(get().googleSheetUrl, get().googleAccessToken, get().spreadsheetId, 'Transactions', 'delete', { id });
      },

      // ---- ACCOUNTS ----
      addAccount: async (account) => {
        const newAcc = { ...account, id: generateId() } as Account;
        set((state) => ({ accounts: [...state.accounts, newAcc] }));
        await postToSheet(get().googleSheetUrl, get().googleAccessToken, get().spreadsheetId, 'Accounts', 'add', newAcc as unknown as Record<string, unknown>);
      },

      updateAccount: async (account) => {
        set((state) => ({
          accounts: state.accounts.map(a => a.id === account.id ? account : a)
        }));
        await postToSheet(get().googleSheetUrl, get().googleAccessToken, get().spreadsheetId, 'Accounts', 'update', account as unknown as Record<string, unknown>);
      },

      deleteAccount: async (id) => {
        set((state) => ({
          accounts: state.accounts.filter(a => a.id !== id)
        }));
        await postToSheet(get().googleSheetUrl, get().googleAccessToken, get().spreadsheetId, 'Accounts', 'delete', { id });
      },

      // ---- ASSETS ----
      addAsset: async (asset) => {
        const newAsset = { ...asset, id: generateId() } as Asset;
        set((state) => ({ assets: [...state.assets, newAsset] }));
        const sheet = getAssetSheetName(newAsset.category, newAsset.subType);
        await postToSheet(get().googleSheetUrl, get().googleAccessToken, get().spreadsheetId, sheet, 'add', formatAssetForSheet(newAsset));
      },

      updateAsset: async (asset) => {
        set((state) => ({
          assets: state.assets.map(a => a.id === asset.id ? asset : a)
        }));
        const sheet = getAssetSheetName(asset.category, asset.subType);
        await postToSheet(get().googleSheetUrl, get().googleAccessToken, get().spreadsheetId, sheet, 'update', formatAssetForSheet(asset));
      },

      deleteAsset: async (id) => {
        const asset = get().assets.find(a => a.id === id);
        if (!asset) return;
        set((state) => ({
          assets: state.assets.filter(a => a.id !== id)
        }));
        const sheet = getAssetSheetName(asset.category, asset.subType);
        await postToSheet(get().googleSheetUrl, get().googleAccessToken, get().spreadsheetId, sheet, 'delete', { id });
      },

      // ---- BUDGET CATEGORIES ----
      addBudgetCategory: async (cat) => {
        const newCat = { ...cat, id: generateId() } as BudgetCategory;
        set((state) => ({ budgetCategories: [...state.budgetCategories, newCat] }));
        await postToSheet(get().googleSheetUrl, get().googleAccessToken, get().spreadsheetId, 'BudgetCategories', 'add', newCat as unknown as Record<string, unknown>);
      },

      updateBudgetCategory: async (cat) => {
        set((state) => ({
          budgetCategories: state.budgetCategories.map(c => c.id === cat.id ? cat : c)
        }));
        await postToSheet(get().googleSheetUrl, get().googleAccessToken, get().spreadsheetId, 'BudgetCategories', 'update', cat as unknown as Record<string, unknown>);
      },

      deleteBudgetCategory: async (id) => {
        set((state) => ({
          budgetCategories: state.budgetCategories.filter(c => c.id !== id)
        }));
        await postToSheet(get().googleSheetUrl, get().googleAccessToken, get().spreadsheetId, 'BudgetCategories', 'delete', { id });
      },

      // ---- DEBTS ----
      addDebt: async (debt) => {
        const newDebt = { ...debt, id: generateId() } as Debt;
        set((state) => ({ debts: [...state.debts, newDebt] }));
        await postToSheet(get().googleSheetUrl, get().googleAccessToken, get().spreadsheetId, 'Debts', 'add', newDebt as unknown as Record<string, unknown>);
      },

      updateDebt: async (debt) => {
        set((state) => ({
          debts: state.debts.map(d => d.id === debt.id ? debt : d)
        }));
        await postToSheet(get().googleSheetUrl, get().googleAccessToken, get().spreadsheetId, 'Debts', 'update', debt as unknown as Record<string, unknown>);
      },

      deleteDebt: async (id) => {
        set((state) => ({
          debts: state.debts.filter(d => d.id !== id)
        }));
        await postToSheet(get().googleSheetUrl, get().googleAccessToken, get().spreadsheetId, 'Debts', 'delete', { id });
      },

      // ── Fase 2: Goals ──
      addGoal: async (goal) => {
        const newGoal = { ...goal, id: generateId() } as Goal;
        set((state) => ({ goals: [...state.goals, newGoal] }));
        await postToSheet(get().googleSheetUrl, get().googleAccessToken, get().spreadsheetId, 'Goals', 'add', newGoal as unknown as Record<string, unknown>);
      },
      updateGoal: async (goal) => {
        set((state) => ({ goals: state.goals.map(g => g.id === goal.id ? goal : g) }));
        await postToSheet(get().googleSheetUrl, get().googleAccessToken, get().spreadsheetId, 'Goals', 'update', goal as unknown as Record<string, unknown>);
      },
      deleteGoal: async (id) => {
        set((state) => ({ goals: state.goals.filter(g => g.id !== id) }));
        await postToSheet(get().googleSheetUrl, get().googleAccessToken, get().spreadsheetId, 'Goals', 'delete', { id });
      },

      // ── Fase 2: Recurring ──
      addRecurring: async (rec) => {
        const newRec = { ...rec, id: generateId() } as Recurring;
        set((state) => ({ recurring: [...state.recurring, newRec] }));
        await postToSheet(get().googleSheetUrl, get().googleAccessToken, get().spreadsheetId, 'Recurring', 'add', newRec as unknown as Record<string, unknown>);
      },
      updateRecurring: async (rec) => {
        set((state) => ({ recurring: state.recurring.map(r => r.id === rec.id ? rec : r) }));
        await postToSheet(get().googleSheetUrl, get().googleAccessToken, get().spreadsheetId, 'Recurring', 'update', rec as unknown as Record<string, unknown>);
      },
      deleteRecurring: async (id) => {
        set((state) => ({ recurring: state.recurring.filter(r => r.id !== id) }));
        await postToSheet(get().googleSheetUrl, get().googleAccessToken, get().spreadsheetId, 'Recurring', 'delete', { id });
      },

      // ── Fase 2: Insurance ──
      addInsurance: async (ins) => {
        const newIns = { ...ins, id: generateId() } as Insurance;
        set((state) => ({ insurance: [...state.insurance, newIns] }));
        await postToSheet(get().googleSheetUrl, get().googleAccessToken, get().spreadsheetId, 'Insurance', 'add', newIns as unknown as Record<string, unknown>);
      },
      updateInsurance: async (ins) => {
        set((state) => ({ insurance: state.insurance.map(i => i.id === ins.id ? ins : i) }));
        await postToSheet(get().googleSheetUrl, get().googleAccessToken, get().spreadsheetId, 'Insurance', 'update', ins as unknown as Record<string, unknown>);
      },
      deleteInsurance: async (id) => {
        set((state) => ({ insurance: state.insurance.filter(i => i.id !== id) }));
        await postToSheet(get().googleSheetUrl, get().googleAccessToken, get().spreadsheetId, 'Insurance', 'delete', { id });
      },

      // ── F5.3: Retirement (Dana Pensiun) ──
      addRetirement: async (r) => {
        const newR = { ...r, id: generateId() } as Retirement;
        set((state) => ({ retirement: [...state.retirement, newR] }));
        await postToSheet(get().googleSheetUrl, get().googleAccessToken, get().spreadsheetId, 'Retirement', 'add', newR as unknown as Record<string, unknown>);
      },
      updateRetirement: async (r) => {
        set((state) => ({ retirement: state.retirement.map(x => x.id === r.id ? r : x) }));
        await postToSheet(get().googleSheetUrl, get().googleAccessToken, get().spreadsheetId, 'Retirement', 'update', r as unknown as Record<string, unknown>);
      },
      deleteRetirement: async (id) => {
        set((state) => ({ retirement: state.retirement.filter(x => x.id !== id) }));
        await postToSheet(get().googleSheetUrl, get().googleAccessToken, get().spreadsheetId, 'Retirement', 'delete', { id });
      },

      updateSettings: async (newSettings) => {
        const oldSettings = get().settings;
        set({ settings: newSettings });
        
        // Find which settings actually changed or are new
        const changedSettings = newSettings.filter(n => {
          const old = oldSettings.find(o => o.key === n.key);
          return !old || old.value !== n.value;
        });

        // Only sync the changed/new settings to Google Sheets.
        // Kunci keamanan (PIN) LOKAL per-browser — jangan ditulis ke Sheet (tetap di perangkat ini).
        const LOCAL_ONLY = new Set(['security_pin', 'security_pinActive']);
        for (const setting of changedSettings) {
          if (LOCAL_ONLY.has(setting.key)) continue;
          await postToSheet(get().googleSheetUrl, get().googleAccessToken, get().spreadsheetId, 'Settings', 'update', setting as unknown as Record<string, unknown>);
        }
      },

      setReportPrintPeriod: (month, year) => set({ reportPrintMonth: month, reportPrintYear: year }),
      setPrintType: (type) => set({ printType: type }),
      setLedgerPrintTransactions: (txs) => set({ ledgerPrintTransactions: txs }),
      setSptPrintRows: (rows) => set({ sptPrintRows: rows }),

      // Anggaran bulanan kini disimpan sebagai BARIS di tab MonthlyBudgets (format tidy),
      // bukan lagi blob JSON di Settings. id = "<month>__<category>". Nilai 0/kosong → hapus
      // baris (prune), sehingga tab tak menumpuk sampah.
      updateMonthlyBudget: async (yearMonth, categoryName, amount) => {
        const rounded = Math.round(Number(amount) || 0);
        const current = { ...get().monthlyBudgets };
        const id = `${yearMonth}__${categoryName}`;
        const existed = !!(current[yearMonth] && current[yearMonth][categoryName] !== undefined);

        if (rounded > 0) {
          current[yearMonth] = { ...(current[yearMonth] || {}), [categoryName]: rounded };
          set({ monthlyBudgets: current });
          await postToSheet(get().googleSheetUrl, get().googleAccessToken, get().spreadsheetId, 'MonthlyBudgets', existed ? 'update' : 'add', { id, month: yearMonth, category: categoryName, amount: rounded });
        } else {
          // Prune: hapus override (jangan simpan nol).
          if (current[yearMonth]) {
            const clone = { ...current[yearMonth] };
            delete clone[categoryName];
            if (Object.keys(clone).length === 0) delete current[yearMonth];
            else current[yearMonth] = clone;
          }
          set({ monthlyBudgets: current });
          if (existed) {
            await postToSheet(get().googleSheetUrl, get().googleAccessToken, get().spreadsheetId, 'MonthlyBudgets', 'delete', { id });
          }
        }
      },

      // Migrasi satu kali: pindahkan blob lama Settings.monthlyBudgets → baris tab MonthlyBudgets,
      // hanya entri > 0 (buang sampah nol), lalu kosongkan blob Settings agar tak ganda.
      migrateMonthlyBudgetsToTab: async (blob) => {
        const url = get().googleSheetUrl, token = get().googleAccessToken, sid = get().spreadsheetId;
        const clean: Record<string, Record<string, number>> = {};
        const writes: Promise<unknown>[] = [];
        for (const month of Object.keys(blob || {})) {
          for (const category of Object.keys(blob[month] || {})) {
            const amount = Math.round(Number(blob[month][category]) || 0);
            if (amount <= 0) continue;
            if (!clean[month]) clean[month] = {};
            clean[month][category] = amount;
            writes.push(postToSheet(url, token, sid, 'MonthlyBudgets', 'add', { id: `${month}__${category}`, month, category, amount }));
          }
        }
        set({ monthlyBudgets: clean });
        await Promise.all(writes);
        // Bersihkan blob lama di Settings.
        const idx = get().settings.findIndex(s => s.key === 'monthlyBudgets');
        if (idx !== -1) {
          set({ settings: get().settings.map(s => (s.key === 'monthlyBudgets' ? { ...s, value: '{}' } : s)) });
          await postToSheet(url, token, sid, 'Settings', 'update', { key: 'monthlyBudgets', value: '{}' });
        }
        console.log(`[FinanceStore] Migrasi monthlyBudgets → tab MonthlyBudgets selesai (${writes.length} entri).`);
      },

      // ---- FULL SYNC (Pull dari Google Sheets) ----
      syncFromGoogleSheets: async () => {
        const { googleSheetUrl, googleAccessToken, spreadsheetId } = get();
        if (!googleSheetUrl && !spreadsheetId) return;

        set({ isSyncing: true, syncError: null });
        try {
          let result;
          if (googleAccessToken && spreadsheetId) {
            try {
              result = await fetchAllDataFromSheets(googleAccessToken, spreadsheetId);
            } catch (apiError: any) {
              console.warn('[FinanceStore] Direct Sheets API sync failed, trying Web App URL fallback:', apiError);
              if (googleSheetUrl) {
                const response = await fetch(`${googleSheetUrl}?sheet=all`);
                result = await response.json();
              } else {
                throw apiError;
              }
            }
          } else if (googleSheetUrl) {
            const response = await fetch(`${googleSheetUrl}?sheet=all`);
            result = await response.json();
          }

          if (result && result.success && result.data) {
            const updates: Partial<FinanceState> = {};

            if (result.spreadsheetId && !get().spreadsheetId) {
              updates.spreadsheetId = result.spreadsheetId;
              try {
                import('./useAuthStore').then(module => {
                  const state = module.useAuthStore.getState();
                  if (state.user && state.user.email !== (import.meta.env.VITE_DEMO_EMAIL || 'demo@dompetku.com')) {
                    state.updateUserSpreadsheetId(state.user.email, result.spreadsheetId);
                  }
                });
              } catch (e) {
                console.error(e);
              }
            }

            const getVal = (obj: any, keys: string[]) => {
              if (!obj) return undefined;
              for (const k of keys) {
                if (obj[k] !== undefined && obj[k] !== '') return obj[k];
              }
              const cleanKeys = keys.map(k => k.toLowerCase().replace(/[^a-z0-9]/g, ''));
              for (const key of Object.keys(obj)) {
                const cleanKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
                if (cleanKeys.includes(cleanKey)) return obj[key];
              }
              return undefined;
            };

            if (result.data.Transactions) {
              updates.transactions = result.data.Transactions.map((t: Record<string, unknown>) => ({
                ...t,
                amount: parseNumber(t.amount),
              })).reverse();
            }
            if (result.data.Accounts) {
              updates.accounts = result.data.Accounts.map((a: Record<string, unknown>) => ({
                ...a,
                balance: parseNumber(a.balance),
                valuationReminder: a.valuationReminder === true || a.valuationReminder === 'TRUE' || a.valuationReminder === 'true',
                lastValuationUpdate: a.lastValuationUpdate ? String(a.lastValuationUpdate) : undefined
              }));
            }
            
            const parsedAssets: Asset[] = [];
            const fixedIncomeData = result.data['Fixed Income Investment'] || result.data.Assets;
            if (fixedIncomeData) {
              parsedAssets.push(...fixedIncomeData
                .filter((a: any) => {
                  const idVal = String(a.id || a.ID || '').trim().toLowerCase();
                  return idVal && idVal !== 'id' && idVal !== 'deposit type' && idVal !== 'product name' && idVal !== 'bond type';
                })
                .map((a: Record<string, unknown>) => {
                  const id = String(a.id || a.ID || '');
                  const title = String(a.title || getVal(a, ['title', 'Title', 'seri', 'Seri', 'Bond Type', 'bondType', 'Product Name', 'productName', 'Bank']) || 'Aset Pendapatan Tetap');
                  
                  let interestRate = a.interestRate !== undefined && a.interestRate !== '' ? Number(a.interestRate) : undefined;
                  if (interestRate === undefined || isNaN(interestRate)) {
                    const rawRate = getVal(a, ['Interest Rate (%)', 'interestRate', 'Coupon Type']);
                    if (rawRate !== undefined && rawRate !== '') {
                      interestRate = Number(String(rawRate).replace('%', '').trim());
                    }
                  }
                  // If rate is less than 1 (decimal), convert to percentage (e.g. 0.064 -> 6.4)
                  if (interestRate !== undefined && interestRate > 0 && interestRate < 1) {
                    interestRate = interestRate * 100;
                  }
                  
                  return {
                    ...a,
                    id,
                    title,
                    purchasePrice: parseNumber(a.purchasePrice !== undefined && a.purchasePrice !== '' ? a.purchasePrice : getVal(a, ['Principal', 'purchasePrice'])),
                    currentValue: parseNumber(a.currentValue !== undefined && a.currentValue !== '' ? a.currentValue : getVal(a, ['Principal', 'purchasePrice'])),
                    equity: parseNumber(a.equity) || 100,
                    purchaseDate: a.purchaseDate ? formatDateString(a.purchaseDate) : (getVal(a, ['Issue Date', 'purchaseDate']) ? formatDateString(getVal(a, ['Issue Date', 'purchaseDate'])) : undefined),
                    shares: a.shares !== undefined && a.shares !== '' ? parseNumber(a.shares) : undefined,
                    avgCost: a.avgCost !== undefined && a.avgCost !== '' ? parseNumber(a.avgCost) : undefined,
                    currentPrice: a.currentPrice !== undefined && a.currentPrice !== '' ? parseNumber(a.currentPrice) : undefined,
                    interestRate: interestRate || 6.4,
                    ticker: a.ticker !== undefined && a.ticker !== '' ? String(a.ticker) : String(getVal(a, ['Seri', 'Ticker', 'ticker']) || ''),
                    subType: a.subType !== undefined && a.subType !== '' ? String(a.subType) : 'sbn',
                    maturityDate: a.maturityDate !== undefined && a.maturityDate !== '' ? String(a.maturityDate) : (getVal(a, ['Maturity Date']) ? String(getVal(a, ['Maturity Date'])) : undefined),
                  } as Asset;
                }));
            }
            if (result.data.AssetsNonLiquid) {
              parsedAssets.push(...result.data.AssetsNonLiquid.map((a: Record<string, unknown>) => {
                const purchasePrice = parseNumber(a.purchasePrice);
                const usefulLife = parseNumber(a.usefulLife) || 10;
                const method = String(a.depreciationMethod || 'Tidak Menyusut');
                const purchaseDate = formatDateString(a.purchaseDate || new Date().toISOString());

                // Properties appreciate, Vehicles/Personal Assets deprecate
                let currentValue = a.currentValue !== undefined && a.currentValue !== '' ? parseNumber(a.currentValue) : purchasePrice;
                if (a.category === 'kendaraan' || a.category === 'koleksi') {
                  currentValue = calculateDepreciatedValue(purchasePrice, purchaseDate, usefulLife, method);
                }

                return {
                  ...a,
                  purchasePrice,
                  currentValue,
                  purchaseDate,
                  equity: parseNumber(a.equity) || 100,
                  usefulLife,
                  landArea: a.landArea !== undefined && a.landArea !== '' ? parseNumber(a.landArea) : undefined,
                  buildingArea: a.buildingArea !== undefined && a.buildingArea !== '' ? parseNumber(a.buildingArea) : undefined,
                  mfgYear: a.mfgYear !== undefined && a.mfgYear !== '' ? parseNumber(a.mfgYear) : undefined,
                  subType: a.subType !== undefined && a.subType !== '' ? String(a.subType) : undefined,
                  depreciationMethod: method as any,
                  valuationReminder: a.valuationReminder === true || a.valuationReminder === 'TRUE' || a.valuationReminder === 'true',
                  lastValuationUpdate: a.lastValuationUpdate ? String(a.lastValuationUpdate) : undefined
                } as Asset;
              }));
            }
            // getVal definition moved to top of syncFromGoogleSheets block

            if (result.data.Saham) {
              parsedAssets.push(...result.data.Saham.map((a: any) => {
                const id = String(getVal(a, ['id', 'ID']) || generateId());
                const title = String(getVal(a, ['title', 'Title']) || '');
                const ticker = String(getVal(a, ['ticker', 'Ticker']) || '');
                const shares = parseNumber(getVal(a, ['shares', 'Shares']));
                const avgCost = parseNumber(getVal(a, ['avgCost', 'Avg. Cost', 'avg_cost']));
                const currentPrice = parseNumber(getVal(a, ['currentPrice', 'Current Price', 'current_price']));
                const purchaseDate = formatDateString(getVal(a, ['purchaseDate', 'Purchase Date', 'date']) || '');
                const location = String(getVal(a, ['location', 'Location']) || '');
                const icon = String(getVal(a, ['icon', 'Icon']) || 'show_chart');
                const notes = String(getVal(a, ['notes', 'Notes']) || '');

                return {
                  id,
                  title,
                  ticker,
                  category: 'investasi',
                  subType: 'saham',
                  shares,
                  avgCost,
                  currentPrice,
                  currentValue: shares * currentPrice,
                  purchasePrice: shares * avgCost,
                  purchaseDate,
                  location,
                  icon,
                  notes,
                  equity: 100
                } as Asset;
              }));
            }
            const cryptoData = result.data.Kripto || result.data.Crypto;
            if (cryptoData) {
              parsedAssets.push(...cryptoData.map((a: any) => {
                const id = String(getVal(a, ['id', 'ID']) || generateId());
                const title = String(getVal(a, ['title', 'Title']) || '');
                const ticker = String(getVal(a, ['ticker', 'Ticker']) || '');
                const shares = parseNumber(getVal(a, ['coins', 'Coins', 'shares', 'Shares']));
                const avgCost = parseNumber(getVal(a, ['avgCost', 'Avg. Cost', 'avg_cost']));
                const currentPrice = parseNumber(getVal(a, ['currentPrice', 'Current Price', 'current_price']));
                const purchaseDate = formatDateString(getVal(a, ['purchaseDate', 'Purchase Date', 'date']) || '');
                const location = String(getVal(a, ['location', 'Location']) || '');
                const icon = String(getVal(a, ['icon', 'Icon']) || 'currency_bitcoin');
                const notes = String(getVal(a, ['notes', 'Notes']) || '');

                return {
                  id,
                  title,
                  ticker,
                  category: 'investasi',
                  subType: 'kripto',
                  shares,
                  avgCost,
                  currentPrice,
                  currentValue: shares * currentPrice,
                  purchasePrice: shares * avgCost,
                  purchaseDate,
                  location,
                  icon,
                  notes,
                  equity: 100
                } as Asset;
              }));
            }
            if (result.data.Reksadana) {
              parsedAssets.push(...result.data.Reksadana.map((a: any) => {
                const id = String(getVal(a, ['id', 'ID']) || generateId());
                const title = String(getVal(a, ['title', 'Title']) || '');
                const ticker = String(getVal(a, ['ticker', 'Ticker']) || '');
                const shares = parseNumber(getVal(a, ['units', 'Units', 'shares', 'Shares']));
                const avgCost = parseNumber(getVal(a, ['navPerUnit', 'nav_per_unit', 'avgCost', 'Avg. Cost']));
                const rawCurrentNav = parseNumber(getVal(a, ['currentNav', 'Current_NAV', 'current_nav', 'currentPrice', 'Current Price']));
                const purchaseDate = formatDateString(getVal(a, ['purchaseDate', 'Purchase Date', 'date']) || '');
                const location = String(getVal(a, ['location', 'Location']) || '');
                const icon = String(getVal(a, ['icon', 'Icon']) || 'account_balance');
                const notes = String(getVal(a, ['notes', 'Notes']) || '');

                const isTotalValue = rawCurrentNav > 100000 && rawCurrentNav > avgCost * 2;
                const currentValue = isTotalValue ? rawCurrentNav : (shares * rawCurrentNav);
                const currentPrice = isTotalValue ? (shares > 0 ? rawCurrentNav / shares : 0) : rawCurrentNav;
                const purchasePrice = shares * avgCost;

                return {
                  id,
                  title,
                  ticker,
                  category: 'investasi',
                  subType: 'reksadana',
                  shares,
                  avgCost,
                  currentPrice,
                  currentNav: currentPrice,
                  currentValue,
                  purchasePrice,
                  purchaseDate,
                  location,
                  icon,
                  notes,
                  equity: 100
                } as Asset;
              }));
            }
            updates.assets = parsedAssets;

            if (result.data.BudgetCategories) {
              updates.budgetCategories = result.data.BudgetCategories.map((c: Record<string, unknown>) => ({
                ...c,
                allocated: parseNumber(c.allocated),
                alertAt: parseNumber(c.alertAt) || 80,
                includeInTotal: c.includeInTotal === true || c.includeInTotal === 'TRUE',
              }));
            }
            if (result.data.Debts) {
              updates.debts = result.data.Debts.map((d: Record<string, unknown>) => ({
                ...d,
                balance: parseNumber(d.balance),
                interestRate: parseNumber(d.interestRate),
                minPayment: parseNumber(d.minPayment),
              }));
            }
            // ── Fase 2: Goals / Recurring / Insurance ──
            if (result.data.Goals) {
              updates.goals = result.data.Goals.map((g: Record<string, unknown>) => ({
                ...g,
                goalType: g.goalType === 'sinking' ? 'sinking' : 'goal',
                targetAmount: parseNumber(g.targetAmount),
                initialAmount: parseNumber(g.initialAmount),
                expectedReturn: parseNumber(g.expectedReturn),
                monthlyContribution: parseNumber(g.monthlyContribution),
                priority: parseNumber(g.priority) || 2,
              })) as Goal[];
            }
            if (result.data.Recurring) {
              updates.recurring = result.data.Recurring.map((r: Record<string, unknown>) => ({
                ...r,
                amount: parseNumber(r.amount),
                dayOfMonth: parseNumber(r.dayOfMonth) || 1,
                autoPost: r.autoPost === true || r.autoPost === 'TRUE' || r.autoPost === 'true',
              })) as Recurring[];
            }
            if (result.data.Insurance) {
              updates.insurance = result.data.Insurance.map((i: Record<string, unknown>) => ({
                ...i,
                premium: parseNumber(i.premium),
                coverageAmount: parseNumber(i.coverageAmount),
              })) as Insurance[];
            }
            if (result.data.Retirement) {
              updates.retirement = result.data.Retirement.map((r: Record<string, unknown>) => ({
                ...r,
                currentBalance: parseNumber(r.currentBalance),
                monthlyContribution: parseNumber(r.monthlyContribution),
                employerContribution: parseNumber(r.employerContribution),
                targetAge: parseNumber(r.targetAge) || 56,
                expectedReturn: parseNumber(r.expectedReturn),
              })) as Retirement[];
            }
            if (result.data.Settings) {
              const settingsList = result.data.Settings as Setting[];
              // PIN Transaksi bersifat LOKAL per-browser: tersimpan di perangkat ini (localStorage
              // lewat persist store) dan TIDAK boleh ditimpa oleh Settings dari Sheet. Kalau ditimpa,
              // PIN yang sudah diset hilang tiap sinkron → aplikasi minta buat PIN lagi. Pertahankan
              // nilai lokal; adopsi dari Sheet HANYA bila perangkat ini belum punya PIN (pengguna lama).
              const LOCAL_ONLY = new Set(['security_pin', 'security_pinActive']);
              const localSettings = get().settings;
              const localHasPin = localSettings.some((s) => s.key === 'security_pin' && s.value);
              const securityKeep = (localHasPin ? localSettings : settingsList).filter((s) => LOCAL_ONLY.has(s.key));
              updates.settings = [...settingsList.filter((s) => !LOCAL_ONLY.has(s.key)), ...securityKeep];

              // Sync last_password to auth store registeredUsers
              const lastPwdSetting = settingsList.find(s => s.key === 'last_password');
              if (lastPwdSetting && lastPwdSetting.value) {
                const emailSetting = settingsList.find(s => s.key === 'email')?.value;
                const nameSetting = settingsList.find(s => s.key === 'userName')?.value || 'User';
                if (emailSetting) {
                  const authState = useAuthStore.getState();
                  const existing = authState.registeredUsers.find(u => u.email.toLowerCase() === emailSetting.toLowerCase());
                  const needsUpdate = !existing || 
                    existing.password !== lastPwdSetting.value || 
                    existing.name !== nameSetting;
                  
                  if (needsUpdate) {
                    authState.signup(emailSetting, lastPwdSetting.value, nameSetting);
                  }
                }
              }

            }

            // ── Anggaran bulanan: sumber utama tab MonthlyBudgets (tidy); fallback blob Settings lama ──
            {
              const settingsArr = (result.data.Settings as Setting[] | undefined) || [];
              const blobRaw = settingsArr.find((s) => s.key === 'monthlyBudgets')?.value;
              let blobBudgets: Record<string, Record<string, number>> = {};
              if (blobRaw) { try { blobBudgets = JSON.parse(blobRaw) || {}; } catch { blobBudgets = {}; } }

              const mbRows = (result.data.MonthlyBudgets as Record<string, unknown>[] | undefined) || [];
              const tabBudgets: Record<string, Record<string, number>> = {};
              for (const row of mbRows) {
                const mo = String(row.month || ''); const cat = String(row.category || '');
                if (!mo || !cat) continue;
                if (!tabBudgets[mo]) tabBudgets[mo] = {};
                tabBudgets[mo][cat] = parseNumber(row.amount);
              }
              const tabHasData = Object.keys(tabBudgets).length > 0;
              updates.monthlyBudgets = tabHasData ? tabBudgets : blobBudgets;

              // Migrasi satu kali (tab kosong tetapi blob lama berisi) — non-blocking.
              if (!tabHasData && Object.keys(blobBudgets).length > 0) {
                const snapshot = blobBudgets;
                setTimeout(() => { get().migrateMonthlyBudgetsToTab(snapshot).catch((e) => console.error('[App] Migrasi monthlyBudgets gagal:', e)); }, 0);
              }
            }

            updates.lastSyncAt = new Date().toISOString();
            updates.syncError = null;
            set(updates as FinanceState);
            console.log('[FinanceStore] ✅ Full sync dari Google Sheets berhasil');
          } else {
            throw new Error(result?.error || 'Format data tidak valid');
          }
        } catch (error: any) {
          console.error('[FinanceStore] ❌ Gagal sync dari Google Sheets:', error);
          const errMsg = String(error.message || '');
          if (errMsg.includes('Google Auth Error') || errMsg.includes('401') || errMsg.includes('403') || errMsg.includes('unauthorized') || errMsg.includes('permission')) {
            console.log('[FinanceStore] Token expired or unauthorized, clearing googleAccessToken');
            set({ googleAccessToken: null });
          }
          set({ syncError: error.message || 'Gagal menyinkronkan data' });
        } finally {
          set({ isSyncing: false });
        }
      },
      resetFinance: () => {
        set({
          transactions: TRANSACTIONS_DATA as Transaction[],
          accounts: DEFAULT_ACCOUNTS,
          assets: DEFAULT_ASSETS,
          budgetCategories: DEFAULT_BUDGET_CATEGORIES,
          debts: DEBTS_DATA as Debt[],
          goals: [],
          recurring: [],
          insurance: [],
          settings: DEFAULT_SETTINGS,
          googleSheetUrl: import.meta.env.VITE_DEFAULT_SHEET_URL || 'https://script.google.com/macros/s/AKfycbzhD4TrmhBhb1484U7thVyEJDvZAFYtAbiG0bRK_jcWCiLKwy1EtBFCOQKikaj9l6yL2Q/exec',
          googleAccessToken: null,
          spreadsheetId: null,
          profiles: [],
          activeProfileId: null,
          isSyncing: false,
          lastSyncAt: null,
          monthlyBudgets: {},
        });
      }
    }),
    {
      name: `${import.meta.env.VITE_APP_NAME ? import.meta.env.VITE_APP_NAME.toLowerCase().replace(/\s+/g, '-') : 'dompetku'}-storage`,
      version: 1, // Bump version to force fresh fetch from the new URL
    }
  )
);
