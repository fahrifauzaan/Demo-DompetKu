# Changelog DompetKu

Semua perubahan penting pada aplikasi DompetKu dicatat di sini.
Format mengikuti [Keep a Changelog](https://keepachangelog.com/), penomoran [SemVer](https://semver.org/lang/id/).

> **Kompatibilitas Google Sheet / Apps Script:** setiap rilis diberi tanda apakah pengguna
> lama perlu memperbarui Apps Script / template mereka. Rilis **Client-side** tidak butuh
> tindakan apa pun — cukup buka aplikasi.

---

## [2.4.0] — 2026-07-23 · Auto-post + Goal Linking (Wave C)

**Dampak Google Sheet/Apps Script: TIDAK ADA.** Client-side; goal-link disimpan via tag di
kolom `notes` yang sudah ada (tanpa migrasi).

### Ditambahkan
- **Auto-post transaksi berulang (opt-in)** — toggle "Posting otomatis" per item berulang.
  Saat aplikasi dibuka, item ber-`autoPost` yang jatuh tempo langsung dicatat otomatis, LALU
  muncul **digest ringkasan** (daftar + net) agar tetap sepengetahuan user — bukan penulisan
  diam-diam. Badge "Auto" pada daftar. (`AutoPostRunner.tsx`)
- **Penautan Tujuan ↔ akun/aset** — pada form Tujuan, pilih "Tautkan progres ke" sebuah akun
  atau aset investasi. Progres "terkumpul" tujuan lalu **mengikuti saldo tertaut otomatis**
  (tak perlu update manual); kartu menampilkan badge "Tertaut ke …". Tautan disimpan sebagai
  tag `[link:<id>]` di `notes` (di-strip dari tampilan) → tanpa migrasi Apps Script.
  (`goalUtils` parse/encode link)

---

## [2.3.0] — 2026-07-23 · Indikator Penyimpanan Global

**Dampak Google Sheet/Apps Script: TIDAK ADA.** Sisi-aplikasi.

### Ditambahkan
- **Indikator loading penyimpanan global** — setiap aksi yang menulis ke Google Sheets
  (tambah/ubah/hapus transaksi, aset, utang, tujuan, transaksi berulang, asuransi, jual aset,
  pengaturan, dsb.) kini menampilkan pil status: **"Menyimpan ke Google Sheets…"** (dengan
  spinner) selama proses, **"Tersimpan"** saat selesai, atau **"Gagal menyimpan…"** bila error.
  Diinstrumentasi terpusat di `postToSheet` (satu titik) + counter `pendingWrites`/`saveError`
  di store → berlaku OTOMATIS untuk seluruh fitur tanpa menyentuh tiap tombol. (`SaveIndicator.tsx`)
- Senyap di mode demo tak tersambung (tak ada penulisan nyata), jadi tak ada indikator palsu.

---

## [2.2.0] — 2026-07-23 · Jual Aset + Realized Gain (Wave B)

**Dampak Google Sheet/Apps Script: TIDAK ADA.** Client-side; penjualan tercatat sebagai
transaksi biasa (tab Transactions).

### Ditambahkan
- **Jual Aset first-class** — tombol "Jual" pada kartu holding saham/reksadana. Modal jual:
  pilih jumlah unit (parsial/semua) + harga jual + akun tujuan → otomatis (a) membuat transaksi
  PEMASUKAN kategori "Capital Gain" (saldo akun bertambah), dan (b) memangkas holding
  (unit/pokok/nilai) atau menandai "Terjual" bila habis — atomik dalam satu aksi.
- **Laporan Realized Gain** (Aset › Analisis Investasi) — ringkasan hasil jual, modal, dan
  realized gain/loss + daftar transaksi penjualan. Cost basis memakai **average cost** (standar
  broker ritel; FIFO ketat butuh pelacakan lot — di backlog). (`realizedGainUtils.ts`,
  `RealizedGainCard.tsx`, `AssetSellModal.tsx`)

### Catatan
- Logika inti diuji unit (cost tag round-trip, realized gain/loss, agregasi). UI penjualan
  belum bisa diverifikasi otomatis di sesi demo lokal (data demo tak tersambung tak punya
  holding ber-subType) — verifikasi visual disarankan pada akun tersambung.

---

## [2.1.0] — 2026-07-23 · Polish (Wave A)

**Dampak Google Sheet/Apps Script: TIDAK ADA** (untuk fitur aplikasi). Sisi-aplikasi saja.

### Ditambahkan
- **Panduan in-app** kini punya topik **Tujuan** (konsep, template, PMT/setoran ideal, sinking fund,
  FAQ) dan **Proteksi** (piramida CFP, jenis asuransi, kalkulator UP jiwa, FAQ) — lengkap dengan
  callout CFP®/CFA® seperti topik lain.

### Template (untuk pengguna BARU)
- Master template diperbarui ke **v3** (`scratch/dompetku_template_v3.xlsx` + starter) — sudah
  berisi tab `Goals`/`Recurring`/`Insurance` + baris contoh, header 100% cocok dengan `HEADERS[]`
  (diaudit). Pengguna baru yang menyalin template langsung punya 3 tab tersebut. (Pengguna lama tetap
  aman: tab dibuat otomatis oleh `ensureSheetExists` — tak perlu file ini.)

---

## [2.0.0] — 2026-07-22 · Fase 2: Inti Perencanaan ⭐ (migrasi template)

**Dampak Google Sheet/Apps Script: YA — pengguna lama WAJIB memperbarui Apps Script sekali.**
Menambah 3 tab: `Goals`, `Recurring`, `Insurance`. Berkat `ensureSheetExists()` di Apps Script,
tab **dibuat otomatis** saat pertama diakses — pengguna TIDAK perlu mengedit spreadsheet, dan
data lama tetap aman. Langkah update ada di halaman Panduan (salin kode → Deploy new version).

### Ditambahkan
- **Tujuan Keuangan** (menu baru "Tujuan") — target + tenggat dengan setoran bulanan ideal (PMT)
  dihitung otomatis, badge On/Off-Track, ringkasan komitmen vs sisa kas, preset (DP Rumah,
  Pendidikan, Pensiun, Dana Darurat), dan **Sinking Fund** (THR/pajak/qurban) di seksi terpisah.
- **Transaksi Berulang + Proyeksi Arus Kas** — kelola dari Transaksi ("Berulang"), pengingat
  jatuh tempo dengan **posting satu-ketuk** (tanpa auto-post diam-diam), dan grafik proyeksi
  saldo 30/60/90 hari di Dasbor dengan peringatan "kas minus".
- **Proteksi/Asuransi** (seksi di Aset) — registry polis (no. polis tersamar •••1234), premi/bln,
  rasio premi, badge renewal < 30 hari, + **Kalkulator Kebutuhan UP Jiwa** (income replacement
  8–12× & metode pengeluaran+utang) dengan analisis kesenjangan proteksi.
- Jatuh tempo cicilan berulang & renewal asuransi otomatis muncul di **Kalender Keuangan**.

### Backend (Apps Script)
- `HEADERS` untuk `Goals`/`Recurring`/`Insurance` + `AUTO_CREATE_SHEETS` + `ensureSheetExists()`
  yang membuat tab+header otomatis; dipanggil di `readSheet`/`append`/`update`/`delete` khusus tab
  baru; `VALID_SHEETS` menyertakan ketiganya (agregasi `doGet`). Perilaku tab lama tidak berubah.

### Migrasi untuk pengguna lama
1. Buka Panduan → salin Apps Script terbaru. 2. Extensions → Apps Script → tempel → Deploy →
Manage deployments → Edit → New version. 3. Selesai — buka DompetKu, tab baru terbuat sendiri.

---

## [1.2.0] — 2026-07-22 · Fase 3: Kedalaman Investor

**Dampak Google Sheet/Apps Script: TIDAK ADA.** Semua fitur sisi-aplikasi; konfigurasi
opsional (kurs USD, target alokasi) disimpan di tab `Settings` yang sudah ada. Pengguna
lama otomatis mendapatkannya begitu aplikasi dibuka.

### Ditambahkan
- **Skor Kesehatan Finansial Komposit** (Laporan › Ringkasan) — satu angka 0–100 dari 6 rasio
  (dana darurat, tingkat tabungan, DTI, solvabilitas, diversifikasi, likuiditas) dengan gauge,
  rincian bobot transparan, dan "1 langkah paling berdampak". Band: Rentan/Cukup/Sehat/Prima.
- **Imbal Hasil Portofolio (XIRR)** (Laporan › Sektoral) — return tahunan tertimbang-uang per
  holding + agregat, toggle XIRR/Sederhana, kartu Unrealized P/L & Income diterima; badge N/A
  saat data belum cukup.
- **Kalender Pendapatan Pasif** (Laporan › Sektoral) — proyeksi kupon bersih 12 bulan ke depan
  (bar per bulan + rincian), rata-rata/bulan & rasio menutup pengeluaran; estimasi dividen historis.
- **Rebalancing Advisor** (Laporan › Diversifikasi) — editor target alokasi (Σ=100) tersimpan,
  tabel drift Aktual vs Target + status & saran ±Rp. Edukatif, tanpa tombol eksekusi.
- **Multi-currency (fondasi USD)** — kurs `USDIDR_RATE` + daftar `usd_tickers` di Preferensi;
  akun/aset USD (mis. VTI/SPY atau tag `[USD]`) dikonversi ke IDR pada net worth. Aset IDR tak berubah.

### Catatan
- Konversi USD diterapkan pada agregat net worth utama (Dasbor & Laporan). Konfigurasi kurs kini
  manual/GOOGLEFINANCE; penautan otomatis penuh menyusul pada migrasi template (v2.0).

---

## [1.1.0] — 2026-07-22 · Fase 1: Quick Wins

**Dampak Google Sheet/Apps Script: TIDAK ADA.** Semua fitur murni sisi-aplikasi. Pengguna
lama otomatis mendapatkannya begitu aplikasi dibuka — tanpa update Apps Script/template.

### Ditambahkan
- **Kalkulator Zakat Maal** (Laporan) — hitung zakat 2,5% langsung dari neraca (kas, emas,
  saham, reksadana, kripto, pendapatan tetap), nisab 85 g emas, pengurang utang jangka pendek,
  toggle kelas aset tersimpan, disclaimer + tautan BAZNAS.
- **Kalender Keuangan** (Notifikasi) — timeline 60 hari: jatuh tempo cicilan, jatuh tempo
  obligasi/deposito/P2P, dan batas SPT; dikelompokkan Minggu Ini / Bulan Ini / Mendatang.
- **Ekspor Daftar Harta (SPT)** (Aset & Panduan Pajak) — tabel Lampiran IV siap e-Filing:
  kode harta resmi DJP (bisa diubah), tahun & harga perolehan, ekspor CSV + Cetak/PDF,
  baris bisa dikecualikan. Nilai memakai **harga perolehan**, bukan nilai pasar.
- **Tabel Amortisasi + Konverter Bunga Flat↔Efektif** (Rencana Utang) — jadwal angsuran
  per bulan (pokok/bunga/sisa) dan edukasi bahwa bunga "flat" setara bunga efektif yang jauh
  lebih tinggi.
- **Rekonsiliasi Saldo** (Aset) — samakan saldo tercatat dengan saldo riil bank: perbarui
  saldo saja atau buat transaksi penyesuaian; badge "Perlu rekonsiliasi" untuk akun basi (>45 hari).

### Diperbaiki
- **Kode Harta Pajak (Panduan Pajak)** direkonsiliasi ke daftar resmi DJP:
  SBN/Obligasi Pemerintah `032 → 034`, Deposito `012 → 014` (Tabungan tetap `012`).

---

## [1.0.0] — 2026-07 · Rilis dasar

- Pencatatan transaksi, anggaran, aset (likuid, investasi, fisik), utang, laporan & analitik.
- Sinkronisasi per-pengguna via Google Sheets + Google Apps Script.
- Migrasi hosting ke `dompetku.bantu-umkm.tech` (Hostinger) + mode demo `demo.bantu-umkm.tech`.
- Perbaikan template (kolom Reksadana) + pusat Panduan in-app.
