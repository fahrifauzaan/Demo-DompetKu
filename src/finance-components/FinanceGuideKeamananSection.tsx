import React from 'react';

interface SectionProps {
  onNavigate: (tab: string) => void;
}

// Empat lapisan keamanan yang tersedia di Pengaturan › Keamanan.
const FEATURES = [
  { icon: 'pin', tone: 'text-[#007aff] dark:text-[#0a84ff]', bg: 'bg-[#007aff]/10 dark:bg-[#0a84ff]/15', title: 'PIN Transaksi', desc: 'Mengunci aplikasi saat menganggur (idle) dan meminta 6 digit PIN sebelum melanjutkan.' },
  { icon: 'phonelink_lock', tone: 'text-[#28cd41] dark:text-[#30d158]', bg: 'bg-[#28cd41]/10 dark:bg-[#30d158]/15', title: 'Autentikasi Dua Faktor (2FA)', desc: 'Lapisan tambahan lewat aplikasi authenticator (Google Authenticator, Authy, dll.).' },
  { icon: 'lock_reset', tone: 'text-[#ff9500] dark:text-[#ff9f0a]', bg: 'bg-[#ff9500]/10 dark:bg-[#ff9f0a]/15', title: 'Ubah Password', desc: 'Ganti kata sandi akun kapan pun dari Pengaturan › Keamanan.' },
  { icon: 'devices', tone: 'text-[#af52de] dark:text-[#bf5af2]', bg: 'bg-[#af52de]/10 dark:bg-[#bf5af2]/15', title: 'Sesi Aktif', desc: 'Lihat perangkat & lokasi yang sedang masuk ke akun Anda.' },
];

// Fakta penting soal cara PIN disimpan — inti dari topik ini.
const PIN_FACTS = [
  { icon: 'smartphone', t: 'Disimpan di perangkat ini', d: 'PIN tersimpan lokal di browser/perangkat yang Anda pakai (penyimpanan browser) — bukan di Google Sheet.' },
  { icon: 'push_pin', t: 'Set sekali, menempel', d: 'Cukup buat PIN satu kali di perangkat ini. Ia bertahan walau aplikasi diamkan/idle atau ditutup — tak perlu buat ulang tiap sesi.' },
  { icon: 'devices_other', t: 'Beda perangkat, PIN sendiri', d: 'Tiap browser/perangkat punya PIN-nya masing-masing. Buka DompetKu di HP atau browser lain → set PIN baru di sana.' },
  { icon: 'cleaning_services', t: 'Hapus data situs = PIN hilang', d: 'Kalau Anda menghapus data/website di browser ini, PIN ikut terhapus dan perlu diset lagi.' },
];

