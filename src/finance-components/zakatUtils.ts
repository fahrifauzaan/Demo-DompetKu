import type { Account, Asset, Debt, Setting } from '../store/useFinanceStore';

/**
 * Kalkulator Zakat Maal — logika murni (tanpa React/store) agar dipakai ulang oleh
 * kartu pemicu di Laporan DAN modal kalkulator, sehingga hasilnya tidak pernah beda.
 *
 * Rujukan fikih kontemporer (BAZNAS): zakat maal 2,5% atas harta yang mencapai nisab
 * (setara 85 gram emas) dan bertahan 1 haul. Aplikasi TIDAK melacak haul otomatis (v1).
 */

export const NISAB_GRAMS = 85;
export const ZAKAT_RATE = 0.025;
export const DEFAULT_GOLD_PRICE = 1_900_000; // Rp / gram, fallback bila Settings kosong

export type ZakatClassKey =
  | 'kas'
  | 'emas'
  | 'saham'
  | 'reksadana'
  | 'kripto'
  | 'fixedincome'
  | 'properti';

export interface ZakatIncludeFlags {
  kas: boolean;
  emas: boolean;
  saham: boolean;
  reksadana: boolean;
  kripto: boolean;
  fixedincome: boolean;
  properti: boolean;
}

/** Default toggle sesuai PRD: semua kelas zakatable ON, properti/kendaraan pakai OFF. */
export const DEFAULT_INCLUDE: ZakatIncludeFlags = {
  kas: true,
  emas: true,
  saham: true,
  reksadana: true,
  kripto: true,
  fixedincome: true,
  properti: false,
};

export interface ZakatClassAmounts {
  kas: number;
  emas: number;
  saham: number;
  reksadana: number;
  kripto: number;
  fixedincome: number;
  properti: number;
}

export interface ZakatResult {
  amounts: ZakatClassAmounts;
  goldPrice: number;
  zakatable: number;
  nisab: number;
  deduction: number;
  dasarZakat: number;
  wajib: boolean;
  zakat: number;
}

/** Deteksi emas/logam mulia di antara aset "koleksi" (arloji/lukisan TIDAK dihitung). */
const isGoldAsset = (a: Asset): boolean => {
  const st = (a.subType || '').toLowerCase();
  if (st === 'perhiasan' || st === 'emas' || st === 'logam mulia') return true;
  const hay = `${a.title || ''} ${a.notes || ''}`.toLowerCase();
  return /emas|gold|logam mulia|antam|dinar|perhiasan|\blm\b/.test(hay);
};

/**
 * Pisahkan neraca user menjadi kelas-kelas zakat.
 * - Kas: akun tipe bank/cash/wallet (akun 'investment' = titipan investasi, tidak dihitung sbg kas).
 * - Emas: aset koleksi yang teridentifikasi emas/logam mulia.
 * - Saham/Reksadana/Kripto: aset investasi sesuai subType.
 * - Pendapatan tetap: sisa aset investasi (SBN/deposito/P2P/obligasi).
 * - Properti: real-estat & kendaraan (default tidak dihitung karena aset pakai).
 */
export function classAmounts(accounts: Account[], assets: Asset[]): ZakatClassAmounts {
  const kas = accounts
    .filter((a) => a.type === 'bank' || a.type === 'cash' || a.type === 'wallet')
    .reduce((s, a) => s + (a.balance || 0), 0);

  let emas = 0;
  let saham = 0;
  let reksadana = 0;
  let kripto = 0;
  let fixedincome = 0;
  let properti = 0;

  for (const a of assets) {
    const v = a.currentValue || 0;
    const cat = a.category;
    const st = (a.subType || '').toLowerCase();

    if (cat === 'real-estat' || cat === 'kendaraan') {
      properti += v;
    } else if (cat === 'koleksi') {
      if (isGoldAsset(a)) emas += v; // koleksi non-emas (seni/arloji) diabaikan
    } else if (cat === 'investasi') {
      if (st === 'saham') saham += v;
      else if (st === 'reksadana') reksadana += v;
      else if (st === 'kripto') kripto += v;
      else fixedincome += v; // sbn/deposito/p2p/obligasi/tak dikenal
    }
  }

  return { kas, emas, saham, reksadana, kripto, fixedincome, properti };
}

