# Fase 4 — Kecerdasan Arus Kas 🧠

> Baca [`roadmap-lanjutan.md`](./roadmap-lanjutan.md) + [`README.md`](./README.md) dulu.
> **Sifat fase:** hampir seluruhnya **client-side** (parameter/aturan disimpan di tab `Settings` key-value —
> TANPA migrasi). Target rilis: **v3.0.x**. Menganalisis data yang SUDAH ada (transaksi, akun, anggaran, berulang).

**Tujuan fase:** mengubah DompetKu dari yang *menampilkan* data menjadi yang *memahami & menjelaskan*-nya.
User membuka app dan langsung tahu: "ke mana uang saya pergi, apa yang tidak biasa, dan apa yang akan terjadi."

Urutan implementasi disarankan: **F4.1 → F4.2 → F4.3 → F4.4 → F4.5** (tiap fitur satu sesi + rilis).

---

## F4.1 — Laporan Arus Kas (Cash Flow Statement) + Burn Rate & Runway

**Masalah.** App punya proyeksi kas 30/60/90 hari (dari recurring) tapi belum punya **laporan arus kas riil**
berbasis transaksi historis. User tak bisa melihat pola "masuk vs keluar" bulanan secara terstruktur, atau
tahu berapa lama tabungan bertahan bila pemasukan berhenti.

**Solusi.** Halaman/kartu **Arus Kas** di Laporan: rekap **Pemasukan − Pengeluaran = Arus Kas Bersih** per bulan,
dikelompokkan gaya laporan keuangan sederhana:
- **Operasi** (gaji, belanja, tagihan rutin) · **Investasi** (beli/jual aset, setoran investasi) · **Pendanaan** (cicilan utang, tarik/setor pinjaman).
- **Burn rate** = rata-rata pengeluaran bersih/bulan (3–6 bln terakhir).
- **Runway** = saldo likuid ÷ burn rate → "tabungan bertahan ± N bulan tanpa pemasukan." Terhubung ke Dana Darurat.
- Grafik batang bulanan (masuk hijau / keluar merah / garis net) + toggle 6/12/24 bulan.

**User story.** *"Sebagai pengguna, saya ingin melihat surplus/defisit tiap bulan dan berapa bulan tabungan
saya bertahan, agar tahu apakah gaya hidup saya berkelanjutan."*

**Spesifikasi teknis.**
- File baru `cashflowUtils.ts` (murni): `groupByMonth(transactions)`, `classifyFlow(txn) → 'operasi'|'investasi'|'pendanaan'`
  (heuristik dari `category`/`type`/`account.type`, mirip `getCategoryGroup` di Apps Script), `burnRate(months)`, `runway(liquid, burn)`.
- Komponen `CashFlowStatementCard.tsx` di Laporan › Ringkasan (di bawah/berdampingan Skor Kesehatan).
- Likuid = saldo akun `type ∈ {bank, wallet, cash}`. Reuse util konversi mata uang yang ada (`currencyUtils`).
- Semua perhitungan client-side dari `transactions` + `accounts`.

**Dampak data/Apps Script.** TIDAK ADA (client-side).

**Framing edukasi.** Callout CFP: "arus kas positif adalah fondasi piramida keuangan"; disclaimer runway = estimasi.

**Upaya.** Sedang. **Dampak.** Tinggi (fondasi untuk F4.2 & F4.5).

---

## F4.2 — Wawasan Pengeluaran & Deteksi Anomali

**Masalah.** User harus manual membandingkan pengeluaran antar bulan. Tak ada yang menyorot "bulan ini kamu
boros di kategori X" atau lonjakan tak biasa.

**Solusi.** Kartu **Wawasan** (Laporan/Dasbor) berisi 3–5 *insight* otomatis, contoh:
- **Top movers:** "Makan & Minum naik **+38%** vs rata-rata 3 bln (Rp1,2jt lebih)."
- **Anomali:** transaksi/kategori yang > **mean + 2·stdev** bulanan → "Pengeluaran tak biasa: Rp5jt di 'Elektronik'."
- **Progres anggaran:** kategori yang diproyeksikan **over-budget** akhir bulan (pace analysis: pengeluaran-to-date ÷ hari-berlalu × hari-sebulan).
- **Kemenangan:** "Transport turun 20% — kerja bagus." (nada positif, bukan hanya peringatan).

**User story.** *"Saya ingin app memberi tahu tanpa saya cari — apa yang berubah dari kebiasaan saya bulan ini."*

**Spesifikasi teknis.**
- `insightsUtils.ts`: `categoryTrends(txns, months)`, `detectAnomalies(txns)` (z-score per kategori), `budgetPace(txns, monthlyBudgets, budgetCategories, today)`.
- `SpendingInsightsCard.tsx` — daftar insight berperingkat (severity: info/positif/peringatan), tiap item bisa diklik → filter transaksi terkait.
- Ambang (mis. z-score, % perubahan) disimpan di `Settings` (`insight_anomaly_z`, `insight_trend_pct`) → bisa diubah, ada default wajar.

**Dampak data/Apps Script.** TIDAK ADA (ambang di `Settings` yang sudah ada).

**Framing edukasi.** Insight = observasi netral + "kenapa" (rincian angka), bukan penghakiman.

**Upaya.** Sedang. **Dampak.** Tinggi (fitur "wow" harian).

---

## F4.3 — Deteksi Langganan & Transaksi Berulang Otomatis

**Masalah.** Fitur **Recurring** (v2.0) mengharuskan user memasukkan langganan manual. Padahal jejaknya sudah
ada di transaksi (Netflix, Spotify, cicilan, iuran). Banyak "kebocoran uang" dari langganan terlupa.

