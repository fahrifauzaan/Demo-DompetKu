import React, { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import FinanceDashboard from './finance-components/FinanceDashboard';
import FinanceTransactions from './finance-components/FinanceTransactions';
import FinanceBudget from './finance-components/FinanceBudget';
import FinanceAssets from './finance-components/FinanceAssets';
import FinanceDebts from './finance-components/FinanceDebts';
import FinanceGoals from './finance-components/FinanceGoals';
import FinanceAddTransaction from './finance-components/FinanceAddTransaction';
import FinanceAddCategory from './finance-components/FinanceAddCategory';
import FinanceAddAsset from './finance-components/FinanceAddAsset';
import FinanceAddAccount from './finance-components/FinanceAddAccount';
import FinanceAnalytics from './finance-components/FinanceAnalytics';
import FinancePortfolioReport from './finance-components/FinancePortfolioReport';
import FinancePerformanceReport from './finance-components/FinancePerformanceReport';
import FinanceNotifications from './finance-components/FinanceNotifications';
import FinanceEquityLedger from './finance-components/FinanceEquityLedger';
import FinanceSearch from './finance-components/FinanceSearch';
import FinanceSettings from './finance-components/FinanceSettings';
import FinanceGuide from './finance-components/FinanceGuide';
import MarketingCTAModal, { FeatureCTA } from './finance-components/MarketingCTAModal';
import { useFinanceStore } from './store/useFinanceStore';
import FinancePrintableReport from './finance-components/FinancePrintableReport';
import FinancePrintableLedger from './finance-components/FinancePrintableLedger';
import FinancePrintableSPT from './finance-components/FinancePrintableSPT';
import SaveIndicator from './finance-components/SaveIndicator';
import AutoPostRunner from './finance-components/AutoPostRunner';
import { useAuthStore } from './store/useAuthStore';
import FinanceOnboardingModal from './finance-components/FinanceOnboardingModal';
import { useGoogleLogin } from '@react-oauth/google';

interface FinanceDemoProps {
  isDark: boolean;
  toggleDark: () => void;
}

export type FinanceTab = 'dashboard' | 'transactions' | 'budget' | 'assets' | 'debts' | 'goals' | 'analytics' | 'portfolio-report' | 'performance-report' | 'equity-ledger' | 'add-transaction' | 'add-category' | 'add-asset' | 'add-account' | 'notifications' | 'settings' | 'guide';

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

  // Google Sheets OAuth Credentials from Store
  const googleAccessToken = useFinanceStore(state => state.googleAccessToken);
  const spreadsheetId = useFinanceStore(state => state.spreadsheetId);
  const setGoogleCredentials = useFinanceStore(state => state.setGoogleCredentials);

  // Lock Screen States
  const [isAppLocked, setIsAppLocked] = useState(false);
  const lastActiveTime = useRef(Date.now());
  const [pinInput, setPinInput] = useState('');
  const [pinInputError, setPinInputError] = useState(false);
  const [lockSetupStep, setLockSetupStep] = useState<'enter' | 'confirm'>('enter');
  const [lockNewPin, setLockNewPin] = useState('');
  const [lockConfirmPin, setLockConfirmPin] = useState('');
  const [lockPasswordInput, setLockPasswordInput] = useState('');
  const [lockPasswordError, setLockPasswordError] = useState(false);
  const [lockUnlockMethod, setLockUnlockMethod] = useState<'pin' | 'password' | 'setup-pin'>('pin');

  const registeredUsers = useAuthStore(state => state.registeredUsers);
  const savedPin = settings.find(s => s.key === 'security_pin')?.value || '';
  const isPinActive = settings.find(s => s.key === 'security_pinActive')?.value === 'true';
  const hasPin = savedPin !== '' && isPinActive;

  // Google OAuth Reconnect Flow
  const handleGoogleReconnect = useGoogleLogin({
    scope: 'https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/spreadsheets',
    onSuccess: async (tokenResponse) => {
      try {
        setGoogleCredentials(tokenResponse.access_token, spreadsheetId || '');
        await syncFromGoogleSheets();
        if (isAppLocked) {
          setIsAppLocked(false);
          lastActiveTime.current = Date.now();
        }
      } catch (err) {
        console.error(err);
      }
    },
    onError: () => {
      console.error('Google Reconnect failed');
    }
  });

  // Check and update lock screen fields when lock status or settings change
  useEffect(() => {
    if (isAppLocked) {
      setPinInput('');
      setPinInputError(false);
      setLockNewPin('');
      setLockConfirmPin('');
      setLockSetupStep('enter');
      setLockPasswordInput('');
      setLockPasswordError(false);
      
      if (hasPin) {
        setLockUnlockMethod('pin');
      } else {
        setLockUnlockMethod('setup-pin');
      }
    }
  }, [isAppLocked, hasPin]);

  // Idle Timer auto-lock logic
  useEffect(() => {
    let lastUpdate = Date.now();

    const handleActivity = () => {
      const now = Date.now();
      // Throttle activity updates to at most once every 5 seconds to prevent scroll lag
      if (now - lastUpdate > 5000) {
        if (!isAppLocked) {
          lastActiveTime.current = now;
        }
        lastUpdate = now;
      }
    };

    const options = { passive: true };
    window.addEventListener('mousemove', handleActivity, options);
    window.addEventListener('mousedown', handleActivity, options);
    window.addEventListener('keypress', handleActivity, options);
    window.addEventListener('touchstart', handleActivity, options);
    window.addEventListener('scroll', handleActivity, options);

    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('mousedown', handleActivity);
      window.removeEventListener('keypress', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
      window.removeEventListener('scroll', handleActivity);
    };
  }, [isAppLocked]);

  useEffect(() => {
    const interval = setInterval(() => {
      const INACTIVITY_LIMIT = 15 * 60 * 1000; // 15 Menit (Batas Produksi)
      const elapsed = Date.now() - lastActiveTime.current;
      
      if (user && !isAppLocked && elapsed >= INACTIVITY_LIMIT) {
        setIsAppLocked(true);
      }
    }, 15000); // Periksa setiap 15 detik

    return () => clearInterval(interval);
  }, [user, isAppLocked]);

  // Keyboard Handlers for PIN screen
  const handleLockKeyPress = (num: string) => {
    if (lockUnlockMethod === 'pin') {
      if (pinInput.length < 6) {
        const nextPin = pinInput + num;
        setPinInput(nextPin);
        setPinInputError(false);
        
        if (nextPin.length === 6) {
          if (nextPin === savedPin) {
            setTimeout(() => {
              setIsAppLocked(false);
              setPinInput('');
              lastActiveTime.current = Date.now();
            }, 300);
          } else {
            setPinInputError(true);
            setTimeout(() => setPinInput(''), 600);
          }
        }
      }
    } else if (lockUnlockMethod === 'setup-pin') {
      if (lockSetupStep === 'enter') {
        if (lockNewPin.length < 6) {
          const nextNewPin = lockNewPin + num;
          setLockNewPin(nextNewPin);
          
          if (nextNewPin.length === 6) {
            setTimeout(() => {
              setLockSetupStep('confirm');
            }, 300);
          }
        }
      } else if (lockSetupStep === 'confirm') {
        if (lockConfirmPin.length < 6) {
          const nextConfirmPin = lockConfirmPin + num;
          setLockConfirmPin(nextConfirmPin);
          
          if (nextConfirmPin.length === 6) {
            if (nextConfirmPin === lockNewPin) {
              setTimeout(async () => {
                const updatedSettings = [
                  ...settings.filter(s => s.key !== 'security_pinActive' && s.key !== 'security_pin'),
                  { key: 'security_pinActive', value: 'true' },
                  { key: 'security_pin', value: nextConfirmPin }
                ];
                await updateSettings(updatedSettings);
                
                // Sync settings inside the registered user profile
                if (user) {
                  const found = registeredUsers.find(u => u.email.toLowerCase() === user.email.toLowerCase());
                  if (found) {
                    useAuthStore.getState().signup(found.email, found.password, found.name, user.photoURL, user.sheetUrl, user.spreadsheetId);
                  }
                }
                
                setIsAppLocked(false);
                setLockNewPin('');
                setLockConfirmPin('');
                setLockSetupStep('enter');
                lastActiveTime.current = Date.now();
              }, 300);
            } else {
              setPinInputError(true);
              setTimeout(() => {
                setLockNewPin('');
                setLockConfirmPin('');
                setLockSetupStep('enter');
                setPinInputError(false);
              }, 1000);
            }
          }
        }
      }
    }
  };

  const handleLockBackspace = () => {
    if (lockUnlockMethod === 'pin') {
      setPinInput(prev => prev.slice(0, -1));
      setPinInputError(false);
    } else if (lockUnlockMethod === 'setup-pin') {
      if (lockSetupStep === 'enter') {
        setLockNewPin(prev => prev.slice(0, -1));
      } else {
        setLockConfirmPin(prev => prev.slice(0, -1));
      }
    }
  };

  const handlePasswordUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    setLockPasswordError(false);
    
    if (!user) return;
    
    const found = registeredUsers.find(u => u.email.toLowerCase() === user.email.toLowerCase());
    if (found && lockPasswordInput === found.password) {
      setIsAppLocked(false);
      setLockPasswordInput('');
      lastActiveTime.current = Date.now();
    } else {
      setLockPasswordError(true);
    }
  };

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
    if (tab === 'add-transaction') {
      setEditingTransactionId(null);
    }
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
        <div className="px-4 py-6 border-b border-slate-200/20">
          <div className="flex flex-col items-start gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl overflow-hidden shadow-xl shadow-blue-600/20 bg-white dark:bg-white/10 backdrop-blur-xl border border-white/40 dark:border-white/5 flex items-center justify-center relative group shrink-0">
                <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/40 to-white/0 dark:from-white/0 dark:via-white/10 dark:to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none z-10"></div>
                <img src="/Image/logo/DompetKu-2.svg" className="w-full h-full object-cover relative z-0" alt="Logo" />
              </div>
              <div className="text-2xl font-extrabold font-headline tracking-tighter bg-clip-text text-transparent bg-gradient-to-br from-slate-800 via-slate-600 to-slate-800 dark:from-white dark:via-slate-200 dark:to-slate-400 drop-shadow-sm truncate pb-0.5">
                {import.meta.env.VITE_APP_NAME || 'DompetKu'}
              </div>
            </div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/30 shadow-sm ml-1">
              <span className="w-1 h-1 rounded-full bg-blue-500 animate-pulse shrink-0"></span>
              <p className="text-[8px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-[0.15em] font-['Inter'] leading-none pt-0.5 truncate">
                {import.meta.env.VITE_APP_TAGLINE || 'Premium Finance Tracker'}
              </p>
            </div>
          </div>
        </div>
        <nav className="flex flex-col gap-2 p-4 flex-grow">
          <NavItem id="dashboard" icon="dashboard" label="Dasbor" />
          <NavItem id="transactions" icon="receipt_long" label="Transaksi" />
          <NavItem id="budget" icon="payments" label="Anggaran" />
          <NavItem id="assets" icon="account_balance" label="Aset" />
          <NavItem id="debts" icon="leaderboard" label="Rencana Utang" />
          <NavItem id="goals" icon="flag" label="Tujuan" />
          <NavItem id="analytics" icon="query_stats" label="Laporan" />
          <NavItem id="guide" icon="menu_book" label="Panduan" />
          <NavItem id="settings" icon="settings" label="Pengaturan" />
        </nav>

        <div className="p-4 border-t border-slate-200/20">
          <button 
            onClick={() => {
              setActiveTab('add-transaction');
              setEditingTransactionId(null);
            }}
            className="w-full bg-gradient-to-r from-primary to-primary-container text-white py-3 rounded-md font-label font-semibold text-sm mb-6 flex items-center justify-center gap-2 shadow-sm hover:opacity-90 transition-opacity cursor-pointer"
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
              {activeTab === 'dashboard' ? 'Dasbor' : activeTab === 'transactions' ? 'Transaksi' : activeTab === 'budget' ? 'Anggaran' : activeTab === 'assets' ? 'Aset' : activeTab === 'goals' ? 'Tujuan' : activeTab === 'analytics' || activeTab.includes('report') ? 'Laporan' : activeTab === 'notifications' ? 'Notifikasi' : activeTab === 'guide' ? 'Panduan' : activeTab === 'settings' ? 'Pengaturan' : 'Manajemen'}
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
        <div className="pt-24 px-4 lg:px-12 pb-6 w-full mx-auto space-y-12 no-print">
          
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
            <div className="p-4 bg-red-500/10 dark:bg-red-500/20 border border-red-500/20 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 text-red-800 dark:text-red-300 shadow-sm animate-in fade-in duration-300">
              <div className="flex items-center gap-3 text-xs md:text-sm font-semibold">
                <span className="material-symbols-outlined text-lg shrink-0">error</span>
                <span>
                  Gagal sinkronisasi dengan Google Sheets: <span className="font-mono text-[11px] bg-red-500/5 px-1.5 py-0.5 rounded">{syncError}</span>. Silakan periksa koneksi, tautan spreadsheet, atau hubungkan kembali akun Google Anda.
                </span>
              </div>
              {user && user.email.toLowerCase() !== 'demo@dompetku.com' && (
                <button
                  onClick={() => handleGoogleReconnect()}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-md transition-all shrink-0 cursor-pointer flex items-center gap-1.5 active:scale-95"
                >
                  <span className="material-symbols-outlined text-sm">sync</span>
                  Hubungkan Kembali
                </button>
              )}
            </div>
          )}

          {activeTab === 'dashboard' && <FinanceDashboard onShowCTA={handleShowCTA} onNavigate={handleNavigate} />}
          {activeTab === 'transactions' && <FinanceTransactions onShowCTA={handleShowCTA} onNavigate={handleNavigate} onEditTransaction={(id) => { setEditingTransactionId(id); setActiveTab('add-transaction'); }} />}
          {activeTab === 'budget' && <FinanceBudget onShowCTA={handleShowCTA} onNavigate={handleNavigate} />}
          {activeTab === 'assets' && <FinanceAssets onShowCTA={handleShowCTA} onNavigate={handleNavigate} />}
          {activeTab === 'debts' && <FinanceDebts onShowCTA={handleShowCTA} onNavigate={handleNavigate} />}
          {activeTab === 'goals' && <FinanceGoals onShowCTA={handleShowCTA} onNavigate={handleNavigate} />}
          {activeTab === 'analytics' && <FinanceAnalytics onShowCTA={handleShowCTA} onNavigate={handleNavigate} />}
          
          {/* Sub-Modules (Forms & Modals) */}
          {activeTab === 'add-transaction' && <FinanceAddTransaction onShowCTA={handleShowCTA} onBack={() => { setActiveTab('transactions'); setEditingTransactionId(null); }} editingTransactionId={editingTransactionId} />}
          {activeTab === 'add-category' && <FinanceAddCategory onShowCTA={handleShowCTA} onBack={() => setActiveTab('budget')} />}
          {activeTab === 'add-asset' && <FinanceAddAsset onShowCTA={handleShowCTA} onBack={() => setActiveTab('assets')} onNavigate={handleNavigate} />}
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
          {activeTab === 'guide' && <FinanceGuide onNavigate={handleNavigate} />}
        </div>
        
        {/* Global Watermark - shown at the bottom of the content area */}
        <div className="w-full flex justify-center pb-6 no-print mt-4">
          <div className="flex items-center gap-2.5 px-6 py-2.5 rounded-full bg-slate-200/50 dark:bg-slate-800/50 backdrop-blur-2xl border border-slate-300/50 dark:border-slate-700/50 shadow-[0_8px_32px_0_rgba(0,0,0,0.05)] overflow-hidden whitespace-nowrap w-max transition-all hover:bg-white/60 dark:hover:bg-slate-800/80 hover:shadow-[0_8px_32px_0_rgba(0,0,0,0.1)] hover:scale-105 cursor-default">
            <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 tracking-widest uppercase drop-shadow-sm whitespace-nowrap">
              Powered by
            </span>
            <motion.span 
              animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
              transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
              className="text-xs font-black tracking-[0.2em] uppercase bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-cyan-400 to-blue-600 dark:from-blue-400 dark:via-cyan-300 dark:to-blue-400 drop-shadow-sm whitespace-nowrap"
              style={{ backgroundSize: "200% auto" }}
            >
              NAMTECH
            </motion.span>
          </div>
        </div>

        {/* Corporate-grade Printable Report canvas (only active in print mode) */}
        <FinancePrintableReport />
        <FinancePrintableLedger />
        <FinancePrintableSPT />
      </main>

      {/* Indikator penyimpanan global ke Google Sheets (semua fitur) */}
      <SaveIndicator />
      {/* Auto-post transaksi berulang (opt-in) + digest */}
      <AutoPostRunner />

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
              <div className="px-4 py-6 border-b border-slate-200/20">
                <div className="flex flex-col items-start gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl overflow-hidden shadow-xl shadow-blue-600/20 bg-white dark:bg-white/10 backdrop-blur-xl border border-white/40 dark:border-white/5 flex items-center justify-center relative group shrink-0">
                      <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/40 to-white/0 dark:from-white/0 dark:via-white/10 dark:to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none z-10"></div>
                      <img src="/Image/logo/DompetKu-2.svg" className="w-full h-full object-cover relative z-0" alt="Logo" />
                    </div>
                    <div className="text-2xl font-extrabold font-headline tracking-tighter bg-clip-text text-transparent bg-gradient-to-br from-slate-800 via-slate-600 to-slate-800 dark:from-white dark:via-slate-200 dark:to-slate-400 drop-shadow-sm truncate pb-0.5">
                      {import.meta.env.VITE_APP_NAME || 'DompetKu'}
                    </div>
                  </div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/30 shadow-sm ml-1">
                    <span className="w-1 h-1 rounded-full bg-blue-500 animate-pulse shrink-0"></span>
                    <p className="text-[8px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-[0.15em] font-['Inter'] leading-none pt-0.5 truncate">
                      {import.meta.env.VITE_APP_TAGLINE || 'Premium Finance Tracker'}
                    </p>
                  </div>
                </div>
              </div>
              <nav className="flex flex-col gap-2 p-4 flex-grow overflow-y-auto">
                <NavItem id="dashboard" icon="dashboard" label="Dasbor" />
                <NavItem id="transactions" icon="receipt_long" label="Transaksi" />
                <NavItem id="budget" icon="payments" label="Anggaran" />
                <NavItem id="assets" icon="account_balance" label="Aset" />
                <NavItem id="debts" icon="leaderboard" label="Rencana Utang" />
                <NavItem id="analytics" icon="query_stats" label="Laporan" />
                <NavItem id="guide" icon="menu_book" label="Panduan" />
                <NavItem id="settings" icon="settings" label="Pengaturan" />
              </nav>
              <div className="p-4 border-t border-slate-200/20 flex flex-col gap-2">
                <a onClick={toggleDark} className="text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-lg flex items-center gap-3 px-4 py-3 font-['Inter'] font-medium text-sm cursor-pointer">
                  <span className="material-symbols-outlined">{isDark ? 'light_mode' : 'dark_mode'}</span>
                  Tema {isDark ? 'Terang' : 'Gelap'}
                </a>
                <a onClick={logout} className="text-error hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg flex items-center gap-3 px-4 py-3 font-['Inter'] font-medium text-sm cursor-pointer border-t border-slate-200/10 lg:border-t-0 pt-3 lg:pt-0">
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

      {/* Fullscreen Apple-style Lock Screen */}
      <AnimatePresence>
        {isAppLocked && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-[#070b13]/95 backdrop-blur-2xl no-print select-none"
          >
            {/* Ambient subtle glow background */}
            <div className="absolute top-[-30%] left-[-20%] w-[600px] h-[600px] rounded-full bg-blue-600/10 blur-[130px] pointer-events-none" />
            <div className="absolute bottom-[-30%] right-[-20%] w-[600px] h-[600px] rounded-full bg-cyan-500/10 blur-[130px] pointer-events-none" />

            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 30 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="relative w-full max-w-md bg-white/5 border border-white/10 p-8 rounded-[36px] shadow-2xl flex flex-col items-center overflow-hidden"
            >
              {/* Blur accent card */}
              <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-b from-blue-500/10 to-transparent pointer-events-none" />

              {/* User Avatar */}
              <div className="relative mb-6 shrink-0 z-10">
                <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-white/20 shadow-xl bg-slate-800">
                  <img
                    alt="User Profile"
                    className="w-full h-full object-cover"
                    src={user?.photoURL || "https://ui-avatars.com/api/?name=User&background=0D8ABC&color=fff"}
                  />
                </div>
                <div className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-blue-500 border-2 border-[#070b13] flex items-center justify-center text-white">
                  <span className="material-symbols-outlined text-[12px] font-bold">lock</span>
                </div>
              </div>

              <h2 className="text-xl font-extrabold text-white mb-1 text-center font-headline">Layar Terkunci</h2>
              <p className="text-xs text-slate-400 text-center mb-8 font-medium">
                {user?.name || 'Pengguna'} • {user?.email}
              </p>

              {/* UNLOCK METHOD: PIN ENTRY */}
              {lockUnlockMethod === 'pin' && (
                <div className="w-full flex flex-col items-center">
                  <p className="text-xs text-slate-300 mb-6 text-center">Masukkan 6 digit PIN untuk membuka kunci</p>
                  
                  {/* Dots indicator */}
                  <motion.div
                    animate={pinInputError ? { x: [-10, 10, -10, 10, 0] } : {}}
                    transition={{ duration: 0.4 }}
                    className="flex justify-center gap-4 mb-8"
                  >
                    {[...Array(6)].map((_, i) => (
                      <div
                        key={i}
                        className={`w-3.5 h-3.5 rounded-full transition-all duration-300 ${
                          i < pinInput.length
                            ? pinInputError ? 'bg-rose-500 scale-110 shadow-lg shadow-rose-500/30' : 'bg-blue-400 scale-110 shadow-lg shadow-blue-400/30'
                            : 'bg-white/10'
                        }`}
                      />
                    ))}
                  </motion.div>

                  {/* Keyboard Grid */}
                  <div className="grid grid-cols-3 gap-y-4 gap-x-8 w-full max-w-[260px] mb-6">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                      <button
                        key={num}
                        onClick={() => handleLockKeyPress(num.toString())}
                        className="w-14 h-14 mx-auto rounded-full text-xl font-bold text-white hover:bg-white/10 active:bg-white/20 transition-all flex items-center justify-center cursor-pointer border border-transparent hover:border-white/5 active:scale-95"
                      >
                        {num}
                      </button>
                    ))}
                    <div />
                    <button
                      onClick={() => handleLockKeyPress('0')}
                      className="w-14 h-14 mx-auto rounded-full text-xl font-bold text-white hover:bg-white/10 active:bg-white/20 transition-all flex items-center justify-center cursor-pointer border border-transparent hover:border-white/5 active:scale-95"
                    >
                      0
                    </button>
                    <button
                      onClick={handleLockBackspace}
                      className="w-14 h-14 mx-auto rounded-full text-lg font-bold text-slate-400 hover:text-white hover:bg-white/10 active:bg-white/20 transition-all flex items-center justify-center cursor-pointer active:scale-95"
                    >
                      <span className="material-symbols-outlined">backspace</span>
                    </button>
                  </div>
                </div>
              )}

              {/* UNLOCK METHOD: SETUP PIN (frictionless setup on the spot) */}
              {lockUnlockMethod === 'setup-pin' && (
                <div className="w-full flex flex-col items-center">
                  <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-2xl text-center mb-6 max-w-sm">
                    <p className="text-xs font-bold text-blue-300">💡 Anda Belum Mengatur PIN</p>
                    <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                      DompetKu memerlukan PIN 6 digit untuk mengamankan data kekayaan Anda dari akses tidak sah saat perangkat ditinggalkan.
                    </p>
                  </div>
                  
                  <p className="text-xs text-slate-200 mb-6 font-bold text-center">
                    {lockSetupStep === 'enter' ? 'Buat PIN 6 Digit Baru Anda:' : 'Konfirmasi PIN Baru Anda:'}
                  </p>

                  {/* Dots indicator for setup */}
                  <motion.div
                    animate={pinInputError ? { x: [-10, 10, -10, 10, 0] } : {}}
                    transition={{ duration: 0.4 }}
                    className="flex justify-center gap-4 mb-8"
                  >
                    {[...Array(6)].map((_, i) => {
                      const activeLen = lockSetupStep === 'enter' ? lockNewPin.length : lockConfirmPin.length;
                      return (
                        <div
                          key={i}
                          className={`w-3.5 h-3.5 rounded-full transition-all duration-300 ${
                            i < activeLen
                              ? pinInputError ? 'bg-rose-500 scale-110 shadow-lg shadow-rose-500/30' : 'bg-emerald-400 scale-110 shadow-lg shadow-emerald-400/30'
                              : 'bg-white/10'
                          }`}
                        />
                      );
                    })}
                  </motion.div>

                  {/* Keyboard Grid */}
                  <div className="grid grid-cols-3 gap-y-4 gap-x-8 w-full max-w-[260px] mb-6">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                      <button
                        key={num}
                        onClick={() => handleLockKeyPress(num.toString())}
                        className="w-14 h-14 mx-auto rounded-full text-xl font-bold text-white hover:bg-white/10 active:bg-white/20 transition-all flex items-center justify-center cursor-pointer border border-transparent hover:border-white/5 active:scale-95"
                      >
                        {num}
                      </button>
                    ))}
                    <div />
                    <button
                      onClick={() => handleLockKeyPress('0')}
                      className="w-14 h-14 mx-auto rounded-full text-xl font-bold text-white hover:bg-white/10 active:bg-white/20 transition-all flex items-center justify-center cursor-pointer border border-transparent hover:border-white/5 active:scale-95"
                    >
                      0
                    </button>
                    <button
                      onClick={handleLockBackspace}
                      className="w-14 h-14 mx-auto rounded-full text-lg font-bold text-slate-400 hover:text-white hover:bg-white/10 active:bg-white/20 transition-all flex items-center justify-center cursor-pointer active:scale-95"
                    >
                      <span className="material-symbols-outlined">backspace</span>
                    </button>
                  </div>
                </div>
              )}

              {/* UNLOCK METHOD: PASSWORD ENTRY (Fallback) */}
              {lockUnlockMethod === 'password' && (
                <div className="w-full flex flex-col items-center">
                  <p className="text-xs text-slate-300 mb-6 text-center">Buka kunci menggunakan kredensial akun Anda</p>
                  
                  {user && (user.email.toLowerCase().endsWith('@gmail.com') || registeredUsers.find(u => u.email.toLowerCase() === user.email.toLowerCase())?.password === 'google-oauth-password') ? (
                    // Google user re-auth button
                    <div className="w-full space-y-4 mb-6">
                      <button
                        onClick={() => handleGoogleReconnect()}
                        className="w-full bg-white dark:bg-white/10 border border-white/20 hover:bg-white/20 text-white font-semibold py-4 px-6 rounded-2xl transition-all flex items-center justify-center gap-3 cursor-pointer active:scale-95 shadow-lg"
                      >
                        <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
                          <g transform="matrix(1, 0, 0, 1, 0, 0)">
                            <path d="M21.35,11.1H12v2.7h5.38C16.88,15.69,14.8,17.2,12,17.2a5.2,5.2,0,1,1,4.78-7.24l2.44-1.89A9.15,9.15,0,1,0,12,21.1c4.66,0,8.55-3.39,8.55-9.1A8.25,8.25,0,0,0,21.35,11.1Z" fill="#ea4335" />
                            <path d="M12,21.1c4.66,0,8.55-3.39,8.55-9.1a8.25,8.25,0,0,0-.2-1.9H12v2.7h5.38C16.88,15.69,14.8,17.2,12,17.2a5.2,5.2,0,1,1,4.78-7.24l2.44-1.89A9.15,9.15,0,1,0,12,21.1Z" fill="#34a853" />
                            <path d="M12,2.9a5.1,5.1,0,0,1,3.48,1.35l2.44-1.89A9.15,9.15,0,0,0,12,2.9a9.15,9.15,0,0,0-8.55,6.1l2.44,1.89A5.2,5.2,0,0,1,12,2.9Z" fill="#fbbc05" />
                            <path d="M12,2.9a5.1,5.1,0,0,1,3.48,1.35l2.44-1.89A9.15,9.15,0,0,0,12,2.9Z" fill="#4285f4" />
                          </g>
                        </svg>
                        <span>Otorisasi dengan Akun Google</span>
                      </button>
                    </div>
                  ) : (
                    // Email/Password form
                    <form onSubmit={handlePasswordUnlock} className="w-full space-y-4 mb-6">
                      {lockPasswordError && (
                        <div className="p-3.5 text-xs bg-rose-500/10 text-rose-400 rounded-2xl border border-rose-500/20 flex items-center gap-2">
                          <span className="material-symbols-outlined text-sm font-bold">warning</span>
                          <span>Kata sandi akun yang Anda masukkan salah.</span>
                        </div>
                      )}
                      
                      <div className="space-y-1.5">
                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1">Password Akun</label>
                        <input
                          type="password"
                          value={lockPasswordInput}
                          onChange={e => setLockPasswordInput(e.target.value)}
                          placeholder="Masukkan password akun Anda"
                          className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-sm focus:outline-none focus:border-blue-500 transition-colors text-white"
                        />
                      </div>
                      
                      <button
                        type="submit"
                        disabled={!lockPasswordInput}
                        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white font-semibold py-3.5 rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                      >
                        <span>Buka Kunci</span>
                        <span className="material-symbols-outlined text-sm">key</span>
                      </button>
                    </form>
                  )}
                </div>
              )}

              {/* Unlock Options Toggles / Footer Links */}
              <div className="w-full border-t border-white/10 pt-5 mt-2 flex flex-col items-center gap-3">
                {lockUnlockMethod === 'pin' && (
                  <button
                    onClick={() => setLockUnlockMethod('password')}
                    className="text-xs font-bold text-blue-400 hover:underline cursor-pointer bg-transparent border-none outline-none"
                  >
                    Buka dengan Password / Akun Google
                  </button>
                )}
                
                {lockUnlockMethod === 'setup-pin' && (
                  <button
                    onClick={() => setLockUnlockMethod('password')}
                    className="text-xs font-bold text-blue-400 hover:underline cursor-pointer bg-transparent border-none outline-none"
                  >
                    Gunakan Password / Google Auth Sementara
                  </button>
                )}

                {lockUnlockMethod === 'password' && (
                  <button
                    onClick={() => setLockUnlockMethod(hasPin ? 'pin' : 'setup-pin')}
                    className="text-xs font-bold text-blue-400 hover:underline cursor-pointer bg-transparent border-none outline-none"
                  >
                    {hasPin ? 'Gunakan PIN Keamanan' : 'Atur PIN Baru untuk Layar'}
                  </button>
                )}

                <button
                  onClick={() => {
                    if (window.confirm('Keluar dari sesi akun saat ini?')) {
                      setIsAppLocked(false);
                      logout();
                    }
                  }}
                  className="text-xs font-bold text-rose-400 hover:underline cursor-pointer bg-transparent border-none outline-none"
                >
                  Keluar Akun (Log Out)
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FinanceDemo;
