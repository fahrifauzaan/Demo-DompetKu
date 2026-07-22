import React, { useMemo, useState } from 'react';
import { useFinanceStore, type Insurance } from '../store/useFinanceStore';
import { INS_ICON, maskPolicy, premiumPerMonth, daysToRenewal, insuranceSummary, upIncomeReplacement, upExpenseMethod } from './insuranceUtils';
import FinanceGuidePrinciple from './FinanceGuidePrinciple';

const formatRp = (n: number) => `Rp ${Math.round(n || 0).toLocaleString('id-ID')}`;
const formatRpShort = (n: number) => {
  const a = Math.abs(n);
  if (a >= 1e9) return `Rp ${(n / 1e9).toFixed(1)} M`;
  if (a >= 1e6) return `Rp ${(n / 1e6).toFixed(0)} jt`;
  return formatRp(n);
};
const parseDigits = (s: string) => Number(s.replace(/\D/g, '')) || 0;
const todayISO = () => new Date().toISOString().slice(0, 10);

const emptyForm = (): Omit<Insurance, 'id'> => ({
  name: '', insType: 'Jiwa', provider: '', policyNumber: '', premium: 0, premiumFrequency: 'Tahunan',
  coverageAmount: 0, startDate: todayISO(), renewalDate: '', insured: '', beneficiary: '', status: 'Aktif', notes: '',
});

