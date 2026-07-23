# Prioritas Teknis — Roadmap Jilid 2 (logika fungsi + backend)

> Pendamping [`roadmap-lanjutan.md`](./roadmap-lanjutan.md). Dokumen ini **mempertajam prioritas**
> sampai level fungsi & backend, berdasarkan audit kode aktual (commit `b28f9b1`). Tujuannya: saat sesi
> implementasi dibuka, tinggal ikuti — tak ada ambiguitas.

## Kerangka skor

`Skor = Dampak×2 − Upaya − FriksiBackend`. Makin tinggi = makin didahulukan.
- **Dampak (I):** nilai finansial bagi user, 1–5.
- **Upaya (E):** kompleksitas implementasi, 1–5 (rendah = mudah), **sudah disesuaikan** dengan berapa banyak kode existing bisa dipakai ulang.
- **Friksi Backend (B):** 🟢 client-side = 0 · 🟡 hanya `Settings` = 0,5 · 🔴 migrasi tab = 2.

## Matriks prioritas

| ID | Fitur | I | E | B | **Skor** | Butuh dulu |
|---|---|:-:|:-:|:-:|:-:|---|
| **F4.1** | Arus Kas + burn/runway | 5 | 2,5 | 🟢 | **7,5** | Fondasi util (§Fondasi) |
| **F5.2** | Pelacak Kemandirian Finansial | 4 | 2 | 🟡 | **5,5** | F4.1 (annualExpense) |
| **F4.2** | Wawasan + deteksi anomali | 5 | 3 | 🟡 | **6,5** | Fondasi util |
| **F6.1** | Estimator PPh 21 | 5 | 3 | 🟡 | **6,5** | — |
| **F5.1** | Proyeksi net worth | 5 | 3 | 🟡 | **6,5** | F4.1 (surplus) |
| **F5.4** | Skenario what-if | 5 | 3,5 | 🟡 | **6,0** | F4.1 + F5.1 |
| **F4.3** | Deteksi langganan | 4 | 3 | 🟢 | **5,0** | — |
| **F4.5** | Peringatan cerdas | 4 | 3 | 🟡 | **4,5** | F4.1–F4.3 |
| **F6.2** | Zakat penghasilan + haul | 3 | 2 | 🟡 | **3,5** | — |
| **F4.4** | Rules auto-kategori | 3 | 2 | 🟡 | **3,5** | — |
| **F6.4** | Perencanaan pajak | 3 | 2 | 🟡 | **3,5** | F6.1 |
| **F6.3** | SPT lengkap | 3 | 3 | 🟢 | **3,0** | F6.1 |
| **F5.3** | Pensiun BPJS/DPLK | 4 | 4 | 🔴 | **2,0** | — (migrasi tersendiri) |

## Urutan build (dependency-aware)

- **Gelombang 1 — Fondasi Kecerdasan (v3.0):** `§Fondasi util` → **F4.1** → **F4.2** → **F5.2** (quick win, pakai ulang F4.1).
- **Gelombang 2 — Proyeksi & Proaktif (v3.1):** **F5.1** → **F5.4** (pasangan proyeksi+skenario) → **F4.3** → **F4.5**.
- **Gelombang 3 — Pajak & Zakat ID (v3.3):** **F6.1** → **F6.2** → **F6.3** → **F6.4**. (**F4.4** boleh diselipkan kapan saja.)
- **Gelombang 4 — Migrasi (v3.2, jadwal tersendiri):** **F5.3** tab `Retirement` (playbook Tipe B).

**Alasan urutan:** F4.1 membuka util yang dipakai F4.2/F5.1/F5.2/F5.4/F4.5 → wajib pertama. Yang 🔴 migrasi (F5.3) ditunda & berdiri sendiri agar rilis Tipe-B rapi. Pajak (F6.x) satu blok karena berbagi `pph21Utils`.

---

## §Fondasi util (kerjakan SEBELUM F4.1 — DRY + de-risk)

Audit menemukan logika kunci **terduplikasi inline** di komponen. Ekstrak jadi util bersama dulu; F4.1+ tinggal pakai, dan komponen lama di-refactor memakainya (tanpa ubah perilaku).

Buat `src/finance-components/financeClassify.ts`:
```ts
// Sumber: FinanceDashboard.isAssetAllocation (baris 57) & FinanceAnalytics.parseTransactionMonth (baris 60)
export function parseTxnMonth(dateStr: string): string          // → 'YYYY-MM' (pindahkan dari FinanceAnalytics)
export function isAssetAllocation(category: string): boolean     // beli/alokasi investasi (pindahkan dari FinanceDashboard)
export function signedAmount(t: Transaction): number             // PEMASUKAN→+|amt|, PENGELUARAN→−|amt|, TRANSFER→0
export type FlowGroup = 'operasi' | 'investasi' | 'pendanaan';
export function classifyFlow(t: Transaction, accounts: Account[]): FlowGroup
//  investasi  = isAssetAllocation(cat) || category==='Capital Gain' || akun tujuan/asal type==='investment'
//  pendanaan  = kategori/desc match /cicil|angsur|pinjam|kredit|utang|hutang|kpr|kkb/i
//  operasi    = selain itu (biaya hidup, gaji, tagihan rutin)
```
> Konvensi tanda sudah dikonfirmasi di kode: selalu `Math.abs(t.amount)` + arah dari `t.type`; `TRANSFER` dikecualikan dari P&L. Reuse `currencyUtils.accountValueIDR/getUsdIdrRate` untuk nilai IDR.

