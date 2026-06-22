import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ResponsiveContainer, ComposedChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine } from 'recharts';
import { useFinanceStore } from '../store/useFinanceStore';

interface DebtFreedomModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalDebts: number;
  totalMinPayment: number;
  currentSavings: number;
}

const formatCurrency = (value: number) => {
  return `Rp ${Math.round(value).toLocaleString('id-ID')}`;
};

// Subcomponent for Accordion Items
interface AccordionItemProps {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  activeSection: string;
  setActiveSection: (id: string) => void;
  children: React.ReactNode;
}

const AccordionItem: React.FC<AccordionItemProps> = ({
  id,
  title,
  subtitle,
  icon,
  activeSection,
  setActiveSection,
  children
}) => {
  const isOpen = activeSection === id;
  return (
    <div className="border-b border-outline-variant/10 dark:border-white/5 pb-4 last:border-b-0 last:pb-0">
      <button
        onClick={() => setActiveSection(isOpen ? '' : id)}
        className="w-full flex items-center justify-between py-3 text-left focus:outline-none cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-error dark:text-[#ffb4ab] text-2xl bg-error-container/20 dark:bg-white/5 p-2 rounded-xl">
            {icon}
          </span>
          <div>
            <h4 className="text-sm font-black text-on-surface dark:text-white">{title}</h4>
            <p className="text-[10px] text-on-surface-variant dark:text-slate-400 font-medium">{subtitle}</p>
          </div>
        </div>
        <span 
          className="material-symbols-outlined transition-transform duration-300 text-on-surface-variant" 
          style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
        >
          expand_more
        </span>
      </button>
      
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="pt-3 pb-2 space-y-4 px-1">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const FinanceDebtFreedomModal: React.FC<DebtFreedomModalProps> = ({
  isOpen,
  onClose,
  totalDebts,
  totalMinPayment,
  currentSavings
}) => {
  const [activeSection, setActiveSection] = useState<string>('debts');

  // Format helpers for typable text input formatting
  const formatInputNumber = (val: number) => {
    if (val === 0) return '0';
    return val.toLocaleString('id-ID');
  };

  const parseInputNumber = (str: string) => {
    const clean = str.replace(/\D/g, '');
    return Number(clean) || 0;
  };
  
  // local sandbox list of debts to protect original store data
  const [debtsList, setDebtsList] = useState<Array<{ 
    id: string, 
    name: string, 
    balance: number, 
    interestRate: number, 
    minPayment: number,
    interestType: 'effective' | 'flat',
    originalAmount: number
  }>>([]);
  
  const [payoffMethod, setPayoffMethod] = useState<'snowball' | 'avalanche' | 'proportional'>('avalanche');
  const [extraPayment, setExtraPayment] = useState(0);

  // Editing form states for dynamic debt modification
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editBalance, setEditBalance] = useState(0);
  const [editRate, setEditRate] = useState(0);
  const [editMin, setEditMin] = useState(0);
  const [editType, setEditType] = useState<'effective' | 'flat'>('effective');
  const [editOriginal, setEditOriginal] = useState(0);

  const realDebts = useFinanceStore((state) => state.debts);

  // Sync real debts initially, or inject CFP presets if user has Rp0 debts
  useEffect(() => {
    if (isOpen) {
      if (realDebts && realDebts.length > 0) {
        setDebtsList(
          realDebts.map((d) => ({
            id: d.id,
            name: d.name,
            balance: d.balance,
            interestRate: d.interestRate || 12,
            minPayment: d.minPayment || Math.round(d.balance * 0.03), // 3% estimation
            interestType: (d.interestType === 'flat' || d.type === 'KMT' || d.type === 'KTA') ? 'flat' : 'effective',
            originalAmount: d.originalAmount || d.balance
          }))
        );
      } else {
        // Set up standard mock portfolio to let users understand payoff mechanisms
        setDebtsList([
          { id: 'mock1', name: 'Kartu Kredit Mandiri', balance: 12000000, interestRate: 18.0, minPayment: 400000, interestType: 'effective', originalAmount: 12000000 },
          { id: 'mock2', name: 'Kredit Motor Fif', balance: 22000000, interestRate: 11.5, minPayment: 680000, interestType: 'flat', originalAmount: 22000000 },
          { id: 'mock3', name: 'Pinjol TunaiKu', balance: 6000000, interestRate: 24.0, minPayment: 380000, interestType: 'effective', originalAmount: 6000000 }
        ]);
      }
      setPayoffMethod('avalanche');
      setExtraPayment(Math.max(300000, Math.round(currentSavings * 0.2)));
      setActiveSection('debts');
    }
  }, [isOpen, realDebts, currentSavings]);

  const startEdit = (debt: any) => {
    setEditingId(debt.id);
    setEditName(debt.name);
    setEditBalance(debt.balance);
    setEditRate(debt.interestRate);
    setEditMin(debt.minPayment);
    setEditType(debt.interestType || 'effective');
    setEditOriginal(debt.originalAmount || debt.balance);
  };

  const saveEdit = () => {
    setDebtsList(prev => prev.map(d => {
      if (d.id === editingId) {
        return {
          ...d,
          name: editName,
          balance: Math.max(0, Number(editBalance)),
          interestRate: Math.max(0, Number(editRate)),
          minPayment: Math.max(0, Number(editMin)),
          interestType: editType,
          originalAmount: Math.max(0, Number(editOriginal || editBalance))
        };
      }
      return d;
    }));
    setEditingId(null);
  };

  const deleteDebt = (id: string) => {
    setDebtsList(prev => prev.filter(d => d.id !== id));
    if (editingId === id) setEditingId(null);
  };

  const addDebt = () => {
    const newId = Date.now().toString();
    const newD = { 
      id: newId, 
      name: 'Utang Baru', 
      balance: 5000000, 
      interestRate: 12.0, 
      minPayment: 150000,
      interestType: 'effective' as const,
      originalAmount: 5000000
    };
    setDebtsList(prev => [...prev, newD]);
    startEdit(newD);
  };

  // Aggregate current stats of the list
  const totalBalanceSum = useMemo(() => {
    return debtsList.reduce((acc, curr) => acc + curr.balance, 0);
  }, [debtsList]);

  const minPaymentsSum = useMemo(() => {
    return debtsList.reduce((acc, curr) => acc + curr.minPayment, 0);
  }, [debtsList]);

  // General calculator helper to compute payoff trajectory for any method/extra payment
  const runTrajectory = (method: 'snowball' | 'avalanche' | 'proportional', extra: number) => {
    let list = debtsList.map(d => ({ ...d }));
    const dataPoints: number[] = [];
    let reachMonth: number | null = null;
    let totalInterest = 0;
    let isDebtTrap = false;

    const minTotal = list.reduce((acc, curr) => acc + curr.minPayment, 0);
    const fixedMonthlyBudget = minTotal + extra;

    // Check month 0
    const sum0 = list.reduce((acc, curr) => acc + curr.balance, 0);
    dataPoints.push(Math.round(sum0));

    // Run for max 240 months (20 Years) to support KPR (housing loans)
    for (let month = 1; month <= 240; month++) {
      const activeDebts = list.filter(d => d.balance > 0);

      if (activeDebts.length === 0) {
        if (reachMonth === null) reachMonth = month - 1;
        dataPoints.push(0);
        continue;
      }

      // 1. Accrue monthly interest (support Flat & Effective)
      let totalInterestThisMonth = 0;
      activeDebts.forEach(d => {
        const rate = (d.interestRate / 100) / 12;
        const interest = d.interestType === 'flat'
          ? d.originalAmount * rate
          : d.balance * rate;

        totalInterestThisMonth += interest;
        totalInterest += interest;
        d.balance += interest;
      });

      // 2. Pay minimums
      let totalPaidThisMonth = 0;
      activeDebts.forEach(d => {
        const pay = Math.min(d.balance, d.minPayment);
        d.balance -= pay;
        totalPaidThisMonth += pay;
      });

      // 3. Allocate extra budget (fixedMonthlyBudget - total minimums actually paid)
      let extraPool = Math.max(0, fixedMonthlyBudget - totalPaidThisMonth);

      if (extraPool > 0) {
        if (method === 'avalanche') {
          // Sort active debts by interest rate descending
          const sorted = [...activeDebts].filter(d => d.balance > 0).sort((a, b) => b.interestRate - a.interestRate);
          for (let d of sorted) {
            if (extraPool <= 0) break;
            const payExtra = Math.min(d.balance, extraPool);
            d.balance -= payExtra;
            extraPool -= payExtra;
          }
        } else if (method === 'snowball') {
          // Sort active debts by balance ascending
          const sorted = [...activeDebts].filter(d => d.balance > 0).sort((a, b) => a.balance - b.balance);
          for (let d of sorted) {
            if (extraPool <= 0) break;
            const payExtra = Math.min(d.balance, extraPool);
            d.balance -= payExtra;
            extraPool -= payExtra;
          }
        } else if (method === 'proportional') {
          const stillActive = activeDebts.filter(d => d.balance > 0);
          const totalStillActive = stillActive.reduce((acc, curr) => acc + curr.balance, 0);
          if (totalStillActive > 0) {
            stillActive.forEach(d => {
              const share = d.balance / totalStillActive;
              const payExtra = Math.min(d.balance, extraPool * share);
              d.balance -= payExtra;
            });
          }
        }
      }

      // Check if minimum payments don't cover interest (Debt Trap)
      const currentMinTotalExpected = activeDebts.reduce((acc, curr) => acc + curr.minPayment, 0);
      if (totalInterestThisMonth >= (currentMinTotalExpected + (extra > 0 ? extra : 0))) {
        isDebtTrap = true;
      }

      const postPayoffSum = list.reduce((acc, curr) => acc + curr.balance, 0);
      dataPoints.push(Math.round(postPayoffSum));
    }

    return { dataPoints, reachMonth, totalInterest, isDebtTrap };
  };

  // Main paydown simulator engine comparing Scenario A (Min Only) vs Scenario B (Chosen Strategy + Extra)
  const simulation = useMemo(() => {
    // 1. Scenario A: Minimum payments only (represented by proportional payoff with extra = 0)
    const minOnly = runTrajectory('proportional', 0);

    // 2. Scenario B (Avalanche)
    const avalanche = runTrajectory('avalanche', extraPayment);

    // 3. Scenario B (Snowball)
    const snowball = runTrajectory('snowball', extraPayment);

    // 4. Scenario B (Proportional)
    const proportional = runTrajectory('proportional', extraPayment);

    // Determine chosen strategy outputs
    let chosen = avalanche;
    if (payoffMethod === 'snowball') chosen = snowball;
    if (payoffMethod === 'proportional') chosen = proportional;

    // Build chart data up to the maximum month reached by either minOnly or chosen strategy
    const chartLength = Math.min(240, Math.max((minOnly.reachMonth || 60), (chosen.reachMonth || 60)) + 3);
    const dataPoints: Array<{ month: string, minBalance: number, extraBalance: number }> = [];

    for (let month = 0; month < chartLength; month++) {
      dataPoints.push({
        month: `Bln ${month}`,
        minBalance: minOnly.dataPoints[month] !== undefined ? minOnly.dataPoints[month] : 0,
        extraBalance: chosen.dataPoints[month] !== undefined ? chosen.dataPoints[month] : 0
      });
    }

    const interestSaved = Math.max(0, minOnly.totalInterest - chosen.totalInterest);
    const timeSavedMonths = (minOnly.reachMonth !== null && chosen.reachMonth !== null) 
      ? minOnly.reachMonth - chosen.reachMonth 
      : 0;

    // Initial interest month 0 (to check debt trap warning at startup)
    const initialInterestMonth0 = debtsList.reduce((acc, curr) => {
      const rate = (curr.interestRate / 100) / 12;
      return acc + (curr.interestType === 'flat' ? curr.originalAmount * rate : curr.balance * rate);
    }, 0);

    return {
      dataPoints,
      monthMin: minOnly.reachMonth,
      monthExtra: chosen.reachMonth,
      totalInterestPaidA: minOnly.totalInterest,
      totalInterestPaidB: chosen.totalInterest,
      interestSaved,
      timeSavedMonths,
      isMinDebtTrap: minOnly.isDebtTrap,
      isExtraDebtTrap: chosen.isDebtTrap,
      initialInterestMonth0,
      
      // Comparative details for Robo-Advisor
      avalancheMonth: avalanche.reachMonth,
      avalancheInterest: avalanche.totalInterest,
      snowballMonth: snowball.reachMonth,
      snowballInterest: snowball.totalInterest
    };
  }, [debtsList, payoffMethod, extraPayment, minPaymentsSum]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 overflow-hidden">
        {/* Backdrop */}
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/85 backdrop-blur-md"
          onClick={onClose}
        />

        {/* Modal Window */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.96, y: 40 }} 
          animate={{ opacity: 1, scale: 1, y: 0 }} 
          exit={{ opacity: 0, scale: 0.96, y: 40 }}
          transition={{ type: 'spring', damping: 28, stiffness: 240 }}
          className="relative w-full max-w-7xl h-[calc(100vh-1rem)] sm:h-[95vh] md:h-[90vh] bg-surface dark:bg-[#121416] rounded-2xl sm:rounded-[28px] md:rounded-[36px] shadow-2xl overflow-y-auto md:overflow-hidden flex flex-col md:flex-row border border-outline-variant/20 dark:border-white/10"
        >
          {/* LEFT PANEL: CONFIGURATION */}
          <div className="w-full md:w-[45%] bg-surface-container-lowest dark:bg-black/30 p-5 md:p-6 border-b md:border-b-0 md:border-r border-outline-variant/10 dark:border-white/5 overflow-y-visible md:overflow-y-auto custom-scrollbar flex flex-col h-auto md:h-full">
            
            {/* Header */}
            <div className="flex justify-between items-center mb-5">
              <div>
                <h2 className="text-xl md:text-2xl font-black font-headline text-error dark:text-[#ffb4ab] flex items-center gap-2">
                  <span className="material-symbols-outlined text-3xl">credit_score</span>
                  Proyeksi Bebas Utang
                </h2>
                <p className="text-[10px] text-on-surface-variant dark:text-slate-400 font-bold uppercase tracking-wider">Simulasi Skenario & Roll-up Bunga</p>
              </div>
              <button 
                onClick={onClose} 
                className="w-9 h-9 rounded-full bg-surface-container hover:bg-surface-container-high dark:bg-white/5 flex items-center justify-center text-on-surface transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            {/* Config List */}
            <div className="space-y-4 flex-1">
              
              {/* ACCORDION 1: DEBT SANDBOX TABLE */}
              <AccordionItem
                id="debts"
                title="1. Rincian Utang (Sandbox Mode)"
                subtitle={`Total: ${formatCurrency(totalBalanceSum)} | Min: ${formatCurrency(minPaymentsSum)}/Bln`}
                icon="account_balance_wallet"
                activeSection={activeSection}
                setActiveSection={setActiveSection}
              >
                <div className="space-y-3">
                  <p className="text-[10px] text-on-surface-variant/80 italic leading-snug">
                    Sesuaikan rincian utang di bawah ini untuk melihat simulasi. Perubahan di sini tidak akan mengedit data asli Anda.
                  </p>

                  <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1 custom-scrollbar">
                    {debtsList.map((debt) => (
                      <div 
                        key={debt.id} 
                        className="p-3 rounded-2xl bg-surface-container-low dark:bg-white/[0.02] border border-outline-variant/10 flex flex-col gap-2"
                      >
                        {editingId === debt.id ? (
                          /* INLINE EDIT FORM */
                          <div className="space-y-2">
                            <input 
                              type="text" 
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              placeholder="Nama Utang"
                              className="w-full text-xs bg-surface-container dark:bg-black/40 text-on-surface border border-outline-variant/20 rounded-lg p-1.5 font-bold"
                            />
                            
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-[9px] font-bold text-on-surface-variant uppercase">Sifat Bunga</label>
                                <select 
                                  value={editType}
                                  onChange={(e) => {
                                    setEditType(e.target.value as any);
                                    if (e.target.value === 'flat') {
                                      setEditOriginal(editBalance);
                                    }
                                  }}
                                  className="w-full text-xs bg-surface-container dark:bg-black/40 text-on-surface border border-outline-variant/20 rounded-lg p-1.5 font-bold cursor-pointer"
                                >
                                  <option value="effective">Efektif (Outstanding)</option>
                                  <option value="flat">Flat (Plafon Awal)</option>
                                </select>
                              </div>
                              {editType === 'flat' ? (
                                <div>
                                  <label className="text-[9px] font-bold text-on-surface-variant uppercase">Plafon Pinjaman Awal</label>
                                  <input 
                                    type="text" 
                                    value={formatInputNumber(editOriginal)}
                                    onChange={(e) => setEditOriginal(parseInputNumber(e.target.value))}
                                    className="w-full text-xs bg-surface-container dark:bg-black/40 text-on-surface border border-outline-variant/20 rounded-lg p-1.5 font-bold"
                                  />
                                </div>
                              ) : (
                                <div>
                                  <label className="text-[9px] font-bold text-on-surface-variant uppercase">Bunga % p.a.</label>
                                  <input 
                                    type="number" 
                                    step="0.5"
                                    value={editRate}
                                    onChange={(e) => setEditRate(Number(e.target.value))}
                                    className="w-full text-xs bg-surface-container dark:bg-black/40 text-on-surface border border-outline-variant/20 rounded-lg p-1.5"
                                  />
                                </div>
                              )}
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-[9px] font-bold text-on-surface-variant uppercase">Sisa Saldo Saat Ini</label>
                                  <input 
                                    type="text" 
                                    value={formatInputNumber(editBalance)}
                                    onChange={(e) => setEditBalance(parseInputNumber(e.target.value))}
                                    className="w-full text-xs bg-surface-container dark:bg-black/40 text-on-surface border border-outline-variant/20 rounded-lg p-1.5"
                                  />
                              </div>
                              <div>
                                <label className="text-[9px] font-bold text-on-surface-variant uppercase">Cicilan Min</label>
                                  <input 
                                    type="text" 
                                    value={formatInputNumber(editMin)}
                                    onChange={(e) => setEditMin(parseInputNumber(e.target.value))}
                                    className="w-full text-xs bg-surface-container dark:bg-black/40 text-on-surface border border-outline-variant/20 rounded-lg p-1.5"
                                  />
                              </div>
                            </div>

                            {editType === 'flat' && (
                              <div>
                                <label className="text-[9px] font-bold text-on-surface-variant uppercase">Bunga % p.a. (Flat)</label>
                                <input 
                                  type="number" 
                                  step="0.5"
                                  value={editRate}
                                  onChange={(e) => setEditRate(Number(e.target.value))}
                                  className="w-full text-xs bg-surface-container dark:bg-black/40 text-on-surface border border-outline-variant/20 rounded-lg p-1.5"
                                />
                              </div>
                            )}

                            <div className="flex justify-end gap-2 pt-1 border-t border-outline-variant/10">
                              <button 
                                onClick={() => setEditingId(null)}
                                className="text-[10px] font-bold text-on-surface-variant hover:underline"
                              >
                                Batal
                              </button>
                              <button 
                                onClick={saveEdit}
                                className="px-2.5 py-1 text-[10px] font-black bg-primary text-on-primary rounded-lg shadow"
                              >
                                Simpan
                              </button>
                            </div>
                          </div>
                        ) : (
                          /* STANDARD DEBT VIEW ROW */
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="text-xs font-bold text-on-surface dark:text-white flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-error"></span>
                                {debt.name}
                                <span className={`text-[8px] font-black px-1 py-0.2 rounded-full border ${
                                  debt.interestType === 'flat' 
                                    ? 'text-amber-500 bg-amber-500/10 border-amber-500/20' 
                                    : 'text-blue-500 bg-blue-500/10 border-blue-500/20'
                                }`}>
                                  {debt.interestType === 'flat' ? 'Flat' : 'Efektif'}
                                </span>
                              </p>
                              <div className="flex items-center gap-3 text-[10px] text-on-surface-variant dark:text-slate-400 mt-1">
                                <span>Saldo: <strong>{formatCurrency(debt.balance)}</strong></span>
                                <span>Bunga: <strong>{debt.interestRate}% p.a.</strong></span>
                                <span>Min: <strong>{formatCurrency(debt.minPayment)}/Bln</strong></span>
                              </div>
                            </div>
                            <div className="flex gap-1.5">
                              <button 
                                onClick={() => startEdit(debt)}
                                className="text-on-surface-variant hover:text-primary p-1 bg-surface-container-high dark:bg-white/5 rounded-lg transition-colors cursor-pointer"
                              >
                                <span className="material-symbols-outlined text-[14px]">edit</span>
                              </button>
                              <button 
                                onClick={() => deleteDebt(debt.id)}
                                className="text-on-surface-variant hover:text-error p-1 bg-surface-container-high dark:bg-white/5 rounded-lg transition-colors cursor-pointer"
                              >
                                <span className="material-symbols-outlined text-[14px]">delete</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <button 
                    onClick={addDebt}
                    className="w-full py-2.5 rounded-xl border border-dashed border-outline-variant/30 text-on-surface-variant hover:border-primary hover:text-primary transition-all text-xs font-bold flex items-center justify-center gap-1 bg-white/[0.01]"
                  >
                    <span className="material-symbols-outlined text-base">add</span>
                    Tambah Utang Simulasi
                  </button>
                </div>
              </AccordionItem>

              {/* ACCORDION 2: STRATEGY & EXTRA PAYMENTS */}
              <AccordionItem
                id="strategy"
                title="2. Metode Pelunasan & Ekstra"
                subtitle={`Taktik: ${payoffMethod.toUpperCase()} | Ekstra: +${formatCurrency(extraPayment)}/Bln`}
                icon="finance"
                activeSection={activeSection}
                setActiveSection={setActiveSection}
              >
                {/* Method selector */}
                <div className="space-y-2">
                  <label className="text-[11px] font-black uppercase text-on-surface-variant dark:text-slate-400">Strategi Pelunasan</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'avalanche', title: '⚡ Avalanche', sub: 'Bunga Tertinggi' },
                      { id: 'snowball', title: '❄️ Snowball', sub: 'Saldo Terkecil' },
                      { id: 'proportional', title: '📊 Proporsional', sub: 'Bagi Rata' }
                    ].map((met) => (
                      <button
                        key={met.id}
                        onClick={() => setPayoffMethod(met.id as any)}
                        className={`p-2.5 rounded-xl border text-center transition-all ${
                          payoffMethod === met.id
                            ? 'bg-error-container/20 border-error text-error dark:text-[#ffb4ab]'
                            : 'bg-surface-container-low dark:bg-white/5 border-outline-variant/10 text-on-surface text-xs font-bold'
                        }`}
                      >
                        <p className="text-[10px] font-black">{met.title}</p>
                        <p className="text-[8px] opacity-75 mt-0.5 leading-none">{met.sub}</p>
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-on-surface-variant/80 italic leading-snug">
                    {payoffMethod === 'avalanche' 
                      ? 'Avalanche mengalokasikan setoran ekstra ke utang dengan bunga paling tinggi terlebih dahulu. Secara matematis paling menghemat biaya bunga.'
                      : payoffMethod === 'snowball'
                      ? 'Snowball mengalokasikan setoran ekstra ke utang dengan nominal terkecil dahulu. Memberikan kemenangan cepat secara psikologis.'
                      : 'Membagi sisa ekstra setoran secara proporsional ke semua utang aktif berdasarkan porsi saldonya.'}
                  </p>
                </div>

                {/* Extra Payment Slider */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-bold text-on-surface-variant">Ekstra Pembayaran Bulanan</label>
                    <div className="flex items-center gap-1 bg-surface-container dark:bg-white/5 px-2.5 py-1 rounded-xl border border-outline-variant/10 focus-within:border-primary">
                      <span className="text-[10px] font-bold text-on-surface-variant">Rp</span>
                      <input 
                        type="text" 
                        value={formatInputNumber(extraPayment)} 
                        onChange={(e) => setExtraPayment(parseInputNumber(e.target.value))}
                        className="w-24 text-right text-xs font-bold text-on-surface dark:text-white bg-transparent outline-none border-none focus:ring-0"
                      />
                    </div>
                  </div>
                  <input 
                    type="range" min={0} max={10000000} step={100000} value={extraPayment} 
                    onChange={(e) => setExtraPayment(Number(e.target.value))}
                    className="w-full h-1 bg-surface-container-highest rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                  <div className="flex justify-between text-[11px] font-bold text-on-surface dark:text-slate-300 border-t border-outline-variant/10 dark:border-white/5 pt-2">
                    <span>Total Anggaran Bulanan:</span>
                    <span className="text-tertiary dark:text-[#ffb4ab]">{formatCurrency(minPaymentsSum + extraPayment)} / Bln</span>
                  </div>
                  <div className="p-3 bg-surface-container rounded-xl text-[9px] text-on-surface-variant leading-relaxed border border-outline-variant/10">
                    💡 <strong>CFP Tip - Freeze Payment:</strong> Simulasi ini menggunakan taktik mengunci nominal cicilan minimum awal secara konsisten. Meskipun saldo berkurang dan bank memperbolehkan cicilan min diturunkan, tetap membayar nominal yang sama akan mempercepat pelunasan utang secara eksponensial.
                  </div>
                </div>
              </AccordionItem>

            </div>

            {/* Bottom button */}
            <button 
              onClick={onClose} 
              className="mt-6 w-full hidden md:block py-3 rounded-2xl font-bold bg-surface-container-low hover:bg-surface-container dark:bg-white/5 dark:hover:bg-white/10 text-on-surface dark:text-white transition-all border border-outline-variant/20 cursor-pointer text-xs"
            >
              Tutup Simulator
            </button>
          </div>

          {/* RIGHT PANEL: VISUAL PROJECTIONS & ROBO-ADVISOR */}
          <div className="w-full md:w-[55%] p-5 md:p-6 flex flex-col bg-surface dark:bg-[#121416] overflow-y-visible md:overflow-y-auto custom-scrollbar h-auto md:h-full">
            <div className="flex-1 flex flex-col space-y-5">
              
              {/* ROBO-ADVISOR ADVICE CARD */}
              <div className={`p-4 rounded-3xl border transition-all duration-300 ${
                simulation.isMinDebtTrap 
                  ? 'bg-red-500/10 border-red-500/30 text-red-900 dark:text-red-400' 
                  : 'bg-green-500/10 border-green-500/30 text-green-900 dark:text-green-300'
              }`}>
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-3xl mt-0.5">
                    {simulation.isMinDebtTrap ? 'warning' : 'insights'}
                  </span>
                  <div className="flex-1 space-y-1.5">
                    <h3 className="text-[10px] font-black uppercase tracking-widest opacity-80">
                      Rekomendasi CFP & Robo-Advisor
                    </h3>
                    
                    {simulation.isMinDebtTrap ? (
                      <div className="space-y-1">
                        <p className="text-base font-black leading-snug font-headline">
                          🚨 Bahaya! Terjebak Amortisasi Negatif
                        </p>
                        <p className="text-[11px] leading-relaxed opacity-90">
                          Cicilan minimum Anda ({formatCurrency(minPaymentsSum)}) tidak menutupi bunga bulanan berjalan ({formatCurrency(simulation.initialInterestMonth0)}). Skenario ini memicu debt trap di mana saldo utang terus menumpuk. Anda wajib menambah setoran ekstra minimal <strong>{formatCurrency(simulation.initialInterestMonth0 - minPaymentsSum + 100000)}/bulan</strong> untuk meloloskan diri.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-base font-black leading-none font-headline">
                          {simulation.monthExtra !== null && simulation.monthExtra <= 240 ? (
                            <>Bebas Utang dalam <span className="text-xl font-black tabular-nums">{simulation.monthExtra}</span> Bulan</>
                          ) : (
                            'Lunas Lebih dari 20 Tahun'
                          )}
                        </p>
                        <p className="text-[11px] leading-relaxed opacity-90">
                          Dengan strategi <strong>{payoffMethod.toUpperCase()}</strong> dan ekstra {formatCurrency(extraPayment)}/bulan, Anda lunas dalam <strong>{simulation.monthExtra ?? '>240'} bulan</strong>.
                          {simulation.timeSavedMonths > 0 && (
                            <span> Anda lunas <strong>{simulation.timeSavedMonths} bulan lebih cepat</strong> dan menghemat biaya bunga sebesar <strong className="underline text-green-500 dark:text-[#4ade80]">{formatCurrency(simulation.interestSaved)}</strong> dibanding bayar minimum!</span>
                          )}
                        </p>
                        
                        {/* Side-by-side Strategy Comparison */}
                        <div className="bg-black/20 dark:bg-black/30 p-2.5 rounded-xl text-[10px] grid grid-cols-2 gap-3 border border-outline-variant/10 text-on-surface dark:text-slate-300">
                          <div>
                            <p className="font-black border-b border-outline-variant/10 pb-1 mb-1">⚡ Avalanche (Optimal Bunga)</p>
                            <p>Tenor: {simulation.avalancheMonth !== null && simulation.avalancheMonth <= 240 ? `${simulation.avalancheMonth} Bln` : '>20 Thn'}</p>
                            <p>Total Bunga: {formatCurrency(simulation.avalancheInterest)}</p>
                          </div>
                          <div>
                            <p className="font-black border-b border-outline-variant/10 pb-1 mb-1">❄️ Snowball (Psikologis)</p>
                            <p>Tenor: {simulation.snowballMonth !== null && simulation.snowballMonth <= 240 ? `${simulation.snowballMonth} Bln` : '>20 Thn'}</p>
                            <p>Total Bunga: {formatCurrency(simulation.snowballInterest)}</p>
                          </div>
                        </div>
                        
                        <p className="text-[9.5px] font-black italic opacity-95 text-primary dark:text-[#a7c8ff]">
                          {simulation.avalancheInterest < simulation.snowballInterest ? (
                            `* Rekomendasi CFP: Metode Avalanche menghemat Rp ${( (simulation.snowballInterest - simulation.avalancheInterest) / 1e6 ).toFixed(1)}Jt bunga lebih banyak dibanding Snowball.`
                          ) : (
                            '* Kedua metode menghasilkan total bunga yang serupa. Pilih Snowball untuk kepuasan melunasi akun kecil lebih cepat.'
                          )}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* THREE CORE METRICS GRID */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-surface-container-low dark:bg-white/[0.02] p-3.5 rounded-2xl border border-outline-variant/10 text-center">
                  <p className="text-[9px] font-bold text-on-surface-variant dark:text-slate-400 uppercase tracking-wider mb-1">Status Lunas</p>
                  <p className="text-sm font-extrabold text-on-surface dark:text-white">
                    {simulation.monthExtra === null || simulation.monthExtra > 240 ? '>20 Tahun' : `${simulation.monthExtra} Bln`}
                  </p>
                  <span className={`inline-block text-[8px] font-black px-1.5 py-0.5 rounded-full mt-1.5 border ${
                    simulation.monthExtra === null || simulation.monthExtra > 240
                      ? 'text-red-500 bg-red-500/10 border-red-500/20'
                      : 'text-green-500 bg-green-500/10 border-green-500/20'
                  }`}>
                    {simulation.monthExtra === null || simulation.monthExtra > 240 ? 'Bahaya' : 'Sangat Bagus'}
                  </span>
                </div>
                <div className="bg-surface-container-low dark:bg-white/[0.02] p-3.5 rounded-2xl border border-outline-variant/10 text-center">
                  <p className="text-[9px] font-bold text-on-surface-variant dark:text-slate-400 uppercase tracking-wider mb-1">Bunga Terbayar</p>
                  <p className="text-sm font-extrabold text-on-surface dark:text-white">{formatCurrency(simulation.totalInterestPaidB)}</p>
                  <span className="inline-block text-[8px] font-bold text-on-surface-variant/80 mt-2">
                    Total Skenario Pilihan
                  </span>
                </div>
                <div className="bg-surface-container-low dark:bg-white/[0.02] p-3.5 rounded-2xl border border-outline-variant/10 text-center">
                  <p className="text-[9px] font-bold text-on-surface-variant dark:text-slate-400 uppercase tracking-wider mb-1">Bunga Dihemat</p>
                  <p className="text-sm font-extrabold text-[#4ade80]">{formatCurrency(simulation.interestSaved)}</p>
                  <span className="inline-block text-[8px] font-bold text-green-500/80 mt-2">
                    Keuntungan Skenario
                  </span>
                </div>
              </div>

              {/* DEBT PAYOFF PROJECTION CHART */}
              <div className="flex-1 flex flex-col space-y-2">
                <div className="flex justify-between items-center px-1">
                  <h4 className="text-[10px] font-black text-on-surface-variant uppercase tracking-wider">
                    Kurva Penurunan Saldo Utang (Bayar Min vs Skenario Ekstra)
                  </h4>
                  <div className="flex items-center gap-3 text-[9px] font-bold text-on-surface-variant">
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-0.5 bg-red-400 border-dashed border-t border-red-400"></span> Bayar Minimum
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2 rounded-sm bg-green-500"></span> Skenario Pilihan
                    </span>
                  </div>
                </div>

                <div className="h-[260px] md:h-auto md:flex-1 w-full bg-surface-container-lowest dark:bg-black/20 rounded-2xl p-4 border border-outline-variant/10">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={simulation.dataPoints} margin={{ top: 15, right: 10, left: 10, bottom: 5 }}>
                      <defs>
                        <linearGradient id="colorMinGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorExtraGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#22c55e" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-outline-variant/20 dark:text-white/5" />
                      <XAxis 
                        dataKey="month" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: 'currentColor', fontSize: 10 }} 
                        className="text-on-surface-variant" 
                        minTickGap={20} 
                      />
                      <YAxis 
                        tickFormatter={formatCurrency} 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: 'currentColor', fontSize: 10 }} 
                        className="text-on-surface-variant" 
                        width={70} 
                      />
                      <Tooltip 
                        formatter={(val: number) => [formatCurrency(val), '']} 
                        contentStyle={{ 
                          borderRadius: '16px', 
                          backgroundColor: '#1b1e21', 
                          border: '1px solid rgba(255,255,255,0.1)',
                          color: '#fff',
                          fontSize: '11px'
                        }} 
                      />
                      
                      {/* Scenario A: Min payments */}
                      <Area 
                        type="monotone" 
                        dataKey="minBalance" 
                        name="Hanya Bayar Minimum" 
                        stroke="#f87171" 
                        strokeDasharray="4 4"
                        fill="url(#colorMinGrad)" 
                        strokeWidth={1.5} 
                      />
                      
                      {/* Scenario B: Extra payoff */}
                      <Area 
                        type="monotone" 
                        dataKey="extraBalance" 
                        name="Dengan Ekstra & Skenario" 
                        stroke="#22c55e" 
                        fill="url(#colorExtraGrad)" 
                        strokeWidth={2.5} 
                      />

                      {/* Payoff point mark */}
                      {simulation.monthExtra !== null && simulation.monthExtra <= 240 && (
                        <ReferenceLine 
                          x={`Bln ${simulation.monthExtra}`} 
                          stroke="#3b82f6" 
                          strokeDasharray="3 3" 
                          label={{ 
                            position: 'top', 
                            value: 'Lunas', 
                            fill: '#3b82f6', 
                            fontSize: 9, 
                            fontWeight: 'bold' 
                          }} 
                        />
                      )}
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>

            </div>
          </div>

        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default FinanceDebtFreedomModal;
