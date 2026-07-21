/**
 * F3.1 XIRR (Extended Internal Rate of Return) — return money-weighted tahunan.
 * Murni & tanpa dependency. Semua tanggal Date; amount bertanda (beli negatif, terima positif).
 */

export interface CashFlow {
  date: Date;
  amount: number;
}

const daysBetween = (a: Date, b: Date) => (b.getTime() - a.getTime()) / 86400000;

/** Net present value majemuk-harian pada `rate` (tahunan, desimal). */
export function xnpv(rate: number, cfs: CashFlow[]): number {
  if (rate <= -1) rate = -0.999999;
  const t0 = cfs[0].date;
  return cfs.reduce((s, cf) => s + cf.amount / Math.pow(1 + rate, daysBetween(t0, cf.date) / 365), 0);
}

/**
 * XIRR sebagai desimal tahunan (0.10 = 10%). Mengembalikan `null` bila tak terdefinisi:
 * - < 2 arus kas, atau tak ada campuran positif & negatif, atau rentang < 30 hari, atau divergen.
 */
export function xirr(cashflows: CashFlow[]): number | null {
  if (!cashflows || cashflows.length < 2) return null;
  const hasNeg = cashflows.some((c) => c.amount < 0);
  const hasPos = cashflows.some((c) => c.amount > 0);
  if (!hasNeg || !hasPos) return null;

  const cfs = [...cashflows].sort((a, b) => a.date.getTime() - b.date.getTime());
  const span = daysBetween(cfs[0].date, cfs[cfs.length - 1].date);
  if (span < 30) return null; // terlalu pendek → return sederhana saja (ditangani pemanggil)

  // Newton-Raphson dari r0 = 0.1
  let rate = 0.1;
  const t0 = cfs[0].date;
  for (let i = 0; i < 50; i++) {
    const f = xnpv(rate, cfs);
    const df = cfs.reduce((s, cf) => {
      const yr = daysBetween(t0, cf.date) / 365;
      return s - (yr * cf.amount) / Math.pow(1 + rate, yr + 1);
    }, 0);
    if (Math.abs(df) < 1e-12) break;
    let next = rate - f / df;
    if (!isFinite(next)) break;
    if (next <= -0.9999) next = -0.9999;
    if (Math.abs(next - rate) < 1e-7) return next;
    rate = next;
  }

  // Fallback bisection r ∈ (−0.99, 10)
  let lo = -0.99, hi = 10;
  let flo = xnpv(lo, cfs);
  let fhi = xnpv(hi, cfs);
  if (flo * fhi > 0) return null; // tak ada perubahan tanda → divergen
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    const fm = xnpv(mid, cfs);
    if (Math.abs(fm) < 1e-7 || (hi - lo) / 2 < 1e-8) return mid;
    if (flo * fm < 0) { hi = mid; fhi = fm; } else { lo = mid; flo = fm; }
  }
  return (lo + hi) / 2;
}

/** Return sederhana (money-in vs money-out), fallback saat XIRR N/A. */
export function simpleReturn(totalIn: number, totalOut: number): number | null {
  if (totalIn <= 0) return null;
  return (totalOut - totalIn) / totalIn;
}