---

## F4.1 — Arus Kas + Burn Rate & Runway  ·  `cashflowUtils.ts`

**Input:** `transactions: Transaction[]`, `accounts: Account[]`, `settings: Setting[]` (untuk kurs & window).

**Fungsi inti:**
```ts
interface MonthCashflow {
  month: string;                 // 'YYYY-MM'
  income: number; expense: number; net: number;               // operasi+pendanaan (P&L), IDR
  byGroup: Record<FlowGroup, { in: number; out: number }>;    // operasi/investasi/pendanaan
}
// Formalisasi flowGroup yang sekarang inline di FinanceAnalytics (baris 360–385) → util reusable.
function monthlyCashflow(txns: Transaction[], accounts: Account[], toIDR: (t:Transaction)=>number): MonthCashflow[]
//  group by parseTxnMonth; per txn: g=classifyFlow; amt=|toIDR(txn)|; masuk byGroup[g].in/out sesuai type.
//  income = Σ PEMASUKAN non-investasi; expense = Σ PENGELUARAN non-investasi; net = income−expense. Urут asc.

function livingExpense(m: MonthCashflow): number    // = m.byGroup.operasi.out (biaya hidup saja)
function burnRate(months: MonthCashflow[], window=6): number
//  = rata-rata livingExpense dari `window` bulan LENGKAP terakhir (exclude bulan berjalan).
function monthlyNet(months, window=6): number       // rata-rata net (surplus/defisit) → dipakai F5.1/F5.2
function liquidBalance(accounts: Account[], rate: number): number
//  = Σ accountValueIDR(a) untuk a.type ∈ {bank, wallet, cash}
function runwayMonths(liquid: number, burn: number): number    // burn≤0 → Infinity (tampilkan "surplus")
```

**Backend:** 🟢 tidak ada. **Settings (opsional):** `cashflow_window` (default 6).

**Edge cases:**
- Bulan berjalan ditandai "berjalan" & dikecualikan dari rata-rata.
- Transaksi saldo-awal/opening balance jangan dihitung income (deteksi: kategori pembukaan / `location==='Saldo Awal'`).
- Multi-currency: `toIDR` = `signedAmount` dikonversi via kurs akun (reuse currencyUtils).
- Data < 2 bulan → tampilkan kartu "belum cukup data untuk burn/runway".

**UI:** `CashFlowStatementCard.tsx` di Laporan › Ringkasan (dekat Skor Kesehatan). Refactor `FinanceAnalytics` flowGroup agar pakai `monthlyCashflow` (hapus duplikasi).

---

## F5.2 — Pelacak Kemandirian Finansial  ·  `fiUtils.ts`  (quick win)

**Input:** `assets`, `accounts`, hasil `monthlyCashflow` (F4.1), `settings`.

**Fungsi inti:**
```ts
function annualExpense(months: MonthCashflow[], window=6): number   // burnRate(months)*12 (override manual boleh)
function fiNumber(annualExpense: number, swr=0.04): number          // = annualExpense / swr
function investableAssets(assets, accounts, rate): number           // aset investasi + akun type==='investment'
function pctFI(investable: number, fiNumber: number): number        // 0..1
function realReturn(nominal: number, inflation: number): number     // (1+n)/(1+i)−1
function yearsToFI(current, target, annualContribution, realRet): number
//  selesaikan n dari FV anuitas: current*(1+r)^n + C*((1+r)^n−1)/r = target ; bila r≈0 → (target−current)/C
function coastFireNumber(currentAge, retireAge, annualExpense, realRet, swr=0.04): number
//  = fiNumber / (1+realRet)^(retireAge−currentAge)  → "sudah cukup nabung, tinggal biarkan tumbuh?"
function savingsRate(income: number, expense: number): number       // (income−expense)/income
```

**Backend:** 🟡 `Settings`: `fi_swr`(0.04), `fi_inflation`(0.035), `fi_current_age`, `fi_retire_age`, `fi_real_return`, `fi_lifestyle_mult` (lean 0.7 / base 1 / fat 1.5).

**Edge cases:** SWR & return WAJIB berdisclaimer (asumsi historis, bukan jaminan). `annualExpense` boleh di-override manual bila data tipis. Perluas `FinanceFIRECalculatorModal` yang ada → jadikan pemicu kartu ini (jangan buat kalkulator kedua).

**UI:** `FinancialIndependenceCard.tsx` di Laporan. Progress %FI + badge Coast/Lean/Fat + "tahun-ke-FI".

---

## F4.2 — Wawasan + Deteksi Anomali  ·  `insightsUtils.ts`

