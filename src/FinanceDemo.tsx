import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import FinanceDashboard from './finance-components/FinanceDashboard';
import FinanceTransactions from './finance-components/FinanceTransactions';
import FinanceBudget from './finance-components/FinanceBudget';
import FinanceAssets from './finance-components/FinanceAssets';
import FinanceDebts from './finance-components/FinanceDebts';
import FinanceAddTransaction from './finance-components/FinanceAddTransaction';
import FinanceAddCategory from './finance-components/FinanceAddCategory';
import FinanceIntegration from './finance-components/FinanceIntegration';
import FinanceAddAsset from './finance-components/FinanceAddAsset';
import FinanceAddAccount from './finance-components/FinanceAddAccount';
import FinanceAnalytics from './finance-components/FinanceAnalytics';
import FinancePortfolioReport from './finance-components/FinancePortfolioReport';
import FinancePerformanceReport from './finance-components/FinancePerformanceReport';
import FinanceNotifications from './finance-components/FinanceNotifications';
import FinanceEquityLedger from './finance-components/FinanceEquityLedger';
import FinanceSearch from './finance-components/FinanceSearch';
import FinanceSettings from './finance-components/FinanceSettings';
import MarketingCTAModal, { FeatureCTA } from './finance-components/MarketingCTAModal';
import { useFinanceStore } from './store/useFinanceStore';
import FinancePrintableReport from './finance-components/FinancePrintableReport';
import FinancePrintableLedger from './finance-components/FinancePrintableLedger';
import { useAuthStore } from './store/useAuthStore';
import FinanceOnboardingModal from './finance-components/FinanceOnboardingModal';

interface FinanceDemoProps {
  isDark: boolean;
  toggleDark: () => void;
}

export type FinanceTab = 'dashboard' | 'transactions' | 'budget' | 'assets' | 'debts' | 'analytics' | 'portfolio-report' | 'performance-report' | 'equity-ledger' | 'add-transaction' | 'add-category' | 'integration' | 'add-asset' | 'add-account' | 'notifications' | 'settings';

