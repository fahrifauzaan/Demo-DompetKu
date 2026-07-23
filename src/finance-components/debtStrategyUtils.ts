import type { Debt } from '../store/useFinanceStore';

/**
 * Fase 7 — Utang Cerdas: strategi pelunasan Snowball vs Avalanche + tanggal bebas-utang + DTI. Murni & dapat diuji.
 * Metode "rollover": total pembayaran/bulan tetap (Σ minimum + ekstra); minimum yang bebas mengalir ke utang target.
 */

export type Strategy = 'snowball' | 'avalanche';

export interface PayoffResult {
  months: number;
  totalInterest: number;
  totalPaid: number;
  order: string[];        // urutan utang lunas
  feasible: boolean;      // false bila pembayaran tak menutup bunga (utang tak pernah lunas)
}

interface Sim { name: string; bal: number; mrate: number; min: number; clearedMonth: number }

/** Simulasi pelunasan bulan-per-bulan untuk satu strategi + ekstra bayar bulanan. */
export function simulatePayoff(debts: Debt[], extraMonthly: number, strategy: Strategy): PayoffResult {
  const list: Sim[] = debts
    .filter((d) => (d.balance || 0) > 0)
    .map((d) => ({ name: d.name || '(utang)', bal: d.balance, mrate: (d.interestRate || 0) / 100 / 12, min: Math.max(0, d.minPayment || 0), clearedMonth: 0 }));
  if (!list.length) return { months: 0, totalInterest: 0, totalPaid: 0, order: [], feasible: true };

  const budget = list.reduce((s, d) => s + d.min, 0) + Math.max(0, extraMonthly);
  const cmp = (a: Sim, b: Sim) => (strategy === 'snowball' ? a.bal - b.bal : b.mrate - a.mrate);

  let months = 0, totalInterest = 0, totalPaid = 0;
  const MAX = 1200; // 100 tahun — guard anti infinite loop
  while (list.some((d) => d.bal > 0.005) && months < MAX) {
    months++;
    // 1. Akrual bunga
    for (const d of list) if (d.bal > 0.005) { const it = d.bal * d.mrate; d.bal += it; totalInterest += it; }
    // 2. Bayar minimum tiap utang aktif
    let pool = budget;
    for (const d of list) {
      if (d.bal <= 0.005) continue;
      const pay = Math.min(d.min, d.bal, pool);
      d.bal -= pay; pool -= pay; totalPaid += pay;
    }
    // 3. Sisa pool → utang prioritas (cascade bila lunas & masih ada sisa)
    while (pool > 0.005) {
      const act = list.filter((d) => d.bal > 0.005).sort(cmp);
      if (!act.length) break;
      const t = act[0];
      const pay = Math.min(pool, t.bal);
      t.bal -= pay; pool -= pay; totalPaid += pay;
    }
    // 4. Catat utang yang baru lunas bulan ini
    for (const d of list) if (d.bal <= 0.005 && d.clearedMonth === 0) d.clearedMonth = months;
  }

  const feasible = list.every((d) => d.bal <= 0.005);
  const order = list.filter((d) => d.clearedMonth > 0).sort((a, b) => a.clearedMonth - b.clearedMonth).map((d) => d.name);
  return { months, totalInterest, totalPaid, order, feasible };
}

export interface StrategyComparison {
  snowball: PayoffResult;
  avalanche: PayoffResult;
  interestSaved: number;    // hemat bunga avalanche vs snowball
  monthsDiff: number;       // selisih bulan (snowball − avalanche)
}

/** Bandingkan kedua strategi pada ekstra bayar yang sama. */
export function compareStrategies(debts: Debt[], extraMonthly: number): StrategyComparison {
  const snowball = simulatePayoff(debts, extraMonthly, 'snowball');
  const avalanche = simulatePayoff(debts, extraMonthly, 'avalanche');
  return {
    snowball, avalanche,
    interestSaved: snowball.totalInterest - avalanche.totalInterest,
    monthsDiff: snowball.months - avalanche.months,
  };
}

/** Rasio Debt-to-Income = total cicilan minimum bulanan ÷ penghasilan bulanan. */
export function debtToIncome(debts: Debt[], monthlyIncome: number): number {
  const totalMin = debts.filter((d) => (d.balance || 0) > 0).reduce((s, d) => s + (d.minPayment || 0), 0);
  return monthlyIncome > 0 ? totalMin / monthlyIncome : 0;
}

/** Perkiraan tanggal bebas utang (ISO 'YYYY-MM') dari jumlah bulan sejak `from`. */
export function debtFreeMonth(months: number, from: Date): string {
  const d = new Date(from.getFullYear(), from.getMonth() + months, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
