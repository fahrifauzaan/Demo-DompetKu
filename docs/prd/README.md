# PRD DompetKu — Roadmap Penyempurnaan Fitur

> **Dokumen fondasi.** Baca file ini SEBELUM mengerjakan fitur apa pun dari Fase 1–3.
> Ditulis 21 Jul 2026, berdasarkan kondisi kode saat commit `38298b9`.

## Cara memakai PRD ini (untuk sesi implementasi Claude)

1. Kerjakan **satu fitur per sesi**. Jangan mencampur beberapa fitur dalam satu commit besar.
2. Template prompt untuk memulai sesi implementasi:
   ```
   Baca docs/prd/README.md, lalu baca docs/prd/fase-1-quick-wins.md bagian F1.1.
   Implementasikan fitur tersebut sesuai spec, ikuti Definition of Done di README.
   ```
3. Setiap fitur harus melewati **Definition of Done** (bagian bawah dokumen ini).
4. Jika spec bertentangan dengan kondisi kode aktual, **kode aktual menang** — perbarui PRD-nya, jangan paksakan spec.

## Konteks produk

DompetKu = personal finance tracker premium (lisensi berbayar) untuk pasar Indonesia.
Positioning: "Premium Finance Tracker" dengan framing **CFP®/CFA®** (sudah dipakai di modul Anggaran, DebtSimulator, dan Panduan). Tema roadmap ini: mengubah DompetKu dari *pencatat masa lalu* menjadi *perencana masa depan* (tujuan, proyeksi, proteksi) — mengikuti piramida perencanaan keuangan: arus kas → proteksi → dana darurat → tujuan → investasi → pajak.

## Arsitektur (ringkas)

- **Frontend:** Vite + React 19 + Tailwind v4 + zustand. SPA murni, TANPA server sendiri.
- **Backend per user:** Google Sheets milik user + Google Apps Script Web App (file [`google-apps-script.js`](../../google-apps-script.js) di repo = source of truth; user menempelkannya sendiri).
- **Hosting (PENTING — deploy manual):**
  - App produksi: `https://dompetku.bantu-umkm.tech` (Hostinger static)
  - Demo: `https://demo.bantu-umkm.tech` (build sama; mode demo via deteksi hostname di `FinanceLogin.tsx`)
  - Panduan: `https://panduan.bantu-umkm.tech` (halaman statis + kode Apps Script ter-embed)
  - `git push` HANYA men-deploy Vercel legacy (banner "pindah domain"). App asli dideploy manual: `npm run build` → zip isi `dist/` → Hostinger MCP `hosting_deployStaticWebsite` ke `dompetku.` DAN `demo.bantu-umkm.tech`.
- **Remote git:** `origin` = DompetKu-Demo, `demo` = Demo-DompetKu. Push ke keduanya.

## Peta file kunci

| Area | File |
|---|---|
| Shell navigasi + union `FinanceTab` | `src/FinanceDemo.tsx` (tambah tab = 4 titik edit: tipe, NavItem desktop+mobile, judul header, blok render) |
| Store utama (tipe, CRUD, sync) | `src/store/useFinanceStore.ts` |
| Auth | `src/store/useAuthStore.ts` |
| Halaman fitur | `src/finance-components/Finance{Dashboard,Transactions,Budget,Assets,Debts,Analytics,Settings,Notifications}.tsx` |
| Laporan lanjutan | `FinancePortfolioReport.tsx`, `FinancePerformanceReport.tsx`, `FinanceEquityLedger.tsx` |
| Modal edukasi (POLA UTAMA untuk fitur kalkulator) | `TaxGuideModal.tsx`, `FinanceFIRECalculatorModal.tsx`, `DebtSimulatorModal.tsx`, `FinanceEmergencyModal.tsx`, `FinanceRatioSimulatorModal.tsx` |
| Panduan in-app (5 topik + callout CFP) | `FinanceGuide*.tsx`, `FinanceGuidePrinciple.tsx` |
| Cetak | `FinancePrintableReport.tsx`, `FinancePrintableLedger.tsx` (dipicu via store `printType` + `setLedgerPrintTransactions`) |
| Backend Apps Script | `google-apps-script.js` — `HEADERS` (baris ±22–33), `readSheet`/`appendToSheet`/`updateInSheet`/`deleteFromSheet` generik untuk tab flat; handler khusus matrix `*FixedIncome*` (baris ±870–1150) |
| Template DB master | `scratch/dompetku_template_v2_rapi.xlsx` (lengkap) & `scratch/dompetku_template_starter.xlsx` (kosong) |
| Builder halaman panduan+kode | `scratch/build_panduan_with_code.py` (jalankan dari `scratch/`; meng-embed `google-apps-script.js` ke `index.html` + `kode.txt`) |

