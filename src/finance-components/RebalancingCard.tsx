import React, { useMemo, useState, useEffect } from 'react';
import { useFinanceStore } from '../store/useFinanceStore';
import { classAmounts } from './zakatUtils';

/**
 * F3.2 Rebalancing Advisor — bandingkan alokasi aktual vs target (Settings),
 * hitung drift & saran ±Rp. Edukasi, TANPA tombol eksekusi.
 */

const CLASSES = [
  { key: 'saham', label: 'Saham', icon: 'trending_up', color: '#2563eb' },
  { key: 'reksadana', label: 'Reksadana', icon: 'donut_small', color: '#7c3aed' },
  { key: 'kripto', label: 'Kripto', icon: 'currency_bitcoin', color: '#f59e0b' },
  { key: 'fixedincome', label: 'Pendapatan Tetap', icon: 'account_balance', color: '#059669' },
  { key: 'kas', label: 'Kas & Setara', icon: 'account_balance_wallet', color: '#0891b2' },
] as const;

type ClassKey = typeof CLASSES[number]['key'];

const DEFAULT_TARGETS: Record<ClassKey, number> = { saham: 30, reksadana: 25, kripto: 5, fixedincome: 25, kas: 15 };

const formatRp = (n: number) => `Rp ${Math.round(Math.abs(n) || 0).toLocaleString('id-ID')}`;

