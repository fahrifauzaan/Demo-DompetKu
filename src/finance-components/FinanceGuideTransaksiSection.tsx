import React, { useState, useMemo } from 'react';
import FinanceGuidePrinciple from './FinanceGuidePrinciple';
import { useFinanceStore } from '../store/useFinanceStore';

interface SectionProps {
  onNavigate: (tab: string) => void;
}

type TransaksiSection = 'overview' | 'howto' | 'manage' | 'impor' | 'faq';

const SECTIONS: { key: TransaksiSection; label: string; icon: string }[] = [
  { key: 'overview', label: 'Ringkasan', icon: 'receipt_long' },
  { key: 'howto', label: 'Cara Mencatat', icon: 'edit_note' },
  { key: 'manage', label: 'Kelola & Cari', icon: 'filter_list' },
  { key: 'impor', label: 'Impor', icon: 'upload_file' },
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

// The two ways to bring transactions in bulk (the Impor feature).
const IMPORT_METHODS = [
  {
    icon: 'auto_awesome',
    title: 'Impor Cerdas (mutasi bank)',
    desc: 'Unggah file CSV/Excel hasil unduhan m-banking. Kolom terdeteksi otomatis, ada preset bank populer (BCA, Mandiri, BNI, BRI, Jago, Jenius, SeaBank, blu), dan pemetaan bisa disimpan jadi profil — impor bulan berikutnya cukup 1 klik.',
  },
  {
    icon: 'table_view',
    title: 'Template berskema',
    desc: 'Unduh template (Excel dengan dropdown Tipe/Kategori/Akun, atau CSV) lalu isi di Excel/Sheets. Cocok untuk input massal atau migrasi dari aplikasi lain — kolomnya sudah sesuai isian transaksi, jadi langsung rapi & terkategori.',
  },
];

// Where an uploaded file actually goes — the zero-knowledge data flow.
const IMPORT_PRIVACY = [
  { icon: 'devices', t: 'Dibaca di perangkat Anda', d: 'File CSV/Excel dibaca 100% di dalam browser untuk diurai jadi angka & teks. File-nya tidak pernah diunggah sebagai file ke mana pun.' },
  { icon: 'table_chart', t: 'Hanya datanya yang disimpan', d: 'Yang tersimpan permanen hanyalah baris transaksinya — dan tujuannya Google Sheet milik Anda sendiri (lewat Apps Script Anda), bukan server kami.' },
  { icon: 'visibility_off', t: 'Nol ke pengembang', d: 'Kami tidak punya server yang menampung data (hosting statis). Tidak ada satu byte pun data impor yang mengalir ke pengembang aplikasi.' },
  { icon: 'delete_sweep', t: 'File mentah langsung hilang', d: 'Begitu modal ditutup atau halaman di-refresh, isi file lenyap dari memori — tidak disimpan di browser, tidak di Drive sebagai file.' },
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
  {
    q: 'Kalau saya impor file CSV/Excel, file itu disimpan di mana? Apakah aman?',
    a: 'Aman. File-nya dibaca 100% di browser Anda untuk diurai, lalu dibuang — tidak diunggah ke mana pun (tidak ke Google Drive sebagai file, tidak ke server kami). Yang tersimpan permanen hanyalah baris transaksinya, dan tujuannya Google Sheet milik Anda sendiri. Pengembang tidak menerima data apa pun. Lihat tab "Impor" untuk rinciannya.',
  },
  {
    q: 'E-statement bank saya formatnya beda dari template. Gimana caranya?',
    a: 'Dua opsi: (1) pakai Impor Cerdas — pilih preset bank Anda, kolom terdeteksi otomatis; atau (2) minta AI (ChatGPT/Gemini) mengubah e-statement ke format template DompetKu. Buka tab "Impor" di Panduan ini — ada prompt siap-salin yang sudah otomatis memuat daftar kategori & akun Anda, jadi hasil AI langsung cocok. Lalu tinggal impor hasilnya.',
  },
];

const FinanceGuideTransaksiSection: React.FC<SectionProps> = ({ onNavigate }) => {
  const [active, setActive] = useState<TransaksiSection>('overview');
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [copied, setCopied] = useState(false);

  // Prompt AI dibangun dengan kategori & akun ASLI milik user → hasil ChatGPT/Gemini langsung pas.
  const budgetCategories = useFinanceStore((s) => s.budgetCategories);
  const accounts = useFinanceStore((s) => s.accounts);
  const aiPrompt = useMemo(() => {
    const cats = budgetCategories.map((c) => c.name).filter(Boolean);
    const catLine = (cats.length ? cats : ['Makanan & Minuman', 'Transportasi & Bensin', 'Tagihan Listrik & Air', 'Belanja', 'Gaji', 'Lainnya']).join(', ');
    const accName = accounts[0]?.name || 'Nama Akun Anda';
    return `Saya punya mutasi rekening (e-statement) dari bank. Ubah menjadi tabel CSV dengan KOLOM PERSIS berikut, siap diimpor ke aplikasi keuangan DompetKu:

Tanggal,Deskripsi,Jumlah,Tipe,Kategori,Akun

Aturan pengisian:
- Tanggal: format YYYY-MM-DD (contoh 2026-05-01).
- Deskripsi: keterangan / nama merchant transaksi.
- Jumlah: angka positif saja, tanpa titik/koma ribuan dan tanpa "Rp" (contoh 150000).
- Tipe: "Pemasukan" untuk uang masuk (kredit), "Pengeluaran" untuk uang keluar (debit).
- Kategori: pilih SATU yang paling cocok dari daftar ini — ${catLine}. Kalau ragu, isi "Lainnya".
- Akun: isi "${accName}" untuk semua baris.

Keluarkan HANYA tabel CSV (baris pertama = judul kolom), tanpa penjelasan lain.

Berikut data mutasinya:
[TEMPEL ISI E-STATEMENT / LAMPIRKAN FILE-nya DI SINI]`;
  }, [budgetCategories, accounts]);

  const copyPrompt = async () => {
    try { await navigator.clipboard.writeText(aiPrompt); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* clipboard diblokir */ }
  };

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

      {/* ============ IMPOR ============ */}
      {active === 'impor' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <p className="text-sm text-on-surface-variant dark:text-slate-300 leading-relaxed">
            <strong className="text-on-surface dark:text-white">Impor</strong> memasukkan banyak transaksi sekaligus tanpa mengetik satu per satu. Buka lewat tombol <strong className="text-on-surface dark:text-white">Impor</strong> di halaman Transaksi. Ada dua cara:
          </p>

          {/* Two methods */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {IMPORT_METHODS.map(m => (
              <div key={m.title} className="rounded-2xl bg-surface-container-lowest dark:bg-white/5 border border-outline-variant/10 dark:border-white/10 p-5 shadow-sm">
                <div className="w-11 h-11 rounded-xl bg-primary/10 dark:bg-[#a7c8ff]/15 flex items-center justify-center mb-3">
                  <span className="material-symbols-outlined text-primary dark:text-[#a7c8ff]" style={{ fontVariationSettings: "'FILL' 1" }}>{m.icon}</span>
                </div>
                <h4 className="font-bold text-on-surface dark:text-white">{m.title}</h4>
                <p className="text-xs text-on-surface-variant dark:text-slate-400 mt-1.5 leading-relaxed">{m.desc}</p>
              </div>
            ))}
          </div>

          {/* AI hack — ubah e-statement bank apa pun ke format template */}
          <div className="rounded-2xl border border-violet-300/50 dark:border-violet-400/25 bg-violet-50/50 dark:bg-violet-500/5 p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-violet-500/10 dark:bg-violet-400/15 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-violet-600 dark:text-violet-300" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
              </div>
              <div>
                <h4 className="font-bold text-on-surface dark:text-white text-sm">Trik: ubah e-statement bank pakai AI</h4>
                <p className="text-[11px] text-violet-700/80 dark:text-violet-300/80 font-semibold">ChatGPT · Gemini · Claude — biar format bank apa pun jadi pas</p>
              </div>
            </div>
            <p className="text-xs text-on-surface-variant dark:text-slate-300 leading-relaxed mb-4">
              Tiap bank punya format mutasi berbeda. Daripada merapikan manual, minta AI mengubah e-statement Anda ke format template DompetKu. Cukup 5 langkah:
            </p>

            <div className="space-y-2.5 mb-4">
              {[
                'Unduh e-statement dari m-banking Anda (Excel/CSV, atau PDF).',
                'Buka ChatGPT / Gemini. Lampirkan file-nya, atau salin-tempel isinya.',
                'Klik "Salin prompt" di bawah, tempel ke AI, lalu kirim.',
                'AI keluarkan tabel sesuai kolom DompetKu → salin ke Excel/Sheets, atau minta AI unduhkan sebagai CSV.',
                'Impor file itu ke DompetKu. Tipe/Kategori/Akun sudah terisi otomatis.',
              ].map((s, i) => (
                <div key={i} className="flex gap-2.5 items-start">
                  <span className="w-5 h-5 rounded-full bg-violet-500 dark:bg-violet-400 text-white dark:text-violet-950 flex items-center justify-center text-[10px] font-extrabold shrink-0 mt-0.5">{i + 1}</span>
                  <p className="text-xs text-on-surface dark:text-slate-200 leading-relaxed">{s}</p>
                </div>
              ))}
            </div>

            {/* Prompt siap pakai */}
            <div className="rounded-xl bg-[#0f172a] dark:bg-black/40 border border-white/10 overflow-hidden">
              <div className="flex items-center justify-between px-3.5 py-2 border-b border-white/10">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1.5"><span className="material-symbols-outlined text-[13px]">terminal</span>Prompt siap pakai</span>
                <button onClick={copyPrompt} className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors ${copied ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/10 text-white hover:bg-white/20'}`}>
                  <span className="material-symbols-outlined text-[14px]">{copied ? 'check' : 'content_copy'}</span>{copied ? 'Tersalin!' : 'Salin prompt'}
                </button>
              </div>
              <pre className="px-3.5 py-3 text-[10.5px] leading-relaxed text-slate-300 whitespace-pre-wrap font-mono max-h-52 overflow-y-auto custom-scrollbar">{aiPrompt}</pre>
            </div>
            <p className="text-[10.5px] text-on-surface-variant/70 dark:text-slate-500 mt-2 flex items-start gap-1.5">
              <span className="material-symbols-outlined text-[13px] text-violet-500 dark:text-violet-400 shrink-0 mt-px">bolt</span>
              <span>Prompt ini sudah otomatis berisi daftar <strong className="text-on-surface-variant dark:text-slate-400">kategori</strong> &amp; <strong className="text-on-surface-variant dark:text-slate-400">akun</strong> milik Anda — hasil AI langsung cocok, minim rapikan ulang.</span>
            </p>

            {/* Catatan privasi */}
            <div className="mt-3 rounded-xl border border-amber-300/50 dark:border-amber-400/25 bg-amber-50/60 dark:bg-amber-500/10 p-3 flex gap-2.5">
              <span className="material-symbols-outlined text-amber-600 dark:text-amber-400 text-lg shrink-0">privacy_tip</span>
              <p className="text-[11px] text-on-surface-variant dark:text-slate-300 leading-relaxed">
                <strong className="text-on-surface dark:text-white">Catatan privasi:</strong> cara ini mengirim data mutasi Anda ke layanan AI pihak ketiga (OpenAI/Google) — di luar DompetKu. Bila ada info sangat sensitif (mis. nomor rekening penuh), sensor dulu sebelum menempel. Ini pilihan Anda; DompetKu sendiri tetap tak menyimpan apa pun ke pengembang.
              </p>
            </div>
          </div>

          {/* Steps */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant dark:text-outline mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-base text-primary dark:text-[#a7c8ff]">list_alt</span>
              Langkah mengimpor
            </h4>
            <div className="relative border-l border-outline-variant/30 dark:border-white/10 pl-6 ml-3 space-y-5">
              {[
                'Di halaman Transaksi, klik tombol Impor.',
                'Pilih cara: unggah file mutasi bank, atau unduh Template dulu lalu isi.',
                'Unggah file CSV/Excel Anda (atau tempel tabel dari statement PDF).',
                'Cocokkan kolom (Tanggal, Nominal, dll.) — preset bank & profil tersimpan mempercepat ini.',
                'Periksa pratinjau, lalu klik Impor. Transaksi masuk ke Log & tersimpan ke Google Sheet Anda.',
              ].map((step, i) => (
                <div key={i} className="relative">
                  <span className="absolute -left-[37px] top-0 w-6 h-6 rounded-full bg-primary dark:bg-[#a7c8ff] text-white dark:text-[#001b3c] flex items-center justify-center text-[11px] font-extrabold shadow-sm">{i + 1}</span>
                  <p className="text-sm text-on-surface dark:text-slate-200 leading-relaxed font-medium">{step}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Privacy / data-flow — the key reassurance */}
          <div className="rounded-2xl border border-emerald-200/60 dark:border-emerald-500/20 bg-emerald-50/60 dark:bg-emerald-900/10 p-5">
            <div className="flex items-center gap-3 mb-2">
              <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400" style={{ fontVariationSettings: "'FILL' 1" }}>shield_lock</span>
              <h4 className="font-bold text-on-surface dark:text-white text-sm">Ke mana file yang Anda unggah pergi?</h4>
            </div>
            <p className="text-xs text-on-surface-variant dark:text-slate-300 leading-relaxed mb-4 sm:pl-9">
              Singkatnya: <strong className="text-on-surface dark:text-white">file-nya tidak disimpan di mana pun</strong> — tidak di browser secara permanen, tidak di Google Drive sebagai file, dan tidak ke pengembang. Hanya <strong className="text-on-surface dark:text-white">data transaksinya</strong> yang mendarat, dan rumahnya adalah Google Sheet milik Anda sendiri.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {IMPORT_PRIVACY.map(x => (
                <div key={x.t} className="rounded-xl bg-white/70 dark:bg-white/[0.03] border border-outline-variant/10 dark:border-white/5 p-3.5 flex gap-3">
                  <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400 text-lg shrink-0">{x.icon}</span>
                  <div>
                    <p className="text-xs font-bold text-on-surface dark:text-white">{x.t}</p>
                    <p className="text-[11px] text-on-surface-variant dark:text-slate-400 mt-0.5 leading-relaxed">{x.d}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex gap-2.5 items-start">
              <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400 text-base shrink-0 mt-0.5">info</span>
              <p className="text-[11px] text-on-surface-variant dark:text-slate-400 leading-relaxed">
                <strong className="text-on-surface dark:text-white">"Simpan profil"</strong> hanya menyimpan <em>pemetaan kolom</em> (mis. "kolom 1 = Tanggal") sebagai catatan kecil di Sheet Anda — bukan isi file, bukan datanya.
              </p>
            </div>
          </div>

          {/* Data-flow chips */}
          <div className="rounded-2xl bg-surface-container-lowest dark:bg-white/5 border border-outline-variant/10 dark:border-white/10 p-5">
            <h4 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant dark:text-outline mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-base text-primary dark:text-[#a7c8ff]">route</span>
              Alur data impor
            </h4>
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold">
              {['File CSV/Excel', 'Dibaca di browser (RAM)', 'Data transaksi', 'Google Sheet Anda'].map((node, i, arr) => (
                <React.Fragment key={node}>
                  <span className="px-3 py-1.5 rounded-lg bg-surface-container dark:bg-white/10 text-on-surface dark:text-white">{node}</span>
                  {i < arr.length - 1 && <span className="material-symbols-outlined text-on-surface-variant dark:text-outline text-base">arrow_forward</span>}
                </React.Fragment>
              ))}
            </div>
            <p className="text-[11px] text-on-surface-variant dark:text-slate-400 mt-3 leading-relaxed">
              Tidak ada langkah yang menyentuh server pengembang. Konsisten dengan prinsip DompetKu: semua data hidup di Google milik Anda sendiri (<em>zero-knowledge</em>).
            </p>
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