## Kontrak data (WAJIB dipahami)

1. **Tab flat** (Transactions, Accounts, Saham, Crypto, Reksadana, BudgetCategories, Debts, Settings, AssetsNonLiquid): CRUD generik Apps Script menulis **by-position** memakai `HEADERS[sheetName]`. ⚠️ Urutan kolom template HARUS = `HEADERS`. (Bug historis: Reksadana tanpa `Ticker` → data bergeser. Sudah diperbaiki di commit `dcbe21d`.)
2. **Pembacaan toleran:** store memakai `getVal(obj, [varian nama])` dan Apps Script punya `getValueCaseInsensitive` + alias. Menambah kolom BARU di ujung kanan aman; menyisipkan di tengah = MIGRASI.
3. **Tab matrix `Fixed Income Investment`:** seksi berbasis NOMOR BARIS (bonds 31–77, deposito 80–117, P2P 120–150; header di 30/79/119). JANGAN mengubah strukturnya.
4. **Tab `Budgeting`:** dashboard visual yang digenerate `setupBudgetingSheet()`; app TIDAK membacanya.
5. **`Settings` (key-value)** = tempat murah untuk konfigurasi baru TANPA migrasi tab (contoh yang sudah ada: `IHSG_PRICE` via GOOGLEFINANCE). Fitur baru sebaiknya menaruh preferensi/parameter di sini bila memungkinkan.
6. **`monthlyBudgets`** di store = anggaran per bulan per kategori.
7. Penjualan aset investasi BELUM first-class (tidak ada flow "jual"); lihat konvensi di Fase 3 (F3.1).

## Pola UI yang WAJIB dipakai ulang

- **Modal edukasi bertab** → `TaxGuideModal.tsx` (header ikon, tab pill, konten step bernomor, footer CTA).
- **Callout prinsip CFP/CFA + disclaimer** → `FinanceGuidePrinciple.tsx`. SEMUA fitur beraroma saran (zakat, goals, asuransi, rebalancing) WAJIB memakai disclaimer "edukasi umum, bukan nasihat personal".
- **Kartu glassmorphism** → lihat bento cards di `FinanceTransactions.tsx` (kelas `liquid-glass`).
- **Format:** angka `toLocaleString('id-ID')`, tanggal `yyyy-mm-dd` di data / `dd-MMM-yyyy` di UI, dark mode via token `dark:` yang sudah ada (`#a7c8ff`, `surface-container-*`).
- **Notifikasi/pengumuman** → pola banner di `FinanceNotifications.tsx` (`ANNOUNCE_ID` + localStorage dismiss + auto-expire).
- **Ikon:** Material Symbols (string nama ikon).

## Prinsip produk (non-negotiable)

1. **Education-only.** Tidak ada nasihat keuangan personal, tidak ada eksekusi transaksi/perdagangan. Kalkulator selalu berdisclaimer + parameter bisa diubah user.
2. **Jangan menulis data diam-diam.** Aksi tulis ke sheet selalu hasil klik eksplisit user (pelajaran: recurring TIDAK auto-post di v1).
3. **Bahasa Indonesia** untuk semua UI/copy; istilah finansial Inggris boleh bila lazim (net worth, alpha).
4. **Data user itu suci.** Fitur baru tidak boleh mengubah/menghapus data existing tanpa konfirmasi.