**Solusi.** **Pemindai Langganan**: analisis transaksi → temukan pembayaran yang **berulang dengan nominal &
selang ~stabil** (bulanan/tahunan) → tampilkan kandidat: nama, nominal, frekuensi, terakhir bayar, estimasi/tahun.
- Tombol **"Jadikan Transaksi Berulang"** (satu klik → buat entri `Recurring`, reuse flow yang ada).
- Ringkasan **"Total langganan: Rp X/bulan (Rp Y/tahun)"** + sorot yang lama tak dipakai / naik harga.

**User story.** *"Tunjukkan semua langganan saya dari riwayat transaksi, dan berapa total 'kebocoran' bulanan."*

**Spesifikasi teknis.**
- `subscriptionDetectUtils.ts`: kelompokkan transaksi PENGELUARAN by (deskripsi ternormalisasi + nominal ± toleransi),
  cari ≥ 2–3 kemunculan dengan selang median ≈ 28–31 hari (bulanan) atau ≈ 365 hari (tahunan). Skor keyakinan.
- `SubscriptionScannerModal.tsx` dipicu dari halaman Transaksi (dekat tombol "Berulang") atau Dasbor.
- "Jadikan Berulang" memanggil `addRecurring` yang sudah ada; jangan auto-buat (konfirmasi eksplisit — prinsip no silent write).

**Dampak data/Apps Script.** TIDAK ADA (menulis ke tab `Recurring` yang sudah ada, hanya saat user konfirmasi).

**Framing edukasi.** Callout "audit langganan" (CFP: cari kebocoran kecil yang berulang).

**Upaya.** Sedang. **Dampak.** Tinggi (langsung menghemat uang nyata).

---

## F4.4 — Aturan Auto-Kategorisasi (Rules Engine)

**Masalah.** Impor CSV (Wave D) & transaksi manual mengandalkan kategori default. User mengkategorikan ulang
berulang kali untuk merchant yang sama.

**Solusi.** **Aturan sederhana**: "JIKA deskripsi/lokasi mengandung `<teks>` (atau cocok pola) MAKA kategori = `<X>`,
akun = `<Y>` (opsional)." Diterapkan otomatis saat **impor CSV** dan bisa dijalankan pada transaksi lama ("terapkan ke semua").
- Manajer aturan: tambah/edit/hapus/urutkan (prioritas atas-ke-bawah, first-match).
- Saran aturan otomatis: bila user mengubah kategori transaksi impor, tawarkan "buat aturan untuk merchant ini?".

**User story.** *"Setiap transaksi berdeskripsi 'INDOMARET' harusnya otomatis masuk 'Belanja Harian'."*

**Spesifikasi teknis.**
- `categoryRulesUtils.ts`: `applyRules(txn, rules) → {category, account?}`; integrasi ke `csvImportUtils.buildTransactions`/`toTransactionPayload`.
- Simpan aturan sebagai JSON di `Settings` key `category_rules` (pola tag/JSON di satu sel — konsisten, tanpa migrasi; array kecil).
- `CategoryRulesModal.tsx` dari Pengaturan atau modal Impor CSV.

**Dampak data/Apps Script.** TIDAK ADA (aturan di `Settings`).

**Framing edukasi.** — (utilitas, bukan saran finansial).

**Upaya.** Rendah–Sedang. **Dampak.** Sedang (mengurangi friksi impor besar).

---

## F4.5 — Peringatan Cerdas (Smart Alerts / Nudges)

**Masalah.** Kalender Keuangan (v1.1) menampilkan jatuh tempo, tapi belum ada peringatan **prediktif** berbasis
perilaku (mis. "dengan laju ini anggaran Makan akan jebol dalam 6 hari", "saldo diproyeksikan minus tgl 25").

**Solusi.** Mesin nudge yang menghasilkan peringatan dari fitur F4.1–F4.3 + recurring:
- **Proyeksi over-budget** (dari F4.2 pace) · **Prediksi saldo rendah/minus** (dari F4.1 + recurring jatuh tempo) ·
  **Tagihan/renewal ≤ 3 hari** · **Langganan baru terdeteksi** (dari F4.3) · **Runway < 3 bulan** (peringatan dana darurat).
- Muncul di **Notifikasi** (badge) + opsional pil ringkas di Dasbor. Tiap jenis bisa di-*mute* & ambangnya diatur di Pengaturan.

**User story.** *"Ingatkan saya SEBELUM masalah terjadi — bukan setelah saldo sudah minus."*

**Spesifikasi teknis.**
- `smartAlertsUtils.ts`: agregasi generator dari util fase ini → array `{id, severity, title, detail, action}`.
- Render di `FinanceNotifications.tsx` (pola section yang ada) + preferensi mute/ambang di `Settings` (`alert_<jenis>_enabled`, `alert_<jenis>_threshold`).
- Hormati prinsip "proaktif tapi tidak berisik": default ambang konservatif, mudah dimatikan.

**Dampak data/Apps Script.** TIDAK ADA.

**Framing edukasi.** Nada membantu, tak menakut-nakuti; tiap alert punya "kenapa" + saran langkah.

**Upaya.** Sedang (bergantung F4.1–F4.3). **Dampak.** Tinggi (nilai "proaktif" yang membedakan).

---

### Catatan integrasi Fase 4
- F4.1–F4.3 menghasilkan util yang **dikonsumsi** F4.5 → kerjakan berurutan.
- Semua panel baru ikut pola glassmorphism + dark mode token + format `id-ID`.
- Tambahkan **1 topik Panduan "Arus Kas & Wawasan"** setelah F4.1–F4.2 rilis (opsional tapi disarankan).
