import type { Asset, Transaction, Setting } from '../store/useFinanceStore';
import { xirr, simpleReturn, type CashFlow } from './xirrUtils';
import { getUsdIdrRate, getUsdTickers, assetValueIDR, assetCostIDR } from './currencyUtils';
import { parseDateSafe } from './calendarUtils';

/**
 * F3.1 — arus kas & imbal hasil per holding investasi.
 * Konvensi v1 (didokumentasikan di Panduan):
 * - Modal awal = purchaseDate + purchasePrice (harga perolehan) → 1 CF negatif.
 *   Bila purchaseDate tak ada → pakai 1 tahun lalu & tandai "estimasi".
 * - Dividen/kupon/jual = transaksi PEMASUKAN yang desc-nya memuat ticker/nama → CF positif.
 * - Fixed income tanpa transaksi income → kupon akrual ditaksir sebagai income.
 * - Terminal = nilai pasar hari ini → CF positif.
 */

export interface HoldingReturn {
  id: string;
  title: string;
  ticker: string;
  subType: string;
  costIDR: number;
  marketIDR: number;
  incomeIDR: number;
  unrealizedIDR: number; // market − cost
  xirr: number | null;   // desimal tahunan
  simple: number | null; // fallback bila XIRR N/A
  isEstimate: boolean;
  cashflows: CashFlow[];
}

const INCOME_RE = /DIVIDEN|KUPON|BUNGA|BAGI HASIL|JUAL|CAPITAL GAIN|IMBAL/;

const isFixedIncomeSub = (subType: string, hasRate: boolean) =>
  subType === 'sbn' || subType === 'deposito' || subType === 'p2p' || subType === 'obligasi' || hasRate;

function buildHoldingReturn(a: Asset, transactions: Transaction[], rate: number, usdTickers: string[]): HoldingReturn {
  const costIDR = assetCostIDR(a, rate, usdTickers);
  const marketIDR = assetValueIDR(a, rate, usdTickers);
  const ticker = (a.ticker || (a.title || '').split(' ')[0] || '').toUpperCase();
  const titleKey = (a.title || '').toUpperCase();
  const subType = (a.subType || '').toLowerCase();

  const pd = parseDateSafe(a.purchaseDate);
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const isEstimate = !pd || pd >= now;
  const buyDate = isEstimate ? new Date(now.getTime() - 365 * 86400000) : (pd as Date);

  const cfs: CashFlow[] = [{ date: buyDate, amount: -costIDR }];

  // Income transaksi yang match (dividen/kupon/jual)
  let income = 0;
  for (const t of transactions) {
    if (t.type !== 'PEMASUKAN') continue;
    const d = (t.desc || '').toUpperCase();
    if (!INCOME_RE.test(d)) continue;
    const matched = (ticker.length >= 2 && d.includes(ticker)) || (titleKey.length > 4 && d.includes(titleKey));
    if (!matched) continue;
    const dt = parseDateSafe(t.date);
    const amt = Math.abs(t.amount || 0);
    if (dt && amt > 0) { cfs.push({ date: dt, amount: amt }); income += amt; }
  }

  // Fixed income: kupon akrual bila belum ada transaksi income
  const hasRate = typeof a.interestRate === 'number' && a.interestRate > 0;
  if (income === 0 && isFixedIncomeSub(subType, hasRate) && costIDR > 0) {
    const couponRate = (a.interestRate || (subType === 'deposito' ? 4.5 : subType === 'p2p' ? 12 : 6.4)) / 100;
    const tax = a.tax !== undefined ? a.tax : (subType === 'deposito' ? 0.2 : subType === 'p2p' ? 0.15 : 0.1);
    const yearsHeld = Math.max(0, (now.getTime() - buyDate.getTime()) / (365 * 86400000));
    const accrued = costIDR * couponRate * (1 - tax) * Math.min(yearsHeld, 30);
    if (accrued > 0) { cfs.push({ date: now, amount: accrued }); income += accrued; }
  }

  cfs.push({ date: now, amount: marketIDR });

  const rateXirr = xirr(cfs);
  const simple = simpleReturn(costIDR, marketIDR + income);

  return {
    id: a.id, title: a.title, ticker, subType: subType || 'saham',
    costIDR, marketIDR, incomeIDR: income, unrealizedIDR: marketIDR - costIDR,
    xirr: rateXirr, simple, isEstimate, cashflows: cfs,
  };
}

export interface PortfolioReturns {
  holdings: HoldingReturn[];
  totalCost: number;
  totalMarket: number;
  totalIncome: number;
  totalUnrealized: number;
  portfolioXirr: number | null;
  portfolioSimple: number | null;
}

export function computePortfolioReturns(assets: Asset[], transactions: Transaction[], settings: Setting[]): PortfolioReturns {
  const rate = getUsdIdrRate(settings);
  const usdTickers = getUsdTickers(settings);
  const invest = assets.filter((a) => a.category === 'investasi' && ((a.purchasePrice || 0) > 0 || (a.currentValue || 0) > 0));
  const holdings = invest.map((a) => buildHoldingReturn(a, transactions, rate, usdTickers));

  const totalCost = holdings.reduce((s, h) => s + h.costIDR, 0);
  const totalMarket = holdings.reduce((s, h) => s + h.marketIDR, 0);
  const totalIncome = holdings.reduce((s, h) => s + h.incomeIDR, 0);

  // Aggregate XIRR: gabungkan semua cashflow
  const allCfs: CashFlow[] = [];
  holdings.forEach((h) => h.cashflows.forEach((cf) => allCfs.push(cf)));
  const portfolioXirr = xirr(allCfs);

  return {
    holdings,
    totalCost,
    totalMarket,
    totalIncome,
    totalUnrealized: totalMarket - totalCost,
    portfolioXirr,
    portfolioSimple: simpleReturn(totalCost, totalMarket + totalIncome),
  };
}
