import React, { useMemo, useState } from 'react';
import { FeatureCTA } from './MarketingCTAModal';
import { useFinanceStore, type Goal } from '../store/useFinanceStore';
import { computeGoal, parseGoalLink } from './goalUtils';
import GoalFormModal from './GoalFormModal';
import FinanceGuidePrinciple from './FinanceGuidePrinciple';

interface FinanceGoalsProps {
  onShowCTA: (feature?: FeatureCTA) => void;
  onNavigate?: (tab: string) => void;
}

const formatRp = (n: number) => `Rp ${Math.round(n || 0).toLocaleString('id-ID')}`;
const formatRpShort = (n: number) => {
  const a = Math.abs(n);
  if (a >= 1e9) return `Rp ${(n / 1e9).toFixed(1)} M`;
  if (a >= 1e6) return `Rp ${(n / 1e6).toFixed(1)} jt`;
  return formatRp(n);
};
const parseDigits = (s: string) => Number(s.replace(/\D/g, '')) || 0;

const FinanceGoals: React.FC<FinanceGoalsProps> = ({ onNavigate }) => {
  const goals = useFinanceStore((s) => s.goals);
  const transactions = useFinanceStore((s) => s.transactions);
  const accounts = useFinanceStore((s) => s.accounts);
  const assets = useFinanceStore((s) => s.assets);
  const updateGoal = useFinanceStore((s) => s.updateGoal);
  const deleteGoal = useFinanceStore((s) => s.deleteGoal);

  // Resolve linked balance (account balance / asset currentValue) for a goal, if linked.
  const resolveLinked = (g: Goal): { linked: boolean; value: number; name: string } => {
    const { linkedId } = parseGoalLink(g.notes);
    if (!linkedId) return { linked: false, value: g.initialAmount, name: '' };
    const acc = accounts.find((a) => a.id === linkedId);
    if (acc) return { linked: true, value: acc.balance || 0, name: acc.name };
    const ast = assets.find((a) => a.id === linkedId);
    if (ast) return { linked: true, value: ast.currentValue || 0, name: ast.title };
    return { linked: false, value: g.initialAmount, name: '' };
  };

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [fundingGoal, setFundingGoal] = useState<Goal | null>(null);
  const [fundInput, setFundInput] = useState('');

  const activeGoals = goals.filter((g) => g.status !== 'Dibatalkan');
  const investGoals = activeGoals.filter((g) => g.goalType !== 'sinking');
  const sinkingGoals = activeGoals.filter((g) => g.goalType === 'sinking');

  // Sisa kas bulanan (pendapatan − pengeluaran rata-rata 3 bln)
  const surplusCash = useMemo(() => {
    const now = new Date();
    let inc = 0, exp = 0; const im = new Set<string>(), em = new Set<string>();
    transactions.forEach((t) => {
      const d = new Date(t.date); if (isNaN(d.getTime())) return;
      const diff = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
      if (diff < 0 || diff >= 3) return;
      const mk = `${d.getFullYear()}-${d.getMonth()}`;
      if (t.type === 'PEMASUKAN') { inc += Math.abs(t.amount || 0); im.add(mk); }
      else if (t.type === 'PENGELUARAN') { exp += Math.abs(t.amount || 0); em.add(mk); }
    });
    return inc / Math.max(1, im.size) - exp / Math.max(1, em.size);
  }, [transactions]);

  const totalCommitment = activeGoals.reduce((s, g) => s + (g.monthlyContribution || 0), 0);
  const overCommitted = surplusCash > 0 && totalCommitment > surplusCash;

  const openAdd = () => { setEditingGoal(null); setIsFormOpen(true); };
  const openEdit = (g: Goal) => { setEditingGoal(g); setIsFormOpen(true); };
  const openFund = (g: Goal) => { setFundingGoal(g); setFundInput(String(g.initialAmount || 0)); };
  const saveFund = async () => {
    if (!fundingGoal) return;
    const amount = parseDigits(fundInput);
    const reached = amount >= fundingGoal.targetAmount;
    await updateGoal({ ...fundingGoal, initialAmount: amount, status: reached ? 'Tercapai' : 'Aktif' });
    setFundingGoal(null);
  };

  const GoalCard: React.FC<{ g: Goal }> = ({ g }) => {
    const link = resolveLinked(g);
    const gEff = { ...g, initialAmount: link.value };
    const m = computeGoal(gEff);
    const reached = g.status === 'Tercapai' || link.value >= g.targetAmount;
    return (
      <div className="bg-surface-container-lowest dark:bg-white/[0.03] border border-outline-variant/10 dark:border-white/10 rounded-2xl p-4 sm:p-5 flex flex-col gap-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${g.color}1a`, color: g.color }}>
              <span className="material-symbols-outlined">{g.icon || 'flag'}</span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-black text-on-surface dark:text-white truncate">{g.name}</p>
              <p className="text-[10px] text-on-surface-variant dark:text-slate-400">{m.overdue ? 'Target terlewat' : m.monthsLeft <= 0 ? 'Jatuh tempo' : `${m.monthsLeft} bln lagi`}</p>
            </div>
          </div>
          <div className="flex gap-1 shrink-0">
            <button onClick={() => openEdit(g)} className="w-7 h-7 rounded-lg hover:bg-surface-container dark:hover:bg-white/10 flex items-center justify-center text-on-surface-variant cursor-pointer"><span className="material-symbols-outlined text-[16px]">edit</span></button>
            <button onClick={() => deleteGoal(g.id)} className="w-7 h-7 rounded-lg hover:bg-error/10 flex items-center justify-center text-on-surface-variant hover:text-error cursor-pointer"><span className="material-symbols-outlined text-[16px]">delete</span></button>
          </div>
        </div>

        <div>
          <div className="flex justify-between items-end mb-1">
            <span className="text-xs font-black tabular-nums text-on-surface dark:text-white">{formatRpShort(link.value)}</span>
            <span className="text-[10px] text-on-surface-variant dark:text-slate-400">dari {formatRpShort(g.targetAmount)}</span>
          </div>
          <div className="h-2 bg-surface-container-high dark:bg-white/10 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${m.progressPct}%`, backgroundColor: g.color }} />
          </div>
        </div>

        <div className="flex items-center justify-between">
          {reached ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"><span className="material-symbols-outlined text-[12px]">check_circle</span> Tercapai</span>
          ) : m.overdue ? (
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-error/10 text-error dark:text-[#ffb4ab]">Terlewat</span>
          ) : (
            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${m.onTrack ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : 'bg-amber-500/10 text-amber-700 dark:text-amber-300'}`}>{m.onTrack ? 'On Track' : 'Off Track'}</span>
          )}
          <span className="text-[10px] text-on-surface-variant dark:text-slate-400">Butuh <strong className="text-on-surface dark:text-white">{formatRpShort(m.suggestedPMT)}</strong>/bln</span>
        </div>
        {link.linked ? (
          <div className="w-full py-2 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[11px] font-bold flex items-center justify-center gap-1.5 border border-emerald-500/20">
            <span className="material-symbols-outlined text-[14px]">link</span> Tertaut ke {link.name} · otomatis
          </div>
        ) : !reached ? (
          <button onClick={() => openFund(g)} className="w-full py-2 rounded-xl bg-surface-container dark:bg-white/5 text-xs font-bold text-primary dark:text-[#a7c8ff] hover:bg-surface-container-high dark:hover:bg-white/10 border border-outline-variant/10 dark:border-white/10 cursor-pointer">
            Update dana terkumpul
          </button>
        ) : null}
      </div>
    );
  };

  return (
    <div className="space-y-6 lg:space-y-8 animate-in fade-in duration-500 pb-12">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="font-headline text-2xl lg:text-3xl font-extrabold tracking-tight text-primary dark:text-[#a7c8ff]">Tujuan Keuangan</h2>
          <p className="text-on-surface-variant dark:text-outline text-sm mt-1">Rencanakan & lacak tujuan hidup Anda — dari dana darurat hingga pensiun.</p>
        </div>
        <button onClick={openAdd} className="bg-primary dark:bg-[#a7c8ff] text-white dark:text-[#001b3c] px-5 py-3 rounded-full font-bold shadow-lg hover:-translate-y-0.5 transition-all flex items-center gap-2 text-sm shrink-0">
          <span className="material-symbols-outlined">add</span> Tambah Tujuan
        </button>
      </header>

      {/* Ringkasan komitmen vs sisa kas */}
      {activeGoals.length > 0 && (
        <div className={`rounded-2xl p-4 sm:p-5 border ${overCommitted ? 'bg-amber-500/10 border-amber-500/30' : 'bg-surface-container-lowest dark:bg-white/[0.03] border-outline-variant/10 dark:border-white/10'}`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-on-surface-variant dark:text-slate-400">Total komitmen setoran</p>
              <p className="text-xl font-black tabular-nums text-on-surface dark:text-white">{formatRp(totalCommitment)}<span className="text-xs font-medium text-on-surface-variant">/bln</span></p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold uppercase tracking-wide text-on-surface-variant dark:text-slate-400">Sisa kas bulanan</p>
              <p className={`text-xl font-black tabular-nums ${surplusCash >= totalCommitment ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>{formatRp(surplusCash)}<span className="text-xs font-medium text-on-surface-variant">/bln</span></p>
            </div>
          </div>
          {overCommitted && (
            <p className="text-[11px] text-amber-800 dark:text-amber-200 mt-2 flex items-center gap-1.5"><span className="material-symbols-outlined text-[15px]">warning</span> Komitmen melebihi sisa kas — pertimbangkan menaikkan pendapatan, memangkas pengeluaran, atau merevisi target.</p>
          )}
        </div>
      )}

      {activeGoals.length === 0 ? (
        <div className="bg-surface-container-lowest dark:bg-white/5 rounded-2xl p-8 border border-outline-variant/10 dark:border-white/10 text-center flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-full bg-primary/10 dark:bg-[#a7c8ff]/15 flex items-center justify-center text-primary dark:text-[#a7c8ff]"><span className="material-symbols-outlined text-3xl">flag</span></div>
          <h3 className="font-bold text-on-surface dark:text-white">Belum ada tujuan</h3>
          <p className="text-xs text-outline max-w-sm">Mulai dari template (DP Rumah, Dana Pendidikan, Pensiun) atau buat tujuan Anda sendiri — DompetKu menghitung setoran bulanan idealnya.</p>
          <button onClick={openAdd} className="mt-1 px-5 py-2.5 rounded-full bg-primary dark:bg-[#a7c8ff] text-white dark:text-[#001b3c] font-bold text-sm cursor-pointer">Buat Tujuan Pertama</button>
        </div>
      ) : (
        <>
          {investGoals.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {investGoals.map((g) => <GoalCard key={g.id} g={g} />)}
            </div>
          )}
          {sinkingGoals.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-black uppercase tracking-wide text-on-surface-variant dark:text-slate-400 flex items-center gap-2"><span className="material-symbols-outlined text-[18px]">savings</span> Sinking Fund (tabungan siklus)</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {sinkingGoals.map((g) => <GoalCard key={g.id} g={g} />)}
              </div>
            </div>
          )}
        </>
      )}

      <FinanceGuidePrinciple
        heading="Prinsip Menetapkan Tujuan"
        points={[
          { icon: 'target', title: 'SMART & terukur', text: 'Tujuan yang baik punya nominal & tenggat jelas — DompetKu menghitung setoran bulanan idealnya (PMT).' },
          { icon: 'schedule', title: 'Horizon menentukan risiko', text: 'Tujuan < 3 tahun sebaiknya di instrumen aman (asumsi return rendah); jangka panjang boleh lebih agresif.' },
          { icon: 'savings', title: 'Sinking fund', text: 'Untuk pengeluaran siklus (THR, pajak, qurban): sisihkan tiap bulan agar tak mengganggu arus kas saat jatuh tempo.' },
          { icon: 'account_balance', title: 'Dahulukan dana darurat', text: 'Sebelum tujuan lain, amankan 3–6 bulan pengeluaran sebagai fondasi.' },
        ]}
      />

      <GoalFormModal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} editingGoal={editingGoal} />

      {/* Quick update dana terkumpul */}
      {fundingGoal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setFundingGoal(null)} />
          <div className="relative w-full max-w-sm bg-surface dark:bg-[#191c1e] rounded-3xl shadow-2xl border border-outline-variant/15 dark:border-white/10 p-5">
            <h3 className="text-base font-black text-on-surface dark:text-white mb-1">Update Dana Terkumpul</h3>
            <p className="text-xs text-on-surface-variant dark:text-slate-400 mb-4">{fundingGoal.name}</p>
            <div className="flex items-center gap-2 bg-surface-container-low dark:bg-white/5 px-4 py-3 rounded-2xl border border-outline-variant/10 dark:border-white/10 focus-within:border-primary/50">
              <span className="text-sm font-bold text-on-surface-variant dark:text-slate-400">Rp</span>
              <input type="text" inputMode="numeric" autoFocus value={parseDigits(fundInput).toLocaleString('id-ID')} onChange={(e) => setFundInput(e.target.value)} className="w-full bg-transparent border-none p-0 text-lg font-black text-on-surface dark:text-white tabular-nums outline-none focus:ring-0" />
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setFundingGoal(null)} className="flex-1 py-2.5 rounded-xl bg-surface-container dark:bg-white/10 text-on-surface dark:text-white font-bold text-sm cursor-pointer">Batal</button>
              <button onClick={saveFund} className="flex-1 py-2.5 rounded-xl bg-primary dark:bg-[#a7c8ff] text-white dark:text-[#001b3c] font-bold text-sm cursor-pointer">Simpan</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinanceGoals;
