# Changelog DompetKu

Semua perubahan penting pada aplikasi DompetKu dicatat di sini.
Format mengikuti [Keep a Changelog](https://keepachangelog.com/), penomoran [SemVer](https://semver.org/lang/id/).

> **Kompatibilitas Google Sheet / Apps Script:** setiap rilis diberi tanda apakah pengguna
> lama perlu memperbarui Apps Script / template mereka. Rilis **Client-side** tidak butuh
> tindakan apa pun — cukup buka aplikasi.

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
