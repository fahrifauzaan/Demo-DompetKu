import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import * as OTPAuth from 'otpauth';

interface Finance2FAOverlayProps {
  isOpen: boolean;
  secret: string; // The base32 secret key stored in settings
  onSuccess: () => void;
  onLogout: () => void;
}

const Finance2FAOverlay: React.FC<Finance2FAOverlayProps> = ({ isOpen, secret, onSuccess, onLogout }) => {
  const [token, setToken] = useState('');
  const [error, setError] = useState(false);

  const handleVerify = () => {
    if (!token || token.length < 6 || !secret) {
      setError(true);
      return;
    }

    try {
      let totp = new OTPAuth.TOTP({
        issuer: "DompetKu",
        label: "Secure",
        algorithm: "SHA1",
        digits: 6,
        period: 30,
        secret: OTPAuth.Secret.fromBase32(secret)
      });

      let delta = totp.validate({ token, window: 1 });
      if (delta !== null) {
        // success
        setError(false);
        setToken('');
        onSuccess();
      } else {
        setError(true);
      }
    } catch (e) {
      setError(true);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] bg-surface-container dark:bg-[#000a1a] flex flex-col items-center justify-center p-4 sm:p-6 overflow-y-auto"
        >
          {/* Logo / Brand */}
          <div className="absolute top-4 sm:top-8 left-4 sm:left-8 flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-primary/10 rounded-2xl flex items-center justify-center text-primary relative overflow-hidden group">
              <span className="material-symbols-outlined text-xl sm:text-2xl relative z-10 group-hover:scale-110 transition-transform duration-300">account_balance_wallet</span>
            </div>
            <span className="font-headline font-black text-lg sm:text-xl tracking-tight text-slate-800 dark:text-white">DompetKu</span>
          </div>

          <div className="w-full max-w-md bg-white dark:bg-white/5 p-5 sm:p-6 lg:p-8 rounded-2xl sm:rounded-[28px] lg:rounded-[32px] shadow-2xl border border-outline-variant/20 dark:border-white/10 flex flex-col items-center mt-16 sm:mt-0">
            <div className="w-20 h-20 rounded-full bg-primary/10 text-primary dark:bg-blue-500/20 dark:text-blue-400 flex items-center justify-center mb-6">
              <span className="material-symbols-outlined text-4xl">verified_user</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-2 text-center">Autentikasi Dua Faktor</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 text-center mb-8">
              Masukkan 6 digit kode token dari aplikasi Authenticator (Google Authenticator / Authy) Anda.
            </p>

            <div className="w-full space-y-4">
              <div>
                <input 
                  type="text" 
                  maxLength={6}
                  value={token}
                  onChange={(e) => {
                    setToken(e.target.value.replace(/\\D/g, ''));
                    setError(false);
                  }}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleVerify(); }}
                  placeholder="000000"
                  className={`w-full text-center tracking-[0.5em] text-3xl font-mono py-4 bg-slate-50 dark:bg-[#0b1221] border ${error ? 'border-red-500' : 'border-outline-variant/30 dark:border-white/10'} rounded-2xl focus:outline-none focus:border-primary dark:text-white transition-colors`}
                />
                {error && <p className="text-red-500 text-xs text-center mt-2 animate-pulse">Kode tidak valid atau kadaluarsa.</p>}
              </div>

              <button 
                onClick={handleVerify}
                className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-4 rounded-2xl shadow-lg transition-all active:scale-[0.98]"
              >
                Verifikasi
              </button>
            </div>
          </div>

          <button 
            onClick={onLogout}
            className="absolute bottom-8 flex items-center gap-2 text-slate-500 hover:text-red-500 transition-colors"
          >
            <span className="material-symbols-outlined text-sm">logout</span>
            <span className="text-sm font-bold">Keluar Akun</span>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Finance2FAOverlay;
