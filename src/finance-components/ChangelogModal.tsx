import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CHANGELOG, CURRENT_VERSION, type ChangelogEntry } from './changelogData';

const TAG_LABEL: Record<ChangelogEntry['tag'], { label: string; cls: string }> = {
  feature: { label: 'Fitur baru', cls: 'text-primary dark:text-[#a7c8ff] bg-primary/10 dark:bg-[#a7c8ff]/15' },
  fix: { label: 'Perbaikan', cls: 'text-amber-600 dark:text-amber-400 bg-amber-500/10' },
  migration: { label: 'Update Apps Script', cls: 'text-purple-600 dark:text-purple-300 bg-purple-500/10' },
  base: { label: 'Rilis dasar', cls: 'text-on-surface-variant dark:text-slate-400 bg-surface-container dark:bg-white/10' },
};

const Group: React.FC<{ label: string; icon: string; color: string; items?: string[] }> = ({ label, icon, color, items }) => {
  if (!items || !items.length) return null;
  return (
    <div className="mt-2">
      <p className={`text-[10px] font-black uppercase tracking-wide ${color} mb-1 flex items-center gap-1`}><span className="material-symbols-outlined text-[14px]">{icon}</span>{label}</p>
      <ul className="space-y-1.5">
        {items.map((t, i) => (
          <li key={i} className="flex gap-2 text-[12.5px] text-on-surface dark:text-slate-200 leading-relaxed">
            <span className="text-on-surface-variant/40 dark:text-slate-600 mt-1.5 shrink-0">•</span><span>{t}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

const ChangelogModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[125] flex items-start sm:items-center justify-center p-2 sm:p-4 overflow-y-auto">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />
        <motion.div initial={{ opacity: 0, scale: 0.97, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97, y: 20 }}
          transition={{ type: 'spring', damping: 28, stiffness: 240 }}
          className="relative w-full max-w-lg my-auto bg-surface dark:bg-[#121416] rounded-3xl shadow-2xl border border-outline-variant/20 dark:border-white/10 max-h-[92vh] overflow-y-auto custom-scrollbar">
          <div className="sticky top-0 z-10 flex items-center justify-between px-5 sm:px-6 py-4 bg-surface/95 dark:bg-[#121416]/95 backdrop-blur border-b border-outline-variant/10 dark:border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-primary/10 dark:bg-[#a7c8ff]/15 flex items-center justify-center text-primary dark:text-[#a7c8ff]"><span className="material-symbols-outlined">history</span></div>
              <div>
                <h2 className="text-lg font-black font-headline text-on-surface dark:text-white leading-none">Riwayat Pembaruan</h2>
                <p className="text-[11px] text-on-surface-variant dark:text-slate-400 mt-1">DompetKu · versi saat ini v{CURRENT_VERSION}</p>
              </div>
            </div>
            <button onClick={onClose} className="w-9 h-9 rounded-full bg-surface-container dark:bg-white/5 flex items-center justify-center text-on-surface dark:text-white cursor-pointer"><span className="material-symbols-outlined text-lg">close</span></button>
          </div>

          <div className="p-4 sm:p-5">
            <ol className="relative border-l-2 border-outline-variant/15 dark:border-white/10 ml-2 space-y-4">
              {CHANGELOG.map((e) => {
                const isCurrent = e.version === CURRENT_VERSION;
                const tag = TAG_LABEL[e.tag];
                return (
                  <li key={e.version} className="ml-4">
                    <span className={`absolute -left-[9px] w-4 h-4 rounded-full border-2 ${isCurrent ? 'bg-primary dark:bg-[#a7c8ff] border-primary dark:border-[#a7c8ff]' : 'bg-surface dark:bg-[#121416] border-outline-variant/40 dark:border-white/20'}`} />
                    <div className={`rounded-2xl border p-3.5 ${isCurrent ? 'border-primary/25 dark:border-[#a7c8ff]/25 bg-primary/[0.03] dark:bg-[#a7c8ff]/[0.06]' : 'border-outline-variant/10 dark:border-white/5 bg-surface-container-low/40 dark:bg-white/[0.02]'}`}>
                      <div className="flex items-center flex-wrap gap-x-2 gap-y-1 mb-1">
                        <span className="text-sm font-black text-on-surface dark:text-white tabular-nums">v{e.version}</span>
                        {isCurrent && <span className="text-[9px] font-black text-white dark:text-[#001b3c] bg-primary dark:bg-[#a7c8ff] px-1.5 py-0.5 rounded-full">TERBARU</span>}
                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${tag.cls}`}>{tag.label}</span>
                        <span className="text-[10px] text-on-surface-variant/70 dark:text-slate-500 ml-auto">{e.date}</span>
                      </div>
                      <p className="text-[13.5px] font-bold text-on-surface dark:text-white">{e.title}</p>
                      {e.impact === 'appsscript' && (
                        <p className="text-[10.5px] text-purple-600 dark:text-purple-300 mt-1 flex items-center gap-1"><span className="material-symbols-outlined text-[13px]">bolt</span>Perlu perbarui Apps Script sekali (dari Panduan)</p>
                      )}
                      <Group label="Baru" icon="add_circle" color="text-emerald-600 dark:text-emerald-400" items={e.added} />
                      <Group label="Diubah" icon="change_circle" color="text-primary dark:text-[#a7c8ff]" items={e.changed} />
                      <Group label="Diperbaiki" icon="build_circle" color="text-amber-600 dark:text-amber-400" items={e.fixed} />
                    </div>
                  </li>
                );
              })}
            </ol>
            <p className="text-[10px] text-on-surface-variant/60 dark:text-slate-500 mt-4 text-center">Rilis dengan tanda "Update Apps Script" butuh tempel skrip terbaru sekali (Panduan → Deploy → New version).</p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default ChangelogModal;
