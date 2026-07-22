import React, { useMemo, useState } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine } from 'recharts';
import { useFinanceStore } from '../store/useFinanceStore';
import { projectCashflow } from './recurringUtils';

interface CashProjectionCardProps { onManage?: () => void; }

const formatRpShort = (n: number) => {
  const a = Math.abs(n);
  if (a >= 1e9) return `${n < 0 ? '−' : ''}${(a / 1e9).toFixed(1)}M`;
  if (a >= 1e6) return `${n < 0 ? '−' : ''}${(a / 1e6).toFixed(0)}jt`;
  if (a >= 1e3) return `${n < 0 ? '−' : ''}${Math.round(a / 1e3)}rb`;
  return String(Math.round(n));
};
const formatRp = (n: number) => `Rp ${Math.round(n || 0).toLocaleString('id-ID')}`;

const CashProjectionCard: React.FC<CashProjectionCardProps> = ({ onManage }) => {
  const accounts = useFinanceStore((s) => s.accounts);
  const recurring = useFinanceStore((s) => s.recurring);
  const [days, setDays] = useState<30 | 60 | 90>(30);

  const startBalance = useMemo(
    () => accounts.filter((a) => a.type === 'bank' || a.type === 'cash' || a.type === 'wallet').reduce((s, a) => s + (a.balance || 0), 0),
    [accounts]
  );
  const proj = useMemo(() => projectCashflow(startBalance, recurring, days), [startBalance, recurring, days]);

  const activeRecurring = recurring.filter((r) => !r.endDate || new Date(r.endDate) >= new Date());
  if (activeRecurring.length === 0) return null; // tak ada recurring → sembunyikan

  const data = proj.points.map((p) => ({ label: p.label, balance: Math.round(p.balance) }));
  const negative = proj.firstNegative;

  return (
    <div className="bg-surface-container-lowest dark:bg-white/[0.03] border border-outline-variant/10 dark:border-white/10 rounded-2xl lg:rounded-[24px] p-4 sm:p-5 lg:p-6">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary dark:text-[#a7c8ff]">monitoring</span>
          <div>
            <h3 className="font-headline font-bold text-sm sm:text-base text-on-surface dark:text-white">Proyeksi Arus Kas</h3>
            <p className="text-[10px] text-on-surface-variant dark:text-slate-400">Dari transaksi berulang aktif</p>
          </div>
        </div>
        <div className="flex bg-surface-container-low dark:bg-black/30 p-0.5 rounded-lg border border-outline-variant/10">
          {([30, 60, 90] as const).map((d) => (
            <button key={d} onClick={() => setDays(d)} className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all ${days === d ? 'bg-white dark:bg-[#2c3033] shadow text-primary dark:text-[#a7c8ff]' : 'text-on-surface-variant dark:text-slate-400'}`}>{d}h</button>
          ))}
        </div>
      </div>

      {negative ? (
        <div className="flex items-center gap-2 rounded-xl bg-error/10 border border-error/25 px-3 py-2 mb-3">
          <span className="material-symbols-outlined text-[16px] text-error dark:text-[#ffb4ab]">warning</span>
          <p className="text-[11px] font-bold text-error dark:text-[#ffb4ab]">Kas diproyeksikan minus pada {negative.getDate()}/{negative.getMonth() + 1}</p>
        </div>
      ) : (
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] text-on-surface-variant dark:text-slate-400">Saldo akhir proyeksi</span>
          <span className={`text-sm font-black tabular-nums ${proj.endBalance >= startBalance ? 'text-emerald-600 dark:text-emerald-400' : 'text-on-surface dark:text-white'}`}>{formatRp(proj.endBalance)}</span>
        </div>
      )}

      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 6, left: 6, bottom: 0 }}>
            <defs>
              <linearGradient id="cashProjGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-outline-variant/20 dark:text-white/5" />
            <XAxis dataKey="label" tick={{ fill: 'currentColor', fontSize: 9 }} className="text-on-surface-variant" axisLine={false} tickLine={false} minTickGap={30} />
            <YAxis tickFormatter={formatRpShort} tick={{ fill: 'currentColor', fontSize: 9 }} className="text-on-surface-variant" axisLine={false} tickLine={false} width={40} />
            <Tooltip formatter={(v: number) => [formatRp(v), 'Saldo']} contentStyle={{ borderRadius: 12, backgroundColor: '#1b1e21', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: 11 }} />
            <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="4 4" />
            <Area type="stepAfter" dataKey="balance" stroke="#3b82f6" strokeWidth={2} fill="url(#cashProjGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {onManage && (
        <button onClick={onManage} className="w-full mt-3 py-2 rounded-xl bg-surface-container dark:bg-white/5 text-xs font-bold text-primary dark:text-[#a7c8ff] border border-outline-variant/10 dark:border-white/10 cursor-pointer">Kelola transaksi berulang</button>
      )}
    </div>
  );
};

export default CashProjectionCard;
