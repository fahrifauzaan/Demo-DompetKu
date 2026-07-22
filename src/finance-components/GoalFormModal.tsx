import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useFinanceStore, type Goal } from '../store/useFinanceStore';
import { computeGoal, GOAL_PRESETS } from './goalUtils';

interface GoalFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingGoal: Goal | null;
}

const formatRp = (n: number) => `Rp ${Math.round(n || 0).toLocaleString('id-ID')}`;
const parseDigits = (s: string) => Number(s.replace(/\D/g, '')) || 0;
const addMonthsISO = (m: number) => { const d = new Date(); d.setMonth(d.getMonth() + m); return d.toISOString().slice(0, 10); };

const RETURN_PRESETS = [{ label: 'Konservatif', v: 4 }, { label: 'Moderat', v: 8 }, { label: 'Agresif', v: 12 }];

export const GoalFormModal: React.FC<GoalFormModalProps> = ({ isOpen, onClose, editingGoal }) => {
  const addGoal = useFinanceStore((s) => s.addGoal);
  const updateGoal = useFinanceStore((s) => s.updateGoal);

  const [form, setForm] = useState<Omit<Goal, 'id'>>({
    name: '', icon: 'flag', color: '#2563eb', goalType: 'goal', targetAmount: 0,
    targetDate: addMonthsISO(24), startDate: new Date().toISOString().slice(0, 10),
    initialAmount: 0, expectedReturn: 8, monthlyContribution: 0, priority: 2, status: 'Aktif', notes: '',
  });

  useEffect(() => {
    if (!isOpen) return;
    if (editingGoal) setForm({ ...editingGoal });
    else setForm({ name: '', icon: 'flag', color: '#2563eb', goalType: 'goal', targetAmount: 0, targetDate: addMonthsISO(24), startDate: new Date().toISOString().slice(0, 10), initialAmount: 0, expectedReturn: 8, monthlyContribution: 0, priority: 2, status: 'Aktif', notes: '' });
  }, [isOpen, editingGoal]);

  const set = (patch: Partial<Goal>) => setForm((f) => ({ ...f, ...patch }));
  const math = computeGoal({ ...form, id: 'preview' } as Goal);

  const applyPreset = (key: string) => {
    const p = GOAL_PRESETS.find((x) => x.key === key);
    if (!p) return;
    set({ name: p.name, icon: p.icon, color: p.color, goalType: p.goalType, expectedReturn: p.expectedReturn, priority: p.priority, targetDate: addMonthsISO(p.horizonMonths) });
  };

  const handleSave = async () => {
    if (!form.name.trim() || form.targetAmount <= 0) return;
    const payload = { ...form, expectedReturn: form.goalType === 'sinking' ? 0 : form.expectedReturn };
    if (editingGoal) await updateGoal({ ...payload, id: editingGoal.id });
    else await addGoal(payload);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-start sm:items-center justify-center p-2 sm:p-4 overflow-y-auto">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />
        <motion.div initial={{ opacity: 0, scale: 0.97, y: 24 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97, y: 24 }}
          transition={{ type: 'spring', damping: 28, stiffness: 240 }}
          className="relative w-full max-w-lg my-auto bg-surface dark:bg-[#121416] rounded-3xl shadow-2xl border border-outline-variant/20 dark:border-white/10 max-h-[94vh] overflow-y-auto custom-scrollbar">
          <div className="sticky top-0 z-10 flex items-center justify-between px-5 sm:px-6 py-4 bg-surface/95 dark:bg-[#121416]/95 backdrop-blur border-b border-outline-variant/10 dark:border-white/5">
            <h2 className="text-lg font-black font-headline text-on-surface dark:text-white">{editingGoal ? 'Ubah Tujuan' : 'Tujuan Keuangan Baru'}</h2>
            <button onClick={onClose} className="w-9 h-9 rounded-full bg-surface-container dark:bg-white/5 flex items-center justify-center text-on-surface dark:text-white cursor-pointer"><span className="material-symbols-outlined text-lg">close</span></button>
          </div>

          <div className="p-5 sm:p-6 space-y-4">
            {!editingGoal && (
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wide text-on-surface-variant dark:text-slate-400">Mulai dari template</label>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {GOAL_PRESETS.map((p) => (
                    <button key={p.key} onClick={() => applyPreset(p.key)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-surface-container-low dark:bg-white/5 border border-outline-variant/10 dark:border-white/10 text-on-surface dark:text-white hover:border-primary/50 cursor-pointer">
                      <span className="material-symbols-outlined text-[13px]" style={{ color: p.color }}>{p.icon}</span>{p.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1">
                <label className="text-[11px] font-bold text-on-surface-variant dark:text-slate-400">Nama tujuan</label>
                <input value={form.name} onChange={(e) => set({ name: e.target.value })} placeholder="mis. DP Rumah" className="w-full bg-surface-container-low dark:bg-white/5 border border-outline-variant/10 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm font-bold text-on-surface dark:text-white outline-none focus:border-primary/50" />
              </div>
              <div className="col-span-2 flex gap-2">
                {(['goal', 'sinking'] as const).map((gt) => (
                  <button key={gt} onClick={() => set({ goalType: gt })} className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${form.goalType === gt ? 'bg-primary/10 border-primary text-primary dark:text-[#a7c8ff] dark:border-[#a7c8ff]' : 'bg-surface-container-low dark:bg-white/5 border-outline-variant/10 text-on-surface-variant'}`}>
                    {gt === 'goal' ? '🎯 Tujuan Investasi' : '🔁 Sinking Fund'}
                  </button>
                ))}
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-on-surface-variant dark:text-slate-400">Target (Rp)</label>
                <input type="text" inputMode="numeric" value={form.targetAmount.toLocaleString('id-ID')} onChange={(e) => set({ targetAmount: parseDigits(e.target.value) })} className="w-full bg-surface-container-low dark:bg-white/5 border border-outline-variant/10 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm font-bold text-on-surface dark:text-white tabular-nums outline-none focus:border-primary/50" />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-on-surface-variant dark:text-slate-400">Sudah terkumpul (Rp)</label>
                <input type="text" inputMode="numeric" value={form.initialAmount.toLocaleString('id-ID')} onChange={(e) => set({ initialAmount: parseDigits(e.target.value) })} className="w-full bg-surface-container-low dark:bg-white/5 border border-outline-variant/10 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm font-bold text-on-surface dark:text-white tabular-nums outline-none focus:border-primary/50" />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-on-surface-variant dark:text-slate-400">Tanggal target</label>
                <input type="date" value={form.targetDate} onChange={(e) => set({ targetDate: e.target.value })} className="w-full bg-surface-container-low dark:bg-white/5 border border-outline-variant/10 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm font-bold text-on-surface dark:text-white outline-none focus:border-primary/50" />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-on-surface-variant dark:text-slate-400">Setoran/bln (Rp)</label>
                <input type="text" inputMode="numeric" value={form.monthlyContribution.toLocaleString('id-ID')} onChange={(e) => set({ monthlyContribution: parseDigits(e.target.value) })} className="w-full bg-surface-container-low dark:bg-white/5 border border-outline-variant/10 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm font-bold text-on-surface dark:text-white tabular-nums outline-none focus:border-primary/50" />
              </div>
              {form.goalType === 'goal' && (
                <div className="col-span-2 space-y-1.5">
                  <label className="text-[11px] font-bold text-on-surface-variant dark:text-slate-400">Asumsi return tahunan: <span className="text-primary dark:text-[#a7c8ff]">{form.expectedReturn}%</span></label>
                  <div className="flex gap-2">
                    {RETURN_PRESETS.map((rp) => (
                      <button key={rp.v} onClick={() => set({ expectedReturn: rp.v })} className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold border ${form.expectedReturn === rp.v ? 'bg-primary/10 border-primary text-primary dark:text-[#a7c8ff]' : 'bg-surface-container-low dark:bg-white/5 border-outline-variant/10 text-on-surface-variant'}`}>{rp.label} {rp.v}%</button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Live PMT suggestion */}
            {form.targetAmount > 0 && (
              <div className={`rounded-2xl p-3.5 border ${math.onTrack ? 'bg-emerald-500/10 border-emerald-500/25' : 'bg-amber-500/10 border-amber-500/25'}`}>
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-bold text-on-surface-variant dark:text-slate-300">Setoran ideal / bulan</span>
                  <span className="text-base font-black tabular-nums text-on-surface dark:text-white">{formatRp(math.suggestedPMT)}</span>
                </div>
                <p className="text-[10.5px] text-on-surface-variant dark:text-slate-400 mt-1 leading-relaxed">
                  {math.monthsLeft <= 0 ? 'Tanggal target sudah lewat — revisi tanggalnya.' :
                    math.onTrack ? `Dengan setoran ${formatRp(form.monthlyContribution)}/bln, proyeksi ${formatRp(math.projectedEnd)} — On Track! 🎉` :
                    `Setoran ${formatRp(form.monthlyContribution)}/bln menghasilkan ${formatRp(math.projectedEnd)} (kurang ${formatRp(math.shortfall)}).`}
                </p>
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button onClick={onClose} className="flex-1 py-3 rounded-2xl bg-surface-container dark:bg-white/10 text-on-surface dark:text-white font-bold text-sm border border-outline-variant/20 dark:border-white/10 cursor-pointer">Batal</button>
              <button onClick={handleSave} disabled={!form.name.trim() || form.targetAmount <= 0} className="flex-1 py-3 rounded-2xl bg-primary dark:bg-[#a7c8ff] text-white dark:text-[#001b3c] font-bold text-sm disabled:opacity-40 cursor-pointer">{editingGoal ? 'Simpan' : 'Buat Tujuan'}</button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default GoalFormModal;
