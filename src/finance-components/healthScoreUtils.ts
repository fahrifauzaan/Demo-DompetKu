/**
 * F3.4 Skor Kesehatan Finansial Komposit (0–100). Metodologi transparan:
 * skor per metrik = interpolasi linear (clamp 0–100), digabung dengan bobot.
 * Metrik N/A (mis. tanpa pemasukan) dikeluarkan & bobot didistribusi ulang proporsional.
 */

export interface HealthInputs {
  liquidCash: number;
  avgMonthlyExpense: number;
  avgMonthlyIncome: number;
  totalMinPayment: number;
  netWorth: number;
  totalAssets: number;
  diversificationScore0to10: number | null; // null bila tak ada investasi
}

export interface HealthMetric {
  key: string;
  label: string;
  valueText: string; // nilai mentah untuk ditampilkan
  score: number;     // 0–100
  weight: number;
  na: boolean;
  hint: string;      // saran bila skor rendah
}

export type HealthBand = 'Rentan' | 'Cukup' | 'Sehat' | 'Prima';

export interface HealthResult {
  score: number; // 0–100 (bulat)
  band: HealthBand;
  metrics: HealthMetric[];
  mostImpactful: HealthMetric | null;
}

const clamp = (v: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));
/** Interpolasi linear: nilai x0→0 poin, x100→100 poin. */
const lerp = (x: number, x0: number, x100: number) => clamp(((x - x0) / (x100 - x0)) * 100);

export function bandForScore(score: number): HealthBand {
  if (score < 40) return 'Rentan';
  if (score < 70) return 'Cukup';
  if (score < 85) return 'Sehat';
  return 'Prima';
}

export function computeHealthScore(inp: HealthInputs): HealthResult {
  const hasIncome = inp.avgMonthlyIncome > 0;
  const hasExpense = inp.avgMonthlyExpense > 0;
  const hasAssets = inp.totalAssets > 0;

  const metrics: HealthMetric[] = [];

  // 1. Dana darurat (bulan) — 0 bln→0, ≥6→100 · bobot 25
  {
    const na = !hasExpense;
    const months = na ? 0 : inp.liquidCash / inp.avgMonthlyExpense;
    metrics.push({ key: 'emergency', label: 'Dana Darurat', weight: 25, na,
      valueText: na ? 'N/A' : `${months.toFixed(1)} bln`, score: na ? 0 : lerp(months, 0, 6),
      hint: 'Tambah kas hingga menutup ≥ 6 bulan pengeluaran.' });
  }
  // 2. Savings rate — ≤0%→0, ≥20%→100 · bobot 20
  {
    const na = !hasIncome;
    const rate = na ? 0 : (inp.avgMonthlyIncome - inp.avgMonthlyExpense) / inp.avgMonthlyIncome;
    metrics.push({ key: 'savings', label: 'Tingkat Tabungan', weight: 20, na,
      valueText: na ? 'N/A' : `${(rate * 100).toFixed(0)}%`, score: na ? 0 : lerp(rate, 0, 0.2),
      hint: 'Sisihkan minimal 20% pemasukan tiap bulan.' });
  }
  // 3. DTI — ≥50%→0, ≤20%→100 · bobot 20
  {
    const na = !hasIncome;
    const dti = na ? 0 : inp.totalMinPayment / inp.avgMonthlyIncome;
    metrics.push({ key: 'dti', label: 'Rasio Cicilan (DTI)', weight: 20, na,
      valueText: na ? 'N/A' : `${(dti * 100).toFixed(0)}%`, score: na ? 0 : clamp(((0.5 - dti) / (0.5 - 0.2)) * 100),
      hint: 'Jaga total cicilan di bawah 20–35% pemasukan.' });
  }
  // 4. Solvabilitas — netWorth/totalAsset ≤0→0, ≥60%→100 · bobot 15
  {
    const na = !hasAssets;
    const ratio = na ? 0 : inp.netWorth / inp.totalAssets;
    metrics.push({ key: 'solvency', label: 'Solvabilitas', weight: 15, na,
      valueText: na ? 'N/A' : `${(ratio * 100).toFixed(0)}%`, score: na ? 0 : lerp(ratio, 0, 0.6),
      hint: 'Kurangi utang agar ekuitas > 60% total aset.' });
  }
  // 5. Diversifikasi — skor HHI 0–10 ×10 · bobot 10
  {
    const na = inp.diversificationScore0to10 === null;
    const s10 = inp.diversificationScore0to10 || 0;
    metrics.push({ key: 'diversification', label: 'Diversifikasi', weight: 10, na,
      valueText: na ? 'N/A' : `${s10.toFixed(1)}/10`, score: na ? 0 : clamp(s10 * 10),
      hint: 'Sebar investasi ke lebih banyak kelas aset.' });
  }
  // 6. Likuiditas struktur — aset likuid/total 0→0, ≥15%→100 · bobot 10
  {
    const na = !hasAssets;
    const ratio = na ? 0 : inp.liquidCash / inp.totalAssets;
    metrics.push({ key: 'liquidity', label: 'Struktur Likuiditas', weight: 10, na,
      valueText: na ? 'N/A' : `${(ratio * 100).toFixed(0)}%`, score: na ? 0 : lerp(ratio, 0, 0.15),
      hint: 'Simpan ≥ 15% aset dalam bentuk likuid.' });
  }

  const active = metrics.filter((m) => !m.na);
  const totalWeight = active.reduce((s, m) => s + m.weight, 0);
  const score = totalWeight > 0 ? Math.round(active.reduce((s, m) => s + m.score * m.weight, 0) / totalWeight) : 0;

  // Langkah paling berdampak: (100−skor)×bobot terbesar di antara metrik aktif
  let mostImpactful: HealthMetric | null = null;
  let best = -1;
  for (const m of active) {
    const impact = (100 - m.score) * m.weight;
    if (impact > best) { best = impact; mostImpactful = m; }
  }

  return { score, band: bandForScore(score), metrics, mostImpactful };
}
