# PRD Fase 1 — Quick Wins (client-side, tanpa migrasi template)

> Prasyarat: baca `docs/prd/README.md`. Semua fitur fase ini TIDAK menambah tab sheet
> dan TIDAK mengubah Apps Script → user existing langsung kebagian saat app di-deploy.
> Urutan pengerjaan yang disarankan: F1.1 → F1.2 → F1.3 → F1.4 → F1.5.

---

## F1.1 Kalkulator Zakat Maal  `[effort: M]`

### Ringkasan & rationale
Fitur pembeda untuk pasar Indonesia. Semua data yang dibutuhkan sudah ada di store
(akun likuid, emas/perhiasan, investasi, utang). Nilai jual: DompetKu satu-satunya
tracker yang menghitung zakat langsung dari neraca user.

### User stories
- Sebagai muslim, saya ingin tahu apakah harta saya sudah mencapai nisab dan berapa zakat maal saya, tanpa menghitung manual.
- Saya ingin memilih sendiri kelas aset mana yang dihitung (karena ada perbedaan pendapat fikih).

### Penempatan & UX
- Kartu pemicu di halaman **Laporan** (`FinanceAnalytics.tsx`), bersebelahan dengan kartu Target Dana Darurat (pola `FinanceEmergencyModal`): ikon `mosque`/`volunteer_activism`, label "Kalkulator Zakat Maal".
- Modal baru `FinanceZakatModal.tsx` (pola visual `TaxGuideModal`), 3 bagian dalam satu scroll:
  1. **Parameter**: input `Harga emas / gram (Rp)` — prefill dari Settings key `zakat_goldPricePerGram` (default `1900000`), editable, tombol simpan ke Settings.
  2. **Checklist aset zakatable** — daftar kelas aset + nilai agregat + toggle:
     | Kelas | Sumber data | Default |
     |---|---|---|
     | Kas & rekening bank | `accounts` (type bank/cash/wallet) Σ balance | ✅ on |
     | Emas & logam mulia | `assets` kategori `koleksi` subType `perhiasan` (dan title mengandung emas/gold) Σ currentValue | ✅ on |
     | Saham | assets subType `saham` Σ currentValue | ✅ on |
     | Reksadana | subType `reksadana` Σ currentValue | ✅ on |
     | Kripto | subType `kripto` Σ currentValue | ✅ on (opini kontemporer) |
     | Pendapatan tetap (SBN/deposito/P2P) | kategori `investasi` sisanya Σ currentValue | ✅ on |
     | Properti & kendaraan pakai | assets `real-estat`/`kendaraan` | ❌ off (bukan objek zakat bila dipakai) |
     Toggle terakhir user disimpan ke Settings (`zakat_include_saham` dst.) agar konsisten antarsesi.
  3. **Pengurang**: "Utang jatuh tempo dekat" — prefill Σ `balance` debts bertipe `Kartu Kredit` + `Lainnya`(paylater) + Σ `minPayment` 1 bulan utang lain; field editable.
- **Hasil** (kartu besar): Total harta zakatable · Nisab (= 85 × hargaEmas) · Status (badge "Mencapai Nisab" / "Belum") · **Zakat = 2,5% × (zakatable − pengurang)** bila ≥ nisab.
- Catatan haul: teks statis "Zakat wajib bila harta bertahan di atas nisab selama 1 haul (±354 hari)". V1 TIDAK melacak haul otomatis (out of scope).
- Footer: `FinanceGuidePrinciple`-style disclaimer + link `https://baznas.go.id` (rel noopener).

### Rumus
```
nisab        = 85 × hargaEmasPerGram
zakatable    = Σ (kelas aset yang di-toggle on)
dasarZakat   = max(0, zakatable − utangJangkaPendek)
wajib        = dasarZakat ≥ nisab
zakat        = wajib ? 0.025 × dasarZakat : 0
```

### Edge cases
- Tidak ada data aset → tampilkan empty state edukatif, bukan angka 0 mentah.
- Harga emas ≤ 0 → tolak, pakai default.
- Settings belum sync (offline) → tetap jalan dengan default; simpan preferensi best-effort.

### Acceptance criteria
- [ ] Toggle kelas aset mengubah hasil secara live dan tersimpan di Settings.
- [ ] Nisab & zakat terformat id-ID; status badge benar di sekitar ambang nisab (uji ± Rp 1).
- [ ] Disclaimer edukasi tampil; tidak ada kata "wajib bayar sekarang" yang bersifat perintah.
- [ ] Dark mode & mobile rapi.

---

## F1.2 Kalender Keuangan  `[effort: M]`

