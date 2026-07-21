import React from 'react';
import { FeatureCTA } from './MarketingCTAModal';
import { useFinanceStore } from '../store/useFinanceStore';

// ── Pengumuman sistem: pembaruan template (Juli 2026) ─────────────────────────
// Kartu dismissible di panel Notifikasi. Auto-hide setelah ANNOUNCE_UNTIL.
// PANDUAN_URL = halaman panduan publik (di-host di Hostinger, subdomain sendiri).
const ANNOUNCE_ID = 'template_update_2026_07';
const ANNOUNCE_KEY = `dompetku_announce_${ANNOUNCE_ID}_dismissed`;
const ANNOUNCE_UNTIL = new Date('2026-10-31T23:59:59').getTime();
const PANDUAN_URL = 'https://dompetku.bantu-umkm.tech';

interface FinanceNotificationsProps {
  onShowCTA: (feature?: FeatureCTA) => void;
  onNavigate?: (tab: string) => void;
  onClose?: () => void;
}

const FinanceNotifications: React.FC<FinanceNotificationsProps> = ({ onShowCTA, onNavigate, onClose }) => {
  const { accounts, assets, settings, promos, readPromos, markPromoRead, budgetCategories, transactions, debts } = useFinanceStore();
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
                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/70">Pembaruan Template · Juli 2026</span>
                <h5 className="font-headline font-bold text-base sm:text-lg mt-0.5 text-white">Template DompetKu Diperbarui</h5>
                <p className="text-xs sm:text-sm text-white/85 mt-1.5 leading-relaxed max-w-xl">
                  Kami memperbaiki bug Reksadana &amp; merapikan template. Agar aktif, perbarui Apps Script Anda sekali saja — ± 3 menit, data Anda tetap aman.
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
