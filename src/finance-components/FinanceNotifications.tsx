import React from 'react';
import { FeatureCTA } from './MarketingCTAModal';
import { useFinanceStore } from '../store/useFinanceStore';
import { startOfToday, nextOccurrence, parseDateSafe, daysBetween, formatDayBadge, groupForDate, type CalendarGroup } from './calendarUtils';
import { generateOccurrences } from './recurringUtils';
import { buildSmartAlerts, type AlertSeverity } from './smartAlertsUtils';

// ── Pengumuman sistem: pembaruan template (Juli 2026) ─────────────────────────
// Kartu dismissible di panel Notifikasi. Auto-hide setelah ANNOUNCE_UNTIL.
// PANDUAN_URL = halaman panduan publik (di-host di Hostinger, subdomain sendiri).
const ANNOUNCE_ID = 'planning_update_2026_07';
const ANNOUNCE_KEY = `dompetku_announce_${ANNOUNCE_ID}_dismissed`;
const ANNOUNCE_UNTIL = new Date('2027-01-31T23:59:59').getTime();
const PANDUAN_URL = 'https://panduan.bantu-umkm.tech';

// ── "Fitur Baru" v2.0 (Fase 2) — butuh update Apps Script (tab auto-create) ────
const WHATSNEW_ID = 'features_v2_0_2026_07';
const WHATSNEW_KEY = `dompetku_announce_${WHATSNEW_ID}_dismissed`;
const WHATSNEW_UNTIL = new Date('2027-01-31T23:59:59').getTime();
const WHATSNEW_ITEMS = [
  { icon: 'flag', text: 'Tujuan Keuangan + Sinking Fund (menu Tujuan)' },
  { icon: 'sync', text: 'Transaksi Berulang + proyeksi kas (Transaksi/Dasbor)' },
  { icon: 'shield', text: 'Proteksi/Asuransi + kalkulator UP (Aset)' },
  { icon: 'calculate', text: 'Setoran bulanan ideal dihitung otomatis (PMT)' },
  { icon: 'notifications_active', text: 'Pengingat jatuh tempo di Kalender Keuangan' },
];

interface FinanceNotificationsProps {
  onShowCTA: (feature?: FeatureCTA) => void;
  onNavigate?: (tab: string) => void;
  onClose?: () => void;
}

