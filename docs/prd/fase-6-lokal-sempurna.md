# Fase 6 — Lokal Sempurna: Pajak & Zakat Indonesia 🇮🇩

> Baca [`roadmap-lanjutan.md`](./roadmap-lanjutan.md) + [`README.md`](./README.md) dulu.
> **Sifat fase:** client-side + pembaruan **Panduan** (konten pajak). Parameter tarif/PTKP di `Settings` atau
> konstanta ter-versi. Target rilis: **v3.3**. Menyambung `TaxGuideModal` & Ekspor Harta SPT (v1.1).

**Tujuan fase:** jadikan DompetKu **paling lengkap untuk wajib pajak & muzakki Indonesia** — sesuatu yang tak
dimiliki aplikasi finance global. Semua **edukasi/estimasi**, bukan pengganti konsultan pajak atau amil resmi.

> ⚠️ **Kepatuhan penting:** tarif PPh, PTKP, dan aturan dapat berubah tiap tahun. Simpan semua tarif/ambang
> sebagai **konstanta ber-tahun** (mis. `TAX_TABLE_2026`) + tampilkan "berlaku tahun pajak 20XX, verifikasi ke DJP."
> Jangan hardcode diam-diam. Semua fitur berdisclaimer & parameter bisa diubah user.

---

## F6.1 — Estimator PPh 21 Tahunan (Pajak Penghasilan Orang Pribadi)

**Masalah.** User tahu penghasilan bulanan (`monthlyIncome` di Settings) tapi tak punya alat menghitung
**estimasi PPh 21 tahunan**, membandingkannya dengan potongan yang sudah dilakukan pemberi kerja, atau
menyiapkan angka SPT.

**Solusi.** Kalkulator PPh 21 OP:
- Input: penghasilan bruto/tahun (auto dari transaksi PEMASUKAN kategori gaji, atau manual), status **PTKP**
  (TK/K + jumlah tanggungan 0–3), pengurang (biaya jabatan, iuran pensiun/JHT, zakat via lembaga resmi).
- Hitung: Penghasilan Neto → PTKP → PKP → **PPh terutang** (lapisan progresif 5/15/25/30/35%).
- **Rekonsiliasi:** PPh terutang vs total potongan bulanan → **kurang/lebih bayar** estimasi.
- Skenario "gaji ke-13/THR" & bonus (dampak ke lapisan tarif).

**User story.** *"Berapa estimasi pajak penghasilan saya tahun ini, dan apakah potongan kantor sudah pas?"*

**Spesifikasi teknis.**
- `pph21Utils.ts`: konstanta `PTKP_2026`, `TAX_BRACKETS_2026` (progresif), `biayaJabatan` (5% maks Rp6jt/th),
  `computePph21({grossAnnual, ptkpStatus, deductions})`. Semua ber-tahun & mudah di-update.
- `Pph21CalculatorModal.tsx` — pola `TaxGuideModal` (modal edukasi bertab: Input · Hasil · Rincian lapisan · Rekonsiliasi).
- Pemicu dari Laporan/Panduan Pajak; status PTKP & angka tersimpan di `Settings` (`tax_ptkp_status`, dll.).

**Dampak data/Apps Script.** TIDAK ADA.

**Framing edukasi.** WAJIB: "estimasi tahun pajak 2026, bukan perhitungan resmi; konsultasikan ke DJP/konsultan."

**Upaya.** Sedang. **Dampak.** Sangat tinggi (unik & bernilai tinggi bagi karyawan/pengusaha ID).

---

## F6.2 — Zakat Penghasilan + Pelacak Haul

**Masalah.** Zakat **Maal** (v1.1) menghitung zakat harta sekali jalan, tapi belum ada **zakat penghasilan**
(profesi) bulanan/tahunan, dan tak ada pelacak **haul** (siklus 1 tahun hijriah) untuk zakat maal.

**Solusi.**
- **Zakat Penghasilan:** 2,5% dari penghasilan (bruto atau neto setelah kebutuhan pokok — beri opsi + penjelasan
  kedua mazhab), bisa dihitung **per bulan** (dari pemasukan) atau tahunan; bandingkan dengan nisab.
- **Pelacak Haul:** tandai tanggal harta mencapai nisab → kalkulator ingatkan saat **haul (± 354 hari)** jatuh untuk zakat maal;
  masuk ke Kalender Keuangan (v1.1).
