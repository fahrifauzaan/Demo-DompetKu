import type { Transaction, BudgetCategory } from '../store/useFinanceStore';
import { parseTxnMonth, isAssetAllocation } from './financeClassify';

/**
 * F4.2 — Wawasan Pengeluaran & Deteksi Anomali. Murni & dapat diuji (fungsi berbasis waktu menerima nowMonth/now).
 * Semua hanya memakai PENGELUARAN non-alokasi-aset (biaya hidup riil).
 */

const expenseAmt = (t: Transaction) => Math.abs(t.amount || 0);
const isRealExpense = (t: Transaction) => t.type === 'PENGELUARAN' && !isAssetAllocation(t.category);

/** Total pengeluaran per (bulan, kategori). */
function monthCategoryTotals(txns: Transaction[]): Map<string, Map<string, number>> {
  const byMonth = new Map<string, Map<string, number>>();
  for (const t of txns) {
    if (!isRealExpense(t)) continue;
    const m = parseTxnMonth(t.date);
    if (!m) continue;
    const cat = t.category || 'Lainnya';
    if (!byMonth.has(m)) byMonth.set(m, new Map());
    const cm = byMonth.get(m)!;
    cm.set(cat, (cm.get(cat) || 0) + expenseAmt(t));
  }
  return byMonth;
}

export interface CategoryTrend {
  category: string; refMonth: string; thisMonth: number; avgPrior: number; deltaAbs: number; deltaPct: number;
}

/** Tren kategori: bulan terbaru (dalam data) vs rata-rata `priorMonths` bulan sebelumnya. */
export function categoryTrends(txns: Transaction[], priorMonths = 3): CategoryTrend[] {
  const byMonth = monthCategoryTotals(txns);
  const months = [...byMonth.keys()].sort();
  if (months.length < 2) return [];
  const refMonth = months[months.length - 1];
  const prior = months.slice(-1 - priorMonths, -1); // s/d priorMonths bulan sebelum refMonth
  const cats = new Set<string>();
  byMonth.get(refMonth)!.forEach((_, c) => cats.add(c));
  prior.forEach((m) => byMonth.get(m)!.forEach((_, c) => cats.add(c)));

  const out: CategoryTrend[] = [];
  for (const cat of cats) {
    const thisMonth = byMonth.get(refMonth)!.get(cat) || 0;
    const priorVals = prior.map((m) => byMonth.get(m)!.get(cat) || 0);
    const avgPrior = priorVals.length ? priorVals.reduce((a, b) => a + b, 0) / priorVals.length : 0;
    const deltaAbs = thisMonth - avgPrior;
    const deltaPct = avgPrior > 0 ? (deltaAbs / avgPrior) * 100 : thisMonth > 0 ? 100 : 0;
    if (thisMonth === 0 && avgPrior === 0) continue;
    out.push({ category: cat, refMonth, thisMonth, avgPrior, deltaAbs, deltaPct });
  }
  return out.sort((a, b) => Math.abs(b.deltaAbs) - Math.abs(a.deltaAbs));
}

export interface Anomaly { kind: 'kategori' | 'transaksi'; category: string; amount: number; month?: string; txnId?: string; z: number }

function meanStd(vals: number[]): { mean: number; std: number } {
  const n = vals.length;
  if (!n) return { mean: 0, std: 0 };
  const mean = vals.reduce((a, b) => a + b, 0) / n;
  const varc = vals.reduce((a, b) => a + (b - mean) ** 2, 0) / n; // populasi
  return { mean, std: Math.sqrt(varc) };
}

/** Anomali: (a) total bulanan kategori > mean+z·std; (b) transaksi tunggal > mean(kat)+z·std(kat). */
export function detectAnomalies(txns: Transaction[], z = 2): Anomaly[] {
  const byMonth = monthCategoryTotals(txns);
  const months = [...byMonth.keys()].sort();
  const out: Anomaly[] = [];

  // (a) anomali total bulanan per kategori (butuh ≥3 titik)
  const catSeries = new Map<string, { month: string; total: number }[]>();
  for (const m of months) byMonth.get(m)!.forEach((total, cat) => {
    if (!catSeries.has(cat)) catSeries.set(cat, []);
    catSeries.get(cat)!.push({ month: m, total });
  });
  for (const [cat, series] of catSeries) {
    if (series.length < 3) continue;
    const { mean, std } = meanStd(series.map((s) => s.total));
    if (std <= 0) continue;
    const latest = series[series.length - 1];
    const zz = (latest.total - mean) / std;
    if (zz >= z) out.push({ kind: 'kategori', category: cat, amount: latest.total, month: latest.month, z: zz });
  }

  // (b) transaksi tunggal jauh di atas kebiasaan kategorinya
  const catTxns = new Map<string, Transaction[]>();
  for (const t of txns) {
    if (!isRealExpense(t)) continue;
    const c = t.category || 'Lainnya';
    if (!catTxns.has(c)) catTxns.set(c, []);
    catTxns.get(c)!.push(t);
  }
  for (const [cat, list] of catTxns) {
    if (list.length < 4) continue;
    const { mean, std } = meanStd(list.map(expenseAmt));
    if (std <= 0) continue;
    for (const t of list) {
      const zz = (expenseAmt(t) - mean) / std;
      if (zz >= z + 0.5) out.push({ kind: 'transaksi', category: cat, amount: expenseAmt(t), month: parseTxnMonth(t.date), txnId: t.id, z: zz });
    }
  }
  return out.sort((a, b) => b.z - a.z);
}

