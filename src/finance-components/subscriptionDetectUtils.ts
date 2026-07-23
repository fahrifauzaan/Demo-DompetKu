import type { Transaction, Recurring } from '../store/useFinanceStore';

/**
 * F4.3 — Deteksi Langganan/transaksi berulang dari riwayat. Murni.
 * Mengelompokkan pengeluaran per merchant + nominal mirip, lalu menilai keteraturan selang waktu.
 */

/** Normalisasi nama merchant untuk pengelompokan: UPPERCASE, buang angka/tanggal/kode & simbol. */
export function normalizeMerchant(desc: string, location: string): string {
  const raw = `${desc || ''} ${location || ''}`;
  return raw
    .toUpperCase()
    .replace(/\d+/g, ' ')                 // buang angka
    .replace(/[^A-Z\s]/g, ' ')            // buang simbol
    .replace(/\b(TRANSAKSI|IMPOR|CSV|PEMBAYARAN|PAYMENT|VA|TRF|TRANSFER|BULANAN|MONTHLY)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Selisih hari antara dua tanggal 'yyyy-mm-dd' (deterministik). */
function daysBetween(a: string, b: string): number {
  const ta = new Date(a + 'T00:00:00Z').getTime();
  const tb = new Date(b + 'T00:00:00Z').getTime();
  return Math.round((tb - ta) / 86400000);
}

function median(nums: number[]): number {
  if (!nums.length) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

export interface SubCandidate {
  key: string; label: string; amount: number; frequency: 'MONTHLY' | 'YEARLY';
  occurrences: number; lastDate: string; lastAccount: string; intervalMedianDays: number;
  annualCost: number; confidence: number; alreadyRecurring: boolean;
}

/** Deteksi kandidat langganan. minOcc default 3 (bulanan) — cukup untuk pola meyakinkan. */
export function detectSubscriptions(
  txns: Transaction[], recurring: Recurring[],
  opts: { amountTol?: number; minOcc?: number } = {},
): SubCandidate[] {
  const { amountTol = 0.05, minOcc = 3 } = opts;

  // Kelompokkan pengeluaran per (merchant + nominal dibulatkan ke ribuan terdekat via toleransi).
  const groups = new Map<string, Transaction[]>();
  for (const t of txns) {
    if (t.type !== 'PENGELUARAN') continue;
    const merchant = normalizeMerchant(t.desc, t.location);
    if (merchant.length < 3) continue;
    // temukan grup nominal-mirip yang sudah ada untuk merchant ini
    const amt = Math.abs(t.amount || 0);
    let matchedKey: string | null = null;
    for (const key of groups.keys()) {
      if (!key.startsWith(merchant + '|')) continue;
      const ref = Math.abs(groups.get(key)![0].amount || 0);
      if (ref > 0 && Math.abs(amt - ref) / ref <= amountTol) { matchedKey = key; break; }
    }
    const key = matchedKey || `${merchant}|${Math.round(amt)}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(t);
  }

  const out: SubCandidate[] = [];
  for (const [key, list] of groups) {
    if (list.length < minOcc) continue;
    const sorted = [...list].sort((a, b) => (a.date < b.date ? -1 : 1));
    const intervals: number[] = [];
    for (let i = 1; i < sorted.length; i++) intervals.push(daysBetween(sorted[i - 1].date, sorted[i].date));
    if (!intervals.length) continue;
    const med = median(intervals);
    let frequency: 'MONTHLY' | 'YEARLY' | null = null;
    if (med >= 26 && med <= 32) frequency = 'MONTHLY';
    else if (med >= 350 && med <= 380) frequency = 'YEARLY';
    if (!frequency) continue;

    // confidence: keteraturan interval (CV rendah) + konsistensi nominal
    const meanInt = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const cvInt = meanInt > 0 ? Math.sqrt(intervals.reduce((s, x) => s + (x - meanInt) ** 2, 0) / intervals.length) / meanInt : 1;
    const amts = sorted.map((t) => Math.abs(t.amount || 0));
    const meanAmt = amts.reduce((a, b) => a + b, 0) / amts.length;
    const cvAmt = meanAmt > 0 ? Math.sqrt(amts.reduce((s, x) => s + (x - meanAmt) ** 2, 0) / amts.length) / meanAmt : 1;
    const confidence = Math.max(0, Math.min(1, 1 - cvInt * 0.8 - cvAmt * 0.5));

    const last = sorted[sorted.length - 1];
    const label = key.split('|')[0].split(' ').map((w) => w.charAt(0) + w.slice(1).toLowerCase()).join(' ');
    const alreadyRecurring = recurring.some((r) =>
      normalizeMerchant(r.name, '').includes(key.split('|')[0]) ||
      (Math.abs((r.amount || 0) - meanAmt) / (meanAmt || 1) <= amountTol && r.type === 'PENGELUARAN'));

    out.push({
      key, label, amount: Math.round(meanAmt), frequency, occurrences: sorted.length,
      lastDate: last.date, lastAccount: last.account, intervalMedianDays: med,
      annualCost: Math.round(frequency === 'MONTHLY' ? meanAmt * 12 : meanAmt),
      confidence, alreadyRecurring,
    });
  }
  return out.sort((a, b) => b.annualCost - a.annualCost);
}

/** Total kebocoran per bulan (MONTHLY apa adanya + YEARLY dibagi 12), hanya yang belum tercatat. */
export function totalMonthlyBurn(cands: SubCandidate[]): number {
  return cands.filter((c) => !c.alreadyRecurring)
    .reduce((s, c) => s + (c.frequency === 'MONTHLY' ? c.amount : c.amount / 12), 0);
}