**Input:** `transactions`, `monthlyBudgets`, `budgetCategories`, `now`, `settings`.

**Fungsi inti:**
```ts
interface CategoryTrend { category: string; thisMonth: number; avgPrior: number; deltaPct: number; deltaAbs: number }
function categoryTrends(txns, now, priorMonths=3): CategoryTrend[]
//  per kategori PENGELUARAN non-investasi: total bulan-ini vs rata-rata `priorMonths` bulan lengkap.

interface Anomaly { kind:'kategori'|'transaksi'; category:string; amount:number; month?:string; txnId?:string; z:number }
function detectAnomalies(txns, z=2): Anomaly[]
//  seri total bulanan per kategori → mean & stdev (populasi, ≥3 titik) → flag bulan > mean + z·stdev;
//  + per-transaksi tunggal > mean(kat) + z·stdev(kat).

interface BudgetPace { category; budget; spentToDate; projectedEnd; willExceed:boolean; daysLeft:number }
function budgetPace(txns, monthlyBudgets, budgetCategories, now): BudgetPace[]
//  projectedEnd = spentToDate / hariBerlalu * hariSebulan; budget = override MonthlyBudgets ?? allocated dasar.

type Sev = 'positif'|'info'|'peringatan';
interface Insight { id; severity:Sev; title:string; detail:string; amount?:number; category?:string }
function buildInsights(trends, anomalies, pace, opts:{maxN:number}): Insight[]
//  gabung + beri peringkat (peringatan>positif>info; magnitudo Rp), ambil top maxN. Tiap item punya "kenapa" (angka mentah).
```

**Backend:** 🟡 `Settings`: `insight_anomaly_z`(2), `insight_trend_pct`(25), `insight_max`(5).

**Edge cases:** butuh ≥3 bulan (else sembunyikan anomali, tampilkan trend seadanya). Kategori investasi dikecualikan. Nada positif untuk penurunan pengeluaran (bukan hanya peringatan).

**UI:** `SpendingInsightsCard.tsx` (Dasbor + Laporan). Klik insight → filter transaksi terkait.

---

## F4.3 — Deteksi Langganan  ·  `subscriptionDetectUtils.ts`

**Input:** `transactions` (PENGELUARAN), `recurring` (dedupe).

**Fungsi inti:**
```ts
function normalizeMerchant(desc: string, location: string): string
//  UPPERCASE, buang angka/tanggal/kode, rapikan spasi → kunci pengelompokan.
interface SubCandidate {
  key:string; label:string; amount:number; frequency:'MONTHLY'|'YEARLY';
  occurrences:number; lastDate:string; intervalMedianDays:number;
  annualCost:number; confidence:number; alreadyRecurring:boolean;
}
function detectSubscriptions(txns, recurring, opts:{amountTol:number; minOcc:number}): SubCandidate[]
//  1) group by (normalizeMerchant + nominal ± amountTol%);
//  2) per grup urут tanggal → hitung interval; median ∈[26,32]→MONTHLY, ∈[350,380]→YEARLY;
//  3) occurrences ≥ minOcc; confidence = f(kestabilan interval [stdev rendah] + konsistensi nominal);
//  4) alreadyRecurring = cocok entri Recurring (nama/nominal) → jangan tawarkan ulang.
function totalMonthlyBurn(cands: SubCandidate[]): number   // Σ (MONTHLY.amount + YEARLY.amount/12)
```

**Backend:** 🟢 hanya menulis ke tab **`Recurring` (existing)** saat user klik "Jadikan Berulang" (reuse `addRecurring`, no silent write). **Settings:** `sub_amount_tol`(0.05), `sub_min_occ`(3).

**Edge cases:** langganan nominal-berubah (listrik) → toleransi + confidence lebih rendah. Deteksi tahunan butuh ≥2 tahun data. Abaikan one-off.

**UI:** `SubscriptionScannerModal.tsx` dari halaman Transaksi (dekat "Berulang") — daftar kandidat + total kebocoran/bulan + tombol konfirmasi per item.

---

## Catatan backend menyeluruh

- **Gelombang 1–3 = 🟢/🟡 saja** (client-side + `Settings` JSON/scalar). TANPA migrasi → rilis cepat, user lama tak perlu update Apps Script.
- **Hanya F5.3 (🔴)** menyentuh Apps Script: tab `Retirement` via pola `ensureSheetExists` + auto-migrate (identik `MonthlyBudgets` v2.7). Jadwalkan sebagai satu rilis Tipe-B (script → template v4 → regen Panduan → pengumuman).
- **Semua ambang/parameter di `Settings`** agar bisa diubah user & transparan (prinsip #5). Kunci diberi prefiks jelas (`insight_*`, `fi_*`, `sub_*`, `cashflow_*`).
- **Reuse dulu, jangan bikin ulang:** `currencyUtils`, `amortizationUtils`, `recurringUtils`, `FinanceFIRECalculatorModal`, `FinanceEmergencyModal`, `parseTxnMonth`, `isAssetAllocation`.