export interface BudgetPace {
  category: string; budget: number; spentToDate: number; projectedEnd: number; willExceed: boolean; daysLeft: number; overBy: number;
}

/** Proyeksi pace anggaran bulan berjalan (spent-to-date ÷ hari-berlalu × hari-sebulan). */
export function budgetPace(
  txns: Transaction[],
  monthlyBudgets: Record<string, Record<string, number>>,
  budgetCategories: BudgetCategory[],
  now: Date = new Date(),
): BudgetPace[] {
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const dayOfMonth = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysLeft = daysInMonth - dayOfMonth;

  const spent = new Map<string, number>();
  for (const t of txns) {
    if (!isRealExpense(t) || parseTxnMonth(t.date) !== monthKey) continue;
    const c = t.category || 'Lainnya';
    spent.set(c, (spent.get(c) || 0) + expenseAmt(t));
  }

  const out: BudgetPace[] = [];
  for (const [category, spentToDate] of spent) {
    const override = monthlyBudgets[monthKey]?.[category];
    const base = budgetCategories.find((c) => c.name === category)?.allocated || 0;
    const budget = override != null ? override : base;
    if (budget <= 0) continue;
    const projectedEnd = dayOfMonth > 0 ? (spentToDate / dayOfMonth) * daysInMonth : spentToDate;
    const willExceed = projectedEnd > budget;
    out.push({ category, budget, spentToDate, projectedEnd, willExceed, daysLeft, overBy: projectedEnd - budget });
  }
  return out.sort((a, b) => b.overBy - a.overBy);
}

export type Sev = 'positif' | 'info' | 'peringatan';
export interface Insight { id: string; severity: Sev; icon: string; title: string; detail: string; amount?: number; category?: string }

/** Gabung tren + anomali + pace → daftar insight berperingkat (top `maxN`). */
export function buildInsights(
  trends: CategoryTrend[], anomalies: Anomaly[], pace: BudgetPace[],
  opts: { maxN?: number; trendPct?: number } = {},
): Insight[] {
  const { maxN = 5, trendPct = 25 } = opts;
  const list: (Insight & { rank: number })[] = [];

  // Pace over-budget (paling actionable)
  pace.filter((p) => p.willExceed).slice(0, 2).forEach((p, i) =>
    list.push({
      id: `pace-${p.category}`, severity: 'peringatan', icon: 'speed', category: p.category, amount: p.overBy,
      title: `Anggaran "${p.category}" diproyeksikan jebol`,
      detail: `Dengan laju sekarang, akhir bulan ~Rp ${Math.round(p.projectedEnd).toLocaleString('id-ID')} vs anggaran Rp ${Math.round(p.budget).toLocaleString('id-ID')} (sisa ${p.daysLeft} hari).`,
      rank: 100 - i,
    }));

  // Anomali
  anomalies.slice(0, 2).forEach((a, i) =>
    list.push({
      id: `anom-${a.kind}-${a.category}-${a.month}`, severity: 'peringatan', icon: 'warning', category: a.category, amount: a.amount,
      title: a.kind === 'kategori' ? `Lonjakan tak biasa: ${a.category}` : `Transaksi tak biasa: ${a.category}`,
      detail: `Rp ${Math.round(a.amount).toLocaleString('id-ID')} — jauh di atas kebiasaan (${a.z.toFixed(1)}σ).`,
      rank: 90 - i,
    }));

  // Top movers naik
  trends.filter((t) => t.deltaPct >= trendPct && t.deltaAbs > 0).slice(0, 2).forEach((t, i) =>
    list.push({
      id: `up-${t.category}`, severity: 'info', icon: 'trending_up', category: t.category, amount: t.deltaAbs,
      title: `${t.category} naik ${Math.round(t.deltaPct)}%`,
      detail: `Rp ${Math.round(t.thisMonth).toLocaleString('id-ID')} vs rata-rata Rp ${Math.round(t.avgPrior).toLocaleString('id-ID')} (+Rp ${Math.round(t.deltaAbs).toLocaleString('id-ID')}).`,
      rank: 70 - i,
    }));

  // Kemenangan (turun) — nada positif
  trends.filter((t) => t.deltaPct <= -trendPct && t.avgPrior > 0).slice(0, 1).forEach((t) =>
    list.push({
      id: `down-${t.category}`, severity: 'positif', icon: 'trending_down', category: t.category, amount: Math.abs(t.deltaAbs),
      title: `${t.category} turun ${Math.round(Math.abs(t.deltaPct))}% — mantap!`,
      detail: `Hemat ~Rp ${Math.round(Math.abs(t.deltaAbs)).toLocaleString('id-ID')} dibanding rata-rata.`,
      rank: 50,
    }));

  return list.sort((a, b) => b.rank - a.rank).slice(0, maxN).map(({ rank, ...rest }) => rest);
}
