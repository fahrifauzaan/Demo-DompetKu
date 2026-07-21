import React, { useState, useEffect } from 'react';
import FinanceDemo from './FinanceDemo';
import FinanceLogin from './finance-components/FinanceLogin';
import { useAuthStore } from './store/useAuthStore';
import { useFinanceStore } from './store/useFinanceStore';
import Finance2FAOverlay from './finance-components/Finance2FAOverlay';

// Domain resmi baru DompetKu (di-host di Hostinger).
const NEW_APP_URL = 'https://dompetku.bantu-umkm.tech';

/**
 * Banner "pindah domain" — HANYA tampil di URL Vercel lama (bukan demo, bukan domain baru),
 * memberi tahu pengguna lama bahwa DompetKu telah pindah ke domain resmi.
 */
const MovedBanner: React.FC = () => {
  const host = typeof window !== 'undefined' ? window.location.hostname : '';
  const isLegacyVercel = host.includes('vercel.app') && !host.includes('demo');
  if (!isLegacyVercel) return null;
  return (
    <div className="fixed bottom-0 inset-x-0 z-[300] no-print bg-amber-500 text-slate-900 shadow-[0_-4px_20px_rgba(0,0,0,0.18)]">
      <div className="max-w-5xl mx-auto px-4 py-2.5 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-center">
        <span className="material-symbols-outlined text-xl">campaign</span>
        <span className="text-sm font-semibold">
          DompetKu kini pindah ke domain resmi: <b>dompetku.bantu-umkm.tech</b>
        </span>
        <a
          href={NEW_APP_URL}
          className="px-4 py-1.5 rounded-lg bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 transition-colors whitespace-nowrap"
        >
          Beralih Sekarang →
        </a>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const user = useAuthStore(state => state.user);
  const logout = useAuthStore(state => state.logout);
  const settings = useFinanceStore(state => state.settings);
  const isAuthenticated2FA = useFinanceStore(state => state.isAuthenticated2FA);
  const setIsAuthenticated2FA = useFinanceStore(state => state.setIsAuthenticated2FA);

  const is2FAActive = settings.find(s => s.key === 'security_twoFactorActive')?.value === 'true';
  const secret2FA = settings.find(s => s.key === 'security_2fa_secret')?.value || '';
  const [isDark, setIsDark] = useState<boolean>(() => {
    const saved = localStorage.getItem('nam_wealth_dark_mode');
    if (saved) return saved === 'true';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    localStorage.setItem('nam_wealth_dark_mode', String(isDark));
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  const toggleDark = () => setIsDark(prev => !prev);


  if (!user) {
    return (
      <>
        <FinanceLogin />
        <MovedBanner />
      </>
    );
  }

  return (
    <>
      <MovedBanner />
      <FinanceDemo
        isDark={isDark}
        toggleDark={toggleDark}
      />
      <Finance2FAOverlay 
        isOpen={user !== null && is2FAActive && !isAuthenticated2FA} 
        secret={secret2FA} 
        onSuccess={() => setIsAuthenticated2FA(true)}
        onLogout={() => {
          logout();
          setIsAuthenticated2FA(false);
        }}
      />
    </>
  );
};

export default App;