### Ringkasan & rationale
Data jatuh tempo sudah tercatat (utang `dueDate`, obligasi/deposito/P2P `maturityDate`,
pengingat valuasi) tapi tersebar. Finance person berpikir dalam *timeline kewajiban*.

### Penempatan & UX
- Seksi baru **"Kalender Keuangan"** di `FinanceNotifications.tsx`, di bawah banner pengumuman, di atas "Peringatan". Header ikon `calendar_month`.
- List event 60 hari ke depan, dikelompokkan: **Minggu Ini / Bulan Ini / Mendatang**. Tiap baris: tanggal (badge dd MMM), ikon, judul, subjudul nominal/keterangan, klik → navigate ke modul terkait.
- Empty state: "Tidak ada agenda keuangan 60 hari ke depan 🎉".

### Sumber event (semua derived client-side, `useMemo`)
| Event | Sumber | Aturan |
|---|---|---|
| Jatuh tempo cicilan | `debts` status Aktif, `dueDate` (1–31) | occurrence bulanan berikutnya; subjudul `minPayment` |
| Jatuh tempo obligasi/deposito/P2P | assets kategori investasi dengan `maturityDate` | tanggal tersebut bila ≤ 60 hari; subjudul principal |
| Pengingat valuasi | accounts/assets `valuationReminder && lastValuationUpdate > 90 hari` | tampil sebagai "perlu update", tanggal = hari ini |
| Batas SPT Tahunan | statis 31 Maret tahun berjalan | tampil mulai 1 Feb; klik → buka `TaxGuideModal` |

Utility `nextOccurrence(dayOfMonth)` — clamp hari 29–31 ke akhir bulan pendek.

### Acceptance criteria
- [ ] Event tersortir naik; grouping benar melintasi pergantian bulan/tahun.
- [ ] `dueDate=31` di Februari jatuh di 28/29 (uji unit kecil di util).
- [ ] Klik event menavigasi (`onNavigate('debts' | 'assets')`) dan menutup panel bila dipanggil dari overlay.
- [ ] Tidak ada duplikat dengan seksi "Peringatan" yang sudah ada (valuasi stale boleh tetap di Peringatan; di kalender cukup ringkas — pilih satu, dokumentasikan pilihanmu di kode).

---

## F1.3 Ekspor Lampiran Harta SPT  `[effort: M]`

### Ringkasan & rationale
Tiap Maret user menyalin manual asetnya ke e-Filing (Lampiran IV / Daftar Harta).
DompetKu sudah tahu semua aset + `TaxGuideModal` sudah memuat konsep kode harta.
**Prinsip pajak penting: nilai yang dilaporkan = HARGA PEROLEHAN (purchasePrice), bukan nilai pasar.**

### Penempatan & UX
- Tombol "Ekspor Daftar Harta (SPT)" di `TaxGuideModal` footer + di halaman Aset (dekat Unduh Laporan).
- Membuka view tabel (modal lebar / halaman print) berisi SEMUA aset + akun:
  Kolom: `Kode Harta` (dropdown editable) · `Nama Harta` · `Tahun Perolehan` (dari purchaseDate/startDate) · `Harga Perolehan (Rp)` (editable utk akun: prefill balance) · `Keterangan` (lokasi/platform).
- Aksi: **Salin CSV**, **Cetak** (pola `FinancePrintableLedger` via store `printType` — tambah tipe `'spt'`), tombol per baris "kecualikan".

### Mapping kode harta default (verifikasi ke daftar resmi DJP saat implementasi; selaraskan dengan kode yang sudah dipakai `TaxGuideModal`)
| Aset di app | Kode | Nama resmi |
|---|---|---|
| Uang tunai (account type cash) | 011 | Uang tunai |
| Tabungan/bank/e-wallet | 012 | Tabungan |
| Deposito | 014 | Deposito |
| Saham | 031 | Saham dibeli untuk dijual kembali |
| Obligasi korporasi | 033 | Obligasi perusahaan |
| SBN (ORI/SR/ST/FR) | 034 | Obligasi pemerintah |
| Reksadana | 036 | Reksadana |
| Kripto, P2P | 039 | Investasi lainnya |
| Sepeda motor | 042 | Sepeda motor |
| Mobil | 043 | Mobil |
| Emas/perhiasan | 051 | Logam mulia |
| Elektronik/furnitur | 055 | Peralatan elektronik & furnitur |
| Rumah/tanah tinggal | 061 | Tanah & bangunan tempat tinggal |
⚠️ `TaxGuideModal` saat ini menulis SBN=032 & deposito=012 — REKONSILIASIKAN (pakai tabel resmi, perbarui modal sekalian, catat di commit message).

