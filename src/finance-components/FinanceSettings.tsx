import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FeatureCTA } from './MarketingCTAModal';
import { useFinanceStore } from '../store/useFinanceStore';
import * as OTPAuth from 'otpauth';
import { QRCodeSVG } from 'qrcode.react';
import FinancePinModal from './FinancePinModal';
import { useAuthStore } from '../store/useAuthStore';
import FinanceOnboardingModal from './FinanceOnboardingModal';

const getDeviceInfo = () => {
  const ua = navigator.userAgent;
  let device = 'Unknown Device';
  let icon = 'devices';
  if (/Macintosh|Mac OS X/.test(ua)) { device = 'MacBook / Mac'; icon = 'laptop_mac'; }
  else if (/Windows NT/.test(ua)) { device = 'Windows PC'; icon = 'computer'; }
  else if (/iPhone|iPad|iPod/.test(ua)) { device = 'iPhone / iPad'; icon = 'smartphone'; }
  else if (/Android/.test(ua)) { device = 'Android Device'; icon = 'smartphone'; }

  let browser = 'Browser';
  if (/Chrome/.test(ua) && !/Edge|Edg/.test(ua)) browser = 'Chrome';
  else if (/Safari/.test(ua) && !/Chrome/.test(ua)) browser = 'Safari';
  else if (/Firefox/.test(ua)) browser = 'Firefox';
  else if (/Edge|Edg/.test(ua)) browser = 'Edge';

  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  let location = timeZone.split('/')[1]?.replace('_', ' ') || timeZone;
  if (location === 'Jakarta') location = 'Jakarta, ID';

  return { label: `${device} (${browser}) • ${location}`, icon };
};

interface FinanceSettingsProps {
  onShowCTA: (feature?: FeatureCTA) => void;
  onBack?: () => void;
}