const FinanceDemo: React.FC<FinanceDemoProps> = ({ isDark, toggleDark }) => {
  const [activeTab, setActiveTab] = useState<FinanceTab>('dashboard');
  const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showCTA, setShowCTA] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [ctaFeature, setCtaFeature] = useState<FeatureCTA | null>(null);

  const syncFromGoogleSheets = useFinanceStore(state => state.syncFromGoogleSheets);
  const isSyncing = useFinanceStore(state => state.isSyncing);
  const lastSyncAt = useFinanceStore(state => state.lastSyncAt);
  const syncError = useFinanceStore(state => state.syncError);
  const accounts = useFinanceStore(state => state.accounts);
  const assets = useFinanceStore(state => state.assets);
  const settings = useFinanceStore(state => state.settings);
  const updateSettings = useFinanceStore(state => state.updateSettings);
  const setGoogleSheetUrl = useFinanceStore(state => state.setGoogleSheetUrl);

  const user = useAuthStore(state => state.user);
  const logout = useAuthStore(state => state.logout);

  const [showOnboarding, setShowOnboarding] = useState(false);

  // Load active user's credentials into FinanceStore
  useEffect(() => {
    if (user) {
      const financeState = useFinanceStore.getState();
      
      if (user.email.toLowerCase() === 'demo@dompetku.com') {
        const defaultSheetUrl = import.meta.env.VITE_DEFAULT_SHEET_URL || 'https://script.google.com/macros/s/AKfycbzhD4TrmhBhb1484U7thVyEJDvZAFYtAbiG0bRK_jcWCiLKwy1EtBFCOQKikaj9l6yL2Q/exec';
        if (financeState.googleSheetUrl !== defaultSheetUrl) {
          financeState.setGoogleSheetUrl(defaultSheetUrl);
        }
        if (financeState.spreadsheetId !== '1GMIXfRg7oWSBwUsOyRJqxKKR3-QC6xJny89IsDsbDJ0') {
          financeState.setSpreadsheetId('1GMIXfRg7oWSBwUsOyRJqxKKR3-QC6xJny89IsDsbDJ0');
        }
        if (financeState.googleAccessToken !== null) {
          useFinanceStore.setState({ googleAccessToken: null });
        }
      } else {
        const resolvedSheetUrl = user.sheetUrl || '';
        const resolvedSpreadsheetId = user.spreadsheetId || null;
        
        if (!resolvedSheetUrl && !resolvedSpreadsheetId) {
          // Google Auth user without database setup -> set blank slate
          useFinanceStore.setState({
            transactions: [],
            accounts: [],
            assets: [],
            budgetCategories: [],
            debts: [],
            monthlyBudgets: {},
            googleSheetUrl: '',
            spreadsheetId: null
          });
        } else {
          if (financeState.googleSheetUrl !== resolvedSheetUrl) {
            financeState.setGoogleSheetUrl(resolvedSheetUrl);
          }
          if (financeState.spreadsheetId !== resolvedSpreadsheetId) {
            financeState.setSpreadsheetId(resolvedSpreadsheetId as any);
          }
        }
      }
    }
  }, [user]);

  // Sync auth user name with local settings
  useEffect(() => {
    if (user) {
      const hasUserName = settings.find(s => s.key === 'userName')?.value === user.name;
      if (!hasUserName) {
        const exists = settings.some(s => s.key === 'userName');
        const updated = exists
          ? settings.map(s => s.key === 'userName' ? { ...s, value: user.name } : s)
          : [...settings, { key: 'userName', value: user.name }];
        updateSettings(updated);
      }
    }
  }, [user, settings, updateSettings]);

  // Memoized count of active overdue valuation reminders
  const overdueNotificationsCount = React.useMemo(() => {
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

    let count = 0;

    // 1. Accounts (liquid) - 30 days
    accounts.forEach(acc => {
      if (acc.valuationReminder && acc.lastValuationUpdate) {
        const days = getDaysPassed(acc.lastValuationUpdate);
        if (days > 30) count++;
      }
    });

    // 2. Assets (physical) - 365 days
    assets.forEach(ast => {
      if (['real-estat', 'kendaraan', 'koleksi'].includes(ast.category) && ast.valuationReminder && ast.lastValuationUpdate) {
        const days = getDaysPassed(ast.lastValuationUpdate);
        if (days > 365) count++;
      }
    });

    // 3. Promos (unread marketing messages)
    const isMarketingOn = settings.find(s => s.key === 'notification_marketing')?.value === 'true';
    if (isMarketingOn) {
      const { promos, readPromos } = useFinanceStore.getState();
      const unreadPromosCount = promos.filter(p => String(p.isActive).toUpperCase() === 'TRUE' && !readPromos.includes(p.id)).length;
      count += unreadPromosCount;
    }

    return count;
  }, [accounts, assets, settings, useFinanceStore(state => state.promos), useFinanceStore(state => state.readPromos)]);

  useEffect(() => {
    // Selalu coba sync di awal jika ada URL (baik punya user maupun default demo URL)
    syncFromGoogleSheets();
  }, [syncFromGoogleSheets, user?.sheetUrl]);

  // Fetch Promos when marketing setting is turned on
  const isMarketingOn = useFinanceStore(state => state.settings).find(s => s.key === 'notification_marketing')?.value === 'true';
  useEffect(() => {
    if (isMarketingOn) {
      useFinanceStore.getState().fetchPromos('https://script.google.com/macros/s/AKfycbz1E-CxMWgT9UhmlIh8LJb5wRmJEQZ3Y7mwpqbFjQtfuoV1U4vTjISMq0gDKPv6VWYu/exec');
    }
  }, [isMarketingOn]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [activeTab]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearch(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleShowCTA = (feature?: FeatureCTA) => {
    if (feature) setCtaFeature(feature);
    setShowCTA(true);
  };

  const handleNavigate = (tab: string) => {
    setActiveTab(tab as FinanceTab);
  };

  const NavItem = ({ id, icon, label }: { id: FinanceTab; icon: string; label: string }) => {
    const isActive = activeTab === id;
    return (
      <a
        onClick={() => {
          setActiveTab(id);
          setShowMobileMenu(false);
        }}
        className={`rounded-lg mx-2 flex items-center gap-3 px-4 py-3 cursor-pointer active:opacity-80 transition-transform duration-200 hover:translate-x-1 font-['Inter'] font-medium text-sm ${
          isActive 
            ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' 
            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900'
        }`}
      >
        <span className="material-symbols-outlined">{icon}</span>
        <span>{label}</span>
      </a>
    );
  };

  return (
    <div className={`flex w-full min-h-screen font-body transition-colors duration-200 ${isDark ? 'dark bg-[#0a0f18]' : 'bg-surface'}`}>
      
      {/* SideNavBar (Desktop) */}
      <aside className="h-screen w-64 fixed left-0 top-0 hidden lg:flex flex-col bg-slate-50 dark:bg-[#0a0f18] border-r border-slate-200/20 z-40 no-print">
        <div className="px-4 py-8 border-b border-slate-200/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl overflow-hidden shadow-lg shadow-blue-600/20">
              <img src="/Image/logo/Logo NAM-TECH New.png" className="w-full h-full object-contain" alt="Logo" />
            </div>
            <div className="text-lg font-extrabold text-blue-950 dark:text-white font-headline tracking-tight leading-none">
              {import.meta.env.VITE_APP_NAME || 'DompetKu'}
            </div>
          </div>
          <div className="text-[10px] font-medium text-slate-400 mt-1.5 uppercase tracking-[0.15em] font-['Inter']">
            {import.meta.env.VITE_APP_TAGLINE || 'Your Finance Tracker'}
          </div>
        </div>
        <nav className="flex flex-col gap-2 p-4 flex-grow">
          <NavItem id="dashboard" icon="dashboard" label="Dasbor" />
          <NavItem id="transactions" icon="receipt_long" label="Transaksi" />
          <NavItem id="budget" icon="payments" label="Anggaran" />
          <NavItem id="assets" icon="account_balance" label="Aset" />
          <NavItem id="debts" icon="leaderboard" label="Rencana Utang" />
          <NavItem id="analytics" icon="query_stats" label="Laporan" />
          <NavItem id="settings" icon="settings" label="Pengaturan" />
        </nav>
        
        <div className="p-4 border-t border-slate-200/20">
          <button 
            onClick={() => handleShowCTA({
              title: "Smart Transaction AI",
              description: "Kategorisasi otomatis berbasis Machine Learning untuk ribuan transaksi secara instan.",
              icon: "add"
            })}
            className="w-full bg-gradient-to-r from-primary to-primary-container text-white py-3 rounded-md font-label font-semibold text-sm mb-6 flex items-center justify-center gap-2 shadow-sm hover:opacity-90 transition-opacity"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            Tambah Transaksi
          </button>
          <div className="flex flex-col gap-1">
            <a onClick={toggleDark} className="text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 mx-2 rounded-lg flex items-center gap-3 px-4 py-2 font-['Inter'] font-medium text-xs cursor-pointer">
              <span className="material-symbols-outlined text-sm">{isDark ? 'light_mode' : 'dark_mode'}</span>
              Tema {isDark ? 'Terang' : 'Gelap'}
            </a>

            <a onClick={logout} className="text-error hover:bg-red-50 dark:hover:bg-red-900/20 mx-2 rounded-lg flex items-center gap-3 px-4 py-2 font-['Inter'] font-medium text-xs cursor-pointer border-t border-slate-200/10 mt-1 pt-2">
              <span className="material-symbols-outlined text-sm">logout</span>
              Keluar Akun
            </a>
          </div>
        </div>
      </aside>

      {/* Main Content Canvas */}
      <main className="lg:pl-64 w-full min-h-screen">
        {/* TopNavBar Header */}
        <header className="fixed top-0 left-0 lg:left-64 right-0 z-30 bg-slate-50/80 dark:bg-[#0a0f18]/80 backdrop-blur-xl h-16 shadow-sm flex items-center px-4 lg:px-8 justify-between no-print">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <button 
              onClick={() => setShowMobileMenu(!showMobileMenu)} 
              className="lg:hidden text-slate-500 hover:bg-slate-100 p-1.5 sm:p-2 rounded-full cursor-pointer transition-colors shrink-0"
            >
              <span className="material-symbols-outlined">menu</span>
            </button>
            <h1 className="text-lg sm:text-xl font-bold text-blue-950 dark:text-white font-headline tracking-tight capitalize truncate">
              {activeTab === 'dashboard' ? 'Dasbor' : activeTab === 'transactions' ? 'Transaksi' : activeTab === 'budget' ? 'Anggaran' : activeTab === 'assets' ? 'Aset' : activeTab === 'analytics' || activeTab.includes('report') ? 'Laporan' : activeTab === 'notifications' ? 'Notifikasi' : activeTab === 'settings' ? 'Pengaturan' : 'Manajemen'}
            </h1>
          </div>
          
          <div className="flex items-center gap-1 sm:gap-2 lg:gap-8 flex-1 justify-end lg:justify-between pl-2">
            {/* Global Search Bar (Desktop) */}
            <div 
              onClick={() => setShowSearch(true)}
              className="hidden lg:flex flex-1 max-w-md relative group cursor-pointer"
            >
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-primary transition-colors">search</span>
              <div className="w-full bg-slate-100 dark:bg-white/5 border border-transparent hover:border-primary/20 dark:hover:border-white/20 rounded-xl py-2 pl-10 pr-4 text-sm font-medium text-slate-400 flex items-center justify-between transition-all">
                <span>Cari transaksi, aset atau laporan...</span>
                <div className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 rounded border border-slate-300 dark:border-white/10 bg-white dark:bg-white/5 text-[10px] font-bold text-slate-400">⌘</kbd>
                  <kbd className="px-1.5 py-0.5 rounded border border-slate-300 dark:border-white/10 bg-white dark:bg-white/5 text-[10px] font-bold text-slate-400">K</kbd>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-1 sm:gap-2 lg:gap-4 shrink-0">
              <div className="lg:hidden">
                <span 
                  onClick={() => setShowSearch(true)}
                  className="material-symbols-outlined p-1.5 sm:p-2 rounded-full cursor-pointer text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  search
                </span>
              </div>

              <button 
                onClick={() => syncFromGoogleSheets()}
                disabled={isSyncing}
                title={lastSyncAt ? `Terakhir sinkronisasi: ${new Date(lastSyncAt).toLocaleTimeString('id-ID')}` : 'Sinkronkan data'}
                className={`material-symbols-outlined p-1.5 sm:p-2 rounded-full cursor-pointer transition-all flex items-center justify-center relative border border-transparent bg-transparent disabled:opacity-75 ${
                  isSyncing 
                    ? 'text-blue-600 dark:text-[#a7c8ff] animate-spin' 
                    : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-blue-600 dark:hover:text-[#a7c8ff]'
                }`}
              >
                sync
              </button>

              <div className="relative">
                <span 
                  onClick={() => setActiveTab('notifications')}
                  className={`material-symbols-outlined p-1.5 sm:p-2 rounded-full cursor-pointer transition-colors flex items-center justify-center ${activeTab === 'notifications' ? 'bg-primary/10 text-primary dark:bg-[#a7c8ff]/20 dark:text-[#a7c8ff]' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                >
                  notifications
                </span>
                {overdueNotificationsCount > 0 && (
                  <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-error dark:bg-[#ffb4ab] rounded-full border-2 border-slate-50 dark:border-[#0a0f18] animate-pulse" />
                )}
              </div>
              <span 
                onClick={() => setActiveTab('settings')}
                className={`material-symbols-outlined p-1.5 sm:p-2 rounded-full cursor-pointer transition-colors ${activeTab === 'settings' ? 'bg-primary/10 text-primary dark:bg-[#a7c8ff]/20 dark:text-[#a7c8ff]' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
              >
                settings
              </span>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full overflow-hidden bg-slate-200 border border-slate-300 dark:border-slate-700 ml-0.5 sm:ml-1 shrink-0">
                <img alt="User Avatar" className="w-full h-full object-cover" src={user?.photoURL || "https://ui-avatars.com/api/?name=User+Demo&background=0D8ABC&color=fff"} />
              </div>
            </div>
          </div>
        </header>

        {/* Dynamic Content Area */}
        <div className="pt-24 px-4 lg:px-12 pb-24 lg:pb-12 w-full mx-auto space-y-12 no-print">
          
          {/* Demo Warning Banner */}
          {user?.email.toLowerCase() === 'demo@dompetku.com' ? (
            <div className="p-4 bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/20 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-amber-800 dark:text-amber-300">
              <div className="flex items-center gap-3 text-xs md:text-sm font-semibold">
                <span className="material-symbols-outlined text-lg">warning</span>
                <span>Anda sedang menggunakan database demo publik. Silakan eksplorasi fitur menggunakan data tiruan ini.</span>
              </div>
            </div>
          ) : !(user?.sheetUrl || user?.spreadsheetId) ? (
            <div className="p-4 bg-blue-500/10 dark:bg-blue-500/20 border border-blue-500/20 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-blue-800 dark:text-blue-300">
              <div className="flex items-center gap-3 text-xs md:text-sm font-semibold">
                <span className="material-symbols-outlined text-lg">info</span>
                <span>Database belum terhubung (Data Kosong). Silakan buka Pengaturan untuk memasukkan Link Google Sheets dan Web App URL Anda agar data dapat disinkronkan.</span>
              </div>
              <button 
                onClick={() => setActiveTab('settings')}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow transition-all shrink-0 cursor-pointer"
              >
                Hubungkan Sekarang
              </button>
            </div>
          ) : null}

          {/* Sync Error Warning Banner */}
          {syncError && (
            <div className="p-4 bg-red-500/10 dark:bg-red-500/20 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-800 dark:text-red-300">
              <span className="material-symbols-outlined text-lg">error</span>
              <div className="text-xs md:text-sm font-semibold">
                Gagal sinkronisasi dengan Google Sheets: <span className="font-mono">{syncError}</span>. Silakan periksa koneksi, tautan spreadsheet, atau hubungkan kembali akun Google Anda di Pengaturan.
              </div>
            </div>
          )}

          {activeTab === 'dashboard' && <FinanceDashboard onShowCTA={handleShowCTA} onNavigate={handleNavigate} />}
          {activeTab === 'transactions' && <FinanceTransactions onShowCTA={handleShowCTA} onNavigate={handleNavigate} onEditTransaction={(id) => { setEditingTransactionId(id); setActiveTab('add-transaction'); }} />}
          {activeTab === 'budget' && <FinanceBudget onShowCTA={handleShowCTA} />}
          {activeTab === 'assets' && <FinanceAssets onShowCTA={handleShowCTA} onNavigate={handleNavigate} />}
          {activeTab === 'debts' && <FinanceDebts onShowCTA={handleShowCTA} onNavigate={handleNavigate} />}
          {activeTab === 'analytics' && <FinanceAnalytics onShowCTA={handleShowCTA} onNavigate={handleNavigate} />}
          
          {/* Sub-Modules (Forms & Modals) */}
          {activeTab === 'add-transaction' && <FinanceAddTransaction onShowCTA={handleShowCTA} onBack={() => { setActiveTab('transactions'); setEditingTransactionId(null); }} editingTransactionId={editingTransactionId} />}
          {activeTab === 'add-category' && <FinanceAddCategory onShowCTA={handleShowCTA} onBack={() => setActiveTab('budget')} />}
          {activeTab === 'integration' && <FinanceIntegration onShowCTA={handleShowCTA} onBack={() => setActiveTab('dashboard')} />}
          {activeTab === 'add-asset' && <FinanceAddAsset onShowCTA={handleShowCTA} onBack={() => setActiveTab('assets')} />}
          {activeTab === 'add-account' && <FinanceAddAccount onShowCTA={handleShowCTA} onBack={() => setActiveTab('assets')} />}
          
          {/* Detailed Reports & Views */}
          {activeTab === 'portfolio-report' && <FinancePortfolioReport onShowCTA={handleShowCTA} onNavigate={handleNavigate} />}
          {activeTab === 'performance-report' && <FinancePerformanceReport onShowCTA={handleShowCTA} onNavigate={handleNavigate} />}
          {activeTab === 'equity-ledger' && <FinanceEquityLedger onShowCTA={handleShowCTA} onNavigate={handleNavigate} onBack={() => setActiveTab('assets')} />}
          {activeTab === 'notifications' && (
            <FinanceNotifications 
              onShowCTA={handleShowCTA} 
              onNavigate={(tab) => {
                setActiveTab(tab as any);
              }}
            />
          )}
          {activeTab === 'settings' && <FinanceSettings onShowCTA={handleShowCTA} onBack={() => setActiveTab('dashboard')} />}
        </div>
        
        {/* Global Watermark - shown at the bottom of the content area */}
        <div className="w-full text-center pb-8 no-print opacity-50 hover:opacity-100 transition-opacity">
          <p className="text-[10px] lg:text-xs text-on-surface-variant dark:text-outline font-medium tracking-widest uppercase">
            Dikembangkan oleh NAMTECH
          </p>
        </div>

        {/* Corporate-grade Printable Report canvas (only active in print mode) */}
        <FinancePrintableReport />
        <FinancePrintableLedger />
      </main>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {showMobileMenu && (
          <div className="fixed inset-0 z-[100] lg:hidden">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowMobileMenu(false)} />
            <motion.div 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              className="absolute left-0 top-0 bottom-0 w-64 bg-slate-50 dark:bg-[#0a0f18] shadow-2xl flex flex-col"
            >
              <div className="px-4 py-8 border-b border-slate-200/20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl overflow-hidden shadow-lg shadow-blue-600/20">
                    <img src="/Image/logo/Logo NAM-TECH New.png" className="w-full h-full object-contain" alt="Logo" />
                  </div>
                  <div className="text-lg font-extrabold text-blue-950 dark:text-white font-headline tracking-tight leading-none">
                    {import.meta.env.VITE_APP_NAME || 'DompetKu'}
                  </div>
                </div>
                <div className="text-[10px] font-medium text-slate-400 mt-1.5 uppercase tracking-[0.15em] font-['Inter']">
                  {import.meta.env.VITE_APP_TAGLINE || 'Your Finance Tracker'}
                </div>
              </div>
              <nav className="flex flex-col gap-2 p-4 flex-grow overflow-y-auto">
                <NavItem id="dashboard" icon="dashboard" label="Dasbor" />
                <NavItem id="transactions" icon="receipt_long" label="Transaksi" />
                <NavItem id="budget" icon="payments" label="Anggaran" />
                <NavItem id="assets" icon="account_balance" label="Aset" />
                <NavItem id="debts" icon="leaderboard" label="Rencana Utang" />
                <NavItem id="analytics" icon="query_stats" label="Laporan" />
                <NavItem id="settings" icon="settings" label="Pengaturan" />
              </nav>
              <div className="p-4 border-t border-slate-200/20 flex flex-col gap-2">
                <a onClick={logout} className="text-error hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg flex items-center gap-3 px-4 py-3 font-['Inter'] font-medium text-sm cursor-pointer">
                  <span className="material-symbols-outlined">logout</span>
                  Keluar Akun
                </a>

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Global Search Modal */}
      <AnimatePresence>
        {showSearch && (
          <FinanceSearch 
            onNavigate={(tab) => setActiveTab(tab)} 
            onClose={() => setShowSearch(false)} 
          />
        )}
      </AnimatePresence>

      {/* Marketing CTA Modal */}
      <AnimatePresence>
        {showCTA && (
          <MarketingCTAModal 
            onClose={() => setShowCTA(false)} 
            feature={ctaFeature || undefined}
          />
        )}
      </AnimatePresence>

      {/* Onboarding Modal */}
      <AnimatePresence>
        {showOnboarding && (
          <FinanceOnboardingModal 
            onClose={() => setShowOnboarding(false)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default FinanceDemo;
