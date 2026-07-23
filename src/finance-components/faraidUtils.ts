/**
 * Fase 7 — Kalkulator Waris/Faraid (EDUKATIF, cakupan terbatas). Murni & dapat diuji.
 *
 * ⚠️ CAKUPAN: struktur keluarga UMUM — pasangan (suami/istri), anak (laki/perempuan), dan/atau
 * orang tua (ayah/ibu). Menangani 'aul (saham > 1), radd (sisa dikembalikan), 'ashabah anak/ayah,
 * dan kasus 'Umariyyatan (pasangan + kedua orang tua tanpa anak). BELUM menangani: saudara/i,
 * kakek/nenek, cucu, kalalah, wasiat, utang almarhum, dzawil arham. Untuk itu WAJIB konsultasi
 * ahli faraid / KUA / pengadilan agama. Ini alat bantu edukasi, BUKAN fatwa/keputusan hukum.
 */

export interface FaraidInput {
  estate: number;
  spouse: 'suami' | 'istri' | 'tidak';
  father: boolean;
  mother: boolean;
  sons: number;
  daughters: number;
}

export interface FaraidShare { label: string; fraction: string; amount: number; note?: string }
export interface FaraidResult {
  shares: FaraidShare[];
  outOfScope: boolean;    // true bila tak ada ahli waris yang didukung
  usedAwl: boolean;
  usedRadd: boolean;
  totalDistributed: number;
}

/** Format pecahan sederhana dari desimal (untuk penyebut lazim faraid). */
function fracLabel(x: number): string {
  if (x <= 0) return '0';
  for (const den of [2, 3, 4, 6, 8, 12, 24, 27, 48, 72, 144]) {
    const num = x * den;
    if (Math.abs(num - Math.round(num)) < 1e-6) {
      const n = Math.round(num);
      const g = gcd(n, den);
      return `${n / g}/${den / g}`;
    }
  }
  return `${(x * 100).toFixed(1)}%`;
}
function gcd(a: number, b: number): number { return b === 0 ? a : gcd(b, a % b); }

export function computeFaraid(input: FaraidInput): FaraidResult {
  const { estate, spouse, father, mother } = input;
  const sons = Math.max(0, Math.floor(input.sons));
  const daughters = Math.max(0, Math.floor(input.daughters));
  const hasDescendant = sons > 0 || daughters > 0;
  const hasMaleDescendant = sons > 0;

  const anyHeir = spouse !== 'tidak' || father || mother || hasDescendant;
  if (!anyHeir) return { shares: [], outOfScope: true, usedAwl: false, usedRadd: false, totalDistributed: 0 };

  // fraksi tetap (ashab al-furud) — nilai desimal dari harta
  const fixed: { key: string; label: string; frac: number; note?: string }[] = [];
  let asabahKey: 'anak' | 'ayah' | null = null;

  // 1) Pasangan
  if (spouse === 'suami') fixed.push({ key: 'suami', label: 'Suami', frac: hasDescendant ? 1 / 4 : 1 / 2 });
  else if (spouse === 'istri') fixed.push({ key: 'istri', label: 'Istri', frac: hasDescendant ? 1 / 8 : 1 / 4 });

  const spouseFrac = fixed.reduce((s, f) => s + f.frac, 0);

  // 2) Kasus 'Umariyyatan: pasangan + AYAH + IBU, tanpa anak → ibu 1/3 dari SISA setelah pasangan
  const umariyya = spouse !== 'tidak' && father && mother && !hasDescendant;

  // 3) Ibu
  if (mother) {
    if (umariyya) fixed.push({ key: 'ibu', label: 'Ibu', frac: (1 - spouseFrac) / 3, note: '1/3 sisa (Umariyyatan)' });
    else fixed.push({ key: 'ibu', label: 'Ibu', frac: hasDescendant ? 1 / 6 : 1 / 3 });
  }

  // 4) Ayah
  if (father) {
    if (hasMaleDescendant) fixed.push({ key: 'ayah', label: 'Ayah', frac: 1 / 6 });
    else if (hasDescendant) { fixed.push({ key: 'ayah', label: 'Ayah', frac: 1 / 6, note: '1/6 + sisa' }); asabahKey = 'ayah'; }
    else asabahKey = 'ayah'; // tanpa keturunan → ayah 'ashabah (sisa)
  }

  // 5) Anak
  if (hasMaleDescendant) {
    asabahKey = 'anak'; // anak jadi 'ashabah (2:1); ayah TIDAK ambil sisa saat ada anak laki
  } else if (daughters > 0) {
    fixed.push({ key: 'anakpr', label: `Anak perempuan (${daughters})`, frac: daughters === 1 ? 1 / 2 : 2 / 3 });
  }

  // Total fraksi tetap
  let sumFixed = fixed.reduce((s, f) => s + f.frac, 0);
  let usedAwl = false, usedRadd = false;
  const shares: FaraidShare[] = [];

  if (sumFixed > 1 + 1e-9) {
    // 'AUL — kecilkan semua saham proporsional
    usedAwl = true;
    const k = 1 / sumFixed;
    fixed.forEach((f) => shares.push({ label: f.label, fraction: fracLabel(f.frac * k), amount: estate * f.frac * k, note: f.note }));
    return { shares, outOfScope: false, usedAwl, usedRadd, totalDistributed: estate };
  }

  // saham tetap dulu
  fixed.forEach((f) => shares.push({ label: f.label, fraction: fracLabel(f.frac), amount: estate * f.frac, note: f.note }));
  let residue = 1 - sumFixed;

  if (residue > 1e-9) {
    if (asabahKey === 'anak') {
      // 'ashabah bil ghair: laki 2 : perempuan 1
      const parts = sons * 2 + daughters;
      const per = residue / parts;
      if (sons > 0) shares.push({ label: `Anak laki-laki (${sons})`, fraction: fracLabel(per * 2 * sons), amount: estate * per * 2 * sons, note: 'bagian laki = 2× perempuan' });
      if (daughters > 0) shares.push({ label: `Anak perempuan (${daughters})`, fraction: fracLabel(per * daughters), amount: estate * per * daughters });
    } else if (asabahKey === 'ayah') {
      const ayahIdx = shares.findIndex((s) => s.label === 'Ayah');
      if (ayahIdx >= 0) { shares[ayahIdx].amount += estate * residue; shares[ayahIdx].fraction = fracLabel(shares[ayahIdx].amount / estate); }
      else shares.push({ label: 'Ayah', fraction: fracLabel(residue), amount: estate * residue, note: 'sisa (ashabah)' });
    } else {
      // RADD — kembalikan sisa ke ahli waris tetap SELAIN pasangan, proporsional
      const raddHeirs = fixed.filter((f) => f.key !== 'suami' && f.key !== 'istri');
      const base = raddHeirs.reduce((s, f) => s + f.frac, 0);
      if (base > 1e-9) {
        usedRadd = true;
        raddHeirs.forEach((f) => {
          const idx = shares.findIndex((s) => s.label === f.label);
          if (idx >= 0) { shares[idx].amount += estate * residue * (f.frac / base); shares[idx].fraction = fracLabel(shares[idx].amount / estate); shares[idx].note = (shares[idx].note ? shares[idx].note + ' + radd' : 'termasuk radd'); }
        });
      }
      // bila hanya pasangan (tak ada penerima radd) → sisa ke baitul mal (di luar cakupan)
    }
  }

  const totalDistributed = shares.reduce((s, x) => s + x.amount, 0);
  return { shares, outOfScope: false, usedAwl, usedRadd, totalDistributed };
}
