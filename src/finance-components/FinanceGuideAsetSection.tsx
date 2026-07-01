import React, { useState } from 'react';
import FinanceGuidePrinciple from './FinanceGuidePrinciple';

interface SectionProps {
  onNavigate: (tab: string) => void;
}

type AsetSection = 'overview' | 'liquid' | 'investment' | 'faq';

const SECTIONS: { key: AsetSection; label: string; icon: string }[] = [
  { key: 'overview', label: 'Ringkasan', icon: 'menu_book' },
  { key: 'liquid', label: 'Aset Lancar', icon: 'account_balance' },
  { key: 'investment', label: 'Aset Investasi', icon: 'show_chart' },
  { key: 'faq', label: 'Tips & FAQ', icon: 'help' },
];

// The three asset types, exactly as offered in the "Tambah Aset" form.
const ASSET_TYPES = [
  {
    icon: 'account_balance',
    title: 'Aset Lancar',
    tone: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-900/20',
    desc: 'Uang tunai & saldo yang bisa Anda pakai kapan saja.',
    examples: ['Rekening bank', 'E-wallet (GoPay, OVO, Dana)', 'Uang tunai', 'Saldo RDN di sekuritas'],
  },
  {
    icon: 'show_chart',
    title: 'Aset Investasi',
    tone: 'text-blue-600 dark:text-[#a7c8ff]',
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    desc: 'Instrumen yang Anda beli agar nilainya bertumbuh.',
    examples: ['Saham', 'Reksadana', 'Kripto', 'Obligasi / SBN', 'Deposito', 'P2P Lending'],
  },
  {
    icon: 'domain',
    title: 'Aset Fisik',
    tone: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    desc: 'Harta berwujud & properti yang Anda miliki.',
    examples: ['Rumah / tanah', 'Kendaraan', 'Emas / logam mulia', 'Barang koleksi'],
  },
];

// Institution groups available under the "Aset Lancar" form.
const LIQUID_GROUPS = [
  { icon: 'account_balance', label: 'Bank Nasional', desc: 'BCA, Mandiri, BRI, BNI, CIMB, BSI, dll.' },
  { icon: 'smartphone', label: 'Bank Digital', desc: 'Jago, Blu BCA, Jenius, Seabank, Allo Bank, dll.' },
  { icon: 'account_balance_wallet', label: 'E-Wallet', desc: 'GoPay, OVO, Dana, LinkAja, ShopeePay, Flip.' },
  { icon: 'candlestick_chart', label: 'Sekuritas & Investasi', desc: 'Saldo tunai / RDN di Ajaib, Bibit, Stockbit, dll. — bagian uang yang BELUM dibelikan produk.' },
  { icon: 'payments', label: 'Lainnya', desc: 'Uang tunai, PayPal, Wise, atau sumber lainnya.' },
];

// Investment categories, matching the options in FinanceAddAsset.
const INVESTMENT_CATS = [
  {
    icon: 'trending_up',
    label: 'Saham',
    tone: 'text-blue-600 dark:text-[#a7c8ff]',
    fields: ['Kode saham (mis. BBCA)', 'Jumlah dalam Lot (1 Lot = 100 lembar)', 'Harga rata-rata / lembar', 'Biaya broker (opsional)'],
  },
  {
    icon: 'account_balance',
    label: 'Reksadana',
    tone: 'text-emerald-600 dark:text-emerald-400',
    fields: ['Nama produk reksadana', 'Jumlah unit yang dimiliki', 'NAB (harga) rata-rata / unit'],
  },
  {
    icon: 'currency_bitcoin',
    label: 'Kripto',
    tone: 'text-purple-600 dark:text-purple-400',
    fields: ['Nama koin (mis. BTC, ETH)', 'Jumlah koin', 'Harga rata-rata / koin'],
  },
  {
    icon: 'assured_workload',
    label: 'Obligasi / SBN',
    tone: 'text-amber-600 dark:text-amber-400',
    fields: ['Penerbit (ORI, FR, korporasi)', 'Nilai nominal', 'Kupon / bunga (%)', 'Tanggal jatuh tempo & tenor'],
  },
  {
    icon: 'savings',
    label: 'Deposito',
    tone: 'text-teal-600 dark:text-teal-400',
    fields: ['Bank penerbit', 'Nominal penempatan', 'Suku bunga (%)', 'Jatuh tempo & tenor'],
  },
  {
    icon: 'handshake',
    label: 'P2P Lending',
    tone: 'text-rose-600 dark:text-rose-400',
    fields: ['Platform pendanaan', 'Nominal didanai', 'Imbal hasil (%)', 'Tenor pendanaan'],
  },
];

