import type { Recurring, Account } from '../store/useFinanceStore';
import { nextOccurrence, parseDateSafe, startOfToday } from './calendarUtils';

/**
 * F2.2 Transaksi Berulang — generator occurrence + proyeksi arus kas (murni, testable).
 * MONTHLY: dayOfMonth 1–31 (clamp akhir bulan) · WEEKLY: dayOfMonth 1–7 (Sen–Min) ·
 * YEARLY: bulan+hari dari startDate.
 */

const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
// dayOfMonth 1..7 (Sen..Min) → getDay() 0..6 (Min..Sab)
const weekdayToJs = (dow1to7: number) => (dow1to7 % 7); // 7(Min)→0, 1(Sen)→1

/** Occurrence berikutnya (≥ from), menghormati startDate. null bila frekuensi tak dikenal. */
export function nextOccurrenceFor(rec: Recurring, from: Date = startOfToday()): Date | null {
  const start = parseDateSafe(rec.startDate);
  const base = start && start > from ? start : from;
  if (rec.frequency === 'MONTHLY') {
    return nextOccurrence(rec.dayOfMonth || 1, base);
  }
  if (rec.frequency === 'WEEKLY') {
    const target = weekdayToJs(rec.dayOfMonth || 1);
    const d = new Date(base); d.setHours(0, 0, 0, 0);
    for (let i = 0; i < 7; i++) { if (d.getDay() === target) return new Date(d); d.setDate(d.getDate() + 1); }
    return new Date(d);
  }
  if (rec.frequency === 'YEARLY') {
    const s = start || from;
    let occ = new Date(base.getFullYear(), s.getMonth(), s.getDate());
    if (occ < base) occ = new Date(base.getFullYear() + 1, s.getMonth(), s.getDate());
    return occ;
  }
  return null;
}

/** Semua occurrence dalam [from, to] (inklusif), berhenti di endDate bila ada. */
export function generateOccurrences(rec: Recurring, from: Date, to: Date): Date[] {
  const out: Date[] = [];
  const end = parseDateSafe(rec.endDate);
  let cur = nextOccurrenceFor(rec, from);
  let guard = 0;
  while (cur && cur <= to && guard++ < 500) {
    if (end && cur > end) break;
    out.push(new Date(cur));
    if (rec.frequency === 'MONTHLY') cur = nextOccurrence(rec.dayOfMonth || 1, addDays(cur, 1));
    else if (rec.frequency === 'WEEKLY') cur = addDays(cur, 7);
    else if (rec.frequency === 'YEARLY') cur = new Date(cur.getFullYear() + 1, cur.getMonth(), cur.getDate());
    else break;
  }
  return out;
}

const isActive = (rec: Recurring, today: Date) => {
  const end = parseDateSafe(rec.endDate);
  return !end || end >= today;
};

export interface DueItem { rec: Recurring; dueDate: Date; }

/** Recurring yang punya occurrence ≤ hari ini yang BELUM diposting (lastPostedDate < occurrence). */
export function dueRecurrings(recurrings: Recurring[], today: Date = startOfToday()): DueItem[] {
  const out: DueItem[] = [];
  for (const rec of recurrings) {
    if (!isActive(rec, today)) continue;
    const occs = generateOccurrences(rec, addDays(today, -370), today);
    if (!occs.length) continue;
    const latest = occs[occs.length - 1];
    const posted = parseDateSafe(rec.lastPostedDate);
    if (!posted || posted < latest) out.push({ rec, dueDate: latest });
  }
  return out;
}

export interface ProjectionPoint { date: Date; balance: number; label: string; }
export interface ProjectionResult {
  points: ProjectionPoint[];
  endBalance: number;
  firstNegative: Date | null;
  minBalance: number;
}

/** Proyeksi saldo kas `days` hari ke depan dari saldo awal + occurrence recurring aktif. */
export function projectCashflow(startBalance: number, recurrings: Recurring[], days = 90, today: Date = startOfToday()): ProjectionResult {
  const horizon = addDays(today, days);
  const events: { date: Date; amount: number }[] = [];
  for (const rec of recurrings) {
    if (!isActive(rec, today)) continue;
    generateOccurrences(rec, addDays(today, 1), horizon).forEach((d) => {
      events.push({ date: d, amount: rec.type === 'PEMASUKAN' ? (rec.amount || 0) : -(rec.amount || 0) });
    });
  }
  events.sort((a, b) => a.date.getTime() - b.date.getTime());

  const fmt = (d: Date) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
  let running = startBalance;
  const points: ProjectionPoint[] = [{ date: new Date(today), balance: running, label: fmt(today) }];
  let firstNegative: Date | null = null;
  let minBalance = running;
  for (const ev of events) {
    running += ev.amount;
    if (running < minBalance) minBalance = running;
    if (running < 0 && !firstNegative) firstNegative = new Date(ev.date);
    points.push({ date: new Date(ev.date), balance: running, label: fmt(ev.date) });
  }
  return { points, endBalance: running, firstNegative, minBalance };
}

export const FREQ_LABEL: Record<Recurring['frequency'], string> = { MONTHLY: 'Bulanan', WEEKLY: 'Mingguan', YEARLY: 'Tahunan' };
export const WEEKDAYS_ID = ['', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
