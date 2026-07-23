import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useFinanceStore, type Retirement } from '../store/useFinanceStore';

const rp = (n: number) => 'Rp ' + Math.round(n).toLocaleString('id-ID');
const rpS = (n: number) => {
  const a = Math.abs(n);
  if (a >= 1e9) return 'Rp ' + (n / 1e9).toFixed(2).replace(/\.?0+$/, '') + 'M';
  if (a >= 1e6) return 'Rp ' + (n / 1e6).toFixed(0) + 'jt';
  return rp(n);
};

const PROG_TYPES: Retirement['progType'][] = ['JHT', 'JP', 'DPLK', 'DPPK', 'Lainnya'];
const EMPTY: Omit<Retirement, 'id'> = {
  name: '', progType: 'JHT', provider: 'BPJS Ketenagakerjaan', currentBalance: 0, monthlyContribution: 0,
  contributionType: 'nominal', employerContribution: 0, startDate: '', targetAge: 56, expectedReturn: 5, status: 'Aktif', notes: '',
};

/** FV: saldo tumbuh + iuran bulanan (karyawan+pemberi kerja) hingga usia target. */
function projectBalance(r: Retirement, currentAge: number): number {
  const years = Math.max(0, (r.targetAge || 56) - currentAge);
  const annualRet = (r.expectedReturn || 0) / 100;
  const monthly = (r.monthlyContribution || 0) + (r.employerContribution || 0);
  const mr = Math.pow(1 + annualRet, 1 / 12) - 1;
  let v = r.currentBalance || 0;
  for (let m = 0; m < years * 12; m++) v = v * (1 + mr) + monthly;
  return v;
}

