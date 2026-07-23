import type { Transaction, Account, Setting, BudgetCategory } from '../store/useFinanceStore';
import { monthlyCashflow, currentMonthKey, completeMonths, type MonthCashflow } from './cashflowUtils';
import { categoryTrends } from './insightsUtils';
import { savingsRate as _sr } from './fiUtils';
import { parseTxnMonth, isAssetAllocation } from './financeClassify';

/**
 * Fase 7 — Rangkuman Bulanan Naratif. Merangkai data (arus kas + tren) jadi paragraf bahasa manusia
 * untuk bulan LENGKAP terakhir. Murni & dapat diuji.
 */

const rp = (n: number) => 'Rp ' + Math.round(n).toLocaleString('id-ID');
const MONTHS_ID = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const monthLabel = (ym: string) => { const [y, m] = ym.split('-'); return `${MONTHS_ID[Number(m) - 1]} ${y}`; };

export interface MonthlySummary {
  month: string;                 // 'YYYY-MM' bulan lengkap terakhir
  monthLabel: string;
  headline: string;
  positive: boolean;
  lines: { icon: string; text: string }[];
  hasData: boolean;
}

/** Total pengeluaran per kategori (non-investasi) untuk sebuah bulan. */
function topCategory(txns: Transaction[], month: string): { name: string; amount: number } | null {
  const totals = new Map<string, number>();
  for (const t of txns) {
    if (t.type !== 'PENGELUARAN' || isAssetAllocation(t.category) || parseTxnMonth(t.date) !== month) continue;
    totals.set(t.category || 'Lainnya', (totals.get(t.category || 'Lainnya') || 0) + Math.abs(t.amount || 0));
  }
  let best: { name: string; amount: number } | null = null;
  for (const [name, amount] of totals) if (!best || amount > best.amount) best = { name, amount };
  return best;
}

export function buildMonthlySummary(
  transactions: Transaction[], accounts: Account[], _monthlyBudgets: Record<string, Record<string, number>>,
  _budgetCategories: BudgetCategory[], settings: Setting[],
): MonthlySummary {
  const list = monthlyCashflow(transactions, accounts, settings);
  const nowMonth = currentMonthKey();
  const complete = completeMonths(list, nowMonth);
  if (!complete.length) {
    return { month: '', monthLabel: '', headline: '', positive: true, lines: [], hasData: false };
  }
  const m: MonthCashflow = complete[complete.length - 1];
  const positive = m.net >= 0;
  const sRate = _sr(m.income, m.expense);
  const top = topCategory(transactions, m.month);
  const trends = categoryTrends(transactions, 3).filter((t) => t.refMonth === m.month);
  const biggestUp = trends.find((t) => t.deltaAbs > 0);
  const biggestDown = [...trends].reverse().find((t) => t.deltaAbs < 0 && t.avgPrior > 0);

  const lines: { icon: string; text: string }[] = [];
  lines.push({ icon: 'trending_up', text: `Pemasukan ${rp(m.income)}, pengeluaran ${rp(m.expense)} — ${positive ? 'surplus' : 'defisit'} ${rp(Math.abs(m.net))}.` });
  if (m.income > 0) lines.push({ icon: 'savings', text: `Tingkat menabung ${(sRate * 100).toFixed(0)}%${sRate >= 0.2 ? ' — bagus, di atas 20%.' : sRate >= 0.1 ? ' — cukup, coba naikkan menuju 20%.' : ' — tipis, tinjau pengeluaran terbesar.'}` });
  if (top && top.amount > 0) lines.push({ icon: 'category', text: `Pengeluaran terbesar: ${top.name} (${rp(top.amount)}).` });
  if (biggestUp && biggestUp.deltaPct >= 20) lines.push({ icon: 'north_east', text: `${biggestUp.category} naik ${Math.round(biggestUp.deltaPct)}% dari rata-rata (+${rp(biggestUp.deltaAbs)}).` });
  if (biggestDown) lines.push({ icon: 'south_east', text: `Kabar baik: ${biggestDown.category} turun ${Math.round(Math.abs(biggestDown.deltaPct))}% — hemat ${rp(Math.abs(biggestDown.deltaAbs))}.` });

  return {
    month: m.month, monthLabel: monthLabel(m.month),
    headline: `${monthLabel(m.month)}: ${positive ? 'Surplus' : 'Defisit'} ${rp(Math.abs(m.net))}`,
    positive, lines, hasData: true,
  };
}
