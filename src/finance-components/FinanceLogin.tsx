import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuthStore } from '../store/useAuthStore';
import { useGoogleLogin } from '@react-oauth/google';
import { copyTemplateSpreadsheet } from '../services/googleApiService';
import { useFinanceStore } from '../store/useFinanceStore';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

const FinanceLogin: React.FC = () => {
  // Store actions & states
  const login = useAuthStore(state => state.login);
  const loginWithGoogle = useAuthStore(state => state.loginWithGoogle);
  const signup = useAuthStore(state => state.signup);
  const registeredUsers = useAuthStore(state => state.registeredUsers);
  const setGoogleCredentials = useFinanceStore(state => state.setGoogleCredentials);

  // Detect if we are on the demo domain
  const isDemoDomain = typeof window !== 'undefined' && (window.location.hostname === 'demo-dompetku.vercel.app' || window.location.hostname === 'demo.bantu-umkm.tech');

  // Direct login for demo mode on demo website
  const handleDirectDemoLogin = () => {
    const email = import.meta.env.VITE_DEMO_EMAIL || 'demo@dompetku.com';
    const password = 'password123';
    
    showToast('Masuk ke Mode Demo...', 'info');
    
    const result = login(email, password);
    if (!result.success) {
      // Register demo user on the fly if not exists
      const photoURL = `https://ui-avatars.com/api/?name=Demo+Admin&background=0D8ABC&color=fff`;
      signup(email, password, 'Demo Admin', photoURL);
      const retryResult = login(email, password);
      if (retryResult.success) {
        showToast('Berhasil masuk ke Mode Demo!', 'success');
      } else {
        showToast(retryResult.error || 'Gagal masuk ke Mode Demo.', 'error');
      }
    } else {
      showToast('Berhasil masuk ke Mode Demo!', 'success');
    }
  };

  // UI States
  const [mode, setMode] = useState<'login' | 'signup_email' | 'signup_otp' | 'signup_password'>('login');
  const [showLupaPasswordModal, setShowLupaPasswordModal] = useState(false);
  const [showPasswordVisibility, setShowPasswordVisibility] = useState(false);
  
  // Login Form States
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Sign Up Form States
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpName, setSignUpName] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [signUpConfirmPassword, setSignUpConfirmPassword] = useState('');
  const [signUpError, setSignUpError] = useState('');
  
  // OTP States
  const [otpCode, setOtpCode] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [otpTimer, setOtpTimer] = useState(60);
  
  // Toasts
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Setup Modal States
  const [pendingSetup, setPendingSetup] = useState<{
    type: 'buyer' | 'demo';
    token?: string;
    userInfo?: any;
    demoEmail?: string;
    demoName?: string;
  } | null>(null);
  const [isCopying, setIsCopying] = useState(false);


  // Show Toast Helper
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 8000);
  };

  // Timer for OTP
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (mode === 'signup_otp' && otpTimer > 0) {
      interval = setInterval(() => {
        setOtpTimer(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [mode, otpTimer]);

  // Handle Login
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    if (!loginEmail || !loginPassword) {
      setLoginError('Silakan isi email dan password.');
      return;
    }

    const result = login(loginEmail, loginPassword);
    if (!result.success) {
      setLoginError(result.error || 'Terjadi kesalahan saat masuk.');
      showToast(result.error || 'Gagal masuk.', 'error');
    } else {
      showToast('Berhasil masuk! Selamat datang kembali.', 'success');
    }
  };

  // Google OAuth Login Flow
  const handleGoogleLogin = useGoogleLogin({
    scope: 'https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/spreadsheets',
    onSuccess: async (tokenResponse) => {
      try {
        // 0. Validate Scope
        const grantedScopes = tokenResponse.scope || '';
        const hasSheetsScope = grantedScopes.includes('https://www.googleapis.com/auth/spreadsheets') || grantedScopes.includes('https://www.googleapis.com/auth/drive');
        
        if (!hasSheetsScope) {
          showToast('Akses Ditolak: Anda harus mencentang kotak izin akses Google Sheets saat login.', 'error');
          return;
        }

        showToast('Berhasil otorisasi Google. Memverifikasi...', 'info');
        
        // 1. Fetch user info
        const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
        });
        const userInfo = await userInfoRes.json();
        
        // 2. Verify License via Apps Script
        const verifyUrl = import.meta.env.VITE_LICENSE_VERIFICATION_URL;
        if (verifyUrl) {
          showToast('Memverifikasi lisensi pengguna...', 'info');
          const verifyRes = await fetch(`${verifyUrl}?action=verifyEmail&email=${encodeURIComponent(userInfo.email)}`);
          const verifyData = await verifyRes.json();
          
          if (!verifyData.isAuthorized) {
            showToast(verifyData.message || 'Email Anda belum terdaftar sebagai pembeli.', 'error');
            return; // Stop login process
          }
        }
        
        // 3. Retrieve saved details if any
        let sheetId = '';
        const existingUser = registeredUsers.find(u => u.email.toLowerCase() === userInfo.email.toLowerCase());
        if (existingUser && existingUser.spreadsheetId) {
          sheetId = existingUser.spreadsheetId;
        }

        // Set credentials in the store
        setGoogleCredentials(tokenResponse.access_token, sheetId);
        
        const password = 'google-oauth-password';
        const exists = registeredUsers.some(u => u.email.toLowerCase() === userInfo.email.toLowerCase());
        
        if (exists) {
          loginWithGoogle(userInfo.email);
        } else {
          // New user signup starts with empty spreadsheetId and sheetUrl (blank slate)
          signup(userInfo.email, password, userInfo.name, userInfo.picture, '', '');
        }
        showToast('Berhasil masuk dengan Akun Google!', 'success');
      } catch (err) {
        showToast('Terjadi kesalahan saat otorisasi Google.', 'error');
        console.error(err);
      }
    },
    onError: () => {
      showToast('Otorisasi Google gagal atau dibatalkan.', 'error');
    }
  });

  // Confirm Setup for Buyer
  const handleConfirmBuyerSetup = async () => {
    if (!pendingSetup || pendingSetup.type !== 'buyer') return;
    setIsCopying(true);
    try {
      showToast('Menyalin template Spreadsheet ke Google Drive Anda...', 'info');
      const templateId = import.meta.env.VITE_TEMPLATE_SPREADSHEET_ID;
      if (!templateId) {
        showToast('Template Spreadsheet ID tidak ditemukan di konfigurasi.', 'error');
        setIsCopying(false);
        return;
      }
      const sheetId = await copyTemplateSpreadsheet(pendingSetup.token!, templateId);
      if (!sheetId) {
        showToast('Gagal menyalin template. Pastikan izin Drive diberikan.', 'error');
        setIsCopying(false);
        return;
      }
      showToast('Berhasil menyiapkan sesi. Masuk otomatis...', 'success');
      setGoogleCredentials(pendingSetup.token!, sheetId);
      
      const password = 'google-oauth-password';
      const exists = registeredUsers.some(u => u.email.toLowerCase() === pendingSetup.userInfo.email.toLowerCase());
      if (exists) {
        loginWithGoogle(pendingSetup.userInfo.email);
      } else {
        signup(pendingSetup.userInfo.email, password, pendingSetup.userInfo.name, pendingSetup.userInfo.picture, undefined, sheetId);
      }
      setPendingSetup(null);
    } catch (err) {
      showToast('Terjadi kesalahan saat menyalin template.', 'error');
      console.error(err);
    } finally {
      setIsCopying(false);
    }
  };

  // Confirm Setup for Demo
  const handleConfirmDemoSetup = () => {
    if (!pendingSetup || pendingSetup.type !== 'demo') return;
    triggerSignUpFlow(pendingSetup.demoEmail!, pendingSetup.demoName!);
    setPendingSetup(null);
  };

  // Trigger Sign Up flow & generate simulated OTP
  const triggerSignUpFlow = (email: string, name: string) => {
    if (!email || !name) {
      setSignUpError('Silakan pilih atau masukkan email dan nama.');
      return;
    }
    
    // Check if email already registered
    const exists = registeredUsers.some(u => u.email.toLowerCase() === email.trim().toLowerCase());
    if (exists) {
      setSignUpError('Email ini sudah terdaftar. Silakan masuk di halaman utama.');
      showToast('Email sudah terdaftar.', 'error');
      return;
    }

    setSignUpEmail(email);
    setSignUpName(name);
    setSignUpError('');

    // Generate random 6-digit OTP code
    const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(newOtp);
    setOtpCode('');
    setOtpTimer(60);
    setMode('signup_otp');

    // Simulate OTP delivery via standard Toast
    setTimeout(() => {
      showToast(`🔑 [SIMULASI GMAIL] Kode OTP baru dikirim ke ${email}: ${newOtp}`, 'info');
    }, 800);
  };

  const handleResendOtp = () => {
    if (otpTimer > 0) return;
    const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(newOtp);
    setOtpCode('');
    setOtpTimer(60);
    showToast(`🔑 [SIMULASI GMAIL] Kode OTP baru dikirim ke ${signUpEmail}: ${newOtp}`, 'info');
  };

  // Verify OTP
  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setSignUpError('');
    if (otpCode !== generatedOtp) {
      setSignUpError('Kode OTP tidak cocok. Silakan periksa kembali.');
      showToast('OTP tidak valid.', 'error');
      return;
    }
    
    showToast('OTP berhasil diverifikasi. Silakan buat password.', 'success');
    setMode('signup_password');
  };

  // Complete Sign Up
  const handleSignUpComplete = (e: React.FormEvent) => {
    e.preventDefault();
    setSignUpError('');

    if (signUpPassword.length < 6) {
      setSignUpError('Password minimal 6 karakter.');
      return;
    }

    if (signUpPassword !== signUpConfirmPassword) {
      setSignUpError('Konfirmasi password tidak cocok.');
      return;
    }

    // Sign Up & Sign In in Zustand store
    const photoURL = `https://ui-avatars.com/api/?name=${encodeURIComponent(signUpName)}&background=0D8ABC&color=fff`;
    signup(signUpEmail, signUpPassword, signUpName, photoURL);
    showToast('Pendaftaran akun berhasil! Selamat datang.', 'success');
  };

  // Quick Demo account selector for sign-in or signup
  const selectDemoAccount = (email: string, name: string) => {
    const hostname = window.location.hostname;
    // Redirect if NOT on the demo domain or localhost
    const isDemoHost = hostname === 'demo-dompetku.vercel.app' || hostname === 'demo.bantu-umkm.tech';

    if (!isDemoHost) {
      showToast('Membuka Website Demo DompetKu di tab baru...', 'info');
      setTimeout(() => {
        window.open('https://demo.bantu-umkm.tech', '_blank');
      }, 1200);
      return;
    }

    const isRegistered = registeredUsers.some(u => u.email.toLowerCase() === email.toLowerCase());
    if (isRegistered) {
      setLoginEmail(email);
      setLoginPassword('password123'); // Default password for pre-registered demo accounts
      showToast(`Mengisi kredensial demo untuk ${name}`, 'info');
    } else {
      setPendingSetup({ type: 'demo', demoEmail: email, demoName: name });
    }
  };

  return (
    <div className="min-h-screen w-full relative flex items-center justify-center overflow-hidden bg-slate-50 dark:bg-slate-950 font-sans p-4 transition-colors duration-300">
      
      {/* Dynamic Animated Glow Circles (Background) */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-blue-600/10 dark:bg-blue-600/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-cyan-500/10 dark:bg-cyan-500/5 blur-[120px] pointer-events-none" />
      
      {/* Halaman/Canvas Login & Sign Up */}
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 lg:gap-8 items-center z-10">
        
        {/* Info/Branding Section - Desktop Only (5 columns) */}
        <div className="hidden lg:flex lg:col-span-5 flex-col text-left space-y-6 pr-4">
          <div className="flex flex-col items-start gap-4 mb-2">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl overflow-hidden shadow-2xl shadow-blue-600/20 bg-white dark:bg-white/10 backdrop-blur-xl border border-white/40 dark:border-white/5 flex items-center justify-center relative group">
                <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/40 to-white/0 dark:from-white/0 dark:via-white/10 dark:to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none z-10"></div>
                <img src="/Image/logo/DompetKu-2.svg" className="w-full h-full object-cover relative z-0" alt="Logo" />
              </div>
              <span className="text-4xl font-extrabold font-headline tracking-tighter bg-clip-text text-transparent bg-gradient-to-br from-slate-800 via-slate-600 to-slate-800 dark:from-white dark:via-slate-200 dark:to-slate-400 drop-shadow-sm pb-1">
                {import.meta.env.VITE_APP_NAME || 'DompetKu'}
              </span>
            </div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/30 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
              <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-[0.25em] font-['Inter'] leading-none pt-0.5">
                Premium Finance Tracker
              </p>
            </div>
          </div>
          
          <h2 className="text-3xl font-black text-slate-800 dark:text-slate-100 font-headline leading-snug">
            Kelola Kekayaan dengan Presisi Maksimal
          </h2>

          <div className="space-y-4">
            <div className="flex items-start gap-3.5">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 dark:bg-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-300 shrink-0">
                <span className="material-symbols-outlined text-lg">dashboard</span>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Dasbor Keuangan Premium</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Analisis visual kekayaan bersih, aset likuid, dan non-likuid real-time.</p>
              </div>
            </div>

            <div className="flex items-start gap-3.5">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/10 dark:bg-cyan-500/20 flex items-center justify-center text-cyan-600 dark:text-cyan-300 shrink-0">
                <span className="material-symbols-outlined text-lg">sync</span>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Sinkronisasi Google Sheets</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Integrasikan catatan Anda langsung dengan spreadsheet Google Drive Anda secara aman.</p>
              </div>
            </div>

            <div className="flex items-start gap-3.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-300 shrink-0">
                <span className="material-symbols-outlined text-lg">security</span>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Keamanan & Privasi Utama</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Semua data sensitif tersimpan di spreadsheet pribadi dan sesi browser Anda.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Auth Box Container (7 columns) */}
        <div className="lg:col-span-7 w-full flex justify-center">
          <div className="w-full max-w-md liquid-glass rounded-2xl sm:rounded-[2rem] p-5 sm:p-6 md:p-8 lg:p-10 border border-white/40 dark:border-white/10 premium-shadow">
            
            {/* Header for Mobile display */}
            <div className="flex flex-col items-center mb-8 lg:hidden">
              <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-2xl shadow-blue-600/20 bg-white dark:bg-white/10 backdrop-blur-xl border border-white/40 dark:border-white/5 flex items-center justify-center mb-4 relative group">
                <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/40 to-white/0 dark:from-white/0 dark:via-white/10 dark:to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none z-10"></div>
                <img src="/Image/logo/DompetKu-2.svg" className="w-full h-full object-cover relative z-0" alt="Logo" />
              </div>
              <h1 className="text-2xl font-extrabold font-headline tracking-tighter bg-clip-text text-transparent bg-gradient-to-br from-slate-800 via-slate-600 to-slate-800 dark:from-white dark:via-slate-200 dark:to-slate-400 drop-shadow-sm mb-3 pb-0.5">
                {import.meta.env.VITE_APP_NAME || 'DompetKu'}
              </h1>
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/30 shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                <p className="text-[9px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-[0.2em] font-['Inter'] leading-none pt-0.5">
                  Premium Finance Tracker
                </p>
              </div>
            </div>

            <AnimatePresence mode="wait">
              
              {/* 1. LOGIN MODE */}
              {mode === 'login' && (
                <motion.div
                  key="login"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3 }}
                >
                  {isDemoDomain ? (
                    <div className="text-center lg:text-left">
                      <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 font-headline mb-2 text-center lg:text-left">
                        Masuk Mode Demo
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-8 text-center lg:text-left leading-relaxed">
                        Gunakan data contoh untuk mencoba seluruh fitur premium secara langsung.
                      </p>

                      <button 
                        onClick={handleDirectDemoLogin}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-6 rounded-2xl transition-all duration-200 shadow-md shadow-blue-500/10 hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <span>Masuk Mode Demo</span>
                        <span className="material-symbols-outlined text-sm font-bold">login</span>
                      </button>

                      <a 
                        href="https://dompetku.bantu-umkm.tech"
                        className="w-full text-center border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-white/5 text-slate-700 dark:text-slate-300 font-semibold py-3.5 px-6 rounded-2xl transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer mt-3"
                      >
                        <span>Kembali ke Aplikasi Utama</span>
                        <span className="material-symbols-outlined text-sm">open_in_new</span>
                      </a>
                    </div>
                  ) : (
                    <>
                      <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 font-headline mb-2 text-center lg:text-left">
                        Selamat Datang
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 text-center lg:text-left">
                        Masuk untuk mengelola dan memantau kekayaan Anda
                      </p>

                      <form onSubmit={handleLoginSubmit} className="space-y-4">
                        {loginError && (
                          <div className="p-3 text-xs bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 rounded-xl border border-red-200/50 dark:border-red-900/50 flex items-center gap-2">
                            <span className="material-symbols-outlined text-sm font-bold">warning</span>
                            <span>{loginError}</span>
                          </div>
                        )}

                        <div>
                          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 ml-1">Email</label>
                          <input 
                            type="email" 
                            value={loginEmail}
                            onChange={e => setLoginEmail(e.target.value)}
                            placeholder="contoh@gmail.com"
                            className="apple-input py-3.5 px-4 text-sm"
                          />
                        </div>

                        <div>
                          <div className="flex justify-between items-center mb-1.5 ml-1">
                            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400">Password</label>
                            <button 
                              type="button"
                              onClick={() => setShowLupaPasswordModal(true)}
                              className="text-[10px] font-bold text-blue-600 dark:text-[#a7c8ff] hover:underline cursor-pointer bg-transparent border-none outline-none"
                            >
                              Lupa Password?
                            </button>
                          </div>
                          <div className="relative">
                            <input 
                              type={showPasswordVisibility ? "text" : "password"} 
                              value={loginPassword}
                              onChange={e => setLoginPassword(e.target.value)}
                              placeholder="••••••••"
                              className="apple-input py-3.5 px-4 pr-12 text-sm w-full"
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

                        <button 
                          type="submit" 
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3.5 px-6 rounded-2xl transition-all duration-200 shadow-md shadow-blue-500/10 hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer mt-6"
                        >
                          <span>Masuk</span>
                          <span className="material-symbols-outlined text-sm font-bold">login</span>
                        </button>
                      </form>

                      {/* Google Authenticator Action */}
                      <div className="relative flex py-5 items-center">
                        <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
                        <span className="flex-shrink mx-4 text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Atau</span>
                        <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
                      </div>

                      <button 
                        type="button"
                        onClick={() => handleGoogleLogin()}
                        className="w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 font-semibold py-3.5 px-6 rounded-2xl transition-all duration-200 flex items-center justify-center gap-3 cursor-pointer"
                      >
                        <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
                          <g transform="matrix(1, 0, 0, 1, 0, 0)">
                            <path d="M21.35,11.1H12v2.7h5.38C16.88,15.69,14.8,17.2,12,17.2a5.2,5.2,0,1,1,4.78-7.24l2.44-1.89A9.15,9.15,0,1,0,12,21.1c4.66,0,8.55-3.39,8.55-9.1A8.25,8.25,0,0,0,21.35,11.1Z" fill="#ea4335" />
                            <path d="M12,21.1c4.66,0,8.55-3.39,8.55-9.1a8.25,8.25,0,0,0-.2-1.9H12v2.7h5.38C16.88,15.69,14.8,17.2,12,17.2a5.2,5.2,0,1,1,4.78-7.24l2.44-1.89A9.15,9.15,0,1,0,12,21.1Z" fill="#34a853" />
                            <path d="M12,2.9a5.1,5.1,0,0,1,3.48,1.35l2.44-1.89A9.15,9.15,0,0,0,12,2.9a9.15,9.15,0,0,0-8.55,6.1l2.44,1.89A5.2,5.2,0,0,1,12,2.9Z" fill="#fbbc05" />
                            <path d="M12,2.9a5.1,5.1,0,0,1,3.48,1.35l2.44-1.89A9.15,9.15,0,0,0,12,2.9Z" fill="#4285f4" />
                          </g>
                        </svg>
                        <span>Masuk dengan Akun Google</span>
                      </button>


                      {/* Demo Account Quick Pickers */}
                      <div className="mt-8">
                        <h5 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3 text-center">Akun Demo Cepat</h5>
                        <div className="grid grid-cols-1 gap-2">
                          <button 
                            onClick={() => selectDemoAccount(import.meta.env.VITE_DEMO_EMAIL || 'demo@dompetku.com', 'Admin Demo')}
                            className="py-3 px-4 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-center border border-transparent hover:border-blue-500/20 text-sm transition-all flex flex-col items-center justify-center gap-1 cursor-pointer"
                          >
                            <span className="font-bold text-slate-700 dark:text-slate-300 leading-none truncate">Gunakan Akun Demo Publik</span>
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 leading-none truncate">Lihat data contoh & Coba Fitur secara langsung</span>
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </motion.div>
              )}

              {/* 2. SIGN UP: EMAIL/NAME INPUT */}
              {mode === 'signup_email' && (
                <motion.div
                  key="signup_email"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="flex items-center gap-2 mb-4">
                    <button 
                      onClick={() => setMode('login')}
                      className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-lg">arrow_back</span>
                    </button>
                    <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 font-headline">
                      Daftar dengan Google
                    </h3>
                  </div>

                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
                    Masukkan nama Anda dan alamat Gmail yang tersinkronisasi dengan Google Drive tempat Anda menyimpan file Google Sheets keuangan Anda.
                  </p>

                  <div className="space-y-4">
                    {signUpError && (
                      <div className="p-3 text-xs bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 rounded-xl border border-red-200/50 dark:border-red-900/50 flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm font-bold">warning</span>
                        <span>{signUpError}</span>
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 ml-1">Nama Lengkap</label>
                      <input 
                        type="text" 
                        value={signUpName}
                        onChange={e => setSignUpName(e.target.value)}
                        placeholder="Chaerobby Fakhri"
                        className="apple-input py-3.5 px-4 text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 ml-1">Gmail</label>
                      <input 
                        type="email" 
                        value={signUpEmail}
                        onChange={e => setSignUpEmail(e.target.value)}
                        placeholder="username@gmail.com"
                        className="apple-input py-3.5 px-4 text-sm"
                      />
                    </div>

                    <button 
                      onClick={() => triggerSignUpFlow(signUpEmail, signUpName)}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3.5 px-6 rounded-2xl transition-all duration-200 shadow-md shadow-blue-500/10 hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer mt-6"
                    >
                      <span>Kirim Kode OTP</span>
                      <span className="material-symbols-outlined text-sm font-bold">send_to_mobile</span>
                    </button>
                  </div>
                </motion.div>
              )}

              {/* 3. SIGN UP: OTP VERIFICATION */}
              {mode === 'signup_otp' && (
                <motion.div
                  key="signup_otp"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="flex items-center gap-2 mb-4">
                    <button 
                      onClick={() => setMode('signup_email')}
                      className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-lg">arrow_back</span>
                    </button>
                    <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 font-headline">
                      Verifikasi Akun
                    </h3>
                  </div>

                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
                    Kami telah mensimulasikan pengiriman kode verifikasi OTP 6-digit ke email <strong className="text-slate-700 dark:text-slate-300">{signUpEmail}</strong>. Masukkan kode tersebut di bawah ini.
                  </p>

                  <form onSubmit={handleVerifyOtp} className="space-y-6">
                    {signUpError && (
                      <div className="p-3 text-xs bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 rounded-xl border border-red-200/50 dark:border-red-900/50 flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm font-bold">warning</span>
                        <span>{signUpError}</span>
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2 text-center">Masukkan 6 Digit OTP</label>
                      <input 
                        type="text"
                        maxLength={6}
                        value={otpCode}
                        onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))}
                        placeholder="••••••"
                        className="w-full text-center tracking-[1em] text-xl font-bold py-4 rounded-2xl bg-[#f5f5f7] dark:bg-[#1d1d1f] border border-transparent focus:border-brand-primary/30 outline-none transition-all duration-300 text-slate-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-700"
                      />
                    </div>

                    <button 
                      type="submit"
                      disabled={otpCode.length < 6}
                      className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white font-semibold py-3.5 px-6 rounded-2xl transition-all duration-200 shadow-md shadow-blue-500/10 hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
                    >
                      <span>Verifikasi OTP</span>
                      <span className="material-symbols-outlined text-sm font-bold">verified</span>
                    </button>

                    <div className="text-center">
                      <button
                        type="button"
                        onClick={handleResendOtp}
                        disabled={otpTimer > 0}
                        className="text-xs font-semibold text-blue-600 dark:text-[#a7c8ff] hover:underline disabled:text-slate-400 disabled:no-underline cursor-pointer disabled:cursor-default"
                      >
                        {otpTimer > 0 ? `Kirim Ulang OTP dalam (${otpTimer}s)` : 'Kirim Ulang Kode OTP'}
                      </button>
                    </div>
                  </form>
                </motion.div>
              )}

              {/* 4. SIGN UP: PASSWORD CREATION */}
              {mode === 'signup_password' && (
                <motion.div
                  key="signup_password"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 font-headline mb-2">
                    Buat Password Anda
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
                    Selamat! Akun Google Anda terverifikasi. Sekarang buat password untuk mengamankan login berikutnya tanpa kode OTP.
                  </p>

                  <form onSubmit={handleSignUpComplete} className="space-y-4">
                    {signUpError && (
                      <div className="p-3 text-xs bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 rounded-xl border border-red-200/50 dark:border-red-900/50 flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm font-bold">warning</span>
                        <span>{signUpError}</span>
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 ml-1">Buat Password</label>
                      <div className="relative">
                        <input 
                          type={showPasswordVisibility ? "text" : "password"} 
                          value={signUpPassword}
                          onChange={e => setSignUpPassword(e.target.value)}
                          placeholder="Minimal 6 karakter"
                          className="apple-input py-3.5 px-4 pr-12 text-sm w-full"
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

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 ml-1">Konfirmasi Password</label>
                      <div className="relative">
                        <input 
                          type={showPasswordVisibility ? "text" : "password"} 
                          value={signUpConfirmPassword}
                          onChange={e => setSignUpConfirmPassword(e.target.value)}
                          placeholder="Ketik ulang password"
                          className="apple-input py-3.5 px-4 pr-12 text-sm w-full"
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

                    <button 
                      type="submit"
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3.5 px-6 rounded-2xl transition-all duration-200 shadow-md shadow-blue-500/10 hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer mt-6"
                    >
                      <span>Selesaikan Pendaftaran</span>
                      <span className="material-symbols-outlined text-sm font-bold">check_circle</span>
                    </button>
                  </form>
                </motion.div>
              )}

            </AnimatePresence>

          </div>
        </div>

      </div>

      {/* Apple Glassmorphism Lupa Password Modal */}
      <AnimatePresence>
        {showLupaPasswordModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              className="w-full max-w-sm bg-white/90 dark:bg-[#0d1527]/90 backdrop-blur-xl border border-white/50 dark:border-white/10 rounded-[28px] p-8 shadow-2xl relative overflow-hidden flex flex-col items-center text-center"
            >
              <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden rounded-[28px]">
                <div className="absolute top-[-50%] left-[-20%] w-full h-full bg-blue-500/10 blur-3xl rounded-full" />
                <div className="absolute bottom-[-50%] right-[-20%] w-full h-full bg-cyan-500/10 blur-3xl rounded-full" />
              </div>
              
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mb-6 relative z-10">
                <span className="material-symbols-outlined text-3xl font-bold">lightbulb</span>
              </div>
              
              <h3 className="text-xl font-black font-headline text-slate-900 dark:text-white mb-2 relative z-10">Lupa Password?</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 relative z-10 leading-relaxed">
                Silakan buka file <strong>Spreadsheet Google Drive</strong> Anda pada tab <strong>Settings</strong>.<br/><br/>
                Anda dapat melihat kata sandi aktif Anda pada baris <code className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded">last_password</code>.
              </p>
              
              <button 
                onClick={() => setShowLupaPasswordModal(false)}
                className="w-full py-3.5 bg-blue-600 text-white font-bold text-sm rounded-2xl shadow-md shadow-blue-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer relative z-10"
              >
                Mengerti
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Setup / Guide Modal for Buyer & Demo */}
      <AnimatePresence>
        {pendingSetup && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden"
            >
              {pendingSetup.type === 'buyer' ? (
                <>
                  <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mb-6">
                    <span className="material-symbols-outlined text-3xl">verified_user</span>
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Lisensi Valid! 🎉</h3>
                  <p className="text-slate-600 dark:text-slate-400 mb-6 text-sm leading-relaxed">
                    Selamat, {pendingSetup.userInfo?.name}! Email Anda terdaftar sebagai pembeli DompetKu. Berikut panduan selanjutnya:
                  </p>
                  <ul className="space-y-4 mb-8">
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                        <span className="text-sm font-bold">1</span>
                      </div>
                      <p className="text-sm text-slate-700 dark:text-slate-300">
                        Kami akan menyalin <strong>Master Template Database</strong> ke akun Google Drive Anda. Proses ini butuh sekitar 5-10 detik.
                      </p>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                        <span className="text-sm font-bold">2</span>
                      </div>
                      <p className="text-sm text-slate-700 dark:text-slate-300">
                        File salinan tersebut akan menjadi database pribadi Anda. <strong>Jangan mengubah struktur kolom atau nama tab sheet</strong> agar aplikasi berjalan lancar.
                      </p>
                    </li>
                  </ul>
                  <div className="flex gap-3">
                    <button 
                      onClick={() => setPendingSetup(null)}
                      disabled={isCopying}
                      className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-2xl transition-all cursor-pointer"
                    >
                      Batal
                    </button>
                    <button 
                      onClick={handleConfirmBuyerSetup}
                      disabled={isCopying}
                      className="flex-1 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-2xl transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                      {isCopying ? (
                        <>
                          <span className="material-symbols-outlined animate-spin">refresh</span>
                          Menyalin...
                        </>
                      ) : (
                        'Mengerti, Salin Sekarang'
                      )}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 rounded-full flex items-center justify-center mb-6">
                    <span className="material-symbols-outlined text-3xl">visibility</span>
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Panduan Akun Demo</h3>
                  <p className="text-slate-600 dark:text-slate-400 mb-6 text-sm leading-relaxed">
                    Anda akan masuk menggunakan akun demo publik DompetKu.
                  </p>
                  <ul className="space-y-4 mb-8">
                    <li className="flex items-start gap-3">
                      <span className="material-symbols-outlined text-amber-500 mt-0.5">info</span>
                      <p className="text-sm text-slate-700 dark:text-slate-300">
                        Data keuangan yang Anda lihat adalah <strong>data tiruan (mock data)</strong> untuk keperluan demonstrasi.
                      </p>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="material-symbols-outlined text-red-500 mt-0.5">block</span>
                      <p className="text-sm text-slate-700 dark:text-slate-300">
                        Fitur sinkronisasi ke Google Drive dan penyalinan Master Template <strong>dinonaktifkan</strong> pada mode demo ini untuk menjaga keamanan aplikasi.
                      </p>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="material-symbols-outlined text-emerald-500 mt-0.5">shopping_cart</span>
                      <p className="text-sm text-slate-700 dark:text-slate-300">
                        Jika Anda tertarik dan ingin memiliki database pribadi, silakan <strong>beli lisensi resmi aplikasi DompetKu</strong>.
                      </p>
                    </li>
                  </ul>
                  <div className="flex gap-3">
                    <button 
                      onClick={() => setPendingSetup(null)}
                      className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-2xl transition-all cursor-pointer"
                    >
                      Batal
                    </button>
                    <button 
                      onClick={handleConfirmDemoSetup}
                      className="flex-1 py-3.5 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-2xl transition-all shadow-lg shadow-amber-500/20 cursor-pointer"
                    >
                      Masuk Mode Demo
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating Simulated Google Gmail Notification Toasts (Z-index 50) */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
        <AnimatePresence>
          {toasts.map(t => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, y: -10 }}
              className={`pointer-events-auto w-full p-4 rounded-2xl shadow-xl flex items-start gap-3 border ${
                t.type === 'success' 
                  ? 'bg-emerald-500 text-white border-emerald-400' 
                  : t.type === 'error'
                    ? 'bg-red-500 text-white border-red-400'
                    : 'bg-slate-900/95 dark:bg-slate-800/95 text-slate-100 border-slate-700'
              }`}
            >
              <span className="material-symbols-outlined mt-0.5 text-lg shrink-0">
                {t.type === 'success' ? 'check_circle' : t.type === 'error' ? 'error' : 'mail'}
              </span>
              <div className="flex-1 text-xs font-medium leading-relaxed">
                {t.message}
              </div>
              <button 
                onClick={() => setToasts(prev => prev.filter(item => item.id !== t.id))}
                className="text-white/70 hover:text-white shrink-0 self-start p-0.5 rounded hover:bg-white/10 flex items-center justify-center cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Powered by NAMTECH Watermark */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 1, ease: "easeOut" }}
        className="absolute bottom-6 md:bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2.5 px-6 py-2.5 rounded-full bg-white/40 dark:bg-black/20 backdrop-blur-2xl border border-white/60 dark:border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.1)] z-50 pointer-events-none overflow-hidden whitespace-nowrap w-max"
      >
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
      </motion.div>

    </div>
  );
};

export default FinanceLogin;
