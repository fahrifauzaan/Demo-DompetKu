import { annuityPayment } from './amortizationUtils';

/**
 * F5.4 — Perencana Skenario "What-If". Murni & dapat diuji. Menerima baseline (dari cashflowUtils/net worth)
 * lalu menghitung dampak delta ke surplus, runway, DTI. Reuse annuityPayment untuk cicilan.
 */

export interface Baseline {
  monthlyIncome: number;    // rata-rata pemasukan (non-investasi)
  monthlyExpense: number;   // biaya hidup rutin (operasi)
  monthlySurplus: number;   // arus kas bersih rata-rata
  liquid: number;           // kas & setara kas
  netWorth: number;
}

const runway = (liquid: number, burn: number) => (burn <= 0 ? Infinity : liquid / burn);

export interface JobLossResult { drainPerMonth: number; survivesMonths: number; covered: boolean; shortfallAtTarget: number }
/** Kehilangan/berhenti kerja: pemasukan 0 selama `months` (± pesangon). */
export function scenarioJobLoss(base: Baseline, opts: { months: number; severance?: number }): JobLossResult {
  const { months, severance = 0 } = opts;
  const drainPerMonth = base.monthlyExpense; // asumsi biaya hidup tetap, pemasukan 0
  const pool = base.liquid + severance;
  const survivesMonths = runway(pool, drainPerMonth);
  const needed = drainPerMonth * months;
  return {
    drainPerMonth,
    survivesMonths,
    covered: pool >= needed,
    shortfallAtTarget: Math.max(0, needed - pool),
  };
}

export interface BuyAssetResult { dp: number; loan: number; installment: number; newLiquid: number; newSurplus: number; newRunway: number; dti: number }
/** Beli rumah/kendaraan: DP dari kas + cicilan bulanan (anuitas). */
export function scenarioBuyAsset(base: Baseline, opts: { price: number; dpPct: number; tenorMonths: number; annualRate: number }): BuyAssetResult {
  const { price, dpPct, tenorMonths, annualRate } = opts;
  const dp = price * dpPct;
  const loan = Math.max(0, price - dp);
  const installment = tenorMonths > 0 ? annuityPayment(loan, annualRate, tenorMonths) : 0;
  const newLiquid = base.liquid - dp;
  const newSurplus = base.monthlySurplus - installment;
  return {
    dp, loan, installment, newLiquid, newSurplus,
    newRunway: runway(Math.max(0, newLiquid), base.monthlyExpense),
    dti: base.monthlyIncome > 0 ? installment / base.monthlyIncome : 0,
  };
}

export interface ExpenseChangeResult { newExpense: number; newSurplus: number; newRunway: number; deltaSurplus: number }
/** Perubahan biaya hidup (mis. anak baru +25%). */
export function scenarioExpenseChange(base: Baseline, pctChange: number): ExpenseChangeResult {
  const newExpense = base.monthlyExpense * (1 + pctChange);
  const deltaExpense = newExpense - base.monthlyExpense;
  const newSurplus = base.monthlySurplus - deltaExpense;
  return { newExpense, newSurplus, newRunway: runway(base.liquid, newExpense), deltaSurplus: -deltaExpense };
}

export interface IncomeChangeResult { newIncome: number; newSurplus: number; deltaSurplus: number; newSavingsRate: number }
/** Perubahan peninghasilan (kenaikan gaji / side income). */
export function scenarioIncomeChange(base: Baseline, deltaIncome: number): IncomeChangeResult {
  const newIncome = base.monthlyIncome + deltaIncome;
  const newSurplus = base.monthlySurplus + deltaIncome;
  return {
    newIncome, newSurplus, deltaSurplus: deltaIncome,
    newSavingsRate: newIncome > 0 ? (newIncome - base.monthlyExpense) / newIncome : 0,
  };
}
