import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useFinanceStore } from '../store/useFinanceStore';
import {
  parseCSV, parseSpreadsheetFile, findHeaderRow, buildTransactions, guessMapping, toTransactionPayload,
  BANK_PRESETS, readImportProfiles, serializeImportProfiles, buildTemplateCSV,
  type CsvMapping, type ImportProfile,
} from './csvImportUtils';
import { buildTemplateXLSXBlob } from './importTemplate';

interface CsvImportModalProps { isOpen: boolean; onClose: () => void }

const formatRp = (n: number) => `${n < 0 ? '−' : '+'}Rp ${Math.round(Math.abs(n)).toLocaleString('id-ID')}`;

export const CsvImportModal: React.FC<CsvImportModalProps> = ({ isOpen, onClose }) => {
  const accounts = useFinanceStore((s) => s.accounts);
  const budgetCategories = useFinanceStore((s) => s.budgetCategories);
  const transactions = useFinanceStore((s) => s.transactions);
  const settings = useFinanceStore((s) => s.settings);
  const updateSettings = useFinanceStore((s) => s.updateSettings);

  const categoryList = useMemo(() => {
    const set = new Set<string>();
    budgetCategories.forEach((c) => c.name && set.add(c.name));
    transactions.forEach((t) => t.category && set.add(t.category));
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [budgetCategories, transactions]);

  const [raw, setRaw] = useState('');
  const [rows, setRows] = useState<string[][]>([]);
  const [map, setMap] = useState<CsvMapping | null>(null);
  const [amountMode, setAmountMode] = useState<'signed' | 'debitcredit'>('signed');
  const [account, setAccount] = useState('');
  const [presetKey, setPresetKey] = useState('auto');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPdfHelp, setShowPdfHelp] = useState(false);
  const [skipped, setSkipped] = useState(0);
  const [importError, setImportError] = useState<string | null>(null);

  const profiles = useMemo(() => readImportProfiles(settings.find((s) => s.key === 'import_profiles')?.value), [settings]);

  const reset = () => { setRaw(''); setRows([]); setMap(null); setDone(null); setSkipped(0); setImportError(null); };

  const [xlsxBusy, setXlsxBusy] = useState(false);

  const triggerDownload = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const downloadTemplateCSV = () => {
    const acc = accounts.find((a) => a.type === 'bank')?.name || accounts[0]?.name || 'Nama Akun Anda';
    triggerDownload(new Blob(['﻿' + buildTemplateCSV(acc)], { type: 'text/csv;charset=utf-8' }), 'template-transaksi-dompetku.csv');
  };

  const downloadTemplateExcel = async () => {
    setXlsxBusy(true);
    try {
      const blob = await buildTemplateXLSXBlob(accounts, categoryList);
      triggerDownload(blob, 'template-transaksi-dompetku.xlsx');
    } catch { alert('Gagal membuat template Excel. Coba unduh versi CSV.'); }
    setXlsxBusy(false);
  };

  const templateMode = !!(map && ((map.categoryCol ?? -1) >= 0 || (map.accountCol ?? -1) >= 0 || (map.typeCol ?? -1) >= 0));

  const applyRows = (parsed: string[][], preset = presetKey) => {
    const hdr = findHeaderRow(parsed);
    const sliced = hdr > 0 ? parsed.slice(hdr) : parsed;
    setSkipped(hdr > 0 ? hdr : 0);
    setRows(sliced);
    const p = BANK_PRESETS.find((b) => b.key === preset);
    const g = guessMapping(sliced, p && p.key !== 'auto' ? p : undefined);
    setMap(g);
    setAmountMode(g.amountCol >= 0 ? 'signed' : 'debitcredit');
    if (!account) setAccount(accounts.find((a) => a.type === 'bank')?.name || accounts[0]?.name || '');
  };

  const ingest = (text: string) => applyRows(parseCSV(text));

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setLoading(true);
    try {
      const parsed = await parseSpreadsheetFile(f);
      applyRows(parsed);
    } catch { alert('Gagal membaca file. Pastikan format CSV atau Excel (.xlsx/.xls) yang valid.'); }
    setLoading(false);
    e.target.value = '';
  };

  const onPreset = (key: string) => { setPresetKey(key); if (rows.length) applyRows(rows, key); };

  const loadProfile = (name: string) => {
    const pr = profiles.find((p) => p.name === name);
    if (!pr) return;
    setPresetKey(pr.preset);
    setMap(pr.mapping);
    setAmountMode(pr.amountMode);
    if (pr.account) setAccount(pr.account);
  };

  const saveProfile = async () => {
    if (!map) return;
    const name = (window.prompt('Simpan pemetaan ini sebagai (mis. "BCA Fakhri"):', BANK_PRESETS.find((b) => b.key === presetKey)?.label || 'Profil impor') || '').trim();
    if (!name) return;
    const entry: ImportProfile = { name, preset: presetKey, mapping: map, amountMode, account };
    const next = [...profiles.filter((p) => p.name !== name), entry];
    const arr = settings.filter((s) => s.key !== 'import_profiles');
    await updateSettings([...arr, { key: 'import_profiles', value: serializeImportProfiles(next) }]);
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
    setImportError(null);
    const store = useFinanceStore.getState();
    // Simpan SEMUA baris dalam satu tulis batch (anti rate-limit + hasilnya jujur).
    const result = await store.addTransactionsBulk(valid.map((p) => toTransactionPayload(p, account)));
    if (!result.ok) {
      // Jangan tampilkan sukses palsu & jangan sesuaikan saldo bila tulis ke Sheet gagal.
      setBusy(false);
      setImportError('Gagal menyimpan ke Google Sheets — transaksi TIDAK jadi diimpor. Periksa koneksi Anda lalu coba lagi.');
      return;
    }
    // Hanya sesuaikan saldo akun setelah transaksi benar-benar tersimpan.
    const net = valid.reduce((s, p) => s + p.amount, 0);
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
              <h2 className="text-lg font-black font-headline text-on-surface dark:text-white">Impor Mutasi Bank</h2>
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
                  <button onClick={reset} className="px-5 py-2.5 rounded-xl bg-surface-container dark:bg-white/10 text-on-surface dark:text-white font-bold text-sm cursor-pointer">Impor lagi</button>
                  <button onClick={onClose} className="px-5 py-2.5 rounded-xl bg-primary dark:bg-[#a7c8ff] text-white dark:text-[#001b3c] font-bold text-sm cursor-pointer">Selesai</button>
                </div>
              </div>
            ) : rows.length === 0 ? (
              <>
                {/* Preset bank + profil tersimpan */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-on-surface-variant dark:text-slate-400">Bank / sumber</label>
                    <select value={presetKey} onChange={(e) => setPresetKey(e.target.value)} className="w-full bg-surface-container-low dark:bg-white/5 border border-outline-variant/10 dark:border-white/10 rounded-xl px-2.5 py-2 text-xs font-bold text-on-surface dark:text-white outline-none focus:border-primary/50 cursor-pointer">
                      {BANK_PRESETS.map((b) => <option key={b.key} value={b.key}>{b.label}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-on-surface-variant dark:text-slate-400">Profil tersimpan</label>
                    <select value="" onChange={(e) => e.target.value && loadProfile(e.target.value)} disabled={!profiles.length} className="w-full bg-surface-container-low dark:bg-white/5 border border-outline-variant/10 dark:border-white/10 rounded-xl px-2.5 py-2 text-xs font-bold text-on-surface dark:text-white outline-none focus:border-primary/50 cursor-pointer disabled:opacity-50">
                      <option value="">{profiles.length ? '— pilih profil —' : '(belum ada)'}</option>
                      {profiles.map((p) => <option key={p.name} value={p.name}>{p.name}</option>)}
                    </select>
                  </div>
                </div>

                <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-outline-variant/30 dark:border-white/15 rounded-2xl py-7 cursor-pointer hover:border-primary/50 transition-colors">
                  <span className="material-symbols-outlined text-3xl text-primary dark:text-[#a7c8ff]">{loading ? 'hourglass_top' : 'cloud_upload'}</span>
                  <span className="text-sm font-bold text-on-surface dark:text-white">{loading ? 'Membaca file…' : 'Pilih file CSV atau Excel'}</span>
                  <span className="text-[11px] text-on-surface-variant dark:text-slate-400">.csv · .xlsx · .xls — dari internet/mobile banking</span>
                  <input type="file" accept=".csv,.xlsx,.xls,.xlsm,text/csv,text/plain" onChange={onFile} className="hidden" />
                </label>

                <div className="flex items-center gap-2"><div className="flex-1 h-px bg-outline-variant/20 dark:bg-white/10" /><span className="text-[10px] text-on-surface-variant dark:text-slate-500 font-bold">ATAU TEMPEL</span><div className="flex-1 h-px bg-outline-variant/20 dark:bg-white/10" /></div>
                <textarea value={raw} onChange={(e) => setRaw(e.target.value)} placeholder="Tempel isi CSV, atau salin tabel dari statement PDF lalu tempel di sini…" rows={4}
                  className="w-full bg-surface-container-low dark:bg-white/5 border border-outline-variant/10 dark:border-white/10 rounded-2xl px-3 py-2.5 text-xs font-mono text-on-surface dark:text-white outline-none focus:border-primary/50 resize-none" />
                <button onClick={() => raw.trim() && ingest(raw)} disabled={!raw.trim()} className="w-full py-3 rounded-2xl bg-primary dark:bg-[#a7c8ff] text-white dark:text-[#001b3c] font-bold text-sm disabled:opacity-40 cursor-pointer">Baca Data</button>

                {/* Panduan PDF */}
                <button onClick={() => setShowPdfHelp((v) => !v)} className="w-full flex items-center justify-between text-[11px] font-bold text-on-surface-variant dark:text-slate-400 py-1 cursor-pointer">
                  <span className="flex items-center gap-1.5"><span className="material-symbols-outlined text-[16px]">picture_as_pdf</span>Statement Anda berupa PDF?</span>
                  <span className="material-symbols-outlined text-[18px]">{showPdfHelp ? 'expand_less' : 'expand_more'}</span>
                </button>
                {showPdfHelp && (
                  <div className="rounded-xl bg-primary/5 dark:bg-[#a7c8ff]/10 border border-primary/15 dark:border-[#a7c8ff]/15 p-3 text-[11.5px] leading-relaxed text-on-surface-variant dark:text-slate-300 space-y-1">
                    <p><b className="text-on-surface dark:text-white">Cara dari PDF:</b></p>
                    <p>1. Buka PDF e-statement, blok (drag) area <b>tabel transaksi</b>-nya.</p>
                    <p>2. Salin (Cmd/Ctrl+C).</p>
                    <p>3. Tempel di kotak "ATAU TEMPEL" di atas → klik <b>Baca Data</b>.</p>
                    <p className="text-on-surface-variant/70 dark:text-slate-500">Baris info rekening di atas otomatis dilewati; kolom akan Anda petakan di langkah berikut. Jika bank Anda bisa ekspor CSV/Excel, itu lebih rapi.</p>
                  </div>
                )}

                {/* Template DompetKu — untuk input massal / migrasi */}
                <div className="rounded-xl bg-surface-container-low dark:bg-white/5 border border-outline-variant/10 dark:border-white/5 p-3 space-y-2.5">
                  <div className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-primary dark:text-[#a7c8ff] shrink-0">table_view</span>
                    <div className="min-w-0">
                      <p className="text-[12px] font-bold text-on-surface dark:text-white">Input massal / migrasi?</p>
                      <p className="text-[11px] text-on-surface-variant dark:text-slate-400">Unduh template berkolom <b>Tanggal · Deskripsi · Jumlah · Tipe · Kategori · Akun</b>, isi di Excel/Sheets, lalu impor kembali — kategori &amp; akun ikut terbaca.</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={downloadTemplateExcel} disabled={xlsxBusy} className="flex-1 px-3 py-2 rounded-lg bg-primary dark:bg-[#a7c8ff] text-white dark:text-[#001b3c] text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50">
                      <span className="material-symbols-outlined text-[16px]">{xlsxBusy ? 'hourglass_top' : 'grid_on'}</span>{xlsxBusy ? 'Membuat…' : 'Excel (dropdown)'}
                    </button>
                    <button onClick={downloadTemplateCSV} className="flex-1 px-3 py-2 rounded-lg bg-surface-container dark:bg-white/10 text-on-surface dark:text-white text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer">
                      <span className="material-symbols-outlined text-[16px]">description</span>CSV
                    </button>
                  </div>
                  <p className="text-[10px] text-on-surface-variant/60 dark:text-slate-500">Excel dilengkapi <b>dropdown Tipe/Kategori/Akun</b> (anti salah ketik) dari data akun &amp; kategori Anda.</p>
                </div>
              </>
            ) : (
              <>
                {skipped > 0 && <p className="text-[11px] text-on-surface-variant dark:text-slate-400 bg-surface-container-low dark:bg-white/5 rounded-lg px-3 py-1.5"><span className="material-symbols-outlined text-[14px] align-middle mr-1">info</span>{skipped} baris info rekening di atas dilewati otomatis.</p>}
                {templateMode && <p className="text-[11px] text-emerald-700 dark:text-emerald-400 bg-emerald-500/5 border border-emerald-500/20 rounded-lg px-3 py-1.5"><span className="material-symbols-outlined text-[14px] align-middle mr-1">table_view</span>Template terdeteksi — Kategori, Akun &amp; Tipe dibaca langsung dari file.</p>}

                {/* Mapping */}
                <div className="rounded-2xl border border-outline-variant/10 dark:border-white/10 p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-[11px] font-black uppercase tracking-wide text-on-surface-variant dark:text-slate-400">Pemetaan kolom</span>
                    <div className="flex items-center gap-2">
                      <select value={presetKey} onChange={(e) => onPreset(e.target.value)} className="bg-surface-container-low dark:bg-white/5 border border-outline-variant/10 dark:border-white/10 rounded-lg px-2 py-1 text-[11px] font-bold text-on-surface dark:text-white outline-none cursor-pointer">
                        {BANK_PRESETS.map((b) => <option key={b.key} value={b.key}>{b.label}</option>)}
                      </select>
                      <label className="flex items-center gap-1.5 text-[11px] font-bold text-on-surface dark:text-white cursor-pointer">
                        <input type="checkbox" checked={!!map?.hasHeader} onChange={(e) => setM({ hasHeader: e.target.checked })} /> Judul
                      </label>
                    </div>
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
                  <div className="grid grid-cols-[1fr_auto] gap-2 items-end">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-on-surface-variant dark:text-slate-400">Impor ke akun</label>
                      <select value={account} onChange={(e) => setAccount(e.target.value)} className="w-full bg-surface-container-low dark:bg-white/5 border border-outline-variant/10 dark:border-white/10 rounded-xl px-3 py-2 text-sm font-bold text-on-surface dark:text-white outline-none focus:border-primary/50 cursor-pointer">
                        {accounts.map((a) => <option key={a.id} value={a.name}>{a.name}</option>)}
                      </select>
                    </div>
                    <button onClick={saveProfile} title="Simpan pemetaan agar impor berikutnya 1-klik" className="px-3 py-2 rounded-xl bg-surface-container dark:bg-white/10 text-on-surface dark:text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer whitespace-nowrap"><span className="material-symbols-outlined text-[16px]">bookmark_add</span>Simpan profil</button>
                  </div>
                </div>

                {/* Preview */}
                <div>
                  <p className="text-[11px] font-bold text-on-surface-variant dark:text-slate-400 mb-2">Pratinjau · <strong className="text-emerald-600 dark:text-emerald-400">{valid.length} valid</strong>{parsed.length - valid.length > 0 && <span className="text-amber-600 dark:text-amber-400"> · {parsed.length - valid.length} dilewati</span>}</p>
                  <div className="rounded-2xl border border-outline-variant/10 dark:border-white/5 overflow-hidden max-h-56 overflow-y-auto custom-scrollbar">
                    <table className="w-full text-xs">
                      <thead className="bg-surface-container dark:bg-[#1b1e21] sticky top-0"><tr className="text-[10px] uppercase text-on-surface-variant dark:text-slate-400"><th className="px-3 py-2 text-left font-black">Tanggal</th><th className="px-3 py-2 text-left font-black">Keterangan{templateMode && <span className="lowercase font-bold opacity-60"> · kategori · akun</span>}</th><th className="px-3 py-2 text-right font-black">Nominal</th></tr></thead>
                      <tbody className="divide-y divide-outline-variant/10 dark:divide-white/5">
                        {parsed.slice(0, 30).map((p, i) => (
                          <tr key={i} className={p.valid ? '' : 'opacity-40'}>
                            <td className="px-3 py-1.5 tabular-nums text-on-surface dark:text-slate-200 whitespace-nowrap align-top">{p.date || '—'}</td>
                            <td className="px-3 py-1.5 text-on-surface dark:text-slate-200 align-top">
                              <div className="truncate max-w-[240px]">{p.desc}</div>
                              {templateMode && (
                                <div className="flex items-center gap-1 mt-0.5 text-[10px] text-on-surface-variant/70 dark:text-slate-500">
                                  <span className="material-symbols-outlined text-[12px] leading-none">sell</span>
                                  <span className="truncate max-w-[130px]">{p.category || '—'}</span>
                                  <span className="opacity-40">·</span>
                                  <span className="material-symbols-outlined text-[12px] leading-none">account_balance_wallet</span>
                                  <span className="truncate max-w-[90px]">{p.account || account || '—'}</span>
                                </div>
                              )}
                            </td>
                            <td className={`px-3 py-1.5 text-right tabular-nums font-bold whitespace-nowrap align-top ${p.amount >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-error dark:text-[#ffb4ab]'}`}>{formatRp(p.amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {importError && (
                  <div className="flex gap-2.5 items-start rounded-2xl border border-error/30 dark:border-[#ffb4ab]/25 bg-error/5 dark:bg-[#ffb4ab]/10 p-3.5">
                    <span className="material-symbols-outlined text-error dark:text-[#ffb4ab] text-lg shrink-0">error</span>
                    <p className="text-xs text-error dark:text-[#ffb4ab] leading-relaxed font-medium">{importError}</p>
                  </div>
                )}

                <div className="flex gap-2">
                  <button onClick={reset} className="flex-1 py-3 rounded-2xl bg-surface-container dark:bg-white/10 text-on-surface dark:text-white font-bold text-sm cursor-pointer">Ganti file</button>
                  <button onClick={handleImport} disabled={!valid.length || !account || busy} className="flex-[2] py-3 rounded-2xl bg-primary dark:bg-[#a7c8ff] text-white dark:text-[#001b3c] font-bold text-sm disabled:opacity-40 cursor-pointer">{busy ? 'Mengimpor…' : importError ? `Coba lagi (${valid.length})` : `Impor ${valid.length} transaksi`}</button>
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
