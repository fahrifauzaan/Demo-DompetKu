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

export const CURRENT_VERSION = '3.18.5';

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '3.18.5', date: '2026-07-25', title: 'Perbaikan: Simpan ke Sheet Lebih Tahan (Anti Rate-Limit) + Pesan Error Jelas', tag: 'fix', impact: 'none',
    fixed: [
      '"Gagal menyimpan ke Google Sheets" saat aktivitas padat (mis. menambah aset Reksadana setelah banyak edit) kini jauh berkurang. Penyebab tersering: batas laju Google Sheets (~60 penulisan/menit) terlampaui sesaat. Kini setiap penyimpanan otomatis dicoba-ulang dengan jeda (retry backoff) ketika kena batas laju (429).',
      'Pesan error kini SPESIFIK: membedakan "batas laju — tunggu ~1 menit lalu coba lagi", "sesi Google kedaluwarsa — hubungkan ulang akun", dan kegagalan lain — bukan lagi selalu "periksa koneksi".',
      'Migrasi kategori Anggaran (Inggris→Indonesia) kini memakai SATU permintaan batch, bukan puluhan. Sebelumnya tiap kategori butuh ~2 permintaan (baca+tulis), sehingga ~30 kategori bisa menghabiskan kuota dan memicu gagal-simpan pada aksi lain (mis. menambah Reksadana).',
      'Kegagalan saat MEMPERBARUI baris kini muncul sebagai peringatan (sebelumnya bisa gagal diam-diam).',
    ],
  },
  {
    version: '3.18.4', date: '2026-07-25', title: 'Perbaikan Penting: Update Harga Reksadana Tersimpan Benar', tag: 'fix', impact: 'none',
    fixed: [
      'Memperbarui harga (NAV) Reksadana kini tersimpan ke kolom yang benar. Sebelumnya definisi kolom internal untuk tab Reksadana KEHILANGAN kolom "Ticker", sehingga setiap penyimpanan bergeser satu kolom — nilai unit/NAV masuk ke kolom yang salah dan nilai investasi jadi kacau atau kosong (Rp 0). Kini urutan kolom diperbaiki.',
      'Selain itu, penyimpanan update sekarang mengikuti HEADER ASLI di sheet Anda (bukan asumsi internal aplikasi), sehingga ketidakcocokan kolom seperti ini tak akan pernah bisa menggeser data lagi — berlaku untuk semua jenis aset.',
      'CATATAN untuk data yang sudah terlanjur kacau: baris Reksadana yang sempat rusak perlu diperbaiki sekali — hapus aset Reksadana itu di aplikasi lalu tambahkan ulang dengan nilai benar (jumlah unit, harga rata-rata/NAV beli, NAV terkini). Setelah itu tersimpan rapi.',
    ],
  },
  {
    version: '3.18.3', date: '2026-07-25', title: 'Perbaikan: Kartu Dana Pensiun (Jarak + Pop-up)', tag: 'fix', impact: 'none',
    fixed: [
      'Jarak kartu "Dana Pensiun" dengan kartu Proteksi di atasnya kini proporsional — sebelumnya menempel terlalu rapat.',
      'Pop-up "Tambah/Ubah Dana Pensiun" diperbaiki: sebelumnya ter-jebak dan terpotong di dalam kotak kartu (bukan overlay layar penuh) karena efek kaca (backdrop-filter) menjebak posisi elemen; sekaligus tampil samar. Kini modal di-render ke tingkat halaman (portal ke body) sehingga menjadi overlay penuh yang benar dan solid.',
      'Kolom nominal di form Dana Pensiun (Saldo kini, Iuran karyawan/bln, Iuran pemberi kerja/bln) kini memberi pemisah ribuan saat diketik — mis. 75000000 → "75.000.000".',
    ],
  },
  {
    version: '3.18.2', date: '2026-07-25', title: 'Perbaikan: Input Harga Aset Pakai Pemisah Ribuan', tag: 'fix', impact: 'none',
    fixed: [
      'Kolom harga saat edit aset investasi ("Harga per Lembar/Unit/Koin Baru") kini otomatis memberi pemisah ribuan saat diketik — mis. mengetik 6400 langsung tampil "6.400", 1045500 → "1.045.500". Sebelumnya angkanya tampil polos tanpa titik. Input desimal (koma) untuk reksadana/kripto tetap didukung dan dibatasi sesuai jumlah digit desimal aset.',
    ],
  },
  {
    version: '3.18.1', date: '2026-07-25', title: 'Perbaikan: Modal Edit Aset Ikut Tema Terang', tag: 'fix', impact: 'none',
    fixed: [
      'Pop-up saat mengedit aset — "Update Saldo Rekening", "Update Harga Terakhir", "Update Valuasi Aset", dan konfirmasi "Pencairan" aset — kini mengikuti tema Terang/Gelap yang Anda pilih. Sebelumnya kartu pop-up ini selalu tampil gelap walau mode Terang sedang aktif.',
    ],
  },
  {
    version: '3.18.0', date: '2026-07-25', title: 'Kategori Serba-Indonesia (Anggaran & Transaksi Sinkron)', tag: 'migration', impact: 'none',
    changed: [
      'Kategori Anggaran & Transaksi kini seragam Bahasa Indonesia. Dulu Anggaran memakai nama Inggris ("Food", "Housing", "Healthcare") sementara transaksi — terutama hasil impor — memakai Indonesia ("Makanan & Minuman", "Tempat Tinggal / KPR"), sehingga Budget vs Aktual tak terhitung. Sekarang keduanya Indonesia dan cocok otomatis.',
      'Pilihan kategori di form Tambah Transaksi, template impor (Excel/CSV), dan kategori Anggaran baku semuanya kini Bahasa Indonesia.',
    ],
    fixed: [
      'Budget vs Aktual kini langsung terisi untuk transaksi hasil impor — tanpa perlu menyamakan kategori manual lagi.',
    ],
    added: [
      'Migrasi otomatis & aman saat sinkron: kategori lama berbahasa Inggris di Anggaran maupun Transaksi diubah ke Indonesia lalu disimpan ke Google Sheet Anda. Idempoten (aman diulang), hanya menyentuh kategori baku, dan self-healing bila sempat gagal. Template Database yang masih Inggris pun ikut tersesuaikan otomatis pada login pertama.',
    ],
  },
  {
    version: '3.17.0', date: '2026-07-25', title: 'Samakan Kategori (Budget vs Aktual)', tag: 'feature', impact: 'none',
    added: [
      'Tombol "Samakan Kategori" di Anggaran — ganti nama kategori transaksi secara massal agar cocok dengan kategori Anggaran (mis. "Makanan & Minuman" → "Food"), supaya Budget vs Aktual ikut terhitung. Menampilkan hanya kategori yang belum cocok + jumlah transaksinya; sekali klik memperbarui semua transaksi (dan tersimpan ke Google Sheet).',
    ],
  },
  {
    version: '3.16.0', date: '2026-07-25', title: 'Perbaikan: Fixed Income (SBN/Deposito/P2P) Tersimpan', tag: 'migration', impact: 'appsscript',
    fixed: [
      'Menambah aset Pendapatan Tetap (SBN/Obligasi, Deposito, P2P) kini benar-benar tersimpan & tak hilang saat refresh. Sebelumnya tab-nya berupa "dashboard" berformat rumit yang tak kompatibel dengan penyimpanan langsung — sekarang pakai tabel data biasa (seperti Saham).',
    ],
    changed: [
      'Data Fixed Income kini disimpan di tab baru "FixedIncome" (tabel biasa). Holding lama di tab dashboard tetap terbaca (digabung otomatis). Pengguna mode Web App/Apps Script: perbarui Apps Script sekali dari Panduan. Pengguna Login-Google: otomatis, tanpa aksi.',
    ],
  },
  {
    version: '3.15.0', date: '2026-07-25', title: 'Perbaikan: Semua Data Benar-benar Tersimpan', tag: 'fix', impact: 'none',
    fixed: [
      'Menambah aset Pendapatan Tetap (SBN/Deposito/Obligasi) kini benar-benar tersimpan — sebelumnya bisa hilang setelah refresh karena tab-nya belum ada di spreadsheet Anda dan penyimpanan gagal diam-diam. Kini aplikasi otomatis membuat tab yang belum ada saat menyimpan.',
      'Tujuan, Proteksi (Asuransi), Transaksi Berulang & Dana Pensiun kini ditulis langsung ke Google Sheet milik Anda (bukan hanya di browser). Data lama otomatis dipindahkan ke Sheet Anda saat sinkron.',
      'Kegagalan menyimpan kini tampil sebagai peringatan "Gagal menyimpan", tidak lagi hilang diam-diam.',
    ],
  },
  {
    version: '3.14.0', date: '2026-07-25', title: 'Panduan Keamanan', tag: 'feature', impact: 'none',
    added: [
      'Topik baru "Keamanan" di Panduan — menjelaskan PIN Transaksi yang tersimpan per-browser/perangkat (set sekali, menempel permanen; tiap perangkat punya PIN sendiri), 2FA, Ubah Password, Sesi Aktif, plus model data zero-knowledge (semua di Google Sheet Anda, nol ke pengembang) & tips keamanan.',
    ],
  },
  {
    version: '3.13.1', date: '2026-07-25', title: 'Perbaikan: PIN Transaksi Tersimpan', tag: 'fix', impact: 'none',
    fixed: [
      'PIN Transaksi kini tersimpan permanen di browser yang Anda pakai — tidak lagi minta buat PIN baru tiap sesi. Sebelumnya PIN terhapus setiap sinkronisasi data karena tertimpa Settings dari Sheet.',
      'PIN kini bersifat lokal per-perangkat dan tak pernah ditimpa oleh sinkron (juga tak dikirim ke Sheet). Anda mungkin perlu set PIN sekali lagi setelah pembaruan ini — sesudah itu tersimpan tetap.',
    ],
  },
  {
    version: '3.13.0', date: '2026-07-25', title: 'Trik Impor: E-Statement → Template pakai AI', tag: 'feature', impact: 'none',
    added: [
      'Trik baru di Panduan › Transaksi › Impor: ubah e-statement bank apa pun ke format template DompetKu memakai AI (ChatGPT/Gemini/Claude).',
      'Tombol "Salin prompt" menyalin prompt siap-pakai yang sudah otomatis berisi daftar kategori & akun Anda sendiri — hasil AI langsung cocok, tinggal impor. Dilengkapi catatan privasi (data dikirim ke AI pihak ketiga, di luar DompetKu).',
    ],
  },
  {
    version: '3.12.0', date: '2026-07-25', title: 'Pratinjau Impor Lebih Jelas', tag: 'feature', impact: 'none',
    added: [
      'Pratinjau impor kini menampilkan Kategori & Akun tiap baris (di bawah keterangan) — jadi langsung kelihatan kolom-kolom itu terbaca dari file, tanpa perlu impor dulu.',
    ],
    changed: [
      'Template impor disederhanakan: kolom "Catatan" dihilangkan karena tidak ikut tersimpan (transaksi DompetKu belum punya field catatan). File template lama tetap aman diimpor — kolom tak dikenal diabaikan.',
    ],
  },
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
