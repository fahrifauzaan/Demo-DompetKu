import React, { useState } from 'react';
import FinanceGuideTransaksiSection from './FinanceGuideTransaksiSection';
import FinanceGuideAsetSection from './FinanceGuideAsetSection';
import FinanceGuideUtangSection from './FinanceGuideUtangSection';
import FinanceGuideAnggaranSection from './FinanceGuideAnggaranSection';
import FinanceGuideLaporanSection from './FinanceGuideLaporanSection';

interface FinanceGuideProps {
  onNavigate: (tab: string) => void;
}

type Topic = 'transaksi' | 'anggaran' | 'aset' | 'utang' | 'laporan';

const TOPICS: { key: Topic; label: string; icon: string; desc: string }[] = [
  { key: 'transaksi', label: 'Transaksi', icon: 'receipt_long', desc: 'Catat uang masuk, keluar & transfer' },
  { key: 'anggaran', label: 'Anggaran', icon: 'payments', desc: 'Atur budget 50/30/20 & pantau realisasi' },
  { key: 'aset', label: 'Aset', icon: 'account_balance', desc: 'Aset Lancar, Investasi & Fisik' },
  { key: 'utang', label: 'Rencana Utang', icon: 'leaderboard', desc: 'Catat utang & strategi pelunasan' },
  { key: 'laporan', label: 'Laporan', icon: 'query_stats', desc: 'Net worth, rasio, portofolio & benchmark' },
];

// Guides not built yet — shown as disabled chips so users know they are coming.
const SOON: string[] = [];

const FinanceGuide: React.FC<FinanceGuideProps> = ({ onNavigate }) => {
  const [topic, setTopic] = useState<Topic>('transaksi');

  return (
    <div className="max-w-5xl mx-auto text-left animate-in fade-in duration-300">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/90 to-primary-container dark:from-[#0f1e33] dark:to-[#13233b] p-6 sm:p-8 lg:p-10 mb-6 shadow-sm border border-outline-variant/10 dark:border-white/10">
        <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="relative flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-white text-2xl">auto_stories</span>
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/70">Pusat Bantuan</span>
            <h2 className="font-headline font-extrabold text-2xl lg:text-4xl tracking-tight text-white mt-0.5">
              Panduan Penggunaan
            </h2>
            <p className="text-white/80 text-xs lg:text-sm font-medium mt-2 max-w-xl leading-relaxed">
              Panduan langkah demi langkah untuk tiap fitur DompetKu. Pilih topik di bawah untuk mulai.
            </p>
          </div>
        </div>
      </div>

      {/* Topic selector */}
      <div className="mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {TOPICS.map(t => {
            const isActive = t.key === topic;
            return (
              <button
                key={t.key}
                onClick={() => setTopic(t.key)}
                className={`flex items-center gap-3 p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                  isActive
                    ? 'bg-primary/5 dark:bg-[#a7c8ff]/10 border-primary/40 dark:border-[#a7c8ff]/40 shadow-sm'
                    : 'bg-surface-container-lowest dark:bg-white/5 border-outline-variant/10 dark:border-white/10 hover:bg-surface-container dark:hover:bg-white/10'
                }`}
              >
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${isActive ? 'bg-primary dark:bg-[#a7c8ff]' : 'bg-surface-container dark:bg-white/10'}`}>
                  <span
                    className={`material-symbols-outlined ${isActive ? 'text-white dark:text-[#001b3c]' : 'text-on-surface-variant dark:text-outline'}`}
                    style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}
                  >
                    {t.icon}
                  </span>
                </div>
                <div>
                  <p className={`text-sm font-bold ${isActive ? 'text-primary dark:text-[#a7c8ff]' : 'text-on-surface dark:text-white'}`}>{t.label}</p>
                  <p className="text-[11px] text-on-surface-variant dark:text-slate-400 mt-0.5">{t.desc}</p>
                </div>
                {isActive && (
                  <span className="material-symbols-outlined text-primary dark:text-[#a7c8ff] ml-auto shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Coming soon */}
        {SOON.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap mt-3 px-1">
            <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant dark:text-outline">Segera hadir:</span>
            {SOON.map(s => (
              <span key={s} className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-surface-container dark:bg-white/5 text-on-surface-variant dark:text-slate-400 border border-outline-variant/10 dark:border-white/10">
                {s}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Active topic content */}
      {topic === 'transaksi' && <FinanceGuideTransaksiSection onNavigate={onNavigate} />}
      {topic === 'anggaran' && <FinanceGuideAnggaranSection onNavigate={onNavigate} />}
      {topic === 'aset' && <FinanceGuideAsetSection onNavigate={onNavigate} />}
      {topic === 'utang' && <FinanceGuideUtangSection onNavigate={onNavigate} />}
      {topic === 'laporan' && <FinanceGuideLaporanSection onNavigate={onNavigate} />}
    </div>
  );
};

export default FinanceGuide;
