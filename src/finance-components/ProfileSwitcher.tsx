import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useFinanceStore, type Profile } from '../store/useFinanceStore';

const EMOJIS = ['👤', '👩', '👨', '🧑', '👧', '👦', '👨‍👩‍👧', '🏠', '🏢', '💼', '💰', '🐷'];
const COLORS = ['#2563eb', '#0891b2', '#059669', '#d97706', '#dc2626', '#7c3aed', '#db2777', '#475569'];

/** Pil pengalih profil di header + modal kelola profil (multi-Sheet). */
const ProfileSwitcher: React.FC = () => {
  const profiles = useFinanceStore((s) => s.profiles);
  const activeProfileId = useFinanceStore((s) => s.activeProfileId);
  const isSyncing = useFinanceStore((s) => s.isSyncing);
  const switchProfile = useFinanceStore((s) => s.switchProfile);

  const [open, setOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const active = profiles.find((p) => p.id === activeProfileId) || null;

  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const doSwitch = async (id: string) => {
    setOpen(false);
    if (id !== activeProfileId) await switchProfile(id);
  };

  return (
    <>
      <div className="relative" ref={ref}>
        <button
          onClick={() => setOpen((v) => !v)}
          title="Ganti profil / akun"
          className="flex items-center gap-1.5 pl-1.5 pr-2 py-1 rounded-full border border-slate-200 dark:border-white/10 bg-white/70 dark:bg-white/5 hover:border-primary/40 transition-colors cursor-pointer max-w-[42vw] sm:max-w-none"
        >
          <span className="w-6 h-6 rounded-full flex items-center justify-center text-sm shrink-0" style={{ background: (active?.color || '#475569') + '22' }}>
            {active ? active.emoji : '👤'}
          </span>
          <span className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate hidden sm:block max-w-[120px]">
            {active ? active.name : 'Profil Utama'}
          </span>
          <span className="material-symbols-outlined text-[16px] text-slate-400 shrink-0">expand_more</span>
        </button>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.97 }}
              transition={{ duration: 0.14 }}
              className="absolute right-0 mt-2 w-64 bg-white dark:bg-[#151a22] rounded-2xl shadow-2xl border border-slate-100 dark:border-white/10 overflow-hidden z-50"
            >
              <div className="px-3 py-2.5 border-b border-slate-100 dark:border-white/5">
                <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Profil aktif</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="w-7 h-7 rounded-full flex items-center justify-center text-base" style={{ background: (active?.color || '#475569') + '22' }}>{active ? active.emoji : '👤'}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-800 dark:text-white truncate">{active ? active.name : 'Profil Utama'}</p>
                    <p className="text-[10px] text-slate-400 truncate">{active ? 'Sheet terpisah' : 'Sheet bawaan akun ini'}</p>
                  </div>
                </div>
              </div>

              <div className="max-h-56 overflow-y-auto custom-scrollbar py-1">
                {profiles.length === 0 && (
                  <p className="px-3 py-2 text-[11px] text-slate-400 leading-relaxed">Belum ada profil tambahan. Tambahkan anggota keluarga atau entitas usaha, masing-masing dengan Google Sheet sendiri.</p>
                )}
                {profiles.map((p) => (
                  <button key={p.id} onClick={() => doSwitch(p.id)} disabled={isSyncing}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer disabled:opacity-50 ${p.id === activeProfileId ? 'bg-primary/5' : ''}`}>
                    <span className="w-7 h-7 rounded-full flex items-center justify-center text-base shrink-0" style={{ background: p.color + '22' }}>{p.emoji}</span>
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate flex-1">{p.name}</span>
                    {p.id === activeProfileId && <span className="material-symbols-outlined text-[18px] text-primary dark:text-[#a7c8ff]">check_circle</span>}
                  </button>
                ))}
              </div>

              <button onClick={() => { setOpen(false); setManageOpen(true); }}
                className="w-full flex items-center gap-2 px-3 py-2.5 border-t border-slate-100 dark:border-white/5 text-sm font-bold text-primary dark:text-[#a7c8ff] hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer">
                <span className="material-symbols-outlined text-[18px]">manage_accounts</span> Kelola profil
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <ProfileManagerModal isOpen={manageOpen} onClose={() => setManageOpen(false)} />
    </>
  );
};

const EMPTY: Omit<Profile, 'id'> = { name: '', emoji: '👤', color: COLORS[0], googleSheetUrl: '', spreadsheetId: '' };

const ProfileManagerModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const profiles = useFinanceStore((s) => s.profiles);
  const activeProfileId = useFinanceStore((s) => s.activeProfileId);
  const addProfile = useFinanceStore((s) => s.addProfile);
  const updateProfile = useFinanceStore((s) => s.updateProfile);
  const deleteProfile = useFinanceStore((s) => s.deleteProfile);
  const switchProfile = useFinanceStore((s) => s.switchProfile);
  const captureCurrentAsProfile = useFinanceStore((s) => s.captureCurrentAsProfile);
  const currentUrl = useFinanceStore((s) => s.googleSheetUrl);
  const currentSid = useFinanceStore((s) => s.spreadsheetId);

  const [editing, setEditing] = useState<Profile | null>(null);
  const [form, setForm] = useState<Omit<Profile, 'id'>>(EMPTY);
  const [showForm, setShowForm] = useState(false);

  if (!isOpen) return null;

  const startAdd = () => { setEditing(null); setForm(EMPTY); setShowForm(true); };
  const startEdit = (p: Profile) => { setEditing(p); setForm({ name: p.name, emoji: p.emoji, color: p.color, googleSheetUrl: p.googleSheetUrl, spreadsheetId: p.spreadsheetId }); setShowForm(true); };

  const save = () => {
    if (!form.name.trim()) return;
    if (editing) updateProfile({ ...form, id: editing.id });
    else addProfile(form);
    setShowForm(false);
  };

  const captureCurrent = () => {
    const name = (window.prompt('Nama profil untuk koneksi Google Sheet saat ini:', 'Profil Utama') || '').trim();
    if (name) captureCurrentAsProfile(name, '👤', COLORS[0]);
  };

  const set = (patch: Partial<Omit<Profile, 'id'>>) => setForm((f) => ({ ...f, ...patch }));

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[130] flex items-start sm:items-center justify-center p-2 sm:p-4 overflow-y-auto">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />
        <motion.div initial={{ opacity: 0, scale: 0.97, y: 24 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97, y: 24 }}
          transition={{ type: 'spring', damping: 28, stiffness: 240 }}
          className="relative w-full max-w-lg my-auto bg-surface dark:bg-[#121416] rounded-3xl shadow-2xl border border-outline-variant/20 dark:border-white/10 max-h-[94vh] overflow-y-auto custom-scrollbar">
          <div className="sticky top-0 z-10 flex items-center justify-between px-5 sm:px-6 py-4 bg-surface/95 dark:bg-[#121416]/95 backdrop-blur border-b border-outline-variant/10 dark:border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-primary/10 dark:bg-[#a7c8ff]/15 flex items-center justify-center text-primary dark:text-[#a7c8ff]"><span className="material-symbols-outlined">groups</span></div>
              <div>
                <h2 className="text-lg font-black font-headline text-on-surface dark:text-white leading-none">Profil / Multi-akun</h2>
                <p className="text-[11px] text-on-surface-variant dark:text-slate-400 mt-1">Kelola keuangan beberapa orang / entitas</p>
              </div>
            </div>
            <button onClick={onClose} className="w-9 h-9 rounded-full bg-surface-container dark:bg-white/5 flex items-center justify-center text-on-surface dark:text-white cursor-pointer"><span className="material-symbols-outlined text-lg">close</span></button>
          </div>

          <div className="p-5 sm:p-6 space-y-4">
            {!showForm ? (
              <>
                <div className="rounded-2xl bg-amber-500/5 border border-amber-500/20 p-3 text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">
                  <strong>Cara kerja:</strong> tiap profil menunjuk ke <strong>Google Sheet sendiri</strong>. Buat dulu Sheet baru dari template (salin file template), lalu daftarkan URL/ID-nya di sini. Berpindah profil akan memuat ulang data dari Sheet tersebut — data antarprofil tidak tercampur. Daftar profil disimpan di perangkat ini saja.
                </div>

                <div className="space-y-2">
                  {profiles.length === 0 && <p className="text-sm text-on-surface-variant dark:text-slate-400 text-center py-4">Belum ada profil. Tambahkan yang pertama di bawah.</p>}
                  {profiles.map((p) => (
                    <div key={p.id} className="flex items-center gap-3 p-3 rounded-2xl border border-outline-variant/10 dark:border-white/5 bg-surface-container-low dark:bg-white/5">
                      <span className="w-9 h-9 rounded-full flex items-center justify-center text-lg shrink-0" style={{ background: p.color + '22' }}>{p.emoji}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-on-surface dark:text-white truncate">{p.name} {p.id === activeProfileId && <span className="text-[10px] font-black text-primary dark:text-[#a7c8ff] align-middle">• AKTIF</span>}</p>
                        <p className="text-[10px] text-on-surface-variant dark:text-slate-400 truncate font-mono">{p.spreadsheetId ? `ID: ${p.spreadsheetId.slice(0, 18)}…` : p.googleSheetUrl ? p.googleSheetUrl.replace(/^https?:\/\//, '').slice(0, 30) + '…' : 'belum ada koneksi'}</p>
                      </div>
                      {p.id !== activeProfileId && <button onClick={() => switchProfile(p.id)} title="Aktifkan" className="w-8 h-8 rounded-full hover:bg-primary/10 flex items-center justify-center text-primary dark:text-[#a7c8ff] cursor-pointer"><span className="material-symbols-outlined text-[19px]">login</span></button>}
                      <button onClick={() => startEdit(p)} className="w-8 h-8 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 flex items-center justify-center text-slate-500 cursor-pointer"><span className="material-symbols-outlined text-[18px]">edit</span></button>
                      <button onClick={() => { if (window.confirm(`Hapus profil "${p.name}"? Google Sheet-nya tidak ikut terhapus.`)) deleteProfile(p.id); }} className="w-8 h-8 rounded-full hover:bg-error/10 flex items-center justify-center text-error dark:text-[#ffb4ab] cursor-pointer"><span className="material-symbols-outlined text-[18px]">delete</span></button>
                    </div>
                  ))}
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <button onClick={startAdd} className="flex-1 py-3 rounded-2xl bg-primary dark:bg-[#a7c8ff] text-white dark:text-[#001b3c] font-bold text-sm flex items-center justify-center gap-2 cursor-pointer"><span className="material-symbols-outlined text-[19px]">add</span> Tambah profil</button>
                  {(currentUrl || currentSid) && !profiles.some((p) => p.googleSheetUrl === currentUrl && p.spreadsheetId === (currentSid || '')) && (
                    <button onClick={captureCurrent} className="flex-1 py-3 rounded-2xl bg-surface-container dark:bg-white/10 text-on-surface dark:text-white font-bold text-sm cursor-pointer">Simpan koneksi saat ini</button>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-on-surface-variant dark:text-slate-400">Nama profil</label>
                  <input value={form.name} onChange={(e) => set({ name: e.target.value })} placeholder="mis. Istri, Usaha Toko, Anak" autoFocus
                    className="w-full bg-surface-container-low dark:bg-white/5 border border-outline-variant/10 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm font-semibold text-on-surface dark:text-white outline-none focus:border-primary/50" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-on-surface-variant dark:text-slate-400">Avatar</label>
                    <div className="flex flex-wrap gap-1">
                      {EMOJIS.map((e) => (
                        <button key={e} onClick={() => set({ emoji: e })} className={`w-8 h-8 rounded-lg text-base flex items-center justify-center cursor-pointer ${form.emoji === e ? 'ring-2 ring-primary bg-primary/10' : 'bg-surface-container-low dark:bg-white/5'}`}>{e}</button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-on-surface-variant dark:text-slate-400">Warna</label>
                    <div className="flex flex-wrap gap-1.5">
                      {COLORS.map((c) => (
                        <button key={c} onClick={() => set({ color: c })} className={`w-7 h-7 rounded-full cursor-pointer ${form.color === c ? 'ring-2 ring-offset-2 ring-offset-surface dark:ring-offset-[#121416] ring-slate-400' : ''}`} style={{ background: c }} />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-on-surface-variant dark:text-slate-400">URL Web App Apps Script <span className="font-normal text-slate-400">(mode makro)</span></label>
                  <input value={form.googleSheetUrl} onChange={(e) => set({ googleSheetUrl: e.target.value })} placeholder="https://script.google.com/macros/s/…/exec"
                    className="w-full bg-surface-container-low dark:bg-white/5 border border-outline-variant/10 dark:border-white/10 rounded-xl px-3 py-2.5 text-xs font-mono text-on-surface dark:text-white outline-none focus:border-primary/50" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-on-surface-variant dark:text-slate-400">ID / URL Spreadsheet <span className="font-normal text-slate-400">(mode API/OAuth — opsional)</span></label>
                  <input value={form.spreadsheetId} onChange={(e) => set({ spreadsheetId: e.target.value })} placeholder="1AbC…xyz atau tempel URL spreadsheet"
                    className="w-full bg-surface-container-low dark:bg-white/5 border border-outline-variant/10 dark:border-white/10 rounded-xl px-3 py-2.5 text-xs font-mono text-on-surface dark:text-white outline-none focus:border-primary/50" />
                  <p className="text-[10px] text-on-surface-variant/70 dark:text-slate-500">Isi salah satu sesuai cara Anda terhubung. Untuk mode OAuth, ID cukup; token Google akun ini dipakai bersama.</p>
                </div>

                <div className="flex gap-2 pt-1">
                  <button onClick={() => setShowForm(false)} className="flex-1 py-3 rounded-2xl bg-surface-container dark:bg-white/10 text-on-surface dark:text-white font-bold text-sm cursor-pointer">Batal</button>
                  <button onClick={save} disabled={!form.name.trim()} className="flex-[2] py-3 rounded-2xl bg-primary dark:bg-[#a7c8ff] text-white dark:text-[#001b3c] font-bold text-sm disabled:opacity-40 cursor-pointer">{editing ? 'Simpan perubahan' : 'Tambah profil'}</button>
                </div>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};

export default ProfileSwitcher;
