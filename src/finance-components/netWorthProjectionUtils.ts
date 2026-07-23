import type { Account, Asset, Debt } from '../store/useFinanceStore';
import { accountValueIDR, assetValueIDR } from './currencyUtils';

/**
 * F5.1 — Proyeksi Kekayaan Bersih. Murni & dapat diuji; sumber acak/waktu di-inject (rng), agar tak
 * bergantung Math.random global di util. Proyeksi bulanan (kontribusi bulanan × return tahunan), sampel per tahun.
 */

/** Net worth kini (IDR) = Σ akun + Σ aset − Σ utang. Konsisten dengan FinanceDashboard. */
export function currentNetWorth(accounts: Account[], assets: Asset[], debts: Debt[], rate: number, usdTickers: string[]): number {
  const acc = accounts.reduce((s, a) => s + accountValueIDR(a, rate), 0);
  const ast = assets.reduce((s, a) => s + assetValueIDR(a, rate, usdTickers), 0);
  const deb = debts.reduce((s, d) => s + (d.balance || 0), 0);
  return acc + ast - deb;
}

export interface ProjPoint { year: number; value: number }

/** Proyeksi deterministik: value_{m} = value_{m-1}·(1+rBulan) + kontribusiBulanan. Sampel tiap 12 bulan. */
export function projectDeterministic(opts: { start: number; monthlyContribution: number; annualReturn: number; years: number }): ProjPoint[] {
  const { start, monthlyContribution, annualReturn, years } = opts;
  const mr = Math.pow(1 + annualReturn, 1 / 12) - 1;
  let v = start;
  const out: ProjPoint[] = [{ year: 0, value: start }];
  for (let m = 1; m <= years * 12; m++) {
    v = v * (1 + mr) + monthlyContribution;
    if (m % 12 === 0) out.push({ year: m / 12, value: v });
  }
  return out;
}

export interface BandPoint { year: number; konservatif: number; basis: number; optimis: number }

/** Tiga skenario return → satu deret per tahun (untuk area band). */
export function projectBands(opts: { start: number; monthlyContribution: number; years: number; returns: { konservatif: number; basis: number; optimis: number } }): BandPoint[] {
  const { start, monthlyContribution, years, returns } = opts;
  const k = projectDeterministic({ start, monthlyContribution, annualReturn: returns.konservatif, years });
  const b = projectDeterministic({ start, monthlyContribution, annualReturn: returns.basis, years });
  const o = projectDeterministic({ start, monthlyContribution, annualReturn: returns.optimis, years });
  return k.map((p, i) => ({ year: p.year, konservatif: p.value, basis: b[i].value, optimis: o[i].value }));
}

/** Box-Muller: satu sampel normal standar dari dua uniform (0,1). */
function gaussian(rng: () => number): number {
  let u = 0, v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export interface MonteCarloResult { p10: number; p50: number; p90: number; runs: number }

/** Monte Carlo: return bulanan ~ Normal(mean, stdev). Kembalikan persentil nilai akhir. rng bisa di-seed untuk uji. */
export function monteCarloFinal(opts: {
  start: number; monthlyContribution: number; meanReturn: number; stdev: number; years: number; runs?: number; rng?: () => number;
}): MonteCarloResult {
  const { start, monthlyContribution, meanReturn, stdev, years, runs = 500, rng = Math.random } = opts;
  const meanM = Math.pow(1 + meanReturn, 1 / 12) - 1;
  const stdM = stdev / Math.sqrt(12);
  const finals: number[] = [];
  for (let r = 0; r < runs; r++) {
    let v = start;
    for (let m = 0; m < years * 12; m++) {
      const ret = meanM + stdM * gaussian(rng);
      v = v * (1 + ret) + monthlyContribution;
    }
    finals.push(v);
  }
  finals.sort((a, b) => a - b);
  const pct = (p: number) => finals[Math.min(finals.length - 1, Math.max(0, Math.floor(p * finals.length)))];
  return { p10: pct(0.1), p50: pct(0.5), p90: pct(0.9), runs };
}

/** Tahun (pecahan) saat proyeksi basis melewati sebuah target (mis. FI number). null bila tak tercapai. */
export function crossingYear(points: ProjPoint[], target: number): number | null {
  for (let i = 1; i < points.length; i++) {
    if (points[i].value >= target) {
      const a = points[i - 1], b = points[i];
      if (b.value === a.value) return b.year;
      const frac = (target - a.value) / (b.value - a.value);
      return a.year + frac * (b.year - a.year);
    }
  }
  return null;
}
