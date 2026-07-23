import type { Transaction } from '../store/useFinanceStore';

/**
 * Impor mutasi bank — parser (murni). Mendukung CSV (delimiter , ; tab |) & Excel (.xlsx/.xls via lazy import),
 * kolom nominal bertanda ATAU pasangan debit/kredit, beragam format tanggal → yyyy-mm-dd, dan nominal IDR
 * (1.000.000,00). Auto-skip baris metadata (info rekening) di atas header. Preset per bank + profil tersimpan.
 */

/** Deteksi delimiter dari baris pertama non-kosong. */
function detectDelimiter(sample: string): string {
  const line = (sample.split(/\r?\n/).find((l) => l.trim()) || '');
  const counts: Record<string, number> = { ',': 0, ';': 0, '\t': 0, '|': 0 };
  let inQ = false;
  for (const ch of line) {
    if (ch === '"') inQ = !inQ;
    else if (!inQ && ch in counts) counts[ch]++;
  }
  return (Object.entries(counts).sort((a, b) => b[1] - a[1])[0] || [','])[0];
}

/** Parser CSV kecil yang menghormati tanda kutip. Juga menangani teks tempel dari PDF (tab/pipe). */
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
      if (ch === '"') { if (clean[i + 1] === '"') { field += '"'; i++; } else inQ = false; }
      else field += ch;
    } else if (ch === '"') inQ = true;
    else if (ch === delim) { row.push(field); field = ''; }
    else if (ch === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (ch === '\r') { /* skip */ }
    else field += ch;
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((c) => (c || '').trim() !== ''));
}

/** Baca file CSV atau Excel (.xlsx/.xls) → array baris. Excel dimuat lazy (code-split). */
export async function parseSpreadsheetFile(file: File): Promise<string[][]> {
  const name = (file.name || '').toLowerCase();
  if (name.endsWith('.xlsx') || name.endsWith('.xls') || name.endsWith('.xlsm')) {
    const XLSX = await import('xlsx');
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: 'array' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const arr = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' }) as unknown[][];
    return arr.map((r) => (r || []).map((c) => String(c ?? '').trim()))
      .filter((r) => r.some((c) => c !== ''));
  }
  const text = await file.text();
  return parseCSV(text);
}

/**
 * Parse nominal IDR/US ke integer bertanda. Menangani (123)=negatif, DB/Debet/CR/Kredit, pemisah ribuan,
 * dan DESIMAL: pemisah terakhir yang diikuti 1–2 digit di akhir dianggap desimal & dibuang (mis. 1.000.000,00 → 1000000).
 */
export function parseAmount(raw: string): number {
  if (raw == null) return 0;
  let s = String(raw).trim();
  if (!s) return 0;
  let sign = 1;
  if (/^\(.*\)$/.test(s)) { sign = -1; s = s.slice(1, -1); }
  const up = s.toUpperCase();
  if (/(^|[\s-])(DB|DEBIT|DEBET)\b/.test(up)) sign = -1;
  else if (/(^|[\s+])(CR|KREDIT|CREDIT)\b/.test(up)) sign = 1;
  if (/^\s*-/.test(s)) sign = -1;

  const numPart = s.replace(/[^0-9.,]/g, '');
  const dec = numPart.match(/[.,]\d{1,2}$/);         // pemisah desimal = 1–2 digit di ujung
  const intPart = dec ? numPart.slice(0, numPart.length - dec[0].length) : numPart;
  const digits = intPart.replace(/[^0-9]/g, '');
  return digits ? sign * Number(digits) : 0;
}

