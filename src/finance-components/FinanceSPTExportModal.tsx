import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useFinanceStore } from '../store/useFinanceStore';
import { buildSptRows, sptRowsToCSV, HARTA_CODES, buildUtangRows, utangRowsToCSV, type SptRow, type UtangRow } from './sptUtils';

interface FinanceSPTExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const parseDigits = (s: string) => Number(s.replace(/\D/g, '')) || 0;

export const FinanceSPTExportModal: React.FC<FinanceSPTExportModalProps> = ({ isOpen, onClose }) => {
  const accounts = useFinanceStore((s) => s.accounts);
  const assets = useFinanceStore((s) => s.assets);
  const debts = useFinanceStore((s) => s.debts);
  const setPrintType = useFinanceStore((s) => s.setPrintType);
  const setSptPrintRows = useFinanceStore((s) => s.setSptPrintRows);

  const [rows, setRows] = useState<SptRow[]>([]);
  const [utangRows, setUtangRows] = useState<UtangRow[]>([]);
  const [copied, setCopied] = useState(false);
  const [utangCopied, setUtangCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setRows(buildSptRows(accounts, assets));
      setUtangRows(buildUtangRows(debts));
      setCopied(false);
      setUtangCopied(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleCopyUtangCSV = async () => {
    const csv = utangRowsToCSV(utangRows);
    try { await navigator.clipboard.writeText(csv); setUtangCopied(true); setTimeout(() => setUtangCopied(false), 2000); }
    catch { window.prompt('Salin CSV Daftar Utang:', csv); }
  };
  const totalUtang = utangRows.reduce((s, r) => s + (r.jumlah || 0), 0);

  const update = (id: string, patch: Partial<SptRow>) =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const included = rows.filter((r) => !r.excluded);
  const total = included.reduce((s, r) => s + (r.hargaPerolehan || 0), 0);

  const handleCopyCSV = async () => {
    const csv = sptRowsToCSV(rows);
    try {
      await navigator.clipboard.writeText(csv);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // fallback: buka sebagai data agar user bisa salin manual
      window.prompt('Salin CSV Daftar Harta:', csv);
    }
  };

  const handlePrint = () => {
    setSptPrintRows(rows);
    setPrintType('spt');
    setTimeout(() => {
      window.print();
      setTimeout(() => setPrintType(null), 300);
    }, 100);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[110] flex items-start sm:items-center justify-center p-2 sm:p-4 overflow-y-auto print:hidden">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />

        <motion.div
          initial={{ opacity: 0, scale: 0.97, y: 24 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97, y: 24 }}
          transition={{ type: 'spring', damping: 28, stiffness: 240 }}
          className="relative w-full max-w-5xl my-auto bg-surface dark:bg-[#121416] rounded-3xl shadow-2xl border border-outline-variant/20 dark:border-white/10 max-h-[96vh] sm:max-h-[92vh] overflow-y-auto custom-scrollbar"
        >
          {/* Header */}
          <div className="sticky top-0 z-10 flex items-center justify-between gap-3 px-5 sm:px-7 py-4 bg-surface/95 dark:bg-[#121416]/95 backdrop-blur border-b border-outline-variant/10 dark:border-white/5">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-2xl bg-primary/10 dark:bg-[#a7c8ff]/15 flex items-center justify-center text-primary dark:text-[#a7c8ff] shrink-0">
                <span className="material-symbols-outlined text-2xl">description</span>
              </div>
              <div className="min-w-0">
                <h2 className="text-lg sm:text-xl font-black font-headline text-on-surface dark:text-white truncate">Ekspor Daftar Harta (SPT)</h2>
                <p className="text-[10px] sm:text-[11px] text-on-surface-variant dark:text-slate-400 font-bold uppercase tracking-wider truncate">Lampiran IV · SPT Tahunan Pribadi</p>
              </div>
            </div>
            <button onClick={onClose} className="w-9 h-9 rounded-full bg-surface-container hover:bg-surface-container-high dark:bg-white/5 dark:hover:bg-white/10 flex items-center justify-center text-on-surface dark:text-white transition-colors cursor-pointer shrink-0">
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>

          <div className="p-5 sm:p-7 space-y-4">
            {/* Catatan harga perolehan */}
            <div className="flex items-start gap-2 rounded-2xl bg-amber-500/10 border border-amber-500/25 p-3">
              <span className="material-symbols-outlined text-[16px] text-amber-600 dark:text-amber-400 mt-px shrink-0">info</span>
              <p className="text-[11px] text-amber-800 dark:text-amber-200 leading-relaxed">
                Daftar Harta dilaporkan pada <strong>harga perolehan</strong> (biaya beli), <strong>bukan nilai pasar</strong>. Untuk kas/rekening dipakai saldo. Periksa & sesuaikan kode harta serta nilai sebelum melapor.
              </p>
            </div>

            {/* Tabel */}
            <div className="rounded-2xl border border-outline-variant/10 dark:border-white/5 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs min-w-[720px]">
                  <thead className="bg-surface-container dark:bg-[#1b1e21]">
                    <tr className="text-on-surface-variant dark:text-slate-400 text-[10px] uppercase tracking-wide text-left">
                      <th className="px-2.5 py-2.5 font-black">Kode Harta</th>
                      <th className="px-2.5 py-2.5 font-black">Nama Harta</th>
                      <th className="px-2.5 py-2.5 font-black w-16">Tahun</th>
                      <th className="px-2.5 py-2.5 font-black text-right">Harga Perolehan</th>
                      <th className="px-2.5 py-2.5 font-black">Keterangan</th>
                      <th className="px-2.5 py-2.5 font-black text-center w-12"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/10 dark:divide-white/5">
                    {rows.map((r) => (
                      <tr key={r.id} className={r.excluded ? 'opacity-40' : ''}>
                        <td className="px-2.5 py-2">
                          <select
                            value={r.kode}
                            disabled={r.excluded}
                            onChange={(e) => update(r.id, { kode: e.target.value })}
                            className="w-full max-w-[190px] bg-surface-container-low dark:bg-white/5 border border-outline-variant/10 dark:border-white/10 rounded-lg px-2 py-1.5 text-[11px] font-bold text-on-surface dark:text-white outline-none focus:border-primary/50 cursor-pointer"
                          >
                            {HARTA_CODES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
                          </select>
                        </td>
                        <td className="px-2.5 py-2">
                          <span className="font-bold text-on-surface dark:text-white">{r.nama}</span>
                        </td>
                        <td className="px-2.5 py-2">
                          <input
                            type="text" inputMode="numeric" value={r.tahun} disabled={r.excluded}
                            onChange={(e) => update(r.id, { tahun: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                            className="w-14 bg-surface-container-low dark:bg-white/5 border border-outline-variant/10 dark:border-white/10 rounded-lg px-2 py-1.5 text-[11px] font-bold text-on-surface dark:text-white tabular-nums outline-none focus:border-primary/50"
                          />
                        </td>
                        <td className="px-2.5 py-2">
                          <div className="flex items-center gap-1 justify-end">
                            <span className="text-[10px] text-on-surface-variant dark:text-slate-400">Rp</span>
                            <input
                              type="text" inputMode="numeric" value={(r.hargaPerolehan || 0).toLocaleString('id-ID')} disabled={r.excluded}
                              onChange={(e) => update(r.id, { hargaPerolehan: parseDigits(e.target.value) })}
                              className="w-28 bg-surface-container-low dark:bg-white/5 border border-outline-variant/10 dark:border-white/10 rounded-lg px-2 py-1.5 text-[11px] font-bold text-on-surface dark:text-white tabular-nums text-right outline-none focus:border-primary/50"
                            />
                          </div>
                        </td>
                        <td className="px-2.5 py-2">
                          <input
                            type="text" value={r.keterangan} disabled={r.excluded}
                            onChange={(e) => update(r.id, { keterangan: e.target.value })}
                            className="w-full max-w-[180px] bg-surface-container-low dark:bg-white/5 border border-outline-variant/10 dark:border-white/10 rounded-lg px-2 py-1.5 text-[11px] text-on-surface dark:text-slate-200 outline-none focus:border-primary/50"
                          />
                        </td>
                        <td className="px-2.5 py-2 text-center">
                          <button
                            onClick={() => update(r.id, { excluded: !r.excluded })}
                            title={r.excluded ? 'Sertakan kembali' : 'Kecualikan'}
                            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${r.excluded ? 'text-emerald-600 hover:bg-emerald-500/10' : 'text-on-surface-variant dark:text-slate-400 hover:bg-error/10 hover:text-error'}`}
                          >
                            <span className="material-symbols-outlined text-base">{r.excluded ? 'add_circle' : 'do_not_disturb_on'}</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-surface-container dark:bg-[#1b1e21]">
                    <tr className="text-on-surface dark:text-white font-black border-t border-outline-variant/20 dark:border-white/10">
                      <td className="px-2.5 py-2.5" colSpan={3}>Total ({included.length} harta)</td>
                      <td className="px-2.5 py-2.5 text-right tabular-nums">Rp {Math.round(total).toLocaleString('id-ID')}</td>
                      <td className="px-2.5 py-2.5" colSpan={2}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* F6.3 Daftar Utang/Kewajiban */}
            {utangRows.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-on-surface dark:text-white flex items-center gap-2"><span className="material-symbols-outlined text-[18px] text-primary dark:text-[#a7c8ff]">credit_card</span>Daftar Utang / Kewajiban</h3>
                  <button onClick={handleCopyUtangCSV} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${utangCopied ? 'bg-emerald-500 text-white' : 'bg-surface-container dark:bg-white/10 text-on-surface dark:text-white border border-outline-variant/20 dark:border-white/10'}`}>
                    <span className="material-symbols-outlined text-[15px]">{utangCopied ? 'check' : 'content_copy'}</span>{utangCopied ? 'Tersalin' : 'Salin CSV'}
                  </button>
                </div>
                <div className="overflow-x-auto rounded-xl border border-outline-variant/10 dark:border-white/5">
                  <table className="w-full text-xs min-w-[520px]">
                    <thead><tr className="bg-surface-container-low dark:bg-white/5 text-left text-on-surface-variant dark:text-slate-400">
                      <th className="px-2.5 py-2 font-black">Nama Utang</th><th className="px-2.5 py-2 font-black">Pemberi Pinjaman</th><th className="px-2.5 py-2 font-black">Tahun</th><th className="px-2.5 py-2 font-black text-right">Jumlah</th>
                    </tr></thead>
                    <tbody>
                      {utangRows.map((u) => (
                        <tr key={u.id} className="border-t border-outline-variant/10 dark:border-white/5">
                          <td className="px-2.5 py-2 text-on-surface dark:text-white font-semibold">{u.nama}</td>
                          <td className="px-2.5 py-2 text-on-surface-variant dark:text-slate-300">{u.pemberiPinjaman}</td>
                          <td className="px-2.5 py-2 text-on-surface-variant dark:text-slate-300 tabular-nums">{u.tahun}</td>
                          <td className="px-2.5 py-2 text-right tabular-nums text-on-surface dark:text-white">Rp {Math.round(u.jumlah).toLocaleString('id-ID')}</td>
                        </tr>
                      ))}
                      <tr className="border-t border-outline-variant/20 dark:border-white/10 bg-surface-container-low/60 dark:bg-white/[0.03] font-black">
                        <td className="px-2.5 py-2 text-on-surface dark:text-white" colSpan={3}>Total Kewajiban</td>
                        <td className="px-2.5 py-2 text-right tabular-nums text-on-surface dark:text-white">Rp {Math.round(totalUtang).toLocaleString('id-ID')}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Aksi */}
            <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
              <button onClick={handleCopyCSV}
                className={`flex items-center justify-center gap-2 px-5 py-3 rounded-2xl font-bold text-sm transition-all cursor-pointer ${copied ? 'bg-emerald-500 text-white' : 'bg-surface-container dark:bg-white/10 text-on-surface dark:text-white hover:bg-surface-container-high dark:hover:bg-white/15 border border-outline-variant/20 dark:border-white/10'}`}>
                <span className="material-symbols-outlined text-lg">{copied ? 'check' : 'content_copy'}</span>
                {copied ? 'CSV Tersalin' : 'Salin CSV'}
              </button>
              <button onClick={handlePrint}
                className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-primary dark:bg-[#a7c8ff] text-white dark:text-[#001b3c] font-bold text-sm hover:opacity-90 active:scale-[0.99] transition-all cursor-pointer">
                <span className="material-symbols-outlined text-lg">print</span>
                Cetak / Simpan PDF
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default FinanceSPTExportModal;