### Acceptance criteria
- [ ] Semua aset & akun muncul dengan kode default benar; kode bisa dioverride per baris.
- [ ] Nilai = harga perolehan (BUKAN market value); ada catatan kecil menjelaskan ini.
- [ ] CSV valid (quoted, id-ID tanpa pemisah ribuan di angka), print view bersih 1 halaman A4 portrait/landscape.
- [ ] Baris "kecualikan" tidak ikut CSV/print.

---

## F1.4 Tabel Amortisasi + Konverter Bunga Flat↔Efektif  `[effort: S-M]`

### Ringkasan & rationale
Bunga flat 1%/bln ≈ efektif ±1,8×-nya — jebakan umum kredit Indonesia. DompetKu sudah
menyimpan `interestType` (Fixed/Flat vs Floating/Efektif) tapi tidak mengedukasi dampaknya.

### Penempatan & UX
- Di `FinanceDebts.tsx`: aksi baru per utang "Tabel Amortisasi" → modal `DebtAmortizationModal.tsx`.
- Bagian atas: ringkasan (pokok, bunga, tenor, tipe bunga) + **konverter**: input rate flat p.a. + tenor → tampilkan rate efektif p.a. (dan sebaliknya).
- Bagian bawah: tabel per bulan `# | Angsuran | Pokok | Bunga | Sisa Pokok` (scroll container, `tabular-nums`), footer total bunga dibayar.

### Rumus
```
r  = rateEfektifTahunan / 12 / 100        // bunga efektif bulanan
n  = tenorBulan
Anuitas (efektif): M = P × r / (1 − (1+r)^−n)   ; bunga_t = saldo × r ; pokok_t = M − bunga_t
Flat:              bunga_t = P × (rateFlatTahunan/12/100)  (konstan) ; pokok_t = P/n ; M = pokok_t + bunga_t

Konversi flat→efektif: cari r sehingga  P×r/(1−(1+r)^−n) = M_flat  → bisection r∈(0, 1), 60 iterasi.
Aproksimasi pembanding (tampilkan sebagai "≈"): r_eff ≈ r_flat × 2n/(n+1).
```
- Untuk utang existing: jika `interestType='Fixed/Flat'` tampilkan KEDUA skenario (flat aktual + ekuivalen efektifnya) — inilah momen edukasinya.

### Acceptance criteria
- [ ] Baris terakhir tabel: sisa pokok = 0 (±Rp 1 pembulatan).
- [ ] Konverter dua arah konsisten (flat→efektif→flat kembali ±0,01%).
- [ ] Sanity: flat 12% p.a., 12 bln ≈ efektif ±21,5% p.a. (uji tertulis di kode/komentar).
- [ ] Disclaimer: hasil = simulasi matematis, angka bank bisa berbeda (biaya admin/asuransi).

---

## F1.5 Rekonsiliasi Saldo  `[effort: S-M]`

### Ringkasan & rationale
Hygiene akuntansi: saldo tercatat sering "basi" karena transaksi lupa dicatat, padahal
tidak ada konsep saldo awal di data. Solusi pragmatis: wizard penyesuaian + deteksi basi.

### Penempatan & UX
- Di halaman **Aset** (`FinanceAssets.tsx`), aksi per akun likuid: "Rekonsiliasi" → modal `AccountReconcileModal.tsx`:
  1. Tampilkan `Saldo tercatat` (accounts.balance) + `lastValuationUpdate`.
  2. Input `Saldo riil di bank/aplikasi sekarang`.
  3. Tampilkan `Selisih = riil − tercatat` (warna hijau/merah).
  4. Dua aksi: **"Perbarui saldo saja"** (updateAccount balance + lastValuationUpdate=today) atau **"Buat transaksi penyesuaian"** (addTransaction: amount=selisih, desc=`Penyesuaian Saldo (rekonsiliasi)`, category=`Lainnya` bila kategori `Penyesuaian` tidak ada, type sesuai tanda) LALU update balance. Keduanya eksplisit, tidak otomatis.
- Deteksi basi (badge kecil di kartu akun): `ada transaksi akun tsb setelah lastValuationUpdate` ATAU `lastValuationUpdate > 45 hari` → badge "Perlu rekonsiliasi".

### Acceptance criteria
- [ ] Selisih 0 → kedua tombol aksi disabled dengan pesan "sudah sinkron ✓".
- [ ] Transaksi penyesuaian muncul di Log Transaksi dan tersinkron ke sheet (uji dengan sheet demo).
- [ ] Badge basi hilang setelah rekonsiliasi.
- [ ] Tidak menyentuh akun non-likuid/investasi (punya alur valuasi sendiri).
