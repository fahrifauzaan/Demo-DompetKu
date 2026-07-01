import React, { useState } from 'react';
import FinanceGuidePrinciple from './FinanceGuidePrinciple';

interface SectionProps {
  onNavigate: (tab: string) => void;
}

type AnggaranSection = 'overview' | 'framework' | 'howto' | 'faq';

const SECTIONS: { key: AnggaranSection; label: string; icon: string }[] = [
  { key: 'overview', label: 'Ringkasan', icon: 'payments' },
  { key: 'framework', label: 'Kerangka 50/30/20', icon: 'donut_small' },
  { key: 'howto', label: 'Cara Mengatur', icon: 'edit_note' },
  { key: 'faq', label: 'Tips & FAQ', icon: 'help' },
];

// The three metric cards on the Budget vs Aktual page.
const METRICS = [
  { icon: 'donut_small', tone: 'text-blue-600 dark:text-[#a7c8ff]', label: 'Rasio Alokasi 50/30/20', desc: 'Membagi anggaran ke Kebutuhan (50%), Keinginan (30%), dan Tabungan/Investasi (20%) — standar CFP®.' },
  { icon: 'data_check', tone: 'text-emerald-600 dark:text-emerald-400', label: 'Zero-Based Budgeting (ZBB)', desc: 'Sisa yang belum dialokasikan. Target idealnya Rp 0 — setiap rupiah pendapatan diberi "tugas".' },
  { icon: 'speed', tone: 'text-amber-600 dark:text-amber-400', label: 'Laju Pengeluaran & Tabungan', desc: 'Membandingkan rencana anggaran vs realisasi aktual, agar Anda tahu apakah sesuai jalur.' },
];

// The 50/30/20 buckets, matching the classifications in the category form.
const BUCKETS = [
  {
    icon: 'shopping_cart',
    tone: 'text-[#007aff] dark:text-[#0a84ff]',
    bg: 'bg-[#007aff]/10 dark:bg-[#0a84ff]/15',
    label: 'Needs — Kebutuhan',
    target: '≤ 50%',
    desc: 'Pengeluaran wajib yang tak bisa ditunda.',
    examples: ['Sewa / cicilan rumah', 'Listrik, air, internet', 'Belanja dapur', 'Cicilan minimum & asuransi'],
  },
  {
    icon: 'local_mall',
    tone: 'text-[#ff9500] dark:text-[#ff9f0a]',
    bg: 'bg-[#ff9500]/10 dark:bg-[#ff9f0a]/15',
    label: 'Wants — Keinginan',
    target: '≤ 30%',
    desc: 'Gaya hidup & hiburan yang bisa dikurangi.',
    examples: ['Langganan digital', 'Makan di luar / kopi', 'Liburan & hobi', 'Belanja non-esensial'],
  },
  {
    icon: 'savings',
    tone: 'text-[#28cd41] dark:text-[#30d158]',
    bg: 'bg-[#28cd41]/10 dark:bg-[#30d158]/15',
    label: 'Savings & Investment',
    target: '≥ 20%',
    desc: 'Bayar diri Anda dulu — proteksi & pertumbuhan.',
    examples: ['Dana darurat (3–6 bln biaya hidup)', 'Investasi reksadana / saham', 'Dana pensiun', 'Tujuan jangka panjang'],
  },
];

const FAQS = [
  {
    q: 'Apa beda "Budget" dan "Aktual"?',
    a: 'Budget = rencana batas pengeluaran yang Anda tetapkan di awal bulan. Aktual = realisasi belanja yang benar-benar terjadi (dari Transaksi). Halaman ini membandingkan keduanya agar Anda tahu apakah on-track atau over-budget.',
  },
  {
    q: 'Aturan 50/30/20 itu wajib persis segitu?',
    a: 'Bukan angka mati, tapi patokan sehat dari CFP®. Kalau biaya hidup Anda besar, Needs bisa sedikit di atas 50% — yang penting porsi Savings/Investment jangan dikorbankan sampai di bawah 20%.',
  },
  {
    q: 'Zero-Based Budgeting (ZBB) maksudnya apa?',
    a: 'Prinsip "beri tugas pada tiap rupiah": total pendapatan dikurangi semua alokasi (pengeluaran + tabungan + investasi) idealnya = Rp 0. Kalau masih sisa, alokasikan; kalau minus, berarti over-budget.',
  },
  {
    q: 'Sebuah kategori masuk Needs atau Wants?',
    a: 'Tanyakan: "kalau tidak dibayar, apakah hidup/pekerjaan saya terganggu?" Jika ya → Needs (mis. internet untuk kerja). Jika hanya menambah kenyamanan → Wants (mis. paket streaming premium).',
  },
  {
    q: 'Kenapa muncul peringatan "Tabungan kurang dari 20%"?',
    a: 'Karena porsi Savings + Investment Anda di bawah anjuran 20%. Idealnya "bayar diri sendiri dulu" — sisihkan tabungan/investasi di awal, bukan dari sisa uang di akhir bulan.',
  },
  {
    q: 'Anggaran per kategori bisa beda tiap bulan?',
    a: 'Bisa. Anggaran disimpan per periode (bulan), jadi Anda bebas menyesuaikan limit tiap kategori mengikuti kebutuhan bulan tersebut tanpa mengubah bulan lain.',
  },
];

