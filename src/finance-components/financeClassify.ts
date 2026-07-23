import type { Transaction, Account } from '../store/useFinanceStore';

/**
 * Fondasi klasifikasi transaksi (jilid 2). Mengekstrak logika yang sebelumnya terduplikasi inline
 * di FinanceDashboard (isAssetAllocation) & FinanceAnalytics (parseTransactionMonth) menjadi util
 * bersama, plus penanda arah & pengelompokan arus kas (operasi/investasi/pendanaan) untuk F4.1+.
 */

/** Parse tanggal transaksi → 'YYYY-MM' (mendukung 'yyyy-mm-dd' & 'dd Mon yyyy'). */
export function parseTxnMonth(dateStr: string): string {
  if (!dateStr) return '';
  if (dateStr.includes('-')) {
    return dateStr.slice(0, 7); // "2026-03-05" → "2026-03"
  }
  const parts = dateStr.split(' ');
  if (parts.length === 3) {
    const monthStr = parts[1];
    const year = parts[2];
    const monthsMap: Record<string, string> = {
      Jan: '01', Feb: '02', Mar: '03', Apr: '04', Mei: '05', Jun: '06',
      Jul: '07', Agu: '08', Sep: '09', Okt: '10', Nov: '11', Des: '12',
      Januari: '01', Februari: '02', Maret: '03', April: '04', Juni: '06',
      Juli: '07', Agustus: '08', September: '09', Oktober: '10', November: '11', Desember: '12',
    };
    const monthNorm = monthsMap[monthStr] || '01';
    return `${year}-${monthNorm}`;
  }
  return '';
}

/**
 * Apakah kategori ini "alokasi aset" (pindah ke tabungan/investasi) dan BUKAN konsumsi?
 * Dipakai untuk mengecualikan setoran investasi/tabungan dari perhitungan pemasukan/pengeluaran riil.
 * (Verbatim dari FinanceDashboard agar perilaku identik.)
 */
export function isAssetAllocation(category: string): boolean {
  const norm = (category || '').toLowerCase();
  if (norm.includes('income') || norm.includes('dividend') || norm.includes('kupon') || norm.includes('bunga')) {
    return false;
  }
  return (
    norm.includes('saving') || norm.includes('tabungan') || norm.includes('darurat') ||
    norm.includes('emergency') || norm.includes('sinking') || norm.includes('invest') ||
    norm.includes('saham') || norm.includes('crypto') || norm.includes('reksa') ||
    norm.includes('bond') || norm.includes('emas') || norm.includes('gold') ||
    norm.includes('kripto') || norm.includes('deposito') || norm.includes('transfer')
  );
}

/** Nominal bertanda: PEMASUKAN → +|amt|, PENGELUARAN → −|amt|, TRANSFER → 0 (dikecualikan dari P&L). */
export function signedAmount(t: Transaction): number {
  if (t.type === 'PEMASUKAN') return Math.abs(t.amount);
  if (t.type === 'PENGELUARAN') return -Math.abs(t.amount);
  return 0;
}

export type FlowGroup = 'operasi' | 'investasi' | 'pendanaan';

const FINANCING_RE = /cicil|angsur|pinjam|kredit|utang|hutang|kpr|kkb|leasing|paylater|pay ?later/i;

/**
 * Kelompokkan transaksi ala laporan arus kas:
 *  - investasi: alokasi aset/tabungan, capital gain, atau akun bertipe 'investment'.
 *  - pendanaan: cicilan/angsuran/pinjaman/kredit (dari kategori/desc/lokasi).
 *  - operasi: sisanya (biaya hidup, gaji, tagihan rutin).
 */
export function classifyFlow(t: Transaction, accounts: Account[]): FlowGroup {
  const cat = t.category || '';
  const acc = accounts.find((a) => a.name === t.account);
  if (isAssetAllocation(cat) || cat.toLowerCase().includes('capital gain') || acc?.type === 'investment') {
    return 'investasi';
  }
  if (FINANCING_RE.test(cat) || FINANCING_RE.test(t.desc || '') || FINANCING_RE.test(t.location || '')) {
    return 'pendanaan';
  }
  return 'operasi';
}
