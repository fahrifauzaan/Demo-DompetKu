# PRD DompetKu — Roadmap Lanjutan (Fase 4–7)

> **Dokumen fondasi jilid 2.** Baca [`README.md`](./README.md) dulu (arsitektur, kontrak data,
> pola UI, playbook rollout, Definition of Done) — semua itu **tetap berlaku** dan tidak diulang di sini.
> Ditulis 23 Jul 2026, berdasarkan kondisi kode saat commit `b28f9b1` (v2.7.0).

## Di mana kita sekarang

Seluruh **Roadmap jilid 1 (Fase 1–3) + backlog Wave A–E SUDAH RILIS & LIVE** (v1.1 → v2.7.0):

- **Fase 1 (Quick Wins):** Zakat Maal, Kalender Keuangan, Ekspor Harta SPT, Amortisasi + konverter bunga, Rekonsiliasi saldo.
- **Fase 2 (Inti Perencanaan):** Tujuan Keuangan (PMT + sinking fund), Transaksi Berulang + Proyeksi Kas, Proteksi/Asuransi (kalkulator UP).
- **Fase 3 (Kedalaman Investor):** XIRR & realized/unrealized, Rebalancing advisor, Multi-currency USD, Skor Kesehatan komposit, Kalender Pendapatan Pasif.
- **Backlog:** Jual aset first-class + realized gain, indikator simpan global, auto-post recurring, penautan tujuan↔akun, impor CSV bank, **multi-profil/keluarga**, refactor `monthlyBudgets` → tab tidy.
- **Kalkulator edukasi yang SUDAH ada** (jangan dibuat ulang — perluas saja): `FinanceFIRECalculatorModal`, `FinanceEmergencyModal`, `DebtSimulatorModal`, `FinanceRatioSimulatorModal`, `TaxGuideModal`.

**Yang belum tergarap** (peluang jilid 2): lapisan **kecerdasan** (analisis & deteksi otomatis), **proyeksi jangka panjang** (net worth & kemandirian finansial), **kedalaman pajak & pensiun Indonesia**, dan **investasi lanjutan**.

## Tema roadmap jilid 2

> **"Dari Perencana → Kopilot Keuangan Cerdas."**

DompetKu sudah punya **data** (pencatatan) dan **rencana** (tujuan/proteksi/anggaran). Langkah berikutnya
adalah menjadikannya **cerdas** (memahami & menjelaskan uang Anda otomatis), **berpandangan ke depan**
(memproyeksikan masa depan dengan ketidakpastian), dan **paling lengkap untuk konteks Indonesia**
(pajak PPh, pensiun BPJS/DPLK, zakat penghasilan, warisan). Semua tetap dalam batas **education-only**.

Tiga kata kunci naik-kelas: **Analitis → Prediktif → Preskriptif** (saran edukatif, bukan eksekusi).

## Pilar & pemetaan fitur

| Pilar | Inti | Fase |
|---|---|---|
| 🧠 **Kecerdasan Arus Kas** | Pahami & jelaskan uang otomatis | **Fase 4** |
| 🔭 **Cakrawala Masa Depan** | Proyeksi net worth, kemandirian, pensiun ID | **Fase 5** |
| 🇮🇩 **Lokal Sempurna** | Pajak PPh, zakat penghasilan, SPT lengkap | **Fase 6** |
| 📈 **Investor Pro & Keterlibatan** | Benchmark, DCA/DRIP, utang cerdas, keluarga, engagement | **Fase 7 (backlog)** |

## Prinsip tambahan (khusus jilid 2)

Selain 4 prinsip non-negotiable di README (education-only, no silent write, Bahasa Indonesia, data user suci):

5. **Insight harus bisa ditindaklanjuti & transparan.** Setiap angka "pintar" (anomali, proyeksi, skor) wajib
   punya **"kenapa"** yang bisa dibuka (rincian perhitungan) — tidak ada kotak hitam. Prediksi selalu memakai
   **band/rentang** (optimis–basis–konservatif), bukan satu angka palsu-presisi.
6. **Hemat migrasi.** Utamakan client-side + `Settings` key-value. Tab baru hanya bila data benar-benar relational
   & bervolume (pola `ensureSheetExists` + auto-migrate seperti `MonthlyBudgets` di v2.7). Satu fase = maksimal satu migrasi terbundel.
7. **Proaktif tapi tidak berisik.** Notifikasi/nudge harus bisa di-*mute* per jenis, punya ambang yang bisa diubah,
   dan tak pernah menakut-nakuti. Default: tenang.

## Kerangka prioritas (Value × Effort)

