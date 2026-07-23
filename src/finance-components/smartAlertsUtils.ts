import type { Transaction, Account, Recurring, Setting, BudgetCategory } from '../store/useFinanceStore';
import { monthlyCashflow, currentMonthKey, burnRate, liquidBalance, runwayMonths } from './cashflowUtils';
import { budgetPace } from './insightsUtils';
import { detectSubscriptions, totalMonthlyBurn } from './subscriptionDetectUtils';
import { projectCashflow, dueRecurrings } from './recurringUtils';
import { getUsdIdrRate } from './currencyUtils';

/**
 * F4.5 — Peringatan Cerdas (nudge prediktif). Menggabungkan generator dari F4.1–F4.3 + recurring.
 * Setiap jenis bisa di-mute & ambangnya diatur via Settings (`alert_*`). Default: tenang, tak menakut-nakuti.
 */

export type AlertSeverity = 'kritis' | 'peringatan' | 'info';
export interface SmartAlert { id: string; severity: AlertSeverity; icon: string; title: string; detail: string }

const rp = (n: number) => 'Rp ' + Math.round(n).toLocaleString('id-ID');

export function buildSmartAlerts(p: {
  transactions: Transaction[]; accounts: Account[]; recurring: Recurring[];
  budgetCategories: BudgetCategory[]; monthlyBudgets: Record<string, Record<string, number>>;
  settings: Setting[]; now?: Date;
}): SmartAlert[] {
  const now = p.now || new Date();
  const enabled = (key: string) => (p.settings.find((s) => s.key === key)?.value ?? 'true') !== 'false';
  const numS = (key: string, def: number) => {
    const v = p.settings.find((s) => s.key === key)?.value; const n = Number(v);
    return v != null && v !== '' && !isNaN(n) ? n : def;
  };

  const rate = getUsdIdrRate(p.settings);
  const list = monthlyCashflow(p.transactions, p.accounts, p.settings);
  const nowMonth = currentMonthKey(now);
  const burn = burnRate(list, nowMonth, 6);
  const liquid = liquidBalance(p.accounts, rate);
  const runway = runwayMonths(liquid, burn);
  const alerts: SmartAlert[] = [];

  // 1. Runway rendah
  if (enabled('alert_runway_enabled') && burn > 0 && runway !== Infinity) {
    const minR = numS('alert_runway_min', 3);
    if (runway < minR) {
      alerts.push({
        id: 'runway', severity: runway < minR / 2 ? 'kritis' : 'peringatan', icon: 'water_drop',
        title: `Runway tinggal ${runway.toFixed(1)} bulan`,
        detail: `Kas likuid menutup biaya hidup kurang dari ${minR} bulan. Pertimbangkan perkuat dana darurat.`,
      });
    }
  }

  // 2. Saldo diproyeksikan minus (dari transaksi berulang)
  if (enabled('alert_lowbalance_enabled')) {
    const days = numS('alert_lowbalance_days', 45);
    const proj = projectCashflow(liquid, p.recurring, days, now);
    if (proj.firstNegative) {
      const d = proj.firstNegative;
      alerts.push({
        id: 'lowbal', severity: 'kritis', icon: 'error',
        title: 'Saldo kas diproyeksikan minus',
        detail: `Dengan transaksi berulang aktif, saldo menyentuh negatif sekitar ${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}.`,
      });
    }
  }

  // 3. Anggaran diproyeksikan jebol (pace)
  if (enabled('alert_budget_enabled')) {
    budgetPace(p.transactions, p.monthlyBudgets, p.budgetCategories, now)
      .filter((x) => x.willExceed).slice(0, 3)
      .forEach((x) => alerts.push({
        id: `budget-${x.category}`, severity: 'peringatan', icon: 'speed',
        title: `Anggaran "${x.category}" akan jebol`,
        detail: `Laju sekarang → akhir bulan ~${rp(x.projectedEnd)} vs anggaran ${rp(x.budget)} (sisa ${x.daysLeft} hari).`,
      }));
  }

  // 4. Tagihan berulang jatuh tempo belum dicatat
  if (enabled('alert_bills_enabled')) {
    const due = dueRecurrings(p.recurring, now);
    if (due.length) {
      alerts.push({
        id: 'bills', severity: 'peringatan', icon: 'event_upcoming',
        title: `${due.length} transaksi berulang jatuh tempo`,
        detail: `${due.slice(0, 3).map((d) => d.rec.name).join(', ')}${due.length > 3 ? ', …' : ''} — catat via tombol "Berulang" di Transaksi.`,
      });
    }
  }

  // 5. Langganan baru terdeteksi
  if (enabled('alert_subs_enabled')) {
    const fresh = detectSubscriptions(p.transactions, p.recurring, {}).filter((c) => !c.alreadyRecurring);
    if (fresh.length) {
      alerts.push({
        id: 'subs', severity: 'info', icon: 'frame_inspect',
        title: `${fresh.length} langganan terdeteksi`,
        detail: `Sekitar ${rp(totalMonthlyBurn(fresh))}/bulan belum tercatat. Buka "Langganan" di Transaksi untuk audit.`,
      });
    }
  }

  const order: Record<AlertSeverity, number> = { kritis: 0, peringatan: 1, info: 2 };
  return alerts.sort((a, b) => order[a.severity] - order[b.severity]);
}
