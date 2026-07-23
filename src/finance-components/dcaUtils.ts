/**
 * Fase 7 — Investor Pro: DCA (Dollar/Rupiah Cost Averaging) Planner + DRIP (reinvestasi dividen). Murni.
 * Edukatif — semua asumsi berdisclaimer; return pasar tidak dijamin.
 */

export interface DCAPoint { year: number; invested: number; value: number }
export interface DCAResult { totalInvested: number; finalValue: number; gain: number; gainPct: number; points: DCAPoint[] }

/** Proyeksi setoran berkala (DCA): tiap periode setor `periodicAmount`, tumbuh dengan return. */
export function projectDCA(opts: { initial: number; periodicAmount: number; periodsPerYear: number; years: number; annualReturn: number }): DCAResult {
  const { initial, periodicAmount, periodsPerYear, years, annualReturn } = opts;
  const pr = Math.pow(1 + annualReturn, 1 / periodsPerYear) - 1;
  let value = initial, invested = initial;
  const points: DCAPoint[] = [{ year: 0, invested, value }];
  const total = Math.round(periodsPerYear * years);
  for (let p = 1; p <= total; p++) {
    value = value * (1 + pr) + periodicAmount;
    invested += periodicAmount;
    if (p % periodsPerYear === 0) points.push({ year: p / periodsPerYear, invested, value });
  }
  const gain = value - invested;
  return { totalInvested: invested, finalValue: value, gain, gainPct: invested > 0 ? gain / invested : 0, points };
}

export interface DRIPResult { withReinvest: number; withoutReinvest: number; extra: number; extraPct: number }

/**
 * DRIP: bandingkan nilai akhir bila dividen/kupon DIREINVESTASI vs diambil tunai.
 * - reinvest: majemuk pada (pertumbuhan harga + yield).
 * - tanpa reinvest: harga tumbuh sendiri + akumulasi dividen tunai (tanpa bunga-berbunga).
 */
export function projectDRIP(opts: { principal: number; dividendYield: number; priceGrowth: number; years: number }): DRIPResult {
  const { principal, dividendYield, priceGrowth, years } = opts;
  const withReinvest = principal * Math.pow(1 + priceGrowth + dividendYield, years);
  const priceOnly = principal * Math.pow(1 + priceGrowth, years);
  let cashDiv = 0, v = principal;
  for (let y = 0; y < years; y++) { cashDiv += v * dividendYield; v *= (1 + priceGrowth); }
  const withoutReinvest = priceOnly + cashDiv;
  const extra = withReinvest - withoutReinvest;
  return { withReinvest, withoutReinvest, extra, extraPct: withoutReinvest > 0 ? extra / withoutReinvest : 0 };
}
