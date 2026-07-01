import React, { useState } from 'react';
import FinanceGuidePrinciple from './FinanceGuidePrinciple';

interface SectionProps {
  onNavigate: (tab: string) => void;
}

type UtangSection = 'overview' | 'input' | 'strategy' | 'faq';

const SECTIONS: { key: UtangSection; label: string; icon: string }[] = [
  { key: 'overview', label: 'Ringkasan', icon: 'leaderboard' },
  { key: 'input', label: 'Cara Input', icon: 'edit_note' },
  { key: 'strategy', label: 'Strategi Pelunasan', icon: 'strategy' },
  { key: 'faq', label: 'Tips & FAQ', icon: 'help' },
];

// Health metrics shown at the top of the Rencana Utang page.
const METRICS = [
  { icon: 'account_balance_wallet', tone: 'text-blue-600 dark:text-[#a7c8ff]', label: 'Total Liabilitas', desc: 'Jumlah seluruh sisa pokok utang Anda yang masih aktif.' },
  { icon: 'percent', tone: 'text-amber-600 dark:text-amber-400', label: 'Bunga Efektif (Weighted)', desc: 'Rata-rata bunga tertimbang dari semua utang — makin besar utang, makin besar pengaruh bunganya.' },
  { icon: 'monitoring', tone: 'text-rose-600 dark:text-rose-400', label: 'DTI — Rasio Cicilan / Pendapatan', desc: 'Total cicilan bulanan dibagi pendapatan. Idealnya di bawah 35% agar arus kas tetap sehat.' },
  { icon: 'balance', tone: 'text-emerald-600 dark:text-emerald-400', label: 'DTA — Rasio Utang / Aset', desc: 'Total utang dibagi total aset. Makin kecil, makin kuat posisi keuangan Anda.' },
];

// The six debt types offered in the Tambah Utang form.
const DEBT_TYPES = [
  { icon: 'credit_card', label: 'Kartu Kredit', kind: 'Konsumtif' },
  { icon: 'person', label: 'Pinjaman Pribadi', kind: 'Umumnya Konsumtif' },
  { icon: 'directions_car', label: 'Kredit Mobil', kind: 'Konsumtif' },
  { icon: 'home', label: 'KPR / Rumah', kind: 'Produktif' },
  { icon: 'school', label: 'Pinjaman Pendidikan', kind: 'Produktif' },
  { icon: 'payments', label: 'Lainnya', kind: 'Tergantung tujuan' },
];

// Key fields of the debt form worth clarifying.
const FIELDS = [
  { label: 'Nama & Lender', desc: 'Nama liabilitas (mis. "KPR BCA") dan institusi pemberi pinjaman.' },
  { label: 'Plafon Awal vs Sisa Pokok', desc: 'Plafon Awal = total pinjaman saat akad. Sisa Pokok (wajib) = yang belum lunas sekarang — inilah yang dipakai menghitung strategi.' },
  { label: 'Bunga (APR %) & Tipe Bunga', desc: 'Suku bunga per tahun, plus apakah Fixed/Flat atau Floating/Efektif (lihat penjelasan di bawah).' },
  { label: 'Cicilan / Bulan', desc: 'Angsuran minimum per bulan. Dipakai untuk menghitung DTI & proyeksi pelunasan.' },
  { label: 'Tanggal & Jatuh Tempo', desc: 'Tanggal mulai, target lunas (tenor), dan tanggal jatuh tempo (1–31) untuk pengingat.' },
  { label: 'Status', desc: 'Aktif, Lunas, atau Macet/Default. Ubah ke "Lunas" bila utang sudah selesai.' },
];

