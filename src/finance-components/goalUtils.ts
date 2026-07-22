import type { Goal } from '../store/useFinanceStore';
import { parseDateSafe, startOfToday } from './calendarUtils';

/**
 * F2.1 Tujuan Keuangan — matematika PMT / proyeksi (murni, testable).
 *
 * n   = bulan dari hari ini ke targetDate (floor, min 1)
 * r   = expectedReturn/100/12
 * FV_dibutuhkan  = targetAmount − initialAmount×(1+r)^n
 * PMT_disarankan = r>0 ? FV_dibutuhkan × r / ((1+r)^n − 1) : FV_dibutuhkan/n   (floor 0)
 * Proyeksi_akhir = initialAmount×(1+r)^n + kontribusi × ((1+r)^n − 1)/r  (r>0; else initial + PMT×n)
 */

export interface GoalMath {
  monthsLeft: number;
  suggestedPMT: number;
  projectedEnd: number;
  onTrack: boolean;
  shortfall: number;       // kekurangan proyeksi vs target (0 bila on-track)
  progressPct: number;     // initialAmount / targetAmount
  overdue: boolean;        // targetDate sudah lewat
}

export function monthsBetween(from: Date, to: Date): number {
  const y = to.getFullYear() - from.getFullYear();
  const m = to.getMonth() - from.getMonth();
  let total = y * 12 + m;
  if (to.getDate() < from.getDate()) total -= 1; // belum lewat tanggal → floor
  return total;
}

export function computeGoal(goal: Goal, today: Date = startOfToday()): GoalMath {
  const target = goal.targetAmount || 0;
  const initial = goal.initialAmount || 0;
  const contribution = goal.monthlyContribution || 0;
  const td = parseDateSafe(goal.targetDate);
  const rawMonths = td ? monthsBetween(today, td) : 12;
  const overdue = td ? td < today : false;
  const n = Math.max(1, rawMonths);
  const r = (goal.expectedReturn || 0) / 100 / 12;

  const growth = Math.pow(1 + r, n);
  const fvNeeded = target - initial * growth;
  let suggestedPMT: number;
  if (r > 0) {
    suggestedPMT = fvNeeded > 0 ? (fvNeeded * r) / (growth - 1) : 0;
  } else {
    suggestedPMT = fvNeeded > 0 ? fvNeeded / n : 0;
  }
  suggestedPMT = Math.max(0, suggestedPMT);

  const projectedEnd = r > 0
    ? initial * growth + contribution * ((growth - 1) / r)
    : initial + contribution * n;

  const onTrack = projectedEnd >= target;
  const progressPct = target > 0 ? Math.min(100, (initial / target) * 100) : 0;

  return {
    monthsLeft: rawMonths,
    suggestedPMT,
    projectedEnd,
    onTrack,
    shortfall: onTrack ? 0 : Math.max(0, target - projectedEnd),
    progressPct,
    overdue,
  };
}

export interface GoalPreset {
  key: string;
  name: string;
  icon: string;
  color: string;
  goalType: 'goal' | 'sinking';
  expectedReturn: number;
  horizonMonths: number;
  priority: number;
}

// Preset yang mengisi default masuk akal
export const GOAL_PRESETS: GoalPreset[] = [
  { key: 'dp-rumah', name: 'DP Rumah', icon: 'home', color: '#2563eb', goalType: 'goal', expectedReturn: 6, horizonMonths: 60, priority: 1 },
  { key: 'pendidikan', name: 'Dana Pendidikan', icon: 'school', color: '#7c3aed', goalType: 'goal', expectedReturn: 8, horizonMonths: 120, priority: 1 },
  { key: 'nikah', name: 'Dana Menikah', icon: 'favorite', color: '#db2777', goalType: 'goal', expectedReturn: 6, horizonMonths: 24, priority: 2 },
  { key: 'pensiun', name: 'Pensiun / FIRE', icon: 'elderly', color: '#0891b2', goalType: 'goal', expectedReturn: 10, horizonMonths: 240, priority: 2 },
  { key: 'darurat', name: 'Dana Darurat', icon: 'health_and_safety', color: '#059669', goalType: 'goal', expectedReturn: 4, horizonMonths: 18, priority: 1 },
  { key: 'thr', name: 'THR / Pajak Kendaraan', icon: 'redeem', color: '#f59e0b', goalType: 'sinking', expectedReturn: 0, horizonMonths: 12, priority: 3 },
  { key: 'qurban', name: 'Qurban / Haji', icon: 'mosque', color: '#16a34a', goalType: 'sinking', expectedReturn: 0, horizonMonths: 12, priority: 3 },
];