const FinanceGuideAnggaranSection: React.FC<SectionProps> = ({ onNavigate }) => {
  const [active, setActive] = useState<AnggaranSection>('overview');
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
            <strong className="text-on-surface dark:text-white">Anggaran</strong> membantu Anda merencanakan ke mana uang akan pergi <em>sebelum</em> dibelanjakan, lalu membandingkannya dengan realisasi. Ini inti dari <strong className="text-on-surface dark:text-white">manajemen arus kas</strong> — fondasi setiap rencana keuangan yang sehat.
          </p>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant dark:text-outline mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-base text-primary dark:text-[#a7c8ff]">insights</span>
              3 panel di halaman Anggaran
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {METRICS.map(m => (
                <div key={m.label} className="rounded-2xl bg-surface-container-lowest dark:bg-white/5 border border-outline-variant/10 dark:border-white/10 p-4">
                  <div className="w-10 h-10 rounded-xl bg-surface-container dark:bg-white/10 flex items-center justify-center mb-3">
                    <span className={`material-symbols-outlined ${m.tone}`} style={{ fontVariationSettings: "'FILL' 1" }}>{m.icon}</span>
                  </div>
                  <p className="text-sm font-bold text-on-surface dark:text-white leading-tight">{m.label}</p>
                  <p className="text-[11px] text-on-surface-variant dark:text-slate-400 mt-1 leading-relaxed">{m.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <FinanceGuidePrinciple
            points={[
              { icon: 'donut_small', title: 'Aturan 50/30/20', text: 'Alokasikan ≤50% Kebutuhan, ≤30% Keinginan, ≥20% Tabungan & Investasi — kerangka anggaran klasik CFP®.' },
              { icon: 'savings', title: 'Bayar Diri Sendiri Dulu', text: 'Sisihkan tabungan & investasi di awal saat gajian, bukan dari sisa uang di akhir bulan.' },
              { icon: 'data_check', title: 'Zero-Based Budgeting', text: 'Beri "tugas" pada setiap rupiah hingga sisa alokasi Rp 0, supaya tidak ada uang bocor tanpa rencana.' },
              { icon: 'trending_up', title: 'Jaga Savings Rate ≥ 20%', text: 'Porsi yang ditabung/diinvestasikan konsisten adalah mesin compounding kekayaan jangka panjang (prinsip CFA®).' },
            ]}
          />
        </div>
      )}

      {/* ============ FRAMEWORK ============ */}
      {active === 'framework' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="rounded-2xl bg-surface-container-lowest dark:bg-white/5 border border-outline-variant/10 dark:border-white/10 p-5 sm:p-6">
            <h4 className="font-bold text-on-surface dark:text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-primary dark:text-[#a7c8ff]" style={{ fontVariationSettings: "'FILL' 1" }}>donut_small</span>
              Kerangka 50/30/20
            </h4>
            <p className="text-sm text-on-surface-variant dark:text-slate-300 mt-2 leading-relaxed">
              Setiap kategori pengeluaran diberi <strong className="text-on-surface dark:text-white">klasifikasi</strong> saat dibuat. DompetKu lalu menjumlahkannya menjadi rasio 50/30/20 secara otomatis. Inilah arti tiap keranjang:
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {BUCKETS.map(b => (
              <div key={b.label} className="rounded-2xl bg-surface-container-lowest dark:bg-white/5 border border-outline-variant/10 dark:border-white/10 p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-11 h-11 rounded-xl ${b.bg} flex items-center justify-center`}>
                    <span className={`material-symbols-outlined ${b.tone}`} style={{ fontVariationSettings: "'FILL' 1" }}>{b.icon}</span>
                  </div>
                  <span className={`text-sm font-black font-headline ${b.tone}`}>{b.target}</span>
                </div>
                <h4 className="font-bold text-on-surface dark:text-white text-sm">{b.label}</h4>
                <p className="text-[11px] text-on-surface-variant dark:text-slate-400 mt-1 leading-relaxed">{b.desc}</p>
                <ul className="mt-3 space-y-1.5">
                  {b.examples.map(ex => (
                    <li key={ex} className="flex items-center gap-2 text-[11px] text-on-surface-variant dark:text-slate-400 font-medium">
                      <span className={`material-symbols-outlined text-sm ${b.tone}`}>check_small</span>
                      {ex}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-emerald-200/60 dark:border-emerald-500/20 bg-emerald-50/60 dark:bg-emerald-900/10 p-5 flex gap-3">
            <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400 shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>data_check</span>
            <div>
              <p className="text-sm font-bold text-on-surface dark:text-white">Lengkapi dengan Zero-Based Budgeting</p>
              <p className="text-xs text-on-surface-variant dark:text-slate-400 mt-1 leading-relaxed">
                Setelah membagi 50/30/20, pastikan <strong className="text-on-surface dark:text-white">Pendapatan − Total Alokasi = Rp 0</strong>. Jika masih ada sisa, arahkan ke tabungan/investasi; jika minus, ada kategori yang harus dipangkas.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ============ HOWTO ============ */}
      {active === 'howto' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant dark:text-outline mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-base text-primary dark:text-[#a7c8ff]">list_alt</span>
              Langkah mengatur anggaran
            </h4>
            <div className="relative border-l border-outline-variant/30 dark:border-white/10 pl-6 ml-3 space-y-5">
              {[
                'Buka halaman Anggaran, lalu klik Tambah Kategori.',
                'Pilih jenis Pengeluaran atau Pemasukan, dan beri nama kategori (mis. "Belanja Dapur").',
                'Untuk pengeluaran, tentukan klasifikasi 50/30/20: Needs, Wants, Savings, atau Investment.',
                'Tetapkan batas anggaran (limit) bulanan untuk kategori tersebut.',
                'Sepanjang bulan, catat Transaksi seperti biasa — realisasi otomatis dibandingkan dengan anggaran.',
                'Pantau panel 50/30/20 & ZBB; sesuaikan limit bila ada kategori yang jebol.',
              ].map((step, i) => (
                <div key={i} className="relative">
                  <span className="absolute -left-[37px] top-0 w-6 h-6 rounded-full bg-primary dark:bg-[#a7c8ff] text-white dark:text-[#001b3c] flex items-center justify-center text-[11px] font-extrabold shadow-sm">{i + 1}</span>
                  <p className="text-sm text-on-surface dark:text-slate-200 leading-relaxed font-medium">{step}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-blue-200/60 dark:border-[#a7c8ff]/20 bg-blue-50/60 dark:bg-[#a7c8ff]/5 p-4 flex gap-3">
            <span className="material-symbols-outlined text-blue-600 dark:text-[#a7c8ff] shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>link</span>
            <div>
              <p className="text-sm font-bold text-on-surface dark:text-white">Anggaran & Transaksi saling terhubung</p>
              <p className="text-xs text-on-surface-variant dark:text-slate-400 mt-1 leading-relaxed">
                Kolom "Aktual" terisi dari data Transaksi yang kategorinya cocok. Jadi pastikan setiap transaksi diberi kategori yang benar agar laporan anggaran akurat.
              </p>
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
          <span className="material-symbols-outlined text-primary dark:text-[#a7c8ff] text-2xl hidden sm:block">donut_small</span>
          <div>
            <p className="text-sm font-bold text-on-surface dark:text-white">Siap menyusun anggaran 50/30/20?</p>
            <p className="text-xs text-on-surface-variant dark:text-slate-400 mt-0.5">Buat kategori pertama dan tetapkan limitnya.</p>
          </div>
        </div>
        <button
          onClick={() => onNavigate('budget')}
          className="w-full sm:w-auto px-6 py-3 bg-primary dark:bg-[#a7c8ff] text-white dark:text-[#001b3c] font-bold text-sm rounded-2xl shadow-md hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-2 shrink-0"
        >
          <span className="material-symbols-outlined text-lg">payments</span>
          Buka Anggaran
        </button>
      </div>
    </div>
  );
};

export default FinanceGuideAnggaranSection;
