# PRD Fase 3 — Kedalaman Investor (nilai premium)

> Prasyarat: `docs/prd/README.md`. Fase ini MAYORITAS client-side.
> Konfigurasi baru ditaruh di tab `Settings` (key-value) → TANPA migrasi tab.
> Urutan disarankan: F3.3 (fondasi kurs) → F3.1 → F3.5 → F3.2 → F3.4.

---

## F3.1 XIRR, Realized vs Unrealized Gain  `[effort: L]`

### Rationale
Return % sederhana (nilai/modal − 1) menyesatkan bila ada setoran bertahap. Standar
evaluasi personal portfolio = **XIRR** (money-weighted, annualized). Pemisahan
realized/unrealized juga prasyarat analisis pajak yang jujur.

### Konvensi data JUAL (keputusan yang harus dikunci dulu)
Penjualan aset belum first-class. Konvensi v1 (dokumentasikan di Panduan):
- Jual = transaksi `PEMASUKAN` kategori `Investments Income / Dividends / Capital Gain`
  dengan desc berawalan `Jual <TICKER>` + user mengurangi/menghapus holding manual di Aset.
- Dividen/kupon = `PEMASUKAN` kategori sama, desc `Dividen ...`/`Kupon ...` (pola ini SUDAH
  dipakai data template).
- Backlog v2: flow "Jual" first-class di UI Aset yang membuat transaksi + memangkas holding atomik.

### Sumber arus kas per instrumen (matching by ticker/desc)
```
Beli   : transaksi PENGELUARAN kategori {Stock, Crypto, Reksadana, Bond, Deposito, P2P}
         yang desc-nya memuat ticker/nama aset → CF negatif di tanggalnya
Dividen: PEMASUKAN desc match → CF positif
Jual   : PEMASUKAN desc `Jual <ticker>` → CF positif
Terminal: nilai pasar holding hari ini → CF positif (t = today)
```
Fallback bila tidak ada transaksi beli yang match: pakai `purchaseDate` + `purchasePrice`
holding sebagai satu CF negatif (kualitas lebih rendah — tandai "estimasi").

### Rumus XIRR (util murni `xirr(cashflows: {date, amount}[])`)
```
f(r) = Σ CF_i / (1+r)^(days_i/365)  = 0
Newton-Raphson dari r0=0.1, max 50 iterasi; fallback bisection r∈(−0.99, 10).
Guard: butuh ≥1 CF negatif & ≥1 positif; span < 30 hari → tampilkan return sederhana saja.
```

### UX
- `FinancePerformanceReport.tsx`: kolom baru per holding `XIRR %` + agregat portofolio;
  toggle "Sederhana | XIRR". Kartu ringkas: `Unrealized P/L` (market − cost holdings) vs
  `Realized + Income` (Σ jual + dividen − porsi cost terjual*) — *v1 boleh menyajikan
  "Income diterima" (dividen/kupon/jual) tanpa cost-basis matching penuh; label jujur.
- Tooltip edukasi "Apa itu XIRR?" (+ entri FAQ di Panduan topik Laporan).

### Acceptance criteria
- [ ] Sanity: beli 10jt setahun lalu, nilai kini 11jt, tanpa CF lain → XIRR ≈ 10%.
- [ ] Dua setoran (awal & tengah tahun) menghasilkan XIRR ≠ return sederhana (uji angka tetap di komentar).
- [ ] Divergen/N-A ditangani anggun (badge "N/A" + alasan), tidak NaN di UI.

---

## F3.2 Rebalancing Advisor  `[effort: M]`

### Rationale
Disiplin alokasi = sumber return jangka panjang yang sesungguhnya (CFA). User punya data
alokasi aktual (PortfolioReport/HHI) tapi tidak punya TARGET pembanding.

