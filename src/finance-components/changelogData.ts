/**
 * Riwayat Pembaruan (changelog) yang ditampilkan in-app. Ringkasan user-facing (Bahasa Indonesia)
 * per versi — turunan dari CHANGELOG.md. Terbaru di atas. Perbarui setiap rilis.
 */

export type ChangeImpact = 'none' | 'appsscript';
export type ChangeTag = 'feature' | 'fix' | 'migration' | 'base';

export interface ChangelogEntry {
  version: string;
  date: string;        // YYYY-MM-DD
  title: string;
  tag: ChangeTag;
  impact: ChangeImpact; // apakah pengguna lama perlu update Apps Script
  added?: string[];
  changed?: string[];
  fixed?: string[];
}

export const CURRENT_VERSION = '3.11.4';

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '3.11.4', date: '2026-07-25', title: 'Perbaikan: Auto-Post Anti-Duplikat', tag: 'fix', impact: 'none',
    fixed: [
      'Transaksi berulang otomatis kini anti-duplikat. Tiap occurrence diberi penanda unik, jadi walau penyimpanan status "sudah diposting" sempat gagal, transaksi yang sama tak akan diposting dua kali saat aplikasi dibuka lagi.',
    ],
  },
  {
    version: '3.11.3', date: '2026-07-25', title: 'Perbaikan: Auto-Post Berulang Andal', tag: 'fix', impact: 'none',
    fixed: [
      'Transaksi berulang yang diposting otomatis (auto-post) kini hanya ditandai "sudah diposting" bila benar-benar tersimpan ke Google Sheet Anda. Sebelumnya, bila penyimpanan gagal (koneksi/kuota), transaksi bisa hilang diam-diam tapi terlanjur dianggap selesai — sehingga tak pernah dicoba lagi.',
      'Kini kalau gagal: muncul pemberitahuan, saldo tidak disesuaikan, dan sistem otomatis mencoba lagi saat aplikasi dibuka berikutnya (kelas perbaikan yang sama dengan Impor di v3.11.2).',
    ],
  },
  {
    version: '3.11.2', date: '2026-07-25', title: 'Perbaikan: Impor Andal Tersimpan', tag: 'fix', impact: 'none',
    fixed: [
      'Impor transaksi kini andal tersimpan ke Google Sheet Anda. Sebelumnya impor berisi banyak baris bisa menembus batas laju tulis Google (rate limit) dan sebagian gagal disimpan diam-diam — transaksi sempat tampil lalu hilang saat sinkron ulang.',
      'Kini semua baris ditulis sekaligus dalam satu operasi (atomik): kalau berhasil, semua tersimpan & jauh lebih cepat; kalau gagal, muncul pesan jelas dan saldo tidak disesuaikan — tak ada lagi transaksi "hantu" yang seolah tersimpan.',
    ],
  },
  {
    version: '3.11.1', date: '2026-07-23', title: 'Panduan Impor + Privasi Data', tag: 'feature', impact: 'none',
    added: [
      'Topik baru "Impor" di Panduan › Transaksi: cara mengimpor (Impor Cerdas & Template) plus penjelasan alur data & privasi.',
      'Menjawab "ke mana file saya pergi?" — file CSV/Excel dibaca di browser Anda dan tidak diunggah ke mana pun; hanya baris transaksinya yang tersimpan, ke Google Sheet milik Anda sendiri. Nol data ke pengembang.',
    ],
  },
  {
    version: '3.11.0', date: '2026-07-23', title: 'Template Excel + Dropdown', tag: 'feature', impact: 'none',
    added: [
      'Template impor kini tersedia format Excel (.xlsx) — dengan dropdown Tipe/Kategori/Akun agar pengisian anti salah-ketik (daftar diambil dari akun & kategori Anda sendiri).',
      'Tetap ada opsi CSV untuk yang lebih ringkas.',
    ],
  },
  {
    version: '3.10.0', date: '2026-07-23', title: 'Template Impor Transaksi', tag: 'feature', impact: 'none',
    added: [
      'Tombol "Unduh Template" di Impor — file CSV berkolom Tanggal · Deskripsi · Jumlah · Tipe · Kategori · Akun. Isi di Excel/Sheets (input massal atau migrasi dari app lain), lalu impor kembali.',
      'Impor kini membaca kolom Kategori, Akun & Tipe langsung dari file bila ada — transaksi masuk sudah rapi & terkategori, tanpa perlu petakan ulang.',
    ],
  },
  {
    version: '3.9.0', date: '2026-07-23', title: 'Impor Cerdas', tag: 'feature', impact: 'none',
    added: [
      'Dukungan file Excel (.xlsx/.xls) selain CSV — langsung dari internet/mobile banking tanpa konversi.',
      'Preset bank (BCA, Mandiri, BNI, BRI, Jago, Jenius, SeaBank, blu) — kolom terpetakan otomatis; degrade mulus ke pemeta manual untuk bank lain.',
      'Simpan pemetaan sebagai profil — impor bulanan berikutnya cukup pilih profil (1-klik).',
      'Panduan impor dari statement PDF (salin tabel → tempel).',
    ],
    changed: [
      'Baris info rekening di atas data kini dilewati otomatis.',
      'Perbaikan baca nominal berdesimal Indonesia (1.000.000,00 kini benar = 1.000.000, bukan 100 juta).',
    ],
  },
  {
    version: '3.8.0', date: '2026-07-23', title: 'Riwayat Pembaruan In-App', tag: 'feature', impact: 'none',
    added: [
      'Halaman "Yang Baru di DompetKu" di Notifikasi — ketuk untuk melihat Riwayat Pembaruan lengkap: daftar semua versi (terbaru di atas) dengan detail perubahan tiap rilis, tanggal, dan penanda jika perlu update Apps Script.',
    ],
  },
  {
    version: '3.7.0', date: '2026-07-23', title: 'Warisan & Rangkuman Bulanan', tag: 'feature', impact: 'none',
    added: [
      'Rangkuman Bulanan Naratif — "bulan ini dalam bahasa manusia": surplus/defisit, tingkat menabung, kategori terbesar, dan perubahan menonjol (di atas Laporan › Ringkasan).',
      'Kalkulator Waris (Faraid) — estimasi pembagian warisan Islam untuk struktur keluarga umum (pasangan, anak, orang tua), lengkap penanganan \'Aul/Radd/\'ashabah. Edukatif, berdisclaimer.',
    ],
  },
  {
    version: '3.6.0', date: '2026-07-23', title: 'Investor Pro: DCA & DRIP', tag: 'feature', impact: 'none',
    added: [
      'Perencana DCA (nabung rutin) — simulasi setoran berkala + grafik akumulasi; menekankan disiplin di atas timing.',
      'Simulator DRIP — bandingkan nilai akhir bila dividen/kupon direinvestasi vs diambil tunai (kekuatan bunga-berbunga).',
    ],
  },
  {
    version: '3.5.0', date: '2026-07-23', title: 'Utang Cerdas', tag: 'feature', impact: 'none',
    added: [
      'Kartu Kesehatan Utang — rasio DTI (cicilan/penghasilan), perkiraan tanggal bebas-utang, total bunga, dan urutan pelunasan.',
      'Melengkapi Simulasi Akselerasi (Snowball vs Avalanche) yang sudah ada.',
    ],
  },
  {
    version: '3.4.0', date: '2026-07-23', title: 'Dana Pensiun Indonesia', tag: 'migration', impact: 'appsscript',
    added: [
      'Registry Dana Pensiun — BPJS Ketenagakerjaan (JHT/JP), DPLK/DPPK: catat saldo, iuran, usia target → proyeksi saldo saat pensiun + masuk net worth (di Aset).',
    ],
    changed: ['Menambah tab Retirement (dibuat otomatis oleh Apps Script). Pengguna lama: perbarui Apps Script sekali dari Panduan.'],
  },
  {
    version: '3.3.0', date: '2026-07-23', title: 'Pajak & Zakat Indonesia', tag: 'feature', impact: 'none',
    added: [
      'Estimator PPh 21 — pajak penghasilan tahunan (PTKP, lapisan progresif UU HPP), rekonsiliasi potongan bulanan, + tab Perencanaan Pajak.',
      'Zakat Penghasilan (2,5% bruto/neto) + pelacak Haul zakat maal.',
      'Ekspor SPT kini menampilkan Daftar Utang/Kewajiban (selain Daftar Harta).',
    ],
  },
  {
    version: '3.1.0', date: '2026-07-23', title: 'Cakrawala & Proaktif', tag: 'feature', impact: 'none',
    added: [
      'Proyeksi Kekayaan Bersih 10/20/30 tahun dengan rentang (konservatif–basis–optimis) + simulasi Monte Carlo.',
      'Perencana Skenario "What-If" — uji dampak resign, beli rumah, biaya naik, atau tambahan penghasilan.',
      'Pemindai Langganan — deteksi otomatis pembayaran berulang dari riwayat + estimasi kebocoran/bulan.',
      'Peringatan Cerdas — nudge prediktif (runway rendah, saldo diproyeksikan minus, anggaran akan jebol) di Notifikasi.',
    ],
  },
  {
    version: '3.0.0', date: '2026-07-23', title: 'Kecerdasan Arus Kas', tag: 'feature', impact: 'none',
    added: [
      'Laporan Arus Kas + Burn Rate & Runway ("tabungan bertahan ± N bulan tanpa pemasukan").',
      'Wawasan Pengeluaran & Deteksi Anomali — sorot kategori naik/turun & lonjakan tak biasa otomatis.',
      'Pelacak Kemandirian Finansial (FIRE) — %FI, tahun-ke-FI, Coast/Lean/Fat, tingkat menabung.',
    ],
  },
  {
    version: '2.7.0', date: '2026-07-23', title: 'Anggaran Bulanan jadi rapi', tag: 'migration', impact: 'appsscript',
    changed: [
      'Anggaran bulanan per-kategori kini tersimpan sebagai tab tidy MonthlyBudgets (bukan blob JSON di Settings) — bisa dibaca & dijumlah dengan formula.',
      'Menyetel anggaran ke 0 kini menghapus barisnya (tak menumpuk sampah). Migrasi otomatis sekali jalan.',
    ],
  },
  {
    version: '2.6.1', date: '2026-07-23', title: 'Perbaikan tampilan modal profil', tag: 'fix', impact: 'none',
    fixed: ['Modal "Kelola profil" yang tampil terpotong di strip atas kini menutupi layar penuh dengan benar.'],
  },
  {
    version: '2.6.0', date: '2026-07-23', title: 'Multi-profil / Mode Keluarga', tag: 'feature', impact: 'none',
    added: ['Kelola keuangan beberapa orang/entitas (pasangan, anak, usaha) dalam satu app — tiap profil memakai Google Sheet sendiri; berpindah lewat pil "Profil" di header.'],
  },
  {
    version: '2.5.0', date: '2026-07-23', title: 'Impor Mutasi Bank (CSV)', tag: 'feature', impact: 'none',
    added: ['Impor transaksi dari file CSV mutasi rekening: deteksi kolom otomatis, pemetaan manual, normalisasi tanggal & nominal, pratinjau sebelum impor (tombol "Impor" di Transaksi).'],
  },
  {
    version: '2.4.0', date: '2026-07-23', title: 'Auto-post & Penautan Tujuan', tag: 'feature', impact: 'none',
    added: [
      'Auto-post transaksi berulang (opt-in) — item jatuh tempo dicatat otomatis saat app dibuka, dengan digest ringkasan.',
      'Penautan Tujuan ↔ akun/aset — progres tujuan mengikuti saldo tertaut secara otomatis.',
    ],
  },
  {
    version: '2.3.0', date: '2026-07-23', title: 'Indikator Penyimpanan Global', tag: 'feature', impact: 'none',
    added: ['Pil status penyimpanan: "Menyimpan ke Google Sheets…" → "Tersimpan" → "Gagal", muncul otomatis untuk setiap aksi di seluruh aplikasi.'],
  },
  {
    version: '2.2.0', date: '2026-07-23', title: 'Jual Aset + Realized Gain', tag: 'feature', impact: 'none',
    added: ['Tombol "Jual" pada holding saham/reksadana → catat transaksi Capital Gain + pangkas holding; laporan Realized Gain di Aset › Analisis.'],
  },
  {
    version: '2.1.0', date: '2026-07-23', title: 'Poles & Panduan', tag: 'feature', impact: 'none',
    added: ['Panduan in-app kini punya topik Tujuan & Proteksi. Template master diperbarui (tab Goals/Recurring/Insurance untuk pengguna baru).'],
  },
  {
    version: '2.0.0', date: '2026-07-22', title: 'Inti Perencanaan (Fase 2)', tag: 'migration', impact: 'appsscript',
    added: [
      'Tujuan Keuangan (target + setoran ideal PMT + sinking fund), Transaksi Berulang + Proyeksi Kas, dan Proteksi/Asuransi (kalkulator Uang Pertanggungan).',
    ],
    changed: ['Menambah tab Goals/Recurring/Insurance (dibuat otomatis). Pengguna lama: perbarui Apps Script sekali.'],
  },
  {
    version: '1.2.0', date: '2026-07-22', title: 'Kedalaman Investor (Fase 3)', tag: 'feature', impact: 'none',
    added: [
      'Skor Kesehatan Finansial komposit, Imbal Hasil Portofolio (XIRR), Kalender Pendapatan Pasif, Rebalancing Advisor, dan fondasi multi-currency (USD).',
    ],
  },
  {
    version: '1.1.0', date: '2026-07-22', title: 'Quick Wins (Fase 1)', tag: 'feature', impact: 'none',
    added: [
      'Kalkulator Zakat Maal, Kalender Keuangan, Ekspor Daftar Harta SPT, Tabel Amortisasi + konverter bunga flat↔efektif, dan Rekonsiliasi Saldo.',
    ],
  },
  {
    version: '1.0.0', date: '2026-07', title: 'Rilis Dasar', tag: 'base', impact: 'none',
    added: ['Pencatatan transaksi, anggaran, aset, utang, laporan & analitik, dengan sinkronisasi per-pengguna via Google Sheets.'],
  },
];
