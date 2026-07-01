import React, { useState } from 'react';
import FinanceGuidePrinciple from './FinanceGuidePrinciple';

interface SectionProps {
  onNavigate: (tab: string) => void;
}

type LaporanSection = 'overview' | 'health' | 'portfolio' | 'faq';

const SECTIONS: { key: LaporanSection; label: string; icon: string }[] = [
  { key: 'overview', label: 'Ringkasan', icon: 'query_stats' },
  { key: 'health', label: 'Kekayaan & Rasio', icon: 'health_and_safety' },
  { key: 'portfolio', label: 'Portofolio & Performa', icon: 'show_chart' },
  { key: 'faq', label: 'Tips & FAQ', icon: 'help' },
];

// What lives inside the Pusat Laporan & Analitik page.
const CONTENTS = [
  { icon: 'lightbulb', label: 'CFO Advisory Insight', desc: 'Ringkasan naratif kondisi kekayaan bersih, arus kas, dan tingkat tabungan Anda.' },
  { icon: 'trending_up', label: 'Tren Kekayaan Bersih', desc: 'Grafik pertumbuhan net worth 12 bulan terakhir.' },
  { icon: 'health_and_safety', label: 'Rasio Kesehatan', desc: 'Likuiditas, DTI, dan solvabilitas — cek kesehatan keuangan secara objektif.' },
  { icon: 'sync_alt', label: 'Arus Kas & Alokasi', desc: 'Ke mana uang mengalir: Kebutuhan vs Keinginan vs Tabungan.' },
  { icon: 'pie_chart', label: 'Portofolio & Performa', desc: 'Alokasi aset, skor diversifikasi, return, dan benchmark vs IHSG.' },
  { icon: 'emergency', label: 'Target Dana Darurat', desc: 'Seberapa dekat Anda dengan cadangan 3–6 bulan biaya hidup.' },
];

// The financial-health ratios surfaced in the report.
const RATIOS = [
  {
    icon: 'water_drop',
    tone: 'text-blue-600 dark:text-[#a7c8ff]',
    label: 'Rasio Likuiditas Kas',
    formula: 'Aset Lancar ÷ Pengeluaran Bulanan',
    target: 'Ideal: 3–6 bulan',
    desc: 'Berapa bulan Anda bisa bertahan tanpa pemasukan. Inti dari kesiapan dana darurat.',
  },
  {
    icon: 'savings',
    tone: 'text-emerald-600 dark:text-emerald-400',
    label: 'Tingkat Tabungan (Savings Rate)',
    formula: '(Tabungan + Investasi) ÷ Pendapatan',
    target: 'Ideal: ≥ 20%',
    desc: 'Porsi pendapatan yang berhasil Anda sisihkan — mesin utama pertumbuhan kekayaan.',
  },
  {
    icon: 'monitoring',
    tone: 'text-rose-600 dark:text-rose-400',
    label: 'Rasio Utang (DTI)',
    formula: 'Total Cicilan ÷ Pendapatan',
    target: 'Ideal: < 35%',
    desc: 'Beban cicilan terhadap penghasilan. Makin rendah, makin lega arus kas Anda.',
  },
  {
    icon: 'shield',
    tone: 'text-indigo-600 dark:text-indigo-400',
    label: 'Rasio Solvabilitas',
    formula: 'Kekayaan Bersih ÷ Total Aset',
    target: 'Makin tinggi makin kuat',
    desc: 'Seberapa besar aset Anda yang benar-benar "milik sendiri", bukan dibiayai utang.',
  },
];

// Portfolio & performance analytics (CFA-oriented).
const PORTFOLIO_METRICS = [
  {
    icon: 'donut_large',
    label: 'Alokasi Aset',
    desc: 'Sebaran kekayaan per kelas aset. Sesuaikan bobotnya dengan profil risiko & horizon Anda.',
  },
  {
    icon: 'hub',
    label: 'Skor Diversifikasi (HHI)',
    desc: 'Mengukur konsentrasi portofolio (indeks Herfindahl). Skor tinggi = tersebar sehat; skor rendah = terlalu menumpuk di sedikit aset.',
  },
  {
    icon: 'account_balance_wallet',
    label: 'Total Return',
    desc: 'Imbal hasil menyeluruh = keuntungan harga (capital gain) + pendapatan (dividen/kupon). Ukuran performa yang utuh (standar CFA®).',
  },
  {
    icon: 'leaderboard',
    label: 'Benchmark vs IHSG & Alpha',
    desc: 'Membandingkan return portofolio dengan indeks IHSG. Alpha = kelebihan return di atas benchmark; Alpha positif berarti Anda mengungguli pasar.',
  },
];

