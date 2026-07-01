import React, { useState } from 'react';
import FinanceGuidePrinciple from './FinanceGuidePrinciple';

interface SectionProps {
  onNavigate: (tab: string) => void;
}

type TransaksiSection = 'overview' | 'howto' | 'manage' | 'faq';

const SECTIONS: { key: TransaksiSection; label: string; icon: string }[] = [
  { key: 'overview', label: 'Ringkasan', icon: 'receipt_long' },
  { key: 'howto', label: 'Cara Mencatat', icon: 'edit_note' },
  { key: 'manage', label: 'Kelola & Cari', icon: 'filter_list' },
  { key: 'faq', label: 'Tips & FAQ', icon: 'help' },
];

// The three transaction types offered in the Tambah Transaksi form.
const TX_TYPES = [
  {
    icon: 'trending_up',
    tone: 'text-[#28cd41] dark:text-[#30d158]',
    bg: 'bg-[#28cd41]/10 dark:bg-[#30d158]/15',
    label: 'Pemasukan',
    desc: 'Uang masuk yang menambah saldo akun.',
    examples: ['Gaji & bonus', 'Hasil usaha', 'Dividen / bunga', 'Hadiah / lainnya'],
  },
  {
    icon: 'trending_down',
    tone: 'text-[#ff3b30] dark:text-[#ff6961]',
    bg: 'bg-[#ff3b30]/10 dark:bg-[#ff6961]/15',
    label: 'Pengeluaran',
    desc: 'Uang keluar yang mengurangi saldo akun.',
    examples: ['Belanja & makan', 'Tagihan & langganan', 'Cicilan utang', 'Transportasi'],
  },
  {
    icon: 'swap_horiz',
    tone: 'text-[#007aff] dark:text-[#0a84ff]',
    bg: 'bg-[#007aff]/10 dark:bg-[#0a84ff]/15',
    label: 'Transfer',
    desc: 'Pindah saldo antar akun Anda sendiri.',
    examples: ['Top-up e-wallet', 'Tarik tunai ATM', 'Setor ke RDN', 'Antar rekening'],
  },
];

// Key fields of the transaction form.
const FIELDS = [
  { icon: 'sync_alt', label: 'Tipe', desc: 'Pemasukan, Pengeluaran, atau Transfer — menentukan arah uang.' },
  { icon: 'payments', label: 'Nominal', desc: 'Jumlah uang transaksi tersebut.' },
  { icon: 'account_balance_wallet', label: 'Akun', desc: 'Dari akun/aset mana uang keluar-masuk. Untuk transfer: pilih Akun Sumber (Dari) dan Akun Tujuan (Ke).' },
  { icon: 'category', label: 'Kategori', desc: 'Mengelompokkan transaksi (mis. Belanja, Gaji). Inilah yang menyambungkan transaksi ke Anggaran 50/30/20.' },
  { icon: 'calendar_today', label: 'Tanggal', desc: 'Kapan transaksi terjadi — dipakai untuk filter & laporan per periode.' },
  { icon: 'notes', label: 'Deskripsi', desc: 'Catatan singkat agar mudah dikenali saat ditelusuri nanti.' },
];