const RebalancingCard: React.FC = () => {
  const accounts = useFinanceStore((s) => s.accounts);
  const assets = useFinanceStore((s) => s.assets);
  const settings = useFinanceStore((s) => s.settings);
  const updateSettings = useFinanceStore((s) => s.updateSettings);

  const readTarget = (k: ClassKey) => {
    const v = Number(settings.find((s) => s.key === `target_alloc_${k}`)?.value);
    return Number.isFinite(v) && v >= 0 ? v : DEFAULT_TARGETS[k];
  };
  const readBand = () => {
    const v = Number(settings.find((s) => s.key === 'rebalance_band')?.value);
    return Number.isFinite(v) && v > 0 ? v : 5;
  };

  const [targets, setTargets] = useState<Record<ClassKey, number>>({ ...DEFAULT_TARGETS });
  const [band, setBand] = useState(5);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setTargets({ saham: readTarget('saham'), reksadana: readTarget('reksadana'), kripto: readTarget('kripto'), fixedincome: readTarget('fixedincome'), kas: readTarget('kas') });
    setBand(readBand());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings]);

  const amounts = useMemo(() => classAmounts(accounts, assets), [accounts, assets]);
  const total = CLASSES.reduce((s, c) => s + (amounts[c.key] || 0), 0);

  const sumTargets = CLASSES.reduce((s, c) => s + (targets[c.key] || 0), 0);
  const isValid = sumTargets === 100;

  const rows = CLASSES.map((c) => {
    const amt = amounts[c.key] || 0;
    const actual = total > 0 ? (amt / total) * 100 : 0;
    const target = targets[c.key] || 0;
    const drift = actual - target;
    const status = Math.abs(drift) <= band ? 'OK' : drift > 0 ? 'OVERWEIGHT' : 'UNDERWEIGHT';
    const saranRp = ((target - actual) / 100) * total; // + tambah, − kurangi
    return { ...c, amt, actual, target, drift, status, saranRp };
  });
  const allInBand = rows.every((r) => r.status === 'OK');

  const setTarget = (k: ClassKey, v: number) => setTargets((prev) => ({ ...prev, [k]: Math.max(0, Math.min(100, Math.round(v))) }));
  const normalize = () => {
    if (sumTargets === 0) return;
    const scaled: Record<ClassKey, number> = { ...targets };
    let acc = 0;
    CLASSES.forEach((c, i) => {
      if (i === CLASSES.length - 1) scaled[c.key] = 100 - acc;
      else { scaled[c.key] = Math.round((targets[c.key] / sumTargets) * 100); acc += scaled[c.key]; }
    });
    setTargets(scaled);
  };
  const handleSave = async () => {
    if (!isValid) return;
    const next = settings.filter((s) => !s.key.startsWith('target_alloc_') && s.key !== 'rebalance_band');
    CLASSES.forEach((c) => next.push({ key: `target_alloc_${c.key}`, value: String(targets[c.key]) }));
    next.push({ key: 'rebalance_band', value: String(band) });
    await updateSettings(next);
    setSaved(true); window.setTimeout(() => setSaved(false), 1800);
  };

  if (total <= 0) return null;

  return (
    <div className="bg-surface-container-lowest dark:bg-white/[0.02] border border-outline-variant/10 dark:border-white/10 rounded-2xl lg:rounded-[24px] p-5 sm:p-6 lg:p-8 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary dark:text-[#a7c8ff]">balance</span>
          <div>
            <h3 className="font-headline font-bold text-base sm:text-lg text-on-surface dark:text-white">Rebalancing Advisor</h3>
            <p className="text-[11px] text-on-surface-variant dark:text-slate-400">Disiplin alokasi target vs aktual (band ±{band}%)</p>
          </div>
        </div>
        {allInBand ? (
          <span className="inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 self-start">
            <span className="material-symbols-outlined text-[13px]">check_circle</span> Dalam band — tak perlu tindakan
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30 self-start">
            <span className="material-symbols-outlined text-[13px]">tune</span> Ada kelas di luar band
          </span>
        )}
      </div>

      {/* Editor target */}
      <div className="rounded-2xl border border-outline-variant/10 dark:border-white/5 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-black uppercase tracking-wide text-on-surface-variant dark:text-slate-400">Target Alokasi (%)</span>
          <span className={`text-xs font-black tabular-nums ${isValid ? 'text-emerald-600 dark:text-emerald-400' : 'text-error dark:text-[#ffb4ab]'}`}>Σ {sumTargets}%{isValid ? ' ✓' : ' (harus 100)'}</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {CLASSES.map((c) => (
            <div key={c.key} className="space-y-1">
              <label className="text-[10px] font-bold text-on-surface-variant dark:text-slate-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c.color }} />{c.label}
              </label>
              <div className="flex items-center bg-surface-container-low dark:bg-white/5 border border-outline-variant/10 dark:border-white/10 rounded-lg px-2 py-1.5 focus-within:border-primary/50">
                <input type="number" min={0} max={100} value={targets[c.key]}
                  onChange={(e) => setTarget(c.key, Number(e.target.value))}
                  className="w-full bg-transparent border-none p-0 text-sm font-black text-on-surface dark:text-white tabular-nums outline-none focus:ring-0" />
                <span className="text-[10px] text-on-surface-variant dark:text-slate-400">%</span>
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between gap-2 pt-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-on-surface-variant dark:text-slate-400">Band toleransi ±</span>
            <input type="number" min={1} max={20} value={band} onChange={(e) => setBand(Math.max(1, Math.min(20, Number(e.target.value))))}
              className="w-14 bg-surface-container-low dark:bg-white/5 border border-outline-variant/10 dark:border-white/10 rounded-lg px-2 py-1 text-xs font-bold text-on-surface dark:text-white tabular-nums outline-none focus:border-primary/50" />
            <span className="text-[10px] text-on-surface-variant dark:text-slate-400">%</span>
          </div>
          <div className="flex gap-2">
            {!isValid && <button onClick={normalize} className="text-[11px] font-bold text-primary dark:text-[#a7c8ff] hover:underline cursor-pointer">Normalkan ke 100</button>}
            <button onClick={handleSave} disabled={!isValid}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${saved ? 'bg-emerald-500 text-white' : isValid ? 'bg-primary dark:bg-[#a7c8ff] text-white dark:text-[#001b3c] hover:opacity-90' : 'bg-surface-container-high dark:bg-white/10 text-on-surface-variant/50 cursor-not-allowed'}`}>
              {saved ? '✓ Tersimpan' : 'Simpan Target'}
            </button>
          </div>
        </div>
      </div>

      {/* Tabel drift */}
      <div className="space-y-2.5">
        {rows.map((r) => (
          <div key={r.key} className="rounded-2xl border border-outline-variant/10 dark:border-white/5 p-3.5">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="material-symbols-outlined text-[18px] shrink-0" style={{ color: r.color }}>{r.icon}</span>
                <span className="text-sm font-bold text-on-surface dark:text-white truncate">{r.label}</span>
                <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded shrink-0 ${r.status === 'OK' ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : r.status === 'OVERWEIGHT' ? 'bg-error/10 text-error dark:text-[#ffb4ab]' : 'bg-amber-500/10 text-amber-700 dark:text-amber-300'}`}>
                  {r.status === 'OK' ? 'OK' : r.status === 'OVERWEIGHT' ? 'Overweight' : 'Underweight'}
                </span>
              </div>
              <div className="text-right shrink-0">
                <span className="text-xs font-black tabular-nums text-on-surface dark:text-white">{r.actual.toFixed(1)}%</span>
                <span className="text-[10px] text-on-surface-variant dark:text-slate-400"> / {r.target}%</span>
              </div>
            </div>
            {/* Double bar: target (garis) vs aktual (isi) */}
            <div className="relative h-2 bg-surface-container-high dark:bg-white/10 rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${Math.min(100, r.actual)}%`, backgroundColor: r.color, opacity: 0.85 }} />
              <div className="absolute top-[-2px] bottom-[-2px] w-0.5 bg-on-surface dark:bg-white" style={{ left: `${Math.min(100, r.target)}%` }} title={`Target ${r.target}%`} />
            </div>
            <div className="flex justify-between items-center mt-1.5">
              <span className={`text-[10px] font-bold tabular-nums ${Math.abs(r.drift) <= band ? 'text-on-surface-variant dark:text-slate-400' : 'text-amber-600 dark:text-amber-400'}`}>Drift {r.drift >= 0 ? '+' : ''}{r.drift.toFixed(1)} poin</span>
              {r.status !== 'OK' && (
                <span className="text-[10px] font-bold text-on-surface dark:text-slate-200">
                  {r.saranRp >= 0 ? 'Tambah' : 'Kurangi'} ~{formatRp(r.saranRp)}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-start gap-2 rounded-2xl bg-surface-container-low dark:bg-white/[0.03] border border-outline-variant/10 dark:border-white/5 p-3">
        <span className="material-symbols-outlined text-[15px] text-on-surface-variant dark:text-slate-400 mt-px shrink-0">info</span>
        <p className="text-[10.5px] text-on-surface-variant dark:text-slate-400 leading-relaxed">
          Saran bersifat <strong>edukatif</strong> — DompetKu tidak mengeksekusi transaksi apa pun. Rebalancing membantu menjaga profil risiko sesuai rencana Anda; pertimbangkan biaya & pajak sebelum bertindak.
        </p>
      </div>
    </div>
  );
};

export default RebalancingCard;