const FAQS = [
  {
    q: 'Kenapa fokusnya Kekayaan Bersih, bukan saldo rekening?',
    a: 'Karena Kekayaan Bersih (Total Aset − Total Utang) adalah ukuran kekayaan yang sesungguhnya. Saldo satu rekening bisa besar padahal utang lebih besar. Yang menentukan kemajuan finansial adalah tren net worth yang naik dari waktu ke waktu.',
  },
  {
    q: 'Rasio Likuiditas yang sehat berapa?',
    a: 'Idealnya aset lancar Anda menutup 3–6 bulan pengeluaran. Di bawah itu, satu kejadian tak terduga bisa memaksa Anda berutang atau menjual investasi di waktu yang salah.',
  },
  {
    q: 'Apa itu Alpha pada laporan performa?',
    a: 'Alpha adalah selisih return portofolio Anda terhadap benchmark (IHSG). Alpha positif berarti portofolio Anda mengungguli pasar; negatif berarti di bawah pasar. Ini cara CFA® menilai apakah strategi Anda benar-benar menambah nilai.',
  },
  {
    q: 'Skor Diversifikasi rendah artinya apa?',
    a: 'Artinya portofolio Anda terlalu terkonsentrasi pada sedikit aset. Risikonya: bila satu aset itu jatuh, dampaknya besar. Menyebar ke lebih banyak aset/kelas menurunkan risiko spesifik ini.',
  },
  {
    q: 'Bedanya Total Return dengan capital gain?',
    a: 'Capital gain hanya selisih harga beli-jual. Total Return menambahkan pendapatan seperti dividen saham dan kupon obligasi, sehingga menggambarkan hasil investasi secara lengkap.',
  },
  {
    q: 'Seberapa sering sebaiknya membuka Laporan?',
    a: 'Tinjau arus kas & anggaran tiap bulan, lalu net worth, rasio, dan portofolio setiap kuartal atau minimal setahun sekali. Review berkala adalah bagian inti dari proses perencanaan keuangan (CFP®).',
  },
  {
    q: 'Kenapa memakai IHSG sebagai pembanding?',
    a: 'IHSG (Indeks Harga Saham Gabungan) adalah acuan pasar saham Indonesia. Membandingkan portofolio dengan IHSG membantu menilai apakah hasil Anda kompetitif dibanding "sekadar mengikuti pasar".',
  },
];