const FAQS = [
  {
    q: 'Kenapa Transfer tidak menambah atau mengurangi kekayaan?',
    a: 'Karena transfer hanya memindahkan uang antar akun milik Anda sendiri (mis. dari bank ke e-wallet). Total kekayaan bersih tidak berubah — yang berubah hanya saldo di masing-masing akun. Karena itu transfer tidak dihitung sebagai pemasukan atau pengeluaran.',
  },
  {
    q: 'Top-up e-wallet dari rekening bank, dicatat sebagai apa?',
    a: 'Sebagai Transfer: Akun Sumber = rekening bank, Akun Tujuan = e-wallet. Jangan dicatat sebagai Pengeluaran, karena uangnya masih milik Anda, hanya pindah tempat.',
  },
  {
    q: 'Tarik tunai di ATM dicatat bagaimana?',
    a: 'Sebagai Transfer dari rekening bank ke akun "Tunai". Baru ketika uang tunai itu dibelanjakan, catat sebagai Pengeluaran.',
  },
  {
    q: 'Bayar cicilan utang masuk kategori apa?',
    a: 'Sebagai Pengeluaran, biasanya klasifikasi Needs (mis. kategori "Cicilan"). Pelunasan pokoknya juga Anda perbarui di Rencana Utang agar sisa pokok utang ikut turun.',
  },
  {
    q: 'Kenapa saya harus rajin mengisi kategori?',
    a: 'Karena kategori adalah "bahan bakar" laporan. Kategori yang benar membuat rasio Anggaran 50/30/20 dan Laporan arus kas akurat. Transaksi tanpa kategori = laporan yang menyesatkan.',
  },
  {
    q: 'Salah catat transaksi, bisa diperbaiki?',
    a: 'Bisa. Buka Log Transaksi, pilih transaksi yang ingin diubah, lalu edit atau hapus. Saldo akun akan menyesuaikan otomatis.',
  },
  {
    q: 'Bagaimana mencari transaksi lama atau mengekspornya?',
    a: 'Gunakan kolom Cari (berdasarkan deskripsi/lokasi) dan filter Akun, Tipe, Bulan, serta Tahun. Hasil yang terfilter bisa diekspor ke CSV atau dicetak sebagai ledger.',
  },
];