const FinanceInsuranceSection: React.FC = () => {
  const insurance = useFinanceStore((s) => s.insurance);
  const transactions = useFinanceStore((s) => s.transactions);
  const debts = useFinanceStore((s) => s.debts);
  const accounts = useFinanceStore((s) => s.accounts);
  const addInsurance = useFinanceStore((s) => s.addInsurance);
  const updateInsurance = useFinanceStore((s) => s.updateInsurance);
  const deleteInsurance = useFinanceStore((s) => s.deleteInsurance);

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<Insurance, 'id'>>(emptyForm());
  const [upOpen, setUpOpen] = useState(false);

  // Rata-rata pemasukan/pengeluaran tahunan (dari 12 bln terakhir)
  const { annualIncome, annualExpense, liquid, totalDebt } = useMemo(() => {
    const now = new Date();
    let inc = 0, exp = 0; const im = new Set<string>(), em = new Set<string>();
    transactions.forEach((t) => {
      const d = new Date(t.date); if (isNaN(d.getTime())) return;
      const diff = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
      if (diff < 0 || diff >= 12) return;
      const mk = `${d.getFullYear()}-${d.getMonth()}`;
      if (t.type === 'PEMASUKAN') { inc += Math.abs(t.amount || 0); im.add(mk); }
      else if (t.type === 'PENGELUARAN') { exp += Math.abs(t.amount || 0); em.add(mk); }
    });
    return {
      annualIncome: (inc / Math.max(1, im.size)) * 12,
      annualExpense: (exp / Math.max(1, em.size)) * 12,
      liquid: accounts.filter((a) => a.type === 'bank' || a.type === 'cash' || a.type === 'wallet').reduce((s, a) => s + (a.balance || 0), 0),
      totalDebt: debts.reduce((s, d) => s + (d.balance || 0), 0),
    };
  }, [transactions, accounts, debts]);

  const summary = useMemo(() => insuranceSummary(insurance, annualIncome), [insurance, annualIncome]);
  const set = (patch: Partial<Insurance>) => setForm((f) => ({ ...f, ...patch }));

  const openAdd = () => { setEditingId(null); setForm(emptyForm()); setFormOpen(true); };
  const openEdit = (p: Insurance) => { setEditingId(p.id); setForm({ ...p }); setFormOpen(true); };
  const save = async () => {
    if (!form.name.trim()) return;
    if (editingId) await updateInsurance({ ...form, id: editingId });
    else await addInsurance(form);
    setFormOpen(false);
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <h3 className="font-headline text-lg lg:text-xl font-bold tracking-tight dark:text-white flex items-center gap-2">
          <span className="material-symbols-outlined text-primary dark:text-[#a7c8ff]">shield</span> Proteksi & Asuransi
        </h3>
        <div className="flex gap-2">
          <button onClick={() => setUpOpen(true)} className="px-3 py-2 rounded-lg bg-surface-container-highest dark:bg-white/10 text-on-surface-variant dark:text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"><span className="material-symbols-outlined text-[16px]">calculate</span> Hitung UP</button>
          <button onClick={openAdd} className="px-3 py-2 rounded-lg bg-primary dark:bg-[#a7c8ff] text-white dark:text-[#001b3c] font-bold text-xs flex items-center gap-1.5 cursor-pointer"><span className="material-symbols-outlined text-[16px]">add</span> Tambah Polis</button>
        </div>
      </div>

      {/* Ringkasan */}
      {insurance.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-surface-container-lowest dark:bg-white/[0.03] rounded-2xl p-4 border border-outline-variant/10 dark:border-white/10">
            <p className="text-[10px] font-bold uppercase tracking-wide text-on-surface-variant dark:text-slate-400">Total premi</p>
            <p className="text-lg font-black tabular-nums text-on-surface dark:text-white">{formatRpShort(summary.totalPremiumMonthly)}<span className="text-xs font-medium text-on-surface-variant">/bln</span></p>
          </div>
          <div className="bg-surface-container-lowest dark:bg-white/[0.03] rounded-2xl p-4 border border-outline-variant/10 dark:border-white/10">
            <p className="text-[10px] font-bold uppercase tracking-wide text-on-surface-variant dark:text-slate-400">Rasio premi</p>
            <p className={`text-lg font-black tabular-nums ${summary.premiumRatio !== null && summary.premiumRatio > 0.1 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>{summary.premiumRatio !== null ? `${(summary.premiumRatio * 100).toFixed(1)}%` : '—'}</p>
            <p className="text-[9px] text-on-surface-variant/70 dark:text-slate-500">umumnya ideal ≤ 10% penghasilan</p>
          </div>
          <div className="bg-surface-container-lowest dark:bg-white/[0.03] rounded-2xl p-4 border border-outline-variant/10 dark:border-white/10">
            <p className="text-[10px] font-bold uppercase tracking-wide text-on-surface-variant dark:text-slate-400">Total UP Jiwa</p>
            <p className="text-lg font-black tabular-nums text-on-surface dark:text-white">{formatRpShort(summary.totalLifeCoverage)}</p>
          </div>
        </div>
      )}

      {insurance.length === 0 ? (
        <div className="bg-surface-container-lowest dark:bg-white/5 rounded-2xl p-6 border border-outline-variant/10 dark:border-white/10 text-center">
          <span className="material-symbols-outlined text-3xl text-primary dark:text-[#a7c8ff] mb-2">shield</span>
          <p className="text-sm font-bold text-on-surface dark:text-white">Belum ada polis tercatat</p>
          <p className="text-xs text-outline mt-1 max-w-sm mx-auto">Proteksi mendahului investasi (piramida CFP). Catat polis jiwa, kesehatan, kendaraan, dan properti Anda di sini.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {insurance.map((p) => {
            const dr = daysToRenewal(p.renewalDate);
            const soon = dr !== null && dr >= 0 && dr <= 30;
            return (
              <div key={p.id} className="bg-surface-container-lowest dark:bg-white/[0.03] border border-outline-variant/10 dark:border-white/10 rounded-2xl p-4 flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 dark:bg-[#a7c8ff]/15 text-primary dark:text-[#a7c8ff] flex items-center justify-center shrink-0"><span className="material-symbols-outlined">{INS_ICON[p.insType] || 'shield'}</span></div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-on-surface dark:text-white truncate">{p.name}</p>
                      <p className="text-[10px] text-on-surface-variant dark:text-slate-400 truncate">{p.insType} · {p.provider || '—'} · {maskPolicy(p.policyNumber)}</p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => openEdit(p)} className="w-6 h-6 rounded-lg hover:bg-surface-container dark:hover:bg-white/10 flex items-center justify-center text-on-surface-variant cursor-pointer"><span className="material-symbols-outlined text-[14px]">edit</span></button>
                      <button onClick={() => deleteInsurance(p.id)} className="w-6 h-6 rounded-lg hover:bg-error/10 flex items-center justify-center text-on-surface-variant hover:text-error cursor-pointer"><span className="material-symbols-outlined text-[14px]">delete</span></button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-2 text-[11px]">
                    <span className="text-on-surface-variant dark:text-slate-400">UP <strong className="text-on-surface dark:text-white">{formatRpShort(p.coverageAmount)}</strong></span>
                    <span className="text-on-surface-variant dark:text-slate-400">Premi <strong className="text-on-surface dark:text-white">{formatRpShort(premiumPerMonth(p))}</strong>/bln</span>
                  </div>
                  {soon && <span className="inline-flex items-center gap-1 mt-2 text-[9px] font-black uppercase text-amber-700 dark:text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded"><span className="material-symbols-outlined text-[11px]">event</span> Renewal {dr} hari lagi</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <FinanceGuidePrinciple
        heading="Prinsip Proteksi (CFP)"
        points={[
          { icon: 'shield', title: 'Proteksi sebelum investasi', text: 'Amankan penghasilan & aset dari risiko besar (meninggal, sakit kritis) sebelum mengejar imbal hasil.' },
          { icon: 'percent', title: 'Rasio premi wajar', text: 'Total premi tahunan umumnya ideal ≤ 10% penghasilan tahunan — cukup melindungi tanpa membebani arus kas.' },
          { icon: 'diversity_3', title: 'Uang Pertanggungan cukup', text: 'UP jiwa idealnya menutup kebutuhan keluarga bila pencari nafkah tiada — hitung dengan kalkulator UP.' },
          { icon: 'event_repeat', title: 'Pantau renewal', text: 'Jangan sampai polis lapse. Tanggal perpanjangan otomatis masuk Kalender Keuangan Anda.' },
        ]}
      />

      {/* Form modal */}
      {formOpen && (
        <div className="fixed inset-0 z-[120] flex items-start sm:items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md" onClick={() => setFormOpen(false)} />
          <div className="relative w-full max-w-lg my-auto bg-surface dark:bg-[#121416] rounded-3xl shadow-2xl border border-outline-variant/20 dark:border-white/10 max-h-[94vh] overflow-y-auto custom-scrollbar">
            <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 bg-surface/95 dark:bg-[#121416]/95 backdrop-blur border-b border-outline-variant/10 dark:border-white/5">
              <h2 className="text-lg font-black font-headline text-on-surface dark:text-white">{editingId ? 'Ubah Polis' : 'Polis Baru'}</h2>
              <button onClick={() => setFormOpen(false)} className="w-9 h-9 rounded-full bg-surface-container dark:bg-white/5 flex items-center justify-center text-on-surface dark:text-white cursor-pointer"><span className="material-symbols-outlined text-lg">close</span></button>
            </div>
            <div className="p-5 space-y-3">
              <input value={form.name} onChange={(e) => set({ name: e.target.value })} placeholder="Nama polis (mis. Prudential PRUlink)" className="w-full bg-surface-container-low dark:bg-white/5 border border-outline-variant/10 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm font-bold text-on-surface dark:text-white outline-none focus:border-primary/50" />
              <div className="grid grid-cols-2 gap-3">
                <select value={form.insType} onChange={(e) => set({ insType: e.target.value as Insurance['insType'] })} className="bg-surface-container-low dark:bg-white/5 border border-outline-variant/10 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm font-bold text-on-surface dark:text-white outline-none focus:border-primary/50 cursor-pointer">
                  {['Jiwa', 'Kesehatan', 'Kendaraan', 'Properti', 'Lainnya'].map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                <input value={form.provider} onChange={(e) => set({ provider: e.target.value })} placeholder="Provider" className="bg-surface-container-low dark:bg-white/5 border border-outline-variant/10 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm font-bold text-on-surface dark:text-white outline-none focus:border-primary/50" />
                <input value={form.policyNumber} onChange={(e) => set({ policyNumber: e.target.value })} placeholder="No. polis" className="bg-surface-container-low dark:bg-white/5 border border-outline-variant/10 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm font-bold text-on-surface dark:text-white outline-none focus:border-primary/50" />
                <select value={form.premiumFrequency} onChange={(e) => set({ premiumFrequency: e.target.value as Insurance['premiumFrequency'] })} className="bg-surface-container-low dark:bg-white/5 border border-outline-variant/10 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm font-bold text-on-surface dark:text-white outline-none focus:border-primary/50 cursor-pointer">
                  <option value="Tahunan">Premi Tahunan</option><option value="Bulanan">Premi Bulanan</option>
                </select>
                <div className="space-y-1"><label className="text-[10px] font-bold text-on-surface-variant dark:text-slate-400">Premi (Rp)</label><input type="text" inputMode="numeric" value={form.premium.toLocaleString('id-ID')} onChange={(e) => set({ premium: parseDigits(e.target.value) })} className="w-full bg-surface-container-low dark:bg-white/5 border border-outline-variant/10 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm font-bold text-on-surface dark:text-white tabular-nums outline-none focus:border-primary/50" /></div>
                <div className="space-y-1"><label className="text-[10px] font-bold text-on-surface-variant dark:text-slate-400">UP / Pertanggungan (Rp)</label><input type="text" inputMode="numeric" value={form.coverageAmount.toLocaleString('id-ID')} onChange={(e) => set({ coverageAmount: parseDigits(e.target.value) })} className="w-full bg-surface-container-low dark:bg-white/5 border border-outline-variant/10 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm font-bold text-on-surface dark:text-white tabular-nums outline-none focus:border-primary/50" /></div>
                <div className="space-y-1"><label className="text-[10px] font-bold text-on-surface-variant dark:text-slate-400">Renewal</label><input type="date" value={form.renewalDate} onChange={(e) => set({ renewalDate: e.target.value })} className="w-full bg-surface-container-low dark:bg-white/5 border border-outline-variant/10 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm font-bold text-on-surface dark:text-white outline-none focus:border-primary/50" /></div>
                <input value={form.insured} onChange={(e) => set({ insured: e.target.value })} placeholder="Tertanggung" className="bg-surface-container-low dark:bg-white/5 border border-outline-variant/10 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm font-bold text-on-surface dark:text-white outline-none focus:border-primary/50" />
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={() => setFormOpen(false)} className="flex-1 py-3 rounded-2xl bg-surface-container dark:bg-white/10 text-on-surface dark:text-white font-bold text-sm cursor-pointer">Batal</button>
                <button onClick={save} disabled={!form.name.trim()} className="flex-1 py-3 rounded-2xl bg-primary dark:bg-[#a7c8ff] text-white dark:text-[#001b3c] font-bold text-sm disabled:opacity-40 cursor-pointer">{editingId ? 'Simpan' : 'Tambah'}</button>
              </div>
              <p className="text-[10px] text-on-surface-variant/70 dark:text-slate-500 text-center">Nomor polis disimpan & ditampilkan tersamar (•••1234) demi keamanan.</p>
            </div>
          </div>
        </div>
      )}

      {/* Kalkulator UP */}
      {upOpen && <UPCalculatorModal annualIncome={annualIncome} annualExpense={annualExpense} totalDebt={totalDebt} liquid={liquid} currentLifeUP={summary.totalLifeCoverage} onClose={() => setUpOpen(false)} />}
    </section>
  );
};

const UPCalculatorModal: React.FC<{ annualIncome: number; annualExpense: number; totalDebt: number; liquid: number; currentLifeUP: number; onClose: () => void }> = ({ annualIncome, annualExpense, totalDebt, liquid, currentLifeUP, onClose }) => {
  const [income, setIncome] = useState(Math.round(annualIncome));
  const [expense, setExpense] = useState(Math.round(annualExpense));
  const [years, setYears] = useState(10);
  const parse = (s: string) => Number(s.replace(/\D/g, '')) || 0;
  const m1 = upIncomeReplacement(income, 10);
  const m1lo = upIncomeReplacement(income, 8);
  const m1hi = upIncomeReplacement(income, 12);
  const m2 = upExpenseMethod(expense, years, totalDebt, liquid);
  const recommended = Math.max(m1, m2);
  const gap = recommended - currentLifeUP;

  return (
    <div className="fixed inset-0 z-[121] flex items-start sm:items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="fixed inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full max-w-lg my-auto bg-surface dark:bg-[#121416] rounded-3xl shadow-2xl border border-outline-variant/20 dark:border-white/10 max-h-[94vh] overflow-y-auto custom-scrollbar">
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 bg-surface/95 dark:bg-[#121416]/95 backdrop-blur border-b border-outline-variant/10 dark:border-white/5">
          <h2 className="text-lg font-black font-headline text-on-surface dark:text-white">Kalkulator Kebutuhan UP Jiwa</h2>
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-surface-container dark:bg-white/5 flex items-center justify-center text-on-surface dark:text-white cursor-pointer"><span className="material-symbols-outlined text-lg">close</span></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><label className="text-[10px] font-bold text-on-surface-variant dark:text-slate-400">Penghasilan / tahun</label><input type="text" inputMode="numeric" value={income.toLocaleString('id-ID')} onChange={(e) => setIncome(parse(e.target.value))} className="w-full bg-surface-container-low dark:bg-white/5 border border-outline-variant/10 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm font-bold text-on-surface dark:text-white tabular-nums outline-none focus:border-primary/50" /></div>
            <div className="space-y-1"><label className="text-[10px] font-bold text-on-surface-variant dark:text-slate-400">Pengeluaran / tahun</label><input type="text" inputMode="numeric" value={expense.toLocaleString('id-ID')} onChange={(e) => setExpense(parse(e.target.value))} className="w-full bg-surface-container-low dark:bg-white/5 border border-outline-variant/10 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm font-bold text-on-surface dark:text-white tabular-nums outline-none focus:border-primary/50" /></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-2xl border border-outline-variant/10 dark:border-white/10 p-4">
              <p className="text-[10px] font-black uppercase tracking-wide text-on-surface-variant dark:text-slate-400">Metode 1 · Income Replacement</p>
              <p className="text-xl font-black tabular-nums text-on-surface dark:text-white mt-1">{formatRp(m1)}</p>
              <p className="text-[10px] text-on-surface-variant/70 dark:text-slate-500">rentang {formatRpShort(m1lo)}–{formatRpShort(m1hi)} (8–12× penghasilan)</p>
            </div>
            <div className="rounded-2xl border border-outline-variant/10 dark:border-white/10 p-4">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black uppercase tracking-wide text-on-surface-variant dark:text-slate-400">Metode 2 · Expense + Utang</p>
                <div className="flex items-center gap-1"><input type="number" min={1} max={30} value={years} onChange={(e) => setYears(Math.max(1, Math.min(30, Number(e.target.value))))} className="w-12 bg-surface-container-low dark:bg-white/5 border border-outline-variant/10 dark:border-white/10 rounded-lg px-1.5 py-1 text-xs font-bold text-on-surface dark:text-white tabular-nums text-center outline-none" /><span className="text-[10px] text-on-surface-variant">thn</span></div>
              </div>
              <p className="text-xl font-black tabular-nums text-on-surface dark:text-white mt-1">{formatRp(m2)}</p>
              <p className="text-[10px] text-on-surface-variant/70 dark:text-slate-500">pengeluaran×{years}thn + utang − aset likuid</p>
            </div>
          </div>
          <div className={`rounded-2xl p-4 border ${gap > 0 ? 'bg-amber-500/10 border-amber-500/30' : 'bg-emerald-500/10 border-emerald-500/30'}`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-on-surface dark:text-white">Kebutuhan UP (disarankan)</span>
              <span className="text-base font-black tabular-nums text-on-surface dark:text-white">{formatRp(recommended)}</span>
            </div>
            <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-outline-variant/10 dark:border-white/10">
              <span className="text-[11px] text-on-surface-variant dark:text-slate-400">UP jiwa Anda saat ini: {formatRp(currentLifeUP)}</span>
              <span className={`text-xs font-black ${gap > 0 ? 'text-amber-700 dark:text-amber-300' : 'text-emerald-700 dark:text-emerald-300'}`}>{gap > 0 ? `Kurang ${formatRpShort(gap)}` : 'Terpenuhi ✓'}</span>
            </div>
          </div>
          <p className="text-[10px] text-on-surface-variant/70 dark:text-slate-500 leading-relaxed">Kalkulator ini <strong>edukasi umum</strong> (rule of thumb), bukan rekomendasi produk atau merek asuransi tertentu. Kebutuhan riil bergantung kondisi keluarga, inflasi, dan aset lain.</p>
        </div>
      </div>
    </div>
  );
};

export default FinanceInsuranceSection;
