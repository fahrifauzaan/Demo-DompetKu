import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useFinanceStore } from '../store/useFinanceStore';
import { parseCSV, buildTransactions, guessMapping, toTransactionPayload, type CsvMapping } from './csvImportUtils';

interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const formatRp = (n: number) => `${n < 0 ? '−' : '+'}Rp ${Math.round(Math.abs(n)).toLocaleString('id-ID')}`;

export const CsvImportModal: React.FC<CsvImportModalProps> = ({ isOpen, onClose }) => {
  const accounts = useFinanceStore((s) => s.accounts);
  const addTransaction = useFinanceStore((s) => s.addTransaction);
  const updateAccount = useFinanceStore((s) => s.updateAccount);

  const [raw, setRaw] = useState('');
  const [rows, setRows] = useState<string[][]>([]);
  const [map, setMap] = useState<CsvMapping | null>(null);
  const [amountMode, setAmountMode] = useState<'signed' | 'debitcredit'>('signed');
  const [account, setAccount] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<number | null>(null);

  const reset = () => { setRaw(''); setRows([]); setMap(null); setDone(null); };

  const ingest = (text: string) => {
    const parsed = parseCSV(text);
    setRows(parsed);
    const g = guessMapping(parsed);
    setMap(g);
    setAmountMode(g.amountCol >= 0 ? 'signed' : 'debitcredit');
    if (!account) setAccount(accounts.find((a) => a.type === 'bank')?.name || accounts[0]?.name || '');
  };

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => { const t = String(r.result || ''); setRaw(t); ingest(t); };
    r.readAsText(f);
  };

  const header = rows[0] || [];
  const colOptions = header.map((h, i) => ({ i, label: `Kolom ${i + 1}${map?.hasHeader && h ? `: ${h.slice(0, 18)}` : ''}` }));

  const effMap: CsvMapping | null = map ? {
    ...map,
    amountCol: amountMode === 'signed' ? map.amountCol : -1,
    debitCol: amountMode === 'debitcredit' ? map.debitCol : -1,
    creditCol: amountMode === 'debitcredit' ? map.creditCol : -1,
  } : null;

  const parsed = useMemo(() => (effMap && rows.length ? buildTransactions(rows, effMap) : []), [rows, effMap]);
  const valid = parsed.filter((p) => p.valid);

  const handleImport = async () => {
    if (!valid.length || !account || busy) return;
    setBusy(true);
    const store = useFinanceStore.getState();
    let net = 0;
    for (const p of valid) {
      await store.addTransaction(toTransactionPayload(p, account));
      net += p.amount;
    }
    const acc = useFinanceStore.getState().accounts.find((a) => a.name === account);
    if (acc) await store.updateAccount({ ...acc, balance: acc.balance + net });
    setBusy(false);
    setDone(valid.length);
  };

  if (!isOpen) return null;
  const setM = (patch: Partial<CsvMapping>) => setMap((m) => (m ? { ...m, ...patch } : m));

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[115] flex items-start sm:items-center justify-center p-2 sm:p-4 overflow-y-auto">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />
        <motion.div initial={{ opacity: 0, scale: 0.97, y: 24 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97, y: 24 }}
          transition={{ type: 'spring', damping: 28, stiffness: 240 }}
          className="relative w-full max-w-2xl my-auto bg-surface dark:bg-[#121416] rounded-3xl shadow-2xl border border-outline-variant/20 dark:border-white/10 max-h-[94vh] overflow-y-auto custom-scrollbar">
          <div className="sticky top-0 z-10 flex items-center justify-between px-5 sm:px-6 py-4 bg-surface/95 dark:bg-[#121416]/95 backdrop-blur border-b border-outline-variant/10 dark:border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-primary/10 dark:bg-[#a7c8ff]/15 flex items-center justify-center text-primary dark:text-[#a7c8ff]"><span className="material-symbols-outlined">upload_file</span></div>
              <h2 className="text-lg font-black font-headline text-on-surface dark:text-white">Impor Mutasi Bank (CSV)</h2>
            </div>
            <button onClick={onClose} className="w-9 h-9 rounded-full bg-surface-container dark:bg-white/5 flex items-center justify-center text-on-surface dark:text-white cursor-pointer"><span className="material-symbols-outlined text-lg">close</span></button>
          </div>

          <div className="p-5 sm:p-6 space-y-4">
            {done !== null ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-3"><span className="material-symbols-outlined text-3xl">task_alt</span></div>
                <h3 className="text-lg font-black text-on-surface dark:text-white">{done} transaksi diimpor</h3>
                <p className="text-xs text-on-surface-variant dark:text-slate-400 mt-1">Saldo akun {account} telah disesuaikan.</p>
                <div className="flex gap-2 justify-center mt-5">
                  <button onClick={() => { reset(); }} className="px-5 py-2.5 rounded-xl bg-surface-container dark:bg-white/10 text-on-surface dark:text-white font-bold text-sm cursor-pointer">Impor lagi</button>
                  <button onClick={onClose} className="px-5 py-2.5 rounded-xl bg-primary dark:bg-[#a7c8ff] text-white dark:text-[#001b3c] font-bold text-sm cursor-pointer">Selesai</button>
                </div>
              </div>
            ) : rows.length === 0 ? (
              <>
                <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-outline-variant/30 dark:border-white/15 rounded-2xl py-8 cursor-pointer hover:border-primary/50 transition-colors">
                  <span className="material-symbols-outlined text-3xl text-primary dark:text-[#a7c8ff]">cloud_upload</span>
                  <span className="text-sm font-bold text-on-surface dark:text-white">Pilih file CSV</span>
                  <span className="text-[11px] text-on-surface-variant dark:text-slate-400">dari internet/mobile banking Anda</span>
                  <input type="file" accept=".csv,text/csv,text/plain" onChange={onFile} className="hidden" />
                </label>
                <div className="flex items-center gap-2"><div className="flex-1 h-px bg-outline-variant/20 dark:bg-white/10" /><span className="text-[10px] text-on-surface-variant dark:text-slate-500 font-bold">ATAU TEMPEL</span><div className="flex-1 h-px bg-outline-variant/20 dark:bg-white/10" /></div>
                <textarea value={raw} onChange={(e) => setRaw(e.target.value)} placeholder="Tempel isi CSV di sini…" rows={5}
                  className="w-full bg-surface-container-low dark:bg-white/5 border border-outline-variant/10 dark:border-white/10 rounded-2xl px-3 py-2.5 text-xs font-mono text-on-surface dark:text-white outline-none focus:border-primary/50 resize-none" />
                <button onClick={() => raw.trim() && ingest(raw)} disabled={!raw.trim()} className="w-full py-3 rounded-2xl bg-primary dark:bg-[#a7c8ff] text-white dark:text-[#001b3c] font-bold text-sm disabled:opacity-40 cursor-pointer">Baca CSV</button>
              </>
            ) : (
              <>
                {/* Mapping */}
                <div className="rounded-2xl border border-outline-variant/10 dark:border-white/10 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black uppercase tracking-wide text-on-surface-variant dark:text-slate-400">Pemetaan kolom</span>
                    <label className="flex items-center gap-1.5 text-[11px] font-bold text-on-surface dark:text-white cursor-pointer">
                      <input type="checkbox" checked={!!map?.hasHeader} onChange={(e) => setM({ hasHeader: e.target.checked })} /> Baris pertama = judul
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Sel label="Tanggal" value={map!.dateCol} onChange={(v) => setM({ dateCol: v })} options={colOptions} />
                    <Sel label="Keterangan" value={map!.descCol} onChange={(v) => setM({ descCol: v })} options={colOptions} />
                  </div>
                  <div className="flex gap-1.5">
                    {(['signed', 'debitcredit'] as const).map((m) => (
                      <button key={m} onClick={() => setAmountMode(m)} className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold border ${amountMode === m ? 'bg-primary/10 border-primary text-primary dark:text-[#a7c8ff]' : 'bg-surface-container-low dark:bg-white/5 border-outline-variant/10 text-on-surface-variant'}`}>{m === 'signed' ? '1 kolom nominal (±)' : 'Debit & Kredit terpisah'}</button>
                    ))}
                  </div>
                  {amountMode === 'signed' ? (
                    <Sel label="Nominal (bertanda)" value={map!.amountCol} onChange={(v) => setM({ amountCol: v })} options={colOptions} />
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <Sel label="Debit (keluar)" value={map!.debitCol} onChange={(v) => setM({ debitCol: v })} options={colOptions} allowNone />
                      <Sel label="Kredit (masuk)" value={map!.creditCol} onChange={(v) => setM({ creditCol: v })} options={colOptions} allowNone />
                    </div>
                  )}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-on-surface-variant dark:text-slate-400">Impor ke akun</label>
                    <select value={account} onChange={(e) => setAccount(e.target.value)} className="w-full bg-surface-container-low dark:bg-white/5 border border-outline-variant/10 dark:border-white/10 rounded-xl px-3 py-2 text-sm font-bold text-on-surface dark:text-white outline-none focus:border-primary/50 cursor-pointer">
                      {accounts.map((a) => <option key={a.id} value={a.name}>{a.name}</option>)}
                    </select>
                  </div>
                </div>

                {/* Preview */}
                <div>
                  <p className="text-[11px] font-bold text-on-surface-variant dark:text-slate-400 mb-2">Pratinjau · <strong className="text-emerald-600 dark:text-emerald-400">{valid.length} valid</strong>{parsed.length - valid.length > 0 && <span className="text-amber-600 dark:text-amber-400"> · {parsed.length - valid.length} dilewati</span>}</p>
                  <div className="rounded-2xl border border-outline-variant/10 dark:border-white/5 overflow-hidden max-h-56 overflow-y-auto custom-scrollbar">
                    <table className="w-full text-xs">
                      <thead className="bg-surface-container dark:bg-[#1b1e21] sticky top-0"><tr className="text-[10px] uppercase text-on-surface-variant dark:text-slate-400"><th className="px-3 py-2 text-left font-black">Tanggal</th><th className="px-3 py-2 text-left font-black">Keterangan</th><th className="px-3 py-2 text-right font-black">Nominal</th></tr></thead>
                      <tbody className="divide-y divide-outline-variant/10 dark:divide-white/5">
                        {parsed.slice(0, 30).map((p, i) => (
                          <tr key={i} className={p.valid ? '' : 'opacity-40'}>
                            <td className="px-3 py-1.5 tabular-nums text-on-surface dark:text-slate-200">{p.date || '—'}</td>
                            <td className="px-3 py-1.5 text-on-surface dark:text-slate-200 truncate max-w-[220px]">{p.desc}</td>
                            <td className={`px-3 py-1.5 text-right tabular-nums font-bold ${p.amount >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-error dark:text-[#ffb4ab]'}`}>{formatRp(p.amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button onClick={reset} className="flex-1 py-3 rounded-2xl bg-surface-container dark:bg-white/10 text-on-surface dark:text-white font-bold text-sm cursor-pointer">Ganti file</button>
                  <button onClick={handleImport} disabled={!valid.length || !account || busy} className="flex-[2] py-3 rounded-2xl bg-primary dark:bg-[#a7c8ff] text-white dark:text-[#001b3c] font-bold text-sm disabled:opacity-40 cursor-pointer">{busy ? 'Mengimpor…' : `Impor ${valid.length} transaksi`}</button>
                </div>
                <p className="text-[10px] text-on-surface-variant/70 dark:text-slate-500 text-center">Nominal + = pemasukan, − = pengeluaran. Periksa pratinjau sebelum impor; baris tanpa tanggal/nominal valid dilewati.</p>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

const Sel: React.FC<{ label: string; value: number; onChange: (v: number) => void; options: { i: number; label: string }[]; allowNone?: boolean }> = ({ label, value, onChange, options, allowNone }) => (
  <div className="space-y-1">
    <label className="text-[11px] font-bold text-on-surface-variant dark:text-slate-400">{label}</label>
    <select value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full bg-surface-container-low dark:bg-white/5 border border-outline-variant/10 dark:border-white/10 rounded-xl px-2.5 py-2 text-xs font-bold text-on-surface dark:text-white outline-none focus:border-primary/50 cursor-pointer">
      {allowNone && <option value={-1}>— tidak ada —</option>}
      {options.map((o) => <option key={o.i} value={o.i}>{o.label}</option>)}
    </select>
  </div>
);

export default CsvImportModal;