- Integrasi ke PPh 21 (F6.1): zakat via lembaga resmi = pengurang penghasilan bruto.

**User story.** *"Hitung zakat penghasilan bulanan saya otomatis, dan ingatkan saat haul zakat harta tiba."*

**Spesifikasi teknis.**
- Perluas `zakatUtils.ts`: `zakatPenghasilan({income, method:'bruto'|'neto', nishonGold})`, `haulDueDate(startDate)`.
- `ZakatPenghasilanCard.tsx` / tab baru di modal Zakat yang ada; parameter (harga emas nisab, metode) di `Settings`.
- Umpan haul ke `calendarUtils` (sumber event Kalender Keuangan).

**Dampak data/Apps Script.** TIDAK ADA.

**Framing edukasi.** Disclaimer + tautan BAZNAS; sebut perbedaan pendapat (bruto vs neto) tanpa menggurui.

**Upaya.** Rendah–Sedang (menyambung zakat & kalender yang ada). **Dampak.** Tinggi (relevansi kultural).

---

## F6.3 — SPT Tahunan Lengkap (Harta + Penghasilan + Utang)

**Masalah.** Ekspor SPT saat ini hanya **Daftar Harta (Lampiran IV)**. SPT 1770/1770S butuh juga ringkasan
**penghasilan, PPh terpotong, dan daftar utang** — user masih menyusunnya manual.

**Solusi.** Perluas modul Ekspor SPT jadi paket:
- **Daftar Harta** (sudah ada) · **Daftar Utang/Kewajiban** (dari tab Debts: nama pemberi pinjaman, tahun, saldo) ·
  **Ringkasan Penghasilan & PPh** (dari F6.1) · lembar bantu isian angka ke e-Filing.
- Ekspor CSV + Cetak/PDF per bagian, dengan catatan kode/format DJP.

**User story.** *"Siapkan semua angka SPT saya — harta, utang, penghasilan, pajak — siap ketik ke e-Filing."*

**Spesifikasi teknis.**
- Perluas `sptUtils.ts` + `FinanceSPTExportModal.tsx`/`FinancePrintableSPT.tsx` (tambah section Utang & Penghasilan; reuse `printType:'spt'`).
- Daftar utang dari tab `Debts` yang ada; penghasilan/PPh dari `pph21Utils` (F6.1).

**Dampak data/Apps Script.** TIDAK ADA.

**Framing edukasi.** "Alat bantu susun angka, bukan pelaporan resmi; pelaporan tetap via DJP Online."

**Upaya.** Sedang. **Dampak.** Sedang–Tinggi (melengkapi fitur SPT yang sudah dicintai).

---

## F6.4 — Perencanaan Pajak (Tax Planning, edukatif)

**Masalah.** User hanya melihat pajak setelah fakta. Tak ada alat "bagaimana mengoptimalkan (legal) beban pajak."

**Solusi.** Panel edukatif + simulasi:
- Dampak **pengurang legal**: zakat/donasi via lembaga resmi, iuran pensiun/DPLK, biaya jabatan.
- Simulasi **THR/bonus** terhadap lapisan tarif (kapan bonus mendorong ke bracket lebih tinggi).
- Checklist akhir tahun & pengingat tenggat SPT (ke Kalender Keuangan).

**User story.** *"Langkah legal apa sebelum tutup tahun yang bisa menurunkan pajak saya?"*

**Spesifikasi teknis.**
- `TaxPlanningCard.tsx` memakai `pph21Utils` (F6.1) untuk simulasi delta; konten edukasi di Panduan Pajak.
- Tenggat SPT (31 Mar OP) feed ke `calendarUtils`.

**Dampak data/Apps Script.** TIDAK ADA.

**Framing edukasi.** WAJIB kuat: "penghindaran pajak legal (tax planning) ≠ penggelapan; ini edukasi umum."

**Upaya.** Rendah–Sedang (bergantung F6.1). **Dampak.** Sedang.

---

### Catatan integrasi Fase 6
- **F6.1 (PPh 21) adalah fondasi** F6.3 & F6.4 — kerjakan lebih dulu.
- Perbarui **Panduan Pajak** in-app + halaman `panduan.bantu-umkm.tech` (konten, bukan Apps Script — tak perlu user update script).
- Semua tarif/PTKP sebagai konstanta ber-tahun; siapkan proses update tahunan (mis. `TAX_TABLE_<tahun>`).