### Data (Settings, tanpa migrasi)
Keys: `target_alloc_saham`, `target_alloc_reksadana`, `target_alloc_crypto`,
`target_alloc_fixedincome`, `target_alloc_kas` (integer %, Σ=100; editor menormalkan),
`rebalance_band` (default `5` = ±5 poin persentase absolut).

### Logika
```
aktual_k  = nilai kelas k / total (kelas: saham, reksadana, kripto, pendapatan tetap, kas likuid)
drift_k   = aktual_k − target_k        (poin persentase)
status_k  = |drift_k| ≤ band ? OK : (drift>0 ? OVERWEIGHT : UNDERWEIGHT)
saran_k   = drift_k × totalPortofolio  → "kurangi/tambah ± Rp X"
```

### UX
- Seksi baru di `FinancePortfolioReport.tsx`: editor target (slider/input per kelas,
  validasi Σ=100), lalu tabel `Kelas | Target | Aktual | Drift | Status | Saran ±Rp`.
- Bar ganda per kelas (target vs aktual). Badge hijau bila semua dalam band:
  "Portofolio dalam band ±5% — tidak perlu tindakan".
- Bahasa SARAN edukatif, bukan perintah; disclaimer `FinanceGuidePrinciple`; TIDAK ada
  tombol eksekusi apa pun.

### Acceptance criteria
- [ ] Σ target ≠ 100 → tombol simpan disabled + hint normalisasi.
- [ ] Angka saran Rp konsisten dengan drift × total (uji satu kasus tertulis).
- [ ] Target tersimpan ke Settings & tersinkron antar-perangkat.

---

## F3.3 Multi-Currency (fondasi USD)  `[effort: M]`

### Rationale
Template user sudah berisi aset USD (VTI/SPY, PayPal/Wise) tapi seluruh agregasi
mengasumsikan IDR → net worth tidak akurat. Kolom `currency` di Accounts sudah ada (dorman).

### Desain (minim migrasi)
- **Kurs**: Settings key `USDIDR_RATE` — di template Google diisi formula
  `=GOOGLEFINANCE("CURRENCY:USDIDR")` (pola persis `IHSG_PRICE`), fallback manual.
  App membaca via settings; default hardcode wajar (mis. 16.300) bila kosong.
- **Akun**: hormati `accounts.currency` — bila `USD`, konversi saat agregasi.
- **Aset investasi**: TANPA kolom baru. Konvensi: `location`/`notes` mengandung tag `[USD]`
  ATAU ticker terdaftar di set `USD_TICKERS` (Settings key `usd_tickers`, csv, default
  `VTI,SPY,VOO,QQQ`) → nilai dianggap USD.
- **Aturan konversi**: SEMUA agregat (net worth, alokasi, laporan) dalam IDR;
  kartu aset USD menampilkan nilai asli + hasil konversi + kurs yang dipakai.

### Acceptance criteria
- [ ] Akun USD 1.000 dgn kurs 16.300 menambah net worth Rp 16,3jt (bukan Rp 1.000).
- [ ] Ubah `USDIDR_RATE` → seluruh agregat berubah konsisten.
- [ ] Kurs stale (>7 hari, bila timestamp tersedia) → badge peringatan kecil.
- [ ] Panduan topik Aset dapat FAQ "cara mencatat aset USD".

---

## F3.4 Skor Kesehatan Finansial Komposit  `[effort: M]`

### Rationale
Satu angka (0–100) yang merangkum semua rasio = retensi + gamifikasi ringan; pengganti
kebingungan membaca 6 rasio terpisah. Metodologi HARUS transparan (breakdown selalu tampil).

