import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useFinanceStore, type Account } from '../store/useFinanceStore';

interface AccountReconcileModalProps {
  isOpen: boolean;
  onClose: () => void;
  account: Account | null;
}

const formatRp = (n: number) => `Rp ${Math.round(n || 0).toLocaleString('id-ID')}`;
const parseDigits = (s: string) => Number(s.replace(/\D/g, '')) || 0;

const todayISO = () => new Date().toISOString().slice(0, 10);

function daysSince(dateStr?: string): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  d.setHours(0, 0, 0, 0);
  const now = new Date(); now.setHours(0, 0, 0, 0);
  return Math.floor((now.getTime() - d.getTime()) / 86400000);
}

export const AccountReconcileModal: React.FC<AccountReconcileModalProps> = ({ isOpen, onClose, account }) => {
  const updateAccount = useFinanceStore((s) => s.updateAccount);
  const addTransaction = useFinanceStore((s) => s.addTransaction);
  const budgetCategories = useFinanceStore((s) => s.budgetCategories);

  const [realInput, setRealInput] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (isOpen && account) setRealInput(account.balance.toLocaleString('id-ID'));
  }, [isOpen, account]);

  if (!isOpen || !account) return null;

  const recorded = account.balance;
  const real = parseDigits(realInput);
  const diff = real - recorded;
  const inSync = diff === 0;
  const lastDays = daysSince(account.lastValuationUpdate);

  const handleUpdateOnly = async () => {
    if (inSync || busy) return;
    setBusy(true);
    await updateAccount({ ...account, balance: real, lastValuationUpdate: todayISO() });
    setBusy(false);
    onClose();
  };

  const handleAdjustment = async () => {
    if (inSync || busy) return;
    setBusy(true);
    // Kategori 'Penyesuaian' bila ada, jika tidak → 'Lainnya'
    const catName = budgetCategories.find((c) => c.name.toLowerCase() === 'penyesuaian')?.name || 'Lainnya';
    await addTransaction({
      date: todayISO(),
      desc: 'Penyesuaian Saldo (rekonsiliasi)',
      location: 'Local',
      amount: diff, // signed: + surplus (PEMASUKAN), − shortfall (PENGELUARAN)
      category: catName,
      icon: 'tune',
      status: 'Selesai',
      account: account.name,
      type: diff >= 0 ? 'PEMASUKAN' : 'PENGELUARAN',
    });
    await updateAccount({ ...account, balance: real, lastValuationUpdate: todayISO() });
    setBusy(false);
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[110] flex items-start sm:items-center justify-center p-3 sm:p-4 overflow-y-auto">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

        <motion.div
          initial={{ opacity: 0, scale: 0.97, y: 24 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97, y: 24 }}
          transition={{ type: 'spring', damping: 26, stiffness: 240 }}
          className="relative w-full max-w-md my-auto bg-surface dark:bg-[#191c1e] rounded-3xl shadow-2xl border border-outline-variant/15 dark:border-white/10 p-5 sm:p-6"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-2xl bg-primary/10 dark:bg-[#a7c8ff]/15 flex items-center justify-center text-primary dark:text-[#a7c8ff] shrink-0">
                <span className="material-symbols-outlined text-2xl">balance</span>
              </div>
              <div className="min-w-0">
                <h2 className="text-lg font-black font-headline text-on-surface dark:text-white truncate">Rekonsiliasi Saldo</h2>
                <p className="text-[11px] text-on-surface-variant dark:text-slate-400 font-bold uppercase tracking-wider truncate">{account.name}</p>
              </div>
            </div>
            <button onClick={onClose} className="w-9 h-9 rounded-full bg-surface-container hover:bg-surface-container-high dark:bg-white/5 dark:hover:bg-white/10 flex items-center justify-center text-on-surface dark:text-white transition-colors cursor-pointer shrink-0">
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>

          <div className="space-y-4">
            {/* Saldo tercatat */}
            <div className="flex items-center justify-between rounded-2xl bg-surface-container-low dark:bg-white/[0.03] border border-outline-variant/10 dark:border-white/5 px-4 py-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-on-surface-variant dark:text-slate-400">Saldo tercatat</p>
                <p className="text-[10px] text-on-surface-variant/70 dark:text-slate-500 mt-0.5">
                  {lastDays === null ? 'Belum pernah direkonsiliasi' : lastDays === 0 ? 'Diperbarui hari ini' : `Terakhir ${lastDays} hari lalu`}
                </p>
              </div>
              <p className="text-base font-black text-on-surface dark:text-white tabular-nums">{formatRp(recorded)}</p>
            </div>

            {/* Input saldo riil */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-on-surface-variant dark:text-slate-300">Saldo riil di bank/aplikasi sekarang</label>
              <div className="flex items-center gap-2 bg-surface-container-low dark:bg-white/5 px-4 py-3 rounded-2xl border border-outline-variant/10 dark:border-white/10 focus-within:border-primary/50">
                <span className="text-sm font-bold text-on-surface-variant dark:text-slate-400">Rp</span>
                <input
                  type="text" inputMode="numeric" autoFocus
                  value={realInput}
                  onChange={(e) => setRealInput(parseDigits(e.target.value).toLocaleString('id-ID'))}
                  className="w-full bg-transparent border-none p-0 text-lg font-black text-on-surface dark:text-white tabular-nums outline-none focus:ring-0"
                />
              </div>
            </div>

            {/* Selisih */}
            <div className={`flex items-center justify-between rounded-2xl px-4 py-3 border ${
              inSync ? 'bg-surface-container-low dark:bg-white/[0.03] border-outline-variant/10 dark:border-white/5'
              : diff > 0 ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-error/10 border-error/30'
            }`}>
              <p className="text-xs font-bold text-on-surface dark:text-white">Selisih</p>
              <p className={`text-base font-black tabular-nums ${
                inSync ? 'text-on-surface-variant dark:text-slate-400' : diff > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-error dark:text-[#ffb4ab]'
              }`}>
                {inSync ? 'Rp 0' : `${diff > 0 ? '+' : '−'} ${formatRp(Math.abs(diff))}`}
              </p>
            </div>

            {inSync ? (
              <div className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 py-3 text-emerald-700 dark:text-emerald-300">
                <span className="material-symbols-outlined text-lg">check_circle</span>
                <span className="text-sm font-bold">Saldo sudah sinkron ✓</span>
              </div>
            ) : (
              <>
                <p className="text-[11px] text-on-surface-variant dark:text-slate-400 leading-relaxed">
                  Pilih cara menyamakan saldo. <strong>Buat transaksi penyesuaian</strong> disarankan agar selisih tercatat rapi di Log Transaksi.
                </p>
                <div className="grid grid-cols-1 gap-2">
                  <button onClick={handleAdjustment} disabled={busy}
                    className="w-full py-3 rounded-2xl bg-primary dark:bg-[#a7c8ff] text-white dark:text-[#001b3c] font-bold text-sm hover:opacity-90 active:scale-[0.99] transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                    <span className="material-symbols-outlined text-lg">receipt_long</span>
                    Buat transaksi penyesuaian
                  </button>
                  <button onClick={handleUpdateOnly} disabled={busy}
                    className="w-full py-3 rounded-2xl bg-surface-container dark:bg-white/10 text-on-surface dark:text-white font-bold text-sm hover:bg-surface-container-high dark:hover:bg-white/15 active:scale-[0.99] transition-all disabled:opacity-50 border border-outline-variant/20 dark:border-white/10">
                    Perbarui saldo saja
                  </button>
                </div>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default AccountReconcileModal;
