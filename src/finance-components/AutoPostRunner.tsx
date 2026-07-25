import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useFinanceStore, type Transaction } from '../store/useFinanceStore';
import { dueRecurrings } from './recurringUtils';

/**
 * C.1 Auto-post transaksi berulang (opt-in). Saat aplikasi dibuka, memposting occurrence
 * jatuh tempo HANYA untuk item yang ditandai `autoPost` oleh user, lalu MENAMPILKAN digest
 * ringkasan — jadi tetap sepengetahuan user (menghormati prinsip "tak menulis diam-diam").
 */

const formatRp = (n: number) => `Rp ${Math.round(Math.abs(n) || 0).toLocaleString('id-ID')}`;

interface Posted { name: string; amount: number; type: string; }

const AutoPostRunner: React.FC = () => {
  const recurring = useFinanceStore((s) => s.recurring);
  const [digest, setDigest] = useState<Posted[] | null>(null);
  const [failed, setFailed] = useState<number | null>(null);
  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) return;
    if (!recurring || recurring.length === 0) return; // tunggu data ter-sync
    const due = dueRecurrings(recurring).filter((d) => d.rec.autoPost === true);
    ranRef.current = true;
    if (due.length === 0) return;

    (async () => {
      const store = useFinanceStore.getState();
      // Siapkan semua occurrence jatuh tempo + data pendamping untuk update pasca-tulis.
      const items = due.map(({ rec, dueDate }) => {
        const finalAmount = rec.type === 'PEMASUKAN' ? Math.abs(rec.amount) : -Math.abs(rec.amount);
        const dateISO = dueDate.toISOString().slice(0, 10);
        const payload: Omit<Transaction, 'id'> = {
          date: dateISO,
          desc: `↻ ${rec.name} (otomatis)`,
          location: 'Recurring (auto)',
          amount: finalAmount,
          category: rec.category || 'Lainnya',
          icon: rec.type === 'PEMASUKAN' ? 'payments' : 'sync',
          status: 'Selesai',
          account: rec.account,
          type: rec.type,
        };
        return { rec, dateISO, finalAmount, payload };
      });

      // Tulis SEMUA dalam satu batch terverifikasi (anti rate-limit + jujur, sama seperti Impor).
      // KRUSIAL: hanya majukan lastPostedDate & saldo bila transaksi BENAR tersimpan ke Sheet.
      // Kalau tidak, transaksi bisa hilang diam-diam padahal terlanjur ditandai "sudah diposting"
      // (lastPostedDate maju) → tak pernah dicoba lagi. Gate ini mencegah kehilangan senyap itu.
      const result = await store.addTransactionsBulk(items.map((i) => i.payload));
      if (!result.ok) {
        // Gagal simpan → JANGAN majukan lastPostedDate; biarkan dicoba lagi saat app dibuka lagi.
        // (store.saveError sudah di-set oleh addTransactionsBulk → indikator penyimpanan global tampil.)
        setFailed(items.length);
        return;
      }

      const posted: Posted[] = [];
      for (const { rec, dateISO, finalAmount } of items) {
        // saldo terbaru diambil fresh (bila beberapa item ke akun yang sama)
        const acc = useFinanceStore.getState().accounts.find((a) => a.name === rec.account);
        if (acc) await store.updateAccount({ ...acc, balance: acc.balance + finalAmount });
        await store.updateRecurring({ ...rec, lastPostedDate: dateISO });
        posted.push({ name: rec.name, amount: rec.amount, type: rec.type });
      }
      if (posted.length) setDigest(posted);
    })();
  }, [recurring]);

  // Notifikasi gagal — auto-post tak tersimpan, akan dicoba lagi (tetap sepengetahuan user).
  if (failed) {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 24, scale: 0.97 }}
          transition={{ type: 'spring', damping: 26, stiffness: 260 }}
          className="fixed bottom-4 right-4 z-[190] w-[calc(100vw-2rem)] max-w-sm print:hidden"
          role="alert"
        >
          <div className="bg-surface dark:bg-[#191c1e] border border-error/30 dark:border-[#ffb4ab]/25 rounded-2xl shadow-2xl shadow-black/25 overflow-hidden">
            <div className="flex items-start gap-3 px-4 py-3.5">
              <span className="material-symbols-outlined text-error dark:text-[#ffb4ab] text-xl shrink-0">sync_problem</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-black text-on-surface dark:text-white">Gagal memposting {failed} transaksi berulang</p>
                <p className="text-xs text-on-surface-variant dark:text-slate-400 mt-0.5 leading-relaxed">Belum tersimpan ke Google Sheets — akan dicoba lagi otomatis saat aplikasi dibuka lagi. Periksa koneksi Anda.</p>
              </div>
              <button onClick={() => setFailed(null)} className="w-7 h-7 rounded-full hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-center text-on-surface-variant shrink-0 cursor-pointer" aria-label="Tutup"><span className="material-symbols-outlined text-[16px]">close</span></button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  if (!digest || digest.length === 0) return null;

  const totalIn = digest.filter((p) => p.type === 'PEMASUKAN').reduce((s, p) => s + p.amount, 0);
  const totalOut = digest.filter((p) => p.type !== 'PEMASUKAN').reduce((s, p) => s + p.amount, 0);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 24, scale: 0.97 }}
        transition={{ type: 'spring', damping: 26, stiffness: 260 }}
        className="fixed bottom-4 right-4 z-[190] w-[calc(100vw-2rem)] max-w-sm print:hidden"
        role="status"
      >
        <div className="bg-surface dark:bg-[#191c1e] border border-outline-variant/15 dark:border-white/10 rounded-2xl shadow-2xl shadow-black/25 overflow-hidden">
          <div className="flex items-center justify-between gap-2 px-4 py-3 bg-primary/5 dark:bg-[#a7c8ff]/10 border-b border-outline-variant/10 dark:border-white/5">
            <div className="flex items-center gap-2 min-w-0">
              <span className="material-symbols-outlined text-primary dark:text-[#a7c8ff] text-xl">sync</span>
              <p className="text-sm font-black text-on-surface dark:text-white truncate">{digest.length} transaksi diposting otomatis</p>
            </div>
            <button onClick={() => setDigest(null)} className="w-7 h-7 rounded-full hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-center text-on-surface-variant shrink-0 cursor-pointer" aria-label="Tutup"><span className="material-symbols-outlined text-[16px]">close</span></button>
          </div>
          <div className="max-h-48 overflow-y-auto custom-scrollbar divide-y divide-outline-variant/10 dark:divide-white/5">
            {digest.map((p, i) => (
              <div key={i} className="flex items-center justify-between gap-2 px-4 py-2">
                <span className="text-xs font-semibold text-on-surface dark:text-slate-200 truncate">{p.name}</span>
                <span className={`text-xs font-black tabular-nums shrink-0 ${p.type === 'PEMASUKAN' ? 'text-emerald-600 dark:text-emerald-400' : 'text-error dark:text-[#ffb4ab]'}`}>{p.type === 'PEMASUKAN' ? '+' : '−'}{formatRp(p.amount)}</span>
              </div>
            ))}
          </div>
          <div className="px-4 py-2.5 bg-surface-container-low dark:bg-white/[0.03] flex items-center justify-between text-[11px] font-bold">
            <span className="text-on-surface-variant dark:text-slate-400">Net</span>
            <span className={`tabular-nums ${totalIn - totalOut >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-error dark:text-[#ffb4ab]'}`}>{totalIn - totalOut >= 0 ? '+' : '−'}{formatRp(totalIn - totalOut)}</span>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default AutoPostRunner;
