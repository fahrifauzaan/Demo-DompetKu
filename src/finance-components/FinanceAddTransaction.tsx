import React, { useState, useEffect } from 'react';
import { FeatureCTA } from './MarketingCTAModal';
import { useFinanceStore, TransactionType } from '../store/useFinanceStore';
import FinancePinModal from './FinancePinModal';

const categoryTranslations: Record<string, string> = {
  // Expense
  'Housing': 'Tempat Tinggal / KPR',
  'Food': 'Makanan & Minuman',
  'Utilities': 'Tagihan Listrik & Air',
  'Healthcare': 'Kesehatan & Obat',
  'Transportation': 'Transportasi & Bensin',
  'Debt': 'Cicilan & Pelunasan Utang',
  'Personal Care': 'Perawatan Diri',
  'Education': 'Pendidikan & Kursus',
  'Childcare': 'Kebutuhan Anak',
  'Household': 'Perabotan Rumah Tangga',
  'Pets': 'Hewan Peliharaan',
  'Clothing and Accessories': 'Pakaian & Aksesoris',
  'Insurance': 'Premi Asuransi',
  'Work Expenses': 'Pengeluaran Kerja/Bisnis',
  'Entertainment': 'Hiburan & Hobi',
  'Gift': 'Kado & Donasi',
  'Travel': 'Travel & Liburan',
  'Subscription': 'Layanan Berlangganan',
  'Bills': 'Tagihan Bulanan',
  
  // Income
  'Salary': 'Gaji Pokok',
  'Partner Salary': 'Gaji Pasangan',
  'Side Hustle / Freelance': 'Pekerjaan Sampingan',
  'Business Income': 'Pendapatan Bisnis',
  'Investments Income / Dividends / Capital Gains': 'Dividen & Investasi',
  'Rental Income': 'Uang Sewa / Kost',
  'Commissions': 'Komisi & Insentif',
  'Bonuses': 'Bonus & THR',
  'Pension Income': 'Uang Pensiun',
  'Scholarships / Grants': 'Beasiswa & Hibah',
  'Inheritance': 'Warisan',
  'Lottery / Gambling Winnings': 'Undian & Hadiah',
  'Gifts': 'Pemberian / Angpao',
  'Refunds / Reimbursements': 'Reimbursement Kerja',
  'Others': 'Pendapatan Lainnya',
};

const translateCategory = (catName: string, isIndonesian: boolean): string => {
  if (!isIndonesian) return catName;
  return categoryTranslations[catName] || catName;
};

const expenseCategories = [
  { name: 'Housing', icon: 'home' },
  { name: 'Food', icon: 'restaurant' },
  { name: 'Utilities', icon: 'bolt' },
  { name: 'Healthcare', icon: 'medical_services' },
  { name: 'Transportation', icon: 'directions_car' },
  { name: 'Debt', icon: 'credit_card' },
  { name: 'Personal Care', icon: 'spa' },
  { name: 'Education', icon: 'school' },
  { name: 'Childcare', icon: 'child_care' },
  { name: 'Household', icon: 'living' },
  { name: 'Pets', icon: 'pets' },
  { name: 'Clothing and Accessories', icon: 'checkroom' },
  { name: 'Insurance', icon: 'health_and_safety' },
  { name: 'Work Expenses', icon: 'work' },
  { name: 'Entertainment', icon: 'sports_esports' },
  { name: 'Gift', icon: 'card_giftcard' },
  { name: 'Travel', icon: 'flight' },
  { name: 'Subscription', icon: 'workspace_premium' },
  { name: 'Bills', icon: 'receipt_long' },
];

const incomeCategories = [
  { name: 'Salary', icon: 'work' },
  { name: 'Partner Salary', icon: 'diversity_3' },
  { name: 'Side Hustle / Freelance', icon: 'two_wheeler' },
  { name: 'Business Income', icon: 'storefront' },
  { name: 'Investments Income / Dividends / Capital Gains', icon: 'pie_chart' },
  { name: 'Rental Income', icon: 'real_estate_agent' },
  { name: 'Commissions', icon: 'percent' },
  { name: 'Bonuses', icon: 'star' },
  { name: 'Pension Income', icon: 'elderly' },
  { name: 'Scholarships / Grants', icon: 'school' },
  { name: 'Inheritance', icon: 'volunteer_activism' },
  { name: 'Lottery / Gambling Winnings', icon: 'casino' },
  { name: 'Gifts', icon: 'card_giftcard' },
  { name: 'Refunds / Reimbursements', icon: 'currency_exchange' },
  { name: 'Others', icon: 'payments' },
];

interface SearchableSelectOption {
  value: string;
  label: string;
  icon?: string;
}

interface SearchableSelectProps {
  options: SearchableSelectOption[];
  value: string;
  onChange: (val: string) => void;
  placeholder: string;
  searchPlaceholder: string;
  noOptionsMessage?: string;
}

