import type { Account } from '../store/useFinanceStore';

/**
 * Bangun template Excel (.xlsx) dengan DROPDOWN (data validation) untuk Tipe/Kategori/Akun —
 * agar pengisian anti-typo. exceljs di-lazy-load (code-split, tak membebani bundle utama).
 * Kolom = skema impor: Tanggal · Deskripsi · Jumlah · Tipe · Kategori · Akun.
 */
export async function buildTemplateXLSXBlob(accounts: Account[], categories: string[]): Promise<Blob> {
  const mod: any = await import('exceljs');
  const XL = mod.default ?? mod;
  const wb = new XL.Workbook();
  wb.creator = 'DompetKu';

  const ws = wb.addWorksheet('Transaksi');
  const ref = wb.addWorksheet('Referensi');

  const tipe = ['Pemasukan', 'Pengeluaran'];
  const cats = (categories.length ? categories : ['Salary', 'Food', 'Transport', 'Bills', 'Lainnya']).slice(0, 300);
  const accList = accounts.map((a) => a.name).filter(Boolean);
  if (!accList.length) accList.push('Nama Akun Anda');

  // Sheet referensi (disembunyikan) → sumber daftar dropdown
  ref.getCell('A1').value = 'Tipe'; tipe.forEach((v, i) => (ref.getCell(`A${i + 2}`).value = v));
  ref.getCell('B1').value = 'Kategori'; cats.forEach((v, i) => (ref.getCell(`B${i + 2}`).value = v));
  ref.getCell('C1').value = 'Akun'; accList.forEach((v, i) => (ref.getCell(`C${i + 2}`).value = v));
  ref.state = 'hidden';

  // Header ber-styling
  const headers = ['Tanggal', 'Deskripsi', 'Jumlah', 'Tipe', 'Kategori', 'Akun'];
  const head = ws.addRow(headers);
  head.eachCell((c: any) => {
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
    c.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    c.alignment = { vertical: 'middle' };
  });
  ws.columns = [{ width: 13 }, { width: 38 }, { width: 15 }, { width: 14 }, { width: 18 }, { width: 18 }];
  ws.views = [{ state: 'frozen', ySplit: 1 }];

  // Baris contoh (hapus saat mengisi)
  ws.addRow(['2026-07-01', 'CONTOH — hapus baris ini · Gaji bulanan', 10000000, 'Pemasukan', cats[0] || 'Salary', accList[0]]);
  ws.addRow(['2026-07-02', 'CONTOH — hapus baris ini · Belanja Indomaret', 150000, 'Pengeluaran', 'Food', accList[0]]);

  // Dropdown (data validation) untuk baris 2..300
  const putDV = (col: string, formula: string) => {
    for (let r = 2; r <= 300; r++) {
      ws.getCell(`${col}${r}`).dataValidation = { type: 'list', allowBlank: true, formulae: [formula], showErrorMessage: true, errorStyle: 'warning', error: 'Pilih dari daftar (atau kosongkan).' };
    }
  };
  putDV('D', `Referensi!$A$2:$A$${tipe.length + 1}`);
  putDV('E', `Referensi!$B$2:$B$${cats.length + 1}`);
  putDV('F', `Referensi!$C$2:$C$${accList.length + 1}`);

  const buf = await wb.xlsx.writeBuffer();
  return new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}
