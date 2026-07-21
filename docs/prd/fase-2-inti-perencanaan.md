# PRD Fase 2 — Inti Perencanaan (SATU migrasi template terbundel)

> Prasyarat: baca `docs/prd/README.md` (khususnya Rollout Playbook Tipe B).
> Fase ini menambah **3 tab sheet baru**: `Goals`, `Recurring`, `Insurance`.
> ⭐ ATURAN EMAS FASE INI: ketiga fitur dirilis dalam **SATU update template + SATU
> update Apps Script + SATU pengumuman** — user lama cukup update SEKALI.
> ⭐ Apps Script WAJIB menyediakan `ensureSheetExists(name)` yang membuat tab + header
> otomatis saat pertama diakses, sehingga user lama TIDAK perlu menyentuh spreadsheet.

## Model data baru (kontrak `HEADERS`)

```js
Goals:     ['id','name','icon','color','goalType','targetAmount','targetDate','startDate',
            'initialAmount','expectedReturn','monthlyContribution','priority','status','notes']
Recurring: ['id','name','type','amount','category','account','frequency','dayOfMonth',
            'startDate','endDate','lastPostedDate','autoPost','notes']
Insurance: ['id','name','insType','provider','policyNumber','premium','premiumFrequency',
            'coverageAmount','startDate','renewalDate','insured','beneficiary','status','notes']
```
Catatan:
- Gaya penamaan mengikuti tab flat existing (camelCase, id di kolom pertama) → CRUD generik
  `readSheet/appendToSheet/updateInSheet/deleteFromSheet` LANGSUNG bekerja begitu entri
  `HEADERS` ditambahkan. Backend nyaris gratis.
- ✅ CHECKPOINT implementasi: verifikasi cara `doGet` mengagregasi hasil `readAll` — jika daftar
  sheet-nya hardcoded, tambahkan Goals/Recurring/Insurance ke daftar itu.
- `policyNumber` opsional & disarankan disimpan sebagian (masking di UI) — ini data sensitif.
- Store: tambah interface + state + CRUD actions + blok parsing di `syncFromGoogleSheets`
  (pakai pola `getVal` toleran seperti Debts).

---

## F2.1 Tujuan Keuangan (Goals) — termasuk Sinking Fund  `[effort: L]` ⭐ prioritas fase

### Rationale
Jantung financial planning: DP rumah, dana nikah, pendidikan, pensiun, dana darurat.
**Keputusan desain:** sinking fund (THR, pajak kendaraan, qurban, servis) = goal bertipe
`sinking` dengan `expectedReturn=0` dan horizon pendek → satu modul, dua kegunaan, tanpa tab tambahan.
FIRE calculator yang ada menjadi salah satu preset goal (pensiun).

### Navigasi
Tab baru `'goals'` di `FinanceDemo.tsx` — NavItem "Tujuan" (ikon `flag`), posisi antara
"Rencana Utang" dan "Laporan". Komponen `FinanceGoals.tsx` + form `GoalFormModal.tsx`.

### Field & semantik
| Field | Arti |
|---|---|
| `goalType` | `'goal'` (investasi jangka menengah/panjang) atau `'sinking'` (tabungan siklus pendek) |
| `targetAmount`, `targetDate` | nominal & tanggal target |
| `initialAmount` | dana yang sudah terkumpul saat goal dibuat |
| `expectedReturn` | asumsi return tahunan % (0 untuk sinking; preset: konservatif 4, moderat 8, agresif 12 — editable) |
| `monthlyContribution` | komitmen setoran bulanan user (bisa diisi dari hasil hitung PMT) |
| `priority` | 1–3 (Tinggi/Sedang/Rendah) |
| `status` | `Aktif` / `Tercapai` / `Dibatalkan` |

### Matematika (inti fitur — tulis sebagai util murni + unit-test ringan di komentar)
```
n  = bulan dari hari ini ke targetDate (pembulatan ke bawah, min 1)
r  = expectedReturn / 100 / 12
FV_dibutuhkan = targetAmount − initialAmount × (1+r)^n
PMT_disarankan = r > 0 ? FV_dibutuhkan × r / ((1+r)^n − 1)
                       : FV_dibutuhkan / n            // dan floor di 0 bila sudah cukup
Proyeksi_akhir  = initialAmount×(1+r)^n + monthlyContribution × ((1+r)^n − 1)/r   (r>0; else + PMT×n)
Status on-track  = Proyeksi_akhir ≥ targetAmount → badge "On Track" / "Off Track (kurang Rp X)"
Progress_%       = initialAmount_terkini / targetAmount   // lihat "sumber progres" di bawah
```
**Sumber progres v1 (keputusan):** progres = `initialAmount` yang DIEDIT user berkala
(tombol "Update dana terkumpul" di kartu goal — sama seperti pola update saldo akun).
TIDAK menautkan otomatis ke akun/aset di v1 (linking = kompleksitas tinggi; masuk backlog v2 sebagai `linkedAccountId`).