const SearchableSelect: React.FC<SearchableSelectProps> = ({
  options,
  value,
  onChange,
  placeholder,
  searchPlaceholder,
  noOptionsMessage = "Tidak ditemukan",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const selectedOption = options.find((opt) => opt.value === value);

  const filteredOptions = options.filter((opt) =>
    opt.label.toLowerCase().includes(search.toLowerCase()) ||
    opt.value.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
    setSearch("");
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-surface-container-low dark:bg-white/5 border-none rounded-xl py-3.5 px-4 text-on-surface dark:text-white font-medium flex items-center justify-between cursor-pointer focus:ring-2 focus:ring-primary-container/20 dark:focus:ring-white/20 transition-all select-none"
      >
        <span className="flex items-center gap-2 truncate">
          {selectedOption?.icon && (
            <span className="material-symbols-outlined text-lg opacity-70">
              {selectedOption.icon}
            </span>
          )}
          <span>{selectedOption ? selectedOption.label : placeholder}</span>
        </span>
        <span className="material-symbols-outlined text-on-surface-variant dark:text-outline transition-transform duration-200" style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0)' }}>
          keyboard_arrow_down
        </span>
      </div>

      {isOpen && (
        <div className="absolute left-0 right-0 mt-2 bg-white dark:bg-[#191c1e] border border-slate-200 dark:border-white/10 rounded-2xl shadow-xl z-[80] overflow-hidden flex flex-col max-h-72 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="p-2 border-b border-slate-100 dark:border-white/5 flex items-center gap-2 bg-slate-50 dark:bg-black/20">
            <span className="material-symbols-outlined text-outline text-lg opacity-70 pl-2">search</span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              className="w-full bg-transparent border-none py-1.5 px-1 focus:ring-0 text-sm outline-none dark:text-white"
              placeholder={searchPlaceholder}
              autoFocus
            />
            {search && (
              <button 
                onClick={(e) => { e.stopPropagation(); setSearch(""); }}
                className="p-1 hover:bg-slate-200 dark:hover:bg-white/10 rounded-full cursor-pointer flex items-center justify-center text-outline"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            )}
          </div>

          <div className="overflow-y-auto py-1.5 flex-1">
            {filteredOptions.length === 0 ? (
              <div className="px-4 py-3 text-xs text-on-surface-variant dark:text-outline italic text-center">
                {noOptionsMessage}
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <div
                    key={opt.value}
                    onClick={() => handleSelect(opt.value)}
                    className={`px-4 py-3 text-sm font-medium cursor-pointer flex items-center justify-between transition-colors ${
                      isSelected
                        ? "bg-primary/10 text-primary dark:bg-[#a7c8ff]/20 dark:text-[#a7c8ff]"
                        : "hover:bg-slate-50 dark:hover:bg-white/5 text-on-surface dark:text-white"
                    }`}
                  >
                    <span className="flex items-center gap-2.5 truncate">
                      {opt.icon && (
                        <span className="material-symbols-outlined text-lg opacity-70">
                          {opt.icon}
                        </span>
                      )}
                      <span>{opt.label}</span>
                    </span>
                    {isSelected && (
                      <span className="material-symbols-outlined text-sm font-bold text-primary dark:text-[#a7c8ff]">
                        check
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

interface FinanceAddTransactionProps {
  onShowCTA: (feature?: FeatureCTA) => void;
  onBack: () => void;
  editingTransactionId?: string | null;
}

const FinanceAddTransaction: React.FC<FinanceAddTransactionProps> = ({ onShowCTA, onBack, editingTransactionId }) => {
  const accounts = useFinanceStore(state => state.accounts);
  const budgetCategories = useFinanceStore(state => state.budgetCategories);
  const transactions = useFinanceStore(state => state.transactions);
  const addTransaction = useFinanceStore(state => state.addTransaction);
  const updateTransaction = useFinanceStore(state => state.updateTransaction);
  const updateAccount = useFinanceStore(state => state.updateAccount);
  
  const editingTx = editingTransactionId ? transactions.find(t => t.id === editingTransactionId) : null;

  const [transactionType, setTransactionType] = useState<'pengeluaran' | 'pemasukan' | 'transfer'>('pengeluaran');
  const [amount, setAmount] = useState('0');
  const [account, setAccount] = useState('');
  const [toAccount, setToAccount] = useState('');
  const [category, setCategory] = useState('Housing');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [desc, setDesc] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const settings = useFinanceStore(state => state.settings);
  const isPinActive = settings.find(s => s.key === 'security_pinActive')?.value === 'true';
  const savedPin = settings.find(s => s.key === 'security_pin')?.value || '';
  const currentLanguage = settings.find(s => s.key === 'language')?.value || 'Bahasa Indonesia';
  const isIndo = currentLanguage === 'Bahasa Indonesia';

  const accountOptions = accounts.map(acc => ({
    value: acc.name,
    label: acc.name,
    icon: acc.icon || 'account_balance_wallet'
  }));

  const toAccountOptions = accounts
    .filter(acc => acc.name !== account)
    .map(acc => ({
      value: acc.name,
      label: acc.name,
      icon: acc.icon || 'account_balance_wallet'
    }));

  const currentCategories = transactionType === 'pemasukan' 
    ? incomeCategories 
    : (transactionType === 'pengeluaran' ? expenseCategories : [{ name: 'Transfer', icon: 'swap_horiz' }, { name: 'Lainnya', icon: 'receipt_long' }]);

  const categoryOptions = currentCategories.map(cat => ({
    value: cat.name,
    label: translateCategory(cat.name, isIndo),
    icon: cat.icon
  }));

  const getFontSizeClass = (len: number) => {
    if (len > 15) return 'text-2xl md:text-3xl';
    if (len > 12) return 'text-3xl md:text-4xl';
    if (len > 9) return 'text-4xl md:text-5xl';
    return 'text-5xl';
  };

  useEffect(() => {
    // Reset category when transaction type changes
    setCategory(currentCategories[0].name);
  }, [transactionType]);

  useEffect(() => {
    if (editingTx) {
      setTransactionType(editingTx.amount < 0 ? 'pengeluaran' : 'pemasukan');
      setAmount(Math.abs(editingTx.amount).toLocaleString('id-ID'));
      setAccount(editingTx.account);
      setCategory(editingTx.category);
      
      // Attempt to format date nicely for the input type="date"
      if (editingTx.date) {
        try {
           const d = new Date(editingTx.date);
           if (!isNaN(d.getTime())) setDate(d.toISOString().split('T')[0]);
        } catch(e) {}
      }
      setDesc(editingTx.desc || '');
    }
  }, [editingTx]);

  // Set default selected account on mount or when accounts change
  useEffect(() => {
    if (accounts.length > 0 && !account) {
      setAccount(accounts[0].name);
    }
  }, [accounts, account]);

  // Auto-select a different destination account when in transfer mode
  useEffect(() => {
    if (transactionType === 'transfer' && accounts.length > 1) {
      if (!toAccount || toAccount === account) {
        const other = accounts.find(acc => acc.name !== account);
        if (other) {
          setToAccount(other.name);
        }
      }
    }
  }, [transactionType, accounts, account, toAccount]);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Basic number formatting
    const val = e.target.value.replace(/\D/g, '');
    if (!val) {
      setAmount('0');
      return;
    }
    const formatted = parseInt(val, 10).toLocaleString('id-ID');
    setAmount(formatted);
  };

  const executeSave = async () => {
    setIsSaving(true);
    const rawAmount = parseInt(amount.replace(/\D/g, ''), 10) || 0;

    if (editingTx) {
      const finalAmount = transactionType === 'pengeluaran' ? -Math.abs(rawAmount) : Math.abs(rawAmount);
      const amountDiff = finalAmount - editingTx.amount;
      
      await updateTransaction({
        ...editingTx,
        date,
        desc: desc || (transactionType === 'pengeluaran' ? 'Pengeluaran Baru' : 'Pemasukan Baru'),
        amount: finalAmount,
        category,
        icon: currentCategories.find(c => c.name === category)?.icon || 'receipt_long',
        account,
        type: transactionType.toUpperCase() as TransactionType
      });

      const targetAcc = accounts.find(a => a.name === account);
      if (targetAcc) {
         if (account !== editingTx.account) {
            const oldAcc = accounts.find(a => a.name === editingTx.account);
            if (oldAcc) await updateAccount({ ...oldAcc, balance: oldAcc.balance - editingTx.amount });
            await updateAccount({ ...targetAcc, balance: targetAcc.balance + finalAmount });
         } else {
            await updateAccount({ ...targetAcc, balance: targetAcc.balance + amountDiff });
         }
      }
    } else {
      if (transactionType === 'transfer') {
        // 1. Transaction 1: Deduction from Source Account
        await addTransaction({
          date,
          desc: desc ? `Transfer ke ${toAccount}: ${desc}` : `Transfer Saldo ke ${toAccount}`,
          location: 'Local',
          amount: -Math.abs(rawAmount),
          category: 'Transfer',
          icon: 'swap_horiz',
          status: 'Selesai',
          account: account,
          type: 'TRANSFER'
        });

        // 2. Transaction 2: Addition to Destination Account
        await addTransaction({
          date,
          desc: desc ? `Transfer dari ${account}: ${desc}` : `Transfer Saldo dari ${account}`,
          location: 'Local',
          amount: Math.abs(rawAmount),
          category: 'Transfer',
          icon: 'swap_horiz',
          status: 'Selesai',
          account: toAccount,
          type: 'TRANSFER'
        });

        const acc1 = accounts.find(a => a.name === account);
        if (acc1) await updateAccount({ ...acc1, balance: acc1.balance - rawAmount });
        const acc2 = accounts.find(a => a.name === toAccount);
        if (acc2) await updateAccount({ ...acc2, balance: acc2.balance + rawAmount });

      } else {
        const finalAmount = transactionType === 'pengeluaran' ? -Math.abs(rawAmount) : Math.abs(rawAmount);
        await addTransaction({
          date,
          desc: desc || (transactionType === 'pengeluaran' ? 'Pengeluaran Baru' : 'Pemasukan Baru'),
          location: 'Local',
          amount: finalAmount,
          category,
          icon: currentCategories.find(c => c.name === category)?.icon || 'receipt_long',
          status: 'Selesai',
          account,
          type: transactionType.toUpperCase() as TransactionType
        });
        
        const targetAcc = accounts.find(a => a.name === account);
        if (targetAcc) {
          await updateAccount({ ...targetAcc, balance: targetAcc.balance + finalAmount });
        }
      }
    }
    
    setIsSaving(false);
    setShowPinModal(false);
    onBack(); // Go back to transactions view
  };

  const handleSave = async () => {
    if (!account) {
      alert('Silakan pilih akun rekening terlebih dahulu!');
      return;
    }
    if (transactionType === 'transfer' && !editingTx) {
      if (!toAccount) {
        alert('Silakan pilih akun rekening tujuan terlebih dahulu!');
        return;
      }
      if (account === toAccount) {
        alert('Akun tujuan tidak boleh sama dengan akun sumber!');
        return;
      }
    }

    setIsSaving(true);
    const rawAmount = parseInt(amount.replace(/\D/g, ''), 10) || 0;

    if (editingTx) {
      const finalAmount = transactionType === 'pengeluaran' ? -Math.abs(rawAmount) : Math.abs(rawAmount);
      const amountDiff = finalAmount - editingTx.amount;
      
      await updateTransaction({
        ...editingTx,
        date,
        desc: desc || (transactionType === 'pengeluaran' ? 'Pengeluaran Baru' : 'Pemasukan Baru'),
        amount: finalAmount,
        category,
        icon: currentCategories.find(c => c.name === category)?.icon || 'receipt_long',
        account,
        type: transactionType.toUpperCase() as TransactionType
      });

      const targetAcc = accounts.find(a => a.name === account);
      if (targetAcc) {
         if (account !== editingTx.account) {
            const oldAcc = accounts.find(a => a.name === editingTx.account);
            if (oldAcc) await updateAccount({ ...oldAcc, balance: oldAcc.balance - editingTx.amount });
            await updateAccount({ ...targetAcc, balance: targetAcc.balance + finalAmount });
         } else {
            await updateAccount({ ...targetAcc, balance: targetAcc.balance + amountDiff });
         }
      }
    } else {
      if (transactionType === 'transfer') {
        // 1. Transaction 1: Deduction from Source Account
        await addTransaction({
          date,
          desc: desc ? `Transfer ke ${toAccount}: ${desc}` : `Transfer Saldo ke ${toAccount}`,
          location: 'Local',
          amount: -Math.abs(rawAmount),
          category: 'Transfer',
          icon: 'swap_horiz',
          status: 'Selesai',
          account: account,
          type: 'TRANSFER'
        });

        // 2. Transaction 2: Addition to Destination Account
        await addTransaction({
          date,
          desc: desc ? `Transfer dari ${account}: ${desc}` : `Transfer Saldo dari ${account}`,
          location: 'Local',
          amount: Math.abs(rawAmount),
          category: 'Transfer',
          icon: 'swap_horiz',
          status: 'Selesai',
          account: toAccount,
          type: 'TRANSFER'
        });

        const acc1 = accounts.find(a => a.name === account);
        if (acc1) await updateAccount({ ...acc1, balance: acc1.balance - rawAmount });
        const acc2 = accounts.find(a => a.name === toAccount);
        if (acc2) await updateAccount({ ...acc2, balance: acc2.balance + rawAmount });

      } else {
        const finalAmount = transactionType === 'pengeluaran' ? -Math.abs(rawAmount) : Math.abs(rawAmount);
        await addTransaction({
          date,
          desc: desc || (transactionType === 'pengeluaran' ? 'Pengeluaran Baru' : 'Pemasukan Baru'),
          location: 'Local',
          amount: finalAmount,
          category,
          icon: currentCategories.find(c => c.name === category)?.icon || 'receipt_long',
          status: 'Selesai',
          account,
          type: transactionType.toUpperCase() as TransactionType
        });
        
        const targetAcc = accounts.find(a => a.name === account);
        if (targetAcc) {
          await updateAccount({ ...targetAcc, balance: targetAcc.balance + finalAmount });
        }
      }
    }
    
    setIsSaving(false);
    onBack(); // Go back to transactions view
  };

  // Dynamic calculations for selected account
  const selectedAccountObj = accounts.find(acc => acc.name === account);
  const currentBalance = selectedAccountObj ? selectedAccountObj.balance : 0;
  const rawAmount = parseInt(amount.replace(/\D/g, ''), 10) || 0;
  
  let estimatedBalance = currentBalance;
  if (transactionType === 'pengeluaran' || transactionType === 'transfer') {
    estimatedBalance = currentBalance - rawAmount;
  } else if (transactionType === 'pemasukan') {
    estimatedBalance = currentBalance + rawAmount;
  }

  // Calculate budget category info
  const matchingBudget = budgetCategories.find(c => c.name.toLowerCase().includes(category.toLowerCase()) || category.toLowerCase().includes(c.name.toLowerCase()));
  const currentMonthTx = transactions.filter(t => {
    if (!t.date) return false;
    // Handle different date formats safely
    try {
      const txDate = new Date(t.date);
      const now = new Date();
      return txDate.getMonth() === now.getMonth() && txDate.getFullYear() === now.getFullYear();
    } catch {
      return false;
    }
  });

  const spentInCat = Math.abs(currentMonthTx
    .filter(t => t.category.toLowerCase() === category.toLowerCase() && t.type === 'PENGELUARAN')
    .reduce((sum, t) => sum + t.amount, 0));

  const budgetAllocated = matchingBudget ? matchingBudget.allocated : 5000000; // fallback default 5jt
  const newSpent = spentInCat + (transactionType === 'pengeluaran' ? rawAmount : 0);
  const usagePercent = budgetAllocated > 0 ? Math.min(Math.round((newSpent / budgetAllocated) * 100), 100) : 0;

  return (
    <div className="w-full max-w-7xl mx-auto animate-in slide-in-from-bottom-4 duration-500 pb-6 text-left">
      {/* Header with Back Button */}
      <div className="flex items-center gap-4 mb-8 z-10 relative px-2">
        <button 
          onClick={onBack}
          className="p-2.5 rounded-full hover:bg-surface-container-high dark:hover:bg-white/10 transition-colors flex items-center justify-center bg-surface-container-low dark:bg-white/5 active:scale-95 text-on-surface dark:text-white cursor-pointer"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <div>
          <h2 className="font-headline font-extrabold text-2xl md:text-3xl tracking-tight text-primary dark:text-white">{editingTx ? 'Edit Transaksi' : 'Tambah Transaksi'}</h2>
          <p className="text-on-surface-variant dark:text-outline text-xs md:text-sm font-medium mt-0.5">Catat detail transaksi cerdas secara presisi dan sinkron dengan basis data.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Core Form (7 cols on desktop) */}
        <div className="lg:col-span-7 bg-surface-container-lowest/60 dark:bg-white/[0.02] backdrop-blur-xl border border-outline-variant/10 dark:border-white/10 rounded-3xl p-6 md:p-10 shadow-2xl relative overflow-hidden space-y-8">
          {/* Background radial glow accents for that luxury look */}
          <div className="absolute -right-24 -top-24 w-64 h-64 bg-primary/5 dark:bg-[#a7c8ff]/5 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute -left-24 -bottom-24 w-64 h-64 bg-[#a7c8ff]/5 dark:bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>

          <div className="space-y-8 z-10 relative">
            {/* Transaction Mode Toggles */}
            <div className="bg-surface-container-low dark:bg-white/5 p-1 rounded-full flex justify-between w-full shadow-inner border border-outline-variant/10 dark:border-white/10">
              {(editingTx ? ['pengeluaran', 'pemasukan'] : ['pengeluaran', 'pemasukan', 'transfer'] as const).map((type) => (
                <button 
                  key={type}
                  onClick={() => setTransactionType(type)}
                  className={`flex-1 text-center py-2.5 rounded-full text-sm font-bold capitalize transition-all active:scale-95 cursor-pointer ${
                    transactionType === type 
                      ? 'bg-primary dark:bg-[#a7c8ff] text-white dark:text-[#001b3c] shadow-md' 
                      : 'text-on-surface-variant dark:text-slate-300 hover:bg-surface-container-low dark:hover:bg-white/10'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>

            {/* Nominal Input */}
            <div className="space-y-3 text-center">
              <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant dark:text-outline block">Nominal Transaksi</label>
              <div className="flex items-baseline justify-center gap-2 border-b-2 border-primary-container/10 dark:border-white/10 pb-4 focus-within:border-primary dark:focus-within:border-[#a7c8ff] transition-all group max-w-md mx-auto">
                <span className="font-headline text-2xl font-bold text-on-surface-variant dark:text-slate-400 group-focus-within:text-primary dark:group-focus-within:text-[#a7c8ff] transition-colors">Rp</span>
                <input 
                  className={`w-full bg-transparent border-none p-0 font-headline font-extrabold text-primary dark:text-[#a7c8ff] text-center tabular-nums focus:ring-0 placeholder:text-surface-container-high dark:placeholder:text-white/20 transition-all duration-200 ${getFontSizeClass(amount.length)}`} 
                  placeholder="0" 
                  type="text" 
                  value={amount}
                  onChange={handleAmountChange}
                />
              </div>
            </div>

            {/* Grid for Core Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2 text-left">
                <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant dark:text-outline">
                  {transactionType === 'transfer' ? 'Akun Sumber (Dari)' : 'Pilih Akun'}
                </label>
                <SearchableSelect
                  options={accountOptions}
                  value={account}
                  onChange={setAccount}
                  placeholder="Pilih rekening..."
                  searchPlaceholder="Cari rekening..."
                  noOptionsMessage="Rekening tidak ditemukan"
                />
              </div>

              <div className="space-y-2 text-left">
                {transactionType === 'transfer' ? (
                  <>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant dark:text-outline">Akun Tujuan (Ke)</label>
                    <SearchableSelect
                      options={toAccountOptions}
                      value={toAccount}
                      onChange={setToAccount}
                      placeholder="Pilih rekening tujuan..."
                      searchPlaceholder="Cari rekening tujuan..."
                      noOptionsMessage="Rekening tujuan tidak ditemukan"
                    />
                  </>
                ) : (
                  <>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant dark:text-outline">Kategori</label>
                    <SearchableSelect
                      options={categoryOptions}
                      value={category}
                      onChange={setCategory}
                      placeholder="Pilih kategori..."
                      searchPlaceholder="Cari kategori..."
                      noOptionsMessage="Kategori tidak ditemukan"
                    />
                  </>
                )}
              </div>

              <div className="space-y-2 text-left">
                <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant dark:text-outline">Tanggal</label>
                <input value={date} onChange={(e) => setDate(e.target.value)} className="w-full bg-surface-container-low dark:bg-white/5 border-none rounded-xl py-3.5 px-4 text-on-surface dark:text-white font-medium focus:ring-2 focus:ring-primary-container/20 dark:focus:ring-white/20 transition-all [color-scheme:light] dark:[color-scheme:dark] cursor-pointer" type="date" />
              </div>

              <div className="space-y-2 text-left">
                <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant dark:text-outline">Transaksi Berulang</label>
                <div className="relative group">
                  <select className="w-full bg-surface-container-low dark:bg-white/5 border-none rounded-xl py-3.5 px-4 text-on-surface dark:text-white font-medium appearance-none focus:ring-2 focus:ring-primary-container/20 dark:focus:ring-white/20 transition-all cursor-pointer">
                    <option className="bg-surface-container dark:bg-slate-900 text-on-surface dark:text-white">Tidak Berulang</option>
                    <option className="bg-surface-container dark:bg-slate-900 text-on-surface dark:text-white">Harian</option>
                    <option className="bg-surface-container dark:bg-slate-900 text-on-surface dark:text-white">Mingguan</option>
                    <option className="bg-surface-container dark:bg-slate-900 text-on-surface dark:text-white">Bulanan</option>
                  </select>
                  <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant dark:text-outline">repeat</span>
                </div>
              </div>
            </div>

            <div className="space-y-2 text-left">
              <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant dark:text-outline">Deskripsi (Opsional)</label>
              <textarea 
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                className="w-full bg-surface-container-low dark:bg-white/5 border-none rounded-xl py-4 px-4 text-on-surface dark:text-white font-medium focus:ring-2 focus:ring-primary-container/20 dark:focus:ring-white/20 placeholder:text-outline-variant dark:placeholder:text-white/30 transition-all" 
                placeholder="Contoh: Makan siang dengan klien di Senayan City" 
                rows={3}
              ></textarea>
            </div>

            {/* Action Buttons inside Form */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <button 
                onClick={handleSave}
                disabled={isSaving}
                className="flex-grow py-4 rounded-xl bg-gradient-to-r from-primary to-primary-container dark:from-[#a7c8ff] dark:to-[#82b1ff] text-white dark:text-[#001b3c] font-bold tracking-tight shadow-lg shadow-primary-container/20 dark:shadow-[#a7c8ff]/20 hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:active:scale-100 cursor-pointer"
              >
                <span className="material-symbols-outlined text-xl">{isSaving ? 'sync' : 'save'}</span>
                {isSaving ? 'Menyimpan...' : 'Simpan Transaksi'}
              </button>
              <button 
                onClick={onBack}
                className="px-8 py-4 rounded-xl bg-transparent border-2 border-outline-variant/30 dark:border-white/20 text-on-surface-variant dark:text-slate-300 font-bold hover:bg-surface-container-low dark:hover:bg-white/10 active:scale-[0.98] transition-all cursor-pointer text-center"
              >
                Batalkan
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Live Projection, Receipts Voucher Preview, and Budgets (5 cols on desktop) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Pratinyau Voucher Transaksi (Interactive Receipt) */}
          <div className="bg-gradient-to-br from-primary/5 via-primary-container/2 to-transparent dark:from-white/5 dark:via-white/[0.01] dark:to-transparent border border-outline-variant/10 dark:border-white/5 rounded-3xl p-6 relative overflow-hidden shadow-lg space-y-6">
            {/* Glow indicator behind it based on transactionType */}
            <div 
              className="absolute -right-16 -top-16 w-48 h-48 rounded-full blur-3xl pointer-events-none transition-all duration-500"
              style={{
                background: transactionType === 'pengeluaran' 
                  ? 'rgba(186, 26, 26, 0.12)' 
                  : transactionType === 'pemasukan' 
                    ? 'rgba(46, 125, 50, 0.12)' 
                    : 'rgba(21, 101, 192, 0.12)'
              }}
            ></div>

            <div className="flex justify-between items-center z-10 relative">
              <span className="text-[10px] font-bold text-on-surface-variant dark:text-outline uppercase tracking-widest">Pratinjau Voucher</span>
              <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider ${
                transactionType === 'pengeluaran'
                  ? 'bg-error-container/25 text-error dark:text-[#ffb4ab]'
                  : transactionType === 'pemasukan'
                    ? 'bg-emerald-500/10 text-emerald-500'
                    : 'bg-primary-container/30 text-primary dark:text-[#a7c8ff]'
              }`}>
                {transactionType}
              </span>
            </div>

            <div className="space-y-4 text-center py-6 border-b border-dashed border-outline-variant/20 dark:border-white/10 z-10 relative">
              <div className="w-16 h-16 rounded-full bg-surface-container-low dark:bg-white/5 mx-auto flex items-center justify-center shadow-inner relative">
                <span className="material-symbols-outlined text-3xl text-primary dark:text-[#a7c8ff]">
                  {transactionType === 'transfer' ? 'swap_horiz' : (currentCategories.find(c => c.name === category)?.icon || 'receipt_long')}
                </span>
              </div>
              
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-on-surface-variant dark:text-outline uppercase tracking-wider">Estimasi Jumlah</span>
                <h3 className={`font-headline font-extrabold tabular-nums transition-all duration-300 ${
                  transactionType === 'pengeluaran' 
                    ? 'text-error dark:text-[#ffb4ab]' 
                    : transactionType === 'pemasukan' 
                      ? 'text-emerald-500 dark:text-emerald-400' 
                      : 'text-primary dark:text-[#a7c8ff]'
                } ${
                  amount.length > 15 
                    ? 'text-xl' 
                    : amount.length > 12 
                      ? 'text-2xl' 
                      : 'text-3xl'
                }`}>
                  {transactionType === 'pengeluaran' ? '-' : transactionType === 'pemasukan' ? '+' : ''}Rp {rawAmount.toLocaleString('id-ID')}
                </h3>
              </div>
            </div>

            <div className="space-y-3.5 z-10 relative text-left">
              {transactionType === 'transfer' ? (
                <>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-on-surface-variant dark:text-outline font-medium">Akun Pengirim (Dari)</span>
                    <span className="font-semibold text-on-surface dark:text-white">{account || 'Belum dipilih'}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-on-surface-variant dark:text-outline font-medium">Akun Penerima (Ke)</span>
                    <span className="font-semibold text-on-surface dark:text-white">{toAccount || 'Belum dipilih'}</span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between items-center text-xs">
                  <span className="text-on-surface-variant dark:text-outline font-medium">Akun/Rekening</span>
                  <span className="font-semibold text-on-surface dark:text-white">{account || 'Belum dipilih'}</span>
                </div>
              )}

              <div className="flex justify-between items-center text-xs">
                <span className="text-on-surface-variant dark:text-outline font-medium">Kategori</span>
                <span className="font-semibold text-on-surface dark:text-white flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm">
                    {transactionType === 'transfer' ? 'swap_horiz' : (currentCategories.find(c => c.name === category)?.icon || 'receipt_long')}
                  </span>
                  {transactionType === 'transfer' ? 'Transfer Saldo' : translateCategory(category, isIndo)}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-on-surface-variant dark:text-outline font-medium">Tanggal Transaksi</span>
                <span className="font-semibold text-on-surface dark:text-white">{date ? new Date(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}</span>
              </div>
              <div className="flex justify-between items-start text-xs pt-2 border-t border-outline-variant/10 dark:border-white/5">
                <span className="text-on-surface-variant dark:text-outline font-medium">Keterangan</span>
                <span className="font-semibold text-on-surface dark:text-white max-w-[200px] text-right break-words italic">
                  {desc ? `"${desc}"` : '"Transaksi tanpa deskripsi tambahan"'}
                </span>
              </div>
            </div>

            {/* Visual QR / Barcode Strip below for hyper-premium looks */}
            <div className="pt-2 border-t border-outline-variant/10 dark:border-white/5 opacity-40 dark:opacity-30 flex flex-col items-center gap-1.5 z-10 relative">
              {/* Simulated barcode lines */}
              <div className="flex gap-[2px] h-6 w-full justify-center overflow-hidden">
                {[1, 2.5, 1, 4, 1.5, 3, 1, 2.5, 1.5, 4, 1, 3.5, 1.5, 2, 1, 4, 1.5, 3, 1, 2.5, 1, 4, 1.5, 3, 1, 2.5].map((w, idx) => (
                  <div 
                    key={idx} 
                    className="bg-on-surface dark:bg-white h-full" 
                    style={{ width: `${w}px` }}
                  />
                ))}
              </div>
              <span className="font-mono text-[7px] tracking-[0.4em] uppercase text-on-surface dark:text-white">TX-{Math.random().toString(36).substring(2, 8).toUpperCase()}</span>
            </div>
          </div>

          {/* Info Saldo & Anggaran - Sleek Integrated Glass Panel */}
          {account && (
            <div className="bg-primary/5 dark:bg-white/[0.02] border border-primary/10 dark:border-white/5 rounded-3xl p-6 space-y-4 shadow-md transition-all duration-300">
              {transactionType === 'transfer' && toAccount ? (
                <div className="space-y-3.5">
                  {/* Akun Sumber */}
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-on-surface-variant dark:text-outline font-semibold flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm">remove_circle</span>
                      Saldo Dari: {account}
                    </span>
                    <span className="font-bold tabular-nums text-on-surface dark:text-white flex items-center gap-1">
                      <span>Rp {currentBalance.toLocaleString('id-ID')}</span>
                      <span className="text-outline-variant dark:text-outline font-medium mx-1">→</span>
                      <span className={estimatedBalance < 0 ? "text-error dark:text-[#ffb4ab]" : "text-primary dark:text-[#a7c8ff]"}>
                        Rp {estimatedBalance.toLocaleString('id-ID')}
                      </span>
                    </span>
                  </div>
                  {/* Akun Tujuan */}
                  {(() => {
                    const toAccObj = accounts.find(a => a.name === toAccount);
                    const toAccBalance = toAccObj ? toAccObj.balance : 0;
                    const toAccEstimated = toAccBalance + rawAmount;
                    return (
                      <div className="flex justify-between items-center text-xs pt-3 border-t border-outline-variant/10 dark:border-white/5">
                        <span className="text-on-surface-variant dark:text-outline font-semibold flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-sm text-emerald-500">add_circle</span>
                          Saldo Ke: {toAccount}
                        </span>
                        <span className="font-bold tabular-nums text-on-surface dark:text-white flex items-center gap-1">
                          <span>Rp {toAccBalance.toLocaleString('id-ID')}</span>
                          <span className="text-outline-variant dark:text-outline font-medium mx-1">→</span>
                          <span className="text-emerald-500 dark:text-emerald-400">
                            Rp {toAccEstimated.toLocaleString('id-ID')}
                          </span>
                        </span>
                      </div>
                    );
                  })()}
                </div>
              ) : (
                <div className="flex justify-between items-center text-xs">
                  <span className="text-on-surface-variant dark:text-outline font-semibold flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm">account_balance_wallet</span>
                    Saldo {account}
                  </span>
                  <span className="font-bold tabular-nums text-on-surface dark:text-white flex items-center gap-1">
                    <span>Rp {currentBalance.toLocaleString('id-ID')}</span>
                    <span className="text-outline-variant dark:text-outline font-medium mx-1">→</span>
                    <span className={estimatedBalance < 0 ? "text-error dark:text-[#ffb4ab]" : "text-primary dark:text-[#a7c8ff]"}>
                      Rp {estimatedBalance.toLocaleString('id-ID')}
                    </span>
                  </span>
                </div>
              )}
              
              {transactionType === 'pengeluaran' && (
                <div className="pt-3 border-t border-outline-variant/10 dark:border-white/5">
                  <div className="flex justify-between items-center text-[10px] uppercase tracking-wider text-on-surface-variant dark:text-outline font-bold mb-1.5">
                    <span>Anggaran Kategori: {translateCategory(category, isIndo)}</span>
                    <span>{usagePercent}% terpakai</span>
                  </div>
                  <div className="h-2 w-full bg-surface-container-high dark:bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-primary to-primary-container dark:from-[#a7c8ff] dark:to-[#82b1ff] rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(0,64,128,0.2)]" 
                      style={{ width: `${usagePercent}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <FinancePinModal 
        isOpen={showPinModal}
        onClose={() => setShowPinModal(false)}
        onSuccess={executeSave}
        savedPin={savedPin}
        title="Otorisasi Transaksi"
      />
    </div>
  );
};

export default FinanceAddTransaction;