Setiap fitur diberi skor **Dampak** (nilai finansial bagi user) dan **Upaya** (kompleksitas). Urutan fase
mendahulukan **dampak tinggi / upaya rendah** dan yang **memakai data yang sudah ada** (transaksi, aset, utang).
Fase 4 sengaja hampir seluruhnya client-side (cepat rilis, langsung terasa), migrasi ditahan ke Fase 5/6.

## Ringkasan fase

| Fase | Judul | Fitur | Sifat | Target versi |
|---|---|---|---|---|
| **4** | Kecerdasan Arus Kas | Laporan Arus Kas, Wawasan & Anomali, Deteksi Langganan, Rules/Auto-kategori, Peringatan Cerdas | Client-side (Settings) | v3.0.x |
| **5** | Cakrawala Masa Depan | Proyeksi Net Worth, Pelacak Kemandirian Finansial, Pensiun ID (BPJS TK/DPLK), Skenario What-If | Mix (1 migrasi: `Retirement`) | v3.1–v3.2 |
| **6** | Lokal Sempurna (Pajak & Zakat) | Estimator PPh 21, Zakat Penghasilan + Haul, SPT Tahunan Lengkap, Perencanaan Pajak | Client-side + Panduan | v3.3 |
| **7** | Investor Pro & Keterlibatan (backlog) | Benchmark vs IHSG, DCA planner, DRIP, Watchlist+alert, Snowball/Avalanche, Konsolidasi keluarga, Faraid, Tantangan menabung | Mix | v3.4+ |

Detail per fase: [`fase-4-kecerdasan-arus-kas.md`](./fase-4-kecerdasan-arus-kas.md),
[`fase-5-cakrawala-masa-depan.md`](./fase-5-cakrawala-masa-depan.md),
[`fase-6-lokal-sempurna.md`](./fase-6-lokal-sempurna.md).

**Prioritas tajam (logika fungsi + backend + urutan build):** [`prioritas-teknis.md`](./prioritas-teknis.md) —
matriks skor, urutan gelombang dependency-aware, dan spec teknis siap-implementasi untuk fitur tier atas.

## Backlog terperinci (Fase 7+) — kandidat, belum dispec penuh

**Investasi lanjutan:**
- **Benchmark portofolio** vs IHSG/LQ45/indeks reksadana (alpha, tracking); butuh harga indeks (GOOGLEFINANCE di Settings).
- **DCA Planner & Tracker** — jadwalkan setoran rutin ke aset, lacak harga rata-rata & disiplin.
- **DRIP** (reinvestasi dividen/kupon) — proyeksi pertumbuhan income bila kupon diputar ulang.
- **Watchlist + target price alert** — pantau ticker incaran + pengingat saat menyentuh target (edukatif).
- **Glide path alokasi** berbasis usia/horizon (menyambung Rebalancing Advisor).

**Utang cerdas (perluas `DebtSimulatorModal`):**
- **Snowball vs Avalanche** — bandingkan dua strategi + tanggal bebas-utang + total bunga.
- **Simulator ekstra bayar** — "jika +Rp500rb/bln, hemat X bulan & Rp Y bunga."
- **Dashboard DTI & utilisasi** — rasio cicilan/penghasilan, peringatan zona bahaya.

**Keluarga & kolaborasi (menyambung multi-profil):**
- **Konsolidasi rumah tangga** — net worth & arus kas gabungan lintas profil (read-only aggregate).
- **Split pengeluaran** — siapa-berutang-ke-siapa untuk biaya bersama.
- **Dana pendidikan per anak** — sinking fund khusus + proyeksi biaya kuliah (inflasi pendidikan).

**Kepatuhan & warisan:**
- **Kalkulator Waris/Faraid** — pembagian warisan sesuai hukum Islam (edukatif, berdisclaimer + rujukan ulama).
- **Wasiat & aset digital** — daftar aset + penerima (bukan dokumen legal, sekadar organizer).

**Keterlibatan & pengalaman:**
- **Tantangan menabung** (52-week, no-spend) + streak & milestone net worth.
- **Rangkuman bulanan naratif** — "bulan ini" dalam bahasa manusia (pemasukan, top kategori, 1 hal untuk diperbaiki).
- **Dashboard yang bisa dikustom** (susun ulang widget).
- **Impor lanjutan:** OCR struk, deteksi duplikat transaksi.

## Definition of Done

Sama persis dengan README jilid 1. Untuk fitur beraroma saran (proyeksi, pajak, zakat, skenario): **wajib**
disclaimer edukasi + parameter bisa diubah user + tampilkan asumsi/rumus.
