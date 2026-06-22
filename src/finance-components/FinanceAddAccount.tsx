import React, { useState } from 'react';
import { FeatureCTA } from './MarketingCTAModal';
import { useFinanceStore } from '../store/useFinanceStore';

interface FinanceAddAccountProps {
  onShowCTA: (feature?: FeatureCTA) => void;
  onBack: () => void;
}

type AccountType = 'bank' | 'wallet' | 'investment' | 'cash';

const FinanceAddAccount: React.FC<FinanceAddAccountProps> = ({ onShowCTA, onBack }) => {
  const [accountName, setAccountName] = useState('');
  const [initialBalance, setInitialBalance] = useState('0');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [accountType, setAccountType] = useState<AccountType>('bank');
  const [currency, setCurrency] = useState('IDR');
  const [isSaving, setIsSaving] = useState(false);
  const [showSecurityModal, setShowSecurityModal] = useState(false);

  const addAccount = useFinanceStore(state => state.addAccount);

  const formatCurrency = (val: string) => {
    const num = val.replace(/\D/g, '');
    if (!num) return '0';
    return parseInt(num, 10).toLocaleString('id-ID');
  };

  const handleBalanceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInitialBalance(formatCurrency(e.target.value));
  };

  const handleSave = async () => {
    if (!accountName.trim()) {
      alert('Nama akun tidak boleh kosong!');
      return;
    }
    setIsSaving(true);
    const parsedBalance = parseInt(initialBalance.replace(/\D/g, ''), 10) || 0;
    
    // Choose appropriate icon for account type
    let typeIcon = 'account_balance';
    if (accountType === 'wallet') typeIcon = 'account_balance_wallet';
    else if (accountType === 'investment') typeIcon = 'trending_up';
    else if (accountType === 'cash') typeIcon = 'payments';

    await addAccount({
      name: accountName,
      type: accountType,
      balance: parsedBalance,
      currency,
      icon: typeIcon,
      startDate,
      valuationReminder: true,
      lastValuationUpdate: new Date().toISOString().split('T')[0]
    });

    setIsSaving(false);
    onBack();
  };

  return (
    <div className="w-full animate-in slide-in-from-bottom-4 duration-500 pb-6">
      {/* Header with Back Button */}
      <div className="flex items-center gap-4 mb-10">
        <button 
          onClick={onBack}
          className="p-2.5 rounded-full hover:bg-surface-container-high dark:hover:bg-white/10 transition-colors flex items-center justify-center bg-surface-container-low dark:bg-white/5 active:scale-95 text-on-surface dark:text-white"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <div>
          <h2 className="font-headline font-extrabold text-2xl lg:text-4xl tracking-tight text-primary dark:text-[#a7c8ff]">Tambah Akun Baru</h2>
          <p className="text-on-surface-variant dark:text-outline text-xs lg:text-sm font-medium mt-1">Catat saldo awal dan kelompokkan akun keuangan Anda secara manual.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 lg:gap-10">
        {/* Form Section (Left/Main) */}
        <div className="lg:col-span-8 space-y-5 sm:space-y-6 lg:space-y-10">
          <section className="bg-surface-container-lowest dark:bg-white/5 p-4 sm:p-6 lg:p-8 rounded-2xl border border-outline-variant/10 dark:border-white/10 shadow-sm">
            <h3 className="text-base sm:text-lg font-bold text-primary dark:text-[#a7c8ff] mb-4 sm:mb-6 font-headline">Informasi Akun</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 lg:gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-on-surface-variant dark:text-outline uppercase tracking-widest">Nama Akun</label>
                <input 
                  className="w-full bg-surface-container-low dark:bg-white/5 border-none rounded-xl px-4 py-4 focus:ring-2 focus:ring-primary-container dark:focus:ring-white/20 text-on-surface dark:text-white placeholder:text-outline-variant/50 transition-all text-sm font-medium" 
                  placeholder="Contoh: Tabungan Utama" 
                  type="text"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-on-surface-variant dark:text-outline uppercase tracking-widest">Saldo Awal (Rp)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant dark:text-outline font-bold text-sm">Rp</span>
                  <input 
                    className="w-full bg-surface-container-low dark:bg-white/5 border-none rounded-xl pl-12 pr-4 py-4 focus:ring-2 focus:ring-primary-container dark:focus:ring-white/20 text-on-surface dark:text-white font-bold tabular-nums text-sm transition-all" 
                    placeholder="0" 
                    type="text"
                    value={initialBalance}
                    onChange={handleBalanceChange}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-on-surface-variant dark:text-outline uppercase tracking-widest">Tanggal Mulai</label>
                <input 
                  className="w-full bg-surface-container-low dark:bg-white/5 border-none rounded-xl px-4 py-4 focus:ring-2 focus:ring-primary-container dark:focus:ring-white/20 text-on-surface dark:text-white text-sm font-medium transition-all" 
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-on-surface-variant dark:text-outline uppercase tracking-widest">Mata Uang</label>
                <select 
                  className="w-full bg-surface-container-low dark:bg-white/5 border-none rounded-xl px-4 py-4 focus:ring-2 focus:ring-primary-container dark:focus:ring-white/20 text-on-surface dark:text-white appearance-none text-sm font-medium transition-all"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                >
                  <option value="IDR">IDR - Rupiah Indonesia</option>
                  <option value="USD">USD - US Dollar</option>
                  <option value="SGD">SGD - Singapore Dollar</option>
                </select>
              </div>
            </div>
          </section>

          <section className="space-y-6">
            <h3 className="text-lg font-bold text-primary dark:text-[#a7c8ff] font-headline">Pilih Jenis Akun</h3>
            {/* Bento Grid for Categories */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Bank Card */}
              <button 
                onClick={() => setAccountType('bank')}
                className={`flex items-start gap-4 p-5 rounded-2xl transition-all border-2 text-left relative overflow-hidden group ${accountType === 'bank' ? 'bg-surface-container-lowest dark:bg-white/10 border-primary dark:border-[#a7c8ff] shadow-md' : 'bg-surface-container-lowest dark:bg-white/5 border-transparent hover:bg-surface-container-low dark:hover:bg-white/10'}`}
              >
                <div className="bg-primary-container/10 dark:bg-[#a7c8ff]/10 p-3 rounded-xl text-primary-container dark:text-[#a7c8ff] group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined" style={accountType === 'bank' ? { fontVariationSettings: "'FILL' 1" } : {}}>account_balance</span>
                </div>
                <div className="flex-1">
                  <p className="font-bold text-primary dark:text-white">Tabungan Bank</p>
                  <p className="text-xs text-on-surface-variant dark:text-outline mt-1 font-medium">BCA, Mandiri, BNI, BRI, dll.</p>
                </div>
                {accountType === 'bank' && <span className="material-symbols-outlined text-primary dark:text-[#a7c8ff] absolute top-4 right-4" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>}
              </button>

              {/* E-Wallet Card */}
              <button 
                onClick={() => setAccountType('wallet')}
                className={`flex items-start gap-4 p-5 rounded-2xl transition-all border-2 text-left relative overflow-hidden group ${accountType === 'wallet' ? 'bg-surface-container-lowest dark:bg-white/10 border-tertiary-fixed-dim dark:border-tertiary-fixed shadow-md' : 'bg-surface-container-lowest dark:bg-white/5 border-transparent hover:bg-surface-container-low dark:hover:bg-white/10'}`}
              >
                <div className="bg-tertiary-fixed-dim/20 dark:bg-tertiary-fixed/20 p-3 rounded-xl text-on-tertiary-fixed-variant dark:text-tertiary-fixed group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined" style={accountType === 'wallet' ? { fontVariationSettings: "'FILL' 1" } : {}}>account_balance_wallet</span>
                </div>
                <div className="flex-1">
                  <p className="font-bold text-primary dark:text-white">E-Wallet</p>
                  <p className="text-xs text-on-surface-variant dark:text-outline mt-1 font-medium">GoPay, OVO, Dana, LinkAja.</p>
                </div>
                {accountType === 'wallet' && <span className="material-symbols-outlined text-tertiary-fixed-dim dark:text-tertiary-fixed absolute top-4 right-4" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>}
              </button>

              {/* Investment Card */}
              <button 
                onClick={() => setAccountType('investment')}
                className={`flex items-start gap-4 p-5 rounded-2xl transition-all border-2 text-left relative overflow-hidden group ${accountType === 'investment' ? 'bg-surface-container-lowest dark:bg-white/10 border-secondary-container dark:border-[#82b1ff] shadow-md' : 'bg-surface-container-lowest dark:bg-white/5 border-transparent hover:bg-surface-container-low dark:hover:bg-white/10'}`}
              >
                <div className="bg-secondary-container/30 dark:bg-[#82b1ff]/20 p-3 rounded-xl text-on-secondary-container dark:text-[#82b1ff] group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined" style={accountType === 'investment' ? { fontVariationSettings: "'FILL' 1" } : {}}>trending_up</span>
                </div>
                <div className="flex-1">
                  <p className="font-bold text-primary dark:text-white">Investasi</p>
                  <p className="text-xs text-on-surface-variant dark:text-outline mt-1 font-medium">Ajaib, Bibit, Pluang, Saham.</p>
                </div>
                {accountType === 'investment' && <span className="material-symbols-outlined text-on-secondary-container dark:text-[#82b1ff] absolute top-4 right-4" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>}
              </button>

              {/* Cash Card */}
              <button 
                onClick={() => setAccountType('cash')}
                className={`flex items-start gap-4 p-5 rounded-2xl transition-all border-2 text-left relative overflow-hidden group ${accountType === 'cash' ? 'bg-surface-container-lowest dark:bg-white/10 border-on-surface dark:border-white shadow-md' : 'bg-surface-container-lowest dark:bg-white/5 border-transparent hover:bg-surface-container-low dark:hover:bg-white/10'}`}
              >
                <div className="bg-surface-container-high dark:bg-white/10 p-3 rounded-xl text-on-surface dark:text-white group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined" style={accountType === 'cash' ? { fontVariationSettings: "'FILL' 1" } : {}}>payments</span>
                </div>
                <div className="flex-1">
                  <p className="font-bold text-primary dark:text-white">Tunai</p>
                  <p className="text-xs text-on-surface-variant dark:text-outline mt-1 font-medium">Uang fisik di dompet atau brankas.</p>
                </div>
                {accountType === 'cash' && <span className="material-symbols-outlined text-on-surface dark:text-white absolute top-4 right-4" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>}
              </button>
            </div>
          </section>

          <div className="flex items-center justify-end gap-4 pt-4">
            <button 
              onClick={onBack}
              disabled={isSaving}
              className="px-8 py-4 text-on-surface-variant dark:text-outline font-bold hover:bg-surface-container-low dark:hover:bg-white/10 transition-colors rounded-xl active:scale-95 disabled:opacity-50"
            >
              Batal
            </button>
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className="bg-gradient-to-r from-primary to-primary-container dark:from-[#a7c8ff] dark:to-[#82b1ff] text-white dark:text-[#001b3c] px-12 py-4 rounded-xl font-bold shadow-xl shadow-primary/10 dark:shadow-[#a7c8ff]/10 hover:opacity-95 active:scale-95 transition-all text-lg flex items-center gap-2 disabled:opacity-75"
            >
              {isSaving ? (
                <>
                  <span className="animate-spin rounded-full h-5 w-5 border-2 border-white dark:border-[#001b3c] border-t-transparent"></span>
                  Menyimpan...
                </>
              ) : 'Simpan Akun'}
            </button>
          </div>
        </div>

        {/* Sidebar Preview/Info (Right) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-primary dark:bg-gradient-to-br dark:from-[#001b3c] dark:to-[#002f5e] text-white p-4 sm:p-6 lg:p-8 rounded-2xl sm:rounded-3xl shadow-2xl relative overflow-hidden transition-colors">
            {/* Background Decor */}
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-[#a7c8ff]/10 rounded-full blur-2xl"></div>
            
            <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest mb-12 relative z-10">Preview Akun Baru</p>
            <div className="space-y-8 relative z-10">
              <div className="w-14 h-9 bg-white/20 rounded-lg backdrop-blur-sm border border-white/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-white/40">contactless</span>
              </div>
              <h4 className="text-2xl font-bold tracking-tight h-8 truncate">{accountName || 'Nama Akun'}</h4>
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-white/50 text-[10px] uppercase font-bold mb-1">Saldo Awal</p>
                  <p className="text-2xl font-headline font-bold tabular-nums">Rp {initialBalance || '0,00'}</p>
                </div>
                <div className="text-right">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#a7c8ff] text-[#001b3c] uppercase">{accountType}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-surface-container-low dark:bg-white/5 p-4 sm:p-6 lg:p-8 rounded-2xl sm:rounded-3xl border border-outline-variant/10 dark:border-white/10 space-y-3 sm:space-y-4">
            <h4 className="font-bold text-on-surface dark:text-white text-sm flex items-center gap-2">
              <span className="material-symbols-outlined text-primary dark:text-[#a7c8ff] text-xl">info</span>
              Mengapa ini penting?
            </h4>
            <p className="text-xs text-on-surface-variant dark:text-outline leading-relaxed font-medium">
              Menambahkan semua akun keuangan Anda membantu <strong>Arsitek Keuangan</strong> memberikan gambaran kekayaan bersih (Net Worth) yang akurat secara real-time.
            </p>
            <div className="pt-2">
              <button onClick={() => setShowSecurityModal(true)} className="text-xs font-bold text-primary dark:text-[#a7c8ff] flex items-center gap-1 hover:underline underline-offset-4 transition-all group">
                Pelajari tentang privasi &amp; keamanan data
                <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">arrow_forward</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Data Security Information Modal */}
      {showSecurityModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface-container-lowest dark:bg-[#191c1e] w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 zoom-in-95 duration-200 border border-outline-variant/10 dark:border-white/10 relative p-8">
            <button 
              onClick={() => setShowSecurityModal(false)}
              className="absolute top-6 right-6 p-2 rounded-full hover:bg-surface-container-low dark:hover:bg-white/10 transition-colors text-outline"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
            
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-6 text-green-600 dark:text-green-400">
                <span className="material-symbols-outlined text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>verified_user</span>
              </div>
              <h3 className="text-2xl font-bold font-headline text-on-surface dark:text-white mb-4">Privasi &amp; Keamanan Data</h3>
              
              <div className="space-y-4 text-left w-full mb-8">
                <div className="flex gap-4 items-start p-4 bg-surface-container-low dark:bg-white/5 rounded-2xl">
                  <span className="material-symbols-outlined text-primary dark:text-[#a7c8ff] mt-0.5">cloud</span>
                  <div>
                    <h4 className="font-bold text-sm text-on-surface dark:text-white">Penyimpanan Google Sheets Mandiri</h4>
                    <p className="text-xs text-on-surface-variant dark:text-outline mt-1">Seluruh data keuangan Anda disimpan langsung ke spreadsheet Google Sheets pribadi milik Anda sendiri, tanpa perantara server pihak ketiga.</p>
                  </div>
                </div>
                <div className="flex gap-4 items-start p-4 bg-surface-container-low dark:bg-white/5 rounded-2xl">
                  <span className="material-symbols-outlined text-primary dark:text-[#a7c8ff] mt-0.5">vpn_key</span>
                  <div>
                    <h4 className="font-bold text-sm text-on-surface dark:text-white">Enkripsi Enklaf Lokal</h4>
                    <p className="text-xs text-on-surface-variant dark:text-outline mt-1">Data sensitif seperti tautan Web App didekripsi dan disimpan secara aman hanya di perangkat lokal Anda menggunakan memori terenkripsi.</p>
                  </div>
                </div>
                <div className="flex gap-4 items-start p-4 bg-surface-container-low dark:bg-white/5 rounded-2xl">
                  <span className="material-symbols-outlined text-primary dark:text-[#a7c8ff] mt-0.5">shield</span>
                  <div>
                    <h4 className="font-bold text-sm text-on-surface dark:text-white">Kontrol Penuh 100%</h4>
                    <p className="text-xs text-on-surface-variant dark:text-outline mt-1">Anda memiliki kendali mutlak untuk mengedit, menghapus, atau mengekspor seluruh basis data Anda kapan saja langsung dari Google Sheets.</p>
                  </div>
                </div>
              </div>
              
              <button 
                onClick={() => setShowSecurityModal(false)}
                className="w-full py-4 bg-primary text-white dark:bg-[#a7c8ff] dark:text-[#001b3c] rounded-xl font-bold hover:opacity-90 active:scale-95 transition-all"
              >
                Saya Mengerti
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinanceAddAccount;
