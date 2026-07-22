import React, { useState } from 'react';
import FinanceGuidePrinciple from './FinanceGuidePrinciple';

interface SectionProps {
  onNavigate: (tab: string) => void;
}

type TujuanSection = 'overview' | 'input' | 'strategy' | 'faq';

const SECTIONS: { key: TujuanSection; label: string; icon: string }[] = [
  { key: 'overview', label: 'Ringkasan', icon: 'flag' },
  { key: 'input', label: 'Cara Membuat', icon: 'add_task' },
  { key: 'strategy', label: 'Setoran & Sinking Fund', icon: 'savings' },
  { key: 'faq', label: 'Tips & FAQ', icon: 'help' },
];

const CONCEPTS = [
  { icon: 'target', tone: 'text-blue-600 dark:text-[#a7c8ff]', label: 'Target & Tenggat', desc: 'Setiap tujuan punya nominal (mis. Rp 500 jt) dan tanggal target. Dari sini DompetKu menghitung setoran bulanan idealnya.' },
  { icon: 'calculate', tone: 'text-emerald-600 dark:text-emerald-400', label: 'Setoran Ideal (PMT)', desc: 'Rumus anuitas menghitung "butuh Rp X/bln" agar target tercapai tepat waktu — memperhitungkan dana awal & asumsi imbal hasil.' },
  { icon: 'trending_up', tone: 'text-violet-600 dark:text-violet-400', label: 'On / Off Track', desc: 'Membandingkan proyeksi setoran Anda dengan target. Badge hijau "On Track" bila cukup, kuning "Off Track" bila kurang.' },
  { icon: 'sync', tone: 'text-amber-600 dark:text-amber-400', label: 'Sinking Fund', desc: 'Untuk pengeluaran siklus (THR, pajak kendaraan, qurban): sisihkan tiap bulan agar tak mengganggu arus kas saat jatuh tempo.' },
];

const PRESETS = [
  { icon: 'home', label: 'DP Rumah', kind: 'Jangka menengah' },
  { icon: 'school', label: 'Dana Pendidikan', kind: 'Jangka panjang' },
  { icon: 'favorite', label: 'Dana Menikah', kind: 'Jangka menengah' },
  { icon: 'elderly', label: 'Pensiun / FIRE', kind: 'Jangka panjang' },
  { icon: 'health_and_safety', label: 'Dana Darurat', kind: 'Prioritas #1' },
  { icon: 'redeem', label: 'THR / Qurban', kind: 'Sinking fund' },
];

const FIELDS = [
  { label: 'Nama & Tipe Tujuan', desc: 'Nama tujuan (mis. "DP Rumah") dan tipe: Tujuan Investasi (jangka menengah/panjang) atau Sinking Fund (tabungan siklus pendek).' },
  { label: 'Target & Tanggal Target', desc: 'Nominal yang ingin dicapai dan kapan. Keduanya wajib — dipakai menghitung setoran ideal.' },
  { label: 'Sudah Terkumpul', desc: 'Dana yang sudah Anda punya untuk tujuan ini saat dibuat. Bisa diperbarui berkala lewat tombol "Update dana terkumpul".' },
  { label: 'Asumsi Return Tahunan', desc: 'Perkiraan imbal hasil instrumen tempat dana ditaruh: Konservatif 4%, Moderat 8%, Agresif 12% (bisa diubah). Sinking fund = 0%.' },
  { label: 'Setoran / Bulan', desc: 'Komitmen setoran Anda. Bandingkan dengan "setoran ideal" yang dihitung app untuk tahu apakah on-track.' },
];