const FAQS = [
  {
    q: 'Uang saya di Bibit/Ajaib tapi belum dibelikan produk apa pun. Masuk mana?',
    a: 'Masuk ke Aset Lancar. Pilih jenis "Aset Lancar" → institusi "Sekuritas & Investasi" → pilih platform-nya (mis. Bibit), lalu isi saldo RDN yang masih menganggur.',
  },
  {
    q: 'Saya sudah beli reksadana / saham. Masuk mana?',
    a: 'Masuk ke Aset Investasi. Pilih jenis "Aset Investasi" → kategori yang sesuai (Reksadana / Saham), lalu isi jumlah unit/lot beserta harga rata-ratanya.',
  },
  {
    q: 'Deposito itu Aset Lancar atau Aset Investasi?',
    a: 'Aset Investasi, kategori "Deposito". Meski uangnya di bank, deposito terkunci sampai jatuh tempo dan berbunga, jadi diperlakukan sebagai instrumen investasi agar bunga & tenornya tercatat.',
  },
  {
    q: 'Saya punya 350 lembar saham, diisi berapa Lot?',
    a: '3,5 Lot. Rumusnya jumlah lembar ÷ 100. Jadi 350 lembar = 3,5 Lot, 1.000 lembar = 10 Lot.',
  },
  {
    q: 'Kolom "harga rata-rata" itu harga sekarang atau harga beli?',
    a: 'Harga BELI rata-rata Anda, bukan harga pasar hari ini. Dari sini DompetKu menghitung total modal Anda. Nilai pasar terkini diperbarui terpisah lewat fitur update harga.',
  },
  {
    q: 'Reksadana Pasar Uang kan mirip tabungan, kenapa di Investasi?',
    a: 'Karena tetap berbentuk unit yang nilainya (NAB) berubah, bukan saldo tetap. Agar pertumbuhan nilainya terlacak, catat sebagai Aset Investasi → Reksadana.',
  },
  {
    q: 'Emas / logam mulia masuk mana?',
    a: 'Umumnya ke Aset Fisik karena berwujud. Jika Anda menabung emas digital dan ingin melacaknya seperti portofolio, boleh juga dicatat sebagai Aset Investasi — pilih yang paling sesuai gaya Anda.',
  },
];

