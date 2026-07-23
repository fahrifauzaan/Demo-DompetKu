import type { Account, Asset, Debt } from '../store/useFinanceStore';

/**
 * F1.3 Ekspor Lampiran Harta SPT (Lampiran IV / Daftar Harta).
 * PENTING: nilai yang dilaporkan = HARGA PEROLEHAN (purchasePrice / saldo), BUKAN nilai pasar.
 * Kode harta mengacu daftar resmi DJP.
 */

export interface HartaCode {
  code: string;
  label: string;
}

// Daftar kode harta resmi DJP (subset yang relevan untuk pengguna DompetKu).
export const HARTA_CODES: HartaCode[] = [
  { code: '011', label: '011 — Uang tunai' },
  { code: '012', label: '012 — Tabungan' },
  { code: '013', label: '013 — Giro' },
  { code: '014', label: '014 — Deposito' },
  { code: '019', label: '019 — Kas & setara kas lainnya' },
  { code: '031', label: '031 — Saham (untuk diperjualbelikan)' },
  { code: '032', label: '032 — Saham (penyertaan modal)' },
  { code: '033', label: '033 — Obligasi perusahaan' },
  { code: '034', label: '034 — Obligasi pemerintah (ORI/SBN)' },
  { code: '035', label: '035 — Surat utang lainnya' },
  { code: '036', label: '036 — Reksadana' },
  { code: '039', label: '039 — Investasi lainnya (kripto, P2P)' },
  { code: '041', label: '041 — Sepeda' },
  { code: '042', label: '042 — Sepeda motor' },
  { code: '043', label: '043 — Mobil' },
  { code: '049', label: '049 — Alat transportasi lainnya' },
  { code: '051', label: '051 — Logam mulia (emas, perhiasan)' },
  { code: '052', label: '052 — Batu mulia' },
  { code: '053', label: '053 — Barang seni & antik' },
  { code: '055', label: '055 — Peralatan elektronik & furnitur' },
  { code: '059', label: '059 — Harta bergerak lainnya' },
  { code: '061', label: '061 — Tanah/bangunan tempat tinggal' },
  { code: '062', label: '062 — Tanah/bangunan usaha' },
  { code: '069', label: '069 — Harta tidak bergerak lainnya' },
];

export interface SptRow {
  id: string;
  source: 'account' | 'asset';
  kode: string;
  nama: string;
  tahun: string;         // tahun perolehan
  hargaPerolehan: number; // harga perolehan (bukan nilai pasar)
  keterangan: string;
  excluded: boolean;
}

const isGold = (title: string, subType: string): boolean => {
  const st = subType.toLowerCase();
  if (st === 'perhiasan' || st === 'emas' || st === 'logam mulia') return true;
  return /emas|gold|logam mulia|antam|dinar|perhiasan/.test(title.toLowerCase());
};

const yearOf = (dateStr?: string): string => {
  if (!dateStr) return String(new Date().getFullYear());
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) return String(d.getFullYear());
  const m = String(dateStr).match(/(19|20)\d{2}/);
  return m ? m[0] : String(new Date().getFullYear());
};

function defaultKodeAccount(acc: Account): string {
  if (acc.type === 'cash') return '011';
  return '012'; // bank / wallet / investment (uang di rekening)
}

function defaultKodeAsset(a: Asset): string {
  const st = (a.subType || '').toLowerCase();
  const title = a.title || '';
  switch (a.category) {
    case 'real-estat':
      return '061';
    case 'kendaraan':
      return /motor|sepeda motor/i.test(title) ? '042' : '043';
    case 'koleksi':
      return isGold(title, st) ? '051' : '053';
    case 'investasi':
      if (st === 'saham') return '031';
      if (st === 'reksadana') return '036';
      if (st === 'kripto') return '039';
      if (st === 'deposito') return '014';
      if (st.includes('p2p')) return '039';
      return '034'; // sbn/obligasi pemerintah default
    default:
      return '059';
  }
}

