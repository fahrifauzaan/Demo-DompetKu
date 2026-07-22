import React, { useState } from 'react';
import FinanceGuidePrinciple from './FinanceGuidePrinciple';

interface SectionProps {
  onNavigate: (tab: string) => void;
}

type ProteksiSection = 'overview' | 'types' | 'up' | 'faq';

const SECTIONS: { key: ProteksiSection; label: string; icon: string }[] = [
  { key: 'overview', label: 'Ringkasan', icon: 'shield' },
  { key: 'types', label: 'Jenis Asuransi', icon: 'category' },
  { key: 'up', label: 'Uang Pertanggungan', icon: 'calculate' },
  { key: 'faq', label: 'Tips & FAQ', icon: 'help' },
];

const TYPES = [
  { icon: 'health_and_safety', tone: 'text-rose-600 dark:text-rose-400', label: 'Jiwa', desc: 'Menggantikan penghasilan pencari nafkah bila ia meninggal/tidak mampu bekerja. UP = Uang Pertanggungan yang diterima ahli waris.' },
  { icon: 'medical_services', tone: 'text-blue-600 dark:text-[#a7c8ff]', label: 'Kesehatan', desc: 'Menanggung biaya rawat inap/jalan & tindakan medis. Untuk kesehatan, UP bisa 0 — catat limit/kelas kamar di keterangan.' },
  { icon: 'directions_car', tone: 'text-amber-600 dark:text-amber-400', label: 'Kendaraan', desc: 'Melindungi mobil/motor dari kerusakan, kehilangan (all risk / TLO). Jangan lupa tanggal renewal agar tak lapse.' },
  { icon: 'home', tone: 'text-emerald-600 dark:text-emerald-400', label: 'Properti', desc: 'Melindungi rumah/bangunan dari kebakaran, bencana, dsb. Sering disyaratkan pada KPR.' },
];

const FIELDS = [
  { label: 'Nama & Jenis', desc: 'Nama polis (mis. "Prudential PRUlink") dan jenis: Jiwa, Kesehatan, Kendaraan, Properti, atau Lainnya.' },
  { label: 'Provider & No. Polis', desc: 'Perusahaan asuransi dan nomor polis. Nomor polis disimpan dan ditampilkan tersamar (•••1234) demi keamanan.' },
  { label: 'Premi & Frekuensi', desc: 'Besar premi dan apakah dibayar Bulanan atau Tahunan. DompetKu mengonversi ke premi per bulan untuk ringkasan.' },
  { label: 'UP / Pertanggungan', desc: 'Uang Pertanggungan — nilai yang dibayarkan saat klaim. Untuk asuransi jiwa, inilah angka terpenting.' },
  { label: 'Renewal', desc: 'Tanggal perpanjangan. Bila < 30 hari, muncul badge peringatan; renewal juga masuk otomatis ke Kalender Keuangan.' },
];

const FAQS = [
  { q: 'Kenapa proteksi harus sebelum investasi?', a: 'Piramida perencanaan keuangan menempatkan proteksi di dasar: satu musibah besar (meninggalnya pencari nafkah, sakit kritis) bisa menghapus seluruh aset & investasi yang dikumpulkan bertahun-tahun. Asuransi mengalihkan risiko besar itu dengan biaya kecil, sehingga rencana keuangan Anda tak runtuh oleh satu kejadian.' },
  { q: 'Berapa idealnya rasio premi terhadap penghasilan?', a: 'Umumnya total premi tahunan sebaiknya ≤ 10% dari penghasilan tahunan. Cukup untuk proteksi memadai tanpa membebani arus kas. DompetKu menghitung rasio ini otomatis di ringkasan Proteksi.' },
  { q: 'Bagaimana menghitung Uang Pertanggungan jiwa yang cukup?', a: 'Ada dua metode umum. (1) Income Replacement: UP ≈ 8–12× penghasilan tahunan. (2) Expense + Utang: UP ≈ pengeluaran tahunan × jumlah tahun proteksi + total utang − aset likuid. Gunakan Kalkulator UP di app — ia menampilkan keduanya + kesenjangan proteksi Anda.' },
  { q: 'Asuransi jiwa untuk siapa?', a: 'Terutama untuk pencari nafkah yang menjadi tumpuan finansial keluarga. Bila tidak ada yang bergantung pada penghasilan Anda, kebutuhan asuransi jiwa biasanya kecil — fokuskan ke kesehatan.' },
  { q: 'Unit link atau term life?', a: 'Term life (asuransi jiwa berjangka) memberi UP besar dengan premi jauh lebih murah, tanpa unsur investasi. Unit link menggabungkan proteksi + investasi tapi biayanya lebih tinggi & imbal hasilnya sering kurang optimal. Prinsip umum: "beli proteksi, investasi terpisah". DompetKu hanya mencatat polis Anda, bukan merekomendasikan produk tertentu.' },
  { q: 'Bagaimana agar polis tak lapse (batal)?', a: 'Isi tanggal renewal setiap polis. DompetKu menampilkan badge "Renewal < 30 hari" dan memasukkannya ke Kalender Keuangan agar Anda ingat membayar premi tepat waktu.' },
];

