# Fase 5 — Cakrawala Masa Depan 🔭

> Baca [`roadmap-lanjutan.md`](./roadmap-lanjutan.md) + [`README.md`](./README.md) dulu.
> **Sifat fase:** mix. F5.1/F5.2/F5.4 client-side; **F5.3 membawa SATU migrasi terbundel** (tab `Retirement`
> via `ensureSheetExists` + auto-migrate, pola v2.7). Target rilis: **v3.1–v3.2**.

**Tujuan fase:** menjawab pertanyaan terbesar user — *"apakah saya akan baik-baik saja di masa depan?"* —
dengan proyeksi jujur (pakai band ketidakpastian), pelacakan kemandirian finansial, pensiun ala Indonesia,
dan simulasi skenario hidup. Menyambung `FinanceFIRECalculatorModal` & `FinanceEmergencyModal` yang sudah ada.

---

## F5.1 — Proyeksi Kekayaan Bersih (Net Worth Projection)

**Masalah.** App menampilkan net worth **saat ini** dan +12,4% YoY statis, tapi tak memproyeksikan ke depan.
User tak bisa melihat "di mana saya 5/10/20 tahun lagi bila pola ini berlanjut."

**Solusi.** Grafik proyeksi net worth 5/10/20/30 tahun dari: net worth awal + kontribusi bulanan (dari surplus
arus kas F4.1 atau input manual) + asumsi return (per kelas aset atau rata-rata). Ditampilkan sebagai **band**:
- **Konservatif / Basis / Optimis** (mis. return −2σ / rata-rata / +2σ, atau 3 preset return).
- Opsi **Monte Carlo** (mis. 500 lintasan, tampilkan persentil 10/50/90) — edukatif, tandai "simulasi, bukan janji."
- Penanda milestone: "net worth = 25× pengeluaran tahunan (angka kemandirian)" bertemu tahun ke-berapa.

**User story.** *"Kalau saya nabung & investasi seperti sekarang, seperti apa kekayaan saya 20 tahun lagi — dengan rentang realistis?"*

**Spesifikasi teknis.**
- `netWorthProjectionUtils.ts`: `projectDeterministic({start, monthlyContribution, annualReturn, years})`,
  `projectBands({...returns[]})`, opsional `monteCarlo({start, contribution, meanReturn, stdev, years, runs})` (Box-Muller; **tanpa `Math.random` di util murni** — terima seed/generator dari pemanggil, konsisten aturan store).
- `NetWorthProjectionCard.tsx` di Laporan; parameter (return, kontribusi, inflasi) editable + tersimpan di `Settings`.
- Reuse `currencyUtils` (net worth multi-currency) sebagai titik awal.

**Dampak data/Apps Script.** TIDAK ADA (parameter di `Settings`).

**Framing edukasi.** WAJIB: "proyeksi = ilustrasi asumsi, bukan jaminan hasil; pasar berfluktuasi." Band, bukan satu garis.

**Upaya.** Sedang. **Dampak.** Sangat tinggi (fitur aspiratif utama).

---

## F5.2 — Pelacak Kemandirian Finansial (Financial Independence Tracker)

**Masalah.** `FinanceFIRECalculatorModal` sudah menghitung angka FIRE sekali jalan, tapi belum menjadi **pelacak
berkelanjutan** yang menunjukkan "seberapa dekat saya" dan varian (Coast/Lean/Fat).

**Solusi.** Dashboard **Kemandirian Finansial** (Laporan) — perluas FIRE calc jadi tracker:
- **FI Number** = pengeluaran tahunan × (1 ÷ SWR); SWR default 4% (bisa diubah).
- **%FI** = aset investasi ÷ FI Number, dengan progress bar + **tahun-ke-FI** (dari kontribusi & return F5.1).
- **Coast FIRE** (sudah cukup nabung, tinggal biarkan tumbuh?), **Lean/Fat FIRE** (varian gaya hidup).
- **Savings rate** = (pemasukan − pengeluaran) ÷ pemasukan (dari F4.1) — pengungkit terbesar tahun-ke-FI.

**User story.** *"Berapa persen perjalanan saya menuju bebas secara finansial, dan kapan kira-kira sampai?"*

**Spesifikasi teknis.**
- `fiUtils.ts`: `fiNumber(annualExpense, swr)`, `coastFireNumber(...)`, `yearsToFI(current, target, contribution, return)`, `savingsRate(...)`.
- `FinancialIndependenceCard.tsx`; parameter (SWR, target usia, gaya hidup) di `Settings`. Boleh sekaligus merapikan FIRE modal lama jadi pemicu kartu ini.
- `annualExpense` diambil dari F4.1 (rata-rata pengeluaran × 12) dengan opsi override.

**Dampak data/Apps Script.** TIDAK ADA.

**Framing edukasi.** SWR 4% = "aturan praktis" berdisclaimer (asumsi historis pasar tertentu, bukan jaminan Indonesia).

