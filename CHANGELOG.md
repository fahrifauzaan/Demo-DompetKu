# Changelog DompetKu

Semua perubahan penting pada aplikasi DompetKu dicatat di sini.
Format mengikuti [Keep a Changelog](https://keepachangelog.com/), penomoran [SemVer](https://semver.org/lang/id/).

> **Kompatibilitas Google Sheet / Apps Script:** setiap rilis diberi tanda apakah pengguna
> lama perlu memperbarui Apps Script / template mereka. Rilis **Client-side** tidak butuh
> tindakan apa pun — cukup buka aplikasi.

---

## [3.21.0] — 2026-07-26 · Audit Menyeluruh (2/4): Fitur Rusak

**Dampak Google Sheet/Apps Script: TIDAK ADA.** Client-side.

Batch 2 dari 4 hasil audit A–Z. Menutup temuan "fitur ada tapi tidak berfungsi".

### Diperbaiki
- **Pencarian global memakai data contoh, bukan data pengguna.** `FinanceSearch.tsx` mengimpor
  `TRANSACTIONS_DATA`/`ASSETS_DATA` dari `FinanceData` (entri statis) → ⌘K tak pernah menemukan transaksi
  atau aset nyata. Kini membaca store: transaksi (desc/kategori/akun/lokasi, terbaru dulu), aset
  (judul/ticker/broker), rekening, utang, dan tujuan; hasil dinaikkan 8 → 12.
- **Tujuh target navigasi notifikasi/kalender tidak valid** (`onNavigate('aset'|'anggaran'|'rencana utang'|'laporan')`
  dan `go(...)` sejenis) sedangkan `FinanceTab` memakai `assets|budget|debts|analytics` → `activeTab` tak cocok
  cabang render mana pun = **konten kosong** + judul fallback. Semua dipetakan ke nilai yang benar, DAN
  handler `onNavigate` di `FinanceDemo` kini memvalidasi target (tak dikenal → diabaikan + `console.warn`).
- **Peringatan "Anggaran Menipis" mati total** (`FinanceNotifications.tsx:200`). Tiga sebab sekaligus:
  (1) `t.type === 'expense'` padahal nilainya `'PENGELUARAN'`; (2) `t.category === cat.name` peka huruf
  (Anggaran memakai case-insensitive); (3) `sum + t.amount` — pengeluaran NEGATIF sehingga `spent` negatif dan
  `percentage` tak mungkin mencapai `alertAt`. Kini `'PENGELUARAN'` + lowercase compare + `Math.abs`.
- **Kripto tak punya UI update-harga/jual.** Grid kartu ekuitas memfilter `saham|reksadana` saja, dan sub-tab
  lain hanya menerima `sbn|deposito|p2p` → aset `kripto` tak muncul sebagai kartu di mana pun (padahal modal
  & store mendukung). Filter kini menyertakan `kripto|crypto`; label sub-tab → "Saham, Reksadana & Kripto".
- **Tak ada aksi hapus untuk aset investasi.** `deleteAsset` hanya terpasang di kartu aset fisik. Ditambahkan
  tombol hapus (memakai modal konfirmasi yang sudah ada) di kartu investasi.
- **Judul halaman tak lengkap.** Rantai ternary melewatkan `debts`, `equity-ledger`, `add-*` → judul
  "Manajemen". Diganti peta eksplisit `TAB_TITLES: Record<FinanceTab, string>` (tab baru tak bisa lolos).

### Verifikasi (browser, akun demo)
Pencarian: transaksi bertanda unik yang disuntik ke state DITEMUKAN; `FinanceSearch` terbukti tak lagi
mengimpor data contoh (`searchStillImportsDemoData: false`, `searchUsesStore: true`); tujuan ("Umroh") ikut
tercari. Catatan: kemunculan "Porsche 911 Carrera S" awalnya dikira kebocoran data contoh — ternyata memang
aset NYATA akun demo (judulnya beda satu huruf dari entri contoh). Judul: tab Utang → "Rencana Utang",
`equity-ledger` → "Buku Besar" (dulu keduanya "Manajemen"). Kartu investasi: **18 tombol Hapus** terender
(sebelumnya 0). `tsc` & build bersih.
**Batas verifikasi:** kartu kripto tak bisa diuji dengan data nyata (akun demo tak punya aset kripto) dan
penyuntikan state tak sampai ke instance app (duplikasi modul Vite) — perubahannya satu baris filter pada
jalur render yang sama dengan saham/reksadana yang sudah terbukti bekerja.

---

## [3.20.0] — 2026-07-26 · Audit Menyeluruh (1/4): Anti Data-Hilang

**Dampak Google Sheet/Apps Script: TIDAK ADA.** Client-side.

Batch 1 dari 4 hasil audit A–Z seluruh fitur (user meminta review menyeluruh; 15 temuan KRITIS + ~18 SEDANG,
dikerjakan berurutan). Batch ini menutup semua temuan yang bisa MENGHILANGKAN data.

### Diperbaiki
- **`'update'` di jalur API kini UPSERT** (`useFinanceStore.ts` postToSheet). `updateRowInSheet` diam-diam
  `return` bila id tak ditemukan (`googleApiService.ts:406`), menimbulkan dua kelas data-hilang:
  (a) **Setelan berisian BARU tak pernah tersimpan** — `updateSettings` selalu memakai aksi `'update'`, lalu
  `FinanceSettings.handleSave` memanggil `syncFromGoogleSheets()` yang langsung membuangnya (revert dalam
  satu aksi simpan); (b) mengedit entitas yang masih bawaan/lokal (mis. akun default `acc1`) hilang meski
  indikator berkata "Tersimpan". Upsert memeriksa sheet → perbarui bila ada, tambah bila belum, tanpa duplikat.
- **`deleteRowFromSheet` kini `throw`** pada semua kegagalan HTTP (+ retry 429/503); "tab/baris tak ada"
  tetap sukses (idempoten). Dulu 4 jalur `return` senyap → `postToSheet` melaporkan sukses, item hilang di UI
  tapi masih ada di Sheet dan **muncul lagi** pada sinkron berikutnya.
- **Hentikan "Sukses" palsu** di Aset (`FinanceAssets.tsx` edit harga & valuasi): `postToSheet` menampung error
  ke `saveError` dan tidak rethrow, jadi `try/catch` di UI **selalu** masuk cabang sukses. Kedua alur kini
  memeriksa `saveError` dan melaporkan kegagalan beserta sebabnya.
- **`AssetSellModal` aman setengah jalan**: 3 penulisan berurutan (transaksi → saldo → holding) kini berhenti
  pada langkah pertama yang gagal, melaporkan tahap mana yang batal, dan tidak menutup modal seolah sukses.
- **`GoalFormModal`**: `initialAmount: linkedId ? linkedValue : ...` menimpa progres dengan **0** bila akun/aset
  tertaut sudah dihapus (`linkedValue` jatuh ke 0). Kini pakai `linkResolved` (tautan benar-benar ada);
  bila mati → progres manual dipertahankan dan tag `[link:<id>]` dilepas.
- **`RecurringManagerModal.postOccurrence`**: memajukan `lastPostedDate` tanpa memeriksa hasil tulis → tagihan
  berhenti tampil "jatuh tempo", tak pernah dicoba lagi, catatan hilang. Kini memeriksa `saveError` lebih dulu
  (pola yang sudah benar di `AutoPostRunner`).

### Verifikasi
Unit test 18/18: reproduksi bug lama vs perilaku baru untuk setiap butir (setelan kunci baru no-op→append;
edit `acc1` hilang→append; delete 429 throw + idempoten saat baris/tab tak ada; tautan Tujuan mati
50jt→0 vs 50jt dipertahankan + tag dilepas; alur jual berhenti di langkah gagal; posting berulang tak
memajukan tanggal saat gagal). Browser: nol error konsol, alur Aset/Portofolio/Tujuan render normal.
`tsc` & build bersih.

---

## [3.19.0] — 2026-07-26 · Perbaikan Penting: Anggaran per-Bulan Tidak Hilang Lagi

**Dampak Google Sheet/Apps Script: TIDAK ADA.** Client-side (data-integrity + migrasi kategori lanjutan).

### Latar (temuan dari audit)
User mengubah "Rencana (Budget)" tiap kategori di Anggaran → nilainya balik ke angka lama. Sheet user
menunjukkan tab `MonthlyBudgets` berisi nilai baru (mis. `2026-07__Gaji Pokok` = 9.400.000) **dan baris
duplikat** (baris 25 & 29 id sama), sementara aplikasi menampilkan 9.200.000 (= `allocated` lama).

**Root cause (rantai 3 langkah):**
1. `fetchAllDataFromSheets` hanya menarik tab yang ada di `HEADERS` (`Object.keys(HEADERS).filter(...)`) —
   dan **`MonthlyBudgets` TIDAK terdaftar** di sana. Jadi tab itu **tak pernah dibaca** untuk pengguna
   Login-Google → `result.data.MonthlyBudgets` selalu `undefined` → `tabBudgets = {}`.
2. Sinkron lalu menjalankan `updates.monthlyBudgets = tabHasData ? tabBudgets : blobBudgets` **tanpa syarat**;
   blob `Settings.monthlyBudgets` milik user sudah `{}` (sudah termigrasi v2.7.0) → **seluruh anggaran
   per-bulan ditimpa `{}` setiap sinkron**. `FinanceBudget` lalu jatuh ke `cat.allocated` (baris 156-160) →
   terlihat "balik ke angka lama".
3. Karena state lokal selalu kosong, `updateMonthlyBudget` menghitung `existed = false` → aksi **`'add'`**
   untuk id yang sebenarnya sudah ada di sheet → **baris duplikat menumpuk** tiap penyuntingan.
   (Penulisan tetap sampai ke sheet karena `isApiSheet('MonthlyBudgets')` false → jatuh ke jalur makro.)

### Diperbaiki
- **`MonthlyBudgets` didaftarkan ke API `HEADERS`** (`['id','month','category','amount']`) → kini **dibaca**
  oleh sinkron dan **ditulis via API** (tak lagi bergantung makro). Tab otomatis dibuat bila belum ada.
- **Pengaman anti-hilang di sinkron**: `monthlyBudgets` hanya ditimpa bila ADA sumbernya (tab berisi, atau
  blob lama berisi). Bila keduanya kosong → **state lokal dipertahankan**, tidak dihapus.
- **`upsertRowInSheet` (baru)**: penulisan MonthlyBudgets memakai upsert — cek sheet langsung, perbarui bila
  id ada, tambah bila belum. Duplikat tak bisa tercipta lagi. Bila id sudah punya beberapa baris duplikat
  (warisan bug lama), **semua baris itu ditulis nilai sama** → pembacaan (last-wins) selalu konsisten.
- **`batchRenameMonthlyBudgetCategories` (baru)** dipanggil dari `migrateCategoriesToIndonesian`: mengganti
  nama kategori pada MonthlyBudgets **beserta kolom `id`** (`2026-06__Food` → `2026-06__Makanan & Minuman`).
  Melengkapi v3.18.0 yang hanya memigrasi BudgetCategories + Transactions; tanpa ini override anggaran
  bulan-bulan lama jadi yatim. Idempoten, satu `values:batchUpdate`.

### Audit (permintaan user: pastikan tak ada data lain yang hilang)
Menyisir semua `updates.<key> = ...` di `syncFromGoogleSheets` vs tab yang benar-benar ditarik API:
Transactions/Accounts/BudgetCategories/Debts dijaga `if (result.data.X)`; Assets dijaga anti-wipe (v3.15.0);
Goals/Recurring/Insurance/Retirement merge-by-id; Settings merge + `LOCAL_ONLY` (PIN). **`monthlyBudgets`
adalah satu-satunya penimpaan tanpa syarat atas tab yang tak ditarik** — dan itulah bug ini. Sisa kunci yang
dibaca tapi tak ada di HEADERS (`Assets`, `Kripto`, `Fixed Income Investment`) hanya alias makro/legacy dan
jalurnya sudah aman (merge/guard), bukan penimpaan.

### Verifikasi
- Unit test 12/12: (a) reproduksi bug lama (tab tak terbaca + blob `{}` → anggaran terhapus) vs perilaku baru
  (state dipertahankan); tab menang bila berisi; blob dipakai bila tab kosong; (b) upsert tidak menambah baris
  untuk id yang ada, menulis SEMUA duplikat, append untuk id baru, plus reproduksi akar duplikat lama;
  (c) rename MonthlyBudgets mengubah kolom category + id, melewati nama non-kanonik, idempoten.
- Live (localhost, modul segar): `isApiSheet('MonthlyBudgets') === true`; anggaran per-bulan **bertahan**
  setelah `syncFromGoogleSheets()` (run sebelum perbaikan pada sesi yang sama menghasilkan `{}` — bug
  terreproduksi, lalu hilang setelah fix). `tsc` & build bersih.
- **Batas verifikasi (jujur):** alur UI ujung-ke-ujung pada akun Login-Google tak bisa diuji dari sini (butuh
  token OAuth user), dan penyuntikan state ke app tidak terpakai karena duplikasi modul Vite. Silakan
  konfirmasi di akun Anda: ubah Rencana → sinkron/refresh → angkanya harus menetap.

---

## [3.18.7] — 2026-07-26 · Perbaikan: Menu "Tujuan" Muncul di Tampilan Mobile

**Dampak Google Sheet/Apps Script: TIDAK ADA.** Client-side (styling/nav).

### Diperbaiki
- **Item nav "Tujuan" (goals) hilang di menu mobile.** `FinanceDemo.tsx` punya dua daftar `NavItem`
  terpisah — sidebar desktop (punya `goals`) dan drawer mobile (tidak). Ditambahkan
  `<NavItem id="goals" icon="flag" label="Tujuan" />` setelah `debts` di drawer mobile, sehingga urutan
  identik dengan desktop: Dasbor · Transaksi · Anggaran · Aset · Rencana Utang · Tujuan · Laporan ·
  Panduan · Pengaturan. Diverifikasi di viewport mobile (375px): "Tujuan" tampil di posisi yang benar.

---

## [3.18.6] — 2026-07-26 · Perbaikan: Edit Harga Reksadana Tidak Balik Sendiri

**Dampak Google Sheet/Apps Script: TIDAK ADA.** Client-side.

### Latar
User update NAV Reksadana (turun) → tersimpan sesaat lalu "kembali sendiri" ke harga awal setelah sinkron;
sheet kolom `Current Price` tetap nilai lama. **Root cause** (`FinanceAssets.tsx` handleSaveLastPrice, cabang
investment): untuk reksadana, `updatedAsset.currentPrice` di-set **`undefined`** dan harga baru hanya masuk
`currentNav`. Saat `updateRowInSheet` menulis kolom bernama **`Current Price`**, `getValueCaseInsensitive`
mencocokkan key `currentPrice` (=`undefined`) LEBIH DULU (exact-clean-match) → nilai `undefined` → fallback ke
sel lama → harga tak berubah di sheet → sinkron berikutnya membaca harga lama → "balik sendiri".

### Diperbaiki
- **`currentPrice` kini di-set ke harga baru untuk SEMUA subType** (bukan `undefined` khusus reksadana);
  `currentNav` tetap diisi utk reksadana (dipakai display/oldPrice). Verifikasi unit test: skema `Current Price`
  → tulis lama (undefined) mempertahankan 33.110 (bug), tulis baru menulis 29.728 dengan Avg. Cost & Units utuh.
- **`HEADERS['Reksadana']` diselaraskan** dari `NAV_Per_Unit`/`Current_NAV` → **`Avg. Cost`/`Current Price`**,
  identik dengan Template Database & tab Saham (jawaban atas pertanyaan user: Template sudah best-practice;
  aplikasi kini mengikutinya persis — ADD/`ensureSheetWithHeader` membuat header yang sama). Baca tetap fuzzy;
  update pakai header ASLI sheet (v3.18.4), jadi sheet lama apa pun tetap kompatibel.
- tsc & build bersih.

---

## [3.18.5] — 2026-07-25 · Perbaikan: Simpan ke Sheet Lebih Tahan (Anti Rate-Limit) + Pesan Error Jelas

**Dampak Google Sheet/Apps Script: TIDAK ADA.** Client-side (reliability).

### Latar
User gagal menambah aset Reksadana → banner "Gagal menyimpan ke Google Sheets — periksa koneksi Anda".
Pesan itu generik (di-set di `postToSheet` catch untuk SEMUA error). Penyebab paling mungkin: **rate-limit
429** akibat burst penulisan — khususnya migrasi kategori Anggaran (v3.18.0) yang me-*loop* `updateBudgetCategory`
per kategori (tiap update = GET+PUT via `updateRowInSheet`), jadi ~30 kategori ≈ 60 request → langsung
menyentuh kuota ~60 tulis/menit, membuat penulisan berikutnya (add Reksadana) kena 429 & gagal.

### Diperbaiki
- **Retry backoff pada 429/503** (`fetchSheetsWithRetry`) di semua jalur tulis: `addRowToSheet`,
  `appendRowsToSheet`, `updateRowInSheet` (GET+PUT), `batchRename*`. Kegagalan transien kini pulih sendiri.
- **Pesan error spesifik** (`writeErrorMessage`): 429 → "batas laju, tunggu ~1 menit"; 401/403 → "sesi Google
  kedaluwarsa, hubungkan ulang"; lainnya → "Gagal menyimpan (HTTP n)". `postToSheet` catch kini memakai
  `error.message` (bukan string generik).
- **`updateRowInSheet` kini THROW saat gagal** (GET maupun PUT), bukan `console.error` diam-diam — kegagalan
  update tampil sebagai `saveError` (menutup satu kelas silent-failure).
- **Migrasi kategori Anggaran → SATU `values:batchUpdate`** lewat `batchRenameBudgetCategories` (paralel
  `batchRenameTransactionCategories`), menggantikan loop ~30× GET+PUT. Menghapus sumber burst 429 utama.
- Diverifikasi: unit test retry (429×2→200 sukses di percobaan ke-3; 429 terus → berhenti setelah 3; 400 tak
  di-retry) + writeErrorMessage (429/401/500). tsc & build bersih.

### Catatan
Penyebab pasti error di sesi user tak bisa direproduksi langsung (butuh token OAuth mereka), tapi perbaikan
ini menyasar penyebab paling mungkin (rate-limit) + membuat error berikutnya menjelaskan dirinya sendiri.

---

## [3.18.4] — 2026-07-25 · Perbaikan Penting: Update Harga Reksadana Tersimpan Benar

**Dampak Google Sheet/Apps Script: TIDAK ADA.** Client-side (data-integrity).

### Latar
User update NAV Reksadana → nilai jadi blank/Rp 0 & nilai investasi kacau. **Root cause:**
`HEADERS['Reksadana']` (googleApiService.ts) = `['ID','Title','Units','Nav Per Unit','Current_NAV',…]` —
**KEHILANGAN kolom `Ticker`** yang ADA di sheet asli user (`ID, Title, Ticker, Units, NAV_Per_Unit,
Current_NAV, Purchase Date, Location, Icon, Notes`). Penulisan baris via `addRowToSheet`/`updateRowInSheet`
membangun row **positional berdasar HEADERS**, jadi tiap nilai bergeser satu kolom mulai dari posisi 3
(Units→kolom Ticker, NAV→Units, dst.; ikon `account_balance` bocor ke Purchase Date, Notes bocor ke Icon).
Baca (`fetchAllDataFromSheets`) sudah robust (pakai header ASLI sheet + `getVal` fuzzy) — makanya **hanya
tulis** yang rusak, dan Saham/Crypto (yang HEADERS-nya sudah punya Ticker) aman.

### Diperbaiki
- **`HEADERS['Reksadana']`** → `['ID','Title','Ticker','Units','NAV_Per_Unit','Current_NAV','Purchase Date',
  'Location','Icon','Notes']` (tambah `Ticker`, urutan cocok dg sheet & template). Path add/append kini
  menaruh nilai di kolom yang benar (unit vs template `Avg. Cost`/`Current Price` sama-sama benar karena
  urutan kolom identik + resolusi nilai via alias).
- **`updateRowInSheet` kini membangun row dari HEADER ASLI sheet (`rows[0]`), bukan konstanta `HEADERS`.**
  Fungsi ini memang sudah membaca sheet (untuk cari baris by id), jadi header asli tersedia gratis. Efek:
  ketidakcocokan konstanta-vs-sheet tak akan pernah menggeser data lagi, untuk SEMUA tab; kolom yang tak
  dikenali aplikasi mempertahankan nilai lamanya.
- Diverifikasi: unit test (12 kasus) — HEADERS lama menggeser (ikon bocor ke kolom salah), HEADERS baru +
  robust-update menaruh unit→D, avg→E, current→F, tanggal→G, ikon→I dengan benar untuk skema user
  (`NAV_Per_Unit`) MAUPUN template (`Avg. Cost`). tsc & build bersih.

### Aksi user (sekali)
Baris Reksadana yang sudah terlanjur rusak perlu diperbaiki: **hapus aset Reksadana itu di aplikasi, lalu
tambahkan ulang** dengan nilai benar (jumlah unit, harga rata-rata/NAV beli, NAV terkini). Setelah itu
update harga tersimpan rapi.

---

## [3.18.3] — 2026-07-25 · Perbaikan: Kartu Dana Pensiun (Jarak + Pop-up)

**Dampak Google Sheet/Apps Script: TIDAK ADA.** Client-side.

### Diperbaiki
- **Jarak kartu Dana Pensiun** dengan kartu Proteksi di atasnya proporsional — `FinanceAssets.tsx` wrapper F2.3
  diberi `space-y-6 sm:space-y-8` (sebelumnya `<FinanceInsuranceSection />` dan `<FinanceRetirementSection />`
  ditumpuk tanpa jarak).
- **Pop-up Tambah/Ubah Dana Pensiun ter-*trap* containing-block.** Modal di `FinanceRetirementSection.tsx`
  dirender inline di dalam kartu ber-`liquid-glass` (backdrop-filter → jadi containing block), sehingga
  `position: fixed inset-0` terpotong ke kotak kartu, bukan viewport (overlay tampak seperti kotak gelap
  membulat). **Fix:** `createPortal(..., document.body)`.
- **Modal tampil samar (opacity ~0.14).** Setelah diportal, animasi `motion`/`AnimatePresence` macet di
  tengah transisi (kemungkinan interaksi dengan re-render indikator "Menyimpan…"). Diganti ke animasi CSS
  `animate-in fade-in zoom-in-95` (pola yang dipakai modal-modal lain di app) — solid, tanpa dependensi JS,
  aman di portal. Import `motion`/`AnimatePresence` dihapus dari file ini.
- **Input nominal form Dana Pensiun** (Saldo kini, Iuran karyawan/bln, Iuran pemberi kerja/bln) diubah dari
  `type="number"` polos → `type="text"` ber-pemisah-ribuan (`fmtInt`/`digitsOnly`) — mis. `75000000` → `75.000.000`.
- Diverifikasi di browser: modal overlay = full viewport (parent === body), backdrop & kartu opacity 1, semua
  field + tombol tampil; jarak antar-kartu proporsional; ketik `75000000` → `75.000.000`. tsc & build bersih.

---

## [3.18.2] — 2026-07-25 · Perbaikan: Input Harga Aset Pakai Pemisah Ribuan

**Dampak Google Sheet/Apps Script: TIDAK ADA.** Client-side.

### Diperbaiki
- **Input harga saat edit aset investasi kini memformat ribuan saat diketik.** Di modal "Update Harga Terakhir"
  (`FinanceAssets.tsx`), cabang `editType === 'investment'` pada `handlePriceInputChange` menyimpan nilai **mentah**
  (`setNewLastPriceInput(val)`) tanpa pengelompokan ribuan — jadi mengetik `6400` tampil `6400`, bukan `6.400`
  (padahal kartu perbandingan di bawah sudah benar). Cabang non-investasi (saldo rekening / valuasi fisik) sudah
  memformat via `toLocaleString`, jadi hanya input investasi yang tertinggal (karena harus mengizinkan desimal).
- **Fix:** helper baru `formatPriceInputID(raw, decimals)` + `groupThousandsID(digits)` (string-based, tanpa
  kehilangan presisi) mengelompokkan bagian bilangan bulat dengan titik **sambil mempertahankan bagian desimal
  yang sedang diketik** (koma = desimal), membatasi digit desimal sesuai aset (saham 0, reksadana 4, kripto 8).
- Diverifikasi: unit test 12 kasus (saham `6400`→`6.400`, kripto `1045500,12345678`, reksadana capping 4 digit,
  koma di ujung `29.440,`, `,5`→`0,5`, round-trip `parsePriceID`) semua lolos; browser (reksadana) mengetik
  `1045500,5075` live jadi `Rp 1.045.500,5075` dan kartu perbandingan cocok. `tsc` & build bersih.

---

## [3.18.1] — 2026-07-25 · Perbaikan: Modal Edit Aset Ikut Tema Terang

**Dampak Google Sheet/Apps Script: TIDAK ADA.** Client-side (murni styling).

### Diperbaiki
- **Pop-up edit aset sekarang theme-aware.** Modal `Edit Last Price` di `FinanceAssets.tsx` (judul kondisional
  "Update Saldo Rekening" / "Update Harga Terakhir" / "Update Valuasi Aset") **dan** modal konfirmasi Pencairan
  (liquidation) di-hardcode gelap (`bg-[#121318]/95`, `text-white`, `bg-white/5`, `border-white/10`, dll.) tanpa
  varian terang — jadi selalu tampil gelap walau pengguna memilih mode Terang. Semua kelas warna diubah jadi
  pasangan `token-terang dark:nilai-gelap` sesuai design-system app (`bg-surface-container-lowest dark:bg-[#121318]/95`,
  `text-on-surface dark:text-white`, `text-on-surface-variant dark:text-slate-400`, `bg-surface-container dark:bg-white/5`,
  `border-outline-variant/20 dark:border-white/10`, date `[color-scheme:light] dark:[color-scheme:dark]`). Tombol
  berlatar warna (SIMPAN primary, "Selesai" emerald, "Konfirmasi" amber) sengaja tetap `text-white` di kedua tema.
- Diverifikasi di browser: modal "Update Harga Terakhir" render benar di **mode Terang** (kartu putih, teks gelap,
  surface abu terang) **dan** mode Gelap (desain gelap asli utuh, tombol SIMPAN biru-muda teks gelap). Audit seluruh
  `src`: tidak ada kartu modal hardcoded-gelap lain yang tersisa. `tsc`(file ini) & build bersih.

---

## [3.18.0] — 2026-07-25 · Kategori Serba-Indonesia (Anggaran & Transaksi Sinkron)

**Dampak Google Sheet/Apps Script: TIDAK ADA.** Client-side (migrasi berjalan di sisi aplikasi ke Sheet Anda sendiri lewat jalur yang sudah ada).

### Latar
Aplikasi menyimpan kategori dalam **Inggris** sebagai nama kanonik (`Food`, `Housing`, …) lalu hanya
**menerjemahkan ke Indonesia saat ditampilkan** (`categoryTranslations` di `FinanceAddTransaction`). Transaksi
hasil impor justru menyimpan literal Indonesia (`Makanan & Minuman`). Akibatnya kategori Anggaran (Inggris)
tak pernah cocok dengan kategori transaksi (Indonesia) → **Budget vs Aktual selalu Rp 0**. Alih-alih menambal
dengan alat rename manual (v3.17.0), rilis ini menjadikan **Indonesia sebagai nama kanonik** di seluruh aplikasi.

### Diubah
- **Nama kanonik kategori kini Bahasa Indonesia**, memakai peta terjemahan yang sudah ada (dipindah ke file
  bersama baru `src/finance-components/categoryLocale.ts` → `CATEGORY_EN_TO_ID`, `EXPENSE_CATEGORIES`,
  `INCOME_CATEGORIES`). Form Tambah Transaksi, kategori Anggaran baku (`DEFAULT_BUDGET_CATEGORIES`), template
  impor Excel/CSV, dropdown template, dan data seed semuanya kini Indonesia. `translateCategory` tetap ada
  sebagai pass-through/penerjemah sisa data Inggris lama.
- Dropdown kategori pada template impor kini di-*seed* dari seluruh 34 kategori baku (Indonesia), bukan hanya
  kategori milik user, sehingga lengkap walau data masih kosong.

### Ditambahkan
- **Migrasi otomatis `migrateCategoriesToIndonesian()`** (dipanggil di akhir setiap `syncFromGoogleSheets`).
  Mengganti nama kategori **Anggaran** dan **Transaksi** yang masih Inggris → Indonesia, lalu menyimpannya ke
  Google Sheet Anda (Anggaran: `postToSheet` update per baris; Transaksi: `renameTransactionCategories` →
  satu `values:batchUpdate`). **Idempoten** (berhenti sendiri bila tak ada nama Inggris tersisa), dijaga flag
  anti-tumpang-tindih, dan **self-healing** (dicoba lagi di sync berikutnya bila push sempat gagal). Template
  Database yang masih Inggris otomatis ikut tersesuaikan pada login pertama pengguna baru.

### Diperbaiki
- **Budget vs Aktual langsung terisi** untuk transaksi hasil impor — tanpa perlu "Samakan Kategori" manual.

### Verifikasi
- Konsistensi statis: 34 nilai peta = superset dari 19 kategori pengeluaran + 15 pemasukan + 4 Anggaran baku (nol typo).
- Live (akun demo): setelah sync, **0 kategori Inggris** tersisa di Anggaran maupun Transaksi; nama Anggaran &
  transaksi kini identik (mis. `Makanan & Minuman` ×183). Budget vs Aktual Maret 2026 terisi — Makanan & Minuman
  Rp 5.346.784, Transportasi & Bensin Rp 4.186.035, Tempat Tinggal/KPR Rp 3.325.680, Kesehatan & Obat Rp 1.204.000
  (sebelumnya Rp 0). Indikator "Menyimpan ke Google Sheets" tampil → perubahan dipersistensi. `tsc` & build bersih.

---

## [3.17.0] — 2026-07-25 · Samakan Kategori (Budget vs Aktual)

**Dampak Google Sheet/Apps Script: TIDAK ADA.** Client-side.

### Ditambahkan
- **Alat "Samakan Kategori" di Anggaran.** Budget vs Aktual mencocokkan nama kategori transaksi dengan
  nama kategori Anggaran (case-insensitive). Kalau beda — mis. transaksi hasil impor berkategori
  "Makanan & Minuman" sedangkan Anggaran memakai "Food" — aktual tak terhitung (Rp 0). Tombol baru
  menampilkan **hanya kategori transaksi yang belum cocok** (+ jumlah transaksinya), lalu memetakannya
  ke kategori Anggaran dalam satu klik. Store `renameTransactionCategories` + API
  `batchRenameTransactionCategories` (satu `values:batchUpdate` — anti rate-limit; fallback loop untuk
  mode makro). `CategoryRemapModal` di-render via portal (anti containing-block trap).
- Diverifikasi: unit (columnLetter/range/case-insensitive) + live store (rename 2 dari 4 baris,
  case-insensitive, sisanya utuh) + modal (empty & active state, dropdown kategori Anggaran, tombol
  Terapkan aktif). tsc & build bersih.

---

## [3.16.0] — 2026-07-25 · Perbaikan: Fixed Income tersimpan (tab dashboard → tab data biasa)

**Dampak Google Sheet/Apps Script: ADA untuk pengguna mode Web App/macro** (perbarui Apps Script sekali dari Panduan). Pengguna Login-Google (OAuth): **otomatis, tanpa aksi**.

### Diperbaiki
- **Aset Pendapatan Tetap (SBN/Obligasi, Deposito, P2P) hilang setelah refresh** (dilaporkan user). Akar
  masalah: tab `Fixed Income Investment` di template adalah **dashboard ber-merged-cell dengan seksi baris
  tetap** (SBN 31–77, Deposito 80–117, P2P 120–150), bukan tabel data biasa. Apps Script punya handler khusus
  (`appendFixedIncome`/`readFixedIncomeSheet`), tapi jalur API langsung (OAuth) memperlakukannya sebagai tabel
  biasa → tulis gagal/salah tempat, baca salah-parse. Itu sebabnya Saham (tab biasa) jalan tapi Bonds tidak.
  (v3.15.0 salah diagnosis sebagai "tab hilang"; ini perbaikan yang benar.)

### Diubah (migrasi)
- **Fixed Income kini disimpan di tab baru `FixedIncome`** (tabel data biasa, kolom lengkap: subType,
  interestRate, maturityDate, couponType, tax, tenor, issuer, dll). `getAssetSheetName` → 'FixedIncome';
  sync membaca `FixedIncome` (plain) DAN `Fixed Income Investment` (dashboard, via macro) lalu **merge by-id**
  (holding lama tetap terbaca, tanpa duplikat). Jalur API auto-buat tab. Apps Script: `FixedIncome` ditambah
  ke VALID_SHEETS + AUTO_CREATE_SHEETS + HEADERS; update/delete Fixed Income fallback ke tab dashboard untuk
  holding lama. Panduan diregenerasi & di-deploy.
- Diverifikasi: routing FI→FixedIncome, merge/dedup, `isApiSheet`, guard anti-wipe aset — uji unit lolos; live
  `isApiSheet('FixedIncome')`=true & fancy tab tak lagi di-fetch API; tsc & build bersih.

---

## [3.15.0] — 2026-07-25 · Perbaikan: Semua data benar-benar tersimpan

**Dampak Google Sheet/Apps Script: TIDAK ADA.** Client-side (Apps Script sudah mendukung semua tab).

### Diperbaiki
- **Bug dilaporkan: aset Pendapatan Tetap (SBN/Deposito/Obligasi) hilang setelah refresh.** Penyebab:
  `addRowToSheet` hanya `values:append` tanpa membuat tab bila belum ada; tab `Fixed Income Investment`
  TIDAK ada di daftar auto-create macro → penulisan **400 diam-diam**; lalu sinkron menimpa `assets`
  tanpa aset itu → lenyap. **Fix:** `addRowToSheet` & `appendRowsToSheet` kini **auto-create tab (+header)
  lalu retry**, dan **throw** pada kegagalan nyata (muncul `saveError`). Sinkron juga tak menimpa `assets`
  bila fetch tak memuat satu pun tab aset (anti-wipe).
- **Tujuan, Proteksi, Transaksi Berulang, Dana Pensiun kini API-native** — ditambahkan ke HEADERS API
  (kolom persis `google-apps-script.js`) → ditulis langsung ke spreadsheet **milik user**, bukan jatuh ke
  macro fallback (yang untuk user OAuth bisa nyasar ke sheet **DEMO**). Sinkron memakai **merge by-id**
  (item lokal tak terhapus) + **migrasi sekali per sesi** (push item lokal-saja ke Sheet, `appendRowsToSheet`
  auto-buat tab).
- **`postToSheet` tak lagi fallback ke URL demo** saat API gagal untuk sheet yang didukung API — kegagalan
  kini jujur (`saveError`), tak menulis data user ke tempat lain.
- Diverifikasi: logika `isApiSheet`/`isMissingSheetError`/`mergeEntity`/anti-wipe aset diuji unit; `isApiSheet`
  live benar (14 entitas API, MonthlyBudgets tetap macro); tsc & build bersih.
- Catatan: **MonthlyBudgets** sengaja dikecualikan (logika tab/blob khusus — ditangani terpisah).

---

## [3.14.0] — 2026-07-25 · Panduan Keamanan (PIN per-browser)

**Dampak Google Sheet/Apps Script: TIDAK ADA.** Client-side.

### Ditambahkan
- **Topik "Keamanan" baru di Panduan** (`FinanceGuideKeamananSection.tsx`, `shield_lock`) — menjelaskan
  empat lapisan keamanan (PIN Transaksi, 2FA, Ubah Password, Sesi Aktif), dengan **sorotan PIN
  tersimpan per-browser**: lokal di perangkat, tak disinkron ke Sheet/perangkat lain; set sekali
  menempel permanen; tiap perangkat punya PIN sendiri; hapus data situs = PIN hilang. Ditambah kartu
  model data zero-knowledge (semua di Google Sheet Anda, nol ke pengembang), tips keamanan, dan CTA
  "Buka Pengaturan". Melengkapi perbaikan persistensi PIN di v3.13.1.

---

## [3.13.1] — 2026-07-25 · Perbaikan: PIN Transaksi tersimpan di browser

**Dampak Google Sheet/Apps Script: TIDAK ADA.** Client-side.

### Diperbaiki
- **PIN Transaksi kini tersimpan permanen per-browser.** Sebelumnya `syncFromGoogleSheets` menimpa
  SELURUH `settings` dengan data dari Sheet (yang tak memuat `security_pin`), sehingga PIN yang sudah
  diset terhapus tiap sinkron → aplikasi minta buat PIN lagi tiap sesi. Kini `security_pin` &
  `security_pinActive` diperlakukan **lokal per-browser** (tersimpan di localStorage lewat persist
  store) dan **tidak pernah ditimpa** oleh sinkron; PIN juga tak lagi dikirim ke Sheet lewat
  `updateSettings` (tetap di perangkat ini). Perangkat yang belum punya PIN akan mengadopsi dari
  Sheet sekali (migrasi bagi pengguna lama). Diverifikasi terhadap store: PIN persist ke browser,
  bertahan melewati sinkron, dan diadopsi saat lokal kosong.

---

## [3.13.0] — 2026-07-25 · Trik Impor: E-Statement → Template pakai AI

**Dampak Google Sheet/Apps Script: TIDAK ADA.** Client-side.

### Ditambahkan
- **Trik "ubah e-statement pakai AI"** di Panduan › Transaksi › Impor — langkah + **prompt siap-salin**
  untuk meminta ChatGPT/Gemini/Claude mengubah mutasi bank (format apa pun) ke skema template DompetKu
  (Tanggal · Deskripsi · Jumlah · Tipe · Kategori · Akun). Tombol **"Salin prompt"** menyalin prompt yang
  **sudah otomatis berisi daftar kategori & akun milik user** (diambil dari store lewat `useFinanceStore`),
  jadi hasil AI langsung cocok dan minim rapikan ulang. Disertai **catatan privasi** (data dikirim ke AI
  pihak ketiga OpenAI/Google, di luar prinsip zero-knowledge DompetKu). +1 FAQ terkait.

---

## [3.12.0] — 2026-07-25 · Pratinjau Impor + Template lebih ramping

**Dampak Google Sheet/Apps Script: TIDAK ADA.** Client-side.

### Ditambahkan
- **Pratinjau impor menampilkan Kategori & Akun** — saat template DompetKu terdeteksi, tiap baris
  pratinjau kini menampilkan baris kecil "🏷 kategori · 💳 akun" di bawah keterangan, sehingga
  langsung terlihat bahwa kolom Kategori/Akun/Tipe memang terbaca dari file (tanpa perlu impor dulu).
  Layout tetap 3 kolom (Tanggal · Keterangan · Nominal) agar nominal tak terpotong di layar sempit.

### Diubah
- **Template impor dirampingkan: kolom "Catatan" dihapus** dari template CSV & Excel (`TEMPLATE_HEADERS`,
  `buildTemplateXLSXBlob`) karena tidak ikut diimpor — transaksi DompetKu belum punya field catatan.
  Dropdown Tipe/Kategori/Akun di template Excel tetap utuh. File template lama yang masih punya kolom
  Catatan tetap aman diimpor (kolom tak dikenal diabaikan otomatis).

---

## [3.11.4] — 2026-07-25 · Perbaikan: Auto-Post Anti-Duplikat (idempotent)

**Dampak Google Sheet/Apps Script: TIDAK ADA.** Client-side.

### Diperbaiki
- **Auto-post transaksi berulang kini idempotent (anti-duplikat).** Menutup celah sisa dari
  v3.11.3: bila transaksi berhasil ditulis tapi penyimpanan `lastPostedDate` gagal, occurrence
  itu masih "due" saat app dibuka lagi → berpotensi diposting **dua kali**. Kini tiap occurrence
  memakai **id deterministik** (`autopost_<recId>_<tanggal>`); sebelum memposting, sistem melewati
  occurrence yang transaksinya **sudah ada** (`existingIds`), jadi tak ada duplikat sekalipun
  dicoba berkali-kali. `lastPostedDate` tetap dimajukan untuk semua due item agar berhenti dicek
  ulang. `addTransactionsBulk` diperluas untuk menghormati `id` yang diberikan pemanggil (impor
  biasa tetap men-generate id acak). Diverifikasi terhadap store: 3× run occurrence sama → tetap
  1 transaksi; jalur impor tetap men-generate id acak.

---

## [3.11.3] — 2026-07-25 · Perbaikan: Auto-Post Berulang Andal

**Dampak Google Sheet/Apps Script: TIDAK ADA.** Client-side.

### Diperbaiki
- **Auto-post transaksi berulang kini hanya menandai "sudah diposting" (`lastPostedDate`)
  setelah transaksi BENAR tersimpan ke Google Sheet.** Sebelumnya `AutoPostRunner.tsx` menulis
  tiap transaksi lalu memajukan `lastPostedDate` **tanpa syarat** — bila tulis gagal (koneksi/
  kuota) dan ditelan diam-diam, transaksi hilang tapi ditandai selesai → **tak pernah dicoba lagi**
  (kelas bug yang sama dengan Impor di v3.11.2).
- **Perbaikan:** memakai `addTransactionsBulk` yang terverifikasi (satu tulis batch, `throw` pada
  gagal, tanpa fallback ke URL demo). Gagal → `lastPostedDate` **tidak** maju, saldo **tidak**
  disesuaikan, dan muncul notifikasi "akan dicoba lagi saat aplikasi dibuka lagi". Diverifikasi
  terhadap store: paksa 401 → `lastPostedDate` **tidak** maju, transaksi optimistic di-rollback.

---

## [3.11.2] — 2026-07-25 · Perbaikan: Impor Andal Tersimpan (rate-limit + jujur)

**Dampak Google Sheet/Apps Script: TIDAK ADA.** Client-side (mode OAuth/API).

### Diperbaiki
- **Impor transaksi kini andal tersimpan ke Google Sheet.** Sebelumnya tiap baris ditulis
  satu-per-satu berurutan (N panggilan API). Impor besar menembus **kuota tulis Google Sheets
  (~60/menit/user)** → sebagian balasan **429** ditelan diam-diam (`addRowToSheet` hanya
  `console.error`, tak `throw`), sehingga `postToSheet` mengira sukses. Transaksi masuk ke state
  lokal (optimistic) tapi **tak pernah sampai ke Sheet** → tampak tersimpan lalu **hilang** saat
  sinkron ulang (gejala persis: "sukses tapi hilang").
- **Perbaikan** (`appendRowsToSheet` + store `addTransactionsBulk`): seluruh baris impor ditulis
  dalam **satu `values.append` batch** — anti rate-limit, atomik, jauh lebih cepat. Kegagalan
  kini **bersuara**: tulis yang gagal `throw` → transaksi optimistic **di-rollback**, saldo akun
  **tidak** disesuaikan, dan modal menampilkan pesan error jujur ("transaksi TIDAK jadi diimpor")
  alih-alih sukses palsu. Diverifikasi: jalur sukses (1 append) & jalur gagal (rollback + ok:false)
  diuji langsung terhadap store.

---

## [3.11.1] — 2026-07-23 · Panduan Impor + Privasi Data

**Dampak Google Sheet/Apps Script: TIDAK ADA.** Client-side (dokumentasi in-app).

### Ditambahkan
- **Topik "Impor" baru di Panduan › Transaksi** — sub-tab khusus berisi: dua cara impor
  (Impor Cerdas dari mutasi bank & Template berskema), langkah-langkah, dan yang utama:
  **penjelasan alur data & privasi**. Menjawab pertanyaan "ke mana file yang saya unggah pergi?":
  file CSV/Excel dibaca **100% di browser** (tidak diunggah sebagai file ke mana pun — tidak ke
  Drive, tidak ke server kami), yang tersimpan permanen **hanya baris transaksinya** dan tujuannya
  **Google Sheet milik pengguna sendiri** (lewat Apps Script mereka). **Nol data ke pengembang**
  — konsisten dengan prinsip zero-knowledge DompetKu. Termasuk kartu "Alur data impor" & satu FAQ baru.

---

## [3.11.0] — 2026-07-23 · Template Excel + Dropdown

**Dampak Google Sheet/Apps Script: TIDAK ADA.** Client-side.

### Ditambahkan
- **Template Excel (.xlsx) dengan dropdown** — tombol "Excel (dropdown)" di modal Impor menghasilkan
  workbook dengan **data validation** pada kolom **Tipe** (Pemasukan/Pengeluaran), **Kategori**, dan
  **Akun** — daftarnya diambil dari akun & kategori Anda sendiri (anti salah-ketik). Header ber-styling,
  baris judul dibekukan, + sheet `Referensi` tersembunyi sebagai sumber dropdown. Dibuat via `exceljs`
  yang **di-lazy-load** (chunk terpisah, tak membebani bundle utama). Opsi **CSV** tetap ada.

---

## [3.10.0] — 2026-07-23 · Template Impor Transaksi

**Dampak Google Sheet/Apps Script: TIDAK ADA.** Client-side. Melengkapi Impor Cerdas (v3.9.0).

### Ditambahkan
- **Unduh Template DompetKu** (tombol di modal Impor) — CSV berkolom **Tanggal · Deskripsi · Jumlah ·
  Tipe · Kategori · Akun · Catatan** + 2 baris contoh. Untuk **input massal** atau **migrasi** dari
  app/spreadsheet lain: isi di Excel/Sheets, lalu impor kembali. (Berbeda dari impor e-statement bank
  — ini untuk data terstruktur yang Anda susun sendiri.)
- **Impor sadar-template** — bila file punya kolom **Kategori/Akun/Tipe**, ketiganya dibaca langsung
  (tanda ± dari kolom Tipe, kategori & akun per baris) → transaksi masuk sudah rapi & terkategori.

### Diperbaiki
- Deteksi kolom "Deskripsi" (ejaan Indonesia dgn k) — dulu tak terdeteksi sehingga kolom "Catatan" salah terpilih.

---

## [3.9.0] — 2026-07-23 · Impor Cerdas (Mutasi Bank)

**Dampak Google Sheet/Apps Script: TIDAK ADA.** Client-side. Menyempurnakan Impor (v2.5.0).

### Ditambahkan
- **Dukungan Excel** — impor `.xlsx`/`.xls` (bukan hanya CSV), langsung dari internet/mobile banking.
  Parser Excel dimuat *lazy* (code-split) — tak membebani bundle utama.
- **Preset bank** — pilih bank (BCA/Mandiri/BNI/BRI/Jago/Jenius/SeaBank/blu) → kolom terpetakan
  otomatis; jatuh ke pemeta manual untuk bank tak dikenal.
- **Profil pemetaan tersimpan** — simpan mapping sekali (mis. "BCA Fakhri") → impor bulan depan 1-klik
  (disimpan di tab `Settings` key `import_profiles`, tanpa migrasi).
- **Panduan impor dari PDF** — instruksi salin-tempel tabel dari e-statement PDF.

### Diperbaiki
- **Baris metadata** (info rekening/periode) di atas data kini **dilewati otomatis**.
- **Nominal desimal Indonesia** — `1.000.000,00` kini terbaca benar `1.000.000` (dulu salah jadi 100 juta).

---

## [3.8.0] — 2026-07-23 · Riwayat Pembaruan In-App

**Dampak Google Sheet/Apps Script: TIDAK ADA.** Client-side.

### Ditambahkan
- **Riwayat Pembaruan (changelog) in-app** — kartu "Yang Baru di DompetKu vX.Y.Z" di halaman
  Notifikasi membuka daftar **semua versi** (terbaru di atas) dalam bentuk timeline: judul rilis,
  tanggal, perubahan terperinci (Baru/Diubah/Diperbaiki), dan penanda **"perlu update Apps Script"**
  untuk rilis migrasi. (`changelogData.ts`, `ChangelogModal.tsx`)
- Banner "Fitur Baru" lama (v2.0) dinonaktifkan — digantikan sumber tunggal changelog ini.

---

## [3.7.0] — 2026-07-23 · Warisan & Rangkuman (Fase 7 · Gelombang 7)

**Dampak Google Sheet/Apps Script: TIDAK ADA.** Client-side.

### Ditambahkan
- **Rangkuman Bulanan Naratif** (Laporan › Ringkasan, paling atas) — "bulan ini dalam bahasa manusia":
  headline surplus/defisit + poin pemasukan/pengeluaran, tingkat menabung, kategori terbesar, dan
  perubahan menonjol — capstone "kopilot". (`monthlySummaryUtils.ts`, `MonthlySummaryCard.tsx`)
- **Kalkulator Waris (Faraid)** (Laporan) — estimasi pembagian warisan Islam untuk **struktur keluarga
  umum** (pasangan, anak, orang tua) dengan penanganan **'Aul, Radd, 'ashabah, & 'Umariyyatan**.
  Berdisclaimer kuat + batas cakupan jelas (saudara/kakek/wasiat/utang → rujuk ahli faraid/KUA).
  (`faraidUtils.ts`, `FaraidCalculatorModal.tsx`)

> **Roadmap jilid 2 (Gelombang 1–7) tuntas.** Sisa backlog (benchmark IHSG, konsolidasi keluarga
> lintas-profil, tantangan menabung, OCR struk) sengaja ditahan (rapuh/butuh desain lanjutan).

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
