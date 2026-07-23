import type { Transaction } from '../store/useFinanceStore';

/**
 * Wave D — Impor mutasi bank dari CSV (murni, tanpa dependency).
 * Mendukung delimiter , ; atau tab; kolom nominal bertanda ATAU pasangan debit/kredit;
 * beragam format tanggal → dinormalkan ke yyyy-mm-dd. Nominal IDR di-parse ke integer.
 */

/** Deteksi delimiter dari baris pertama. */
function detectDelimiter(sample: string): string {
  const line = sample.split(/\r?\n/)[0] || '';
  const counts: Record<string, number> = { ',': 0, ';': 0, '\t': 0, '|': 0 };
  let inQ = false;
  for (const ch of line) {
    if (ch === '"') inQ = !inQ;
    else if (!inQ && ch in counts) counts[ch]++;
  }
  return (Object.entries(counts).sort((a, b) => b[1] - a[1])[0] || [','])[0];
}

/** Parser CSV kecil yang menghormati tanda kutip. */
export function parseCSV(text: string): string[][] {
  const clean = text.replace(/^﻿/, ''); // strip BOM
  const delim = detectDelimiter(clean);
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQ = false;
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (inQ) {
      if (ch === '"') {
        if (clean[i + 1] === '"') { field += '"'; i++; }
        else inQ = false;
      } else field += ch;
    } else if (ch === '"') inQ = true;
    else if (ch === delim) { row.push(field); field = ''; }
    else if (ch === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (ch === '\r') { /* skip */ }
    else field += ch;
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((c) => (c || '').trim() !== ''));
}

/** Parse nominal IDR ke integer bertanda. Menangani (123) sbg negatif, minus, & pemisah. */
export function parseAmount(raw: string): number {
  if (!raw) return 0;
  let s = String(raw).trim();
  let sign = 1;
  if (/^\(.*\)$/.test(s)) { sign = -1; s = s.slice(1, -1); }
  if (/^-/.test(s) || /(^|\s)(DB|D|Debit)\b/i.test(s)) sign = -1;
  if (/(^|\s)(CR|C|Kredit)\b/i.test(s)) sign = 1;
  const digits = s.replace(/[^0-9]/g, '');
  return digits ? sign * Number(digits) : 0;
}

/** Parse tanggal beragam format → yyyy-mm-dd (null bila gagal). */
export function parseCsvDate(raw: string): string | null {
  if (!raw) return null;
  const s = String(raw).trim();
  // yyyy-mm-dd / yyyy/mm/dd
  let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  // dd-mm-yyyy / dd/mm/yyyy (asumsi hari dulu, umum di Indonesia)
  m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/);
  if (m) {
    let y = m[3]; if (y.length === 2) y = (Number(y) > 50 ? '19' : '20') + y;
    return `${y}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

export interface CsvMapping {
  hasHeader: boolean;
  dateCol: number;
  descCol: number;
  amountCol: number;  // kolom nominal bertanda (-1 bila pakai debit/kredit)
  debitCol: number;   // -1 bila tak dipakai
  creditCol: number;  // -1 bila tak dipakai
}

export interface ParsedTxn {
  date: string;
  desc: string;
  amount: number; // + masuk, − keluar
  valid: boolean;
}

/** Bangun transaksi dari baris CSV + mapping. */
export function buildTransactions(rows: string[][], map: CsvMapping): ParsedTxn[] {
  const body = map.hasHeader ? rows.slice(1) : rows;
  return body.map((r) => {
    const date = parseCsvDate(r[map.dateCol] || '') || '';
    const desc = (r[map.descCol] || '').trim() || 'Transaksi impor';
    let amount = 0;
    if (map.amountCol >= 0) amount = parseAmount(r[map.amountCol] || '');
    else {
      const debit = map.debitCol >= 0 ? Math.abs(parseAmount(r[map.debitCol] || '')) : 0;
      const credit = map.creditCol >= 0 ? Math.abs(parseAmount(r[map.creditCol] || '')) : 0;
      amount = credit - debit;
    }
    return { date, desc, amount, valid: !!date && amount !== 0 };
  });
}

/** Ubah ParsedTxn → payload Transaction untuk addTransaction. */
export function toTransactionPayload(p: ParsedTxn, account: string): Omit<Transaction, 'id'> {
  return {
    date: p.date,
    desc: p.desc,
    location: 'Impor CSV',
    amount: p.amount,
    category: p.amount >= 0 ? 'Pemasukan Lain' : 'Lainnya',
    icon: p.amount >= 0 ? 'download' : 'upload',
    status: 'Selesai',
    account,
    type: p.amount >= 0 ? 'PEMASUKAN' : 'PENGELUARAN',
  };
}

/** Tebak mapping otomatis dari header (bila ada). */
export function guessMapping(rows: string[][]): CsvMapping {
  const first = rows[0] || [];
  const looksHeader = first.some((c) => /tanggal|date|keterangan|desc|debet|debit|kredit|credit|mutasi|amount|nominal|jumlah/i.test(c));
  const find = (re: RegExp) => first.findIndex((c) => re.test((c || '').trim()));
  const dateCol = looksHeader ? Math.max(0, find(/tanggal|date|tgl/i)) : 0;
  const descCol = looksHeader ? Math.max(0, find(/keterangan|desc|uraian|berita|remark|narasi/i)) : 1;
  const debitCol = looksHeader ? find(/debet|debit|keluar/i) : -1;
  const creditCol = looksHeader ? find(/kredit|credit|masuk/i) : -1;
  let amountCol = looksHeader ? find(/mutasi|amount|nominal|jumlah/i) : (first.length > 2 ? 2 : 1);
  if (debitCol >= 0 || creditCol >= 0) amountCol = -1;
  return { hasHeader: looksHeader, dateCol, descCol, amountCol, debitCol, creditCol };
}
