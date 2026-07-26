import React, { useMemo } from 'react';
import { useFinanceStore } from '../store/useFinanceStore';
import { computeHealthScore, type HealthBand } from './healthScoreUtils';
import { classAmounts } from './zakatUtils';
import { getUsdIdrRate, getUsdTickers, accountValueIDR, assetValueIDR } from './currencyUtils';

const BAND_STYLE: Record<HealthBand, { color: string; ring: string; text: string }> = {
  Rentan: { color: '#ef4444', ring: 'text-red-500', text: 'text-red-600 dark:text-red-400' },
  Cukup: { color: '#f59e0b', ring: 'text-amber-500', text: 'text-amber-600 dark:text-amber-400' },
  Sehat: { color: '#3b82f6', ring: 'text-blue-500', text: 'text-blue-600 dark:text-blue-400' },
  Prima: { color: '#10b981', ring: 'text-emerald-500', text: 'text-emerald-600 dark:text-emerald-400' },
};

const HealthScoreCard: React.FC = () => {
  const accounts = useFinanceStore((s) => s.accounts);
  const assets = useFinanceStore((s) => s.assets);
  const debts = useFinanceStore((s) => s.debts);
  const transactions = useFinanceStore((s) => s.transactions);
  const settings = useFinanceStore((s) => s.settings);

  const result = useMemo(() => {
    const rate = getUsdIdrRate(settings);
    const usdTickers = getUsdTickers(settings);
    const amt = classAmounts(accounts, assets);
    const liquidCash = amt.kas;
    const totalAssets = accounts.reduce((s, a) => s + accountValueIDR(a, rate), 0) + assets.reduce((s, a) => s + assetValueIDR(a, rate, usdTickers), 0);
    const totalDebts = debts.reduce((s, d) => s + (d.balance || 0), 0);
    const totalMinPayment = debts.reduce((s, d) => s + (d.minPayment || 0), 0);

    // Rata-rata pemasukan/pengeluaran 3 bulan terakhir
    const now = new Date();
    let inc = 0, exp = 0; const incM = new Set<string>(), expM = new Set<string>();
    transactions.forEach((t) => {
      const d = new Date(t.date); if (isNaN(d.getTime())) return;
      const diff = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
      // HANYA bulan LENGKAP (diff >= 1). Dulu `diff < 0` ikut memasukkan bulan BERJALAN (diff === 0) yang
      // baru jalan beberapa hari, lalu membaginya sebagai satu bulan penuh → rata-rata pengeluaran anjlok
      // (mis. tgl 2: (8jt + 8jt + 0,2jt)/3 = 5,4jt padahal sebenarnya 8jt) sehingga skor likuiditas/tabungan
      // ikut melambung. Pola yang benar sudah dipakai `cashflowUtils` (`m.month < nowMonth`).
      if (diff < 1 || diff > 3) return;
      const mk = `${d.getFullYear()}-${d.getMonth()}`;
      if (t.type === 'PEMASUKAN') { inc += Math.abs(t.amount || 0); incM.add(mk); }
      else if (t.type === 'PENGELUARAN') { exp += Math.abs(t.amount || 0); expM.add(mk); }
    });
    const avgMonthlyIncome = inc / Math.max(1, incM.size);
    const avgMonthlyExpense = exp / Math.max(1, expM.size);

    // Diversifikasi: HHI atas kelas investasi → 0–10
    const inv = amt.saham + amt.reksadana + amt.kripto + amt.fixedincome;
    let diversificationScore0to10: number | null = null;
    if (inv > 0) {
      const shares = [amt.saham, amt.reksadana, amt.kripto, amt.fixedincome].map((v) => v / inv);
      const hhi = shares.reduce((s, x) => s + x * x, 0);
      diversificationScore0to10 = Math.max(0, Math.min(10, ((1 - hhi) / 0.75) * 10));
    }

    return computeHealthScore({
      liquidCash, avgMonthlyExpense, avgMonthlyIncome, totalMinPayment,
      netWorth: totalAssets - totalDebts, totalAssets, diversificationScore0to10,
    });
  }, [accounts, assets, debts, transactions, settings]);

  const style = BAND_STYLE[result.band];
  // Gauge setengah lingkaran
  const R = 80, CX = 100, CY = 100;
  const arc = (pct: number) => {
    const a = Math.PI * (1 - pct / 100); // 180° → 0°
    return { x: CX + R * Math.cos(a), y: CY - R * Math.sin(a) };
  };
  const end = arc(result.score);
  const large = result.score > 50 ? 1 : 0;

  const hasData = accounts.length > 0 || assets.length > 0 || transactions.length > 0;
  if (!hasData) return null;

  return (
    <div className="bg-surface-container-lowest dark:bg-white/[0.02] border border-outline-variant/10 dark:border-white/10 rounded-2xl lg:rounded-[24px] p-5 sm:p-6 lg:p-8">
      <div className="flex items-center gap-2 mb-5">
        <span className="material-symbols-outlined text-primary dark:text-[#a7c8ff]">monitor_heart</span>
        <div>
          <h3 className="font-headline font-bold text-base sm:text-lg text-on-surface dark:text-white">Skor Kesehatan Finansial</h3>
          <p className="text-[11px] text-on-surface-variant dark:text-slate-400">Satu angka dari 6 rasio kunci — metodologi transparan · rata-rata 3 bulan LENGKAP terakhir (tak mengikuti pemilih periode)</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-5 lg:gap-7 items-center">
        {/* Gauge */}
        <div className="flex flex-col items-center">
          <svg viewBox="0 0 200 120" className="w-full max-w-[240px]">
            <path d={`M 20 100 A ${R} ${R} 0 0 1 180 100`} fill="none" stroke="currentColor" className="text-surface-container-high dark:text-white/10" strokeWidth={14} strokeLinecap="round" />
            <path d={`M 20 100 A ${R} ${R} 0 ${large} 1 ${end.x} ${end.y}`} fill="none" stroke={style.color} strokeWidth={14} strokeLinecap="round" />
            <text x={100} y={92} textAnchor="middle" className="fill-on-surface dark:fill-white" style={{ fontSize: 40, fontWeight: 900 }}>{result.score}</text>
          </svg>
          <span className={`inline-flex items-center gap-1 -mt-2 text-xs font-black px-3 py-1 rounded-full border`} style={{ color: style.color, borderColor: `${style.color}55`, backgroundColor: `${style.color}18` }}>
            {result.band}
          </span>
        </div>

        {/* Breakdown */}
        <div className="space-y-2">
          {result.metrics.map((m) => (
            <div key={m.key} className="flex items-center gap-3">
              <div className="w-28 sm:w-36 shrink-0">
                <p className="text-xs font-bold text-on-surface dark:text-white truncate">{m.label}</p>
                <p className="text-[10px] text-on-surface-variant dark:text-slate-400">{m.valueText} · bobot {m.weight}</p>
              </div>
              <div className="flex-1 h-2 bg-surface-container-high dark:bg-white/10 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${m.na ? 0 : m.score}%`, backgroundColor: m.na ? '#94a3b8' : style.color, opacity: m.na ? 0.4 : 0.85 }} />
              </div>
              <span className="w-9 text-right text-xs font-black tabular-nums text-on-surface dark:text-white shrink-0">{m.na ? 'N/A' : Math.round(m.score)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Langkah paling berdampak */}
      {result.mostImpactful && result.mostImpactful.score < 100 && (
        <div className="mt-5 flex items-start gap-3 rounded-2xl bg-primary/5 dark:bg-[#a7c8ff]/10 border border-primary/15 dark:border-[#a7c8ff]/20 p-4">
          <span className="material-symbols-outlined text-primary dark:text-[#a7c8ff] shrink-0">rocket_launch</span>
          <div>
            <p className="text-[10px] font-black uppercase tracking-wide text-primary dark:text-[#a7c8ff]">1 Langkah Paling Berdampak</p>
            <p className="text-xs font-bold text-on-surface dark:text-white mt-0.5">Perbaiki <span className={style.text}>{result.mostImpactful.label}</span> ({Math.round(result.mostImpactful.score)}/100)</p>
            <p className="text-[11px] text-on-surface-variant dark:text-slate-400 mt-0.5 leading-relaxed">{result.mostImpactful.hint}</p>
          </div>
        </div>
      )}

      <p className="text-[10px] text-on-surface-variant/70 dark:text-slate-500 mt-3 leading-relaxed">
        Skor = Σ(nilai×bobot) ÷ Σbobot. Band: &lt;40 Rentan · 40–69 Cukup · 70–84 Sehat · ≥85 Prima. Edukasi umum, bukan nasihat keuangan personal.
      </p>
    </div>
  );
};

export default HealthScoreCard;
