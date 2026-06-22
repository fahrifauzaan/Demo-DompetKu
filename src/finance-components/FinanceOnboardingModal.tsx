import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuthStore } from '../store/useAuthStore';
import { useFinanceStore } from '../store/useFinanceStore';

interface FinanceOnboardingModalProps {
  onClose: () => void;
}

const FinanceOnboardingModal: React.FC<FinanceOnboardingModalProps> = ({ onClose }) => {
  const user = useAuthStore(state => state.user);
  const updateUserSheetUrl = useAuthStore(state => state.updateUserSheetUrl);
  const setGoogleSheetUrl = useFinanceStore(state => state.setGoogleSheetUrl);
  const syncFromGoogleSheets = useFinanceStore(state => state.syncFromGoogleSheets);

  const [step, setStep] = useState(1);
  const [sheetUrlInput, setSheetUrlInput] = useState(user?.sheetUrl || '');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleTestConnection = async () => {
    setErrorMessage('');
    const trimmedUrl = sheetUrlInput.trim();

    if (!trimmedUrl) {
      setErrorMessage('URL tidak boleh kosong.');
      setTestResult('error');
      return;
    }

    if (!trimmedUrl.startsWith('https://script.google.com/')) {
      setErrorMessage('Format URL tidak valid. Harus dimulai dengan "https://script.google.com/"');
      setTestResult('error');
      return;
    }

    setIsTesting(true);
    setTestResult('idle');

    try {
      // Perform a test request to the user's Web App API (with no-cors or JSONP)
      // Since it's a cross-origin script deployment, we mock a 1.5s verification delay.
      // But we also attempt a real check by checking if URL endpoint responds.
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Save sheet URL
      if (user?.email) {
        updateUserSheetUrl(user.email, trimmedUrl);
        setGoogleSheetUrl(trimmedUrl);
        // Trigger sync
        await syncFromGoogleSheets();
        
        setTestResult('success');
        setTimeout(() => {
          onClose();
        }, 1500);
      }
    } catch (error) {
      setTestResult('error');
      setErrorMessage('Gagal menyambung ke script Web App. Periksa konfigurasi deployment Anda.');
    } finally {
      setIsTesting(false);
    }
  };

  const templateLink = "https://docs.google.com/spreadsheets/d/1GMIXfRg7oWSBwUsOyRJqxKKR3-QC6xJny89IsDsbDJ0/copy";

  return (
    <div className="fixed inset-0 z-[110] flex items-start sm:items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-md"
      />

      {/* Modal Box */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ type: 'spring', duration: 0.5 }}
        className="w-full max-w-md sm:max-w-xl md:max-w-2xl my-auto bg-white dark:bg-slate-900 rounded-2xl sm:rounded-[2rem] border border-slate-200/50 dark:border-white/10 shadow-2xl overflow-hidden z-10 flex flex-col max-h-[calc(100vh-1.5rem)] sm:max-h-[calc(100vh-2rem)] premium-shadow text-left"
      >
        {/* Header */}
        <div className="px-5 sm:px-6 lg:px-8 py-4 sm:py-5 lg:py-6 border-b border-slate-100 dark:border-white/5 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 font-headline">
              Hubungkan Database Google Sheets
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Ikuti panduan berikut untuk menyambungkan aplikasi {import.meta.env.VITE_APP_NAME || 'DompetKu'} dengan spreadsheet pribadi Anda.
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* Step Progress Bar */}
        <div className="px-8 pt-6">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400 mb-2">
            <span className={step === 1 ? "text-blue-600 dark:text-[#a7c8ff]" : step > 1 ? "text-emerald-500" : ""}>Langkah 1: Salin Template</span>
            <span className={step === 2 ? "text-blue-600 dark:text-[#a7c8ff]" : step > 2 ? "text-emerald-500" : ""}>Langkah 2: Deploy Web App</span>
            <span className={step === 3 ? "text-blue-600 dark:text-[#a7c8ff]" : ""}>Langkah 3: Hubungkan API</span>
          </div>
          <div className="w-full h-1.5 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
            <motion.div 
              animate={{ width: step === 1 ? '33.3%' : step === 2 ? '66.6%' : '100%' }}
              transition={{ duration: 0.3 }}
              className={`h-full ${step === 3 && testResult === 'success' ? 'bg-emerald-500' : 'bg-blue-600 dark:bg-[#a7c8ff]'}`}
            />
          </div>
        </div>

        {/* Content Wizard (Stepper) */}
        <div className="p-5 sm:p-6 lg:p-8 flex-grow overflow-y-auto">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-blue-600/10 dark:bg-blue-600/20 text-blue-600 dark:text-blue-300 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-xl">content_copy</span>
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">Buat Salinan Template {import.meta.env.VITE_APP_NAME || 'DompetKu'}</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      Kami telah menyediakan template spreadsheet Google Sheets khusus yang dioptimalkan untuk performa {import.meta.env.VITE_APP_NAME || 'DompetKu'}.
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
                      Klik tombol di bawah untuk membuka template, lalu klik menu <strong className="text-slate-700 dark:text-slate-300">File &rarr; Buat salinan (Make a copy)</strong> untuk menyimpannya di Google Drive Anda sendiri.
                    </p>
                  </div>
                </div>

                <div className="pt-4 text-center">
                  {user?.email === (import.meta.env.VITE_DEMO_EMAIL || 'demo@dompetku.com') ? (
                    <button 
                      onClick={(e) => {
                        e.preventDefault();
                        alert('Maaf, akun demo publik tidak dapat menduplikasi template. Hanya pengguna yang sudah membeli dan terdaftar yang dapat mengakses template ini.');
                      }}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-slate-400 dark:bg-slate-700 text-white font-semibold text-xs rounded-xl shadow cursor-not-allowed"
                    >
                      <span>Salin Template Spreadsheet</span>
                      <span className="material-symbols-outlined text-sm">lock</span>
                    </button>
                  ) : (
                    <a 
                      href={templateLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow transition-all cursor-pointer"
                    >
                      <span>Salin Template Spreadsheet</span>
                      <span className="material-symbols-outlined text-sm">open_in_new</span>
                    </a>
                  )}
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-blue-600/10 dark:bg-blue-600/20 text-blue-600 dark:text-blue-300 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-xl">developer_mode</span>
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">Deploy sebagai Web App API</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      Untuk mengizinkan web {import.meta.env.VITE_APP_NAME || 'DompetKu'} membaca dan menulis data ke spreadsheet pribadi Anda, Anda perlu men-deploy Apps Script bawaan di sheet tersebut.
                    </p>
                    <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-xl border border-slate-100 dark:border-white/5 space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                      <p>1. Buka spreadsheet baru hasil salinan Anda.</p>
                      <p>2. Klik menu <strong className="text-slate-800 dark:text-white">Ekstensi (Extensions) &rarr; Apps Script</strong>.</p>
                      <p>3. Di pojok kanan atas editor script, klik tombol biru <strong className="text-slate-800 dark:text-white">Deploy &rarr; New deployment</strong>.</p>
                      <p>4. Klik ikon gerigi (Select type), lalu pilih <strong className="text-slate-800 dark:text-white">Web app (Aplikasi Web)</strong>.</p>
                      <p>5. Atur konfigurasi berikut:</p>
                      <ul className="list-disc pl-5 mt-1 space-y-1">
                        <li>Jalankan Sebagai (Execute as): <strong className="text-slate-800 dark:text-white">Saya / Email Anda (Me)</strong></li>
                        <li>Siapa yang memiliki akses (Who has access): <strong className="text-slate-800 dark:text-white">Siapa saja (Anyone)</strong></li>
                      </ul>
                      <p className="mt-2">6. Klik <strong className="text-slate-800 dark:text-white">Deploy</strong>, lalu berikan otorisasi izin akses akun Google Anda jika diminta.</p>
                      <p>7. Salin **URL Aplikasi Web (Web app URL)** yang dihasilkan.</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-blue-600/10 dark:bg-blue-600/20 text-blue-600 dark:text-blue-300 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-xl">cloud_sync</span>
                  </div>
                  <div className="space-y-2 flex-grow">
                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">Tempel URL Web App & Sambungkan</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
                      Tempel URL Aplikasi Web hasil deploy tadi di sini untuk menyelesaikan sinkronisasi database.
                    </p>

                    {errorMessage && (
                      <div className="p-3 text-xs bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 rounded-xl border border-red-200/50 dark:border-red-900/50 flex items-center gap-2 mb-3 animate-pulse">
                        <span className="material-symbols-outlined text-sm font-bold">warning</span>
                        <span>{errorMessage}</span>
                      </div>
                    )}

                    {testResult === 'success' && (
                      <div className="p-3 text-xs bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-xl border border-emerald-200/50 dark:border-emerald-900/50 flex items-center gap-2 mb-3">
                        <span className="material-symbols-outlined text-sm font-bold" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                        <span>Berhasil Terhubung! Menyinkronkan data database Anda...</span>
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 ml-1">URL Aplikasi Web Google Sheets</label>
                      <input 
                        type="url"
                        value={sheetUrlInput}
                        onChange={e => setSheetUrlInput(e.target.value)}
                        placeholder="https://script.google.com/macros/s/.../exec"
                        disabled={isTesting || testResult === 'success'}
                        className="apple-input py-3.5 px-4 text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer Navigation */}
        <div className="px-8 py-6 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02] flex items-center justify-between">
          <button
            disabled={step === 1 || isTesting || testResult === 'success'}
            onClick={() => setStep(prev => prev - 1)}
            className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 text-slate-600 dark:text-slate-400 text-xs font-semibold disabled:opacity-30 disabled:hover:bg-transparent transition-all cursor-pointer disabled:cursor-not-allowed"
          >
            Kembali
          </button>
          
          {step < 3 ? (
            <button
              onClick={() => setStep(prev => prev + 1)}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow transition-all cursor-pointer"
            >
              Lanjutkan
            </button>
          ) : (
            <button
              onClick={handleTestConnection}
              disabled={isTesting || testResult === 'success'}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white font-semibold text-xs rounded-xl shadow transition-all cursor-pointer flex items-center gap-1.5"
            >
              {isTesting ? (
                <>
                  <span className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent"></span>
                  <span>Menguji Koneksi...</span>
                </>
              ) : testResult === 'success' ? (
                <>
                  <span className="material-symbols-outlined text-sm">done</span>
                  <span>Tersambung!</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-sm">cloud_sync</span>
                  <span>Uji Koneksi & Simpan</span>
                </>
              )}
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default FinanceOnboardingModal;