const STRATEGIES = [
  {
    icon: 'trending_flat',
    tone: 'text-slate-600 dark:text-slate-300',
    bg: 'bg-slate-100 dark:bg-white/10',
    name: 'Cicilan Minimum',
    tag: 'Baseline',
    desc: 'Membayar cicilan minimum di semua utang. Ini titik acuan — paling lambat lunas dan total bunganya paling besar.',
  },
  {
    icon: 'ac_unit',
    tone: 'text-blue-600 dark:text-[#a7c8ff]',
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    name: 'Saldo Terkecil (Snowball)',
    tag: 'Motivasi',
    desc: 'Fokuskan dana ekstra untuk melunasi utang dengan SALDO TERKECIL dulu (utang lain tetap bayar minimum). Cepat ada yang lunas → membangun momentum & semangat.',
  },
  {
    icon: 'landscape',
    tone: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-100 dark:bg-emerald-900/30',
    name: 'Bunga Tertinggi (Avalanche)',
    tag: 'Paling hemat',
    desc: 'Fokuskan dana ekstra untuk melunasi utang dengan BUNGA TERTINGGI dulu. Secara matematis paling menghemat total bunga dan biasanya paling cepat.',
  },
];

const FAQS = [
  {
    q: 'Bedanya "Plafon Awal" dan "Sisa Pokok" apa?',
    a: 'Plafon Awal adalah jumlah pinjaman saat akad (mis. Rp 100 juta). Sisa Pokok adalah utang yang belum lunas per hari ini (mis. Rp 60 juta). Yang wajib & dipakai untuk semua perhitungan strategi adalah Sisa Pokok.',
  },
  {
    q: 'Snowball atau Avalanche yang lebih benar?',
    a: 'Dua-duanya benar. Avalanche paling hemat bunga (utamakan bunga tertinggi). Snowball lebih cepat memberi "kemenangan" karena utang kecil cepat lunas — bagus kalau Anda butuh motivasi. Pakai simulator untuk membandingkan selisih bulan & bunganya.',
  },
  {
    q: 'Bunga flat 1% per bulan kok terasa berat?',
    a: 'Karena bunga Fixed/Flat dihitung dari pokok AWAL sepanjang tenor, padahal pokok Anda terus berkurang. Bunga flat 1%/bln setara bunga efektif sekitar 1,8x-nya. Untuk membandingkan adil, gunakan bunga efektif.',
  },
  {
    q: 'Kartu kredit & paylater dicatat di mana?',
    a: 'Di Tambah Utang, pilih tipe "Kartu Kredit" (atau "Lainnya" untuk paylater). Keduanya utang konsumtif berbunga tinggi, jadi biasanya jadi prioritas utama untuk dilunasi.',
  },
  {
    q: 'DTI yang sehat itu berapa?',
    a: 'Umumnya total cicilan bulanan sebaiknya di bawah 35% dari pendapatan. Di atas itu, arus kas jadi rentan dan sulit menabung/berinvestasi.',
  },
  {
    q: 'Lebih baik lunasi utang dulu atau investasi?',
    a: 'Bandingkan bunga utang dengan ekspektasi imbal hasil investasi. Jika bunga utang lebih tinggi (mis. kartu kredit), melunasinya memberi "return bebas risiko" yang lebih baik. Jika bunga utang rendah (mis. KPR bersubsidi), investasi bisa lebih menguntungkan.',
  },
  {
    q: 'Utang produktif vs konsumtif itu apa?',
    a: 'Produktif = utang yang menambah nilai/aset (KPR, kredit usaha, pendidikan). Konsumtif = untuk konsumsi yang nilainya turun (kartu kredit, kredit gadget). DompetKu memisahkannya agar Anda tahu porsi utang "baik" vs "buruk".',
  },
];

