import type { Transaction, Account, Setting } from '../store/useFinanceStore';
import { parseTxnMonth, classifyFlow, type FlowGroup } from './financeClassify';
import { getUsdIdrRate, accountIsUSD, accountValueIDR } from './currencyUtils';

/**
 * F4.1 — Arus Kas (Cash Flow Statement) + Burn Rate & Runway.
 * Murni & dapat diuji: fungsi yang bergantung waktu menerima `nowMonth` (bukan memanggil `new Date()` sendiri).
 */

export interface MonthCashflow {
  month: string;                                          // 'YYYY-MM'
  income: number; expense: number; net: number;           // P&L (mengecualikan alokasi investasi), IDR
  byGroup: Record<FlowGroup, { in: number; out: number }>;
}

const emptyGroups = (): MonthCashflow['byGroup'] => ({
  operasi: { in: 0, out: 0 }, investasi: { in: 0, out: 0 }, pendanaan: { in: 0, out: 0 },
});

/** Magnitudo nominal transaksi dalam IDR (konversi bila akun USD). */
function txnAmountIDR(t: Transaction, accounts: Account[], rate: number): number {
  const acc = accounts.find((a) => a.name === t.account);
  const abs = Math.abs(t.amount || 0);
  return acc && accountIsUSD(acc) ? abs * rate : abs;
}

/** Bangun rekap arus kas per bulan (urut menaik). TRANSFER dikecualikan; investasi tak masuk income/expense P&L. */
export function monthlyCashflow(txns: Transaction[], accounts: Account[], settings: Setting[]): MonthCashflow[] {
  const rate = getUsdIdrRate(settings);
  const map = new Map<string, MonthCashflow>();
  for (const t of txns) {
    if (t.type === 'TRANSFER') continue;
    const m = parseTxnMonth(t.date);
    if (!m) continue;
    let row = map.get(m);
    if (!row) { row = { month: m, income: 0, expense: 0, net: 0, byGroup: emptyGroups() }; map.set(m, row); }
    const g = classifyFlow(t, accounts);
    const amt = txnAmountIDR(t, accounts, rate);
    if (t.type === 'PEMASUKAN') row.byGroup[g].in += amt; else row.byGroup[g].out += amt;
    if (g !== 'investasi') {
      if (t.type === 'PEMASUKAN') row.income += amt; else row.expense += amt;
    }
  }
  const list = [...map.values()].sort((a, b) => (a.month < b.month ? -1 : 1));
  for (const r of list) r.net = r.income - r.expense;
  return list;
}

/** Kunci bulan sekarang 'YYYY-MM'. Hanya di sini `new Date()` dipakai; util lain menerima nowMonth. */
export function currentMonthKey(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** Bulan-bulan LENGKAP (sebelum bulan berjalan). */
export function completeMonths(list: MonthCashflow[], nowMonth: string): MonthCashflow[] {
  return list.filter((m) => m.month < nowMonth);
}

/** Biaya hidup bulan itu = pengeluaran kelompok operasi (bukan investasi/pendanaan). */
export function livingExpense(m: MonthCashflow): number {
  return m.byGroup.operasi.out;
}

/** Burn rate = rata-rata biaya hidup dari `window` bulan lengkap terakhir. */
export function burnRate(list: MonthCashflow[], nowMonth: string, window = 6): number {
  const last = completeMonths(list, nowMonth).slice(-window);
  if (!last.length) return 0;
  return last.reduce((s, m) => s + livingExpense(m), 0) / last.length;
}

/** Rata-rata arus kas bersih (surplus/defisit) dari `window` bulan lengkap terakhir. */
export function monthlyNet(list: MonthCashflow[], nowMonth: string, window = 6): number {
  const last = completeMonths(list, nowMonth).slice(-window);
  if (!last.length) return 0;
  return last.reduce((s, m) => s + m.net, 0) / last.length;
}

/** Saldo likuid (kas & setara kas) dalam IDR: akun bank/wallet/cash. */
export function liquidBalance(accounts: Account[], rate: number): number {
  return accounts
    .filter((a) => a.type === 'bank' || a.type === 'wallet' || a.type === 'cash')
    .reduce((s, a) => s + accountValueIDR(a, rate), 0);
}

/** Runway (bulan) = likuid ÷ burn. burn ≤ 0 → Infinity (kondisi surplus). */
export function runwayMonths(liquid: number, burn: number): number {
  if (burn <= 0) return Infinity;
  return liquid / burn;
}

/** Total 3-seksi (rata-rata `window` bulan lengkap) untuk tampilan ringkas. */
export function avgByGroup(list: MonthCashflow[], nowMonth: string, window = 6): Record<FlowGroup, { in: number; out: number }> {
  const last = completeMonths(list, nowMonth).slice(-window);
  const acc = emptyGroups();
  if (!last.length) return acc;
  for (const m of last) {
    (['operasi', 'investasi', 'pendanaan'] as FlowGroup[]).forEach((g) => {
      acc[g].in += m.byGroup[g].in / last.length;
      acc[g].out += m.byGroup[g].out / last.length;
    });
  }
  return acc;
}
