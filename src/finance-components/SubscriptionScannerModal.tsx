import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useFinanceStore } from '../store/useFinanceStore';
import { detectSubscriptions, totalMonthlyBurn, type SubCandidate } from './subscriptionDetectUtils';

const rp = (n: number) => 'Rp ' + Math.round(n).toLocaleString('id-ID');

const SubscriptionScannerModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const transactions = useFinanceStore((s) => s.transactions);
  const recurring = useFinanceStore((s) => s.recurring);
  const addRecurring = useFinanceStore((s) => s.addRecurring);
  const [added, setAdded] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);

  const cands = useMemo(() => (isOpen ? detectSubscriptions(transactions, recurring, {}) : []), [isOpen, transactions, recurring]);
  const monthlyBurn = useMemo(() => totalMonthlyBurn(cands), [cands]);

  if (!isOpen) return null;

  const makeRecurring = async (c: SubCandidate) => {
    setBusy(c.key);
    const day = Number((c.lastDate || '').slice(8, 10)) || 1;
    await addRecurring({
      name: c.label, type: 'PENGELUARAN', amount: c.amount, category: 'Langganan', account: c.lastAccount || '',
      frequency: c.frequency, dayOfMonth: day, startDate: c.lastDate, endDate: '', lastPostedDate: '',
      autoPost: false, notes: 'Terdeteksi otomatis dari riwayat transaksi',
    } as any);
    setAdded((s) => new Set(s).add(c.key));
    setBusy(null);
  };

  const fresh = cands.filter((c) => !c.alreadyRecurring && !added.has(c.key));

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-start sm:items-center justify-center p-2 sm:p-4 overflow-y-auto">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />
        <motion.div initial={{ opacity: 0, scale: 0.97, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97, y: 20 }}
          transition={{ type: 'spring', damping: 28, stiffness: 240 }}
          className="relative w-full max-w-lg my-auto bg-surface dark:bg-[#121416] rounded-3xl shadow-2xl border border-outline-variant/20 dark:border-white/10 max-h-[94vh] overflow-y-auto custom-scrollbar">
          <div className="sticky top-0 z-10 flex items-center justify-between px-5 sm:px-6 py-4 bg-surface/95 dark:bg-[#121416]/95 backdrop-blur border-b border-outline-variant/10 dark:border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-primary/10 dark:bg-[#a7c8ff]/15 flex items-center justify-center text-primary dark:text-[#a7c8ff]"><span className="material-symbols-outlined">frame_inspect</span></div>
              <div>
                <h2 className="text-lg font-black font-headline text-on-surface dark:text-white leading-none">Pemindai Langganan</h2>
                <p className="text-[11px] text-on-surface-variant dark:text-slate-400 mt-1">Temukan pembayaran berulang dari riwayat</p>
              </div>
            </div>
            <button onClick={onClose} className="w-9 h-9 rounded-full bg-surface-container dark:bg-white/5 flex items-center justify-center text-on-surface dark:text-white cursor-pointer"><span className="material-symbols-outlined text-lg">close</span></button>
          </div>

          <div className="p-5 sm:p-6 space-y-4">
            <div className="rounded-2xl bg-gradient-to-br from-amber-500/10 to-transparent border border-amber-500/25 p-4">
              <p className="text-[11px] font-bold uppercase tracking-wide text-amber-700 dark:text-amber-400">Estimasi kebocoran / bulan</p>
              <p className="text-2xl font-black text-amber-700 dark:text-amber-300 mt-1 tabular-nums">{rp(monthlyBurn)}</p>
              <p className="text-[11px] text-on-surface-variant dark:text-slate-400 mt-0.5">≈ {rp(monthlyBurn * 12)}/tahun dari {fresh.length} langganan belum tercatat</p>
            </div>

            {cands.length === 0 ? (
              <p className="text-sm text-on-surface-variant dark:text-slate-400 text-center py-6">Tak terdeteksi pola langganan yang jelas (butuh ≥ 3 pembayaran berulang dengan nominal & selang stabil).</p>
            ) : (
              <div className="space-y-2">
                {cands.map((c) => {
                  const done = c.alreadyRecurring || added.has(c.key);
                  const conf = c.confidence >= 0.75 ? 'Tinggi' : c.confidence >= 0.5 ? 'Sedang' : 'Rendah';
                  return (
                    <div key={c.key} className="flex items-center gap-3 p-3 rounded-2xl border border-outline-variant/10 dark:border-white/5 bg-surface-container-low dark:bg-white/5">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 dark:bg-[#a7c8ff]/15 flex items-center justify-center text-primary dark:text-[#a7c8ff] shrink-0"><span className="material-symbols-outlined text-[20px]">{c.frequency === 'MONTHLY' ? 'calendar_month' : 'event_repeat'}</span></div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-on-surface dark:text-white truncate">{c.label}</p>
                        <p className="text-[11px] text-on-surface-variant dark:text-slate-400">{rp(c.amount)} · {c.frequency === 'MONTHLY' ? 'Bulanan' : 'Tahunan'} · {c.occurrences}× · keyakinan {conf}</p>
                      </div>
                      {done ? (
                        <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 shrink-0"><span className="material-symbols-outlined text-[16px]">check_circle</span>{c.alreadyRecurring ? 'Tercatat' : 'Ditambah'}</span>
                      ) : (
                        <button onClick={() => makeRecurring(c)} disabled={busy === c.key}
                          className="shrink-0 px-3 py-1.5 rounded-lg bg-primary dark:bg-[#a7c8ff] text-white dark:text-[#001b3c] text-[11px] font-bold disabled:opacity-50 cursor-pointer">
                          {busy === c.key ? '…' : '+ Berulang'}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            <p className="text-[10px] text-on-surface-variant/60 dark:text-slate-500">Deteksi otomatis dari riwayat — tak ada yang dicatat tanpa persetujuan Anda. "Jadikan Berulang" menambah entri ke Transaksi Berulang.</p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default SubscriptionScannerModal;
