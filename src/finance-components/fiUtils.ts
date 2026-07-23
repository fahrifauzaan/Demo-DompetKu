import type { Asset, Account } from '../store/useFinanceStore';
import { assetValueIDR, accountValueIDR } from './currencyUtils';
import { burnRate, type MonthCashflow } from './cashflowUtils';

/**
 * F5.2 — Pelacak Kemandirian Finansial (FIRE). Murni & dapat diuji.
 * Menyambung cashflowUtils (biaya hidup) & currencyUtils (nilai IDR). Semua asumsi berdisclaimer.
 */

/** Pengeluaran tahunan = burn rate (biaya hidup/bln) × 12. */
export function annualExpenseFromCashflow(months: MonthCashflow[], nowMonth: string, window = 6): number {
  return burnRate(months, nowMonth, window) * 12;
}

/** FI Number = pengeluaran tahunan ÷ SWR (aturan 4% → ×25). */
export function fiNumber(annualExpense: number, swr = 0.04): number {
  return swr > 0 ? annualExpense / swr : 0;
}

/** Aset yang bisa "dipakai untuk FI": portofolio investasi (category 'investasi') + akun tipe investment. */
export function investableAssets(assets: Asset[], accounts: Account[], rate: number, usdTickers: string[]): number {
  const fromAssets = assets
    .filter((a) => a.category === 'investasi')
    .reduce((s, a) => s + assetValueIDR(a, rate, usdTickers), 0);
  const fromAccounts = accounts
    .filter((a) => a.type === 'investment')
    .reduce((s, a) => s + accountValueIDR(a, rate), 0);
  return fromAssets + fromAccounts;
}

/** %FI (0..1). */
export function pctFI(investable: number, fiNum: number): number {
  return fiNum > 0 ? investable / fiNum : 0;
}

/** Return riil dari return nominal & inflasi. */
export function realReturn(nominal: number, inflation: number): number {
  return (1 + nominal) / (1 + inflation) - 1;
}

/**
 * Tahun menuju FI: selesaikan n dari FV = current·(1+r)^n + C·((1+r)^n−1)/r = target.
 * r ≈ 0 → (target−current)/C. Kembalikan 0 bila sudah tercapai, Infinity bila mustahil.
 */
export function yearsToFI(current: number, target: number, annualContribution: number, realRet: number): number {
  if (current >= target) return 0;
  if (Math.abs(realRet) < 1e-5) {
    return annualContribution > 0 ? (target - current) / annualContribution : Infinity;
  }
  const r = realRet, C = annualContribution;
  const num = target + C / r;
  const den = current + C / r;
  if (den <= 0 || num / den <= 0) return Infinity;
  const n = Math.log(num / den) / Math.log(1 + r);
  return n > 0 && isFinite(n) ? n : Infinity;
}

/** Coast FIRE: modal yang bila dibiarkan tumbuh (tanpa setoran) mencapai FI saat pensiun. */
export function coastFireNumber(currentAge: number, retireAge: number, annualExpense: number, realRet: number, swr = 0.04): number {
  const target = fiNumber(annualExpense, swr);
  const yrs = Math.max(0, retireAge - currentAge);
  return target / Math.pow(1 + realRet, yrs);
}

/** Tingkat menabung = (pemasukan − pengeluaran) ÷ pemasukan. */
export function savingsRate(income: number, expense: number): number {
  return income > 0 ? (income - expense) / income : 0;
}