const FinanceSettings: React.FC<FinanceSettingsProps> = ({ onBack }) => {
  const [activeSection, setActiveSection] = useState<'profil' | 'keamanan' | 'preferensi' | 'notifikasi'>('profil');
  
  const { settings, googleSheetUrl, setGoogleSheetUrl, updateSettings, googleAccessToken, spreadsheetId, setSpreadsheetId, syncFromGoogleSheets } = useFinanceStore();
  
  const user = useAuthStore(state => state.user);
  const signup = useAuthStore(state => state.signup);
  const logout = useAuthStore(state => state.logout);
  const registeredUsers = useAuthStore(state => state.registeredUsers);

  const [showSetupWizard, setShowSetupWizard] = useState(false);

  // Helper to get/set settings
  const getSetting = (key: string, fallback: string) => settings.find(s => s.key === key)?.value || fallback;

  // Case-insensitive boolean setting helper
  const getSettingBool = (key: string, fallback: boolean): boolean => {
    const val = settings.find(s => s.key === key)?.value;
    if (val === undefined) return fallback;
    return String(val).toLowerCase() === 'true';
  };

  // Real states loaded from store
  const [notifications, setNotifications] = useState({
    budgetAlert: getSettingBool('notification_budgetAlert', true),
    billReminder: getSettingBool('notification_billReminder', true),
    marketing: getSettingBool('notification_marketing', false),
    security: getSettingBool('notification_security', true)
  });

  const [securitySettings, setSecuritySettings] = useState({
    pinActive: getSettingBool('security_pinActive', true),
    twoFactorActive: getSettingBool('security_twoFactorActive', false)
  });

  // Profile form state — initialized from store
  const [profileName, setProfileName] = useState(getSetting('userName', 'Admin Demo User'));
  const [profileEmail, setProfileEmail] = useState(getSetting('email', ''));
  const [profilePhone, setProfilePhone] = useState(getSetting('phone', ''));
  const [profileJob, setProfileJob] = useState(getSetting('pekerjaan', ''));
  const [currency, setCurrency] = useState(getSetting('currency', 'IDR'));
  const [language, setLanguage] = useState(getSetting('language', 'Bahasa Indonesia'));
  const [usdRate, setUsdRate] = useState(getSetting('USDIDR_RATE', '16300'));
  const [usdTickers, setUsdTickers] = useState(getSetting('usd_tickers', 'VTI,SPY,VOO,QQQ'));
  const [profilePassword, setProfilePassword] = useState(getSetting('last_password', 'password123'));
  const [lastPasswordUpdated, setLastPasswordUpdated] = useState(getSetting('last_password_updated', ''));
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Security Modal States
  const [showSetupPin, setShowSetupPin] = useState(false);
  const [showSetup2FA, setShowSetup2FA] = useState(false);
  const [temp2faSecret, setTemp2faSecret] = useState('');
  const [temp2faToken, setTemp2faToken] = useState('');
  const [temp2faError, setTemp2faError] = useState(false);

  // Apple Glassmorphism Password Modal States
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPasswordVal, setNewPasswordVal] = useState('');
  const [confirmPasswordVal, setConfirmPasswordVal] = useState('');
  const [passwordModalError, setPasswordModalError] = useState('');
  const [showPasswordVisibility, setShowPasswordVisibility] = useState(false);
  const [passwordSuccessModal, setPasswordSuccessModal] = useState(false);

  // Re-initialize form when settings change (e.g. after sync)
  useEffect(() => {
    setProfileName(getSetting('userName', 'Admin Demo User'));
    setProfileEmail(getSetting('email', ''));
    setProfilePhone(getSetting('phone', ''));
    setProfileJob(getSetting('pekerjaan', ''));
    setCurrency(getSetting('currency', 'IDR'));
    setLanguage(getSetting('language', 'Bahasa Indonesia'));
    setUsdRate(getSetting('USDIDR_RATE', '16300'));
    setUsdTickers(getSetting('usd_tickers', 'VTI,SPY,VOO,QQQ'));
    setProfilePassword(getSetting('last_password', 'password123'));
    setLastPasswordUpdated(getSetting('last_password_updated', ''));
    setNotifications({
      budgetAlert: getSettingBool('notification_budgetAlert', true),
      billReminder: getSettingBool('notification_billReminder', true),
      marketing: getSettingBool('notification_marketing', false),
      security: getSettingBool('notification_security', true)
    });
    setSecuritySettings({
      pinActive: getSettingBool('security_pinActive', true),
      twoFactorActive: getSettingBool('security_twoFactorActive', false)
    });
  }, [settings]);

  const handleSave = async (overridePassword?: string) => {
    setIsSaving(true);
    
    // Construct updated settings list
    let updatedSettings = [...settings];
    
    const upsertSetting = (key: string, value: string) => {
      const idx = updatedSettings.findIndex(s => s.key === key);
      if (idx !== -1) {
        updatedSettings[idx] = { ...updatedSettings[idx], value };
      } else {
        updatedSettings.push({ key, value });
      }
    };

    if (activeSection === 'profil') {
      upsertSetting('userName', profileName);
      upsertSetting('email', profileEmail);
      upsertSetting('phone', profilePhone);
      upsertSetting('pekerjaan', profileJob);
    } else if (activeSection === 'preferensi') {
      upsertSetting('currency', currency);
      upsertSetting('language', language);
      upsertSetting('USDIDR_RATE', String(Number(String(usdRate).replace(/[^0-9.]/g, '')) || 16300));
      upsertSetting('usd_tickers', usdTickers);
    } else if (activeSection === 'notifikasi') {
      upsertSetting('notification_budgetAlert', String(notifications.budgetAlert));
      upsertSetting('notification_billReminder', String(notifications.billReminder));
      upsertSetting('notification_marketing', String(notifications.marketing));
      upsertSetting('notification_security', String(notifications.security));
    }

    // Save password ONLY when explicitly updating password (e.g. from the change password modal)
    const passToSave = typeof overridePassword === 'string' ? overridePassword : getSetting('last_password', 'password123');
    if (typeof overridePassword === 'string') {
      upsertSetting('last_password', overridePassword);
      upsertSetting('last_password_updated', new Date().toISOString());
      setLastPasswordUpdated(new Date().toISOString());
    }
    
    // Save to Finance Store settings
    await updateSettings(updatedSettings);

    // Sync back to Auth Store if profile or password changed
    if (user && (activeSection === 'profil' || typeof overridePassword === 'string')) {
      const nameToSave = activeSection === 'profil' ? profileName : getSetting('userName', 'Admin Demo User');
      const emailToSave = activeSection === 'profil' ? profileEmail : getSetting('email', '');
      signup(emailToSave, passToSave, nameToSave, user.photoURL);
    }
    
    // Auto sync if user is logged in with Google (in case spreadsheet ID changed)
    if (googleAccessToken) {
      await syncFromGoogleSheets();
    }

    setIsSaving(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

    const getTimeAgo = (dateString: string) => {
    if (!dateString) return 'Belum pernah diubah';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Belum pernah diubah';
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'Baru saja diubah';
    if (diffInSeconds < 3600) return `Terakhir diubah ${Math.floor(diffInSeconds / 60)} menit yang lalu`;
    if (diffInSeconds < 86400) return `Terakhir diubah ${Math.floor(diffInSeconds / 3600)} jam yang lalu`;
    if (diffInSeconds < 2592000) return `Terakhir diubah ${Math.floor(diffInSeconds / 86400)} hari yang lalu`;
    if (diffInSeconds < 31536000) return `Terakhir diubah ${Math.floor(diffInSeconds / 2592000)} bulan yang lalu`;
    return `Terakhir diubah ${Math.floor(diffInSeconds / 31536000)} tahun yang lalu`;
  };

  const SECTIONS = [
    { id: 'profil', label: 'Profil Saya', icon: 'person' },
    { id: 'keamanan', label: 'Keamanan', icon: 'shield_lock' },
    { id: 'preferensi', label: 'Preferensi', icon: 'settings_suggest' },
    { id: 'notifikasi', label: 'Notifikasi', icon: 'notifications_active' },
    { id: 'keluar', label: 'Keluar Akun', icon: 'logout' },
  ];

  return (
    <div className="max-w-5xl mx-auto animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row gap-4 md:gap-6 lg:gap-8">
        
        {/* Sidebar Navigation */}
        <aside className="w-full md:w-64 shrink-0">
          <div className="bg-surface-container-lowest dark:bg-white/5 rounded-2xl p-3 sm:p-4 border border-outline-variant/20 dark:border-white/10 shadow-sm md:sticky md:top-24">
            <h3 className="px-4 py-2 text-xs font-bold text-outline uppercase tracking-widest mb-4">Pengaturan</h3>
            <nav className="space-y-1">
              {SECTIONS.map((section) => (
                <button
                  key={section.id}
                  onClick={() => {
                    if (section.id === 'keluar') {
                      if (window.confirm('Apakah Anda yakin ingin keluar dari akun Anda?')) {
                        logout();
                      }
                    } else {
                      setActiveSection(section.id as any);
                    }
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                    section.id === 'keluar'
                    ? 'text-error hover:bg-red-50 dark:hover:bg-red-950/20 cursor-pointer'
                    : activeSection === section.id 
                      ? 'bg-primary text-white dark:bg-[#a7c8ff] dark:text-[#001b3c] shadow-md shadow-primary/20 cursor-pointer' 
                      : 'text-on-surface-variant dark:text-outline hover:bg-surface-bright dark:hover:bg-white/5 cursor-pointer'
                  }`}
                >
                  <span className="material-symbols-outlined text-xl">{section.icon}</span>
                  {section.label}
                </button>
              ))}
            </nav>
          </div>
        </aside>

        {/* Content Area */}
        <main className="flex-1">
          <div className="bg-surface-container-lowest dark:bg-white/5 rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-10 border border-outline-variant/20 dark:border-white/10 shadow-sm min-h-[400px] sm:min-h-[600px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeSection}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {activeSection === 'profil' && (
                  <div className="space-y-5 sm:space-y-6 lg:space-y-8">
                    <div>
                      <h2 className="text-2xl font-bold text-on-surface dark:text-white mb-2">Profil Saya</h2>
                      <p className="text-on-surface-variant dark:text-outline text-sm">Kelola informasi pribadi dan foto profil Anda.</p>
                    </div>
                    
                    <div className="flex items-center gap-4 sm:gap-6 pb-5 sm:pb-8 border-b border-outline-variant/10 dark:border-white/5">
                      <div className="relative group">
                        <div className="w-24 h-24 rounded-full overflow-hidden bg-slate-200 dark:bg-white/10 border-2 border-primary/20 dark:border-white/20">
                          <img alt="Avatar" className="w-full h-full object-cover" src={`https://ui-avatars.com/api/?name=${encodeURIComponent(profileName)}&background=0D8ABC&color=fff&size=128`} />
                        </div>
                        <button className="absolute bottom-0 right-0 w-8 h-8 bg-primary dark:bg-[#a7c8ff] rounded-full flex items-center justify-center text-white dark:text-[#001b3c] shadow-lg hover:scale-110 transition-transform">
                          <span className="material-symbols-outlined text-sm">photo_camera</span>
                        </button>
                      </div>
                      <div>
                        <h4 className="font-bold text-on-surface dark:text-white">{profileName || 'Admin Demo'}</h4>
                        <p className="text-sm text-outline">{profileEmail || 'belum diatur'}</p>
                        <span className="mt-2 inline-block px-2 py-0.5 bg-tertiary-fixed dark:bg-tertiary-fixed/20 text-on-tertiary-fixed dark:text-tertiary-fixed text-[10px] font-bold rounded uppercase">VIP Member</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 lg:gap-6">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-outline uppercase ml-1">Nama Lengkap</label>
                        <input type="text" value={profileName} onChange={(e) => setProfileName(e.target.value)} className="w-full bg-surface-container dark:bg-white/5 border border-outline-variant/30 dark:border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors dark:text-white" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-outline uppercase ml-1">Email</label>
                        <input type="email" value={profileEmail} onChange={(e) => setProfileEmail(e.target.value)} placeholder="email@contoh.com" className="w-full bg-surface-container dark:bg-white/5 border border-outline-variant/30 dark:border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors dark:text-white" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-outline uppercase ml-1">Nomor Telepon</label>
                        <input type="tel" value={profilePhone} onChange={(e) => setProfilePhone(e.target.value)} placeholder="+62 812 3456 7890" className="w-full bg-surface-container dark:bg-white/5 border border-outline-variant/30 dark:border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors dark:text-white" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-outline uppercase ml-1">Pekerjaan</label>
                        <input type="text" value={profileJob} onChange={(e) => setProfileJob(e.target.value)} placeholder="Tech Entrepreneur" className="w-full bg-surface-container dark:bg-white/5 border border-outline-variant/30 dark:border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors dark:text-white" />
                      </div>
                    </div>
                  </div>
                )}

                {activeSection === 'keamanan' && (
                  <div className="space-y-5 sm:space-y-6 lg:space-y-8">
                    <div>
                      <h2 className="text-2xl font-bold text-on-surface dark:text-white mb-2">Keamanan</h2>
                      <p className="text-on-surface-variant dark:text-outline text-sm">Pastikan akun dan data finansial Anda tetap terlindungi.</p>
                    </div>

                    <div className="space-y-4">
                      <div 
                        onClick={() => {
                          setNewPasswordVal('');
                          setConfirmPasswordVal('');
                          setPasswordModalError('');
                          setShowPasswordModal(true);
                        }}
                        className="flex items-center justify-between p-4 bg-surface-container dark:bg-white/5 rounded-2xl border border-outline-variant/20 dark:border-white/10 hover:bg-surface-bright dark:hover:bg-white/[0.08] transition-colors cursor-pointer group"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-primary/10 dark:bg-[#a7c8ff]/20 flex items-center justify-center text-primary dark:text-[#a7c8ff]">
                            <span className="material-symbols-outlined">password</span>
                          </div>
                          <div>
                            <h4 className="font-bold text-sm dark:text-white">Ubah Password</h4>
                            <p className="text-xs text-outline">{getTimeAgo(lastPasswordUpdated)}</p>
                          </div>
                        </div>
                        <span className="material-symbols-outlined text-outline group-hover:translate-x-1 duration-200">chevron_right</span>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-surface-container dark:bg-white/5 rounded-2xl border border-outline-variant/20 dark:border-white/10">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-tertiary-fixed dark:bg-tertiary-fixed/20 flex items-center justify-center text-on-tertiary-fixed dark:text-tertiary-fixed">
                            <span className="material-symbols-outlined">vpn_key</span>
                          </div>
                          <div>
                            <h4 className="font-bold text-sm dark:text-white">PIN Transaksi</h4>
                            <p className="text-xs text-outline">Gunakan PIN untuk setiap transaksi keluar</p>
                          </div>
                        </div>
                        <div 
                          onClick={() => {
                            if (securitySettings.pinActive) {
                              setSecuritySettings(prev => ({ ...prev, pinActive: false }));
                              const updated = [...settings.filter(s => s.key !== 'security_pinActive' && s.key !== 'security_pin'), { key: 'security_pinActive', value: 'false' }];
                              updateSettings(updated);
                            } else {
                              setTemp2faToken('');
                              setShowSetupPin(true);
                            }
                          }}
                          className={`w-12 h-6 rounded-full relative p-1 cursor-pointer transition-colors duration-200 ${securitySettings.pinActive ? 'bg-primary dark:bg-[#a7c8ff]' : 'bg-outline-variant/30'}`}
                        >
                          <motion.div 
                            animate={{ x: securitySettings.pinActive ? 24 : 0 }}
                            className="w-4 h-4 bg-white dark:bg-[#001b3c] rounded-full"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-surface-container dark:bg-white/5 rounded-2xl border border-outline-variant/20 dark:border-white/10">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-secondary-container dark:bg-secondary-container/20 flex items-center justify-center text-on-secondary-container dark:text-[#a9c7ff]">
                            <span className="material-symbols-outlined">app_registration</span>
                          </div>
                          <div>
                            <h4 className="font-bold text-sm dark:text-white">Autentikasi Dua Faktor (2FA)</h4>
                            <p className="text-xs text-outline">Lapisan keamanan tambahan via aplikasi authenticator</p>
                          </div>
                        </div>
                        <div 
                          onClick={() => {
                            if (securitySettings.twoFactorActive) {
                              setSecuritySettings(prev => ({ ...prev, twoFactorActive: false }));
                              const updated = [...settings.filter(s => s.key !== 'security_twoFactorActive' && s.key !== 'security_2fa_secret'), { key: 'security_twoFactorActive', value: 'false' }];
                              updateSettings(updated);
                            } else {
                              // generate new secret and open modal
                              const newSecret = new OTPAuth.Secret({ size: 20 });
                              setTemp2faSecret(newSecret.base32);
                              setTemp2faToken('');
                              setTemp2faError(false);
                              setShowSetup2FA(true);
                            }
                          }}
                          className={`w-12 h-6 rounded-full relative p-1 cursor-pointer transition-colors duration-200 ${securitySettings.twoFactorActive ? 'bg-primary dark:bg-[#a7c8ff]' : 'bg-outline-variant/30'}`}
                        >
                          <motion.div 
                            animate={{ x: securitySettings.twoFactorActive ? 24 : 0 }}
                            className="w-4 h-4 bg-white dark:bg-[#001b3c] rounded-full"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="pt-8">
                       <h3 className="text-sm font-bold text-outline uppercase mb-4 ml-1">Sesi Aktif</h3>
                       <div className="space-y-4">
                         <div className="flex items-center justify-between px-2">
                           <div className="flex items-center gap-3">
                             <span className="material-symbols-outlined text-outline text-xl">{getDeviceInfo().icon}</span>
                             <div className="text-xs">
                               <p className="font-bold dark:text-white">{getDeviceInfo().label}</p>
                               <p className="text-outline">Sesi saat ini</p>
                             </div>
                           </div>
                           <span className="text-[10px] font-bold text-tertiary-container dark:text-tertiary-fixed bg-tertiary-fixed dark:bg-tertiary-fixed/20 px-2 py-0.5 rounded">Aktif</span>
                         </div>
                       </div>
                    </div>
                  </div>
                )}

                {activeSection === 'preferensi' && (
                  <div className="space-y-5 sm:space-y-6 lg:space-y-8">
                    <div>
                      <h2 className="text-2xl font-bold text-on-surface dark:text-white mb-2">Preferensi Aplikasi</h2>
                      <p className="text-on-surface-variant dark:text-outline text-sm">Sesuaikan tampilan dan mata uang sistem.</p>
                    </div>

                    {/* F3.3 Kurs USD/IDR — untuk aset/akun berdenominasi USD */}
                    <div className="p-5 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/5 space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-500/10 dark:bg-emerald-400/15 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                          <span className="material-symbols-outlined">currency_exchange</span>
                        </div>
                        <div>
                          <h4 className="font-bold text-sm dark:text-white">Kurs USD → IDR</h4>
                          <p className="text-xs text-outline">Dipakai mengkonversi aset/akun USD (mis. VTI, SPY) ke net worth IDR.</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-outline uppercase ml-1">Kurs 1 USD (Rp)</label>
                          <div className="flex items-center gap-2 bg-surface-container dark:bg-white/5 border border-outline-variant/30 dark:border-white/10 rounded-xl px-4 py-3 focus-within:border-primary">
                            <span className="text-xs font-bold text-outline">Rp</span>
                            <input
                              type="text" inputMode="numeric"
                              value={(Number(String(usdRate).replace(/[^0-9.]/g, '')) || 0).toLocaleString('id-ID')}
                              onChange={(e) => setUsdRate(e.target.value.replace(/[^0-9]/g, ''))}
                              className="w-full bg-transparent border-none p-0 text-sm font-bold dark:text-white tabular-nums focus:outline-none focus:ring-0"
                            />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-outline uppercase ml-1">Ticker USD (pisahkan koma)</label>
                          <input
                            type="text"
                            value={usdTickers}
                            onChange={(e) => setUsdTickers(e.target.value.toUpperCase())}
                            placeholder="VTI,SPY,VOO,QQQ"
                            className="w-full bg-surface-container dark:bg-white/5 border border-outline-variant/30 dark:border-white/10 rounded-xl px-4 py-3 text-sm font-mono dark:text-white focus:outline-none focus:border-primary"
                          />
                        </div>
                      </div>
                      <p className="text-[11px] text-outline ml-1">
                        Aset dianggap USD bila ticker terdaftar di atas, atau catatan/lokasinya memuat tag <code className="font-mono bg-black/5 dark:bg-white/10 px-1 rounded">[USD]</code>. Simpan lewat tombol di bawah. (Di template Google, kurs bisa otomatis via <code className="font-mono bg-black/5 dark:bg-white/10 px-1 rounded">GOOGLEFINANCE</code>.)
                      </p>
                    </div>

                    <div className="space-y-6">
                      <div className="p-5 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <span className="text-xs font-bold text-outline uppercase">Status Database</span>
                          <div className="flex items-center gap-2 mt-1">
                            {user?.sheetUrl ? (
                              <>
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                                <span className="text-sm font-bold text-slate-800 dark:text-slate-200">Tersambung ke Google Sheets Pribadi</span>
                              </>
                            ) : (
                              <>
                                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
                                <span className="text-sm font-bold text-slate-800 dark:text-slate-200">Menggunakan Database Demo Publik</span>
                              </>
                            )}
                          </div>
                          <p className="text-xs text-outline">Semua data transaksi akan disinkronisasikan ke akun Google Anda.</p>
                        </div>
                        <button
                          onClick={() => setShowSetupWizard(true)}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow transition-all cursor-pointer shrink-0"
                        >
                          {user?.sheetUrl ? 'Lihat Panduan Integrasi' : 'Hubungkan Spreadsheet Anda'}
                        </button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 border-b border-outline-variant/10 dark:border-white/5">
                        <div className="space-y-2 md:col-span-2">
                          <label className="text-xs font-bold text-outline uppercase ml-1">Tautan / ID Google Spreadsheet Anda</label>
                          <input 
                            type="text" 
                            value={spreadsheetId ? `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit` : ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              let newId = val;
                              if (val.includes('/d/')) {
                                const match = val.match(/\/[d]\/([a-zA-Z0-9-_]+)/);
                                if (match) newId = match[1];
                              }
                              setSpreadsheetId(newId);
                            }}
                            placeholder="https://docs.google.com/spreadsheets/d/.../edit"
                            className="w-full bg-surface-container dark:bg-white/5 border border-outline-variant/30 dark:border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors dark:text-white font-mono text-xs" 
                          />
                          <p className="text-xs text-outline ml-1 mt-1 font-medium">
                            Link Google Sheets database pribadi Anda. Diperlukan untuk sinkronisasi langsung menggunakan Google API.
                          </p>
                        </div>

                        <div className="space-y-2 md:col-span-2">
                          <label className="text-xs font-bold text-outline uppercase ml-1">Google Sheets Web App URL</label>
                          <input 
                            type="url" 
                            value={googleSheetUrl}
                            onChange={(e) => setGoogleSheetUrl(e.target.value)}
                            placeholder="https://script.google.com/macros/s/.../exec"
                            className="w-full bg-surface-container dark:bg-white/5 border border-outline-variant/30 dark:border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors dark:text-white font-mono text-xs" 
                          />
                          <p className="text-xs text-outline ml-1 mt-1">
                            URL Script Web App dari spreadsheet Anda. Diperlukan untuk fallback sinkronisasi makro jika token habis atau tanpa login.
                          </p>
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-outline uppercase ml-1">Mata Uang Utama</label>
                          <select 
                            value={currency}
                            onChange={(e) => setCurrency(e.target.value)}
                            className="w-full bg-surface-container dark:bg-white/5 border border-outline-variant/30 dark:border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary appearance-none cursor-pointer dark:text-white"
                          >
                            <option value="IDR">Rupiah (IDR)</option>
                            <option value="USD">US Dollar (USD)</option>
                            <option value="SGD">Singapore Dollar (SGD)</option>
                            <option value="EUR">Euro (EUR)</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-outline uppercase ml-1">Bahasa</label>
                          <select 
                            value={language}
                            onChange={(e) => setLanguage(e.target.value)}
                            className="w-full bg-surface-container dark:bg-white/5 border border-outline-variant/30 dark:border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary appearance-none cursor-pointer dark:text-white"
                          >
                            <option value="Bahasa Indonesia">Bahasa Indonesia</option>
                            <option value="English">English</option>
                          </select>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h3 className="text-sm font-bold text-outline uppercase ml-1">Format Data</h3>
                        <div className="flex items-center justify-between p-4 bg-surface-container dark:bg-white/5 rounded-2xl border border-outline-variant/20 dark:border-white/10">
                          <span className="text-sm font-medium dark:text-white">Format Tanggal</span>
                          <span className="text-xs text-outline font-bold">DD MMM YYYY (20 Okt 2026)</span>
                        </div>
                        <div className="flex items-center justify-between p-4 bg-surface-container dark:bg-white/5 rounded-2xl border border-outline-variant/20 dark:border-white/10">
                          <span className="text-sm font-medium dark:text-white">Pemisah Ribuan</span>
                          <span className="text-xs text-outline font-bold">Titik (.)</span>
                        </div>
                      </div>
                      
                      <div className="space-y-4 pt-4 border-t border-outline-variant/10 dark:border-white/5">
                        <h3 className="text-sm font-bold text-outline uppercase ml-1">Ekspor & Impor Data (Lokal)</h3>
                        <p className="text-xs text-outline ml-1 mb-2">Backup atau kembalikan seluruh data DompetKu dalam format JSON lokal Anda.</p>
                        <div className="flex gap-4">
                          <button 
                            onClick={() => {
                              const state = useFinanceStore.getState();
                              const backup = {
                                transactions: state.transactions,
                                accounts: state.accounts,
                                assets: state.assets,
                                budgetCategories: state.budgetCategories,
                                debts: state.debts,
                                settings: state.settings,
                                monthlyBudgets: state.monthlyBudgets
                              };
                              const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
                              const url = URL.createObjectURL(blob);
                              const link = document.createElement("a");
                              link.href = url;
                              link.download = `dompetku_backup_${new Date().toISOString().slice(0, 10)}.json`;
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                            }}
                            className="flex-1 px-4 py-3 bg-surface-container dark:bg-white/10 text-on-surface-variant dark:text-outline rounded-xl font-bold text-xs hover:bg-surface-bright dark:hover:bg-white/20 transition-all border border-outline-variant/20 dark:border-white/10 flex justify-center items-center gap-2 cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-sm">download</span> Ekspor JSON
                          </button>
                          
                          <label className="flex-1 px-4 py-3 bg-surface-container dark:bg-white/10 text-on-surface-variant dark:text-outline rounded-xl font-bold text-xs hover:bg-surface-bright dark:hover:bg-white/20 transition-all border border-outline-variant/20 dark:border-white/10 flex justify-center items-center gap-2 cursor-pointer">
                            <span className="material-symbols-outlined text-sm">upload</span> Impor JSON
                            <input 
                              type="file" 
                              accept=".json"
                              className="hidden" 
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                const reader = new FileReader();
                                reader.onload = (event) => {
                                  try {
                                    const data = JSON.parse(event.target?.result as string);
                                    if (data.transactions || data.accounts) {
                                      useFinanceStore.setState({
                                        transactions: data.transactions || [],
                                        accounts: data.accounts || [],
                                        assets: data.assets || [],
                                        budgetCategories: data.budgetCategories || [],
                                        debts: data.debts || [],
                                        settings: data.settings || [],
                                        monthlyBudgets: data.monthlyBudgets || {}
                                      });
                                      alert('Data berhasil diimpor!');
                                    } else {
                                      alert('Format JSON tidak valid.');
                                    }
                                  } catch (err) {
                                    alert('Gagal membaca file JSON.');
                                  }
                                };
                                reader.readAsText(file);
                                e.target.value = ''; // reset input
                              }} 
                            />
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeSection === 'notifikasi' && (
                  <div className="space-y-5 sm:space-y-6 lg:space-y-8">
                    <div>
                      <h2 className="text-2xl font-bold text-on-surface dark:text-white mb-2">Notifikasi</h2>
                      <p className="text-on-surface-variant dark:text-outline text-sm">Atur pesan dan alert apa saja yang ingin Anda terima.</p>
                    </div>

                    <div className="space-y-4">
                      {[
                        { id: 'budgetAlert', label: 'Alert Anggaran', desc: 'Dapatkan pemberitahuan saat pengeluaran mendekati limit.' },
                        { id: 'billReminder', label: 'Pengingat Tagihan', desc: 'Reminder otomatis untuk tagihan rutin Anda.' },
                        { id: 'security', label: 'Keamanan Akun', desc: 'Notifikasi untuk login baru atau perubahan password.' },
                        { id: 'marketing', label: 'Informasi & Promo', desc: 'Tips finansial dan penawaran eksklusif.' },
                      ].map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-4 sm:p-5 lg:p-6 bg-surface-container dark:bg-white/5 rounded-2xl border border-outline-variant/20 dark:border-white/10 shadow-sm">
                          <div className="pr-4">
                            <h4 className="font-bold text-sm dark:text-white mb-1">{item.label}</h4>
                            <p className="text-xs text-outline">{item.desc}</p>
                          </div>
                          <div 
                            onClick={() => setNotifications(prev => ({ ...prev, [item.id]: !prev[item.id as keyof typeof prev] }))}
                            className={`w-12 h-6 rounded-full relative p-1 cursor-pointer transition-colors duration-200 ${notifications[item.id as keyof typeof notifications] ? 'bg-primary dark:bg-[#a7c8ff]' : 'bg-outline-variant/30'}`}
                          >
                            <motion.div 
                              animate={{ x: notifications[item.id as keyof typeof notifications] ? 24 : 0 }}
                              className="w-4 h-4 bg-white dark:bg-[#001b3c] rounded-full"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
            
            <div className="mt-12 pt-8 border-t border-outline-variant/10 dark:border-white/5 flex gap-4 items-center">
              <button 
                onClick={() => handleSave()}
                disabled={isSaving}
                className="px-8 py-3 bg-primary dark:bg-[#a7c8ff] text-white dark:text-[#001b3c] rounded-xl font-bold text-sm shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-75 flex items-center gap-2"
              >
                {isSaving ? (
                  <>
                    <span className="animate-spin rounded-full h-4 w-4 border-2 border-white dark:border-[#001b3c] border-t-transparent"></span>
                    Menyimpan...
                  </>
                ) : 'Simpan Perubahan'}
              </button>
              <button onClick={onBack} className="px-8 py-3 bg-surface-container dark:bg-white/10 text-on-surface-variant dark:text-outline rounded-xl font-bold text-sm hover:bg-surface-bright dark:hover:bg-white/20 transition-all border border-outline-variant/20 dark:border-white/10">Batalkan</button>
              {saveSuccess && (
                <motion.span 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-tertiary-container dark:text-tertiary-fixed text-sm font-bold flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  Tersimpan & ter-sync ke database!
                </motion.span>
              )}
            </div>
          </div>
        </main>
      </div>
      
      {/* Onboarding Wizard Modal */}
      <AnimatePresence>
        {showSetupWizard && (
          <FinanceOnboardingModal onClose={() => setShowSetupWizard(false)} />
        )}
      </AnimatePresence>

      {/* Apple Glassmorphism Change Password Modal */}
      <AnimatePresence>
        {showPasswordModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", stiffness: 350, damping: 25 }}
              className="w-full max-w-md bg-white/80 dark:bg-[#0d1527]/80 backdrop-blur-xl border border-white/40 dark:border-white/10 rounded-[28px] p-8 shadow-2xl relative overflow-hidden"
            >
              {/* Blur elements behind card for extra glow */}
              <div className="absolute top-[-30%] left-[-20%] w-64 h-64 rounded-full bg-blue-500/15 blur-3xl pointer-events-none" />
              <div className="absolute bottom-[-30%] right-[-20%] w-64 h-64 rounded-full bg-cyan-500/15 blur-3xl pointer-events-none" />

              <div className="relative z-10 space-y-6">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <h3 className="text-xl font-black font-headline text-slate-900 dark:text-white">Ubah Kata Sandi</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Ganti password akun Anda untuk keamanan tambahan.</p>
                  </div>
                  <button 
                    onClick={() => setShowPasswordModal(false)}
                    className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-200/50 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 transition-colors"
                  >
                    <span className="material-symbols-outlined text-sm font-bold">close</span>
                  </button>
                </div>

                {passwordModalError && (
                  <div className="p-3.5 text-xs bg-red-500/10 dark:bg-red-500/20 text-red-600 dark:text-red-400 rounded-2xl border border-red-500/20 flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm font-bold">warning</span>
                    <span>{passwordModalError}</span>
                  </div>
                )}

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">Password Baru</label>
                    <div className="relative">
                      <input 
                        type={showPasswordVisibility ? "text" : "password"} 
                        value={newPasswordVal}
                        onChange={e => setNewPasswordVal(e.target.value)}
                        placeholder="Minimal 6 karakter"
                        className="w-full bg-slate-100/50 dark:bg-white/5 border border-slate-200/50 dark:border-white/10 rounded-2xl px-4 py-3.5 pr-12 text-sm focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 transition-colors dark:text-white"
                      />
                      <button 
                        type="button"
                        onClick={() => setShowPasswordVisibility(!showPasswordVisibility)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                      >
                        <span className="material-symbols-outlined text-lg">{showPasswordVisibility ? 'visibility_off' : 'visibility'}</span>
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">Konfirmasi Password Baru</label>
                    <div className="relative">
                      <input 
                        type={showPasswordVisibility ? "text" : "password"} 
                        value={confirmPasswordVal}
                        onChange={e => setConfirmPasswordVal(e.target.value)}
                        placeholder="Masukkan ulang password"
                        className="w-full bg-slate-100/50 dark:bg-white/5 border border-slate-200/50 dark:border-white/10 rounded-2xl px-4 py-3.5 pr-12 text-sm focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 transition-colors dark:text-white"
                      />
                      <button 
                        type="button"
                        onClick={() => setShowPasswordVisibility(!showPasswordVisibility)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                      >
                        <span className="material-symbols-outlined text-lg">{showPasswordVisibility ? 'visibility_off' : 'visibility'}</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button 
                    onClick={() => setShowPasswordModal(false)}
                    className="flex-1 py-3.5 bg-slate-200/60 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-700 dark:text-slate-300 font-bold text-sm rounded-2xl transition-all cursor-pointer"
                  >
                    Batal
                  </button>
                  <button 
                    onClick={() => {
                      setPasswordModalError('');
                      if (newPasswordVal.trim().length < 6) {
                        setPasswordModalError('Kata sandi baru minimal harus 6 karakter.');
                        return;
                      }
                      if (newPasswordVal !== confirmPasswordVal) {
                        setPasswordModalError('Konfirmasi kata sandi tidak cocok.');
                        return;
                      }
                      
                      const newPass = newPasswordVal.trim();
                      setProfilePassword(newPass);
                      setShowPasswordModal(false);
                      setPasswordSuccessModal(true);
                      
                      // Auto trigger handleSave to immediately sync to spreadsheet
                      handleSave(newPass);
                    }}
                    className="flex-1 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-2xl shadow-md shadow-blue-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
                  >
                    Simpan
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Apple Glassmorphism Success Modal */}
      <AnimatePresence>
        {passwordSuccessModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              className="w-full max-w-sm bg-white/90 dark:bg-[#0d1527]/90 backdrop-blur-xl border border-white/50 dark:border-white/10 rounded-[28px] p-8 shadow-2xl relative overflow-hidden flex flex-col items-center text-center"
            >
              <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden rounded-[28px]">
                <div className="absolute top-[-50%] left-[-20%] w-full h-full bg-emerald-500/10 blur-3xl rounded-full" />
                <div className="absolute bottom-[-50%] right-[-20%] w-full h-full bg-teal-500/10 blur-3xl rounded-full" />
              </div>
              
              <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mb-6 relative z-10">
                <span className="material-symbols-outlined text-3xl font-bold">check_circle</span>
              </div>
              
              <h3 className="text-xl font-black font-headline text-slate-900 dark:text-white mb-2 relative z-10">Berhasil!</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 relative z-10">
                Password Anda telah berhasil diubah dan disinkronisasikan ke Spreadsheet.
              </p>
              
              <button 
                onClick={() => setPasswordSuccessModal(false)}
                className="w-full py-3.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-sm rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer relative z-10"
              >
                Tutup
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 2FA Setup Modal */}
      <AnimatePresence>
        {showSetup2FA && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowSetup2FA(false)} />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative w-full max-w-md bg-surface-container-lowest dark:bg-[#0b1221] p-8 rounded-[32px] border border-white/20 shadow-2xl flex flex-col items-center text-center">
              <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Setup 2-Factor Authentication</h2>
              <p className="text-sm text-outline mb-6">Scan QR Code ini menggunakan aplikasi Google Authenticator atau Authy Anda.</p>
              
              <div className="bg-white p-4 rounded-2xl mb-6 inline-block">
                <QRCodeSVG value={`otpauth://totp/DompetKu:${profileEmail}?secret=${temp2faSecret}&issuer=DompetKu`} size={200} />
              </div>
              <p className="font-mono text-xs text-outline mb-6 tracking-widest">{temp2faSecret}</p>

              <div className="w-full space-y-4">
                <input type="text" maxLength={6} placeholder="000000" className="w-full text-center tracking-[0.5em] text-2xl font-mono py-3 bg-surface-container dark:bg-white/5 border border-outline-variant/30 dark:border-white/10 rounded-xl focus:outline-none focus:border-primary dark:text-white" value={temp2faToken} onChange={(e) => { setTemp2faToken(e.target.value.replace(/\D/g, '')); setTemp2faError(false); }} />
                {temp2faError && <p className="text-red-500 text-xs text-center">Kode tidak valid</p>}
                
                <button 
                  onClick={() => {
                    let totp = new OTPAuth.TOTP({ issuer: "DompetKu", label: profileEmail, algorithm: "SHA1", digits: 6, period: 30, secret: OTPAuth.Secret.fromBase32(temp2faSecret) });
                    if (totp.validate({ token: temp2faToken, window: 1 }) !== null) {
                      setSecuritySettings(prev => ({ ...prev, twoFactorActive: true }));
                      updateSettings([...settings.filter(s => s.key !== 'security_twoFactorActive' && s.key !== 'security_2fa_secret'), { key: 'security_twoFactorActive', value: 'true' }, { key: 'security_2fa_secret', value: temp2faSecret }]);
                      useFinanceStore.getState().setIsAuthenticated2FA(true); // Prevent locking the user out
                      setShowSetup2FA(false);
                      setSaveSuccess(true);
                      setTimeout(() => setSaveSuccess(false), 2000);
                    } else {
                      setTemp2faError(true);
                    }
                  }}
                  className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-3 rounded-xl shadow transition-all"
                >
                  Verifikasi & Aktifkan
                </button>
                <button onClick={() => setShowSetup2FA(false)} className="w-full text-outline text-sm font-bold mt-2">Batal</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Setup PIN */}
      <AnimatePresence>
        {showSetupPin && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowSetupPin(false)} />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative w-full max-w-sm bg-surface-container-lowest dark:bg-[#0b1221] p-8 rounded-[32px] border border-white/20 shadow-2xl flex flex-col items-center">
              <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2 text-center">Buat PIN Baru</h2>
              <p className="text-sm text-outline mb-6 text-center">Masukkan 6 digit angka untuk mengamankan transaksi Anda.</p>
              
              <input 
                type="password" 
                maxLength={6} 
                placeholder="••••••" 
                className="w-full text-center tracking-[0.5em] text-3xl font-mono py-4 bg-surface-container dark:bg-white/5 border border-outline-variant/30 dark:border-white/10 rounded-2xl focus:outline-none focus:border-primary dark:text-white mb-6" 
                value={temp2faToken} // Reusing token variable for PIN
                onChange={(e) => setTemp2faToken(e.target.value.replace(/\D/g, ''))} 
              />
              
              <button 
                onClick={() => {
                  if (temp2faToken.length === 6) {
                    setSecuritySettings(prev => ({ ...prev, pinActive: true }));
                    updateSettings([...settings.filter(s => s.key !== 'security_pinActive' && s.key !== 'security_pin'), { key: 'security_pinActive', value: 'true' }, { key: 'security_pin', value: temp2faToken }]);
                    setShowSetupPin(false);
                    setTemp2faToken('');
                    setSaveSuccess(true);
                    setTimeout(() => setSaveSuccess(false), 2000);
                  }
                }}
                disabled={temp2faToken.length !== 6}
                className="w-full bg-primary disabled:bg-primary/50 hover:bg-primary-dark text-white font-bold py-4 rounded-2xl shadow transition-all mb-3"
              >
                Simpan PIN
              </button>
              <button onClick={() => setShowSetupPin(false)} className="w-full text-outline text-sm font-bold mt-2">Batal</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default FinanceSettings;
