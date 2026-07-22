import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useFinanceStore, type Recurring } from '../store/useFinanceStore';
import { dueRecurrings, nextOccurrenceFor, FREQ_LABEL, WEEKDAYS_ID } from './recurringUtils';
import { formatDayBadge } from './calendarUtils';

interface RecurringManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const formatRp = (n: number) => `Rp ${Math.round(n || 0).toLocaleString('id-ID')}`;
const parseDigits = (s: string) => Number(s.replace(/\D/g, '')) || 0;
const todayISO = () => new Date().toISOString().slice(0, 10);

const emptyForm = (): Omit<Recurring, 'id'> => ({
  name: '', type: 'PENGELUARAN', amount: 0, category: 'Lainnya', account: '', frequency: 'MONTHLY',
  dayOfMonth: 1, startDate: todayISO(), endDate: '', lastPostedDate: '', autoPost: false, notes: '',
});

export const RecurringManagerModal: React.FC<RecurringManagerModalProps> = ({ isOpen, onClose }) => {
  const recurring = useFinanceStore((s) => s.recurring);
  const accounts = useFinanceStore((s) => s.accounts);
  const budgetCategories = useFinanceStore((s) => s.budgetCategories);
  const addRecurring = useFinanceStore((s) => s.addRecurring);
  const updateRecurring = useFinanceStore((s) => s.updateRecurring);
  const deleteRecurring = useFinanceStore((s) => s.deleteRecurring);
  const addTransaction = useFinanceStore((s) => s.addTransaction);
  const updateAccount = useFinanceStore((s) => s.updateAccount);

  const [view, setView] = useState<'list' | 'form'>('list');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<Recurring, 'id'>>(emptyForm());

  const due = useMemo(() => dueRecurrings(recurring), [recurring]);
  const set = (patch: Partial<Recurring>) => setForm((f) => ({ ...f, ...patch }));

  const openAdd = () => { setEditingId(null); setForm({ ...emptyForm(), account: accounts[0]?.name || '' }); setView('form'); };
  const openEdit = (r: Recurring) => { setEditingId(r.id); setForm({ ...r }); setView('form'); };

  const save = async () => {
    if (!form.name.trim() || form.amount <= 0) return;
    if (editingId) await updateRecurring({ ...form, id: editingId });
    else await addRecurring(form);
    setView('list');
  };

  const postOccurrence = async (rec: Recurring, dueDate: Date) => {
    const finalAmount = rec.type === 'PEMASUKAN' ? Math.abs(rec.amount) : -Math.abs(rec.amount);
    await addTransaction({
      date: dueDate.toISOString().slice(0, 10),
      desc: `↻ ${rec.name}`,
      location: 'Recurring',
      amount: finalAmount,
      category: rec.category || 'Lainnya',
      icon: rec.type === 'PEMASUKAN' ? 'payments' : 'sync',
      status: 'Selesai',
      account: rec.account,
      type: rec.type,
    });
    const acc = accounts.find((a) => a.name === rec.account);
    if (acc) await updateAccount({ ...acc, balance: acc.balance + finalAmount });
    await updateRecurring({ ...rec, lastPostedDate: dueDate.toISOString().slice(0, 10) });
  };

  const skipOccurrence = async (rec: Recurring, dueDate: Date) => {
    await updateRecurring({ ...rec, lastPostedDate: dueDate.toISOString().slice(0, 10) });
  };

  if (!isOpen) return null;

  const expenseCats = budgetCategories.filter((c) => c.type === 'Pengeluaran');
  const incomeCats = budgetCategories.filter((c) => c.type === 'Pemasukan');
  const catOptions = (form.type === 'PEMASUKAN' ? incomeCats : expenseCats).map((c) => c.name);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[115] flex items-start sm:items-center justify-center p-2 sm:p-4 overflow-y-auto">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />
        <motion.div initial={{ opacity: 0, scale: 0.97, y: 24 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97, y: 24 }}
          transition={{ type: 'spring', damping: 28, stiffness: 240 }}
          className="relative w-full max-w-lg my-auto bg-surface dark:bg-[#121416] rounded-3xl shadow-2xl border border-outline-variant/20 dark:border-white/10 max-h-[94vh] overflow-y-auto custom-scrollbar">
          <div className="sticky top-0 z-10 flex items-center justify-between px-5 sm:px-6 py-4 bg-surface/95 dark:bg-[#121416]/95 backdrop-blur border-b border-outline-variant/10 dark:border-white/5">
            <div className="flex items-center gap-2">
              {view === 'form' && <button onClick={() => setView('list')} className="w-8 h-8 rounded-full hover:bg-surface-container dark:hover:bg-white/10 flex items-center justify-center cursor-pointer"><span className="material-symbols-outlined text-lg text-on-surface dark:text-white">arrow_back</span></button>}
              <h2 className="text-lg font-black font-headline text-on-surface dark:text-white">{view === 'form' ? (editingId ? 'Ubah Berulang' : 'Transaksi Berulang Baru') : 'Transaksi Berulang'}</h2>
            </div>
            <button onClick={onClose} className="w-9 h-9 rounded-full bg-surface-container dark:bg-white/5 flex items-center justify-center text-on-surface dark:text-white cursor-pointer"><span className="material-symbols-outlined text-lg">close</span></button>
          </div>

          {view === 'list' ? (
            <div className="p-5 sm:p-6 space-y-4">
              {/* Jatuh tempo */}
              {due.length > 0 && (
                <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 space-y-2">
                  <p className="text-xs font-black text-amber-800 dark:text-amber-200 flex items-center gap-1.5"><span className="material-symbols-outlined text-[16px]">notifications_active</span> {due.length} transaksi jatuh tempo</p>
                  {due.map(({ rec, dueDate }) => (
                    <div key={rec.id} className="flex items-center justify-between gap-2 bg-surface dark:bg-white/5 rounded-xl px-3 py-2">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-on-surface dark:text-white truncate">{rec.name}</p>
                        <p className="text-[10px] text-on-surface-variant dark:text-slate-400">{rec.type === 'PEMASUKAN' ? '+' : '−'}{formatRp(rec.amount)} · {formatDayBadge(dueDate).day} {formatDayBadge(dueDate).month}</p>
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        <button onClick={() => postOccurrence(rec, dueDate)} className="px-3 py-1.5 rounded-lg bg-primary dark:bg-[#a7c8ff] text-white dark:text-[#001b3c] text-[11px] font-bold cursor-pointer">Posting</button>
                        <button onClick={() => skipOccurrence(rec, dueDate)} className="px-2.5 py-1.5 rounded-lg bg-surface-container dark:bg-white/10 text-on-surface-variant text-[11px] font-bold cursor-pointer">Lewati</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <button onClick={openAdd} className="w-full py-2.5 rounded-2xl bg-primary/10 dark:bg-[#a7c8ff]/10 text-primary dark:text-[#a7c8ff] font-bold text-sm border border-primary/20 dark:border-[#a7c8ff]/20 flex items-center justify-center gap-2 cursor-pointer"><span className="material-symbols-outlined">add</span> Tambah Transaksi Berulang</button>

              {recurring.length === 0 ? (
                <p className="text-center text-xs text-on-surface-variant dark:text-slate-400 py-6">Belum ada. Tambahkan gaji, cicilan, langganan, dsb. untuk pengingat & proyeksi kas.</p>
              ) : (
                <div className="space-y-2">
                  {recurring.map((r) => {
                    const next = nextOccurrenceFor(r);
                    return (
                      <div key={r.id} className="flex items-center justify-between gap-2 rounded-2xl border border-outline-variant/10 dark:border-white/10 p-3">
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-on-surface dark:text-white truncate">{r.name}</p>
                          <p className="text-[10px] text-on-surface-variant dark:text-slate-400">{FREQ_LABEL[r.frequency]} · {r.frequency === 'WEEKLY' ? WEEKDAYS_ID[r.dayOfMonth] : `tgl ${r.dayOfMonth}`} · berikutnya {next ? `${formatDayBadge(next).day} ${formatDayBadge(next).month}` : '-'}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`text-xs font-black tabular-nums ${r.type === 'PEMASUKAN' ? 'text-emerald-600 dark:text-emerald-400' : 'text-error dark:text-[#ffb4ab]'}`}>{r.type === 'PEMASUKAN' ? '+' : '−'}{formatRp(r.amount)}</span>
                          <button onClick={() => openEdit(r)} className="w-7 h-7 rounded-lg hover:bg-surface-container dark:hover:bg-white/10 flex items-center justify-center text-on-surface-variant cursor-pointer"><span className="material-symbols-outlined text-[15px]">edit</span></button>
                          <button onClick={() => deleteRecurring(r.id)} className="w-7 h-7 rounded-lg hover:bg-error/10 flex items-center justify-center text-on-surface-variant hover:text-error cursor-pointer"><span className="material-symbols-outlined text-[15px]">delete</span></button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="p-5 sm:p-6 space-y-3">
              <div className="flex gap-2">
                {(['PENGELUARAN', 'PEMASUKAN'] as const).map((t) => (
                  <button key={t} onClick={() => set({ type: t })} className={`flex-1 py-2 rounded-xl text-xs font-bold border ${form.type === t ? (t === 'PEMASUKAN' ? 'bg-emerald-500/10 border-emerald-500 text-emerald-700 dark:text-emerald-300' : 'bg-error/10 border-error text-error dark:text-[#ffb4ab]') : 'bg-surface-container-low dark:bg-white/5 border-outline-variant/10 text-on-surface-variant'}`}>{t === 'PEMASUKAN' ? 'Pemasukan' : 'Pengeluaran'}</button>
                ))}
              </div>
              <input value={form.name} onChange={(e) => set({ name: e.target.value })} placeholder="Nama (mis. Gaji, Netflix, Cicilan)" className="w-full bg-surface-container-low dark:bg-white/5 border border-outline-variant/10 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm font-bold text-on-surface dark:text-white outline-none focus:border-primary/50" />
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-on-surface-variant dark:text-slate-400">Nominal (Rp)</label>
                  <input type="text" inputMode="numeric" value={form.amount.toLocaleString('id-ID')} onChange={(e) => set({ amount: parseDigits(e.target.value) })} className="w-full bg-surface-container-low dark:bg-white/5 border border-outline-variant/10 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm font-bold text-on-surface dark:text-white tabular-nums outline-none focus:border-primary/50" />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-on-surface-variant dark:text-slate-400">Akun</label>
                  <select value={form.account} onChange={(e) => set({ account: e.target.value })} className="w-full bg-surface-container-low dark:bg-white/5 border border-outline-variant/10 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm font-bold text-on-surface dark:text-white outline-none focus:border-primary/50 cursor-pointer">
                    <option value="">Pilih akun</option>
                    {accounts.map((a) => <option key={a.id} value={a.name}>{a.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-on-surface-variant dark:text-slate-400">Kategori</label>
                  <select value={form.category} onChange={(e) => set({ category: e.target.value })} className="w-full bg-surface-container-low dark:bg-white/5 border border-outline-variant/10 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm font-bold text-on-surface dark:text-white outline-none focus:border-primary/50 cursor-pointer">
                    <option value="Lainnya">Lainnya</option>
                    {catOptions.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-on-surface-variant dark:text-slate-400">Frekuensi</label>
                  <select value={form.frequency} onChange={(e) => set({ frequency: e.target.value as Recurring['frequency'] })} className="w-full bg-surface-container-low dark:bg-white/5 border border-outline-variant/10 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm font-bold text-on-surface dark:text-white outline-none focus:border-primary/50 cursor-pointer">
                    <option value="MONTHLY">Bulanan</option>
                    <option value="WEEKLY">Mingguan</option>
                    <option value="YEARLY">Tahunan</option>
                  </select>
                </div>
                <div className="space-y-1 col-span-2">
                  <label className="text-[11px] font-bold text-on-surface-variant dark:text-slate-400">{form.frequency === 'WEEKLY' ? 'Hari' : form.frequency === 'YEARLY' ? 'Tanggal mulai (menentukan bln+tgl)' : 'Tanggal tiap bulan'}</label>
                  {form.frequency === 'WEEKLY' ? (
                    <select value={form.dayOfMonth} onChange={(e) => set({ dayOfMonth: Number(e.target.value) })} className="w-full bg-surface-container-low dark:bg-white/5 border border-outline-variant/10 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm font-bold text-on-surface dark:text-white outline-none focus:border-primary/50 cursor-pointer">
                      {[1, 2, 3, 4, 5, 6, 7].map((d) => <option key={d} value={d}>{WEEKDAYS_ID[d]}</option>)}
                    </select>
                  ) : form.frequency === 'YEARLY' ? (
                    <input type="date" value={form.startDate} onChange={(e) => set({ startDate: e.target.value })} className="w-full bg-surface-container-low dark:bg-white/5 border border-outline-variant/10 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm font-bold text-on-surface dark:text-white outline-none focus:border-primary/50" />
                  ) : (
                    <input type="number" min={1} max={31} value={form.dayOfMonth} onChange={(e) => set({ dayOfMonth: Math.max(1, Math.min(31, Number(e.target.value))) })} className="w-full bg-surface-container-low dark:bg-white/5 border border-outline-variant/10 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm font-bold text-on-surface dark:text-white tabular-nums outline-none focus:border-primary/50" />
                  )}
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={() => setView('list')} className="flex-1 py-3 rounded-2xl bg-surface-container dark:bg-white/10 text-on-surface dark:text-white font-bold text-sm cursor-pointer">Batal</button>
                <button onClick={save} disabled={!form.name.trim() || form.amount <= 0 || !form.account} className="flex-1 py-3 rounded-2xl bg-primary dark:bg-[#a7c8ff] text-white dark:text-[#001b3c] font-bold text-sm disabled:opacity-40 cursor-pointer">{editingId ? 'Simpan' : 'Tambah'}</button>
              </div>
              <p className="text-[10px] text-on-surface-variant/70 dark:text-slate-500 text-center">Transaksi berulang hanya <strong>mengingatkan</strong> — Anda tetap yang menekan "Posting". Tidak ada pencatatan otomatis diam-diam.</p>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default RecurringManagerModal;