### UX
- Grid kartu goal: ikon+warna, nama, progress bar, `terkumpul / target`, badge on/off-track,
  "butuh Rp X/bln" vs "komitmen Rp Y/bln", sisa waktu. Sinking fund tampil di seksi terpisah di bawah.
- Form: preset template goal (DP Rumah, Dana Pendidikan, Dana Nikah, Pensiun/FIRE, Dana Darurat, THR/Pajak kendaraan[sinking]) yang mengisi default masuk akal.
- Kartu ringkasan atas: total komitmen bulanan semua goal aktif vs **sisa kas bulanan**
  (pendapatan − pengeluaran rata-rata 3 bln dari transactions) → peringatan bila komitmen > sisa kas (pola "Peringatan CFP" di `DebtSimulatorModal`).
- Integrasi Laporan: kartu "Tujuan Keuangan" ringkas (n aktif, m on-track) → navigate.
- `FinanceGuidePrinciple` + disclaimer asumsi return.
- Panduan: tambah topik "Tujuan" di `FinanceGuide` (pola section yang ada).

### Acceptance criteria
- [ ] PMT sanity: target 120jt, 0 awal, 24 bln, r=0 → Rp 5jt/bln; r=12% → ±Rp 4,45jt/bln.
- [ ] Ubah `expectedReturn` → PMT & proyeksi berubah live; goal `targetDate` lampau → status "Terlewat" + ajakan revisi.
- [ ] CRUD tersinkron ke tab `Goals` (uji sheet demo); tab terbuat otomatis via `ensureSheetExists`.
- [ ] Sinking fund tersembunyi dari agregat "investasi" (dia tabungan siklus, bukan portofolio).

---

## F2.2 Transaksi Berulang + Proyeksi Arus Kas  `[effort: L]`

### Rationale
Mengubah app jadi forward-looking: "cukupkah kas saya sampai gajian?" — pertanyaan
finansial paling sehari-hari yang belum terjawab.

### Prinsip v1 (keputusan produk)
**Reminder + one-tap post. TIDAK ada auto-post diam-diam.** Kolom `autoPost` disiapkan
di skema untuk masa depan tapi UI v1 tidak mengeksposnya (hardcode false).

### Semantik field
- `frequency`: `MONTHLY` (pakai `dayOfMonth` 1–31, clamp akhir bulan) | `WEEKLY` (dayOfMonth dipakai sbg 1–7 = Sen–Min) | `YEARLY` (pakai bulan+hari dari `startDate`).
- `type`: `PEMASUKAN` | `PENGELUARAN` (transfer berulang: out of scope v1).
- `lastPostedDate`: tanggal occurrence terakhir yang SUDAH diposting user.

### UX
- Kelola dari halaman **Transaksi**: tombol "Berulang" → panel/halaman list recurring + form (`RecurringFormModal.tsx`). Badge kecil `↻` pada transaksi hasil posting.
- **Due & posting:** di Kalender Keuangan (F1.2) + banner kecil di atas Log Transaksi:
  "3 transaksi berulang jatuh tempo" → sheet/list dengan tombol **"Posting"** per item
  (membuat transaksi nyata via `addTransaction`, set `lastPostedDate`) dan "Lewati".
- **Proyeksi kas** (kartu di Dasbor + panel di Transaksi):
  ```
  saldoAwal = Σ balance akun likuid
  occurrences 90 hari ke depan (dari semua recurring aktif) → sorted
  runningBalance per tanggal → line chart 30/60/90 hari (recharts, sudah dependency)
  Flag: tanggal pertama saldo < 0 → "⚠ kas diproyeksikan minus pada dd MMM"
        atau < target dana darurat bulanan → warning kuning
  ```

### Acceptance criteria
- [ ] Occurrence generator benar utk MONTHLY tgl 31 di Feb (clamp), YEARLY lintas tahun, WEEKLY.
- [ ] Posting membuat transaksi identik dgn manual (kategori/akun valid) & memajukan `lastPostedDate`; tidak bisa double-post occurrence yang sama.
- [ ] Proyeksi konsisten: tanpa recurring → garis datar; recurring gaji+cicilan → tangga naik/turun di tanggal benar.
- [ ] Endowment: `endDate` terlewati → recurring otomatis tampil nonaktif.