const FinanceGuideAsetSection: React.FC<SectionProps> = ({ onNavigate }) => {
  const [active, setActive] = useState<AsetSection>('overview');
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
            Bagian <strong className="text-on-surface dark:text-white">Aset</strong> adalah tempat Anda mencatat seluruh harta yang dimiliki. DompetKu mengelompokkannya menjadi <strong className="text-on-surface dark:text-white">3 jenis</strong>. Kenali dulu ketiganya:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {ASSET_TYPES.map(t => (
              <div key={t.title} className="rounded-2xl bg-surface-container-lowest dark:bg-white/5 border border-outline-variant/10 dark:border-white/10 p-5 shadow-sm">
                <div className={`w-11 h-11 rounded-xl ${t.bg} flex items-center justify-center mb-3`}>
                  <span className={`material-symbols-outlined ${t.tone}`} style={{ fontVariationSettings: "'FILL' 1" }}>{t.icon}</span>
                </div>
                <h4 className="font-bold text-on-surface dark:text-white">{t.title}</h4>
                <p className="text-xs text-on-surface-variant dark:text-slate-400 mt-1 leading-relaxed">{t.desc}</p>
                <ul className="mt-3 space-y-1.5">
                  {t.examples.map(ex => (
                    <li key={ex} className="flex items-center gap-2 text-[11px] text-on-surface-variant dark:text-slate-400 font-medium">
                      <span className={`material-symbols-outlined text-sm ${t.tone}`}>check_small</span>
                      {ex}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* The big clarifier */}
          <div className="rounded-2xl border border-blue-200/60 dark:border-[#a7c8ff]/20 bg-blue-50/60 dark:bg-[#a7c8ff]/5 p-5 sm:p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="material-symbols-outlined text-blue-600 dark:text-[#a7c8ff]" style={{ fontVariationSettings: "'FILL' 1" }}>lightbulb</span>
              <h4 className="font-bold text-on-surface dark:text-white text-sm sm:text-base">Paling sering tertukar: Aset Lancar vs Aset Investasi</h4>
            </div>
            <div className="space-y-3">
              {[
                { t: 'Saldo tunai (RDN) di aplikasi sekuritas', a: 'Aset Lancar', b: 'Aset Investasi', note: 'Uang yang BELUM dibelikan produk → Aset Lancar (Sekuritas). Setelah dibelikan saham/reksadana → baru jadi Aset Investasi.' },
                { t: 'Deposito berjangka', a: 'Aset Investasi', b: null, note: 'Masuk kategori "Deposito" di Aset Investasi — bukan Aset Lancar — karena terkunci sampai jatuh tempo & berbunga.' },
                { t: 'Reksadana Pasar Uang', a: 'Aset Investasi', b: null, note: 'Walau sifatnya mirip kas, tetap dicatat sebagai Reksadana agar pertumbuhan NAB-nya terlacak.' },
              ].map((row, i) => (
                <div key={i} className="rounded-xl bg-white/70 dark:bg-white/[0.03] border border-outline-variant/10 dark:border-white/5 p-4">
                  <p className="text-sm font-bold text-on-surface dark:text-white flex items-center gap-2">
                    <span className="material-symbols-outlined text-base text-on-surface-variant dark:text-outline">quiz</span>
                    {row.t}
                  </p>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">→ {row.a}</span>
                    {row.b && (
                      <>
                        <span className="text-[11px] text-on-surface-variant dark:text-outline">setelah dibeli jadi</span>
                        <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-[#a7c8ff]">{row.b}</span>
                      </>
                    )}
                  </div>
                  <p className="text-[11px] text-on-surface-variant dark:text-slate-400 mt-2 leading-relaxed">{row.note}</p>
                </div>
              ))}
            </div>
          </div>

          <FinanceGuidePrinciple
            points={[
              { icon: 'donut_large', title: 'Diversifikasi', text: 'Sebar kekayaan ke beberapa kelas aset (kas, saham, obligasi, properti) untuk menyeimbangkan risiko & imbal hasil — prinsip inti CFA®.' },
              { icon: 'emergency', title: 'Dana Darurat Dulu', text: 'Amankan 3–6 bulan biaya hidup di Aset Lancar sebelum berinvestasi agresif, agar tak perlu jual aset saat butuh mendadak.' },
              { icon: 'tune', title: 'Alokasi Sesuai Profil Risiko', text: 'Bagi porsi aset bertumbuh (saham) vs defensif (kas, obligasi) sesuai horizon waktu & toleransi risiko Anda.' },
              { icon: 'trending_up', title: 'Fokus pada Net Worth', text: 'Ukur kemajuan dari tren kekayaan bersih (aset − utang), bukan sekadar saldo satu rekening.' },
            ]}
          />
        </div>
      )}

      {/* ============ LIQUID ============ */}
      {active === 'liquid' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="rounded-2xl bg-surface-container-lowest dark:bg-white/5 border border-outline-variant/10 dark:border-white/10 p-5 sm:p-6">
            <h4 className="font-bold text-on-surface dark:text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400" style={{ fontVariationSettings: "'FILL' 1" }}>account_balance</span>
              Apa itu Aset Lancar?
            </h4>
            <p className="text-sm text-on-surface-variant dark:text-slate-300 mt-2 leading-relaxed">
              Aset lancar adalah uang yang <strong className="text-on-surface dark:text-white">bisa langsung Anda pakai</strong> tanpa perlu menjual apa pun — saldo di rekening, e-wallet, uang tunai, hingga saldo tunai (RDN) yang masih menganggur di aplikasi sekuritas. Anda cukup mencatat <strong className="text-on-surface dark:text-white">nama akun</strong> dan <strong className="text-on-surface dark:text-white">saldonya</strong>.
            </p>
          </div>

          {/* Steps */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant dark:text-outline mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-base text-primary dark:text-[#a7c8ff]">list_alt</span>
              Langkah menambahkan
            </h4>
            <div className="relative border-l border-outline-variant/30 dark:border-white/10 pl-6 ml-3 space-y-5">
              {[
                'Klik tombol Tambah Aset, lalu pilih jenis "Aset Lancar".',
                'Pilih institusi: Bank Nasional, Bank Digital, E-Wallet, Sekuritas & Investasi, atau Lainnya.',
                'Beri nama akun agar mudah dikenali, mis. "BCA Utama" atau "GoPay Harian".',
                'Isi Saldo Saat Ini sesuai jumlah uang yang ada di akun tersebut.',
                'Simpan. Aset akan langsung muncul di daftar Aset Lancar dan menambah total kekayaan Anda.',
              ].map((step, i) => (
                <div key={i} className="relative">
                  <span className="absolute -left-[37px] top-0 w-6 h-6 rounded-full bg-primary dark:bg-[#a7c8ff] text-white dark:text-[#001b3c] flex items-center justify-center text-[11px] font-extrabold shadow-sm">{i + 1}</span>
                  <p className="text-sm text-on-surface dark:text-slate-200 leading-relaxed font-medium">{step}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Provider groups */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant dark:text-outline mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-base text-primary dark:text-[#a7c8ff]">category</span>
              Pilihan institusi
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {LIQUID_GROUPS.map(g => (
                <div key={g.label} className="flex gap-3 items-start rounded-2xl bg-surface-container-lowest dark:bg-white/5 border border-outline-variant/10 dark:border-white/10 p-4">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400 text-lg">{g.icon}</span>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-on-surface dark:text-white">{g.label}</p>
                    <p className="text-[11px] text-on-surface-variant dark:text-slate-400 mt-0.5 leading-relaxed">{g.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Common mistake */}
          <div className="rounded-2xl border border-amber-200/60 dark:border-amber-500/20 bg-amber-50/60 dark:bg-amber-900/10 p-4 flex gap-3">
            <span className="material-symbols-outlined text-amber-600 dark:text-amber-400 shrink-0">warning</span>
            <div>
              <p className="text-sm font-bold text-on-surface dark:text-white">Hindari kesalahan ini</p>
              <p className="text-xs text-on-surface-variant dark:text-slate-400 mt-1 leading-relaxed">
                Jangan memasukkan nilai saham/reksadana yang sudah dibeli ke sini — itu masuk <strong className="text-on-surface dark:text-white">Aset Investasi</strong>. Aset Lancar hanya untuk saldo tunai yang siap dipakai. Ingat juga memperbarui saldo saat ada perubahan besar.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ============ INVESTMENT ============ */}
      {active === 'investment' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="rounded-2xl bg-surface-container-lowest dark:bg-white/5 border border-outline-variant/10 dark:border-white/10 p-5 sm:p-6">
            <h4 className="font-bold text-on-surface dark:text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-blue-600 dark:text-[#a7c8ff]" style={{ fontVariationSettings: "'FILL' 1" }}>show_chart</span>
              Apa itu Aset Investasi?
            </h4>
            <p className="text-sm text-on-surface-variant dark:text-slate-300 mt-2 leading-relaxed">
              Aset investasi adalah instrumen yang Anda beli agar nilainya <strong className="text-on-surface dark:text-white">bertumbuh</strong>. Berbeda dari aset lancar, di sini Anda mencatat <strong className="text-on-surface dark:text-white">jumlah unit</strong> dan <strong className="text-on-surface dark:text-white">harga rata-rata pembelian</strong>, lalu DompetKu menghitung total modal Anda secara otomatis.
            </p>
          </div>

          {/* Category cards */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant dark:text-outline mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-base text-primary dark:text-[#a7c8ff]">tune</span>
              6 kategori & data yang diperlukan
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {INVESTMENT_CATS.map(c => (
                <div key={c.label} className="rounded-2xl bg-surface-container-lowest dark:bg-white/5 border border-outline-variant/10 dark:border-white/10 p-4">
                  <div className="flex items-center gap-2.5 mb-3">
                    <span className={`material-symbols-outlined ${c.tone}`} style={{ fontVariationSettings: "'FILL' 1" }}>{c.icon}</span>
                    <p className="font-bold text-on-surface dark:text-white text-sm">{c.label}</p>
                  </div>
                  <ul className="space-y-1.5">
                    {c.fields.map(f => (
                      <li key={f} className="flex items-start gap-2 text-[11px] text-on-surface-variant dark:text-slate-400 font-medium leading-relaxed">
                        <span className="material-symbols-outlined text-sm text-on-surface-variant dark:text-outline mt-px">arrow_right</span>
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* Key concepts */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { icon: 'grid_view', t: 'Apa itu Lot?', d: '1 Lot = 100 lembar saham. Punya 500 lembar berarti isi 5 Lot. Aturan ini khusus saham.' },
              { icon: 'sell', t: 'Harga rata-rata', d: 'Isi harga BELI rata-rata per unit — bukan harga pasar hari ini. Dipakai untuk menghitung modal.' },
              { icon: 'update', t: 'Update harga berkala', d: 'Nilai pasar terkini diperbarui lewat fitur update harga agar untung/rugi Anda akurat.' },
            ].map(k => (
              <div key={k.t} className="rounded-2xl bg-blue-50/50 dark:bg-[#a7c8ff]/5 border border-blue-200/50 dark:border-[#a7c8ff]/15 p-4">
                <span className="material-symbols-outlined text-blue-600 dark:text-[#a7c8ff] mb-2 block">{k.icon}</span>
                <p className="text-sm font-bold text-on-surface dark:text-white">{k.t}</p>
                <p className="text-[11px] text-on-surface-variant dark:text-slate-400 mt-1 leading-relaxed">{k.d}</p>
              </div>
            ))}
          </div>

          {/* Steps */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant dark:text-outline mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-base text-primary dark:text-[#a7c8ff]">list_alt</span>
              Langkah menambahkan
            </h4>
            <div className="relative border-l border-outline-variant/30 dark:border-white/10 pl-6 ml-3 space-y-5">
              {[
                'Klik Tambah Aset, lalu pilih jenis "Aset Investasi".',
                'Pilih kategori: Saham, Reksadana, Kripto, Obligasi/SBN, Deposito, atau P2P.',
                'Isi kode/nama instrumen (mis. BBCA untuk saham) dan platform tempat Anda membelinya.',
                'Masukkan jumlah (Lot untuk saham, unit untuk reksadana, koin untuk kripto) dan harga rata-rata belinya.',
                'Periksa "Estimasi Total Modal Investasi" yang terhitung otomatis, lalu Simpan.',
              ].map((step, i) => (
                <div key={i} className="relative">
                  <span className="absolute -left-[37px] top-0 w-6 h-6 rounded-full bg-primary dark:bg-[#a7c8ff] text-white dark:text-[#001b3c] flex items-center justify-center text-[11px] font-extrabold shadow-sm">{i + 1}</span>
                  <p className="text-sm text-on-surface dark:text-slate-200 leading-relaxed font-medium">{step}</p>
                </div>
              ))}
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
          <span className="material-symbols-outlined text-primary dark:text-[#a7c8ff] text-2xl hidden sm:block">rocket_launch</span>
          <div>
            <p className="text-sm font-bold text-on-surface dark:text-white">Siap mencatat aset Anda?</p>
            <p className="text-xs text-on-surface-variant dark:text-slate-400 mt-0.5">Coba langsung tambahkan aset pertama Anda ke dalam ledger.</p>
          </div>
        </div>
        <button
          onClick={() => onNavigate('add-asset')}
          className="w-full sm:w-auto px-6 py-3 bg-primary dark:bg-[#a7c8ff] text-white dark:text-[#001b3c] font-bold text-sm rounded-2xl shadow-md hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-2 shrink-0"
        >
          <span className="material-symbols-outlined text-lg">add</span>
          Mulai Tambah Aset
        </button>
      </div>
    </div>
  );
};

export default FinanceGuideAsetSection;