const FinanceGuideKeamananSection: React.FC<SectionProps> = ({ onNavigate }) => {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <p className="text-sm text-on-surface-variant dark:text-slate-300 leading-relaxed">
        <strong className="text-on-surface dark:text-white">Keamanan</strong> DompetKu berlapis: <strong className="text-on-surface dark:text-white">kunci akses</strong> (PIN &amp; 2FA) untuk melindungi aplikasi di perangkat Anda, plus <strong className="text-on-surface dark:text-white">model data privat</strong> — semua data hidup di Google Sheet milik Anda sendiri, nol ke pengembang. Atur semuanya di <strong className="text-on-surface dark:text-white">Pengaturan › Keamanan</strong>.
      </p>

      {/* Fitur keamanan */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {FEATURES.map(f => (
          <div key={f.title} className="rounded-2xl bg-surface-container-lowest dark:bg-white/5 border border-outline-variant/10 dark:border-white/10 p-5 shadow-sm">
            <div className={`w-11 h-11 rounded-xl ${f.bg} flex items-center justify-center mb-3`}>
              <span className={`material-symbols-outlined ${f.tone}`} style={{ fontVariationSettings: "'FILL' 1" }}>{f.icon}</span>
            </div>
            <h4 className="font-bold text-on-surface dark:text-white text-sm">{f.title}</h4>
            <p className="text-xs text-on-surface-variant dark:text-slate-400 mt-1.5 leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </div>

      {/* PIN per-browser — sorotan utama */}
      <div className="rounded-2xl border border-emerald-200/60 dark:border-emerald-500/20 bg-emerald-50/60 dark:bg-emerald-900/10 p-5">
        <div className="flex items-center gap-3 mb-2">
          <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400" style={{ fontVariationSettings: "'FILL' 1" }}>key</span>
          <h4 className="font-bold text-on-surface dark:text-white text-sm">PIN Transaksi tersimpan per-browser</h4>
        </div>
        <p className="text-xs text-on-surface-variant dark:text-slate-300 leading-relaxed mb-4 sm:pl-9">
          PIN Anda disimpan <strong className="text-on-surface dark:text-white">lokal di perangkat ini</strong> — tidak disinkronkan ke Google Sheet maupun perangkat lain. Jadi setelah diset satu kali, PIN <strong className="text-on-surface dark:text-white">menempel permanen</strong> di browser ini; aplikasi tak akan meminta Anda membuat PIN baru tiap sesi.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {PIN_FACTS.map(x => (
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
          <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400 text-base shrink-0 mt-0.5">lightbulb</span>
          <p className="text-[11px] text-on-surface-variant dark:text-slate-400 leading-relaxed">
            <strong className="text-on-surface dark:text-white">Kenapa lokal?</strong> Agar PIN tak pernah keluar dari perangkat Anda (lebih privat) dan tak bergantung pada koneksi/sinkronisasi. Ini kunci layar aplikasi di perangkat — untuk keamanan akun secara menyeluruh, aktifkan juga <strong className="text-on-surface dark:text-white">2FA</strong>.
          </p>
        </div>
      </div>

      {/* Model data / zero-knowledge */}
      <div className="rounded-2xl border border-blue-200/60 dark:border-[#a7c8ff]/20 bg-blue-50/60 dark:bg-[#a7c8ff]/5 p-5">
        <div className="flex items-center gap-3 mb-3">
          <span className="material-symbols-outlined text-blue-600 dark:text-[#a7c8ff]" style={{ fontVariationSettings: "'FILL' 1" }}>encrypted</span>
          <h4 className="font-bold text-on-surface dark:text-white text-sm">Data Anda, milik Anda (zero-knowledge)</h4>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { icon: 'table_view', t: 'Di Google Sheet Anda', d: 'Semua transaksi & aset tersimpan di spreadsheet milik Anda sendiri di Google Drive.' },
            { icon: 'visibility_off', t: 'Nol ke pengembang', d: 'Aplikasi ini statis, tanpa server penampung data. Tak ada data Anda yang mengalir ke pengembang.' },
            { icon: 'sync_lock', t: 'Sinkron langsung', d: 'App bertukar data langsung dengan Google (via akun Anda), bukan melalui perantara.' },
          ].map(x => (
            <div key={x.t} className="rounded-xl bg-white/70 dark:bg-white/[0.03] border border-outline-variant/10 dark:border-white/5 p-3.5">
              <span className="material-symbols-outlined text-blue-600 dark:text-[#a7c8ff] text-lg mb-1.5 block">{x.icon}</span>
              <p className="text-xs font-bold text-on-surface dark:text-white">{x.t}</p>
              <p className="text-[11px] text-on-surface-variant dark:text-slate-400 mt-0.5 leading-relaxed">{x.d}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tips */}
      <div>
        <h4 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant dark:text-outline mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-base text-primary dark:text-[#a7c8ff]">verified_user</span>
          Tips menjaga keamanan
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { icon: 'toggle_on', t: 'Aktifkan PIN & 2FA', d: 'Dua lapis lebih baik dari satu — nyalakan keduanya di Pengaturan › Keamanan.' },
            { icon: 'no_accounts', t: 'Jangan bagikan PIN', d: 'PIN adalah kunci layar aplikasi Anda. Simpan sendiri, jangan diberitahukan ke siapa pun.' },
            { icon: 'logout', t: 'Perangkat bersama? Keluar akun', d: 'Selesai memakai DompetKu di komputer bersama/publik, klik Keluar Akun.' },
            { icon: 'backup', t: 'Data aman ada backup', d: 'Karena data hidup di Google Sheet Anda, ia tetap ada meski perangkat berganti — tinggal login lagi.' },
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
      </div>

      {/* Footer CTA */}
      <div className="mt-2 rounded-3xl bg-surface-container-low dark:bg-white/5 border border-outline-variant/10 dark:border-white/10 p-5 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 text-center sm:text-left">
          <span className="material-symbols-outlined text-primary dark:text-[#a7c8ff] text-2xl hidden sm:block">shield_lock</span>
          <div>
            <p className="text-sm font-bold text-on-surface dark:text-white">Atur keamanan akun Anda</p>
            <p className="text-xs text-on-surface-variant dark:text-slate-400 mt-0.5">Set PIN, aktifkan 2FA, dan cek sesi aktif.</p>
          </div>
        </div>
        <button
          onClick={() => onNavigate('settings')}
          className="w-full sm:w-auto px-6 py-3 bg-primary dark:bg-[#a7c8ff] text-white dark:text-[#001b3c] font-bold text-sm rounded-2xl shadow-md hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-2 shrink-0"
        >
          <span className="material-symbols-outlined text-lg">settings</span>
          Buka Pengaturan
        </button>
      </div>
    </div>
  );
};

export default FinanceGuideKeamananSection;