---

## F2.3 Proteksi / Asuransi  `[effort: M]`

### Rationale
Piramida CFP: proteksi SEBELUM investasi — satu-satunya lapisan yang belum ada sama sekali.
V1 = registry polis + pengingat + kalkulator kebutuhan UP edukatif (bukan saran produk).

### Semantik field
- `insType`: `Jiwa` | `Kesehatan` | `Kendaraan` | `Properti` | `Lainnya`.
- `premiumFrequency`: `Bulanan` | `Tahunan`.
- `coverageAmount` = Uang Pertanggungan (UP); untuk kesehatan boleh 0/limit kamar (catat di notes).

### UX
- V1 **tanpa tab navigasi baru**: seksi "Proteksi" di halaman **Aset** (bawah) ATAU kartu di Laporan → keputusan implementer, dokumentasikan. List polis: ikon per jenis, provider, UP, premi (+konversi /bln), badge status & "jatuh tempo < 30 hari".
- Renewal masuk **Kalender Keuangan** (F1.2) otomatis.
- Ringkasan: total premi/bulan + **rasio premi** = premi tahunan / penghasilan tahunan
  (dari rata-rata pemasukan 12 bln) dengan rujukan edukasi "umumnya ≤ 10%".
- **Kalkulator kebutuhan UP jiwa** (modal edukasi, pola TaxGuideModal):
  ```
  Metode 1 (income replacement): UP ≈ penghasilan tahunan × 10   (rule of thumb, tampilkan sbg rentang 8–12×)
  Metode 2 (expense + utang):    UP ≈ pengeluaran tahunan × tahunProteksi + Σ utang − aset likuid
  ```
  Bandingkan dengan Σ UP polis jiwa aktif → "kesenjangan proteksi" (positif/negatif). Disclaimer tegas.

### Acceptance criteria
- [ ] CRUD polis tersinkron ke tab `Insurance`; `policyNumber` dimasking di list (`•••1234`).
- [ ] Renewal < 30 hari muncul di Kalender Keuangan.
- [ ] Kalkulator UP: kedua metode tampil berdampingan + disclaimer; tidak menyebut produk/merek.
- [ ] Rasio premi akurat & berformat id-ID.

---

## Rencana Migrasi Terbundel (kerjakan SETELAH ketiga fitur selesai di kode)

1. **Apps Script** (`google-apps-script.js`):
   - Tambah 3 entri `HEADERS` di atas.
   - Tambah `ensureSheetExists(sheetName)`: bila `getSheetByName` null → `insertSheet`, tulis
     baris header dari `HEADERS[sheetName]`, freeze row 1. Panggil di awal `readSheet`,
     `appendToSheet`, `updateInSheet`, `deleteFromSheet` KHUSUS untuk 3 tab baru
     (jangan sentuh perilaku tab lama).
   - Pastikan agregasi `doGet/readAll` menyertakan 3 sheet baru.
2. **Template xlsx** (skrip python baru `scratch/build_v3.py`, pola build_v2 sesi lalu):
   - Tambah 3 tab + header + 1–2 baris contoh (goal DP rumah, recurring gaji+Netflix, polis jiwa contoh) di `dompetku_template_v2_rapi.xlsx` → simpan sbg `dompetku_template_v3.xlsx` + regenerasi starter.
   - Jalankan ulang audit kolom (pola `integration_audit.py`) — sheet == HEADERS, 0 selisih.
3. **Panduan**: jalankan `scratch/build_panduan_with_code.py` (kode baru ter-embed) → deploy `panduan.bantu-umkm.tech`. Update konten panduan (fitur baru + FAQ "kenapa ada tab baru?").
4. **Pengumuman in-app**: `ANNOUNCE_ID = 'planning_update_<yyyy_mm>'` di `FinanceNotifications.tsx` — copy: "Fitur baru: Tujuan, Transaksi Berulang & Proteksi — update Apps Script Anda (±3 menit)".
5. **Panduan in-app** (`FinanceGuide`): topik baru "Tujuan" (+FAQ recurring & proteksi di topik terkait).
6. Deploy app (main+demo) + push kedua remote. Master template Google: tempel script baru → Deploy New version (tab baru terbuat otomatis — TIDAK perlu edit sheet manual, berkat `ensureSheetExists`).
