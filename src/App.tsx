import React, { useState, useEffect } from 'react';
import FinanceDemo from './FinanceDemo';
import FinanceLogin from './finance-components/FinanceLogin';
import { useAuthStore } from './store/useAuthStore';
import { useFinanceStore } from './store/useFinanceStore';
import Finance2FAOverlay from './finance-components/Finance2FAOverlay';

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
    return <FinanceLogin />;
  }

  return (
    <>
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