**Upaya.** Rendah–Sedang (menyambung kode yang ada). **Dampak.** Tinggi.

---

## F5.3 — Pensiun Indonesia (BPJS Ketenagakerjaan / JHT · JP · DPLK) ⭐ migrasi

**Masalah.** Perencanaan pensiun global (FIRE) belum memakai instrumen pensiun **wajib/khas Indonesia**:
saldo **JHT** (Jaminan Hari Tua), **JP** (Jaminan Pensiun) BPJS Ketenagakerjaan, dan **DPLK/DPPK**. Nilainya
sering tak terhitung di net worth & rencana pensiun.

**Solusi.** Registry **Pensiun**: catat program (JHT/JP/DPLK/DPPK), saldo terkini, iuran bulanan (%/nominal),
estimasi manfaat. Diproyeksikan (F5.1) & dimasukkan ke net worth (sebagai aset terkunci, ditandai "illiquid").
- Kartu ringkas "Proyeksi saldo pensiun saat usia 56/58" + kontribusi pemberi kerja vs mandiri.
- Terhubung ke FI tracker (F5.2) sebagai sumber pendapatan pensiun.

**User story.** *"Masukkan saldo JHT & DPLK saya ke gambaran kekayaan dan proyeksi pensiun."*

**Spesifikasi teknis (POLA MIGRASI v2.7).**
- Tab baru **`Retirement`** — `HEADERS: ['id','name','progType','provider','currentBalance','monthlyContribution','contributionType','employerContribution','startDate','targetAge','expectedReturn','status','notes']`.
- Apps Script: tambah ke `VALID_SHEETS` + `HEADERS` + `AUTO_CREATE_SHEETS` (auto-create + auto-migrate; user lama cukup paste script sekali — sama seperti `MonthlyBudgets`).
- Store: interface `Retirement` + state + CRUD + parsing sync (pola Goals/Recurring/Insurance).
- `FinanceRetirementSection.tsx` (di Aset, dekat Asuransi) + `RetirementFormModal.tsx`.
- Template v3 → v4: tambah tab `Retirement` + README; regenerate Panduan (embed Apps Script baru).

**Dampak data/Apps Script.** **YA — 1 migrasi** (tab `Retirement`, auto-create). Ikuti Rollout Playbook Tipe B.

**Framing edukasi.** Estimasi manfaat = perkiraan; rujuk BPJSTK/pengelola DPLK untuk angka resmi.

**Upaya.** Sedang–Tinggi (migrasi). **Dampak.** Tinggi (kelengkapan & lokalitas).

---

## F5.4 — Perencana Skenario "What-If"

**Masalah.** Keputusan besar (resign, beli rumah, punya anak, pindah kota) diambil tanpa melihat dampaknya ke
arus kas/net worth/runway. `FinanceEmergencyModal` menghitung dana darurat statis, belum "what-if" dinamis.

**Solusi.** **Simulator skenario**: pilih preset & atur parameter, lihat dampak ke runway, net worth, dan tujuan:
- **Kehilangan/berhenti kerja** → runway (F4.1) + berapa lama tujuan tertunda.
- **Beli rumah/kendaraan** → DP (dari tabungan) + cicilan baru (reuse amortisasi) → dampak arus kas & DTI.
- **Anak baru / biaya besar** → pengeluaran naik X% → proyeksi ulang.
- **Kenaikan gaji / penghasilan sampingan** → percepatan tahun-ke-FI.
- Bandingkan **"sebelum vs sesudah"** berdampingan.

**User story.** *"Kalau saya resign 6 bulan untuk usaha, tabungan saya cukup untuk berapa lama dan tujuan mana yang tergeser?"*

**Spesifikasi teknis.**
- `scenarioUtils.ts`: terima state dasar (arus kas, net worth, tujuan, utang) + delta skenario → hasil proyeksi terdampak. Reuse `cashflowUtils`, `netWorthProjectionUtils`, `amortizationUtils`.
- `ScenarioPlannerModal.tsx` (Laporan/Dasbor); skenario tersimpan opsional di `Settings` (`scenarios` JSON kecil).

**Dampak data/Apps Script.** TIDAK ADA.

**Framing edukasi.** "Alat berpikir, bukan ramalan"; semua asumsi eksplisit & bisa diubah.

**Upaya.** Sedang (memanfaatkan util F4.1 & F5.1). **Dampak.** Sangat tinggi (momen keputusan besar).

---

### Catatan integrasi Fase 5
- F5.1 (proyeksi) & F4.1 (arus kas/surplus) adalah **fondasi** untuk F5.2 & F5.4 — idealnya Fase 4 rilis dulu.
- F5.3 satu-satunya yang migrasi → jadwalkan sebagai rilis tersendiri (v3.2) agar Tipe-B playbook rapi.
- Perbarui Panduan: topik "Pensiun & Kemandirian Finansial".
