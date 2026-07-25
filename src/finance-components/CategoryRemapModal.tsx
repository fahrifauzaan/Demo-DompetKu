import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useFinanceStore } from '../store/useFinanceStore';

interface Props { isOpen: boolean; onClose: () => void }

/**
 * Samakan Kategori — ganti nama kategori transaksi secara massal agar cocok dengan kategori Anggaran.
 * Menampilkan HANYA kategori transaksi yang belum cocok (case-insensitive) + jumlah transaksinya,
 * lalu memetakannya ke kategori Anggaran lewat satu batchUpdate (via store.renameTransactionCategories).
 */
export const CategoryRemapModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const transactions = useFinanceStore((s) => s.transactions);
  const budgetCategories = useFinanceStore((s) => s.budgetCategories);
  const renameTransactionCategories = useFinanceStore((s) => s.renameTransactionCategories);

  const budgetNames = useMemo(() => budgetCategories.map((c) => c.name).filter(Boolean), [budgetCategories]);
  const budgetSet = useMemo(() => new Set(budgetNames.map((n) => n.toLowerCase())), [budgetNames]);

  // Kategori transaksi yang TIDAK cocok dengan kategori Anggaran (case-insensitive), + jumlahnya.
  const unmatched = useMemo(() => {
    const counts = new Map<string, number>();
    for (const t of transactions) {
      const c = (t.category || '').trim();
      if (!c || budgetSet.has(c.toLowerCase())) continue;
      counts.set(c, (counts.get(c) || 0) + 1);
    }
    return [...counts.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
  }, [transactions, budgetSet]);

  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<number | null>(null);

  const activeCount = Object.values(mapping).filter((v) => v && v.trim()).length;

  const apply = async () => {
    if (busy || !activeCount) return;
    setBusy(true);
    const res = await renameTransactionCategories(mapping);
    setBusy(false);
    setDone(res.updated);
  };

  const reset = () => { setMapping({}); setDone(null); };

  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-start sm:items-center justify-center p-2 sm:p-4 overflow-y-auto">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />
        <motion.div
          initial={{ opacity: 0, scale: 0.97, y: 24 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97, y: 24 }}
          transition={{ type: 'spring', damping: 28, stiffness: 240 }}
          className="relative w-full max-w-lg my-auto bg-surface dark:bg-[#121416] rounded-3xl shadow-2xl border border-outline-variant/20 dark:border-white/10 max-h-[94vh] overflow-y-auto custom-scrollbar">
          <div className="sticky top-0 z-10 flex items-center justify-between px-5 sm:px-6 py-4 bg-surface/95 dark:bg-[#121416]/95 backdrop-blur border-b border-outline-variant/10 dark:border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-primary/10 dark:bg-[#a7c8ff]/15 flex items-center justify-center text-primary dark:text-[#a7c8ff]"><span className="material-symbols-outlined">sync_alt</span></div>
              <h2 className="text-lg font-black font-headline text-on-surface dark:text-white">Samakan Kategori</h2>
            </div>
            <button onClick={onClose} className="w-9 h-9 rounded-full bg-surface-container dark:bg-white/5 flex items-center justify-center text-on-surface dark:text-white cursor-pointer"><span className="material-symbols-outlined text-lg">close</span></button>
          </div>

          <div className="p-5 sm:p-6 space-y-4">
            {done !== null ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-3"><span className="material-symbols-outlined text-3xl">task_alt</span></div>
                <h3 className="text-lg font-black text-on-surface dark:text-white">{done} transaksi diperbarui</h3>
                <p className="text-xs text-on-surface-variant dark:text-slate-400 mt-1">Kategori sudah disamakan. Cek lagi Anggaran vs Aktual.</p>
                <div className="flex gap-2 justify-center mt-5">
                  <button onClick={reset} className="px-5 py-2.5 rounded-xl bg-surface-container dark:bg-white/10 text-on-surface dark:text-white font-bold text-sm cursor-pointer">Samakan lagi</button>
                  <button onClick={onClose} className="px-5 py-2.5 rounded-xl bg-primary dark:bg-[#a7c8ff] text-white dark:text-[#001b3c] font-bold text-sm cursor-pointer">Selesai</button>
                </div>
              </div>
            ) : unmatched.length === 0 ? (
              <div className="text-center py-8">
                <span className="material-symbols-outlined text-4xl text-emerald-600 dark:text-emerald-400 mb-2 block" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                <p className="text-sm font-bold text-on-surface dark:text-white">Semua kategori transaksi sudah cocok</p>
                <p className="text-xs text-on-surface-variant dark:text-slate-400 mt-1">Tak ada yang perlu disamakan dengan kategori Anggaran.</p>
              </div>
            ) : (
              <>
                <p className="text-xs text-on-surface-variant dark:text-slate-300 leading-relaxed">
                  Kategori transaksi berikut <strong className="text-on-surface dark:text-white">belum cocok</strong> dengan kategori Anggaran, jadi tak terhitung di Budget vs Aktual. Petakan ke kategori Anggaran-mu, lalu <strong className="text-on-surface dark:text-white">Terapkan</strong>.
                </p>
                <div className="space-y-2">
                  {unmatched.map((u) => (
                    <div key={u.name} className="flex items-center gap-2 rounded-2xl bg-surface-container-lowest dark:bg-white/5 border border-outline-variant/10 dark:border-white/10 p-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-on-surface dark:text-white truncate">{u.name}</p>
                        <p className="text-[11px] text-on-surface-variant dark:text-slate-400">{u.count} transaksi</p>
                      </div>
                      <span className="material-symbols-outlined text-on-surface-variant dark:text-slate-500 text-lg shrink-0">arrow_forward</span>
                      <select
                        value={mapping[u.name] || ''}
                        onChange={(e) => setMapping((m) => ({ ...m, [u.name]: e.target.value }))}
                        className="w-36 sm:w-40 shrink-0 bg-surface-container-low dark:bg-white/5 border border-outline-variant/10 dark:border-white/10 rounded-xl px-2.5 py-2 text-xs font-bold text-on-surface dark:text-white outline-none focus:border-primary/50 cursor-pointer">
                        <option value="">— biarkan —</option>
                        {budgetNames.map((n) => <option key={n} value={n}>{n}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
                <p className="text-[10.5px] text-on-surface-variant/70 dark:text-slate-500 leading-relaxed">Perubahan berlaku ke semua transaksi berkategori itu, dan tersimpan ke Google Sheet-mu. Yang "biarkan" tak diubah.</p>
                <button onClick={apply} disabled={busy || !activeCount} className="w-full py-3 rounded-2xl bg-primary dark:bg-[#a7c8ff] text-white dark:text-[#001b3c] font-bold text-sm disabled:opacity-40 cursor-pointer">
                  {busy ? 'Menyamakan…' : `Terapkan (${activeCount} kategori)`}
                </button>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};

export default CategoryRemapModal;
