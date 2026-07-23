import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useFinanceStore } from '../store/useFinanceStore';

/**
 * Indikator penyimpanan global ke Google Sheets. Membaca `pendingWrites`/`saveError`
 * yang di-track di `postToSheet` — jadi OTOMATIS muncul untuk SETIAP aksi tulis di
 * seluruh aplikasi (tambah/ubah/hapus transaksi, aset, utang, tujuan, jual, dsb.),
 * tanpa perlu menyentuh tiap tombol. Diam saja di mode demo (tak ada target tulis).
 */
const SaveIndicator: React.FC = () => {
  const pendingWrites = useFinanceStore((s) => s.pendingWrites);
  const saveError = useFinanceStore((s) => s.saveError);
  const clearSaveError = useFinanceStore((s) => s.clearSaveError);

  const [showSaved, setShowSaved] = useState(false);
  const prevPending = useRef(0);

  // Flash "Tersimpan" saat transisi pendingWrites >0 → 0 (tanpa error).
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (prevPending.current > 0 && pendingWrites === 0 && !saveError) {
      setShowSaved(true);
      timer = setTimeout(() => setShowSaved(false), 1500);
    }
    prevPending.current = pendingWrites;
    return () => { if (timer) clearTimeout(timer); };
  }, [pendingWrites, saveError]);

  // Auto-tutup error setelah beberapa detik.
  useEffect(() => {
    if (!saveError) return;
    const t = setTimeout(() => clearSaveError(), 6000);
    return () => clearTimeout(t);
  }, [saveError, clearSaveError]);

  const mode: 'saving' | 'error' | 'saved' | null =
    saveError ? 'error' : pendingWrites > 0 ? 'saving' : showSaved ? 'saved' : null;

  const styles = {
    saving: { bg: 'bg-primary dark:bg-[#1b3a5c]', text: 'text-white', icon: 'progress_activity', spin: true, label: 'Menyimpan ke Google Sheets…' },
    saved: { bg: 'bg-emerald-600 dark:bg-emerald-600', text: 'text-white', icon: 'cloud_done', spin: false, label: 'Tersimpan' },
    error: { bg: 'bg-error dark:bg-[#7a2018]', text: 'text-white', icon: 'cloud_off', spin: false, label: saveError || 'Gagal menyimpan' },
  } as const;

  return (
    <AnimatePresence>
      {mode && (
        <motion.div
          key={mode}
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ type: 'spring', damping: 26, stiffness: 320 }}
          className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[200] print:hidden pointer-events-none"
          role="status"
          aria-live="polite"
        >
          <div className={`pointer-events-auto flex items-center gap-2.5 pl-3.5 pr-4 py-2.5 rounded-full shadow-2xl shadow-black/25 border border-white/15 ${styles[mode].bg} ${styles[mode].text} max-w-[92vw]`}>
            <span className={`material-symbols-outlined text-[19px] shrink-0 ${styles[mode].spin ? 'animate-spin' : ''}`} style={{ fontVariationSettings: "'FILL' 1" }}>
              {styles[mode].icon}
            </span>
            <span className="text-xs sm:text-[13px] font-bold truncate">{styles[mode].label}</span>
            {mode === 'error' && (
              <button onClick={clearSaveError} className="ml-1 -mr-1.5 w-6 h-6 rounded-full hover:bg-white/20 flex items-center justify-center shrink-0 cursor-pointer" aria-label="Tutup">
                <span className="material-symbols-outlined text-[15px]">close</span>
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SaveIndicator;
