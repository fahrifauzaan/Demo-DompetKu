# Changelog DompetKu

Semua perubahan penting pada aplikasi DompetKu dicatat di sini.
Format mengikuti [Keep a Changelog](https://keepachangelog.com/), penomoran [SemVer](https://semver.org/lang/id/).

> **Kompatibilitas Google Sheet / Apps Script:** setiap rilis diberi tanda apakah pengguna
> lama perlu memperbarui Apps Script / template mereka. Rilis **Client-side** tidak butuh
> tindakan apa pun — cukup buka aplikasi.

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