const FinanceGuideTransaksiSection: React.FC<SectionProps> = ({ onNavigate }) => {
  const [active, setActive] = useState<TransaksiSection>('overview');
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
            <strong className="text-on-surface dark:text-white">Log Transaksi</strong> mencatat setiap uang masuk & keluar. Ini <strong className="text-on-surface dark:text-white">sumber data utama</strong> DompetKu — dari sinilah saldo Aset, realisasi Anggaran, dan Laporan arus kas dihitung. Ada 3 jenis transaksi:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {TX_TYPES.map(t => (
              <div key={t.label} className="rounded-2xl bg-surface-container-lowest dark:bg-white/5 border border-outline-variant/10 dark:border-white/10 p-5 shadow-sm">
                <div className={`w-11 h-11 rounded-xl ${t.bg} flex items-center justify-center mb-3`}>
                  <span className={`material-symbols-outlined ${t.tone}`} style={{ fontVariationSettings: "'FILL' 1" }}>{t.icon}</span>
                </div>
                <h4 className="font-bold text-on-surface dark:text-white">{t.label}</h4>
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

          {/* Transfer clarifier */}
          <div className="rounded-2xl border border-blue-200/60 dark:border-[#a7c8ff]/20 bg-blue-50/60 dark:bg-[#a7c8ff]/5 p-4 flex gap-3">
            <span className="material-symbols-outlined text-blue-600 dark:text-[#a7c8ff] shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>swap_horiz</span>
            <div>
              <p className="text-sm font-bold text-on-surface dark:text-white">Transfer bukan pemasukan/pengeluaran</p>
              <p className="text-xs text-on-surface-variant dark:text-slate-400 mt-1 leading-relaxed">
                Memindahkan uang antar akun sendiri (mis. bank → e-wallet) tidak mengubah kekayaan bersih Anda. Salah mencatatnya sebagai pemasukan/pengeluaran akan menggelembungkan laporan arus kas.
              </p>
            </div>
          </div>

          <FinanceGuidePrinciple
            points={[
              { icon: 'fact_check', title: 'Catat Semua Transaksi', text: 'Kesadaran arus kas adalah langkah pertama pengelolaan keuangan — "yang tak diukur, tak bisa dikelola" (prinsip dasar CFP®).' },
              { icon: 'label', title: 'Kategori yang Konsisten', text: 'Kategori rapi membuat Anggaran 50/30/20 dan Laporan akurat. Ini fondasi analisis keuangan yang benar (CFA®).' },
              { icon: 'sync_alt', title: 'Pantau Arus Kas Bersih', text: 'Pemasukan − Pengeluaran = surplus. Surplus positif yang konsisten inilah yang dialihkan ke tabungan & investasi.' },
              { icon: 'schedule', title: 'Catat Rutin & Tepat Waktu', text: 'Mencatat sesegera mungkin mencegah transaksi terlupa dan menjaga saldo tetap sesuai kenyataan (rekonsiliasi).' },
            ]}
          />
        </div>
      )}

      {/* ============ HOWTO ============ */}
      {active === 'howto' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant dark:text-outline mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-base text-primary dark:text-[#a7c8ff]">list_alt</span>
              Langkah mencatat transaksi
            </h4>
            <div className="relative border-l border-outline-variant/30 dark:border-white/10 pl-6 ml-3 space-y-5">
              {[
                'Klik tombol Tambah Transaksi.',
                'Pilih tipe: Pengeluaran, Pemasukan, atau Transfer.',
                'Masukkan nominal, lalu pilih akun sumber uangnya.',
                'Pilih kategori yang sesuai (untuk transfer, kategori otomatis "Transfer").',
                'Isi tanggal dan deskripsi singkat agar mudah dikenali.',
                'Simpan. Saldo akun & laporan langsung ter-update otomatis.',
              ].map((step, i) => (
                <div key={i} className="relative">
                  <span className="absolute -left-[37px] top-0 w-6 h-6 rounded-full bg-primary dark:bg-[#a7c8ff] text-white dark:text-[#001b3c] flex items-center justify-center text-[11px] font-extrabold shadow-sm">{i + 1}</span>
                  <p className="text-sm text-on-surface dark:text-slate-200 leading-relaxed font-medium">{step}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Field explainer */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant dark:text-outline mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-base text-primary dark:text-[#a7c8ff]">tune</span>
              Memahami setiap kolom
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {FIELDS.map(f => (
                <div key={f.label} className="flex gap-3 items-start rounded-2xl bg-surface-container-lowest dark:bg-white/5 border border-outline-variant/10 dark:border-white/10 p-4">
                  <div className="w-9 h-9 rounded-xl bg-surface-container dark:bg-white/10 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-primary dark:text-[#a7c8ff] text-lg">{f.icon}</span>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-on-surface dark:text-white">{f.label}</p>
                    <p className="text-[11px] text-on-surface-variant dark:text-slate-400 mt-0.5 leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Transfer how-to */}
          <div className="rounded-2xl border border-blue-200/60 dark:border-[#a7c8ff]/20 bg-blue-50/60 dark:bg-[#a7c8ff]/5 p-4 flex gap-3">
            <span className="material-symbols-outlined text-blue-600 dark:text-[#a7c8ff] shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>swap_horiz</span>
            <div>
              <p className="text-sm font-bold text-on-surface dark:text-white">Khusus Transfer</p>
              <p className="text-xs text-on-surface-variant dark:text-slate-400 mt-1 leading-relaxed">
                Pilih <strong className="text-on-surface dark:text-white">Akun Sumber (Dari)</strong> dan <strong className="text-on-surface dark:text-white">Akun Tujuan (Ke)</strong> — keduanya harus berbeda. Saldo akun sumber berkurang dan akun tujuan bertambah dengan jumlah yang sama.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ============ MANAGE ============ */}
      {active === 'manage' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="rounded-2xl bg-surface-container-lowest dark:bg-white/5 border border-outline-variant/10 dark:border-white/10 p-5 sm:p-6">
            <h4 className="font-bold text-on-surface dark:text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-primary dark:text-[#a7c8ff]" style={{ fontVariationSettings: "'FILL' 1" }}>filter_list</span>
              Menelusuri Log Transaksi
            </h4>
            <p className="text-sm text-on-surface-variant dark:text-slate-300 mt-2 leading-relaxed">
              Semakin banyak transaksi, semakin penting alat pencarian. Halaman Log Transaksi menyediakan pencarian dan filter agar Anda cepat menemukan apa pun.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { icon: 'search', t: 'Cari', d: 'Ketik kata kunci untuk mencari berdasarkan deskripsi atau lokasi transaksi.' },
              { icon: 'filter_alt', t: 'Filter', d: 'Saring berdasarkan Akun, Tipe (Pemasukan/Pengeluaran/Transfer), Bulan, dan Tahun.' },
              { icon: 'download', t: 'Ekspor & Cetak', d: 'Unduh hasil terfilter ke CSV atau cetak sebagai ledger untuk arsip/pelaporan.' },
              { icon: 'edit', t: 'Edit & Hapus', d: 'Pilih transaksi untuk mengubah atau menghapusnya; saldo akun menyesuaikan otomatis.' },
            ].map(x => (
              <div key={x.t} className="flex gap-3 items-start rounded-2xl bg-surface-container-lowest dark:bg-white/5 border border-outline-variant/10 dark:border-white/10 p-4">
                <div className="w-9 h-9 rounded-xl bg-surface-container dark:bg-white/10 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-primary dark:text-[#a7c8ff] text-lg">{x.icon}</span>
                </div>
                <div>
                  <p className="text-sm font-bold text-on-surface dark:text-white">{x.t}</p>
                  <p className="text-[11px] text-on-surface-variant dark:text-slate-400 mt-0.5 leading-relaxed">{x.d}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Data flow */}
          <div className="rounded-2xl border border-emerald-200/60 dark:border-emerald-500/20 bg-emerald-50/60 dark:bg-emerald-900/10 p-5">
            <div className="flex items-center gap-3 mb-3">
              <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400" style={{ fontVariationSettings: "'FILL' 1" }}>hub</span>
              <h4 className="font-bold text-on-surface dark:text-white text-sm">Transaksi mengalir ke seluruh app</h4>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { icon: 'payments', t: 'ke Anggaran', d: 'Kategori transaksi mengisi kolom "Aktual" pada Anggaran.' },
                { icon: 'account_balance', t: 'ke Aset', d: 'Nominal menambah/mengurangi saldo akun terkait.' },
                { icon: 'query_stats', t: 'ke Laporan', d: 'Totalnya membentuk arus kas & analitik di Laporan.' },
              ].map(x => (
                <div key={x.t} className="rounded-xl bg-white/70 dark:bg-white/[0.03] border border-outline-variant/10 dark:border-white/5 p-3.5">
                  <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400 text-lg mb-1.5 block">{x.icon}</span>
                  <p className="text-xs font-bold text-on-surface dark:text-white">{x.t}</p>
                  <p className="text-[11px] text-on-surface-variant dark:text-slate-400 mt-0.5 leading-relaxed">{x.d}</p>
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
          <span className="material-symbols-outlined text-primary dark:text-[#a7c8ff] text-2xl hidden sm:block">receipt_long</span>
          <div>
            <p className="text-sm font-bold text-on-surface dark:text-white">Siap mencatat transaksi pertama?</p>
            <p className="text-xs text-on-surface-variant dark:text-slate-400 mt-0.5">Semakin rajin mencatat, semakin akurat gambaran keuangan Anda.</p>
          </div>
        </div>
        <button
          onClick={() => onNavigate('add-transaction')}
          className="w-full sm:w-auto px-6 py-3 bg-primary dark:bg-[#a7c8ff] text-white dark:text-[#001b3c] font-bold text-sm rounded-2xl shadow-md hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-2 shrink-0"
        >
          <span className="material-symbols-outlined text-lg">add</span>
          Catat Transaksi
        </button>
      </div>
    </div>
  );
};

export default FinanceGuideTransaksiSection;
