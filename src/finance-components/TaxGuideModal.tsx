import React, { useState } from 'react';
import { X, Receipt, CheckCircle, Info, ExternalLink } from 'lucide-react';

interface TaxGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: string;
}

interface TaxGuideDetail {
  key: string;
  label: string;
  rate: string;
  rateDesc: string;
  icon: string;
  hartaCode: string;
  hartaLabel: string;
  color: string;
  bgColor: string;
  darkColor: string;
  darkBgColor: string;
  basisRule: string;
  steps: string[];
}

const TAX_GUIDES: TaxGuideDetail[] = [
  {
    key: 'saham',
    label: 'Saham Indonesia',
    rate: 'PPh Final 0.1%',
    rateDesc: 'Dikenakan atas nilai kotor transaksi penjualan saham (dipotong otomatis oleh sekuritas saat Anda menjual saham).',
    icon: 'show_chart',
    hartaCode: '031',
    hartaLabel: 'Saham yang dibeli untuk dijual kembali',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    darkColor: 'text-blue-400',
    darkBgColor: 'bg-blue-900/40',
    basisRule: 'UU No. 36 Tahun 2008 & UU HPP. Dividen saham (PPh Final 10%) bisa BEBAS PAJAK jika diinvestasikan kembali di NKRI dalam jangka waktu 3 tahun.',
    steps: [
      'Laporkan saldo kepemilikan saham Anda per 31 Desember di Lampiran IV (Daftar Harta) menggunakan Kode Harta 031. Nilai yang dimasukkan adalah harga perolehan (cost basis), bukan harga pasar akhir tahun.',
      'Laporkan akumulasi omzet kotor penjualan saham Anda selama setahun beserta total PPh Final (0.1% dari omzet) di Lampiran III Bagian A (PPh Final) nomor 1 (Penjualan Saham di Bursa Efek).',
      'Jika Anda menerima Dividen dan menginvestasikannya kembali ke instrumen keuangan dalam negeri selama minimal 3 tahun, laporkan nilai dividen tersebut di Lampiran III Bagian B (Bukan Objek Pajak) nomor 6 (Penghasilan Lain yang Tidak Termasuk Objek Pajak).',
      'Jika dividen tidak diinvestasikan kembali, laporkan dividen tersebut di Lampiran III Bagian A (PPh Final) nomor 14 (Dividen) dengan PPh Final 10%.'
    ]
  },
  {
    key: 'sbn',
    label: 'SBN / Obligasi',
    rate: 'PPh Final 10%',
    rateDesc: 'Dikenakan atas kupon/bunga obligasi serta keuntungan penjualan obligasi di pasar sekunder (capital gain). Dipotong otomatis oleh bank/sekuritas Agen Penjual.',
    icon: 'assured_workload',
    hartaCode: '032',
    hartaLabel: 'Obligasi Perusahaan / SBN / Sukuk',
    color: 'text-amber-600',
    bgColor: 'bg-amber-50 dark:bg-amber-900/20',
    darkColor: 'text-amber-400',
    darkBgColor: 'bg-amber-900/40',
    basisRule: 'PP No. 91 Tahun 2021. Berlaku untuk seluruh obligasi pemerintah (ORI, SR, SBR, ST) dan obligasi korporasi.',
    steps: [
      'Laporkan nominal kepemilikan SBN/Obligasi Anda per 31 Desember di Lampiran IV (Daftar Harta) dengan Kode Harta 032 berdasarkan nilai pembelian awal (nominal pokok).',
      'Laporkan total pendapatan bunga/kupon kotor yang Anda terima dalam setahun beserta PPh Final (10% dari bunga kotor) di Lampiran III Bagian A (PPh Final) nomor 2 (Bunga Deposito, Tabungan, Diskonto SBI, Bunga Obligasi).'
    ]
  },
  {
    key: 'reksadana',
    label: 'Reksadana',
    rate: 'Bukan Objek Pajak',
    rateDesc: 'Keuntungan dari penjualan unit reksadana (redemption) maupun pembagian hasil reksadana tidak dikenakan pajak tambahan bagi pemegang unit karena pajak portofolionya telah diselesaikan di tingkat Manajer Investasi.',
    icon: 'account_balance',
    hartaCode: '036',
    hartaLabel: 'Reksadana',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
    darkColor: 'text-emerald-400',
    darkBgColor: 'bg-emerald-900/40',
    basisRule: 'UU Pajak Penghasilan Pasal 4 Ayat 3 Huruf i. Reksadana dikecualikan dari objek pajak penghasilan.',
    steps: [
      'Laporkan total nilai perolehan (jumlah uang yang didepositokan/diinvestasikan pada unit aktif) per 31 Desember di Lampiran IV (Daftar Harta) dengan Kode Harta 036.',
      'Laporkan total keuntungan (selisih lebih harga jual dikurangi harga beli) yang diperoleh dari transaksi penjualan (redemption) reksadana Anda selama setahun di Lampiran III Bagian B (Penghasilan yang Tidak Termasuk Objek Pajak) nomor 5 (Penghasilan Lainnya yang Tidak Termasuk Objek Pajak).'
    ]
  },
  {
    key: 'kripto',
    label: 'Aset Kripto',
    rate: 'PPh Final 0.1% + PPN 0.11%',
    rateDesc: 'Dikenakan atas nilai transaksi penjualan/tukar kripto (total 0.21%) jika menggunakan pedagang fisik aset kripto terdaftar Bappebti. Naik menjadi PPh 0.2% + PPN 0.22% jika exchanger tidak terdaftar.',
    icon: 'currency_bitcoin',
    hartaCode: '039',
    hartaLabel: 'Investasi Lainnya (Kripto)',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    darkColor: 'text-purple-400',
    darkBgColor: 'bg-purple-900/40',
    basisRule: 'PMK No. 68/PMK.03/2022. Pajak atas transaksi dipotong otomatis oleh exchange berizin Bappebti saat transaksi.',
    steps: [
      'Laporkan seluruh portofolio kripto Anda per 31 Desember di Lampiran IV (Daftar Harta) menggunakan Kode Harta 039 (Investasi Lainnya). Nilai yang dilaporkan adalah nilai perolehan saat pembelian awal.',
      'Sesuai best practice pelaporan DJP Online, laporkan akumulasi nilai transaksi penjualan kripto (omzet penjualan kotor) beserta PPh Final-nya di Lampiran III Bagian A (PPh Final) nomor 14 (Penghasilan Lain yang Dikenakan Pajak Final).'
    ]
  },
  {
    key: 'deposito',
    label: 'Deposito & Tabungan',
    rate: 'PPh Final 20%',
    rateDesc: 'Dikenakan atas bunga dari deposito dan tabungan jika total saldo simpanan di atas Rp 7.500.000. Pajak dipotong secara otomatis oleh pihak Bank.',
    icon: 'savings',
    hartaCode: '012',
    hartaLabel: 'Tabungan / Deposito',
    color: 'text-teal-600',
    bgColor: 'bg-teal-50 dark:bg-teal-900/20',
    darkColor: 'text-teal-400',
    darkBgColor: 'bg-teal-900/40',
    basisRule: 'PP No. 131 Tahun 2000. Dikenakan secara final atas bunga tabungan maupun bunga deposito.',
    steps: [
      'Laporkan nilai penempatan nominal deposito Anda per 31 Desember di Lampiran IV (Daftar Harta) menggunakan Kode Harta 012 (Deposito) atau 011 (Tabungan).',
      'Laporkan total bunga kotor yang diterima setahun beserta PPh Final (20% dari bunga kotor) di Lampiran III Bagian A (PPh Final) nomor 2 (Bunga Deposito, Tabungan, Diskonto SBI, dll).'
    ]
  }
];

