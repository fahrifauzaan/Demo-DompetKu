import type { Transaction } from '../store/useFinanceStore';

/**
 * Wave B — Realized gain dari transaksi "Jual".
 * Konvensi: penjualan = transaksi PEMASUKAN kategori 'Capital Gain', dengan cost basis
 * terjual disematkan di kolom `location` sebagai tag `cost:<angka>` (machine-readable),
 * agar laporan realized gain bisa dihitung lintas-perangkat tanpa kolom baru.
 * Cost basis memakai AVERAGE cost (bukan FIFO ketat).
 */

export interface RealizedSale {
  id: string;
  date: string;
  desc: string;
  proceeds: number;
  cost: number;
  gain: number;
}

export function parseCostTag(location?: string): number | null {
  if (!location) return null;
  const m = String(location).match(/cost:(\d+(?:\.\d+)?)/i);
  return m ? Number(m[1]) : null;
}

/** Format tag cost basis untuk disematkan di `location` transaksi jual. */
export const costTag = (cost: number) => `Jual • cost:${Math.round(cost)}`;

export interface RealizedSummary {
  sales: RealizedSale[];
  totalProceeds: number;
  totalCost: number;
  totalGain: number;
}

/** Kumpulkan realized gain dari transaksi penjualan (category 'Capital Gain' / desc "Jual"). */
export function computeRealizedGains(transactions: Transaction[]): RealizedSummary {
  const sales: RealizedSale[] = [];
  for (const t of transactions) {
    if (t.type !== 'PEMASUKAN') continue;
    const isSale = (t.category || '').toLowerCase() === 'capital gain' || /^jual\b/i.test(t.desc || '');
    if (!isSale) continue;
    const proceeds = Math.abs(t.amount || 0);
    const cost = parseCostTag(t.location);
    if (cost === null) continue; // hanya penjualan yang punya cost basis tercatat
    sales.push({ id: t.id, date: t.date, desc: t.desc, proceeds, cost, gain: proceeds - cost });
  }
  sales.sort((a, b) => (a.date < b.date ? 1 : -1));
  const totalProceeds = sales.reduce((s, x) => s + x.proceeds, 0);
  const totalCost = sales.reduce((s, x) => s + x.cost, 0);
  return { sales, totalProceeds, totalCost, totalGain: totalProceeds - totalCost };
}
