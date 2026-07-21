import type { Asset, Transaction } from '../store/useFinanceStore';
import { MONTHS_ID_SHORT, startOfToday, parseDateSafe } from './calendarUtils';

/**
 * F3.5 Kalender Pendapatan Pasif — proyeksi kupon fixed income 12 bulan ke depan
 * + estimasi historis dividen saham.
 *
 * kupon_bersih_per_periode = principal × (rate/periodePerTahun) × (1 − tax)
 * periodePerTahun: Monthly=12, Quarterly=4, Semi-Annual=2, Annual=1, At Maturity=(sekali di maturity)
 */

export interface PassiveEvent {
  title: string;
  amount: number; // bersih
  day: number;    // tanggal pembayaran
  kind: 'coupon' | 'maturity';
}

export interface PassiveMonth {
  key: string;    // yyyy-mm
  label: string;  // "Ags 26"
  monthIndex: number;
  year: number;
  total: number;
  events: PassiveEvent[];
}

export interface PassiveIncomeResult {
  months: PassiveMonth[];      // 12 bulan ke depan
  avgMonthly: number;          // total 12 bln / 12
  total12m: number;
  dividendEstimateMonthly: number; // estimasi historis (rata2 12 bln terakhir)
  hasData: boolean;
}

function periodsPerYear(period?: string): { perYear: number; atMaturity: boolean } {
  const p = (period || '').toLowerCase();
  if (p.includes('maturity') || p.includes('jatuh tempo') || p.includes('sekaligus')) return { perYear: 1, atMaturity: true };
  if (p.includes('month') || p.includes('bulan')) return { perYear: 12, atMaturity: false };
  if (p.includes('quart') || p.includes('triwulan')) return { perYear: 4, atMaturity: false };
  if (p.includes('semi') || p.includes('semester')) return { perYear: 2, atMaturity: false };
  if (p.includes('annual') || p.includes('tahun') || p.includes('year')) return { perYear: 1, atMaturity: false };
  return { perYear: 12, atMaturity: false }; // default: bulanan (pola ORI/SR/ST)
}

const isFixedIncome = (a: Asset): boolean => {
  const st = (a.subType || '').toLowerCase();
  if (a.category !== 'investasi') return false;
  if (st === 'saham' || st === 'reksadana' || st === 'kripto') return false;
  return typeof a.interestRate === 'number' && a.interestRate > 0;
};

export function computePassiveIncome(assets: Asset[], transactions: Transaction[]): PassiveIncomeResult {
  const today = startOfToday();
  // 12 bulan ke depan (mulai bulan berjalan)
  const months: PassiveMonth[] = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
    months.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: `${MONTHS_ID_SHORT[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`,
      monthIndex: d.getMonth(), year: d.getFullYear(), total: 0, events: [],
    });
  }
  const monthIdx = (year: number, month0: number) =>
    (year - today.getFullYear()) * 12 + (month0 - today.getMonth());

  for (const a of assets) {
    if (!isFixedIncome(a)) continue;
    const maturity = parseDateSafe(a.maturityDate);
    if (!maturity || maturity <= today) continue; // hanya yang masih aktif

    const principal = a.purchasePrice || a.currentValue || 0;
    if (principal <= 0) continue;
    const { perYear, atMaturity } = periodsPerYear(a.interestPaymentPeriod);
    const tax = a.tax !== undefined ? a.tax : 0.1;
    const day = a.paymentDate && a.paymentDate >= 1 && a.paymentDate <= 31 ? a.paymentDate : 15;

    if (atMaturity) {
      // satu kali di bulan maturity (bila dalam horizon)
      const mi = monthIdx(maturity.getFullYear(), maturity.getMonth());
      if (mi >= 0 && mi < 12) {
        const yearsHeld = Math.max(0, (maturity.getTime() - today.getTime()) / (365 * 86400000));
        const net = principal * (a.interestRate! / 100) * (1 - tax) * Math.max(1, yearsHeld);
        months[mi].events.push({ title: a.title, amount: net, day: maturity.getDate(), kind: 'maturity' });
        months[mi].total += net;
      }
      continue;
    }

    const step = Math.max(1, Math.round(12 / perYear));
    const couponNet = principal * (a.interestRate! / 100) / perYear * (1 - tax);
    if (couponNet <= 0) continue;
    // Fase = bulan berjalan; kupon tiap `step` bulan sampai maturity.
    for (let m = 0; m < 12; m += step) {
      const occ = new Date(today.getFullYear(), today.getMonth() + m, day);
      if (occ > maturity) break;
      months[m].events.push({ title: a.title, amount: couponNet, day, kind: 'coupon' });
      months[m].total += couponNet;
    }
  }

  const total12m = months.reduce((s, m) => s + m.total, 0);

  // Estimasi historis dividen saham: transaksi "Dividen" 12 bln terakhir
  const oneYearAgo = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());
  let dividend12m = 0;
  for (const t of transactions) {
    if (t.type !== 'PEMASUKAN') continue;
    if (!/dividen/i.test(t.desc || '')) continue;
    const dt = parseDateSafe(t.date);
    if (dt && dt >= oneYearAgo && dt <= today) dividend12m += Math.abs(t.amount || 0);
  }

  return {
    months,
    avgMonthly: total12m / 12,
    total12m,
    dividendEstimateMonthly: dividend12m / 12,
    hasData: total12m > 0 || dividend12m > 0,
  };
}