/**
 * Pengurang default = utang jangka pendek.
 * - Kartu Kredit / Paylater / "Lainnya": kurangi PENUH saldo terutang.
 * - Utang lain (KPR/KTA/kendaraan): kurangi 1 bulan minPayment (jatuh tempo dekat).
 * Utang berstatus "Lunas" diabaikan.
 */
export function defaultDeduction(debts: Debt[]): number {
  let shortTermFull = 0;
  let otherMonthly = 0;

  for (const d of debts) {
    if ((d.status || '').toLowerCase() === 'lunas') continue;
    const t = (d.type || '').toLowerCase();
    const isShortTerm =
      t.includes('kartu') ||
      t.includes('paylater') ||
      t.includes('pay later') ||
      t.includes('lain');
    if (isShortTerm) shortTermFull += d.balance || 0;
    else otherMonthly += d.minPayment || 0;
  }

  return shortTermFull + otherMonthly;
}

export interface ComputeZakatOptions {
  goldPrice: number;
  include: ZakatIncludeFlags;
  deduction: number;
}

/** Hitung zakat maal dari neraca + parameter. Rumus dari PRD F1.1. */
export function computeZakat(
  accounts: Account[],
  assets: Asset[],
  opts: ComputeZakatOptions
): ZakatResult {
  const goldPrice = opts.goldPrice > 0 ? opts.goldPrice : DEFAULT_GOLD_PRICE;
  const amounts = classAmounts(accounts, assets);
  const inc = opts.include;

  const zakatable =
    (inc.kas ? amounts.kas : 0) +
    (inc.emas ? amounts.emas : 0) +
    (inc.saham ? amounts.saham : 0) +
    (inc.reksadana ? amounts.reksadana : 0) +
    (inc.kripto ? amounts.kripto : 0) +
    (inc.fixedincome ? amounts.fixedincome : 0) +
    (inc.properti ? amounts.properti : 0);

  const nisab = NISAB_GRAMS * goldPrice;
  const deduction = Math.max(0, opts.deduction || 0);
  const dasarZakat = Math.max(0, zakatable - deduction);
  const wajib = dasarZakat >= nisab;
  const zakat = wajib ? ZAKAT_RATE * dasarZakat : 0;

  return { amounts, goldPrice, zakatable, nisab, deduction, dasarZakat, wajib, zakat };
}

/* ---- Pembacaan preferensi dari tab Settings (key-value) ---- */

export function readGoldPrice(settings: Setting[]): number {
  const raw = settings.find((s) => s.key === 'zakat_goldPricePerGram')?.value;
  const v = Number(raw);
  return v && v > 0 ? v : DEFAULT_GOLD_PRICE;
}

export function readInclude(settings: Setting[]): ZakatIncludeFlags {
  const flag = (key: ZakatClassKey, def: boolean): boolean => {
    const s = settings.find((x) => x.key === `zakat_include_${key}`);
    return s ? s.value === 'true' : def;
  };
  return {
    kas: flag('kas', DEFAULT_INCLUDE.kas),
    emas: flag('emas', DEFAULT_INCLUDE.emas),
    saham: flag('saham', DEFAULT_INCLUDE.saham),
    reksadana: flag('reksadana', DEFAULT_INCLUDE.reksadana),
    kripto: flag('kripto', DEFAULT_INCLUDE.kripto),
    fixedincome: flag('fixedincome', DEFAULT_INCLUDE.fixedincome),
    properti: flag('properti', DEFAULT_INCLUDE.properti),
  };
}

/** Susun ulang array Settings dengan preferensi zakat (untuk updateSettings). */
export function mergeZakatSettings(
  settings: Setting[],
  goldPrice: number,
  include: ZakatIncludeFlags
): Setting[] {
  const next = [...settings];
  const put = (key: string, value: string) => {
    const i = next.findIndex((s) => s.key === key);
    if (i >= 0) next[i] = { key, value };
    else next.push({ key, value });
  };
  put('zakat_goldPricePerGram', String(Math.round(goldPrice)));
  (Object.keys(include) as ZakatClassKey[]).forEach((k) =>
    put(`zakat_include_${k}`, include[k] ? 'true' : 'false')
  );
  return next;
}