const FinanceGuideLaporanSection: React.FC<SectionProps> = ({ onNavigate }) => {
  const [active, setActive] = useState<LaporanSection>('overview');
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <div className="animate-in fade-in duration-300">
      {/* Section Tabs */}
      <div className="mb-6">
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar p-1.5 rounded-2xl bg-surface-container-low dark:bg-[#191c1e] border border-outline-variant/10 dark:border-white/10 shadow-sm">
          {SECTIONS.map(s => {
            const isActive = s.key === active;
            return (
              <button
                key={s.key}
                onClick={() => setActive(s.key)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-primary dark:bg-[#a7c8ff] text-white dark:text-[#001b3c] shadow-md shadow-primary/10'
                    : 'text-on-surface-variant dark:text-outline hover:bg-surface-container dark:hover:bg-white/5'
                }`}
              >
                <span className="material-symbols-outlined text-base sm:text-lg">{s.icon}</span>
                {s.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ============ OVERVIEW ============ */}
      {active === 'overview' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <p className="text-sm text-on-surface-variant dark:text-slate-300 leading-relaxed">
            <strong className="text-on-surface dark:text-white">Laporan</strong> mengubah seluruh data Transaksi, Aset, Anggaran, dan Utang menjadi wawasan. Di sinilah Anda melihat <strong className="text-on-surface dark:text-white">gambaran besar</strong> kesehatan keuangan dan performa investasi — bukan sekadar angka, tapi apakah Anda sedang menuju arah yang benar.
          </p>

          <div className="rounded-2xl border border-blue-200/60 dark:border-[#a7c8ff]/20 bg-blue-50/60 dark:bg-[#a7c8ff]/5 p-4 flex gap-3">
            <span className="material-symbols-outlined text-blue-600 dark:text-[#a7c8ff] shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>date_range</span>
            <div>
              <p className="text-sm font-bold text-on-surface dark:text-white">Pilih periodenya dulu</p>
              <p className="text-xs text-on-surface-variant dark:text-slate-400 mt-1 leading-relaxed">
                Semua angka bisa difilter per <strong className="text-on-surface dark:text-white">Bulan Ini, 3 Bulan, 12 Bulan, atau Tahun Ini (YTD)</strong> agar Anda bisa melihat tren jangka pendek maupun panjang.
              </p>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant dark:text-outline mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-base text-primary dark:text-[#a7c8ff]">dashboard</span>
              Apa saja di dalam Laporan
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {CONTENTS.map(c => (
                <div key={c.label} className="flex gap-3 items-start rounded-2xl bg-surface-container-lowest dark:bg-white/5 border border-outline-variant/10 dark:border-white/10 p-4">
                  <div className="w-9 h-9 rounded-xl bg-surface-container dark:bg-white/10 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-primary dark:text-[#a7c8ff] text-lg">{c.icon}</span>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-on-surface dark:text-white">{c.label}</p>
                    <p className="text-[11px] text-on-surface-variant dark:text-slate-400 mt-0.5 leading-relaxed">{c.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <FinanceGuidePrinciple
            points={[
              { icon: 'trending_up', title: 'Net Worth sebagai Bintang Utara', text: 'Ukur kemajuan dari tren kekayaan bersih (Aset − Utang), bukan saldo satu rekening — pusat dari perencanaan CFP®.' },
              { icon: 'health_and_safety', title: 'Ukur dengan Rasio, Bukan Perasaan', text: 'Rasio likuiditas, DTI, solvabilitas, & savings rate memberi cek kesehatan yang objektif atas kondisi Anda.' },
              { icon: 'leaderboard', title: 'Bandingkan dengan Benchmark', text: 'Nilai performa portofolio relatif terhadap IHSG (Alpha) — inti evaluasi investasi ala CFA®.' },
              { icon: 'event_repeat', title: 'Tinjau Secara Berkala', text: 'Arus kas tiap bulan; net worth, rasio, & portofolio tiap kuartal/tahun. Review rutin menjaga rencana tetap di jalur.' },
            ]}
          />
        </div>
      )}

      {/* ============ HEALTH ============ */}
      {active === 'health' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="rounded-2xl bg-gradient-to-br from-primary/90 to-primary-container dark:from-[#0f1e33] dark:to-[#13233b] p-5 sm:p-6 text-white">
            <div className="flex items-center gap-2 mb-1">
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>trending_up</span>
              <h4 className="font-bold text-sm uppercase tracking-widest text-white/80">Kekayaan Bersih (Net Worth)</h4>
            </div>
            <p className="text-xl sm:text-2xl font-black font-headline mt-1">Total Aset − Total Utang</p>
            <p className="text-xs text-white/80 mt-2 leading-relaxed max-w-xl">
              Metrik terpenting Anda. Bukan besarnya di satu titik yang penting, melainkan <strong className="text-white">trennya yang naik</strong> dari bulan ke bulan.
            </p>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant dark:text-outline mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-base text-primary dark:text-[#a7c8ff]">health_and_safety</span>
              4 rasio kesehatan finansial
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {RATIOS.map(r => (
                <div key={r.label} className="rounded-2xl bg-surface-container-lowest dark:bg-white/5 border border-outline-variant/10 dark:border-white/10 p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2.5">
                      <span className={`material-symbols-outlined ${r.tone}`} style={{ fontVariationSettings: "'FILL' 1" }}>{r.icon}</span>
                      <p className="font-bold text-on-surface dark:text-white text-sm leading-tight">{r.label}</p>
                    </div>
                  </div>
                  <div className="rounded-lg bg-surface-container dark:bg-white/5 px-3 py-1.5 mb-2 font-mono text-[11px] text-on-surface-variant dark:text-slate-300">
                    {r.formula}
                  </div>
                  <p className="text-[11px] text-on-surface-variant dark:text-slate-400 leading-relaxed">{r.desc}</p>
                  <p className={`text-[11px] font-bold mt-2 ${r.tone}`}>{r.target}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-200/60 dark:border-emerald-500/20 bg-emerald-50/60 dark:bg-emerald-900/10 p-4 flex gap-3">
            <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400 shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>emergency</span>
            <div>
              <p className="text-sm font-bold text-on-surface dark:text-white">Budget Health Score & Target Dana Darurat</p>
              <p className="text-xs text-on-surface-variant dark:text-slate-400 mt-1 leading-relaxed">
                Laporan juga menampilkan skor kesehatan anggaran dan progres dana darurat Anda menuju target 3–6 bulan biaya hidup — prioritas proteksi nomor satu sebelum berinvestasi agresif.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ============ PORTFOLIO ============ */}
      {active === 'portfolio' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="rounded-2xl bg-surface-container-lowest dark:bg-white/5 border border-outline-variant/10 dark:border-white/10 p-5 sm:p-6">
            <h4 className="font-bold text-on-surface dark:text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-blue-600 dark:text-[#a7c8ff]" style={{ fontVariationSettings: "'FILL' 1" }}>show_chart</span>
              Menilai portofolio investasi
            </h4>
            <p className="text-sm text-on-surface-variant dark:text-slate-300 mt-2 leading-relaxed">
              Bagian ini menjawab dua pertanyaan CFA® klasik: <strong className="text-on-surface dark:text-white">"Apakah portofolio saya cukup tersebar?"</strong> dan <strong className="text-on-surface dark:text-white">"Apakah hasilnya mengalahkan pasar?"</strong>
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {PORTFOLIO_METRICS.map(m => (
              <div key={m.label} className="rounded-2xl bg-surface-container-lowest dark:bg-white/5 border border-outline-variant/10 dark:border-white/10 p-4">
                <div className="flex items-center gap-2.5 mb-2">
                  <span className="material-symbols-outlined text-blue-600 dark:text-[#a7c8ff]" style={{ fontVariationSettings: "'FILL' 1" }}>{m.icon}</span>
                  <p className="font-bold text-on-surface dark:text-white text-sm">{m.label}</p>
                </div>
                <p className="text-[11px] text-on-surface-variant dark:text-slate-400 leading-relaxed">{m.desc}</p>
              </div>
            ))}
          </div>

          {/* Alpha explainer */}
          <div className="rounded-2xl border border-indigo-200/60 dark:border-indigo-400/20 bg-indigo-50/60 dark:bg-indigo-950/20 p-5">
            <div className="flex items-center gap-3 mb-3">
              <span className="material-symbols-outlined text-indigo-600 dark:text-indigo-300" style={{ fontVariationSettings: "'FILL' 1" }}>emoji_events</span>
              <h4 className="font-bold text-on-surface dark:text-white text-sm">Membaca Alpha vs IHSG</h4>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-xl bg-white/70 dark:bg-white/[0.03] border border-emerald-200/50 dark:border-white/5 p-4">
                <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                  <span className="material-symbols-outlined text-base">arrow_upward</span> Alpha positif
                </p>
                <p className="text-[11px] text-on-surface-variant dark:text-slate-400 mt-1.5 leading-relaxed">Return portofolio Anda di atas IHSG — strategi Anda menambah nilai dibanding sekadar mengikuti pasar.</p>
              </div>
              <div className="rounded-xl bg-white/70 dark:bg-white/[0.03] border border-rose-200/50 dark:border-white/5 p-4">
                <p className="text-sm font-bold text-rose-600 dark:text-rose-400 flex items-center gap-2">
                  <span className="material-symbols-outlined text-base">arrow_downward</span> Alpha negatif
                </p>
                <p className="text-[11px] text-on-surface-variant dark:text-slate-400 mt-1.5 leading-relaxed">Return di bawah IHSG — pertimbangkan meninjau ulang pilihan aset atau memakai instrumen indeks.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============ FAQ ============ */}
      {active === 'faq' && (
        <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
          {FAQS.map((f, i) => {
            const isOpen = openFaq === i;
            return (
              <div key={i} className="rounded-2xl bg-surface-container-lowest dark:bg-white/5 border border-outline-variant/10 dark:border-white/10 overflow-hidden">
                <button
                  onClick={() => setOpenFaq(isOpen ? null : i)}
                  className="w-full flex items-center justify-between gap-3 p-4 sm:p-5 text-left cursor-pointer hover:bg-surface-container dark:hover:bg-white/5 transition-colors"
                >
                  <span className="text-sm font-bold text-on-surface dark:text-white flex items-start gap-2.5">
                    <span className="material-symbols-outlined text-base text-primary dark:text-[#a7c8ff] mt-0.5 shrink-0">help</span>
                    {f.q}
                  </span>
                  <span className={`material-symbols-outlined text-on-surface-variant dark:text-outline transition-transform shrink-0 ${isOpen ? 'rotate-180' : ''}`}>expand_more</span>
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 pl-12 -mt-1">
                    <p className="text-xs sm:text-sm text-on-surface-variant dark:text-slate-300 leading-relaxed">{f.a}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Footer CTA */}
      <div className="mt-8 rounded-3xl bg-surface-container-low dark:bg-white/5 border border-outline-variant/10 dark:border-white/10 p-5 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 text-center sm:text-left">
          <span className="material-symbols-outlined text-primary dark:text-[#a7c8ff] text-2xl hidden sm:block">query_stats</span>
          <div>
            <p className="text-sm font-bold text-on-surface dark:text-white">Siap melihat gambaran besar?</p>
            <p className="text-xs text-on-surface-variant dark:text-slate-400 mt-0.5">Buka Laporan untuk memeriksa kesehatan & performa keuangan Anda.</p>
          </div>
        </div>
        <button
          onClick={() => onNavigate('analytics')}
          className="w-full sm:w-auto px-6 py-3 bg-primary dark:bg-[#a7c8ff] text-white dark:text-[#001b3c] font-bold text-sm rounded-2xl shadow-md hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-2 shrink-0"
        >
          <span className="material-symbols-outlined text-lg">query_stats</span>
          Buka Laporan
        </button>
      </div>
    </div>
  );
};

export default FinanceGuideLaporanSection;