const TaxGuideModal: React.FC<TaxGuideModalProps> = ({ isOpen, onClose, initialTab = 'saham' }) => {
  const [activeTab, setActiveTab] = useState(initialTab);

  if (!isOpen) return null;

  const currentGuide = TAX_GUIDES.find(g => g.key === activeTab) || TAX_GUIDES[0];

  return (
    <div className="fixed inset-0 z-[100] flex items-start sm:items-center justify-center p-3 sm:p-4 md:p-6 bg-black/70 backdrop-blur-sm animate-in fade-in duration-300 overflow-y-auto">
      <div className="bg-surface-container-lowest dark:bg-[#191c1e] w-full max-w-md sm:max-w-2xl md:max-w-3xl my-auto rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-6 zoom-in-95 duration-300 border border-outline-variant/10 dark:border-white/10 flex flex-col max-h-[calc(100vh-1.5rem)] sm:max-h-[calc(100vh-2rem)]">

        {/* Header */}
        <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-outline-variant/10 dark:border-white/5 flex justify-between items-center bg-surface-container-low dark:bg-white/5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-error/10 dark:bg-error/20 flex items-center justify-center text-error dark:text-[#ffb4ab]">
              <span className="material-symbols-outlined text-2xl">receipt_long</span>
            </div>
            <div>
              <h3 className="text-lg font-bold font-headline text-on-surface dark:text-white">
                Panduan Pelaporan SPT Tahunan
              </h3>
              <p className="text-xs text-on-surface-variant dark:text-outline font-medium">
                Pedoman praktis pengisian SPT tahunan atas aset investasi Anda (UU HPP & PMK Terbaru).
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 rounded-full hover:bg-surface-container-high dark:hover:bg-white/10 text-on-surface-variant dark:text-outline transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selectors */}
        <div className="flex overflow-x-auto border-b border-outline-variant/10 dark:border-white/5 bg-surface-container-lowest dark:bg-[#15181a] px-4 py-2 gap-1 no-scrollbar shrink-0">
          {TAX_GUIDES.map(guide => {
            const isActive = guide.key === activeTab;
            return (
              <button
                key={guide.key}
                onClick={() => setActiveTab(guide.key)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-200 shrink-0 ${
                  isActive 
                    ? 'bg-primary dark:bg-[#a7c8ff] text-white dark:text-[#001b3c] shadow-md shadow-primary/10'
                    : 'text-on-surface-variant dark:text-outline hover:bg-surface-container-low dark:hover:bg-white/5'
                }`}
              >
                <span className="material-symbols-outlined text-sm">{guide.icon}</span>
                {guide.label}
              </button>
            );
          })}
        </div>

        {/* Modal Content - Scrollable */}
        <div className="p-6 md:p-8 overflow-y-auto space-y-6 flex-1 text-left">
          
          {/* Top card: Rate overview */}
          <div className="bg-surface-container-low dark:bg-white/5 rounded-2xl p-5 border border-outline-variant/10 dark:border-white/10 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
            <div className="space-y-1.5 max-w-lg">
              <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant dark:text-outline block">Tarif & Aturan Pajak</span>
              <h4 className="text-xl font-black font-headline text-error dark:text-[#ffb4ab]">
                {currentGuide.rate}
              </h4>
              <p className="text-xs text-on-surface-variant dark:text-slate-300 leading-relaxed font-medium">
                {currentGuide.rateDesc}
              </p>
            </div>
            
            <div className={`px-4 py-2.5 rounded-xl ${currentGuide.bgColor} border border-outline-variant/10 shrink-0`}>
              <p className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant dark:text-outline">Kode Harta Pajak (SPT)</p>
              <p className="text-sm font-black font-headline tabular-nums dark:text-white mt-0.5">
                {currentGuide.hartaCode} <span className="text-xs font-semibold text-on-surface-variant dark:text-slate-300">— {currentGuide.key === 'kripto' ? 'Kripto' : currentGuide.label}</span>
              </p>
            </div>
          </div>

          {/* Basis Rule Banner */}
          <div className="flex gap-3 items-start p-4 bg-surface-container dark:bg-white/[0.02] border border-outline-variant/5 rounded-xl">
            <Info className="w-4 h-4 text-primary dark:text-[#a7c8ff] shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant dark:text-outline">Dasar Hukum & Ketentuan:</p>
              <p className="text-[11px] text-on-surface-variant dark:text-slate-400 font-medium leading-relaxed">
                {currentGuide.basisRule}
              </p>
            </div>
          </div>

          {/* Steps Title */}
          <div className="space-y-4">
            <h5 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant dark:text-outline flex items-center gap-2">
              <span className="material-symbols-outlined text-base text-primary dark:text-[#a7c8ff]">list_alt</span>
              Langkah-Langkah Pelaporan di e-Filing DJP Online
            </h5>

            {/* Step list */}
            <div className="relative border-l border-outline-variant/30 dark:border-white/10 pl-5 ml-2.5 space-y-6">
              {currentGuide.steps.map((step, idx) => (
                <div key={idx} className="relative">
                  {/* Step bullet */}
                  <span className="absolute -left-[30px] top-0 w-5 h-5 rounded-full bg-primary dark:bg-[#a7c8ff] text-white dark:text-[#001b3c] flex items-center justify-center text-[10px] font-extrabold shadow-sm">
                    {idx + 1}
                  </span>
                  <div className="space-y-1">
                    <p className="text-xs text-on-surface dark:text-white leading-relaxed font-semibold">
                      {step.split('di Lampiran')[0]}
                    </p>
                    {step.includes('di Lampiran') && (
                      <p className="text-[11px] text-on-surface-variant dark:text-slate-400 leading-relaxed font-medium">
                        Diisi pada: <strong className="text-primary dark:text-[#a7c8ff] font-bold">Lampiran {step.split('di Lampiran')[1]}</strong>
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-surface-container-low dark:bg-white/5 border-t border-outline-variant/10 dark:border-white/5 flex flex-col sm:flex-row gap-3 justify-between items-center shrink-0">
          <div className="flex items-center gap-2 text-[10px] text-on-surface-variant dark:text-outline font-semibold">
            <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>Pajak Anda membantu pembiayaan pembangunan nasional.</span>
          </div>
          
          <div className="flex gap-2 w-full sm:w-auto shrink-0">
            <a 
              href="https://djponline.pajak.go.id/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 bg-surface-container-high dark:bg-white/10 border border-outline-variant/20 hover:bg-surface-container-highest dark:hover:bg-white/20 text-on-surface dark:text-white font-bold text-xs uppercase tracking-widest rounded-xl transition-all"
            >
              <span>DJP Online</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            
            <button
              onClick={onClose}
              className="flex-1 sm:flex-initial px-5 py-2 bg-primary dark:bg-[#a7c8ff] text-white dark:text-[#001b3c] font-bold text-xs uppercase tracking-widest rounded-xl hover:opacity-90 transition-all shadow-md active:scale-95"
            >
              Tutup Panduan
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default TaxGuideModal;