const FinanceRetirementSection: React.FC = () => {
  const retirement = useFinanceStore((s) => s.retirement);
  const settings = useFinanceStore((s) => s.settings);
  const addRetirement = useFinanceStore((s) => s.addRetirement);
  const updateRetirement = useFinanceStore((s) => s.updateRetirement);
  const deleteRetirement = useFinanceStore((s) => s.deleteRetirement);

  const currentAge = Number(settings.find((s) => s.key === 'fi_current_age')?.value) || 30;
  const [editing, setEditing] = useState<Retirement | null>(null);
  const [form, setForm] = useState<Omit<Retirement, 'id'>>(EMPTY);
  const [open, setOpen] = useState(false);

  const totals = useMemo(() => {
    const now = retirement.reduce((s, r) => s + (r.currentBalance || 0), 0);
    const proj = retirement.reduce((s, r) => s + projectBalance(r, currentAge), 0);
    const monthly = retirement.reduce((s, r) => s + (r.monthlyContribution || 0) + (r.employerContribution || 0), 0);
    return { now, proj, monthly };
  }, [retirement, currentAge]);

  const startAdd = () => { setEditing(null); setForm(EMPTY); setOpen(true); };
  const startEdit = (r: Retirement) => { setEditing(r); const { id, ...rest } = r; setForm(rest); setOpen(true); };
  const save = () => {
    if (!form.name.trim()) return;
    if (editing) updateRetirement({ ...form, id: editing.id }); else addRetirement(form);
    setOpen(false);
  };
  const set = (patch: Partial<Omit<Retirement, 'id'>>) => setForm((f) => ({ ...f, ...patch }));

  return (
    <div className="liquid-glass rounded-2xl sm:rounded-[28px] border border-white/20 dark:border-white/10 p-4 sm:p-6 lg:p-7 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)]">
      <div className="flex items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-primary/10 dark:bg-[#a7c8ff]/15 flex items-center justify-center text-primary dark:text-[#a7c8ff]"><span className="material-symbols-outlined">elderly</span></div>
          <div>
            <h3 className="text-lg font-black font-headline text-on-surface dark:text-white leading-none">Dana Pensiun</h3>
            <p className="text-[11px] text-on-surface-variant dark:text-slate-400 mt-1">BPJS TK (JHT/JP) · DPLK · DPPK</p>
          </div>
        </div>
        <button onClick={startAdd} className="px-3 py-2 rounded-xl bg-primary dark:bg-[#a7c8ff] text-white dark:text-[#001b3c] text-xs font-bold flex items-center gap-1.5 cursor-pointer"><span className="material-symbols-outlined text-[18px]">add</span>Tambah</button>
      </div>

      {retirement.length === 0 ? (
        <div className="text-center py-6 text-sm text-on-surface-variant dark:text-slate-400">Belum ada program pensiun. Tambahkan JHT/JP BPJS TK atau DPLK Anda agar masuk proyeksi kekayaan.</div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2.5 mb-4">
            <Tile label="Saldo kini" value={rpS(totals.now)} />
            <Tile label={`Proyeksi usia ${retirement[0]?.targetAge || 56}`} value={rpS(totals.proj)} accent />
            <Tile label="Iuran/bln" value={rpS(totals.monthly)} />
          </div>
          <div className="space-y-2">
            {retirement.map((r) => (
              <div key={r.id} className="flex items-center gap-3 p-3 rounded-2xl border border-outline-variant/10 dark:border-white/5 bg-surface-container-low dark:bg-white/5">
                <span className="px-2 py-1 rounded-lg bg-primary/10 dark:bg-[#a7c8ff]/15 text-primary dark:text-[#a7c8ff] text-[10px] font-black shrink-0">{r.progType}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-on-surface dark:text-white truncate">{r.name}</p>
                  <p className="text-[11px] text-on-surface-variant dark:text-slate-400 truncate">{r.provider} · saldo {rpS(r.currentBalance)} · +{rpS((r.monthlyContribution || 0) + (r.employerContribution || 0))}/bln</p>
                </div>
                <div className="text-right shrink-0 hidden sm:block">
                  <p className="text-[10px] text-on-surface-variant dark:text-slate-400">proyeksi</p>
                  <p className="text-xs font-black text-primary dark:text-[#a7c8ff] tabular-nums">{rpS(projectBalance(r, currentAge))}</p>
                </div>
                <button onClick={() => startEdit(r)} className="w-8 h-8 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 flex items-center justify-center text-slate-500 cursor-pointer"><span className="material-symbols-outlined text-[18px]">edit</span></button>
                <button onClick={() => { if (window.confirm(`Hapus "${r.name}"?`)) deleteRetirement(r.id); }} className="w-8 h-8 rounded-full hover:bg-error/10 flex items-center justify-center text-error dark:text-[#ffb4ab] cursor-pointer"><span className="material-symbols-outlined text-[18px]">delete</span></button>
              </div>
            ))}
          </div>
        </>
      )}
      <p className="text-[10px] text-on-surface-variant/60 dark:text-slate-500 mt-3">Estimasi proyeksi dari return asumsi (usia kini {currentAge}, diatur di Pengaturan). Angka resmi rujuk BPJSTK/pengelola DPLK.</p>

      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-[120] flex items-start sm:items-center justify-center p-2 sm:p-4 overflow-y-auto">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 backdrop-blur-md" onClick={() => setOpen(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.97, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97, y: 20 }}
              className="relative w-full max-w-md my-auto bg-surface dark:bg-[#121416] rounded-3xl shadow-2xl border border-outline-variant/20 dark:border-white/10 max-h-[94vh] overflow-y-auto custom-scrollbar p-5 sm:p-6 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-black font-headline text-on-surface dark:text-white">{editing ? 'Ubah' : 'Tambah'} Dana Pensiun</h2>
                <button onClick={() => setOpen(false)} className="w-8 h-8 rounded-full bg-surface-container dark:bg-white/5 flex items-center justify-center cursor-pointer"><span className="material-symbols-outlined text-lg text-on-surface dark:text-white">close</span></button>
              </div>
              <Field label="Nama program"><input value={form.name} onChange={(e) => set({ name: e.target.value })} placeholder="mis. JHT BPJS TK" className={inputCls} /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Jenis"><select value={form.progType} onChange={(e) => set({ progType: e.target.value as Retirement['progType'] })} className={inputCls}>{PROG_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</select></Field>
                <Field label="Pengelola"><input value={form.provider} onChange={(e) => set({ provider: e.target.value })} className={inputCls} /></Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Saldo kini"><input type="number" value={form.currentBalance} onChange={(e) => set({ currentBalance: Number(e.target.value) || 0 })} className={inputCls} /></Field>
                <Field label="Iuran karyawan/bln"><input type="number" value={form.monthlyContribution} onChange={(e) => set({ monthlyContribution: Number(e.target.value) || 0 })} className={inputCls} /></Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Iuran pemberi kerja/bln"><input type="number" value={form.employerContribution} onChange={(e) => set({ employerContribution: Number(e.target.value) || 0 })} className={inputCls} /></Field>
                <Field label="Return asumsi (%/th)"><input type="number" step="0.5" value={form.expectedReturn} onChange={(e) => set({ expectedReturn: Number(e.target.value) || 0 })} className={inputCls} /></Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Usia target pensiun"><input type="number" value={form.targetAge} onChange={(e) => set({ targetAge: Number(e.target.value) || 56 })} className={inputCls} /></Field>
                <Field label="Status"><select value={form.status} onChange={(e) => set({ status: e.target.value })} className={inputCls}><option>Aktif</option><option>Nonaktif</option></select></Field>
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={() => setOpen(false)} className="flex-1 py-3 rounded-2xl bg-surface-container dark:bg-white/10 text-on-surface dark:text-white font-bold text-sm cursor-pointer">Batal</button>
                <button onClick={save} disabled={!form.name.trim()} className="flex-[2] py-3 rounded-2xl bg-primary dark:bg-[#a7c8ff] text-white dark:text-[#001b3c] font-bold text-sm disabled:opacity-40 cursor-pointer">{editing ? 'Simpan' : 'Tambah'}</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const inputCls = 'w-full bg-surface-container-low dark:bg-white/5 border border-outline-variant/10 dark:border-white/10 rounded-xl px-3 py-2 text-sm font-semibold text-on-surface dark:text-white outline-none focus:border-primary/50 tabular-nums';
const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="space-y-1"><label className="text-[11px] font-bold text-on-surface-variant dark:text-slate-400">{label}</label>{children}</div>
);
const Tile: React.FC<{ label: string; value: string; accent?: boolean }> = ({ label, value, accent }) => (
  <div className={`rounded-2xl p-3 border ${accent ? 'bg-primary/5 dark:bg-[#a7c8ff]/10 border-primary/15 dark:border-[#a7c8ff]/15' : 'bg-surface-container-low dark:bg-white/5 border-outline-variant/10 dark:border-white/5'}`}>
    <p className="text-[10px] font-bold uppercase tracking-wide text-on-surface-variant dark:text-slate-400">{label}</p>
    <p className={`text-sm sm:text-base font-black mt-1 tabular-nums ${accent ? 'text-primary dark:text-[#a7c8ff]' : 'text-on-surface dark:text-white'}`}>{value}</p>
  </div>
);

export default FinanceRetirementSection;