const FinanceNotifications: React.FC<FinanceNotificationsProps> = ({ onShowCTA, onNavigate, onClose }) => {
  const { accounts, assets, settings, promos, readPromos, markPromoRead, budgetCategories, transactions, debts, insurance, recurring, monthlyBudgets } = useFinanceStore();

  // F4.5 — Peringatan Cerdas (prediktif)
  const smartAlerts = React.useMemo(
    () => buildSmartAlerts({ transactions, accounts, recurring, budgetCategories, monthlyBudgets, settings }),
    [transactions, accounts, recurring, budgetCategories, monthlyBudgets, settings],
  );
  const ALERT_STYLE: Record<AlertSeverity, { wrap: string; ic: string }> = {
    kritis: { wrap: 'border-error/30 bg-error/5 dark:bg-[#ffb4ab]/10', ic: 'text-error dark:text-[#ffb4ab]' },
    peringatan: { wrap: 'border-amber-500/25 bg-amber-500/5', ic: 'text-amber-600 dark:text-amber-400' },
    info: { wrap: 'border-primary/20 dark:border-[#a7c8ff]/20 bg-primary/5 dark:bg-[#a7c8ff]/10', ic: 'text-primary dark:text-[#a7c8ff]' },
  };
  const [searchQuery, setSearchQuery] = React.useState('');

  // System announcement (template update) — dismissible + auto-expiring
  const [announceDismissed, setAnnounceDismissed] = React.useState<boolean>(() => {
    try { return localStorage.getItem(ANNOUNCE_KEY) === 'true'; } catch { return false; }
  });
  const showAnnouncement = !announceDismissed && Date.now() < ANNOUNCE_UNTIL;
  const dismissAnnouncement = () => {
    try { localStorage.setItem(ANNOUNCE_KEY, 'true'); } catch { /* ignore */ }
    setAnnounceDismissed(true);
  };

  // "Fitur Baru" v1.1 banner — dismissible + auto-expiring
  const [whatsNewDismissed, setWhatsNewDismissed] = React.useState<boolean>(() => {
    try { return localStorage.getItem(WHATSNEW_KEY) === 'true'; } catch { return false; }
  });
  const showWhatsNew = !whatsNewDismissed && Date.now() < WHATSNEW_UNTIL;
  const dismissWhatsNew = () => {
    try { localStorage.setItem(WHATSNEW_KEY, 'true'); } catch { /* ignore */ }
    setWhatsNewDismissed(true);
  };

  // Helper to calculate days passed since date
  const getDaysPassed = (dateStr?: string) => {
    if (!dateStr) return 0;
    try {
      const past = new Date(dateStr);
      const now = new Date();
      past.setHours(0,0,0,0);
      now.setHours(0,0,0,0);
      const diffTime = now.getTime() - past.getTime();
      return Math.floor(diffTime / (1000 * 60 * 60 * 24));
    } catch (e) {
      return 0;
    }
  };

  // Case-insensitive boolean setting helper
  const getSettingBool = (key: string, fallback: boolean): boolean => {
    const val = settings.find(s => s.key === key)?.value;
    if (val === undefined) return fallback;
    return String(val).toLowerCase() === 'true';
  };
  const showBudgetAlert = getSettingBool('notification_budgetAlert', true);
  const showBillReminder = getSettingBool('notification_billReminder', true);
  const showMarketing = getSettingBool('notification_marketing', false);

  // Generate dynamic valuation reminder warnings
  const activeReminders = React.useMemo(() => {
    const alerts: Array<{
      id: string;
      title: string;
      message: string;
      time: string;
      icon: string;
      daysOverdue?: number;
      type: 'account' | 'asset' | 'budget' | 'debt';
      targetId: string;
    }> = [];

    // 1. Check Accounts (liquid assets) - 30 days overdue
    accounts.forEach(acc => {
      if (acc.valuationReminder && acc.lastValuationUpdate) {
        const days = getDaysPassed(acc.lastValuationUpdate);
        if (days > 30) {
          alerts.push({
            id: `alert-acc-${acc.id}`,
            title: `Update Saldo: ${acc.name}`,
            message: `Saldo akun ini sudah ${days} hari tidak diperbarui. Segera perbarui saldo Anda untuk menjaga akurasi laporan kekayaan net worth Anda.`,
            time: `${days} Hari Lalu`,
            icon: acc.icon || 'account_balance_wallet',
            daysOverdue: days - 30,
            type: 'account',
            targetId: acc.id
          });
        }
      }
    });

    // 2. Check Assets (physical assets) - 365 days overdue
    assets.forEach(ast => {
      if (['real-estat', 'kendaraan', 'koleksi'].includes(ast.category) && ast.valuationReminder && ast.lastValuationUpdate) {
        const days = getDaysPassed(ast.lastValuationUpdate);
        if (days > 365) {
          alerts.push({
            id: `alert-ast-${ast.id}`,
            title: `Valuasi Aset: ${ast.title}`,
            message: `Nilai pasar aset fisik ini sudah lebih dari 1 tahun (${days} hari) tidak disesuaikan. Periksa harga pasar terkini untuk pencatatan aset non-likuid yang presisi.`,
            time: `${Math.floor(days / 30)} Bulan Lalu`,
            icon: ast.icon || 'home',
            daysOverdue: days - 365,
            type: 'asset',
            targetId: ast.id
          });
        }
      }
    });

    return alerts.sort((a, b) => (b.daysOverdue || 0) - (a.daysOverdue || 0));
  }, [accounts, assets]);

  // Combine dynamic reminders and static notifications based on settings
  const visibleWarnings = React.useMemo(() => {
    const list: Array<{
      id: string;
      title: string;
      message: string;
      time: string;
      icon: string;
      isDynamic?: boolean;
      isBudget?: boolean;
      isBill?: boolean;
      timeText?: string;
      onClick: () => void;
    }> = [];

    // 1. Add dynamic asset/account warnings
    activeReminders.forEach(alert => {
      list.push({
        id: alert.id,
        title: alert.title,
        message: alert.message,
        time: alert.time,
        icon: alert.icon,
        isDynamic: true,
        timeText: `Keterangan: ${alert.time}`,
        onClick: () => {
          if (onNavigate) {
            onNavigate('aset');
            if (onClose) onClose();
          } else {
            onShowCTA({
              title: `Pembaruan Valuasi: ${alert.title}`,
              description: `Silakan perbarui nilai ${alert.type === 'account' ? 'saldo' : 'aset'} ini langsung di menu Akun atau Aset untuk mencerminkan kondisi riil neraca kekayaan Anda.`
            });
          }
        }
      });
    });

    // 2. Add budget alert if enabled
    if (showBudgetAlert) {
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      budgetCategories.filter(c => c.type === 'Pengeluaran').forEach(cat => {
        const spent = transactions
          .filter(t => t.type === 'expense' && t.category === cat.name && new Date(t.date).getMonth() === currentMonth && new Date(t.date).getFullYear() === currentYear)
          .reduce((sum, t) => sum + t.amount, 0);
        
        const limit = cat.allocated || 1;
        const percentage = (spent / limit) * 100;
        const alertThreshold = cat.alertAt || 90;
        
        if (percentage >= alertThreshold) {
          const sisa = Math.max(0, limit - spent);
          list.push({
            id: `alert-budget-${cat.id}`,
            title: `Anggaran ${cat.name} Menipis`,
            message: `Anda telah menggunakan ${Math.round(percentage)}% dari anggaran bulan ini. Tersisa Rp ${sisa.toLocaleString('id-ID')} hingga akhir bulan.`,
            time: 'Bulan Ini',
            icon: cat.icon || 'account_balance_wallet',
            isBudget: true,
            onClick: () => {
              if (onNavigate) {
                onNavigate('anggaran');
                if (onClose) onClose();
              } else {
                onShowCTA({
                  title: "Real-time Budget Enforcement",
                  description: "Cegah overspending dengan mengevaluasi kembali anggaran harian Anda."
                });
              }
            }
          });
        }
      });
    }

    // 3. Add bill reminder if enabled
    if (showBillReminder) {
      const currentDay = new Date().getDate();
      debts.forEach(debt => {
        if (debt.status === 'Lunas') return;
        if (debt.dueDate) {
          let diff = debt.dueDate - currentDay;
          if (diff >= 0 && diff <= 7) {
            list.push({
              id: `alert-debt-${debt.id}`,
              title: `Tagihan Jatuh Tempo: ${debt.name}`,
              message: `Pembayaran ${debt.type} kepada ${debt.lender || 'kreditur'} akan jatuh tempo dalam ${diff === 0 ? 'hari ini' : diff + ' hari'}.`,
              time: diff === 0 ? 'Hari Ini' : `${diff} Hari Lagi`,
              icon: debt.icon || 'event_busy',
              isBill: true,
              onClick: () => {
                if (onNavigate) {
                  onNavigate('rencana utang');
                  if (onClose) onClose();
                } else {
                  onShowCTA({
                    title: "Auto-Bill Pay Integration",
                    description: "Sinkronkan dengan Bank Nasional untuk pembayaran tagihan otomatis tanpa denda keterlambatan."
                  });
                }
              }
            });
          }
        }
      });
    }

    return list;
  }, [activeReminders, showBudgetAlert, showBillReminder, onShowCTA, budgetCategories, transactions, debts, onNavigate, onClose]);

  // ── F1.2 Kalender Keuangan ──────────────────────────────────────────────────
  // Timeline kewajiban 60 hari ke depan (jatuh tempo cicilan, jatuh tempo instrumen,
  // batas SPT). CATATAN: pengingat valuasi stale SENGAJA tidak diduplikasi di sini —
  // sudah ditangani di seksi "Peringatan" (lihat acceptance F1.2).
  const calendarEvents = React.useMemo(() => {
    const today = startOfToday();
    const horizon = new Date(today); horizon.setDate(horizon.getDate() + 60);
    const fmtRp = (n: number) => `Rp ${Math.round(n || 0).toLocaleString('id-ID')}`;

    type CalEvent = {
      id: string; date: Date; group: CalendarGroup; icon: string;
      title: string; subtitle: string; accent: 'debt' | 'maturity' | 'tax'; onClick: () => void;
    };
    const events: CalEvent[] = [];
    const go = (tab: string) => () => { if (onNavigate) { onNavigate(tab); if (onClose) onClose(); } };

    // 1. Jatuh tempo cicilan utang aktif (dueDate 1–31 → kejadian bulanan berikutnya)
    debts.forEach(debt => {
      if ((debt.status || '').toLowerCase() === 'lunas') return;
      if (!debt.dueDate || debt.dueDate < 1 || debt.dueDate > 31) return;
      const date = nextOccurrence(debt.dueDate, today);
      if (date > horizon) return;
      events.push({
        id: `cal-debt-${debt.id}`, date, group: groupForDate(date, today), icon: debt.icon || 'credit_card',
        title: `Jatuh tempo: ${debt.name}`,
        subtitle: debt.minPayment ? `Angsuran min. ${fmtRp(debt.minPayment)}` : (debt.type || 'Cicilan'),
        accent: 'debt', onClick: go('rencana utang'),
      });
    });

    // 2. Jatuh tempo instrumen (obligasi/deposito/P2P dengan maturityDate ≤ 60 hari)
    assets.forEach(ast => {
      if (ast.category !== 'investasi' || !ast.maturityDate) return;
      const date = parseDateSafe(ast.maturityDate);
      if (!date) return;
      date.setHours(0, 0, 0, 0);
      if (date < today || date > horizon) return;
      events.push({
        id: `cal-mat-${ast.id}`, date, group: groupForDate(date, today), icon: ast.icon || 'event_available',
        title: `Jatuh tempo: ${ast.title}`,
        subtitle: `Pokok ${fmtRp(ast.currentValue || ast.purchasePrice || 0)} cair`,
        accent: 'maturity', onClick: go('aset'),
      });
    });

    // 3. Renewal asuransi (F2.3) dalam 60 hari
    insurance.forEach(pol => {
      if ((pol.status || 'Aktif').toLowerCase() !== 'aktif' || !pol.renewalDate) return;
      const date = parseDateSafe(pol.renewalDate);
      if (!date) return;
      date.setHours(0, 0, 0, 0);
      if (date < today || date > horizon) return;
      events.push({
        id: `cal-ins-${pol.id}`, date, group: groupForDate(date, today), icon: 'shield',
        title: `Perpanjangan: ${pol.name}`,
        subtitle: `Renewal polis ${pol.insType}`,
        accent: 'tax', onClick: go('aset'),
      });
    });

    // 4. Transaksi berulang (F2.2) yang jatuh dalam 60 hari
    recurring.forEach(rec => {
      const recEnd = parseDateSafe(rec.endDate);
      if (recEnd && recEnd < today) return;
      generateOccurrences(rec, today, horizon).slice(0, 3).forEach((date, i) => {
        events.push({
          id: `cal-rec-${rec.id}-${i}`, date, group: groupForDate(date, today),
          icon: rec.type === 'PEMASUKAN' ? 'trending_up' : 'sync',
          title: `${rec.name}`,
          subtitle: `${rec.type === 'PEMASUKAN' ? 'Pemasukan' : 'Pengeluaran'} berulang ${fmtRp(rec.amount)}`,
          accent: rec.type === 'PEMASUKAN' ? 'maturity' : 'debt', onClick: go('transactions'),
        });
      });
    });

    // 5. Batas Lapor SPT Tahunan (31 Maret tahun berjalan) — tampil mulai 1 Feb
    const sptDate = new Date(today.getFullYear(), 2, 31); // 31 Maret
    const febFirst = new Date(today.getFullYear(), 1, 1); // 1 Feb
    if (today >= febFirst && today <= sptDate) {
      events.push({
        id: 'cal-spt', date: sptDate, group: groupForDate(sptDate, today), icon: 'receipt_long',
        title: 'Batas Lapor SPT Tahunan', subtitle: 'Lapor pajak pribadi via e-Filing DJP',
        accent: 'tax', onClick: go('laporan'),
      });
    }

    events.sort((a, b) => a.date.getTime() - b.date.getTime());
    const groups: CalendarGroup[] = ['Minggu Ini', 'Bulan Ini', 'Mendatang'];
    const grouped = groups
      .map(g => ({ group: g, items: events.filter(e => e.group === g) }))
      .filter(section => section.items.length > 0);
    return { events, grouped, count: events.length };
  }, [debts, assets, insurance, recurring, onNavigate, onClose]);

  const filteredWarnings = visibleWarnings.filter(w =>
    w.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    w.message.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalAlertsCount = filteredWarnings.length;

  return (
    <div className="space-y-8 lg:space-y-12 animate-in fade-in duration-500 pb-12">
      
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="flex items-center gap-4">
          {onClose && (
            <button 
              onClick={onClose}
              className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-surface-container-low dark:hover:bg-white/10 text-on-surface-variant dark:text-slate-400 transition-colors md:hidden"
            >
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
          )}
          <div>
            <h2 className="font-headline text-2xl lg:text-3xl font-extrabold tracking-tighter text-primary dark:text-[#a7c8ff]">Pusat Notifikasi</h2>
            <p className="text-on-surface-variant dark:text-outline text-sm lg:text-base mt-1">Pembaruan cerdas dan peringatan untuk portofolio Anda.</p>
          </div>
        </div>
        
        <div className="flex bg-surface-container-low dark:bg-white/5 border border-outline-variant/20 dark:border-white/10 rounded-full px-4 py-2.5 items-center gap-3 w-full md:w-64 focus-within:ring-2 focus-within:ring-primary/50 dark:focus-within:ring-[#a7c8ff]/50 transition-all">
          <span className="material-symbols-outlined text-on-surface-variant dark:text-slate-400 text-xl">search</span>
          <input 
            className="bg-transparent border-none focus:ring-0 text-sm font-medium w-full text-on-surface dark:text-white placeholder:text-on-surface-variant/50 dark:placeholder:text-slate-500 outline-none" 
            placeholder="Cari notifikasi..." 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </header>

      {/* F4.5 Peringatan Cerdas */}
      {smartAlerts.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary dark:text-[#a7c8ff]">notifications_active</span>
            <h2 className="text-lg font-black font-headline text-on-surface dark:text-white">Peringatan Cerdas</h2>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-primary/10 dark:bg-[#a7c8ff]/15 text-primary dark:text-[#a7c8ff]">{smartAlerts.length}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {smartAlerts.map((a) => {
              const st = ALERT_STYLE[a.severity];
              return (
                <div key={a.id} className={`flex gap-3 p-3.5 rounded-2xl border ${st.wrap}`}>
                  <span className={`material-symbols-outlined shrink-0 ${st.ic}`}>{a.icon}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-on-surface dark:text-white leading-snug">{a.title}</p>
                    <p className="text-[12px] text-on-surface-variant dark:text-slate-400 mt-0.5 leading-relaxed">{a.detail}</p>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-[10px] text-on-surface-variant/60 dark:text-slate-500">Nudge prediktif dari pola Anda — tiap jenis bisa dimatikan di Pengaturan. Bukan nasihat keuangan personal.</p>
        </section>
      )}

      {/* Quick Stats Bento */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
        <div className="col-span-1 md:col-span-2 bg-surface-container-lowest dark:bg-transparent border border-outline-variant/10 dark:border-white/10 rounded-2xl lg:rounded-[24px] p-4 sm:p-6 lg:p-8 flex items-center justify-between group hover:bg-surface-bright/50 dark:hover:bg-white/5 transition-colors cursor-default shadow-sm">
          <div>
            <p className="text-on-surface-variant dark:text-slate-400 text-sm font-medium mb-1 uppercase tracking-widest text-[10px] md:text-sm">Status Keuangan Hari Ini</p>
            <h3 className="text-2xl md:text-3xl font-bold font-headline text-on-surface dark:text-white mt-1">{totalAlertsCount} Perlu Perhatian</h3>
          </div>
          <div className="w-14 h-14 md:w-16 md:h-16 bg-error-container/30 dark:bg-error/20 rounded-2xl flex items-center justify-center text-error dark:text-[#ffb4ab]">
            <span className="material-symbols-outlined text-3xl">priority_high</span>
          </div>
        </div>
        <div 
          className="bg-primary dark:bg-gradient-to-br dark:from-[#001b3c] dark:to-[#002f5e] text-white rounded-2xl lg:rounded-[24px] p-4 sm:p-6 lg:p-8 flex flex-col justify-between shadow-md cursor-pointer hover:shadow-lg transition-shadow border border-primary-container dark:border-[#a7c8ff]/10"
          onClick={() => {
            if (onNavigate) {
              onNavigate('analytics');
              if (onClose) onClose();
            }
          }}
        >
          <div className="flex justify-between items-start mb-6">
            <span className="material-symbols-outlined opacity-60 dark:text-[#a7c8ff]">auto_awesome</span>
            <span className="text-[10px] font-bold uppercase tracking-widest opacity-60 dark:text-[#a7c8ff]">AI Insight</span>
          </div>
          <div>
            <p className="text-sm font-medium opacity-80 dark:text-slate-300">Saran terbaru</p>
            <p className="text-lg font-bold mt-1 dark:text-white">Optimalkan Portofolio</p>
          </div>
        </div>
      </section>

      <div className="space-y-12">
        {/* Pengumuman Sistem: Pembaruan Template */}
        {showAnnouncement && (
          <div className="relative overflow-hidden rounded-2xl lg:rounded-[24px] p-5 sm:p-6 bg-gradient-to-br from-primary/90 to-primary-container dark:from-[#0f1e33] dark:to-[#13233b] text-white border border-primary-container dark:border-[#a7c8ff]/15 shadow-md">
            <button
              onClick={dismissAnnouncement}
              aria-label="Tutup pengumuman"
              className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
            <div className="flex items-start gap-3 pr-8">
              <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined">campaign</span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/70">Pembaruan v2.0 · Inti Perencanaan</span>
                <h5 className="font-headline font-bold text-base sm:text-lg mt-0.5 text-white">Fitur Baru: Tujuan, Transaksi Berulang &amp; Proteksi</h5>
                <p className="text-xs sm:text-sm text-white/85 mt-1.5 leading-relaxed max-w-xl">
                  Perbarui Apps Script Anda sekali saja (± 3 menit) agar 3 tab baru (Goals, Recurring, Insurance) aktif. Tab dibuat <strong>otomatis</strong> — Anda tak perlu mengedit spreadsheet, dan data lama tetap aman.
                </p>
                <div className="flex flex-wrap gap-2 mt-4">
                  <a
                    href={PANDUAN_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-primary dark:text-[#0b3b6f] font-bold text-xs hover:opacity-90 active:scale-95 transition-all cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-base">menu_book</span>
                    Lihat Panduan
                  </a>
                  <button
                    onClick={dismissAnnouncement}
                    className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs transition-colors cursor-pointer"
                  >
                    Nanti Saja
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Fitur Baru v1.1 */}
        {showWhatsNew && (
          <div className="relative overflow-hidden rounded-2xl lg:rounded-[24px] p-5 sm:p-6 bg-surface-container-lowest dark:bg-white/[0.03] border border-emerald-500/20 dark:border-emerald-400/15">
            <button
              onClick={dismissWhatsNew}
              aria-label="Tutup"
              className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant/60 hover:text-on-surface hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
            <div className="flex items-start gap-3 pr-8">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 dark:bg-emerald-400/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-400">Pembaruan v2.0 · Fitur Baru</span>
                <h5 className="font-headline font-bold text-base sm:text-lg mt-0.5 text-on-surface dark:text-white">Perencanaan: Tujuan, Berulang &amp; Proteksi</h5>
                <p className="text-[11px] text-on-surface-variant dark:text-slate-400 mt-1 mb-3">Perbarui Apps Script Anda sekali (lihat Panduan) — tab baru dibuat <strong>otomatis</strong>, data lama aman.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {WHATSNEW_ITEMS.map(item => (
                    <div key={item.text} className="flex items-center gap-2 text-xs font-semibold text-on-surface dark:text-slate-200">
                      <span className="material-symbols-outlined text-[15px] text-emerald-600 dark:text-emerald-400 shrink-0">{item.icon}</span>
                      <span className="truncate">{item.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* F1.2 Kalender Keuangan */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2 text-primary dark:text-[#a7c8ff]">
              <span className="material-symbols-outlined">calendar_month</span>
              <h4 className="font-headline font-bold tracking-tight uppercase text-sm">Kalender Keuangan</h4>
            </div>
            {calendarEvents.count > 0 && (
              <span className="text-[10px] font-bold text-primary dark:text-[#a7c8ff] tabular-nums bg-primary/5 dark:bg-[#a7c8ff]/10 px-3 py-1.5 rounded-md uppercase tracking-wider">
                {calendarEvents.count} agenda · 60 hari
              </span>
            )}
          </div>

          {calendarEvents.count === 0 ? (
            <div className="bg-surface-container-lowest dark:bg-white/5 rounded-2xl lg:rounded-[24px] p-5 sm:p-6 lg:p-8 border border-outline-variant/10 dark:border-white/10 text-center flex flex-col items-center justify-center gap-3">
              <div className="w-14 h-14 rounded-full bg-primary/10 dark:bg-[#a7c8ff]/15 flex items-center justify-center text-primary dark:text-[#a7c8ff]">
                <span className="material-symbols-outlined text-3xl">event_available</span>
              </div>
              <div>
                <h5 className="font-bold text-on-surface dark:text-white text-base">Tidak ada agenda keuangan 🎉</h5>
                <p className="text-xs text-outline mt-1 max-w-sm mx-auto">Belum ada jatuh tempo cicilan, instrumen investasi, atau batas pajak dalam 60 hari ke depan.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {calendarEvents.grouped.map(section => (
                <div key={section.group} className="space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant dark:text-slate-400 px-2">{section.group}</p>
                  <div className="space-y-1.5">
                    {section.items.map(ev => {
                      const badge = formatDayBadge(ev.date);
                      const daysAway = daysBetween(startOfToday(), ev.date);
                      const accentText =
                        ev.accent === 'debt' ? 'text-error dark:text-[#ffb4ab]'
                        : ev.accent === 'tax' ? 'text-amber-600 dark:text-amber-400'
                        : 'text-emerald-600 dark:text-emerald-400';
                      const accentBg =
                        ev.accent === 'debt' ? 'bg-error-container/20 dark:bg-error/15'
                        : ev.accent === 'tax' ? 'bg-amber-500/10'
                        : 'bg-emerald-500/10';
                      return (
                        <button
                          key={ev.id}
                          onClick={ev.onClick}
                          className="w-full text-left bg-surface-container-lowest dark:bg-surface-variant/10 rounded-2xl border border-outline-variant/10 dark:border-white/5 p-3.5 md:p-4 flex items-center gap-4 hover:bg-surface-bright/50 dark:hover:bg-white/5 transition-colors group cursor-pointer"
                        >
                          {/* Date badge */}
                          <div className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center shrink-0 ${accentBg} ${accentText}`}>
                            <span className="text-base font-black leading-none tabular-nums">{badge.day}</span>
                            <span className="text-[9px] font-bold uppercase tracking-wider leading-none mt-0.5">{badge.month}</span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-on-surface dark:text-white leading-tight truncate group-hover:text-primary dark:group-hover:text-[#a7c8ff] transition-colors">{ev.title}</p>
                            <p className="text-[11px] text-on-surface-variant dark:text-slate-400 truncate mt-0.5">{ev.subtitle}</p>
                          </div>
                          <div className="flex flex-col items-end shrink-0">
                            <span className={`text-[10px] font-black tabular-nums whitespace-nowrap ${accentText}`}>
                              {daysAway === 0 ? 'Hari ini' : `${daysAway} hari`}
                            </span>
                            <span className="material-symbols-outlined text-on-surface-variant/40 dark:text-slate-500 text-base mt-0.5 group-hover:translate-x-0.5 transition-transform">chevron_right</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Peringatan */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2 text-error dark:text-[#ffb4ab]">
              <span className="material-symbols-outlined">warning</span>
              <h4 className="font-headline font-bold tracking-tight uppercase text-sm">Peringatan</h4>
            </div>
            <button className="text-[10px] font-bold text-primary dark:text-[#a7c8ff] hover:underline uppercase tracking-wider bg-primary/5 dark:bg-[#a7c8ff]/10 px-3 py-1.5 rounded-md transition-colors">Tandai Dibaca</button>
          </div>
          
          <div className="space-y-1">
            {filteredWarnings.length === 0 ? (
              <div className="bg-surface-container-lowest dark:bg-white/5 rounded-2xl lg:rounded-[24px] p-5 sm:p-6 lg:p-8 border border-outline-variant/10 dark:border-white/10 text-center flex flex-col items-center justify-center gap-3">
                <div className="w-14 h-14 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                </div>
                <div>
                  <h5 className="font-bold text-on-surface dark:text-white text-base">Semua Aman & Terkendali</h5>
                  <p className="text-xs text-outline mt-1 max-w-sm mx-auto">Tidak ada peringatan finansial yang memerlukan perhatian Anda saat ini.</p>
                </div>
              </div>
            ) : (
              filteredWarnings.map((alert, idx) => {
                const isFirst = idx === 0;
                const isLast = idx === filteredWarnings.length - 1;
                
                // Style differences
                let bgClass = "bg-surface-container-lowest dark:bg-surface-variant/10";
                if (alert.isBill) {
                  bgClass = "bg-surface-container-low/40 dark:bg-surface-variant/5";
                }

                let roundedClass = "";
                if (isFirst && isLast) {
                  roundedClass = "rounded-[20px] lg:rounded-[24px]";
                } else if (isFirst) {
                  roundedClass = "rounded-t-[20px] lg:rounded-t-[24px]";
                } else if (isLast) {
                  roundedClass = "rounded-b-[20px] lg:rounded-b-[24px]";
                }

                const borderClass = isFirst ? "border" : "border border-t-0";

                return (
                  <div 
                    key={alert.id}
                    className={`${bgClass} ${roundedClass} ${borderClass} p-5 md:p-6 flex gap-4 md:gap-5 hover:bg-surface-bright/50 dark:hover:bg-white/5 transition-colors cursor-pointer group border-outline-variant/10 dark:border-white/5 relative overflow-hidden`}
                    onClick={alert.onClick}
                  >
                    {/* Accent line indicating warning */}
                    {alert.isDynamic && (
                      <div className="absolute left-0 top-0 w-1 h-full bg-error dark:bg-[#ffb4ab]"></div>
                    )}
                    
                    <div className={`w-10 h-10 md:w-12 md:h-12 rounded-full bg-error-container/20 dark:bg-error/20 flex items-center justify-center text-error dark:text-[#ffb4ab] shrink-0 ${alert.isDynamic ? 'ml-2' : ''}`}>
                      <span className="material-symbols-outlined text-lg md:text-xl">{alert.icon}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-1 h-auto sm:h-6">
                        <h5 className="font-bold text-sm md:text-base text-on-surface dark:text-white truncate pr-2 group-hover:text-primary dark:group-hover:text-[#a7c8ff] transition-colors">{alert.title}</h5>
                        {alert.isDynamic ? (
                          <span className="text-[10px] md:text-[11px] font-bold text-error dark:text-[#ffb4ab] tabular-nums shrink-0 whitespace-nowrap bg-error/10 px-2 py-0.5 rounded uppercase tracking-wider">Perlu Update</span>
                        ) : (
                          <span className="text-[10px] md:text-[11px] font-bold text-on-surface-variant dark:text-slate-400 tabular-nums shrink-0 whitespace-nowrap bg-surface-container-low dark:bg-white/5 px-2 py-0.5 rounded">{alert.time}</span>
                        )}
                      </div>
                      
                      {alert.isBudget && (
                        <p className="text-on-surface-variant dark:text-slate-300 text-xs md:text-sm leading-relaxed mt-1 line-clamp-2 md:line-clamp-none" dangerouslySetInnerHTML={{ __html: alert.message.replace(/(\d+%)/, '<strong class="text-error dark:text-[#ffb4ab]">$1</strong>').replace(/(Rp [\d.,]+)/, '<strong class="text-on-surface dark:text-white">$1</strong>') }} />
                      )}
                      {alert.isBill && (
                        <p className="text-on-surface-variant dark:text-slate-300 text-xs md:text-sm leading-relaxed mt-1 line-clamp-2 md:line-clamp-none" dangerouslySetInnerHTML={{ __html: alert.message.replace(/(Rp [\d.,]+)/, '<strong class="text-on-surface dark:text-white">$1</strong>') }} />
                      )}
                      {alert.isDynamic && !alert.isBudget && !alert.isBill && (
                        <p className="text-on-surface-variant dark:text-slate-300 text-xs md:text-sm leading-relaxed mt-1">
                          {alert.message}
                        </p>
                      )}

                      {alert.timeText && (
                        <div className="mt-2.5 text-[10px] font-bold text-on-surface-variant/70 dark:text-slate-400 flex items-center gap-1">
                          <span className="material-symbols-outlined text-xs">schedule</span>
                          {alert.timeText}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Informasi & Promo NAMTECH */}
        {showMarketing && (
          <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-2 text-on-tertiary-container dark:text-tertiary-fixed">
                <span className="material-symbols-outlined">campaign</span>
                <h4 className="font-headline font-bold tracking-tight uppercase text-sm">Informasi & Promo NAMTECH</h4>
              </div>
            </div>
            
            <div className="space-y-1">
              {promos.filter(p => String(p.isActive).toUpperCase() === 'TRUE').length === 0 ? (
                 <div className="bg-surface-container-lowest dark:bg-white/5 rounded-[24px] p-6 text-center border border-outline-variant/10 dark:border-white/10">
                   <p className="text-sm text-outline">Belum ada promo terbaru saat ini.</p>
                 </div>
              ) : (
                promos.filter(p => String(p.isActive).toUpperCase() === 'TRUE').map((promo, idx, arr) => {
                  const isFirst = idx === 0;
                  const isLast = idx === arr.length - 1;
                  
                  let roundedClass = "";
                  if (isFirst && isLast) roundedClass = "rounded-[20px] lg:rounded-[24px]";
                  else if (isFirst) roundedClass = "rounded-t-[20px] lg:rounded-t-[24px]";
                  else if (isLast) roundedClass = "rounded-b-[20px] lg:rounded-b-[24px]";

                  const borderClass = isFirst ? "border" : "border border-t-0";
                  
                  const isUnread = !readPromos.includes(promo.id);

                  return (
                    <div 
                      key={promo.id}
                      className={`bg-surface-container-lowest dark:bg-surface-variant/10 p-5 md:p-6 flex gap-4 md:gap-5 hover:bg-surface-bright/50 dark:hover:bg-white/5 transition-colors ${roundedClass} cursor-pointer group ${borderClass} border-outline-variant/10 dark:border-white/5 relative overflow-hidden`}
                      onClick={() => {
                        if (isUnread) markPromoRead(promo.id);
                        if (promo.url) window.open(promo.url.startsWith('http') ? promo.url : `https://${promo.url}`, '_blank');
                      }}
                    >
                      {isUnread && (
                        <div className="absolute left-0 top-0 w-1 h-full bg-tertiary-fixed-dim dark:bg-tertiary-fixed"></div>
                      )}
                      <div className={`w-10 h-10 md:w-12 md:h-12 rounded-full bg-tertiary-fixed/30 dark:bg-tertiary-fixed/20 flex items-center justify-center text-on-tertiary-fixed-variant dark:text-tertiary-fixed shrink-0 ${isUnread ? 'ml-2' : ''}`}>
                        <span className="material-symbols-outlined text-lg md:text-xl">{promo.icon || 'campaign'}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-1 h-auto sm:h-6">
                          <h5 className="font-bold text-sm md:text-base text-on-surface dark:text-white truncate pr-2 group-hover:text-primary dark:group-hover:text-[#a7c8ff] transition-colors">
                            {promo.title}
                          </h5>
                          {isUnread ? (
                            <span className="text-[10px] md:text-[11px] font-bold text-white dark:text-[#001b3c] tabular-nums shrink-0 whitespace-nowrap bg-primary dark:bg-[#a7c8ff] px-2 py-0.5 rounded uppercase tracking-wider shadow-sm">Baru</span>
                          ) : (
                            <span className="text-[10px] md:text-[11px] font-bold text-on-surface-variant dark:text-slate-400 tabular-nums shrink-0 whitespace-nowrap bg-surface-container-low dark:bg-white/5 px-2 py-0.5 rounded">
                              {promo.date ? new Date(promo.date).toLocaleDateString('id-ID') : 'Promo'}
                            </span>
                          )}
                        </div>
                        <p className="text-on-surface-variant dark:text-slate-300 text-xs md:text-sm leading-relaxed mt-1 line-clamp-2 md:line-clamp-none">
                          {promo.message}
                        </p>
                        {promo.url && (
                          <div className="mt-3 text-xs font-bold text-primary dark:text-[#a7c8ff] flex items-center gap-1 group-hover:gap-2 transition-all">
                            Klaim Promo Sekarang
                            <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default FinanceNotifications;
