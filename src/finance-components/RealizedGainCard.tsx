import React, { useMemo } from 'react';
import { useFinanceStore } from '../store/useFinanceStore';
import { computeRealizedGains } from './realizedGainUtils';

const formatRp = (n: number) => `Rp ${Math.round(n || 0).toLocaleString('id-ID')}`;
const formatRpShort = (n: number) => {
  const a = Math.abs(n);
  const sign = n < 0 ? '−' : '';
  if (a >= 1e9) return `${sign}Rp ${(a / 1e9).toFixed(2)} M`;
  if (a >= 1e6) return `${sign}Rp ${(a / 1e6).toFixed(1)} jt`;
  return formatRp(n);
};

const RealizedGainCard: React.FC = () => {
  const transactions = useFinanceStore((s) => s.transactions);
  const data = useMemo(() => computeRealizedGains(transactions), [transactions]);

  if (data.sales.length === 0) return null;

  return (
    <div className="bg-surface-container-lowest dark:bg-white/[0.02] border border-outline-variant/10 dark:border-white/10 rounded-2xl lg:rounded-[24px] p-5 sm:p-6">
      <div className="flex items-center gap-2 mb-4">
        <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400">sell</span>
        <div>
          <h3 className="font-headline font-bold text-base text-on-surface dark:text-white">Realized Gain (Terealisasi)</h3>
          <p className="text-[11px] text-on-surface-variant dark:text-slate-400">Keuntungan/kerugian dari penjualan aset (average cost)</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-surface-container-low dark:bg-white/[0.03] rounded-2xl p-3 border border-outline-variant/10 dark:border-white/5">
          <p className="text-[9px] font-bold uppercase tracking-wide text-on-surface-variant dark:text-slate-400">Hasil Jual</p>
          <p className="text-sm font-black tabular-nums text-on-surface dark:text-white mt-0.5">{formatRpShort(data.totalProceeds)}</p>
        </div>
        <div className="bg-surface-container-low dark:bg-white/[0.03] rounded-2xl p-3 border border-outline-variant/10 dark:border-white/5">
          <p className="text-[9px] font-bold uppercase tracking-wide text-on-surface-variant dark:text-slate-400">Modal</p>
          <p className="text-sm font-black tabular-nums text-on-surface dark:text-white mt-0.5">{formatRpShort(data.totalCost)}</p>
        </div>
        <div className={`rounded-2xl p-3 border ${data.totalGain >= 0 ? 'bg-emerald-500/10 border-emerald-500/25' : 'bg-error/10 border-error/25'}`}>
          <p className="text-[9px] font-bold uppercase tracking-wide text-on-surface-variant dark:text-slate-400">Realized {data.totalGain >= 0 ? 'Gain' : 'Loss'}</p>
          <p className={`text-sm font-black tabular-nums mt-0.5 ${data.totalGain >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-error dark:text-[#ffb4ab]'}`}>{formatRpShort(data.totalGain)}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-outline-variant/10 dark:border-white/5 divide-y divide-outline-variant/10 dark:divide-white/5 overflow-hidden max-h-64 overflow-y-auto custom-scrollbar">
        {data.sales.slice(0, 20).map((s) => (
          <div key={s.id} className="flex items-center justify-between gap-2 px-3.5 py-2.5">
            <div className="min-w-0">
              <p className="text-xs font-bold text-on-surface dark:text-white truncate">{s.desc.replace(/^Jual\s*/i, '')}</p>
              <p className="text-[10px] text-on-surface-variant dark:text-slate-400">{s.date} · hasil {formatRpShort(s.proceeds)}</p>
            </div>
            <span className={`text-xs font-black tabular-nums shrink-0 ${s.gain >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-error dark:text-[#ffb4ab]'}`}>{s.gain >= 0 ? '+' : '−'}{formatRpShort(Math.abs(s.gain))}</span>
          </div>
        ))}
      </div>

      <p className="text-[10px] text-on-surface-variant/70 dark:text-slate-500 mt-3 leading-relaxed">
        Cost basis memakai <strong>average cost</strong> (rata-rata harga beli), standar broker ritel. Realized gain = hasil jual − modal terjual. Edukasi, bukan perhitungan pajak resmi.
      </p>
    </div>
  );
};

export default RealizedGainCard;
