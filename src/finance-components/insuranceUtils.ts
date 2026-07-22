import type { Insurance } from '../store/useFinanceStore';

/** F2.3 Proteksi/Asuransi — helper murni. */

export const INS_ICON: Record<string, string> = {
  Jiwa: 'health_and_safety',
  Kesehatan: 'medical_services',
  Kendaraan: 'directions_car',
  Properti: 'home',
  Lainnya: 'shield',
};

/** Masking nomor polis (data sensitif): tampilkan 4 digit terakhir. */
export const maskPolicy = (p?: string): string => {
  if (!p) return '—';
  const s = String(p).trim();
  return s.length <= 4 ? s : `•••${s.slice(-4)}`;
};

export const premiumPerMonth = (ins: Insurance): number =>
  ins.premiumFrequency === 'Tahunan' ? (ins.premium || 0) / 12 : (ins.premium || 0);

export const premiumPerYear = (ins: Insurance): number =>
  ins.premiumFrequency === 'Tahunan' ? (ins.premium || 0) : (ins.premium || 0) * 12;

/** Hari menuju renewal (negatif bila sudah lewat). null bila tak ada tanggal valid. */
export function daysToRenewal(renewalDate?: string): number | null {
  if (!renewalDate) return null;
  const d = new Date(renewalDate);
  if (isNaN(d.getTime())) return null;
  d.setHours(0, 0, 0, 0);
  const now = new Date(); now.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - now.getTime()) / 86400000);
}

/** Metode 1 — income replacement: UP ≈ penghasilan tahunan × multiple (rentang 8–12×). */
export function upIncomeReplacement(annualIncome: number, multiple = 10): number {
  return Math.max(0, annualIncome * multiple);
}

/** Metode 2 — expense + utang: UP ≈ pengeluaran tahunan × tahunProteksi + Σutang − aset likuid. */
export function upExpenseMethod(annualExpense: number, yearsProtection: number, totalDebt: number, liquidAssets: number): number {
  return Math.max(0, annualExpense * yearsProtection + totalDebt - liquidAssets);
}

export interface InsuranceSummary {
  totalPremiumMonthly: number;
  totalPremiumYearly: number;
  totalLifeCoverage: number; // Σ UP polis jiwa aktif
  premiumRatio: number | null; // premi tahunan / penghasilan tahunan
}

export function insuranceSummary(policies: Insurance[], annualIncome: number): InsuranceSummary {
  const active = policies.filter((p) => (p.status || 'Aktif').toLowerCase() === 'aktif');
  const totalPremiumMonthly = active.reduce((s, p) => s + premiumPerMonth(p), 0);
  const totalPremiumYearly = active.reduce((s, p) => s + premiumPerYear(p), 0);
  const totalLifeCoverage = active.filter((p) => p.insType === 'Jiwa').reduce((s, p) => s + (p.coverageAmount || 0), 0);
  const premiumRatio = annualIncome > 0 ? totalPremiumYearly / annualIncome : null;
  return { totalPremiumMonthly, totalPremiumYearly, totalLifeCoverage, premiumRatio };
}
