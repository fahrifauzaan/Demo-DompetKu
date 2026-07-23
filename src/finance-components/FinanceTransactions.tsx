import React, { useState, useMemo, useEffect } from 'react';
import { FeatureCTA } from './MarketingCTAModal';

interface FinanceTransactionsProps {
  onShowCTA: (feature?: FeatureCTA) => void;
  onNavigate?: (tab: string) => void;
  onEditTransaction?: (id: string) => void;
}
import { useFinanceStore } from '../store/useFinanceStore';
import FinancePinModal from './FinancePinModal';
import RecurringManagerModal from './RecurringManagerModal';
import CsvImportModal from './CsvImportModal';
import SubscriptionScannerModal from './SubscriptionScannerModal';
import { dueRecurrings } from './recurringUtils';

const FinanceTransactions: React.FC<FinanceTransactionsProps> = ({ onShowCTA, onNavigate, onEditTransaction }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showPinModal, setShowPinModal] = useState(false);
  const settings = useFinanceStore(state => state.settings);
  const isPinActive = settings.find(s => s.key === 'security_pinActive')?.value === 'true';
  const savedPin = settings.find(s => s.key === 'security_pin')?.value || '';
  const [selectedAccount, setSelectedAccount] = useState('Semua Akun');
  const [selectedType, setSelectedType] = useState('Semua Tipe');
  const [selectedMonth, setSelectedMonth] = useState('Semua Bulan');
  const [selectedYear, setSelectedYear] = useState('Semua Tahun');
  const [showActionId, setShowActionId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isRecurringOpen, setIsRecurringOpen] = useState(false);
  const [isCsvOpen, setIsCsvOpen] = useState(false);
  const [isSubScanOpen, setIsSubScanOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const recurring = useFinanceStore((s) => s.recurring);
  const recurringDueCount = useMemo(() => dueRecurrings(recurring).length, [recurring]);
  const PER_PAGE = 15;

  const { transactions, deleteTransaction, accounts, setLedgerPrintTransactions, setPrintType, updateAccount, budgetCategories } = useFinanceStore();

  const formatRp = (n: number) => 'Rp ' + Math.round(n || 0).toLocaleString('id-ID');

  // Custom robust date parser for Indonesian & English date string formats in the database
  const parseDateString = (dateStr: string) => {
    if (!dateStr) return { day: '', month: '', year: '' };
    const trimmed = dateStr.trim();
    
    // 1. Standard ISO format YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
      const parts = trimmed.split('-');
      const year = parts[0];
      const monthIndex = parseInt(parts[1], 10) - 1;
      const monthNamesIndo = [
        'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
        'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'
      ];
      const month = monthNamesIndo[monthIndex] || '';
      
      // Parse day part, removing any time component (e.g., '26T08:00:00.000Z' -> 26)
      const dayPart = parts[2].split(/[tT\s]+/)[0];
      const dayVal = parseInt(dayPart, 10);
      const day = isNaN(dayVal) ? '' : String(dayVal);
      
      return { day, month, year };
    }

    // 2. Space or hyphen separated formats (e.g. 26-Jan-2026 or 23 Mar 2024)
    const parts = trimmed.split(/[\s-]+/);
    if (parts.length >= 3) {
      let year = '';
      let month = '';
      let day = '';
      
      // Find 4-digit year
      const yearPart = parts.find(p => /^\d{4}$/.test(p));
      if (yearPart) {
        year = yearPart;
      }
      
      // Find month part
      const monthNamesIndo = [
        'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
        'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'
      ];
      const monthNamesEng = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
      ];
      
      const monthPart = parts.find(p => /^[a-zA-Z]{3,}/.test(p));
      if (monthPart) {
        const prefix = monthPart.slice(0, 3);
        const matchedIdx = monthNamesIndo.findIndex(m => m.toLowerCase() === prefix.toLowerCase());
        if (matchedIdx !== -1) {
          month = monthNamesIndo[matchedIdx];
        } else {
          const matchedEngIdx = monthNamesEng.findIndex(m => m.toLowerCase() === prefix.toLowerCase());
          if (matchedEngIdx !== -1) {
            month = monthNamesIndo[matchedEngIdx];
          }
        }
      }

      // Find day part (1 or 2 digits)
      const dayPart = parts.find(p => /^\d{1,2}$/.test(p));
      if (dayPart) {
        day = String(parseInt(dayPart, 10));
      }
      
      return { day, month, year };
    }
    
    return { day: '', month: '', year: '' };
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const { day, month, year } = parseDateString(dateStr);
    if (day && month && year) {
      return `${day.padStart(2, '0')}-${month}-${year}`;
    }
    return dateStr;
  };

  // Generate dynamic unique years based on transaction history
  const uniqueYears = useMemo(() => {
    const years = new Set<string>();
    transactions.forEach(t => {
      if (t.date) {
        const { year } = parseDateString(t.date);
        if (year) {
          years.add(year);
        }
      }
    });
    // Fallback to current year if no transactions
    if (years.size === 0) {
      years.add(new Date().getFullYear().toString());
    }
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    const res = transactions.filter(t => {
      const matchesSearch = t.desc.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          t.location.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesAccount = selectedAccount === 'Semua Akun' || t.account === selectedAccount;
      const matchesType = selectedType === 'Semua Tipe' || t.type === selectedType.toUpperCase();
      
      let matchesMonth = true;
      let matchesYear = true;
      
      if (t.date) {
        const { month, year } = parseDateString(t.date);
        if (selectedMonth !== 'Semua Bulan') {
          matchesMonth = String(month).trim().toLowerCase() === String(selectedMonth).trim().toLowerCase();
        }
        if (selectedYear !== 'Semua Tahun') {
          matchesYear = String(year).trim() === String(selectedYear).trim();
        }
      } else if (selectedMonth !== 'Semua Bulan' || selectedYear !== 'Semua Tahun') {
        // Exclude missing dates if filter is active
        return false;
      }
      
      return matchesSearch && matchesAccount && matchesType && matchesMonth && matchesYear;
    });
    return res;
  }, [searchQuery, selectedAccount, selectedType, selectedMonth, selectedYear, transactions]);

  // ---- Pagination (15 per halaman) ----
  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / PER_PAGE));
  const clampedPage = Math.min(currentPage, totalPages);
  const pageStart = (clampedPage - 1) * PER_PAGE;
  const pagedTransactions = filteredTransactions.slice(pageStart, pageStart + PER_PAGE);
  // Reset ke halaman 1 saat filter/pencarian berubah
  useEffect(() => { setCurrentPage(1); }, [searchQuery, selectedAccount, selectedType, selectedMonth, selectedYear]);
  // Nomor halaman ringkas (window di sekitar halaman aktif)
  const pageNumbers = useMemo(() => {
    const win = 2;
    const set = new Set<number>([1, totalPages]);
    for (let p = clampedPage - win; p <= clampedPage + win; p++) if (p >= 1 && p <= totalPages) set.add(p);
    return Array.from(set).sort((a, b) => a - b);
  }, [clampedPage, totalPages]);

  // ---- Ringkasan bulan aktif terakhir (dari data asli user) ----
  const monthlyStats = useMemo(() => {
    const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];
    const isExp = (t: any) => t.amount < 0 && t.type !== 'TRANSFER';
    const totalBudget = (budgetCategories || [])
      .filter((c: any) => c.type === 'Pengeluaran')
      .reduce((s: number, c: any) => s + (Number(c.allocated) || 0), 0);
    const parsed = transactions
      .map((t) => {
        const { month, year } = parseDateString(t.date || '');
        const y = parseInt(year, 10);
        const mi = MONTHS.indexOf(month);
        return { t, key: !isNaN(y) && mi >= 0 ? y * 12 + mi : -1 };
      })
      .filter((x) => x.key >= 0);
    if (parsed.length === 0) return { hasData: false as const, totalBudget };
    const refKey = Math.max(...parsed.map((x) => x.key));
    const refLabel = `${MONTHS[refKey % 12]} ${Math.floor(refKey / 12)}`;
    const inRef = parsed.filter((x) => x.key === refKey).map((x) => x.t);
    const inPrev = parsed.filter((x) => x.key === refKey - 1).map((x) => x.t);
    const sumExp = (arr: any[]) => arr.filter(isExp).reduce((s, t) => s + Math.abs(t.amount), 0);
    const refExp = sumExp(inRef);
    const prevExp = sumExp(inPrev);
    const payeeMap: Record<string, { total: number; count: number }> = {};
    const catMap: Record<string, number> = {};
    inRef.filter(isExp).forEach((t) => {
      const p = (t.desc || 'Lainnya').trim();
      (payeeMap[p] = payeeMap[p] || { total: 0, count: 0 });
      payeeMap[p].total += Math.abs(t.amount);
      payeeMap[p].count += 1;
      const c = (t.category || 'Lainnya').trim();
      catMap[c] = (catMap[c] || 0) + Math.abs(t.amount);
    });
    const topPayeeE = Object.entries(payeeMap).sort((a, b) => b[1].total - a[1].total)[0];
    const topCatE = Object.entries(catMap).sort((a, b) => b[1] - a[1])[0];
    return {
      hasData: true as const,
      refLabel,
      refExp,
      refCount: inRef.filter(isExp).length,
      pctVs: prevExp > 0 ? Math.round(((refExp - prevExp) / prevExp) * 100) : null,
      topPayee: topPayeeE ? { name: topPayeeE[0], total: topPayeeE[1].total, count: topPayeeE[1].count } : null,
      topCat: topCatE ? { name: topCatE[0], total: topCatE[1], pct: refExp > 0 ? Math.round((topCatE[1] / refExp) * 100) : 0 } : null,
      totalBudget,
      budgetPct: totalBudget > 0 ? Math.round((refExp / totalBudget) * 100) : null,
    };
  }, [transactions, budgetCategories]);

  const executeDelete = async () => {
    const txToDelete = transactions.find(t => t.id === deletingId);
    if (txToDelete) {
      const accToUpdate = accounts.find(a => a.name === txToDelete.account);
      if (accToUpdate) {
        await updateAccount({
          ...accToUpdate,
          balance: accToUpdate.balance - txToDelete.amount
        });
      }
      await deleteTransaction(deletingId);
    }
    setDeletingId(null);
    setShowPinModal(false);
  };

  const handleDownloadCSV = () => {
    if (filteredTransactions.length === 0) {
      alert("Tidak ada data transaksi untuk diekspor pada filter ini.");
      return;
    }

    const headers = ['ID', 'Tanggal', 'Deskripsi', 'Kategori', 'Tipe', 'Akun', 'Nominal', 'Status', 'Lokasi'];
    const rows = filteredTransactions.map(t => [
      t.id,
      t.date || '',
      `"${(t.desc || '').replace(/"/g, '""')}"`,
      t.category || '',
      t.type || '',
      t.account || '',
      t.amount,
      t.status || '',
      `"${(t.location || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(',') + '\n' 
      + rows.map(e => e.join(',')).join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `DompetKu_Log_Transaksi_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setIsExportModalOpen(false);
  };

  const handlePrintPDF = () => {
    if (filteredTransactions.length === 0) {
      alert("Tidak ada data transaksi untuk dicetak pada filter ini.");
      return;
    }
    setLedgerPrintTransactions(filteredTransactions);
    setPrintType('ledger');
    setIsExportModalOpen(false);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  return (
    <div className="space-y-5 sm:space-y-6 md:space-y-8 lg:space-y-12 animate-in fade-in duration-500 pb-8 lg:pb-12">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-6">
        <div className="space-y-1.5 md:space-y-2">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-headline font-extrabold tracking-tight text-on-surface dark:text-white">Log Transaksi</h1>
          <p className="text-on-surface-variant dark:text-outline max-w-md text-[13px] sm:text-sm lg:text-base">Tinjau dan kelola aktivitas keuangan Anda di semua akun dan entitas yang terhubung.</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 self-start md:self-auto">
          <button
            onClick={() => setIsRecurringOpen(true)}
            className="relative px-3 sm:px-4 lg:px-5 py-2.5 bg-surface-container-highest dark:bg-white/10 text-on-surface-variant dark:text-white font-semibold rounded-lg flex items-center gap-2 hover:bg-surface-variant dark:hover:bg-white/20 transition-colors text-xs sm:text-sm"
          >
            <span className="material-symbols-outlined text-[1.2rem]">sync</span>
            <span className="hidden sm:inline">Berulang</span>
            {recurringDueCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-amber-500 text-white text-[10px] font-black flex items-center justify-center">{recurringDueCount}</span>
            )}
          </button>
          <button
            onClick={() => setIsExportModalOpen(true)}
            className="px-3 sm:px-4 lg:px-5 py-2.5 bg-surface-container-highest dark:bg-white/10 text-on-surface-variant dark:text-white font-semibold rounded-lg flex items-center gap-2 hover:bg-surface-variant dark:hover:bg-white/20 transition-colors text-xs sm:text-sm"
          >
            <span className="material-symbols-outlined text-[1.2rem]">download</span>
            Ekspor
          </button>
          <button
            onClick={() => setIsCsvOpen(true)}
            className="px-3 sm:px-4 lg:px-5 py-2.5 bg-surface-container-highest dark:bg-white/10 text-on-surface-variant dark:text-white font-semibold rounded-lg flex items-center gap-2 hover:bg-surface-variant dark:hover:bg-white/20 transition-colors text-xs sm:text-sm"
          >
            <span className="material-symbols-outlined text-[1.2rem]">upload_file</span>
            <span className="hidden sm:inline">Impor</span>
          </button>
          <button
            onClick={() => setIsSubScanOpen(true)}
            title="Pindai langganan berulang"
            className="px-3 sm:px-4 lg:px-5 py-2.5 bg-surface-container-highest dark:bg-white/10 text-on-surface-variant dark:text-white font-semibold rounded-lg flex items-center gap-2 hover:bg-surface-variant dark:hover:bg-white/20 transition-colors text-xs sm:text-sm"
          >
            <span className="material-symbols-outlined text-[1.2rem]">frame_inspect</span>
            <span className="hidden sm:inline">Langganan</span>
          </button>
          <button onClick={() => onNavigate && onNavigate('add-transaction')} className="bg-gradient-to-r from-primary to-primary-container dark:from-[#a7c8ff] dark:to-[#82b1ff] text-white dark:text-[#001b3c] px-4 sm:px-6 py-2.5 sm:py-3 rounded-full font-bold shadow-lg shadow-primary-container/20 dark:shadow-[#a7c8ff]/20 hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center gap-2 text-xs sm:text-sm">
            <span className="material-symbols-outlined text-lg sm:text-xl">add</span>
            <span className="hidden sm:block">Transaksi Baru</span>
            <span className="sm:hidden">Tambah</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Section - Apple Glassmorphism */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 p-4 sm:p-5 lg:p-6 liquid-glass rounded-2xl sm:rounded-3xl border border-white/20 dark:border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)]">
        <div className="space-y-1.5 lg:col-span-1 sm:col-span-2">
          <label className="text-[10px] lg:text-xs font-bold uppercase tracking-wider text-on-surface-variant dark:text-outline ml-1">Cari</label>
          <div className="relative group">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline text-[1.2rem] opacity-70">search</span>
            <input 
              className="w-full pl-12 pr-4 py-3 bg-white/50 dark:bg-black/20 backdrop-blur-xl border border-white/40 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-primary/50 text-sm shadow-inner transition-all dark:text-white outline-none placeholder-slate-400 dark:placeholder-slate-500" 
              placeholder="Deskripsi atau merchant..." 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] lg:text-xs font-bold uppercase tracking-wider text-on-surface-variant dark:text-outline ml-1">Akun</label>
          <select 
            className="w-full py-3 px-4 bg-white/50 dark:bg-black/20 backdrop-blur-xl border border-white/40 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-primary/50 text-sm shadow-inner transition-all dark:text-white outline-none appearance-none cursor-pointer"
            value={selectedAccount}
            onChange={(e) => setSelectedAccount(e.target.value)}
          >
            <option value="Semua Akun" className="bg-surface-container dark:bg-slate-900 text-on-surface dark:text-white">Semua Akun</option>
            {accounts.map(acc => (
              <option key={acc.id} value={acc.name} className="bg-surface-container dark:bg-slate-900 text-on-surface dark:text-white">{acc.name}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] lg:text-xs font-bold uppercase tracking-wider text-on-surface-variant dark:text-outline ml-1">Tipe</label>
          <select 
            className="w-full py-3 px-4 bg-white/50 dark:bg-black/20 backdrop-blur-xl border border-white/40 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-primary/50 text-sm shadow-inner transition-all dark:text-white outline-none appearance-none cursor-pointer"
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
          >
            <option value="Semua Tipe" className="bg-surface-container dark:bg-slate-900 text-on-surface dark:text-white">Semua Tipe</option>
            <option value="Pengeluaran" className="bg-surface-container dark:bg-slate-900 text-on-surface dark:text-white">Pengeluaran</option>
            <option value="Pemasukan" className="bg-surface-container dark:bg-slate-900 text-on-surface dark:text-white">Pemasukan</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] lg:text-xs font-bold uppercase tracking-wider text-on-surface-variant dark:text-outline ml-1">Rentang Waktu</label>
          <div className="flex gap-2">
            <select 
              className="flex-1 py-3 px-4 bg-white/50 dark:bg-black/20 backdrop-blur-xl border border-white/40 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-primary/50 text-sm shadow-inner transition-all dark:text-white outline-none appearance-none cursor-pointer"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            >
              <option value="Semua Bulan" className="bg-surface-container dark:bg-slate-900 text-on-surface dark:text-white">Semua Bulan</option>
              {['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'].map(m => (
                <option key={m} value={m} className="bg-surface-container dark:bg-slate-900 text-on-surface dark:text-white">{m}</option>
              ))}
            </select>
            <select 
              className="flex-1 py-3 px-4 bg-white/50 dark:bg-black/20 backdrop-blur-xl border border-white/40 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-primary/50 text-sm shadow-inner transition-all dark:text-white outline-none appearance-none cursor-pointer"
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
            >
              <option value="Semua Tahun" className="bg-surface-container dark:bg-slate-900 text-on-surface dark:text-white">Semua Tahun</option>
              {uniqueYears.map(yr => (
                <option key={yr} value={yr} className="bg-surface-container dark:bg-slate-900 text-on-surface dark:text-white">{yr}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Transaction Table Section - Apple Glassmorphism */}
      <div className="liquid-glass rounded-3xl overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] border border-white/20 dark:border-white/10 min-h-[400px]">
        <div className="overflow-x-auto relative z-10">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low dark:bg-white/5 backdrop-blur-md text-slate-900 dark:text-slate-200 text-[10px] lg:text-xs font-black uppercase tracking-widest hidden sm:table-row border-b border-outline-variant/30 dark:border-white/10">
                <th className="px-4 lg:px-6 py-4 whitespace-nowrap">Tanggal</th>
                <th className="px-4 lg:px-6 py-4 whitespace-nowrap">Deskripsi</th>
                <th className="px-4 lg:px-6 py-4 whitespace-nowrap">Akun</th>
                <th className="px-4 lg:px-6 py-4 whitespace-nowrap">Status</th>
                <th className="px-4 lg:px-6 py-4 whitespace-nowrap">Kategori</th>
                <th className="px-4 lg:px-6 py-4 text-right whitespace-nowrap">Jumlah</th>
                <th className="px-2 lg:px-4 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/20 dark:divide-white/5">
              {pagedTransactions.map((t, idx) => (
                <tr key={`${t.id}-${idx}`} className="hover:bg-surface-container-lowest dark:hover:bg-white/10 transition-colors flex flex-col sm:table-row p-4 sm:p-0">
                  <td className="px-0 sm:px-4 lg:px-6 py-1 sm:py-5 font-bold text-xs lg:text-sm text-slate-900 dark:text-slate-200 order-2 sm:order-none whitespace-nowrap">{formatDate(t.date)}</td>
                  <td className="px-0 sm:px-4 lg:px-6 py-1 sm:py-5 order-1 sm:order-none w-full sm:w-auto">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-full bg-slate-100 dark:bg-white/10 border border-slate-300 dark:border-white/20 flex items-center justify-center flex-shrink-0 shadow-sm">
                        <span className="material-symbols-outlined text-primary dark:text-[#a7c8ff] text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>{t.icon}</span>
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-extrabold text-slate-900 dark:text-white text-base sm:text-sm whitespace-normal line-clamp-2 break-words" title={t.desc}>{t.desc}</span>
                        <span className="text-[10px] lg:text-xs font-semibold text-slate-600 dark:text-slate-300 whitespace-normal line-clamp-1 break-words">{t.location}</span>
                      </div>
                    </div>
                  </td>
                  <td className="hidden sm:table-cell px-4 lg:px-6 py-5 text-xs lg:text-sm font-bold text-slate-900 dark:text-slate-200 capitalize whitespace-nowrap">{t.account}</td>
                  <td className="hidden sm:table-cell px-4 lg:px-6 py-5 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black tracking-wider border ${t.status === 'Selesai' ? 'bg-green-100 dark:bg-green-900/60 text-green-900 dark:text-green-100 border-green-300 dark:border-green-800/50' : 'bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-700'}`}>
                      {t.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="hidden sm:table-cell px-4 lg:px-6 py-5 whitespace-nowrap">
                    <span className="px-3 py-1.5 bg-slate-100 dark:bg-white/10 border border-slate-300 dark:border-white/20 text-slate-900 dark:text-slate-100 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-sm">{t.category}</span>
                  </td>
                  <td className={`px-0 sm:px-4 lg:px-6 py-2 sm:py-5 text-left sm:text-right font-headline font-black tabular-nums text-xl lg:text-base order-3 sm:order-none flex justify-between items-center whitespace-nowrap ${t.type === 'PEMASUKAN' ? 'text-green-700 dark:text-green-400' : 'text-slate-900 dark:text-white'}`}>
                    <span className="sm:hidden text-xs text-slate-600 dark:text-slate-400 font-bold uppercase">{t.type}</span>
                    {t.amount > 0 ? '+' : ''}Rp {t.amount.toLocaleString('id-ID')}
                  </td>
                  <td className="hidden sm:table-cell px-2 lg:px-4 py-5 text-right relative">
                    <button onClick={() => setShowActionId(showActionId === t.id ? null : t.id)} className="text-outline hover:text-primary transition-colors p-2 rounded-full hover:bg-surface-variant dark:hover:bg-white/10">
                      <span className="material-symbols-outlined">more_vert</span>
                    </button>
                    {showActionId === t.id && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setShowActionId(null)} />
                        <div className="absolute right-6 top-12 w-36 bg-white dark:bg-[#191c1e] shadow-xl rounded-xl border border-slate-200 dark:border-white/10 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                          <button 
                            onClick={() => {
                              setShowActionId(null);
                              onEditTransaction && onEditTransaction(t.id);
                            }}
                            className="w-full px-4 py-2.5 text-xs font-bold text-left hover:bg-slate-50 dark:hover:bg-white/5 flex items-center gap-2 dark:text-white"
                          >
                            <span className="material-symbols-outlined text-sm">edit</span> Edit
                          </button>
                          <button 
                            onClick={() => {
                              setShowActionId(null);
                              setDeletingId(t.id);
                            }}
                            className="w-full px-4 py-2.5 text-xs font-bold text-left hover:bg-red-50 dark:hover:bg-red-900/10 text-error flex items-center gap-2"
                          >
                            <span className="material-symbols-outlined text-sm">delete</span> Hapus
                          </button>
                        </div>
                      </>
                    )}
                  </td>
                </tr>
              ))}
              {filteredTransactions.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-20 text-center">
                    <div className="flex flex-col items-center gap-3 text-on-surface-variant dark:text-outline opacity-50">
                      <span className="material-symbols-outlined text-5xl">manage_search</span>
                      <p className="font-headline font-bold uppercase tracking-widest text-xs">Transaksi tidak ditemukan</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <div className="flex flex-col sm:flex-row items-center justify-between px-4 sm:px-6 py-3 sm:py-4 bg-white/30 dark:bg-black/20 backdrop-blur-md border-t border-white/40 dark:border-white/10 gap-3 sm:gap-4">
          <span className="text-xs lg:text-sm text-on-surface-variant dark:text-outline font-medium">
            Menampilkan {filteredTransactions.length === 0 ? 0 : pageStart + 1}–{Math.min(pageStart + PER_PAGE, filteredTransactions.length)} dari {filteredTransactions.length} transaksi
          </span>
          <div className="flex items-center gap-1 lg:gap-2">
            <button
              onClick={() => setCurrentPage(clampedPage - 1)}
              disabled={clampedPage <= 1}
              aria-label="Halaman sebelumnya"
              className="p-1 lg:p-2.5 text-on-surface-variant hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed rounded-lg hover:bg-surface-container dark:hover:bg-white/10 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm lg:text-base">chevron_left</span>
            </button>
            {pageNumbers.map((p, i) => (
              <React.Fragment key={p}>
                {i > 0 && p - pageNumbers[i - 1] > 1 && (
                  <span className="px-1 text-on-surface-variant dark:text-outline text-xs select-none">…</span>
                )}
                <button
                  onClick={() => setCurrentPage(p)}
                  className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    p === clampedPage
                      ? 'bg-primary dark:bg-[#a7c8ff] text-white dark:text-[#001b3c] shadow-sm'
                      : 'text-on-surface-variant hover:text-primary hover:bg-surface-container dark:hover:bg-white/10'
                  }`}
                >
                  {p}
                </button>
              </React.Fragment>
            ))}
            <button
              onClick={() => setCurrentPage(clampedPage + 1)}
              disabled={clampedPage >= totalPages}
              aria-label="Halaman berikutnya"
              className="p-1 lg:p-2.5 text-on-surface-variant hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed rounded-lg hover:bg-surface-container dark:hover:bg-white/10 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm lg:text-base">chevron_right</span>
            </button>
          </div>
        </div>
      </div>

      {/* Bento Summary Grid - Apple Glassmorphism */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
        <div className="p-4 sm:p-5 lg:p-6 liquid-glass rounded-2xl sm:rounded-3xl space-y-3 sm:space-y-4 border border-white/20 dark:border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] lg:text-xs font-bold uppercase text-on-surface-variant dark:text-outline tracking-wider">Pengeluaran {monthlyStats.hasData ? monthlyStats.refLabel : 'Bulanan'}</span>
            {monthlyStats.hasData && monthlyStats.pctVs !== null && (
              <span className={`text-[10px] lg:text-xs font-bold ${monthlyStats.pctVs > 0 ? 'text-error dark:text-[#ffb4ab]' : 'text-emerald-600 dark:text-emerald-400'}`}>{monthlyStats.pctVs > 0 ? '+' : ''}{monthlyStats.pctVs}% vs bulan sebelumnya</span>
            )}
          </div>
          <div className="text-2xl lg:text-3xl font-headline font-extrabold text-on-surface dark:text-white tabular-nums">{formatRp(monthlyStats.hasData ? monthlyStats.refExp : 0)}</div>
          <div className="h-2.5 w-full bg-white/50 dark:bg-black/30 backdrop-blur-md rounded-full overflow-hidden shadow-inner">
            <div className={`h-full rounded-full ${monthlyStats.hasData && monthlyStats.budgetPct !== null && monthlyStats.budgetPct > 100 ? 'bg-error/80' : 'bg-primary/80 dark:bg-primary/90'}`} style={{ width: `${monthlyStats.hasData && monthlyStats.budgetPct !== null ? Math.min(100, monthlyStats.budgetPct) : 0}%` }}></div>
          </div>
          <p className="text-[10px] lg:text-xs text-on-surface-variant dark:text-outline font-medium">
            {!monthlyStats.hasData
              ? 'Belum ada transaksi tercatat.'
              : monthlyStats.budgetPct !== null
              ? monthlyStats.budgetPct > 100
                ? `Melebihi total anggaran bulanan (${formatRp(monthlyStats.totalBudget)}).`
                : `Memakai ${monthlyStats.budgetPct}% dari total anggaran bulanan.`
              : `${monthlyStats.refCount} transaksi pengeluaran pada bulan ini.`}
          </p>
        </div>
        
        <div className="p-4 sm:p-5 lg:p-6 liquid-glass rounded-2xl sm:rounded-3xl space-y-3 sm:space-y-4 border border-white/20 dark:border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] lg:text-xs font-bold uppercase text-on-surface-variant dark:text-outline tracking-wider">Merchant Teratas</span>
            <span className="material-symbols-outlined text-outline">shopping_cart</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-surface-container-highest dark:bg-white/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary dark:text-[#a7c8ff]">store</span>
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-on-surface dark:text-white text-sm lg:text-base truncate max-w-[170px]">{monthlyStats.topPayee ? monthlyStats.topPayee.name : '—'}</span>
              <span className="text-[10px] lg:text-xs text-on-surface-variant dark:text-outline font-medium">{monthlyStats.topPayee ? `${monthlyStats.topPayee.count} transaksi bulan ini` : 'Belum ada data'}</span>
            </div>
          </div>
          <div className="text-xl lg:text-2xl font-headline font-bold text-on-surface dark:text-white tabular-nums">{formatRp(monthlyStats.topPayee ? monthlyStats.topPayee.total : 0)}</div>
        </div>
        
        <div className="p-4 sm:p-5 lg:p-6 liquid-glass rounded-2xl sm:rounded-3xl flex flex-col justify-between border border-white/20 dark:border-white/10 lg:col-span-1 md:col-span-2 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)]">
          <div className="space-y-2">
            <span className="text-[10px] lg:text-xs font-bold uppercase text-on-surface-variant dark:text-outline tracking-wider flex items-center gap-2">
              <span className="material-symbols-outlined text-sm text-tertiary-fixed">tips_and_updates</span>
              Wawasan Cepat
            </span>
            <p className="text-sm text-on-surface dark:text-slate-300 leading-relaxed font-medium">
              {monthlyStats.hasData && monthlyStats.topCat
                ? <>Kategori <strong className="dark:text-white">{monthlyStats.topCat.name}</strong> menyerap pengeluaran terbesar Anda: <strong className="dark:text-white">{formatRp(monthlyStats.topCat.total)}</strong> ({monthlyStats.topCat.pct}% dari pengeluaran {monthlyStats.refLabel}).</>
                : 'Tambahkan transaksi untuk melihat wawasan pengeluaran otomatis Anda di sini.'}
            </p>
          </div>
          <button
            onClick={() => onNavigate ? onNavigate('analytics') : onShowCTA({ title: "Deep Financial Analytics", description: "Audit menyeluruh terhadap kebiasaan belanja Anda." })}
            className="mt-6 text-xs font-bold text-primary dark:text-[#a7c8ff] flex items-center gap-1 hover:underline active:opacity-80 transition-opacity w-fit"
          >
            LIHAT ANALITIK DETAIL
            <span className="material-symbols-outlined text-[14px]">trending_up</span>
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deletingId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface-container-lowest dark:bg-[#191c1e] w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 zoom-in-95 duration-200 border border-outline-variant/10 dark:border-white/10 p-8">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-6 text-error dark:text-[#ffb4ab]">
                <span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
              </div>
              <h3 className="text-xl font-bold font-headline text-on-surface dark:text-white mb-2">Hapus Transaksi?</h3>
              <p className="text-sm text-on-surface-variant dark:text-outline mb-8">Transaksi ini akan dihapus secara permanen dari sistem dan database Google Sheets Anda. Tindakan ini tidak dapat dibatalkan.</p>
              <div className="flex gap-3 w-full">
                <button 
                  onClick={() => setDeletingId(null)}
                  className="flex-1 py-3 bg-surface-container dark:bg-white/10 text-on-surface-variant dark:text-outline rounded-xl font-bold hover:bg-surface-bright dark:hover:bg-white/20 transition-colors active:scale-95"
                >
                  Batal
                </button>
                <button 
                  onClick={() => {
                    if (isPinActive && savedPin) {
                      setShowPinModal(true);
                    } else {
                      executeDelete();
                    }
                  }}
                  className="flex-1 py-3 bg-error text-white rounded-xl font-bold hover:opacity-90 active:scale-95 transition-all"
                >
                  Ya, Hapus
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Export Modal */}
      {isExportModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface-container-lowest dark:bg-[#191c1e] w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 zoom-in-95 duration-200 border border-outline-variant/10 dark:border-white/10 p-8">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center mb-6 text-primary dark:text-[#a7c8ff]">
                <span className="material-symbols-outlined text-3xl">download</span>
              </div>
              <h3 className="text-xl font-bold font-headline text-on-surface dark:text-white mb-2">Ekspor Data</h3>
              <p className="text-sm text-on-surface-variant dark:text-outline mb-8">Pilih format ekspor untuk data transaksi yang telah Anda filter.</p>
              
              <div className="flex flex-col gap-3 w-full mb-6">
                <button 
                  onClick={handleDownloadCSV}
                  className="w-full py-3.5 px-4 bg-surface-container dark:bg-white/5 border border-outline-variant/50 dark:border-white/10 rounded-xl flex items-center justify-between hover:bg-surface-container-high dark:hover:bg-white/10 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-green-600 dark:text-green-400">table_chart</span>
                    <div className="flex flex-col items-start">
                      <span className="text-sm font-bold text-on-surface dark:text-white">Format .CSV</span>
                      <span className="text-[10px] text-on-surface-variant dark:text-outline">Untuk Excel / Google Sheets</span>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-outline group-hover:text-primary transition-colors">chevron_right</span>
                </button>

                <button 
                  onClick={handlePrintPDF}
                  className="w-full py-3.5 px-4 bg-surface-container dark:bg-white/5 border border-outline-variant/50 dark:border-white/10 rounded-xl flex items-center justify-between hover:bg-surface-container-high dark:hover:bg-white/10 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-red-600 dark:text-red-400">picture_as_pdf</span>
                    <div className="flex flex-col items-start">
                      <span className="text-sm font-bold text-on-surface dark:text-white">Format .PDF</span>
                      <span className="text-[10px] text-on-surface-variant dark:text-outline">Desain Rekening Koran Bank</span>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-outline group-hover:text-primary transition-colors">chevron_right</span>
                </button>
              </div>

              <button 
                onClick={() => setIsExportModalOpen(false)}
                className="w-full py-3 bg-transparent text-on-surface-variant dark:text-outline rounded-xl font-bold hover:bg-surface-container dark:hover:bg-white/10 transition-colors"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
      <FinancePinModal 
        isOpen={showPinModal}
        onClose={() => setShowPinModal(false)}
        onSuccess={executeDelete}
        savedPin={savedPin}
        title="Otorisasi Hapus"
        subtitle="Masukkan PIN Anda untuk menghapus transaksi ini."
      />
      <RecurringManagerModal isOpen={isRecurringOpen} onClose={() => setIsRecurringOpen(false)} />
      <CsvImportModal isOpen={isCsvOpen} onClose={() => setIsCsvOpen(false)} />
      <SubscriptionScannerModal isOpen={isSubScanOpen} onClose={() => setIsSubScanOpen(false)} />
    </div>
  );
};

export default FinanceTransactions;
