import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { NAV_ITEMS, SearchResult } from './FinanceData';
import { FinanceTab } from '../FinanceDemo';
import { useFinanceStore } from '../store/useFinanceStore';

interface FinanceSearchProps {
  onNavigate: (tab: FinanceTab) => void;
  onClose: () => void;
}

const FinanceSearch: React.FC<FinanceSearchProps> = ({ onNavigate, onClose }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Data NYATA milik pengguna. Dulu file ini mengimpor TRANSACTIONS_DATA/ASSETS_DATA dari FinanceData
  // (data contoh statis: "Apple Store Jakarta", "Porsche 911"), jadi pencarian global ⌘K tak pernah
  // menemukan transaksi/aset pengguna dan justru memunculkan entri palsu.
  const transactions = useFinanceStore((s) => s.transactions);
  const assets = useFinanceStore((s) => s.assets);
  const accounts = useFinanceStore((s) => s.accounts);
  const debts = useFinanceStore((s) => s.debts);
  const goals = useFinanceStore((s) => s.goals);

  useEffect(() => {
    inputRef.current?.focus();
    
    // Global keyboard listener to close
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  useEffect(() => {
    if (!query.trim()) {
      // Show default suggestions
      const suggestions: SearchResult[] = [
        ...NAV_ITEMS.slice(0, 3).map(item => ({
          id: `menu-${item.id}`,
          title: item.label,
          description: `Buka halaman ${item.label}`,
          icon: item.icon,
          category: 'Menu' as const,
          targetTab: item.id
        })),
        {
          id: 'action-add',
          title: 'Tambah Transaksi Baru',
          description: 'Catat pengeluaran atau pemasukan',
          icon: 'add_card',
          category: 'Aksi' as const,
          targetTab: 'add-transaction' as FinanceTab
        }
      ];
      setResults(suggestions);
      return;
    }

    const q = query.toLowerCase();
    const filtered: SearchResult[] = [];

    // Search Menus
    NAV_ITEMS.forEach(item => {
      if (item.label.toLowerCase().includes(q)) {
        filtered.push({
          id: `menu-${item.id}`,
          title: item.label,
          description: `Navigasi ke ${item.label}`,
          icon: item.icon,
          category: 'Menu',
          targetTab: item.id
        });
      }
    });

    const rp = (n: number) => `Rp ${Math.abs(Math.round(n || 0)).toLocaleString('id-ID')}`;

    // Transaksi NYATA (deskripsi, kategori, akun, lokasi) — terbaru dulu.
    [...transactions]
      .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))
      .forEach((t) => {
        const hay = `${t.desc || ''} ${t.category || ''} ${t.account || ''} ${t.location || ''}`.toLowerCase();
        if (!hay.includes(q)) return;
        filtered.push({
          id: `tx-${t.id}`,
          title: t.desc || '(tanpa keterangan)',
          description: `${t.date || ''} · ${t.category || '-'} · ${(t.amount || 0) < 0 ? '-' : '+'}${rp(t.amount || 0)}`,
          icon: t.icon || 'receipt_long',
          category: 'Transaksi',
          targetTab: 'transactions',
        });
      });

    // Aset NYATA (judul, ticker, lokasi/broker).
    assets.forEach((a) => {
      const hay = `${a.title || ''} ${a.ticker || ''} ${a.location || ''}`.toLowerCase();
      if (!hay.includes(q)) return;
      filtered.push({
        id: `asset-${a.id}`,
        title: a.title || '(aset tanpa nama)',
        description: `Nilai: ${rp(a.currentValue || 0)}${a.ticker ? ` · ${a.ticker}` : ''}`,
        icon: a.icon || 'account_balance',
        category: 'Aset',
        targetTab: 'assets',
      });
    });

    // Rekening / akun.
    accounts.forEach((a) => {
      if (!`${a.name || ''} ${a.type || ''}`.toLowerCase().includes(q)) return;
      filtered.push({
        id: `acc-${a.id}`,
        title: a.name,
        description: `Saldo: ${rp(a.balance || 0)}`,
        icon: a.icon || 'account_balance_wallet',
        category: 'Aset',
        targetTab: 'assets',
      });
    });

    // Utang.
    debts.forEach((d) => {
      if (!`${d.name || ''} ${d.type || ''}`.toLowerCase().includes(q)) return;
      filtered.push({
        id: `debt-${d.id}`,
        title: d.name,
        description: `Sisa pokok: ${rp(d.balance || 0)}`,
        icon: 'leaderboard',
        category: 'Aset',
        targetTab: 'debts',
      });
    });

    // Tujuan keuangan.
    goals.forEach((g) => {
      if (!(g.name || '').toLowerCase().includes(q)) return;
      filtered.push({
        id: `goal-${g.id}`,
        title: g.name,
        description: `Target: ${rp(g.targetAmount || 0)}`,
        icon: g.icon || 'flag',
        category: 'Aset',
        targetTab: 'goals',
      });
    });

    setResults(filtered.slice(0, 12));
    setSelectedIndex(0);
  }, [query, transactions, assets, accounts, debts, goals]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      setSelectedIndex(prev => (prev + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      setSelectedIndex(prev => (prev - 1 + results.length) % results.length);
    } else if (e.key === 'Enter') {
      if (results[selectedIndex]) {
        if (results[selectedIndex].targetTab) {
          onNavigate(results[selectedIndex].targetTab!);
          onClose();
        }
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-4 sm:pt-20 lg:pt-32 px-3 sm:px-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm"
      />
      
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-white/10"
      >
        <div className="flex items-center px-4 py-3 sm:py-4 border-b border-slate-200 dark:border-white/10">
          <span className="material-symbols-outlined text-slate-400 mr-3">search</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Cari transaksi, aset..."
            className="flex-1 bg-transparent border-none focus:outline-none text-slate-800 dark:text-white text-base sm:text-lg placeholder:text-slate-400 font-medium"
          />
          <div className="flex items-center gap-1 px-2 py-1 rounded bg-slate-100 dark:bg-white/5 text-[10px] font-bold text-slate-400">
            ESC
          </div>
        </div>

        <div className="max-h-[400px] overflow-y-auto py-2">
          {results.length > 0 ? (
            <div className="space-y-1 px-2">
              {results.map((result, index) => (
                <div
                  key={result.id}
                  onClick={() => {
                    if (result.targetTab) {
                      onNavigate(result.targetTab);
                      onClose();
                    }
                  }}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`flex items-center gap-4 p-3 rounded-xl cursor-pointer transition-colors ${
                    index === selectedIndex ? 'bg-primary/10 dark:bg-white/10' : 'hover:bg-slate-50 dark:hover:bg-white/5'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    index === selectedIndex ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400'
                  }`}>
                    <span className="material-symbols-outlined text-xl">{result.icon}</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800 dark:text-white text-sm">{result.title}</span>
                      <span className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-white/5 text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">
                        {result.category}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{result.description}</p>
                  </div>
                  {index === selectedIndex && (
                    <span className="material-symbols-outlined text-primary dark:text-[#a7c8ff] text-lg">keyboard_return</span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400">
              <span className="material-symbols-outlined text-4xl mb-2">search_off</span>
              <p className="text-sm font-medium">Tidak ada hasil ditemukan untuk "{query}"</p>
            </div>
          )}
        </div>

        <div className="px-4 py-3 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              <span className="material-symbols-outlined text-xs">keyboard_arrow_down</span>
              <span className="material-symbols-outlined text-xs">keyboard_arrow_up</span>
              Pilih
            </div>
            <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              <span className="material-symbols-outlined text-xs">keyboard_return</span>
              Buka
            </div>
          </div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Global Search v1.0</p>
        </div>
      </motion.div>
    </div>
  );
};

export default FinanceSearch;