const FAQS = [
  { q: 'Apa beda "Tujuan Investasi" dan "Sinking Fund"?', a: 'Tujuan Investasi untuk target jangka menengah-panjang yang dananya ditumbuhkan (ada asumsi return), mis. DP rumah atau pensiun. Sinking Fund untuk pengeluaran siklus jangka pendek yang pasti datang (THR, pajak kendaraan, qurban) — dananya cukup disisihkan tanpa asumsi return (0%).' },
  { q: 'Bagaimana "setoran ideal" (PMT) dihitung?', a: 'Memakai rumus anuitas nilai waktu uang: dari selisih target dan dana yang sudah ada (yang ikut bertumbuh sesuai asumsi return), dibagi jumlah bulan hingga target. Contoh: target Rp 120 jt, 24 bulan, tanpa return → Rp 5 jt/bln; dengan return 12% → ± Rp 4,45 jt/bln.' },
  { q: 'Kenapa mengubah "asumsi return" mengubah setoran?', a: 'Karena dana yang diinvestasikan ikut bertumbuh. Makin tinggi asumsi return, makin kecil setoran yang dibutuhkan — tapi ingat, return lebih tinggi = risiko lebih tinggi. Untuk tujuan < 3 tahun, pakai asumsi konservatif.' },
  { q: 'Progres tujuan dihitung dari mana?', a: 'Dari angka "Sudah Terkumpul" yang Anda perbarui manual lewat tombol "Update dana terkumpul" pada kartu tujuan — mirip memperbarui saldo akun. (Penautan otomatis ke akun/aset direncanakan menyusul.)' },
  { q: 'Kartu ringkasan "komitmen vs sisa kas" itu apa?', a: 'Menjumlahkan seluruh setoran bulanan semua tujuan aktif, lalu membandingkannya dengan sisa kas bulanan Anda (rata-rata pendapatan − pengeluaran 3 bulan). Bila komitmen melebihi sisa kas, muncul peringatan agar Anda merevisi target atau menaikkan pendapatan.' },
  { q: 'Tujuan mana yang harus didahulukan?', a: 'Umumnya: (1) Dana Darurat 3–6 bulan pengeluaran sebagai fondasi, (2) lunasi utang mahal, (3) baru tujuan lain (rumah, pendidikan, pensiun). Beri prioritas Tinggi pada yang paling penting.' },
];

