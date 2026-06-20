import React, { useState } from 'react';
import { FeatureCTA } from './MarketingCTAModal';

interface FinanceIntegrationProps {
  onShowCTA: (feature?: FeatureCTA) => void;
  onBack: () => void;
}

const FinanceIntegration: React.FC<FinanceIntegrationProps> = ({ onShowCTA, onBack }) => {
  const [accountType, setAccountType] = useState('bank');
  const [accountName, setAccountName] = useState('');
  const [balance, setBalance] = useState('0');

  const handleBalanceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '');
    if (!val) {
      setBalance('0');
      return;
    }
    setBalance(parseInt(val, 10).toLocaleString('id-ID'));
  };

  const handleSave = () => {
    onShowCTA({
      title: "Open Banking Protocol",
      description: "Integrasi mutasi otomatis dengan 150+ bank nasional dan platform investasi. Saldo dan transaksi Anda akan ditarik secara real-time tanpa input manual lagi."
    });
  };

  const getAccountIcon = () => {
    switch (accountType) {
      case 'bank': return 'account_balance';
      case 'ewallet': return 'account_balance_wallet';
      case 'investment': return 'trending_up';
      case 'cash': return 'payments';
      default: return 'account_balance';
    }
  };

  return (
    <div className="w-full animate-in slide-in-from-bottom-4 duration-500 pb-6">
      {/* Header with Back Button */}
      <div className="flex items-center gap-4 mb-8">
        <button 
          onClick={onBack}
          className="p-2.5 rounded-full hover:bg-surface-container-high dark:hover:bg-white/10 transition-colors flex items-center justify-center bg-surface-container-low dark:bg-white/5 active:scale-95 text-on-surface dark:text-white"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <div>
          <h2 className="font-headline font-extrabold text-2xl lg:text-3xl tracking-tight text-primary dark:text-white">Tambah Akun Baru</h2>
          <p className="text-on-surface-variant dark:text-outline text-xs lg:text-sm font-medium">Sinkronisasi portofolio untuk melacak kekayaan secara holistik.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Form Section (Left/Main) */}
        <div className="lg:col-span-8 space-y-8">
          <section className="bg-surface-container-lowest dark:bg-transparent border border-outline-variant/10 dark:border-white/10 p-8 rounded-2xl shadow-sm">
            <h3 className="text-lg font-bold text-primary dark:text-[#a7c8ff] mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined">info</span>
              Informasi Akun
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-on-surface-variant dark:text-outline uppercase tracking-wider">Nama Akun</label>
                <input 
                  className="w-full bg-surface-container-low dark:bg-white/5 border-none rounded-xl px-4 py-4 focus:ring-2 focus:ring-primary-container dark:focus:ring-white/20 text-on-surface dark:text-white placeholder:text-outline-variant dark:placeholder:text-white/30 transition-colors" 
                  placeholder="Contoh: Tabungan Utama" 
                  type="text"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-xs font-semibold text-on-surface-variant dark:text-outline uppercase tracking-wider">Saldo Awal (Rp)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant dark:text-slate-400 font-medium">Rp</span>
                  <input 
                    className="w-full bg-surface-container-low dark:bg-white/5 border-none rounded-xl pl-12 pr-4 py-4 focus:ring-2 focus:ring-primary-container dark:focus:ring-white/20 text-on-surface dark:text-[#a7c8ff] font-bold tabular-nums transition-colors" 
                    placeholder="0" 
                    type="text"
                    value={balance}
                    onChange={handleBalanceChange}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-xs font-semibold text-on-surface-variant dark:text-outline uppercase tracking-wider">Tanggal Mulai</label>
                <input 
                  className="w-full bg-surface-container-low dark:bg-white/5 border-none rounded-xl px-4 py-4 focus:ring-2 focus:ring-primary-container dark:focus:ring-white/20 text-on-surface dark:text-white [color-scheme:light] dark:[color-scheme:dark] transition-colors" 
                  type="date"
                  defaultValue={new Date().toISOString().split('T')[0]}
                />
              </div>
              
              <div className="space-y-2 relative group">
                <label className="text-xs font-semibold text-on-surface-variant dark:text-outline uppercase tracking-wider">Mata Uang</label>
                <select className="w-full bg-surface-container-low dark:bg-white/5 border-none rounded-xl px-4 py-4 focus:ring-2 focus:ring-primary-container dark:focus:ring-white/20 text-on-surface dark:text-white appearance-none cursor-pointer transition-colors">
                  <option>IDR - Rupiah Indonesia</option>
                  <option>USD - US Dollar</option>
                  <option>SGD - Singapore Dollar</option>
                </select>
                <span className="material-symbols-outlined absolute right-4 top-11 pointer-events-none text-on-surface-variant dark:text-outline">keyboard_arrow_down</span>
              </div>
            </div>
          </section>

          <section className="space-y-6">
            <h3 className="text-lg font-bold text-primary dark:text-white flex items-center gap-2">
              <span className="material-symbols-outlined">category</span>
              Pilih Jenis Akun
            </h3>
            
            {/* Bento Grid for Categories */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Bank Card */}
              <label className="cursor-pointer group">
                <input 
                  className="hidden peer" 
                  name="account_type" 
                  type="radio" 
                  checked={accountType === 'bank'}
                  onChange={() => setAccountType('bank')}
                />
                <div className="bg-surface-container-lowest dark:bg-white/5 border border-outline-variant/10 dark:border-white/10 p-5 rounded-2xl peer-checked:ring-2 peer-checked:ring-primary dark:peer-checked:ring-[#a7c8ff] transition-all flex items-start gap-4 hover:shadow-md">
                  <div className="bg-primary-container/10 dark:bg-[#a7c8ff]/10 p-3 rounded-xl text-primary-container dark:text-[#a7c8ff] transition-colors">
                    <span className="material-symbols-outlined">account_balance</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-primary dark:text-white">Tabungan Bank</p>
                    <p className="text-xs text-on-surface-variant dark:text-outline mt-1">BCA, Mandiri, BNI, BRI, dll.</p>
                  </div>
                  <span className="material-symbols-outlined text-outline-variant dark:text-white/20 opacity-0 peer-checked:opacity-100 peer-checked:text-primary dark:peer-checked:text-[#a7c8ff] transition-all" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                </div>
              </label>

              {/* E-Wallet Card */}
              <label className="cursor-pointer group">
                <input 
                  className="hidden peer" 
                  name="account_type" 
                  type="radio"
                  checked={accountType === 'ewallet'}
                  onChange={() => setAccountType('ewallet')}
                />
                <div className="bg-surface-container-lowest dark:bg-white/5 border border-outline-variant/10 dark:border-white/10 p-5 rounded-2xl peer-checked:ring-2 peer-checked:ring-primary dark:peer-checked:ring-[#a7c8ff] transition-all flex items-start gap-4 hover:shadow-md">
                  <div className="bg-tertiary-fixed-dim/20 p-3 rounded-xl text-on-tertiary-fixed-variant dark:text-tertiary-fixed">
                    <span className="material-symbols-outlined">account_balance_wallet</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-primary dark:text-white">E-Wallet</p>
                    <p className="text-xs text-on-surface-variant dark:text-outline mt-1">GoPay, OVO, Dana, LinkAja.</p>
                  </div>
                  <span className="material-symbols-outlined text-outline-variant dark:text-white/20 opacity-0 peer-checked:opacity-100 peer-checked:text-primary dark:peer-checked:text-[#a7c8ff] transition-all" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                </div>
              </label>

              {/* Investment Card */}
              <label className="cursor-pointer group">
                <input 
                  className="hidden peer" 
                  name="account_type" 
                  type="radio"
                  checked={accountType === 'investment'}
                  onChange={() => setAccountType('investment')}
                />
                <div className="bg-surface-container-lowest dark:bg-white/5 border border-outline-variant/10 dark:border-white/10 p-5 rounded-2xl peer-checked:ring-2 peer-checked:ring-primary dark:peer-checked:ring-[#a7c8ff] transition-all flex items-start gap-4 hover:shadow-md">
                  <div className="bg-secondary-container/30 dark:bg-white/10 p-3 rounded-xl text-on-secondary-container dark:text-slate-300">
                    <span className="material-symbols-outlined">trending_up</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-primary dark:text-white">Investasi</p>
                    <p className="text-xs text-on-surface-variant dark:text-outline mt-1">Ajaib, Bibit, Pluang, Saham.</p>
                  </div>
                  <span className="material-symbols-outlined text-outline-variant dark:text-white/20 opacity-0 peer-checked:opacity-100 peer-checked:text-primary dark:peer-checked:text-[#a7c8ff] transition-all" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                </div>
              </label>

              {/* Cash Card */}
              <label className="cursor-pointer group">
                <input 
                  className="hidden peer" 
                  name="account_type" 
                  type="radio"
                  checked={accountType === 'cash'}
                  onChange={() => setAccountType('cash')}
                />
                <div className="bg-surface-container-lowest dark:bg-white/5 border border-outline-variant/10 dark:border-white/10 p-5 rounded-2xl peer-checked:ring-2 peer-checked:ring-primary dark:peer-checked:ring-[#a7c8ff] transition-all flex items-start gap-4 hover:shadow-md">
                  <div className="bg-surface-container-high dark:bg-white/10 p-3 rounded-xl text-on-surface dark:text-white">
                    <span className="material-symbols-outlined">payments</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-primary dark:text-white">Tunai</p>
                    <p className="text-xs text-on-surface-variant dark:text-outline mt-1">Uang fisik di dompet atau brankas.</p>
                  </div>
                  <span className="material-symbols-outlined text-outline-variant dark:text-white/20 opacity-0 peer-checked:opacity-100 peer-checked:text-primary dark:peer-checked:text-[#a7c8ff] transition-all" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                </div>
              </label>

            </div>
          </section>

          <div className="flex items-center justify-end gap-4 pt-6">
            <button 
              onClick={onBack}
              className="px-6 py-4 text-on-surface-variant dark:text-slate-300 font-bold hover:bg-surface-container-low dark:hover:bg-white/5 transition-colors rounded-xl flex-1 md:flex-none"
            >
              Batal
            </button>
            <button 
              onClick={handleSave}
              className="bg-gradient-to-r from-primary to-primary-container dark:from-[#a7c8ff] dark:to-[#82b1ff] text-white dark:text-[#001b3c] px-10 py-4 rounded-xl font-headline font-bold shadow-lg shadow-primary-container/20 dark:shadow-[#a7c8ff]/20 hover:opacity-90 active:scale-[0.98] transition-all flex-1 md:flex-none"
            >
              Simpan Akun
            </button>
          </div>
        </div>

        {/* Sidebar Preview/Info (Right) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Real-time Preview */}
          <div className="bg-primary-container dark:bg-gradient-to-br dark:from-[#001b3c] dark:to-[#002f5e] text-white p-8 rounded-3xl shadow-2xl relative overflow-hidden transition-colors">
            {/* Background Decor */}
            <div className="absolute -top-10 -right-10 w-48 h-48 bg-white/10 rounded-full blur-3xl"></div>
            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-[#a7c8ff]/10 rounded-full blur-2xl"></div>
            
            <p className="text-white/60 text-xs font-bold uppercase tracking-widest mb-10 relative z-10">Preview Akun Baru</p>
            
            <div className="space-y-6 relative z-10">
              <div className="w-14 h-14 bg-white/20 rounded-2xl backdrop-blur-md flex items-center justify-center">
                <span className="material-symbols-outlined text-3xl">{getAccountIcon()}</span>
              </div>
              <h4 className="text-2xl font-bold tracking-tight">{accountName || 'Nama Akun'}</h4>
              <div className="flex justify-between items-end border-t border-white/20 pt-4 mt-6">
                <div>
                  <p className="text-white/50 text-[10px] uppercase font-bold mb-1">Saldo Awal</p>
                  <p className="text-2xl font-headline font-bold tabular-nums">Rp {balance || '0'}</p>
                </div>
                <span className="material-symbols-outlined text-4xl opacity-30">contactless</span>
              </div>
            </div>
          </div>
          
          <div className="bg-surface-container-low dark:bg-white/5 p-6 rounded-2xl space-y-4 border border-outline-variant/10 dark:border-white/10 text-on-surface dark:text-white">
            <h4 className="font-bold text-sm flex items-center gap-2">
              <span className="material-symbols-outlined text-primary dark:text-[#a7c8ff] text-lg">info</span>
              Mengapa ini penting?
            </h4>
            <p className="text-xs text-on-surface-variant dark:text-outline leading-relaxed">
              Menambahkan semua akun keuangan Anda membantu <strong>Arsitek Keuangan</strong> memberikan gambaran kekayaan bersih (Net Worth) yang akurat secara real-time.
            </p>
          </div>

          {/* Integration Suggestion */}
          <div className="border border-outline-variant/20 dark:border-white/10 p-6 rounded-2xl bg-white/40 dark:bg-transparent backdrop-blur-sm">
            <p className="text-[10px] font-extrabold text-on-surface-variant dark:text-outline uppercase tracking-tighter mb-4 flex justify-between items-center">
              Integrasi Populer
              <span className="px-2 py-0.5 bg-tertiary-fixed text-on-tertiary-fixed rounded-full text-[8px]">PREMIUM</span>
            </p>
            <div className="grid grid-cols-4 gap-3">
              {[
                { name: 'BCA', src: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB3Zmcx3Aar9_KukDLRWAC8QvfoA2Ism84oaZeJulCJi7ddFbgmxlOUzbOU7yZZ3VOAQAsLxpK94Ivepf6zuVrJLCoYE03e1q1IejlDDPSs5hEpBzc60tFk54qCxkebDqrp1WJL1rvwY8T1zVAU3axDhMnNKnrtlmsMwmI3FA8b4jsHXrHfKAg5od9ANPeAWxJuyRnAWqlPoXw1ji32oNV8yDicoKjsBOtL7dvkIjbeqNqQRVg3GARLZmVsDVJ-Yh8GhSvuQFMweIQ' },
                { name: 'GoPay', src: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCni0Pt0tzQuRhVitO2DnjqWQI39n7gpNhhxu7wpzFUp0z2BKvLLMT1RdVAJBC7LU0zb7cqYXuryX2-UpD7jQ1J8HKtLGlYCIOcdzVY3DqQPb9xARiONKi10a1ApNIyBk4zQ8mEf_wLGmwlsGE2-J40pbrRK99K8vUBm4GWDHuSoYvfj5G_ZYgJd7-hzEiIe_QO_AmvJrhh6VKMqA9pQTfusstIVdCT9GoR_Wch09d7dVeHrfFTVWnP7S8vZtTvtfon2wreg5lJ4ow' },
                { name: 'Bibit', src: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBlMl-oc5wdKcOOZYiQgu1V7l5QJtjHXtXTb_-dRHqnwzAy-EnAoHdZ3U--PuPFaBjbZWVtKwL596oONcJloH-NWQii05REWSnTT3UWpB62Z5OCIXfBdxi-2ij-wLn7zHOwoU-X0-9Ci6EJnwiI6nHcgNjNcItq9cSsBowSUCqos_Y7BtFLCKZB_mMat3LiNpdGfeTbbg_3fTbcMdoP-IJTF7IXSJpxRje73qdCD0C7iQdxbVLgXsyrxAQ-RDkiKjxJLyYewNfLkHA' }
              ].map((brand, i) => (
                <div 
                  key={i}
                  onClick={() => onShowCTA({ title: "Auto-Sync Integrations", description: "Sambungkan langsung akun " + brand.name + " Anda ke Arsitek Keuangan dengan tingkat keamanan enkripsi perbankan." })}
                  className="aspect-square bg-surface dark:bg-white/5 rounded-xl flex items-center justify-center p-3 group hover:bg-white dark:hover:bg-white/10 transition-colors cursor-pointer border border-outline-variant/10 dark:border-white/5"
                >
                  <img alt={brand.name} src={brand.src} className="w-full grayscale dark:invert opacity-40 group-hover:grayscale-0 group-hover:opacity-100 dark:group-hover:invert-0 transition-all drop-shadow-sm" />
                </div>
              ))}
              
              <div 
                onClick={() => onShowCTA({ title: "150+ Bank Terhubung", description: "Jelajahi integrasi dengan puluhan bank nasional dan internasional lainnya yang didukung oleh sistem kami." })}
                className="aspect-square bg-surface dark:bg-white/5 rounded-xl flex items-center justify-center p-2 group hover:bg-white dark:hover:bg-white/10 transition-colors cursor-pointer border border-dashed border-outline-variant/40 dark:border-white/20"
              >
                <span className="material-symbols-outlined text-outline-variant dark:text-outline group-hover:text-primary dark:group-hover:text-[#a7c8ff] transition-colors">add</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default FinanceIntegration;