const FinanceGuideUtangSection: React.FC<SectionProps> = ({ onNavigate }) => {
  const [active, setActive] = useState<UtangSection>('overview');
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
            <strong className="text-on-surface dark:text-white">Rencana Utang</strong> membantu Anda mencatat semua kewajiban (liabilitas) dan menyusun strategi melunasinya secepat & sehemat mungkin. Utang mengurangi kekayaan bersih, jadi mencatatnya membuat gambaran keuangan Anda utuh.
          </p>

          {/* Health metrics */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant dark:text-outline mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-base text-primary dark:text-[#a7c8ff]">insights</span>
              4 indikator kesehatan utang
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {METRICS.map(m => (
                <div key={m.label} className="flex gap-3 items-start rounded-2xl bg-surface-container-lowest dark:bg-white/5 border border-outline-variant/10 dark:border-white/10 p-4">
                  <div className="w-10 h-10 rounded-xl bg-surface-container dark:bg-white/10 flex items-center justify-center shrink-0">
                    <span className={`material-symbols-outlined ${m.tone}`} style={{ fontVariationSettings: "'FILL' 1" }}>{m.icon}</span>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-on-surface dark:text-white">{m.label}</p>
                    <p className="text-[11px] text-on-surface-variant dark:text-slate-400 mt-0.5 leading-relaxed">{m.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Productive vs consumptive */}
          <div className="rounded-2xl border border-blue-200/60 dark:border-[#a7c8ff]/20 bg-blue-50/60 dark:bg-[#a7c8ff]/5 p-5 sm:p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="material-symbols-outlined text-blue-600 dark:text-[#a7c8ff]" style={{ fontVariationSettings: "'FILL' 1" }}>lightbulb</span>
              <h4 className="font-bold text-on-surface dark:text-white text-sm sm:text-base">Kenali: Utang Produktif vs Konsumtif</h4>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-xl bg-white/70 dark:bg-white/[0.03] border border-blue-200/50 dark:border-white/5 p-4">
                <p className="text-sm font-bold text-blue-700 dark:text-[#a7c8ff] flex items-center gap-2">
                  <span className="material-symbols-outlined text-base">trending_up</span> Produktif
                </p>
                <p className="text-[11px] text-on-surface-variant dark:text-slate-400 mt-1.5 leading-relaxed">Menambah nilai atau menghasilkan aset: KPR, kredit usaha, pinjaman pendidikan. Wajar dimiliki selama terkendali.</p>
              </div>
              <div className="rounded-xl bg-white/70 dark:bg-white/[0.03] border border-amber-200/50 dark:border-white/5 p-4">
                <p className="text-sm font-bold text-amber-700 dark:text-amber-400 flex items-center gap-2">
                  <span className="material-symbols-outlined text-base">trending_down</span> Konsumtif
                </p>
                <p className="text-[11px] text-on-surface-variant dark:text-slate-400 mt-1.5 leading-relaxed">Untuk konsumsi yang nilainya turun: kartu kredit, paylater, kredit gadget. Biasanya berbunga tinggi → prioritaskan dilunasi.</p>
              </div>
            </div>
          </div>

          <FinanceGuidePrinciple
            points={[
              { icon: 'monitoring', title: 'Jaga DTI di Bawah 35%', text: 'Total cicilan bulanan idealnya < 35% pendapatan agar arus kas tetap sehat — pedoman rasio utang CFP®.' },
              { icon: 'landscape', title: 'Avalanche = Paling Efisien', text: 'Melunasi bunga tertinggi dulu paling menghemat biaya secara matematis (prinsip nilai waktu uang / CFA®).' },
              { icon: 'psychology', title: 'Snowball = Keuangan Perilaku', text: 'Melunasi saldo terkecil dulu memberi kemenangan cepat yang menjaga motivasi & konsistensi Anda.' },
              { icon: 'balance', title: 'Utang Mahal Dilunasi Dulu', text: 'Jika bunga utang melebihi ekspektasi return investasi, melunasinya = "imbal hasil bebas risiko" yang pasti.' },
            ]}
          />
        </div>
      )}

      {/* ============ INPUT ============ */}
      {active === 'input' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="rounded-2xl bg-surface-container-lowest dark:bg-white/5 border border-outline-variant/10 dark:border-white/10 p-5 sm:p-6">
            <h4 className="font-bold text-on-surface dark:text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-primary dark:text-[#a7c8ff]" style={{ fontVariationSettings: "'FILL' 1" }}>edit_note</span>
              Menambahkan utang
            </h4>
            <p className="text-sm text-on-surface-variant dark:text-slate-300 mt-2 leading-relaxed">
              Buka halaman <strong className="text-on-surface dark:text-white">Rencana Utang</strong>, klik <strong className="text-on-surface dark:text-white">Tambah Utang</strong>, lalu lengkapi detail liabilitas. Hanya <strong className="text-on-surface dark:text-white">Sisa Pokok</strong>, <strong className="text-on-surface dark:text-white">Bunga</strong>, dan <strong className="text-on-surface dark:text-white">Cicilan/Bulan</strong> yang wajib — sisanya opsional tapi membuat proyeksi lebih akurat.
            </p>
          </div>

          {/* Debt types */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant dark:text-outline mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-base text-primary dark:text-[#a7c8ff]">category</span>
              6 tipe utang
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {DEBT_TYPES.map(d => (
                <div key={d.label} className="rounded-2xl bg-surface-container-lowest dark:bg-white/5 border border-outline-variant/10 dark:border-white/10 p-4">
                  <span className="material-symbols-outlined text-primary dark:text-[#a7c8ff] mb-2 block">{d.icon}</span>
                  <p className="text-sm font-bold text-on-surface dark:text-white leading-tight">{d.label}</p>
                  <p className="text-[10px] text-on-surface-variant dark:text-slate-400 mt-1">{d.kind}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Field explainer */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant dark:text-outline mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-base text-primary dark:text-[#a7c8ff]">list_alt</span>
              Memahami kolom pentingnya
            </h4>
            <div className="space-y-3">
              {FIELDS.map(f => (
                <div key={f.label} className="rounded-2xl bg-surface-container-lowest dark:bg-white/5 border border-outline-variant/10 dark:border-white/10 p-4">
                  <p className="text-sm font-bold text-on-surface dark:text-white">{f.label}</p>
                  <p className="text-[11px] text-on-surface-variant dark:text-slate-400 mt-1 leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Fixed vs Effective */}
          <div className="rounded-2xl border border-amber-200/60 dark:border-amber-500/20 bg-amber-50/60 dark:bg-amber-900/10 p-5">
            <div className="flex items-center gap-3 mb-3">
              <span className="material-symbols-outlined text-amber-600 dark:text-amber-400" style={{ fontVariationSettings: "'FILL' 1" }}>percent</span>
              <h4 className="font-bold text-on-surface dark:text-white text-sm">Tipe Bunga: Fixed/Flat vs Floating/Efektif</h4>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-xl bg-white/70 dark:bg-white/[0.03] border border-outline-variant/10 dark:border-white/5 p-4">
                <p className="text-sm font-bold text-on-surface dark:text-white">Fixed / Flat</p>
                <p className="text-[11px] text-on-surface-variant dark:text-slate-400 mt-1 leading-relaxed">Bunga dihitung dari pokok <strong className="text-on-surface dark:text-white">awal</strong> sepanjang tenor → cicilan tetap. Umum di KTA & kredit kendaraan. Terlihat kecil, tapi efektifnya bisa ~1,8x lipat.</p>
              </div>
              <div className="rounded-xl bg-white/70 dark:bg-white/[0.03] border border-outline-variant/10 dark:border-white/5 p-4">
                <p className="text-sm font-bold text-on-surface dark:text-white">Floating / Efektif</p>
                <p className="text-[11px] text-on-surface-variant dark:text-slate-400 mt-1 leading-relaxed">Bunga dihitung dari <strong className="text-on-surface dark:text-white">sisa</strong> pokok yang terus berkurang. Umum di KPR; nilainya bisa berubah mengikuti suku bunga pasar.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============ STRATEGY ============ */}
      {active === 'strategy' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="rounded-2xl bg-surface-container-lowest dark:bg-white/5 border border-outline-variant/10 dark:border-white/10 p-5 sm:p-6">
            <h4 className="font-bold text-on-surface dark:text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-primary dark:text-[#a7c8ff]" style={{ fontVariationSettings: "'FILL' 1" }}>strategy</span>
              Pilih strategi pelunasan
            </h4>
            <p className="text-sm text-on-surface-variant dark:text-slate-300 mt-2 leading-relaxed">
              Setelah utang tercatat, DompetKu membandingkan tiga strategi. Idenya sama: bayar minimum di semua utang, lalu alihkan <strong className="text-on-surface dark:text-white">dana ekstra</strong> ke satu utang prioritas sampai lunas, baru lanjut ke berikutnya.
            </p>
          </div>

          <div className="space-y-3">
            {STRATEGIES.map(s => (
              <div key={s.name} className="rounded-2xl bg-surface-container-lowest dark:bg-white/5 border border-outline-variant/10 dark:border-white/10 p-4 sm:p-5 flex gap-4 items-start">
                <div className={`w-11 h-11 rounded-xl ${s.bg} flex items-center justify-center shrink-0`}>
                  <span className={`material-symbols-outlined ${s.tone}`} style={{ fontVariationSettings: "'FILL' 1" }}>{s.icon}</span>
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-bold text-on-surface dark:text-white">{s.name}</p>
                    <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-surface-container dark:bg-white/10 text-on-surface-variant dark:text-outline">{s.tag}</span>
                  </div>
                  <p className="text-[11px] sm:text-xs text-on-surface-variant dark:text-slate-400 mt-1.5 leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Simulator + invest vs payoff */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-2xl bg-blue-50/50 dark:bg-[#a7c8ff]/5 border border-blue-200/50 dark:border-[#a7c8ff]/15 p-5">
              <span className="material-symbols-outlined text-blue-600 dark:text-[#a7c8ff] mb-2 block">tune</span>
              <p className="text-sm font-bold text-on-surface dark:text-white">Simulator Cicilan Ekstra</p>
              <p className="text-[11px] text-on-surface-variant dark:text-slate-400 mt-1 leading-relaxed">Geser jumlah dana ekstra per bulan untuk melihat berapa <strong className="text-on-surface dark:text-white">bulan lebih cepat</strong> lunas dan berapa <strong className="text-on-surface dark:text-white">bunga yang dihemat</strong>. Jaga agar ekstra tak melebihi surplus kas bulanan Anda.</p>
            </div>
            <div className="rounded-2xl bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-200/50 dark:border-emerald-500/15 p-5">
              <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400 mb-2 block">balance</span>
              <p className="text-sm font-bold text-on-surface dark:text-white">Lunasi Utang atau Investasi?</p>
              <p className="text-[11px] text-on-surface-variant dark:text-slate-400 mt-1 leading-relaxed">Jika bunga utang <strong className="text-on-surface dark:text-white">lebih tinggi</strong> dari ekspektasi return investasi, melunasi dulu = "return bebas risiko". Jika lebih rendah, surplus dana bisa lebih optimal diinvestasikan.</p>
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
          <span className="material-symbols-outlined text-primary dark:text-[#a7c8ff] text-2xl hidden sm:block">flag</span>
          <div>
            <p className="text-sm font-bold text-on-surface dark:text-white">Siap menyusun rencana bebas utang?</p>
            <p className="text-xs text-on-surface-variant dark:text-slate-400 mt-0.5">Catat utang Anda dan lihat proyeksi pelunasannya.</p>
          </div>
        </div>
        <button
          onClick={() => onNavigate('debts')}
          className="w-full sm:w-auto px-6 py-3 bg-primary dark:bg-[#a7c8ff] text-white dark:text-[#001b3c] font-bold text-sm rounded-2xl shadow-md hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-2 shrink-0"
        >
          <span className="material-symbols-outlined text-lg">leaderboard</span>
          Buka Rencana Utang
        </button>
      </div>
    </div>
  );
};

export default FinanceGuideUtangSection;