/** Parse tanggal beragam format → yyyy-mm-dd (null bila gagal). */
export function parseCsvDate(raw: string): string | null {
  if (!raw) return null;
  const s = String(raw).trim();
  let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);          // yyyy-mm-dd
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/);            // dd-mm-yyyy (umum di ID)
  if (m) {
    let y = m[3]; if (y.length === 2) y = (Number(y) > 50 ? '19' : '20') + y;
    return `${y}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  }
  // dd MMM yyyy (Jan/Feb/… atau nama bulan Indonesia)
  const mon: Record<string, string> = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', mei: '05', jun: '06', jul: '07', aug: '08', agu: '08', ags: '08', sep: '09', oct: '10', okt: '10', nov: '11', dec: '12', des: '12' };
  m = s.match(/^(\d{1,2})[-\s]([A-Za-z]{3,})[-\s](\d{2,4})/);
  if (m) {
    const mm = mon[m[2].slice(0, 3).toLowerCase()];
    if (mm) { let y = m[3]; if (y.length === 2) y = '20' + y; return `${y}-${mm}-${m[1].padStart(2, '0')}`; }
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

/** Kata kunci header umum (untuk deteksi baris header & auto-skip metadata). */
const HEADER_KW = /tanggal|tgl|date|waktu|keterangan|deskripsi|uraian|desc|description|berita|remark|narasi|catatan|debet|debit|kredit|credit|mutasi|amount|nominal|jumlah|saldo|balance|tipe|type|jenis|kategori|category|akun|account|rekening/i;

/** Temukan indeks baris header (baris dgn ≥2 sel cocok kata kunci) di antara `maxScan` baris awal; -1 bila tak ada. */
export function findHeaderRow(rows: string[][], maxScan = 25): number {
  let best = -1, bestScore = 1;
  for (let i = 0; i < Math.min(rows.length, maxScan); i++) {
    const score = (rows[i] || []).filter((c) => HEADER_KW.test((c || '').trim())).length;
    if (score > bestScore) { bestScore = score; best = i; }
  }
  return best;
}

export interface CsvMapping {
  hasHeader: boolean;
  dateCol: number;
  descCol: number;
  amountCol: number;  // kolom nominal bertanda (-1 bila pakai debit/kredit)
  debitCol: number;   // -1 bila tak dipakai
  creditCol: number;  // -1 bila tak dipakai
  // Mode template (opsional) — kolom kaya bila tersedia:
  typeCol?: number;      // kolom Tipe (Pemasukan/Pengeluaran) → menentukan tanda
  categoryCol?: number;  // kolom Kategori
  accountCol?: number;   // kolom Akun (override akun per baris)
}

export interface ParsedTxn { date: string; desc: string; amount: number; valid: boolean; category?: string; account?: string }

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
    // Mode template: kolom Tipe menentukan tanda dari nominal positif.
    if (map.typeCol != null && map.typeCol >= 0) {
      const t = (r[map.typeCol] || '').toLowerCase();
      const mag = Math.abs(amount);
      if (/pemasukan|masuk|income|kredit|credit|\bcr\b|\bin\b/.test(t)) amount = mag;
      else if (/pengeluaran|keluar|expense|debit|debet|\bdb\b|\bout\b/.test(t)) amount = -mag;
    }
    const category = map.categoryCol != null && map.categoryCol >= 0 ? (r[map.categoryCol] || '').trim() || undefined : undefined;
    const account = map.accountCol != null && map.accountCol >= 0 ? (r[map.accountCol] || '').trim() || undefined : undefined;
    return { date, desc, amount, category, account, valid: !!date && amount !== 0 };
  });
}

/** Ubah ParsedTxn → payload Transaction. Pakai kategori/akun per-baris bila ada (mode template). */
export function toTransactionPayload(p: ParsedTxn, defaultAccount: string): Omit<Transaction, 'id'> {
  const income = p.amount >= 0;
  return {
    date: p.date, desc: p.desc, location: 'Impor', amount: p.amount,
    category: p.category || (income ? 'Pemasukan Lain' : 'Lainnya'),
    icon: income ? 'download' : 'upload', status: 'Selesai', account: p.account || defaultAccount,
    type: income ? 'PEMASUKAN' : 'PENGELUARAN',
  };
}

/* ===================== Preset bank ===================== */

export interface BankPreset {
  key: string; label: string;
  dateKw?: RegExp; descKw?: RegExp; debitKw?: RegExp; creditKw?: RegExp; amountKw?: RegExp;
}

export const BANK_PRESETS: BankPreset[] = [
  { key: 'auto', label: 'Deteksi otomatis' },
  { key: 'bca', label: 'BCA', dateKw: /tanggal|tgl/i, descKw: /keterangan/i, amountKw: /mutasi/i },
  { key: 'mandiri', label: 'Bank Mandiri', dateKw: /tanggal|date/i, descKw: /keterangan|uraian|remark/i, debitKw: /debet|debit/i, creditKw: /kredit|credit/i },
  { key: 'bni', label: 'BNI', dateKw: /tanggal|tgl/i, descKw: /uraian|keterangan/i, debitKw: /debet|debit/i, creditKw: /kredit|credit/i },
  { key: 'bri', label: 'BRI', dateKw: /tanggal|tgl/i, descKw: /uraian|keterangan/i, debitKw: /debet|debit/i, creditKw: /kredit|credit/i },
  { key: 'jago', label: 'Bank Jago', dateKw: /date|tanggal/i, descKw: /description|keterangan|catatan/i, amountKw: /amount|nominal|jumlah/i },
  { key: 'jenius', label: 'Jenius / BTPN', dateKw: /date|tanggal/i, descKw: /description|keterangan/i, amountKw: /amount|nominal/i },
  { key: 'seabank', label: 'SeaBank', dateKw: /date|tanggal|waktu/i, descKw: /description|keterangan|tipe/i, amountKw: /amount|nominal|jumlah/i },
  { key: 'blu', label: 'blu (BCA Digital)', dateKw: /date|tanggal|waktu/i, descKw: /description|keterangan|catatan/i, amountKw: /amount|nominal|jumlah/i },
];

/** Tebak mapping otomatis dari header; preset (opsional) memberi prioritas kata kunci per bank. */
export function guessMapping(rows: string[][], preset?: BankPreset): CsvMapping {
  const first = rows[0] || [];
  const looksHeader = first.some((c) => HEADER_KW.test((c || '').trim()));
  const find = (re: RegExp) => first.findIndex((c) => re.test((c || '').trim()));
  const firstOf = (...res: (RegExp | undefined)[]) => {
    for (const re of res) { if (!re) continue; const idx = find(re); if (idx >= 0) return idx; }
    return -1;
  };

  const dateCol = looksHeader ? Math.max(0, firstOf(preset?.dateKw, /tanggal|date|tgl|waktu/i)) : 0;
  const descCol = looksHeader ? Math.max(0, firstOf(preset?.descKw, /deskripsi|keterangan|uraian|berita|remark|narasi|description|catatan/i)) : 1;
  const debitCol = looksHeader ? firstOf(preset?.debitKw, /debet|debit|keluar/i) : -1;
  const creditCol = looksHeader ? firstOf(preset?.creditKw, /kredit|credit|masuk/i) : -1;
  let amountCol = looksHeader ? firstOf(preset?.amountKw, /mutasi|amount|nominal|jumlah/i) : (first.length > 2 ? 2 : 1);
  if (debitCol >= 0 || creditCol >= 0) amountCol = -1;
  // Deteksi kolom kaya (Template DompetKu / spreadsheet terstruktur):
  const typeCol = looksHeader ? firstOf(/^tipe$|^type$|jenis/i) : -1;
  const categoryCol = looksHeader ? firstOf(/kategori|category/i) : -1;
  const accountCol = looksHeader ? firstOf(/^akun$|^account$|rekening/i) : -1;
  // Bila ada kolom Tipe, nominal (Jumlah) dibaca positif & tandanya dari Tipe.
  if (typeCol >= 0 && amountCol < 0 && (debitCol >= 0 || creditCol >= 0)) { /* biarkan debit/kredit */ }
  return { hasHeader: looksHeader, dateCol, descCol, amountCol, debitCol, creditCol, typeCol, categoryCol, accountCol };
}

/* ===================== Template DompetKu (unduh untuk input massal / migrasi) ===================== */

export const TEMPLATE_HEADERS = ['Tanggal', 'Deskripsi', 'Jumlah', 'Tipe', 'Kategori', 'Akun', 'Catatan'];

/** Escape sel CSV. */
const csvCell = (v: string) => (/[",\n;]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

/** Bangun isi CSV template (header + 2 baris contoh). `sampleAccount` = nama akun user (agar contoh valid). */
export function buildTemplateCSV(sampleAccount = 'Nama Akun Anda'): string {
  const rows = [
    TEMPLATE_HEADERS,
    ['2026-07-01', 'CONTOH — hapus baris ini · Gaji bulanan', '10000000', 'Pemasukan', 'Salary', sampleAccount, 'opsional'],
    ['2026-07-02', 'CONTOH — hapus baris ini · Belanja Indomaret', '150000', 'Pengeluaran', 'Food', sampleAccount, 'opsional'],
  ];
  return rows.map((r) => r.map((c) => csvCell(String(c))).join(',')).join('\r\n');
}

/* ===================== Profil impor tersimpan (di Settings) ===================== */

export interface ImportProfile { name: string; preset: string; mapping: CsvMapping; amountMode: 'signed' | 'debitcredit'; account: string }

export function readImportProfiles(value: string | undefined): ImportProfile[] {
  if (!value) return [];
  try { const a = JSON.parse(value); return Array.isArray(a) ? a : []; } catch { return []; }
}
export function serializeImportProfiles(list: ImportProfile[]): string { return JSON.stringify(list); }