const FinanceGuideProteksiSection: React.FC<SectionProps> = ({ onNavigate }) => {
  const [active, setActive] = useState<ProteksiSection>('overview');
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
            <strong className="text-on-surface dark:text-white">Proteksi</strong> adalah fondasi perencanaan keuangan — melindungi penghasilan & aset Anda dari risiko besar sebelum mengejar imbal hasil. Di menu <strong className="text-on-surface dark:text-white">Aset</strong> (bagian bawah), catat semua polis Anda, pantau premi & renewal, dan hitung kebutuhan Uang Pertanggungan.
          </p>
          <div className="rounded-2xl border border-blue-200/60 dark:border-[#a7c8ff]/20 bg-blue-50/60 dark:bg-[#a7c8ff]/5 p-5 sm:p-6">
            <div className="flex items-center gap-3 mb-3"><span className="material-symbols-outlined text-blue-600 dark:text-[#a7c8ff]" style={{ fontVariationSettings: "'FILL' 1" }}>stairs</span><h4 className="font-bold text-on-surface dark:text-white text-sm sm:text-base">Piramida Perencanaan Keuangan</h4></div>
            <p className="text-[11px] sm:text-xs text-on-surface-variant dark:text-slate-300 leading-relaxed">Urutannya: <strong className="text-on-surface dark:text-white">Arus Kas → Proteksi → Dana Darurat → Tujuan → Investasi → Pajak</strong>. Proteksi ada di bawah karena melindungi semua yang di atasnya. Tanpa proteksi, satu kejadian tak terduga bisa merobohkan seluruh rencana.</p>
          </div>
          <FinanceGuidePrinciple
            heading="Prinsip Proteksi (CFP®)"
            points={[
              { icon: 'shield', title: 'Proteksi Sebelum Investasi', text: 'Amankan dari risiko besar (meninggal, sakit kritis) sebelum mengejar imbal hasil — fondasi piramida CFP®.' },
              { icon: 'percent', title: 'Rasio Premi Wajar', text: 'Total premi tahunan umumnya ideal ≤ 10% penghasilan — cukup melindungi tanpa membebani arus kas.' },
              { icon: 'diversity_3', title: 'UP yang Cukup', text: 'UP jiwa idealnya menutup kebutuhan keluarga bila pencari nafkah tiada — hitung dengan Kalkulator UP.' },
              { icon: 'event_repeat', title: 'Jaga Polis Tetap Aktif', text: 'Pantau renewal agar tak lapse — perlindungan hanya berlaku selama polis aktif.' },
            ]}
          />
        </div>
      )}

      {active === 'types' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant dark:text-outline mb-4 flex items-center gap-2"><span className="material-symbols-outlined text-base text-primary dark:text-[#a7c8ff]">category</span>4 jenis utama</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {TYPES.map(m => (
                <div key={m.label} className="flex gap-3 items-start rounded-2xl bg-surface-container-lowest dark:bg-white/5 border border-outline-variant/10 dark:border-white/10 p-4">
                  <div className="w-10 h-10 rounded-xl bg-surface-container dark:bg-white/10 flex items-center justify-center shrink-0"><span className={`material-symbols-outlined ${m.tone}`} style={{ fontVariationSettings: "'FILL' 1" }}>{m.icon}</span></div>
                  <div><p className="text-sm font-bold text-on-surface dark:text-white">{m.label}</p><p className="text-[11px] text-on-surface-variant dark:text-slate-400 mt-0.5 leading-relaxed">{m.desc}</p></div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant dark:text-outline mb-4 flex items-center gap-2"><span className="material-symbols-outlined text-base text-primary dark:text-[#a7c8ff]">list_alt</span>Kolom saat mencatat polis</h4>
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

      {active === 'up' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="rounded-2xl bg-surface-container-lowest dark:bg-white/5 border border-outline-variant/10 dark:border-white/10 p-5 sm:p-6">
            <h4 className="font-bold text-on-surface dark:text-white flex items-center gap-2"><span className="material-symbols-outlined text-primary dark:text-[#a7c8ff]" style={{ fontVariationSettings: "'FILL' 1" }}>calculate</span>Kalkulator Kebutuhan UP Jiwa</h4>
            <p className="text-sm text-on-surface-variant dark:text-slate-300 mt-2 leading-relaxed">Di seksi Proteksi, klik <strong className="text-on-surface dark:text-white">Hitung UP</strong>. App otomatis mengambil penghasilan & pengeluaran dari transaksi Anda, lalu menampilkan dua metode berdampingan + membandingkannya dengan total UP jiwa polis aktif Anda (kesenjangan proteksi).</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-2xl bg-blue-50/50 dark:bg-[#a7c8ff]/5 border border-blue-200/50 dark:border-[#a7c8ff]/15 p-5">
              <span className="material-symbols-outlined text-blue-600 dark:text-[#a7c8ff] mb-2 block">payments</span>
              <p className="text-sm font-bold text-on-surface dark:text-white">Metode 1 — Income Replacement</p>
              <p className="text-[11px] text-on-surface-variant dark:text-slate-400 mt-1 leading-relaxed">UP ≈ penghasilan tahunan × 8–12. Sederhana & cepat: mengganti penghasilan keluarga selama sekian tahun ke depan.</p>
            </div>
            <div className="rounded-2xl bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-200/50 dark:border-emerald-500/15 p-5">
              <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400 mb-2 block">receipt_long</span>
              <p className="text-sm font-bold text-on-surface dark:text-white">Metode 2 — Expense + Utang</p>
              <p className="text-[11px] text-on-surface-variant dark:text-slate-400 mt-1 leading-relaxed">UP ≈ pengeluaran tahunan × tahun proteksi + total utang − aset likuid. Lebih presisi karena berbasis kebutuhan riil keluarga.</p>
            </div>
          </div>
          <div className="flex items-start gap-2 rounded-2xl bg-surface-container-low dark:bg-white/[0.03] border border-outline-variant/10 dark:border-white/5 p-3.5">
            <span className="material-symbols-outlined text-[16px] text-on-surface-variant dark:text-slate-400 mt-px shrink-0">info</span>
            <p className="text-[11px] text-on-surface-variant dark:text-slate-400 leading-relaxed">Kalkulator ini <strong className="text-on-surface dark:text-white">edukasi umum</strong> (rule of thumb), bukan rekomendasi produk atau merek asuransi. Kebutuhan riil bergantung kondisi keluarga, inflasi, dan aset lain.</p>
          </div>
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
          <span className="material-symbols-outlined text-primary dark:text-[#a7c8ff] text-2xl hidden sm:block">shield</span>
          <div><p className="text-sm font-bold text-on-surface dark:text-white">Sudah lengkap proteksinya?</p><p className="text-xs text-on-surface-variant dark:text-slate-400 mt-0.5">Catat polis Anda dan hitung kebutuhan Uang Pertanggungan.</p></div>
        </div>
        <button onClick={() => onNavigate('assets')} className="w-full sm:w-auto px-6 py-3 bg-primary dark:bg-[#a7c8ff] text-white dark:text-[#001b3c] font-bold text-sm rounded-2xl shadow-md hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-2 shrink-0">
          <span className="material-symbols-outlined text-lg">shield</span>Buka Proteksi
        </button>
      </div>
    </div>
  );
};

export default FinanceGuideProteksiSection;