## Rollout playbook

**Tipe A — Client-side only (Fase 1 & 3 sebagian):** tidak menyentuh template/Apps Script.
1. Implement → DoD → deploy Hostinger (main+demo) → commit+push kedua remote.

**Tipe B — Menyentuh template/Apps Script (Fase 2):**
1. Update `google-apps-script.js` (tambah entri `HEADERS` + jika perlu logika).
2. Update template: tambah tab baru di `scratch/dompetku_template_v2_rapi.xlsx` DAN `starter` (via skrip python openpyxl, pola `scratchpad build_v2.py` sesi lalu — buat skrip baru di scratch/).
3. Regenerate halaman panduan: jalankan `scratch/build_panduan_with_code.py` → deploy zip (`index.html`+`kode.txt`) ke `panduan.bantu-umkm.tech`.
4. Update pengumuman in-app: `ANNOUNCE_ID` baru di `FinanceNotifications.tsx`.
5. Verifikasi audit kolom (pola `scratchpad/integration_audit.py` sesi lalu: sheet headers == HEADERS).
6. Deploy app + push. Instruksi user lama: salin kode dari halaman panduan → Deploy New version (template mereka tinggal menambah tab baru — sediakan fungsi `setup<NamaTab>Sheet()` di Apps Script agar tab dibuat OTOMATIS saat pertama dipakai, sehingga user lama TIDAK perlu edit sheet manual. ⭐ keputusan desain penting).

## Tips testing (dev)

- Login demo lokal: `demo@dompetku.com` / `password123` (data kosong karena tanpa sheet).
- Injeksi data uji ke store runtime (dev server, via console/JS):
  ```js
  import('/src/store/useFinanceStore.ts').then(m => m.useFinanceStore.setState({ transactions: [...], accounts: [...] }))
  ```
  (transactions/accounts/budgetCategories TIDAK di-persist ke localStorage — selalu dari sync.)
- `npx tsc --noEmit` punya noise pre-existing (`import.meta.env`, 1 error FinanceNotifications TransactionType) — abaikan yang itu, jangan tambah error baru.

## Definition of Done (setiap fitur)

- [ ] `npx tsc --noEmit` tanpa error BARU; `npm run build` sukses
- [ ] Verifikasi visual di browser (light+dark, mobile+desktop) dengan data uji
- [ ] Disclaimer edukasi terpasang (bila fitur beraroma saran)
- [ ] Panduan in-app diperbarui (topik/FAQ terkait) bila fitur user-facing besar
- [ ] Deploy Hostinger ke `dompetku.` DAN `demo.bantu-umkm.tech`, verifikasi bundle live
- [ ] Commit (pesan konvensional) + push ke `origin` DAN `demo`
- [ ] Untuk Tipe B: playbook rollout lengkap (script, template, panduan, pengumuman, audit)

## Ringkasan fase

| Fase | Isi | Sifat | File |
|---|---|---|---|
| 1 — Quick Wins | Zakat, Kalender Keuangan, Lampiran Harta SPT, Amortisasi+konverter bunga, Rekonsiliasi saldo | Client-side, tanpa migrasi | `fase-1-quick-wins.md` |
| 2 — Inti Perencanaan | Tujuan Keuangan (incl. sinking fund), Transaksi Berulang + Proyeksi Kas, Proteksi/Asuransi | SATU migrasi template terbundel | `fase-2-inti-perencanaan.md` |
| 3 — Kedalaman Investor | XIRR & realized/unrealized, Rebalancing advisor, Multi-currency, Skor Kesehatan, Kalender Pendapatan Pasif | Mayoritas client-side | `fase-3-kedalaman-investor.md` |
