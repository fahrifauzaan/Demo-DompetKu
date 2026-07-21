/**
 * Utilitas kalender keuangan (murni, tanpa React) — dipakai F1.2 Kalender Keuangan
 * dan nanti F3.5 Kalender Pendapatan Pasif.
 */

export const MONTHS_ID_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];

export function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function daysInMonth(year: number, monthIndex0: number): number {
  // hari ke-0 bulan berikutnya = hari terakhir bulan ini
  return new Date(year, monthIndex0 + 1, 0).getDate();
}

/**
 * Tanggal kejadian berikutnya (≥ `from`) untuk suatu hari-dalam-bulan (1..31),
 * di-clamp ke akhir bulan pendek.
 * Contoh: nextOccurrence(31) di Februari → 28 (atau 29 di tahun kabisat).
 */
export function nextOccurrence(dayOfMonth: number, from: Date = startOfToday()): Date {
  const base = new Date(from);
  base.setHours(0, 0, 0, 0);
  const clamp = (y: number, m: number) => Math.min(Math.max(1, Math.round(dayOfMonth)), daysInMonth(y, m));

  let y = base.getFullYear();
  let m = base.getMonth();
  let candidate = new Date(y, m, clamp(y, m));
  if (candidate < base) {
    m += 1;
    if (m > 11) { m = 0; y += 1; }
    candidate = new Date(y, m, clamp(y, m));
  }
  return candidate;
}

export function daysBetween(a: Date, b: Date): number {
  const x = new Date(a); x.setHours(0, 0, 0, 0);
  const y = new Date(b); y.setHours(0, 0, 0, 0);
  return Math.round((y.getTime() - x.getTime()) / 86400000);
}

/** Parse tanggal toleran (ISO yyyy-mm-dd atau apa pun yang dikenali Date). null bila invalid. */
export function parseDateSafe(input?: string | number | Date): Date | null {
  if (input === undefined || input === null || input === '') return null;
  const d = new Date(input);
  return isNaN(d.getTime()) ? null : d;
}

export function formatDayBadge(d: Date): { day: string; month: string } {
  return { day: String(d.getDate()).padStart(2, '0'), month: MONTHS_ID_SHORT[d.getMonth()] };
}

export type CalendarGroup = 'Minggu Ini' | 'Bulan Ini' | 'Mendatang';

/** Kelompokkan tanggal relatif terhadap hari ini: ≤7 hari, sisa bulan berjalan, atau setelahnya. */
export function groupForDate(date: Date, today: Date = startOfToday()): CalendarGroup {
  const d = daysBetween(today, date);
  if (d <= 7) return 'Minggu Ini';
  if (date.getFullYear() === today.getFullYear() && date.getMonth() === today.getMonth()) return 'Bulan Ini';
  return 'Mendatang';
}
