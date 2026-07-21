/**
 * Utilitas amortisasi & konversi bunga (murni) — F1.4.
 * Edukasi jebakan bunga flat: bunga flat 1%/bln ≈ efektif ±1,8× lipatnya.
 */

export interface AmortRow {
  period: number;
  payment: number;
  principal: number;
  interest: number;
  balance: number;
}

export interface AmortResult {
  rows: AmortRow[];
  monthlyPayment: number; // angsuran pertama (flat = konstan; efektif = tetap juga)
  totalInterest: number;
  totalPaid: number;
}

const monthlyRate = (annualPct: number) => annualPct / 12 / 100;

/** Angsuran anuitas (bunga efektif) per bulan untuk pokok P, bunga efektif tahunan %, n bulan. */
export function annuityPayment(principal: number, annualEffectivePct: number, months: number): number {
  const r = monthlyRate(annualEffectivePct);
  if (months <= 0) return 0;
  if (r === 0) return principal / months;
  return (principal * r) / (1 - Math.pow(1 + r, -months));
}

/** Angsuran flat per bulan = bunga flat konstan + pokok rata. */
export function flatPayment(principal: number, annualFlatPct: number, months: number): number {
  if (months <= 0) return 0;
  return principal * monthlyRate(annualFlatPct) + principal / months;
}

/** Jadwal amortisasi bunga EFEKTIF (anuitas). Baris terakhir melunasi sisa persis (saldo=0). */
export function amortizationScheduleEffective(principal: number, annualEffectivePct: number, months: number): AmortResult {
  const r = monthlyRate(annualEffectivePct);
  const M = annuityPayment(principal, annualEffectivePct, months);
  const rows: AmortRow[] = [];
  let balance = principal;
  let totalInterest = 0;
  let totalPaid = 0;
  for (let t = 1; t <= months; t++) {
    const interest = balance * r;
    let principalPaid = M - interest;
    if (t === months) principalPaid = balance; // lunasi sisa persis
    const payment = interest + principalPaid;
    balance -= principalPaid;
    if (Math.abs(balance) < 0.005) balance = 0;
    totalInterest += interest;
    totalPaid += payment;
    rows.push({ period: t, payment, principal: principalPaid, interest, balance: Math.max(0, balance) });
  }
  return { rows, monthlyPayment: M, totalInterest, totalPaid };
}

/** Jadwal amortisasi bunga FLAT. Bunga konstan tiap bulan; pokok rata. */
export function amortizationScheduleFlat(principal: number, annualFlatPct: number, months: number): AmortResult {
  const interestConst = principal * monthlyRate(annualFlatPct);
  const principalPart = principal / months;
  const rows: AmortRow[] = [];
  let balance = principal;
  let totalInterest = 0;
  let totalPaid = 0;
  for (let t = 1; t <= months; t++) {
    let principalPaid = principalPart;
    if (t === months) principalPaid = balance;
    const payment = interestConst + principalPaid;
    balance -= principalPaid;
    if (Math.abs(balance) < 0.005) balance = 0;
    totalInterest += interestConst;
    totalPaid += payment;
    rows.push({ period: t, payment, principal: principalPaid, interest: interestConst, balance: Math.max(0, balance) });
  }
  return { rows, monthlyPayment: interestConst + principalPart, totalInterest, totalPaid };
}

/**
 * Konversi bunga FLAT tahunan → EFEKTIF tahunan (equivalent annuity).
 * Cari rate efektif yang menghasilkan angsuran = angsuran flat. Bisection (monoton).
 */
export function flatToEffective(annualFlatPct: number, months: number): number {
  if (months <= 0 || annualFlatPct <= 0) return annualFlatPct;
  const P = 1_000_000; // scale-invariant
  const targetM = flatPayment(P, annualFlatPct, months);
  let lo = 0;
  let hi = 1200; // batas atas rate tahunan % (100%/bulan)
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    const m = annuityPayment(P, mid, months);
    if (m > targetM) hi = mid; else lo = mid;
  }
  return (lo + hi) / 2;
}

/**
 * Konversi bunga EFEKTIF tahunan → FLAT tahunan.
 * Angsuran flat linear terhadap rate flat → bentuk tertutup (tanpa iterasi).
 */
export function effectiveToFlat(annualEffectivePct: number, months: number): number {
  if (months <= 0 || annualEffectivePct <= 0) return annualEffectivePct;
  const P = 1_000_000;
  const targetM = annuityPayment(P, annualEffectivePct, months);
  const f = ((targetM - P / months) * 1200) / P;
  return Math.max(0, f);
}

/** Aproksimasi cepat flat→efektif (untuk label "≈"): r_eff ≈ r_flat × 2n/(n+1). */
export function approxFlatToEffective(annualFlatPct: number, months: number): number {
  if (months <= 0) return annualFlatPct;
  return (annualFlatPct * 2 * months) / (months + 1);
}
