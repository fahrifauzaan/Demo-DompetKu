/**
 * F6.1 — Estimator PPh 21 Orang Pribadi (karyawan). Murni & dapat diuji.
 * ⚠️ Tarif/PTKP berlaku UU HPP (2022) & PTKP PMK-101/2016 — relevan tahun pajak 2024–2026.
 * Simpan sebagai konstanta ber-tahun; verifikasi selalu ke DJP. Estimasi, bukan perhitungan resmi.
 */

export const TAX_YEAR = 2026;

/** PTKP (Penghasilan Tidak Kena Pajak) per tahun. */
export const PTKP = { base: 54_000_000, married: 4_500_000, perDependent: 4_500_000 };

/** Biaya jabatan: 5% penghasilan bruto, maksimum Rp6.000.000/tahun. */
export const BIAYA_JABATAN = { rate: 0.05, maxYear: 6_000_000 };

/** Lapisan tarif progresif (UU HPP 2022). upTo = batas atas lapisan. */
export const TAX_BRACKETS: { upTo: number; rate: number }[] = [
  { upTo: 60_000_000, rate: 0.05 },
  { upTo: 250_000_000, rate: 0.15 },
  { upTo: 500_000_000, rate: 0.25 },
  { upTo: 5_000_000_000, rate: 0.30 },
  { upTo: Infinity, rate: 0.35 },
];

/** PTKP dari status kawin & jumlah tanggungan (maks 3). */
export function ptkp(married: boolean, dependents: number): number {
  const dep = Math.max(0, Math.min(3, Math.floor(dependents)));
  return PTKP.base + (married ? PTKP.married : 0) + dep * PTKP.perDependent;
}

export function biayaJabatan(grossAnnual: number): number {
  return Math.min(Math.max(0, grossAnnual) * BIAYA_JABATAN.rate, BIAYA_JABATAN.maxYear);
}

export interface Pph21Input {
  grossAnnual: number;         // penghasilan bruto setahun
  married: boolean;
  dependents: number;
  pensionContribution?: number; // iuran pensiun/JHT bagian karyawan setahun
  zakat?: number;               // zakat/sumbangan wajib via lembaga resmi (pengurang)
  otherDeductions?: number;
  monthlyWithheld?: number;     // PPh 21 dipotong/bulan (untuk rekonsiliasi)
}

export interface BracketRow { range: string; rate: number; taxable: number; tax: number }
export interface Pph21Result {
  gross: number; biayaJabatan: number; pension: number; zakat: number; otherDeductions: number;
  netIncome: number; ptkp: number; pkp: number; tax: number; effectiveRate: number;
  brackets: BracketRow[];
  annualWithheld: number; balance: number; // balance>0 = kurang bayar, <0 = lebih bayar
}

const jt = (n: number) => (n === Infinity ? '∞' : `${Math.round(n / 1e6)}jt`);

/** Hitung estimasi PPh 21 tahunan + rekonsiliasi terhadap potongan bulanan. */
export function computePph21(input: Pph21Input): Pph21Result {
  const gross = Math.max(0, input.grossAnnual || 0);
  const bj = biayaJabatan(gross);
  const pension = Math.max(0, input.pensionContribution || 0);
  const zakat = Math.max(0, input.zakat || 0);
  const other = Math.max(0, input.otherDeductions || 0);

  const netIncome = Math.max(0, gross - bj - pension); // Penghasilan Neto
  const afterDeduct = Math.max(0, netIncome - zakat - other);
  const p = ptkp(input.married, input.dependents);
  let pkp = Math.max(0, afterDeduct - p);
  pkp = Math.floor(pkp / 1000) * 1000; // PKP dibulatkan ke bawah ribuan penuh

  let remaining = pkp, prev = 0, tax = 0;
  const brackets: BracketRow[] = [];
  for (const b of TAX_BRACKETS) {
    if (remaining <= 0) break;
    const bandWidth = b.upTo - prev;
    const taxable = Math.min(remaining, bandWidth);
    const t = taxable * b.rate;
    brackets.push({ range: `${jt(prev)}–${jt(b.upTo)}`, rate: b.rate, taxable, tax: t });
    tax += t; remaining -= taxable; prev = b.upTo;
  }

  const annualWithheld = Math.max(0, (input.monthlyWithheld || 0) * 12);
  return {
    gross, biayaJabatan: bj, pension, zakat, otherDeductions: other,
    netIncome, ptkp: p, pkp, tax, effectiveRate: gross > 0 ? tax / gross : 0,
    brackets, annualWithheld, balance: tax - annualWithheld,
  };
}