const FinanceGuideTujuanSection: React.FC<SectionProps> = ({ onNavigate }) => {
  const [active, setActive] = useState<TujuanSection>('overview');
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <div className="animate-in fade-in duration-300">
      <div className="mb-6">
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar p-1.5 rounded-2xl bg-surface-container-low dark:bg-[#191c1e] border border-outline-variant/10 dark:border-white/10 shadow-sm">
          {SECTIONS.map(s => {
            const isActive = s.key === active;
            return (
              <button key={s.key} onClick={() => setActive(s.key)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all shrink-0 cursor-pointer ${isActive ? 'bg-primary dark:bg-[#a7c8ff] text-white dark:text-[#001b3c] shadow-md shadow-primary/10' : 'text-on-surface-variant dark:text-outline hover:bg-surface-container dark:hover:bg-white/5'}`}>
                <span className="material-symbols-outlined text-base sm:text-lg">{s.icon}</span>{s.label}
              </button>
            );
          })}
        </div>
      </div>

      {active === 'overview' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <p className="text-sm text-on-surface-variant dark:text-slate-300 leading-relaxed">
            <strong className="text-on-surface dark:text-white">Tujuan Keuangan</strong> mengubah DompetKu dari pencatat masa lalu menjadi perencana masa depan. Tetapkan apa yang ingin Anda capai — DP rumah, dana pendidikan, pensiun, hingga THR — dan DompetKu menghitung berapa yang perlu Anda sisihkan tiap bulan agar sampai tepat waktu.
          </p>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant dark:text-outline mb-4 flex items-center gap-2"><span className="material-symbols-outlined text-base text-primary dark:text-[#a7c8ff]">insights</span>4 konsep inti</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {CONCEPTS.map(m => (
                <div key={m.label} className="flex gap-3 items-start rounded-2xl bg-surface-container-lowest dark:bg-white/5 border border-outline-variant/10 dark:border-white/10 p-4">
                  <div className="w-10 h-10 rounded-xl bg-surface-container dark:bg-white/10 flex items-center justify-center shrink-0"><span className={`material-symbols-outlined ${m.tone}`} style={{ fontVariationSettings: "'FILL' 1" }}>{m.icon}</span></div>
                  <div><p className="text-sm font-bold text-on-surface dark:text-white">{m.label}</p><p className="text-[11px] text-on-surface-variant dark:text-slate-400 mt-0.5 leading-relaxed">{m.desc}</p></div>
                </div>
              ))}
            </div>
          </div>
          <FinanceGuidePrinciple
            heading="Prinsip Menetapkan Tujuan"
            points={[
              { icon: 'target', title: 'Tujuan yang SMART', text: 'Spesifik, terukur (ada nominal), ada tenggat — agar bisa dihitung setoran bulanannya, bukan sekadar harapan.' },
              { icon: 'schedule', title: 'Horizon Menentukan Risiko', text: 'Tujuan < 3 tahun sebaiknya di instrumen aman (asumsi return rendah); jangka panjang boleh lebih agresif — prinsip alokasi CFP®.' },
              { icon: 'account_balance', title: 'Dana Darurat Dulu', text: 'Amankan 3–6 bulan pengeluaran sebagai fondasi sebelum mengejar tujuan lain.' },
              { icon: 'savings', title: 'Sinking Fund Anti-Kaget', text: 'Pengeluaran besar yang pasti datang (THR, pajak, qurban) dicicil tiap bulan agar arus kas tetap mulus.' },
            ]}
          />
        </div>
      )}

      {active === 'input' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="rounded-2xl bg-surface-container-lowest dark:bg-white/5 border border-outline-variant/10 dark:border-white/10 p-5 sm:p-6">
            <h4 className="font-bold text-on-surface dark:text-white flex items-center gap-2"><span className="material-symbols-outlined text-primary dark:text-[#a7c8ff]" style={{ fontVariationSettings: "'FILL' 1" }}>add_task</span>Membuat tujuan baru</h4>
            <p className="text-sm text-on-surface-variant dark:text-slate-300 mt-2 leading-relaxed">Buka menu <strong className="text-on-surface dark:text-white">Tujuan</strong>, klik <strong className="text-on-surface dark:text-white">Tambah Tujuan</strong>. Cara tercepat: pilih salah satu <strong className="text-on-surface dark:text-white">template</strong> di atas form — ia mengisi ikon, warna, horizon, dan asumsi return yang masuk akal. Lalu sesuaikan nominal target.</p>
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant dark:text-outline mb-4 flex items-center gap-2"><span className="material-symbols-outlined text-base text-primary dark:text-[#a7c8ff]">bookmarks</span>Template siap pakai</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {PRESETS.map(d => (
                <div key={d.label} className="rounded-2xl bg-surface-container-lowest dark:bg-white/5 border border-outline-variant/10 dark:border-white/10 p-4">
                  <span className="material-symbols-outlined text-primary dark:text-[#a7c8ff] mb-2 block">{d.icon}</span>
                  <p className="text-sm font-bold text-on-surface dark:text-white leading-tight">{d.label}</p>
                  <p className="text-[10px] text-on-surface-variant dark:text-slate-400 mt-1">{d.kind}</p>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant dark:text-outline mb-4 flex items-center gap-2"><span className="material-symbols-outlined text-base text-primary dark:text-[#a7c8ff]">list_alt</span>Memahami kolomnya</h4>
            <div className="space-y-3">
              {FIELDS.map(f => (
                <div key={f.label} className="rounded-2xl bg-surface-container-lowest dark:bg-white/5 border border-outline-variant/10 dark:border-white/10 p-4">
                  <p className="text-sm font-bold text-on-surface dark:text-white">{f.label}</p>
                  <p className="text-[11px] text-on-surface-variant dark:text-slate-400 mt-1 leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {active === 'strategy' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="rounded-2xl border border-emerald-200/60 dark:border-emerald-500/20 bg-emerald-50/60 dark:bg-emerald-900/10 p-5 sm:p-6">
            <div className="flex items-center gap-3 mb-3"><span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400" style={{ fontVariationSettings: "'FILL' 1" }}>calculate</span><h4 className="font-bold text-on-surface dark:text-white text-sm sm:text-base">Setoran Ideal (PMT) — jantung fitur ini</h4></div>
            <p className="text-[11px] sm:text-xs text-on-surface-variant dark:text-slate-300 leading-relaxed">Begitu Anda isi target, tanggal, dana awal, dan asumsi return, DompetKu langsung menghitung <strong className="text-on-surface dark:text-white">"butuh Rp X/bln"</strong>. Isi kolom "Setoran/bln" dengan komitmen Anda; bila ≥ setoran ideal, badge <strong className="text-emerald-700 dark:text-emerald-300">On Track</strong>. Bila kurang, app menampilkan proyeksi akhir & selisihnya.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-2xl bg-amber-50/50 dark:bg-amber-900/10 border border-amber-200/50 dark:border-amber-500/15 p-5">
              <span className="material-symbols-outlined text-amber-600 dark:text-amber-400 mb-2 block">sync</span>
              <p className="text-sm font-bold text-on-surface dark:text-white">Sinking Fund</p>
              <p className="text-[11px] text-on-surface-variant dark:text-slate-400 mt-1 leading-relaxed">Pilih tipe "Sinking Fund" untuk THR, pajak kendaraan, qurban, servis rutin. Return 0%, horizon pendek — DompetKu cukup membagi target dengan jumlah bulan. Ditampilkan di seksi terpisah agar tak tercampur portofolio investasi.</p>
            </div>
            <div className="rounded-2xl bg-blue-50/50 dark:bg-[#a7c8ff]/5 border border-blue-200/50 dark:border-[#a7c8ff]/15 p-5">
              <span className="material-symbols-outlined text-blue-600 dark:text-[#a7c8ff] mb-2 block">account_balance_wallet</span>
              <p className="text-sm font-bold text-on-surface dark:text-white">Jaga Komitmen ≤ Sisa Kas</p>
              <p className="text-[11px] text-on-surface-variant dark:text-slate-400 mt-1 leading-relaxed">Kartu ringkasan menjumlahkan semua setoran bulanan Anda dan membandingkannya dengan sisa kas. Jangan sampai total komitmen melebihi kemampuan — lebih baik target realistis yang konsisten tercapai.</p>
            </div>
          </div>
          <FinanceGuidePrinciple
            heading="Prinsip Menabung Tujuan"
            points={[
              { icon: 'bolt', title: 'Bayar Diri Sendiri Dulu', text: 'Sisihkan setoran tujuan di awal bulan (otomatis bila bisa), bukan dari sisa akhir bulan.' },
              { icon: 'trending_up', title: 'Manfaatkan Bunga Majemuk', text: 'Makin awal dan makin lama, makin ringan setorannya — waktu adalah teman terbaik penabung.' },
            ]}
          />
        </div>
      )}

      {active === 'faq' && (
        <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
          {FAQS.map((f, i) => {
            const isOpen = openFaq === i;
            return (
              <div key={i} className="rounded-2xl bg-surface-container-lowest dark:bg-white/5 border border-outline-variant/10 dark:border-white/10 overflow-hidden">
                <button onClick={() => setOpenFaq(isOpen ? null : i)} className="w-full flex items-center justify-between gap-3 p-4 sm:p-5 text-left cursor-pointer hover:bg-surface-container dark:hover:bg-white/5 transition-colors">
                  <span className="text-sm font-bold text-on-surface dark:text-white flex items-start gap-2.5"><span className="material-symbols-outlined text-base text-primary dark:text-[#a7c8ff] mt-0.5 shrink-0">help</span>{f.q}</span>
                  <span className={`material-symbols-outlined text-on-surface-variant dark:text-outline transition-transform shrink-0 ${isOpen ? 'rotate-180' : ''}`}>expand_more</span>
                </button>
                {isOpen && <div className="px-5 pb-5 pl-12 -mt-1"><p className="text-xs sm:text-sm text-on-surface-variant dark:text-slate-300 leading-relaxed">{f.a}</p></div>}
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-8 rounded-3xl bg-surface-container-low dark:bg-white/5 border border-outline-variant/10 dark:border-white/10 p-5 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 text-center sm:text-left">
          <span className="material-symbols-outlined text-primary dark:text-[#a7c8ff] text-2xl hidden sm:block">flag</span>
          <div><p className="text-sm font-bold text-on-surface dark:text-white">Siap mewujudkan tujuan Anda?</p><p className="text-xs text-on-surface-variant dark:text-slate-400 mt-0.5">Buat tujuan pertama dan lihat setoran bulanan idealnya.</p></div>
        </div>
        <button onClick={() => onNavigate('goals')} className="w-full sm:w-auto px-6 py-3 bg-primary dark:bg-[#a7c8ff] text-white dark:text-[#001b3c] font-bold text-sm rounded-2xl shadow-md hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-2 shrink-0">
          <span className="material-symbols-outlined text-lg">flag</span>Buka Tujuan
        </button>
      </div>
    </div>
  );
};

export default FinanceGuideTujuanSection;