### Formula (linear-interpolasi per metrik, clamp 0–100; bobot configurable konstanta)
| Metrik | Sumber | Skala 0 → 100 | Bobot |
|---|---|---|---|
| Dana darurat (bulan) | likuid / rata-rata pengeluaran bulanan | 0 bln → 0 ; ≥6 bln → 100 | 25 |
| Savings rate | (pemasukan−pengeluaran)/pemasukan (rata2 3 bln) | ≤0% → 0 ; ≥20% → 100 | 20 |
| DTI | Σ minPayment / pemasukan bulanan | ≥50% → 0 ; ≤20% → 100 | 20 |
| Solvabilitas | net worth / total aset | ≤0 → 0 ; ≥60% → 100 | 15 |
| Diversifikasi | skor HHI existing (PortfolioReport, 1–10) | ×10 | 10 |
| Likuiditas struktur | aset likuid / total aset | 0% → 0 ; ≥15% → 100 | 10 |
`Skor = Σ (nilai × bobot) / Σ bobot` → Band: <40 Rentan · 40–69 Cukup · 70–84 Sehat · ≥85 Prima.
Tanpa pemasukan (data kosong) → metrik terkait "N/A" dan bobot didistribusi ulang proporsional.

### UX
- Kartu hero di **Laporan** (gauge setengah lingkaran, pola Budget Health Score yang ada)
  + breakdown 6 baris (nilai, skor, bobot) + "1 langkah paling berdampak" = metrik dengan
  `(100−skor)×bobot` terbesar → teks saran edukatif.
- Simpan snapshot skor bulanan ke Settings key `health_score_history` (JSON ringkas,
  max 24 titik) → sparkline tren.

### Acceptance criteria
- [ ] Breakdown selalu menjumlah konsisten dengan skor utama (±1 poin pembulatan).
- [ ] Kasus data kosong/parsial tidak menghasilkan NaN; band & warna benar di ambang (uji 39/40/69/70/84/85).
- [ ] "Langkah paling berdampak" berubah masuk akal bila salah satu metrik dibuat buruk.

---

## F3.5 Kalender Pendapatan Pasif  `[effort: S-M]`

### Rationale
Data jadwal kupon SUDAH lengkap di matrix Fixed Income (`Payment Date`, `Interest Payment
Period`, rate, tax, principal) tapi tak pernah disajikan sebagai "kapan uang masuk".

### Logika
```
Per instrumen fixed income aktif (maturity > today):
  kupon_bersih_per_periode = principal × rate/periodePerTahun × (1 − tax)
  periodePerTahun: Monthly=12, Quarterly=4, Semi-Annual=2, At Maturity=1(di maturity)
  occurrence: setiap `Payment Date` (hari-ke bulan) sesuai periode, hingga maturityDate
Dividen saham (v1): historis saja — rata-rata dividen 12 bln terakhir dari transaksi
  desc `Dividen ...` → tampil sebagai "estimasi historis", BUKAN jadwal.
```

### UX
- Seksi di `FinancePerformanceReport.tsx` (atau Laporan): bar chart 12 bulan ke depan
  "proyeksi pendapatan pasif/bln" + list detail per bulan (instrumen, tanggal, nominal bersih).
- Kartu ringkas: "Rata-rata pendapatan pasif: Rp X/bln" + rasio vs pengeluaran bulanan
  (= progress menuju financial independence; sambungkan copy-nya dengan FIRE calculator).
- Event bulan berjalan ikut muncul di Kalender Keuangan (F1.2) — dedup dengan maturity.

### Acceptance criteria
- [ ] ORI025 75jt @6,15% monthly tax 10% → ±Rp 346rb/bln pada tanggal 15 (uji tertulis).
- [ ] Instrumen `At Maturity` hanya menghasilkan satu occurrence di maturity.
- [ ] Estimasi historis dividen berlabel jelas "estimasi", tidak dijumlah ke jadwal pasti.

---

## Backlog eksplisit (di luar fase, JANGAN dikerjakan tanpa PRD baru)
- Flow "Jual aset" first-class (mutasi holding + transaksi atomik)
- Cost-basis FIFO & laporan realized gain per lot (pajak)
- Auto-post recurring (butuh kepercayaan + digest)
- Penautan goal ↔ akun/aset (`linkedAccountId`)
- Import CSV/mutasi bank
- Mode multi-profil (keluarga)