const accountTypeLabel = (t: Account['type']): string =>
  t === 'bank' ? 'Rekening bank' : t === 'wallet' ? 'E-wallet' : t === 'cash' ? 'Uang tunai' : 'Rekening investasi';

/** Bangun baris Daftar Harta dari akun + aset. Nilai = HARGA PEROLEHAN. */
export function buildSptRows(accounts: Account[], assets: Asset[]): SptRow[] {
  const rows: SptRow[] = [];

  accounts.forEach((acc) => {
    rows.push({
      id: `spt-acc-${acc.id}`,
      source: 'account',
      kode: defaultKodeAccount(acc),
      nama: acc.name,
      tahun: yearOf(acc.startDate),
      hargaPerolehan: acc.balance || 0, // saldo = nilai dilaporkan untuk kas/rekening
      keterangan: accountTypeLabel(acc.type),
      excluded: false,
    });
  });

  assets.forEach((a) => {
    rows.push({
      id: `spt-ast-${a.id}`,
      source: 'asset',
      kode: defaultKodeAsset(a),
      nama: a.title,
      tahun: yearOf(a.purchaseDate),
      hargaPerolehan: a.purchasePrice || 0, // harga perolehan, BUKAN currentValue
      keterangan: a.location || a.notes || '',
      excluded: false,
    });
  });

  return rows;
}

const csvEscape = (s: string) => `"${String(s).replace(/"/g, '""')}"`;

/** CSV: quoted, angka tanpa pemisah ribuan (id-e-Filing friendly). Baris excluded dibuang. */
export function sptRowsToCSV(rows: SptRow[]): string {
  const header = ['Kode Harta', 'Nama Harta', 'Tahun Perolehan', 'Harga Perolehan', 'Keterangan'];
  const lines = [header.map(csvEscape).join(',')];
  rows.filter((r) => !r.excluded).forEach((r) => {
    lines.push([
      csvEscape(r.kode),
      csvEscape(r.nama),
      csvEscape(r.tahun),
      csvEscape(String(Math.round(r.hargaPerolehan || 0))),
      csvEscape(r.keterangan),
    ].join(','));
  });
  return lines.join('\r\n');
}

export const hartaCodeLabel = (code: string): string =>
  HARTA_CODES.find((c) => c.code === code)?.label || code;

/* ===================== F6.3 — Daftar Utang/Kewajiban (Lampiran SPT) ===================== */

export interface UtangRow {
  id: string;
  nama: string;             // nama utang
  pemberiPinjaman: string;  // kreditur/lender
  tahun: string;            // tahun peminjaman
  jumlah: number;           // saldo terutang
  keterangan: string;
  excluded: boolean;
}

/** Bangun Daftar Utang dari tab Debts (hanya yang saldonya > 0). */
export function buildUtangRows(debts: Debt[]): UtangRow[] {
  return (debts || [])
    .filter((d) => (d.balance || 0) > 0)
    .map((d) => ({
      id: d.id,
      nama: d.name || '(tanpa nama)',
      pemberiPinjaman: d.lender || d.name || '-',
      tahun: yearOf(d.startDate),
      jumlah: d.balance || 0,
      keterangan: d.type || '',
      excluded: false,
    }));
}

export function utangRowsToCSV(rows: UtangRow[]): string {
  const header = ['Nama Utang', 'Pemberi Pinjaman', 'Tahun Peminjaman', 'Jumlah', 'Keterangan'];
  const lines = [header.map(csvEscape).join(',')];
  rows.filter((r) => !r.excluded).forEach((r) => {
    lines.push([
      csvEscape(r.nama),
      csvEscape(r.pemberiPinjaman),
      csvEscape(r.tahun),
      csvEscape(String(Math.round(r.jumlah || 0))),
      csvEscape(r.keterangan),
    ].join(','));
  });
  return lines.join('\r\n');
}
