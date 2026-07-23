# Changelog DompetKu

Semua perubahan penting pada aplikasi DompetKu dicatat di sini.
Format mengikuti [Keep a Changelog](https://keepachangelog.com/), penomoran [SemVer](https://semver.org/lang/id/).

> **Kompatibilitas Google Sheet / Apps Script:** setiap rilis diberi tanda apakah pengguna
> lama perlu memperbarui Apps Script / template mereka. Rilis **Client-side** tidak butuh
> tindakan apa pun — cukup buka aplikasi.

---

## [3.6.0] — 2026-07-23 · Investor Pro: DCA & DRIP (Fase 7 · Gelombang 6)

**Dampak Google Sheet/Apps Script: TIDAK ADA.** Client-side.

### Ditambahkan
- **Perencana Investasi** (Laporan) — dua alat edukatif:
  - **DCA (nabung rutin)** — simulasi setoran berkala (bulanan/mingguan): total disetor, nilai
    akhir, keuntungan, + grafik akumulasi. Menekankan disiplin di atas timing.
  - **DRIP (reinvestasi dividen/kupon)** — bandingkan nilai akhir bila dividen direinvestasi vs
    diambil tunai, memvisualkan kekuatan bunga-berbunga. (`dcaUtils.ts`, `DcaPlannerModal.tsx`)

> Catatan: benchmark vs IHSG ditunda (tumpang tindih dengan kartu XIRR yang sudah ada + butuh
> data indeks live yang rapuh).

---

## [3.5.0] — 2026-07-23 · Utang Cerdas (Fase 7 · Gelombang 5)

**Dampak Google Sheet/Apps Script: TIDAK ADA.** Client-side.

### Ditambahkan
- **Kartu Kesehatan Utang** (Rencana Utang) — melengkapi Simulasi Akselerasi yang sudah ada dengan:
  **rasio DTI** (cicilan/penghasilan, zona sehat ≤35% / waspada / bahaya), **perkiraan tanggal
  bebas-utang**, **total bunga**, dan **urutan pelunasan** (metode avalanche). Mendeteksi kondisi
  "cicilan tak menutup bunga". (`debtStrategyUtils.ts` simulasi snowball/avalanche rollover, `DebtHealthCard.tsx`)

---

## [3.4.0] — 2026-07-23 · Dana Pensiun Indonesia (Roadmap Jilid 2 · Gelombang 4)

**Dampak Google Sheet/Apps Script: YA — pengguna lama perlu memperbarui Apps Script sekali.**
Menambah 1 tab: `Retirement`. Berkat `ensureSheetExists()`, tab **dibuat otomatis** saat pertama
diakses. Salin Apps Script terbaru dari Panduan → Deploy → New version. Data lama aman.

### Ditambahkan
- **Dana Pensiun** (Aset) — registry program pensiun Indonesia: **BPJS Ketenagakerjaan (JHT/JP)**,
  **DPLK/DPPK**. Catat saldo, iuran karyawan & pemberi kerja, usia target, return asumsi → lihat
  **proyeksi saldo saat pensiun** + total masuk net worth. (`FinanceRetirementSection.tsx`)

### Backend (Apps Script)
- Tab `Retirement` ditambahkan ke `VALID_SHEETS` + `HEADERS` + `AUTO_CREATE_SHEETS`
  (`['id','name','progType','provider','currentBalance','monthlyContribution','contributionType','employerContribution','startDate','targetAge','expectedReturn','status','notes']`).
  Store: interface `Retirement` + state + CRUD + parsing sync. Template → **v4** (+ tab Retirement).

### Migrasi untuk pengguna lama
1. Buka Panduan → salin Apps Script terbaru. 2. Extensions → Apps Script → tempel → Deploy →
Manage deployments → Edit → New version. 3. Buka DompetKu → sync; tab `Retirement` terbuat sendiri.

---

## [3.3.0] — 2026-07-23 · Pajak & Zakat Indonesia (Roadmap Jilid 2 · Gelombang 3)

**Dampak Google Sheet/Apps Script: TIDAK ADA.** Client-side; tarif/PTKP = konstanta ber-tahun.
Semua **estimasi/edukasi**, bukan pengganti konsultan pajak / amil resmi.

### Ditambahkan
- **Estimator PPh 21** (Laporan) — hitung estimasi pajak penghasilan pribadi tahunan: input bruto,
  status **PTKP** (TK/K + tanggungan), iuran pensiun/JHT & zakat sebagai pengurang → **Penghasilan
  Neto → PKP → PPh terutang** (lapisan progresif UU HPP), **rincian lapisan**, tarif efektif, dan
  **rekonsiliasi** vs potongan bulanan (kurang/lebih bayar). Tab **Perencanaan Pajak**: dampak
  pengurang legal per Rp1jt + checklist akhir tahun. (`pph21Utils.ts`, `Pph21CalculatorModal.tsx`)
- **Zakat Penghasilan + Pelacak Haul** (Laporan) — zakat profesi **2,5%** (metode bruto/neto),
  cek **nisab** (85 g emas/th), status wajib, + **pelacak haul** zakat maal (± 354 hari).
  (`zakatUtils.ts` `zakatPenghasilan`/`haulDueDate`, `ZakatPenghasilanModal.tsx`)
- **SPT — Daftar Utang/Kewajiban** (Ekspor Harta SPT) — selain Daftar Harta, kini menampilkan
  **daftar utang** (nama, pemberi pinjaman, tahun, jumlah) dari tab Utang + **Salin CSV** tersendiri.
  (`sptUtils.ts` `buildUtangRows`/`utangRowsToCSV`)

---

## [3.1.0] — 2026-07-23 · Cakrawala & Proaktif (Roadmap Jilid 2 · Gelombang 2)

**Dampak Google Sheet/Apps Script: TIDAK ADA.** Client-side; ambang di `Settings`.

### Ditambahkan
- **Proyeksi Kekayaan Bersih** (Laporan › Ringkasan) — proyeksi net worth 10/20/30 tahun dengan
  **rentang** (Konservatif/Basis/Optimis) + **simulasi Monte Carlo** (persentil 10/median/90) dan
  penanda **tahun mencapai angka kemandirian (FI)**. (`netWorthProjectionUtils.ts`, `NetWorthProjectionCard.tsx`)
- **Perencana Skenario "What-If"** (Laporan) — uji dampak **kehilangan pekerjaan** (runway), **beli
  rumah/kendaraan** (DP + cicilan + DTI), **biaya naik**, atau **tambahan penghasilan** ke surplus,
  runway, dan net worth — sebelum vs sesudah. (`scenarioUtils.ts`, `ScenarioPlannerModal.tsx`)
- **Pemindai Langganan** (Transaksi › "Langganan") — deteksi otomatis pembayaran berulang dari
  riwayat (bulanan/tahunan), estimasi **kebocoran/bulan**, dan satu-klik **"Jadikan Berulang"**.
  (`subscriptionDetectUtils.ts`, `SubscriptionScannerModal.tsx`)
- **Peringatan Cerdas** (Notifikasi) — nudge prediktif: **runway rendah**, **saldo diproyeksikan
  minus**, **anggaran akan jebol**, **tagihan jatuh tempo**, **langganan baru terdeteksi**. Tiap
  jenis bisa dimatikan di Pengaturan. (`smartAlertsUtils.ts`)

---

## [3.0.0] — 2026-07-23 · Kecerdasan Arus Kas (Roadmap Jilid 2 · Gelombang 1)

**Dampak Google Sheet/Apps Script: TIDAK ADA.** Semua client-side; ambang di tab `Settings`
yang sudah ada. Menganalisis data transaksi/aset yang sudah Anda punya.

Awal roadmap **jilid 2** ("Dari Perencana → Kopilot Keuangan Cerdas"). Lihat `docs/prd/`.

### Ditambahkan
- **Laporan Arus Kas + Burn Rate & Runway** (Laporan › Ringkasan) — rekap masuk vs keluar per
  bulan (grafik 6/12/24 bln), dikelompokkan **Operasi / Investasi / Pendanaan**, plus **burn rate**
  (biaya hidup rutin/bln) dan **runway** ("tabungan bertahan ± N bulan tanpa pemasukan").
  (`cashflowUtils.ts`, `CashFlowStatementCard.tsx`)
- **Wawasan Pengeluaran & Deteksi Anomali** — insight otomatis: kategori yang **naik/turun**
  vs rata-rata, **lonjakan tak biasa** (z-score), dan **proyeksi anggaran jebol** (pace) — dengan
  nada positif untuk penghematan. Ambang bisa diatur di Pengaturan. (`insightsUtils.ts`, `SpendingInsightsCard.tsx`)
- **Pelacak Kemandirian Finansial (FIRE)** — **%FI**, FI Number (SWR), **tahun-ke-FI**, **Coast/Lean/Fat
  FIRE**, dan **tingkat menabung** (pengungkit terbesar). Menyambung biaya hidup dari Arus Kas.
  (`fiUtils.ts`, `FinancialIndependenceCard.tsx`)

### Internal
- **`financeClassify.ts`** — util bersama (`parseTxnMonth`, `isAssetAllocation`, `signedAmount`,
  `classifyFlow`); merapikan logika yang sebelumnya terduplikasi di Dashboard & Analytics.

---

## [2.7.0] — 2026-07-23 · Anggaran Bulanan jadi tab tidy (MonthlyBudgets)

**Dampak Google Sheet/Apps Script: YA — pengguna lama perlu memperbarui Apps Script sekali.**
Menambah 1 tab: `MonthlyBudgets`. Berkat `ensureSheetExists()`, tab **dibuat otomatis** saat
pertama diakses — tak perlu mengedit spreadsheet manual. Salin Apps Script terbaru dari Panduan
→ Deploy → New version. **Data lama aman:** selama tab belum terisi, aplikasi tetap membaca
anggaran dari blob `monthlyBudgets` di Settings (fallback), lalu **migrasi otomatis sekali** ke
tab begitu Apps Script baru aktif.

### Diubah (rapikan data model)
- **Anggaran bulanan per-kategori** tidak lagi disimpan sebagai **blob JSON di satu sel**
  `Settings.monthlyBudgets`, melainkan sebagai **baris tidy** di tab baru **`MonthlyBudgets`**
  (`id`, `month`, `category`, `amount`; `id = "<month>__<category>"`). Kini bisa dibaca, di-audit,
  dan dijumlah dengan formula (`SUMIFS`) langsung di Sheet.
- **Anti-sampah:** menyetel anggaran ke **0 kini menghapus barisnya** (dulu blob menumpuk entri
  `{"Kategori":0}` tanpa henti). Migrasi otomatis juga **membuang entri 0** yang lama.
- **Migrasi otomatis sekali jalan** dari blob Settings → tab `MonthlyBudgets`, lalu blob lama
  dikosongkan (`{}`). Non-blocking, tidak mengganggu sinkronisasi.
- Apps Script `setupBudgetingSheet()` kini membaca anggaran bulanan dari tab `MonthlyBudgets`
  (fallback blob lama) via helper `getMonthlyBudgetsMap()`.

### Template & kebersihan
- Template v3 kini punya tab **`MonthlyBudgets`** (+contoh baris) dan README diperbarui; blob
  `monthlyBudgets` di Settings di-reset ke `{}` dan **`last_password` dikosongkan** (jangan bawa
  kata sandi di template).

---

## [2.6.1] — 2026-07-23 · Perbaikan tampilan modal profil

**Dampak Google Sheet/Apps Script: TIDAK ADA.**

### Diperbaiki
- **Modal "Kelola profil" rusak/terpotong** — overlay hanya muncul sebagai strip di bagian
  atas layar dan konten kartu tidak tampil penuh. Penyebab: header aplikasi memakai
  `backdrop-blur`, yang membuat *containing block* baru sehingga elemen `position: fixed` di
  dalamnya (modal profil) terkurung di area header (tinggi 64px), bukan seluruh viewport.
  Solusi: modal kini dirender via **React portal ke `document.body`** sehingga menutupi layar
  penuh dan kartunya tampil normal. (`ProfileSwitcher.tsx`)

---

## [2.6.0] — 2026-07-23 · Multi-profil / Mode Keluarga (Wave E)

**Dampak Google Sheet/Apps Script: TIDAK ADA.** Daftar profil disimpan lokal di perangkat
(localStorage) — bukan di Sheet mana pun. Tiap profil hanyalah *penunjuk* ke sebuah Google
Sheet yang sudah ada. Tidak ada tab/kolom baru, tidak ada perubahan Apps Script.

### Ditambahkan
- **Pengalih profil di header** — kelola keuangan **beberapa orang/entitas** (mis. pasangan,
  anak, usaha) dalam satu aplikasi, masing-masing memakai **Google Sheet-nya sendiri** (data
  tidak tercampur). Pil profil + dropdown untuk berpindah cepat; menampilkan profil aktif.
  (`ProfileSwitcher.tsx`)
- **Kelola profil** — tambah/ubah/hapus profil (nama, avatar emoji, warna, URL Web App
  Apps Script dan/atau ID Spreadsheet). Tombol **"Simpan koneksi saat ini"** untuk menjadikan
  Sheet yang sedang terhubung sebagai profil pertama. Berpindah profil = mengganti koneksi
  aktif lalu **menarik ulang** seluruh data dari Sheet tersebut.
- Menghapus profil **tidak** menghapus Google Sheet-nya (hanya penunjuk lokal). Saat keluar
  akun, daftar profil ikut dibersihkan agar tak bocor antar-pengguna di perangkat bersama.

### Catatan
- Cara pakai: buat dulu Sheet baru untuk tiap profil (salin file template
  `dompetku_template_v3.xlsx`), lalu daftarkan URL/ID-nya. Token Google akun aktif dipakai
  bersama untuk mode API/OAuth. Fondasi arsitektur "1 pengguna = 1 Sheet" tetap; multi-profil
  menambah lapisan pengalih di sisi klien tanpa mengubah backend.

---

## [2.5.0] — 2026-07-23 · Impor Mutasi Bank CSV (Wave D)

**Dampak Google Sheet/Apps Script: TIDAK ADA.** Client-side; baris CSV yang diimpor menjadi
transaksi biasa di tab `Transactions` yang sudah ada (lewat alur `addTransaction` standar).

### Ditambahkan
- **Impor CSV mutasi rekening** (Transaksi › tombol "Impor") — unggah file `.csv` dari
  internet/mobile banking **atau** tempel isinya, lalu:
  - **Deteksi otomatis** delimiter (`,` `;` tab `|`), tanda kutip, dan BOM; **tebak kolom**
    dari baris judul (Tanggal/Keterangan/Debit/Kredit/Mutasi).
  - **Pemetaan kolom** manual: pilih kolom Tanggal & Keterangan, lalu mode **1 kolom nominal
    bertanda (±)** atau **Debit & Kredit terpisah**, plus akun tujuan impor.
  - **Normalisasi** beragam format tanggal (`dd/mm/yyyy`, `dd-mm-yyyy`, `yyyy-mm-dd`) → ISO,
    dan nominal IDR (pemisah ribuan `.`/`,`, kurung `()` = negatif) → angka.
  - **Pratinjau** transaksi hasil parse (hijau = masuk, merah = keluar) dengan hitung
    valid/dilewati **sebelum** impor; baris tanpa tanggal/nominal valid otomatis dilewati.
  - Saat impor: tiap baris jadi transaksi PEMASUKAN/PENGELUARAN + **saldo akun disesuaikan**
    otomatis. (`csvImportUtils.ts`, `CsvImportModal.tsx`)

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
