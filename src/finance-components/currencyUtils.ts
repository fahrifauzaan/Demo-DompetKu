import type { Account, Asset, Setting } from '../store/useFinanceStore';

/**
 * F3.3 Multi-currency (fondasi USD). Semua AGREGAT dalam IDR.
 * - Akun: hormati `account.currency` ('USD' → dikonversi).
 * - Aset investasi (tak punya kolom currency): dianggap USD bila `location`/`notes`
 *   memuat tag `[USD]` ATAU `ticker` terdaftar di `usd_tickers` (Settings).
 * - Kurs dari Settings `USDIDR_RATE` (di template diisi GOOGLEFINANCE), fallback default.
 * Untuk aset/akun IDR, helper mengembalikan nilai apa adanya (identity) → aman, tanpa regresi.
 */

export const DEFAULT_USDIDR = 16300;
export const DEFAULT_USD_TICKERS = ['VTI', 'SPY', 'VOO', 'QQQ'];

export function getUsdIdrRate(settings: Setting[]): number {
  const raw = settings.find((s) => s.key === 'USDIDR_RATE')?.value;
  const v = Number(String(raw ?? '').replace(/[^0-9.]/g, ''));
  return v && v > 0 ? v : DEFAULT_USDIDR;
}

export function getUsdRateMeta(settings: Setting[]): { rate: number; isDefault: boolean } {
  const raw = settings.find((s) => s.key === 'USDIDR_RATE')?.value;
  const v = Number(String(raw ?? '').replace(/[^0-9.]/g, ''));
  return v && v > 0 ? { rate: v, isDefault: false } : { rate: DEFAULT_USDIDR, isDefault: true };
}

export function getUsdTickers(settings: Setting[]): string[] {
  const raw = settings.find((s) => s.key === 'usd_tickers')?.value;
  if (!raw) return DEFAULT_USD_TICKERS;
  const list = String(raw).split(',').map((s) => s.trim().toUpperCase()).filter(Boolean);
  return list.length ? list : DEFAULT_USD_TICKERS;
}

export function accountIsUSD(a: Account): boolean {
  return (a.currency || 'IDR').toUpperCase() === 'USD';
}

export function assetIsUSD(a: Asset, usdTickers: string[]): boolean {
  const tag = `${a.location || ''} ${a.notes || ''}`.toUpperCase();
  if (tag.includes('[USD]')) return true;
  const tk = (a.ticker || '').toUpperCase();
  return tk ? usdTickers.includes(tk) : false;
}

/** Nilai akun dalam IDR (konversi bila USD). */
export function accountValueIDR(a: Account, rate: number): number {
  return accountIsUSD(a) ? (a.balance || 0) * rate : (a.balance || 0);
}

/** Nilai aset (currentValue) dalam IDR (konversi bila USD). */
export function assetValueIDR(a: Asset, rate: number, usdTickers: string[]): number {
  return assetIsUSD(a, usdTickers) ? (a.currentValue || 0) * rate : (a.currentValue || 0);
}

/** Harga perolehan aset dalam IDR (untuk gain/cost basis). */
export function assetCostIDR(a: Asset, rate: number, usdTickers: string[]): number {
  return assetIsUSD(a, usdTickers) ? (a.purchasePrice || 0) * rate : (a.purchasePrice || 0);
}

export const formatUSD = (n: number) => `$${Math.round(n || 0).toLocaleString('en-US')}`;
