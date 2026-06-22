import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ResponsiveContainer, ComposedChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine } from 'recharts';

interface EmergencyModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCash: number;
  monthlyExpenses: number;
}

const formatCurrency = (value: number) => {
  return `Rp ${Math.round(value).toLocaleString('id-ID')}`;
};

// Subcomponent for Accordion Items to keep code clean and premium
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
          <span className="material-symbols-outlined text-primary dark:text-[#a7c8ff] text-2xl bg-primary-container/20 dark:bg-white/5 p-2 rounded-xl">
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

export const FinanceEmergencyModal: React.FC<EmergencyModalProps> = ({
  isOpen,
  onClose,
  currentCash,
  monthlyExpenses
}) => {
  const [activeSection, setActiveSection] = useState<string>('profile');

  // Format helpers for typable text input formatting
  const formatInputNumber = (val: number) => {
    if (val === 0) return '0';
    return val.toLocaleString('id-ID');
  };

  const parseInputNumber = (str: string) => {
    const clean = str.replace(/\D/g, '');
    return Number(clean) || 0;
  };

  // 1. Profil Risiko Dinamis (Kalkulator CFP)
  const [maritalStatus, setMaritalStatus] = useState<'single' | 'married_dual' | 'married_single'>('married_dual');
  const [dependents, setDependents] = useState<number>(0);
  const [jobStability, setJobStability] = useState<'high' | 'medium' | 'low'>('medium');

  // 2. Kategori & Nilai Pengeluaran
  const [expenseEssential, setExpenseEssential] = useState(2500000);
  const [expenseDebt, setExpenseDebt] = useState(500000);
  const [expenseHealth, setExpenseHealth] = useState(300000);
  const [expenseLifestyle, setExpenseLifestyle] = useState(700000);
  const [expenseMode, setExpenseMode] = useState<'survival' | 'lifestyle'>('lifestyle');

  // 3. Pengaturan Target & Setoran
  const [targetMonthsOverride, setTargetMonthsOverride] = useState<number | null>(null);
  const [monthlySavings, setMonthlySavings] = useState(1500000);
  const [safetyBuffer, setSafetyBuffer] = useState(10); // buffer %

  // 4. Tempat Penyimpanan & Yield
  const [customYield, setCustomYield] = useState(5.5); // % p.a.
  const [placementPreset, setPlacementPreset] = useState<'checking' | 'digital_bank' | 'rdpu' | 'custom'>('rdpu');
  const [inflationRate, setInflationRate] = useState(3.5); // % p.a.
  const [includeInflation, setIncludeInflation] = useState(true);

  // Sync / Initialize values on open
  useEffect(() => {
    if (isOpen) {
      setActiveSection('profile');
      
      // Split historical average expense into categories if available
      const baseTotal = monthlyExpenses > 1000000 ? monthlyExpenses : 4000000;
      setExpenseEssential(Math.round(baseTotal * 0.55));
      setExpenseDebt(Math.round(baseTotal * 0.15));
      setExpenseHealth(Math.round(baseTotal * 0.1));
      setExpenseLifestyle(Math.round(baseTotal * 0.2));

      setMaritalStatus('married_dual');
      setDependents(0);
      setJobStability('medium');
      setTargetMonthsOverride(null);
      setMonthlySavings(Math.max(500000, Math.round(baseTotal * 0.25)));
      setSafetyBuffer(10);
      setPlacementPreset('rdpu');
      setCustomYield(5.5);
      setInflationRate(2.8); // Current Indonesia inflation is ~2.8%
      setIncludeInflation(true);
    }
  }, [isOpen, monthlyExpenses]);

  // Handle Preset yield changes
  const handleYieldPresetChange = (preset: 'checking' | 'digital_bank' | 'rdpu') => {
    setPlacementPreset(preset);
    if (preset === 'checking') setCustomYield(0.5);
    else if (preset === 'digital_bank') setCustomYield(4.0);
    else if (preset === 'rdpu') setCustomYield(5.5);
  };

  // CFP Target month recommendation engine
  const recommendedTargetMonths = useMemo(() => {
    let base = 3; // Minimum base
    
    // Marriage Status Offset
    if (maritalStatus === 'married_dual') base += 2;
    if (maritalStatus === 'married_single') base += 4;

    // Dependents Offset (+1.5 months per dependent up to 4.5 months max)
    base += Math.min(4.5, dependents * 1.5);

    // Job Stability Offset
    if (jobStability === 'high') base -= 1.0;
    if (jobStability === 'low') base += 3.0;

    return Math.max(3, base);
  }, [maritalStatus, dependents, jobStability]);

  // Active target month (either custom override or recommended)
  const activeTargetMonths = useMemo(() => {
    return targetMonthsOverride !== null ? targetMonthsOverride : recommendedTargetMonths;
  }, [targetMonthsOverride, recommendedTargetMonths]);

  // Expense Calculations
  const totalRegularExpense = useMemo(() => {
    return expenseEssential + expenseDebt + expenseHealth + expenseLifestyle;
  }, [expenseEssential, expenseDebt, expenseHealth, expenseLifestyle]);

  const baseExpense = useMemo(() => {
    if (expenseMode === 'survival') {
      // Survival = 80% Essential + 100% Debt + 100% Health + 0% Lifestyle
      return (expenseEssential * 0.8) + expenseDebt + expenseHealth;
    }
    return totalRegularExpense;
  }, [expenseEssential, expenseDebt, expenseHealth, expenseLifestyle, expenseMode, totalRegularExpense]);

  const targetAmountWithoutBuffer = useMemo(() => {
    return baseExpense * activeTargetMonths;
  }, [baseExpense, activeTargetMonths]);

  const targetAmount = useMemo(() => {
    const bufferAmount = targetAmountWithoutBuffer * (safetyBuffer / 100);
    return Math.round(targetAmountWithoutBuffer + bufferAmount);
  }, [targetAmountWithoutBuffer, safetyBuffer]);

  // Projection engine over 36 months incorporating compound yield and inflation
  const projectionData = useMemo(() => {
    let balance = currentCash;
    const data = [];
    let reachMonth: number | null = null;
    let accumulatedInterest = 0;

    const r = (customYield / 100) / 12;
    const inf = includeInflation ? (inflationRate / 100) / 12 : 0;
    const initialTarget = targetAmount;

    for (let month = 0; month <= 36; month++) {
      const currentTarget = Math.round(initialTarget * Math.pow(1 + inf, month));
      
      data.push({
        month: `Bln ${month}`,
        balance: Math.round(balance),
        target: currentTarget
      });

      if (balance >= currentTarget && reachMonth === null) {
        reachMonth = month;
      }

      // Add interest and savings
      const interest = balance * r;
      accumulatedInterest += interest;
      balance = balance + monthlySavings + interest;
    }

    return { data, reachMonth, accumulatedInterest };
  }, [currentCash, targetAmount, monthlySavings, customYield, inflationRate, includeInflation]);

  // Comparative savings check
  const monthsSaved = useMemo(() => {
    if (projectionData.reachMonth === null || projectionData.reachMonth === 0) return 0;
    
    let balanceChecking = currentCash;
    let reachChecking: number | null = null;
    const rChecking = 0.005 / 12; // 0.5% p.a.
    const inf = includeInflation ? (inflationRate / 100) / 12 : 0;

    for (let month = 0; month <= 120; month++) {
      const currentTarget = targetAmount * Math.pow(1 + inf, month);
      if (balanceChecking >= currentTarget) {
        reachChecking = month;
        break;
      }
      balanceChecking = balanceChecking + monthlySavings + (balanceChecking * rChecking);
    }

    if (reachChecking !== null && customYield > 0.5) {
      const saved = reachChecking - projectionData.reachMonth;
      return saved > 0 ? saved : 0;
    }
    return 0;
  }, [currentCash, targetAmount, monthlySavings, customYield, projectionData.reachMonth, inflationRate, includeInflation]);

  if (!isOpen) return null;

  const currentMonthsCovered = baseExpense > 0 ? currentCash / baseExpense : 0;
  const progressPct = Math.min(100, (currentCash / (targetAmount || 1)) * 100);
  const isTargetAchieved = currentCash >= targetAmount;
  const surplusCash = isTargetAchieved ? currentCash - targetAmount : 0;

  // Status indicator styling
  let healthLabel = 'Sangat Kurang';
  let healthColor = 'text-red-500 bg-red-500/10 border-red-500/20';
  if (currentMonthsCovered >= activeTargetMonths) {
    healthLabel = 'Sangat Kuat (Surplus)';
    healthColor = 'text-blue-400 bg-blue-500/10 border-blue-500/20';
  } else if (currentMonthsCovered >= 6) {
    healthLabel = 'Aman & Kokoh';
    healthColor = 'text-green-400 bg-green-500/10 border-green-500/20';
  } else if (currentMonthsCovered >= 3) {
    healthLabel = 'Cukup / Waspada';
    healthColor = 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
  }

  // Expense split percentage helpers
  const splitPct = {
    essential: totalRegularExpense > 0 ? (expenseEssential / totalRegularExpense) * 100 : 0,
    debt: totalRegularExpense > 0 ? (expenseDebt / totalRegularExpense) * 100 : 0,
    health: totalRegularExpense > 0 ? (expenseHealth / totalRegularExpense) * 100 : 0,
    lifestyle: totalRegularExpense > 0 ? (expenseLifestyle / totalRegularExpense) * 100 : 0,
  };

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

        {/* Modal Body */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.96, y: 40 }} 
          animate={{ opacity: 1, scale: 1, y: 0 }} 
          exit={{ opacity: 0, scale: 0.96, y: 40 }}
          transition={{ type: 'spring', damping: 28, stiffness: 240 }}
          className="relative w-full max-w-7xl h-[calc(100vh-1rem)] sm:h-[95vh] md:h-[90vh] bg-surface dark:bg-[#121416] rounded-2xl sm:rounded-[28px] md:rounded-[36px] shadow-2xl overflow-y-auto md:overflow-hidden flex flex-col md:flex-row border border-outline-variant/20 dark:border-white/10"
        >
          {/* LEFT SIDE: MULTI-STEP COLLAPSIBLE CONFIG */}
          <div className="w-full md:w-[45%] bg-surface-container-lowest dark:bg-black/30 p-5 md:p-6 border-b md:border-b-0 md:border-r border-outline-variant/10 dark:border-white/5 overflow-y-visible md:overflow-y-auto custom-scrollbar flex flex-col h-auto md:h-full">
            
            {/* Header */}
            <div className="flex justify-between items-center mb-5">
              <div>
                <h2 className="text-xl md:text-2xl font-black font-headline text-primary dark:text-[#a7c8ff] flex items-center gap-2">
                  <span className="material-symbols-outlined text-3xl">shield_with_heart</span>
                  Dana Darurat Pro
                </h2>
                <p className="text-[10px] text-on-surface-variant dark:text-slate-400 font-bold uppercase tracking-wider">Expert Financial Planner Mode</p>
              </div>
              <button 
                onClick={onClose} 
                className="w-9 h-9 rounded-full bg-surface-container hover:bg-surface-container-high dark:bg-white/5 flex items-center justify-center text-on-surface transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            {/* Accordion list */}
            <div className="space-y-4 flex-1">

              {/* ACCORDION 1: DYNAMIC RISK PROFILE */}
              <AccordionItem
                id="profile"
                title="1. Profil Tanggungan & Risiko"
                subtitle={`Target Rekomendasi: ${recommendedTargetMonths} Bulan`}
                icon="family_restroom"
                activeSection={activeSection}
                setActiveSection={setActiveSection}
              >
                {/* Marital Status Selection */}
                <div className="space-y-2">
                  <label className="text-[11px] font-black uppercase text-on-surface-variant dark:text-slate-400">Status Pernikahan</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'single', label: 'Single', offset: '+0 Bln' },
                      { id: 'married_dual', label: 'Menikah (Dual Inc.)', offset: '+2 Bln' },
                      { id: 'married_single', label: 'Menikah (Single Inc.)', offset: '+4 Bln' }
                    ].map((m) => (
                      <button
                        key={m.id}
                        onClick={() => setMaritalStatus(m.id as any)}
                        className={`p-2 rounded-xl border text-center transition-all ${
                          maritalStatus === m.id
                            ? 'bg-primary/10 border-primary text-primary dark:text-[#a7c8ff] dark:border-[#a7c8ff]'
                            : 'bg-surface-container-low dark:bg-white/5 border-outline-variant/10 text-on-surface text-xs font-bold'
                        }`}
                      >
                        <p className="text-[10px] font-bold">{m.label}</p>
                        <p className="text-[9px] opacity-75 mt-0.5">{m.offset}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Number of Dependents */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-[11px] font-black uppercase text-on-surface-variant dark:text-slate-400">Jumlah Tanggungan (Anak / Org Tua)</label>
                    <span className="text-xs font-bold text-on-surface dark:text-white">{dependents} Orang</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {[0, 1, 2, 3, 4].map((num) => (
                      <button
                        key={num}
                        onClick={() => setDependents(num)}
                        className={`flex-1 py-1.5 rounded-lg border text-center font-bold text-xs ${
                          dependents === num
                            ? 'bg-primary/10 border-primary text-primary dark:text-[#a7c8ff] dark:border-[#a7c8ff]'
                            : 'bg-surface-container-low dark:bg-white/5 border-outline-variant/10 text-on-surface'
                        }`}
                      >
                        {num === 4 ? '4+' : num}
                      </button>
                    ))}
                  </div>
                  <p className="text-[9px] text-on-surface-variant/70 italic leading-none">+1.5 bulan per tanggungan (maks +4.5 bulan)</p>
                </div>

                {/* Job Stability */}
                <div className="space-y-2">
                  <label className="text-[11px] font-black uppercase text-on-surface-variant dark:text-slate-400">Stabilitas Pendapatan Pekerjaan</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'high', label: 'Tinggi (PNS/BUMN)', offset: '-1 Bln' },
                      { id: 'medium', label: 'Sedang (Swasta)', offset: '+0 Bln' },
                      { id: 'low', label: 'Volatil (Bisnis/Free)', offset: '+3 Bln' }
                    ].map((j) => (
                      <button
                        key={j.id}
                        onClick={() => setJobStability(j.id as any)}
                        className={`p-2 rounded-xl border text-center transition-all ${
                          jobStability === j.id
                            ? 'bg-primary/10 border-primary text-primary dark:text-[#a7c8ff] dark:border-[#a7c8ff]'
                            : 'bg-surface-container-low dark:bg-white/5 border-outline-variant/10 text-on-surface text-xs font-bold'
                        }`}
                      >
                        <p className="text-[10px] font-bold">{j.label}</p>
                        <p className="text-[9px] opacity-75 mt-0.5">{j.offset}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Formula Breakdown Summary */}
                <div className="bg-primary-container/20 dark:bg-white/[0.02] p-3.5 rounded-2xl border border-primary/10 dark:border-white/5 text-[11px] space-y-1.5">
                  <p className="font-bold text-primary dark:text-[#a7c8ff] uppercase tracking-wider text-[10px]">Kalkulasi Formula CFP:</p>
                  <div className="grid grid-cols-2 text-on-surface-variant/80 dark:text-slate-400 gap-y-1 text-[10.5px]">
                    <span>Basis Minimal:</span> <span className="text-right font-bold text-on-surface dark:text-slate-300">3.0 Bulan</span>
                    <span>Status Menikah:</span> <span className="text-right font-bold text-on-surface dark:text-slate-300">+{maritalStatus === 'single' ? '0' : maritalStatus === 'married_dual' ? '2.0' : '4.0'} Bulan</span>
                    <span>Tanggungan ({dependents} Orang):</span> <span className="text-right font-bold text-on-surface dark:text-slate-300">+{Math.min(4.5, dependents * 1.5).toFixed(1)} Bulan</span>
                    <span>Stabilitas Kerja:</span> <span className="text-right font-bold text-on-surface dark:text-slate-300">{jobStability === 'high' ? '-1.0' : jobStability === 'low' ? '+3.0' : '+0.0'} Bulan</span>
                  </div>
                  <div className="border-t border-outline-variant/20 dark:border-white/10 pt-2 flex justify-between font-black text-on-surface dark:text-white">
                    <span>Rekomendasi CFP:</span>
                    <span className="text-tertiary dark:text-[#ffb4ab]">{recommendedTargetMonths} Bulan</span>
                  </div>
                </div>
              </AccordionItem>

              {/* ACCORDION 2: GRANULAR EXPENSES */}
              <AccordionItem
                id="expense"
                title="2. Rincian Kategori Pengeluaran"
                subtitle={`Total: ${formatCurrency(totalRegularExpense)}/Bln`}
                icon="payments"
                activeSection={activeSection}
                setActiveSection={setActiveSection}
              >
                {/* Mode Pengeluaran Switch */}
                <div className="flex bg-surface-container-lowest dark:bg-black/40 p-1 rounded-xl border border-outline-variant/10">
                  <button
                    onClick={() => setExpenseMode('survival')}
                    className={`flex-1 py-1.5 text-center rounded-lg text-xs font-bold transition-all ${
                      expenseMode === 'survival'
                        ? 'bg-white dark:bg-[#2c3033] shadow text-primary dark:text-[#a7c8ff]'
                        : 'text-on-surface-variant dark:text-slate-400'
                    }`}
                  >
                    🛡️ Survival Mode
                  </button>
                  <button
                    onClick={() => setExpenseMode('lifestyle')}
                    className={`flex-1 py-1.5 text-center rounded-lg text-xs font-bold transition-all ${
                      expenseMode === 'lifestyle'
                        ? 'bg-white dark:bg-[#2c3033] shadow text-primary dark:text-[#a7c8ff]'
                        : 'text-on-surface-variant dark:text-slate-400'
                    }`}
                  >
                    🌟 Lifestyle Mode
                  </button>
                </div>

                {/* 4 Sliders of Expenses */}
                <div className="space-y-3.5">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-xs font-bold text-on-surface-variant flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded-sm bg-blue-500"></span> Kebutuhan Esensial (Pokok)
                      </label>
                      <div className="flex items-center gap-1 bg-surface-container dark:bg-white/5 px-2.5 py-1 rounded-xl border border-outline-variant/10 focus-within:border-primary">
                        <span className="text-[10px] font-bold text-on-surface-variant">Rp</span>
                        <input 
                          type="text" 
                          value={formatInputNumber(expenseEssential)} 
                          onChange={(e) => setExpenseEssential(parseInputNumber(e.target.value))}
                          className="w-24 text-right text-xs font-bold text-on-surface dark:text-white bg-transparent outline-none border-none focus:ring-0"
                        />
                      </div>
                    </div>
                    <input 
                      type="range" min={1000000} max={25000000} step={250000} value={expenseEssential} 
                      onChange={(e) => setExpenseEssential(Number(e.target.value))}
                      className="w-full h-1 bg-surface-container-highest rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-xs font-bold text-on-surface-variant flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded-sm bg-red-500"></span> Cicilan & Kewajiban Utang
                      </label>
                      <div className="flex items-center gap-1 bg-surface-container dark:bg-white/5 px-2.5 py-1 rounded-xl border border-outline-variant/10 focus-within:border-error">
                        <span className="text-[10px] font-bold text-on-surface-variant">Rp</span>
                        <input 
                          type="text" 
                          value={formatInputNumber(expenseDebt)} 
                          onChange={(e) => setExpenseDebt(parseInputNumber(e.target.value))}
                          className="w-24 text-right text-xs font-bold text-on-surface dark:text-white bg-transparent outline-none border-none focus:ring-0"
                        />
                      </div>
                    </div>
                    <input 
                      type="range" min={0} max={15000000} step={200000} value={expenseDebt} 
                      onChange={(e) => setExpenseDebt(Number(e.target.value))}
                      className="w-full h-1 bg-surface-container-highest rounded-lg appearance-none cursor-pointer accent-red-500"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-xs font-bold text-on-surface-variant flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500"></span> Premi Asuransi & Kesehatan
                      </label>
                      <div className="flex items-center gap-1 bg-surface-container dark:bg-white/5 px-2.5 py-1 rounded-xl border border-outline-variant/10 focus-within:border-emerald-500">
                        <span className="text-[10px] font-bold text-on-surface-variant">Rp</span>
                        <input 
                          type="text" 
                          value={formatInputNumber(expenseHealth)} 
                          onChange={(e) => setExpenseHealth(parseInputNumber(e.target.value))}
                          className="w-24 text-right text-xs font-bold text-on-surface dark:text-white bg-transparent outline-none border-none focus:ring-0"
                        />
                      </div>
                    </div>
                    <input 
                      type="range" min={0} max={5000000} step={100000} value={expenseHealth} 
                      onChange={(e) => setExpenseHealth(Number(e.target.value))}
                      className="w-full h-1 bg-surface-container-highest rounded-lg appearance-none cursor-pointer accent-emerald-500"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1 text-on-surface-variant">
                      <label className="text-xs font-bold flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded-sm bg-amber-500"></span> Gaya Hidup & Keinginan
                      </label>
                      <div className="flex items-center gap-1 bg-surface-container dark:bg-white/5 px-2.5 py-1 rounded-xl border border-outline-variant/10 focus-within:border-amber-500 animate-fade-in">
                        <span className="text-[10px] font-bold text-on-surface-variant">Rp</span>
                        <input 
                          type="text" 
                          disabled={expenseMode === 'survival'}
                          value={formatInputNumber(expenseLifestyle)} 
                          onChange={(e) => setExpenseLifestyle(parseInputNumber(e.target.value))}
                          className="w-24 text-right text-xs font-bold text-on-surface dark:text-white bg-transparent outline-none border-none focus:ring-0 disabled:opacity-30"
                        />
                      </div>
                    </div>
                    <input 
                      type="range" min={0} max={10000000} step={200000} value={expenseLifestyle} 
                      disabled={expenseMode === 'survival'}
                      onChange={(e) => setExpenseLifestyle(Number(e.target.value))}
                      className="w-full h-1 bg-surface-container-highest rounded-lg appearance-none cursor-pointer accent-amber-500 disabled:opacity-30"
                    />
                  </div>
                </div>

                {/* Staked Proportion Bar */}
                <div className="space-y-1.5 pt-2 border-t border-outline-variant/10 dark:border-white/5">
                  <p className="text-[9px] font-black uppercase tracking-wider text-on-surface-variant dark:text-slate-400">Proporsi Anggaran Bulanan:</p>
                  <div className="w-full h-3 rounded-full overflow-hidden flex bg-surface-container">
                    <div className="bg-blue-500 h-full transition-all duration-300" style={{ width: `${splitPct.essential}%` }}></div>
                    <div className="bg-red-500 h-full transition-all duration-300" style={{ width: `${splitPct.debt}%` }}></div>
                    <div className="bg-emerald-500 h-full transition-all duration-300" style={{ width: `${splitPct.health}%` }}></div>
                    <div className="bg-amber-500 h-full transition-all duration-300" style={{ width: `${splitPct.lifestyle}%` }}></div>
                  </div>
                  <div className="flex justify-between items-center text-[9px] font-bold text-on-surface-variant/80">
                    <span>Survival Base: <strong className="text-tertiary dark:text-[#ffb4ab]">{formatCurrency(baseExpense)}/Bln</strong></span>
                    {monthlyExpenses > 0 && (
                      <button 
                        onClick={() => {
                          const baseTotal = monthlyExpenses;
                          setExpenseEssential(Math.round(baseTotal * 0.55));
                          setExpenseDebt(Math.round(baseTotal * 0.15));
                          setExpenseHealth(Math.round(baseTotal * 0.1));
                          setExpenseLifestyle(Math.round(baseTotal * 0.2));
                        }}
                        className="text-primary dark:text-[#a7c8ff] hover:underline"
                      >
                        Reset ke Riwayat
                      </button>
                    )}
                  </div>
                </div>
              </AccordionItem>

              {/* ACCORDION 3: TARGET & SAVINGS */}
              <AccordionItem
                id="target"
                title="3. Target & Setoran Bulanan"
                subtitle={`Target: ${activeTargetMonths} Bulan + ${safetyBuffer}% Buffer`}
                icon="adjust"
                activeSection={activeSection}
                setActiveSection={setActiveSection}
              >
                {/* Target Period with Dynamic CFP Sync button */}
                <div>
                  <div className="flex justify-between items-end mb-1">
                    <label className="text-xs font-bold text-on-surface-variant">Periode Proteksi (Target)</label>
                    <span className="text-xs font-black text-on-surface dark:text-white">{activeTargetMonths} Bulan</span>
                  </div>
                  <input 
                    type="range" min={1} max={24} step={1} value={activeTargetMonths} 
                    onChange={(e) => setTargetMonthsOverride(Number(e.target.value))}
                    className="w-full h-1 bg-surface-container-highest rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                  {targetMonthsOverride !== null && targetMonthsOverride !== recommendedTargetMonths && (
                    <div className="flex justify-end mt-1">
                      <button 
                        onClick={() => setTargetMonthsOverride(null)}
                        className="text-[9px] text-primary dark:text-[#a7c8ff] font-bold hover:underline"
                      >
                        Gunakan Rekomendasi CFP ({recommendedTargetMonths} Bln)
                      </button>
                    </div>
                  )}
                </div>

                {/* Safety Buffer Selector */}
                <div>
                  <div className="flex justify-between items-end mb-1">
                    <label className="text-xs font-bold text-on-surface-variant">Buffer Keamanan Tambahan</label>
                    <span className="text-xs font-black text-on-surface dark:text-white">+{safetyBuffer}%</span>
                  </div>
                  <input 
                    type="range" min={0} max={25} step={5} value={safetyBuffer} 
                    onChange={(e) => setSafetyBuffer(Number(e.target.value))}
                    className="w-full h-1 bg-surface-container-highest rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                  <p className="text-[9px] text-on-surface-variant/70 mt-1 italic leading-none">Cadangan ekstra sebesar {formatCurrency(targetAmount - targetAmountWithoutBuffer)} untuk pengeluaran tak terduga.</p>
                </div>

                {/* Monthly Savings */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-bold text-on-surface-variant">Setoran Bulanan</label>
                    <div className="flex items-center gap-1 bg-surface-container dark:bg-white/5 px-2.5 py-1 rounded-xl border border-outline-variant/10 focus-within:border-emerald-500">
                      <span className="text-[10px] font-bold text-on-surface-variant">Rp</span>
                      <input 
                        type="text" 
                        value={formatInputNumber(monthlySavings)} 
                        onChange={(e) => setMonthlySavings(parseInputNumber(e.target.value))}
                        className="w-24 text-right text-xs font-bold text-on-surface dark:text-white bg-transparent outline-none border-none focus:ring-0"
                      />
                    </div>
                  </div>
                  <input 
                    type="range" min={100000} max={15000000} step={100000} value={monthlySavings} 
                    onChange={(e) => setMonthlySavings(Number(e.target.value))}
                    className="w-full h-1 bg-surface-container-highest rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  />
                </div>
              </AccordionItem>

              {/* ACCORDION 4: YIELD & MACROECONOMY */}
              <AccordionItem
                id="yield"
                title="4. Penempatan & Yield"
                subtitle={`Yield: ${customYield}% p.a. | Inflasi: ${inflationRate}%`}
                icon="account_balance"
                activeSection={activeSection}
                setActiveSection={setActiveSection}
              >
                {/* Presets and manual custom yield */}
                <div className="space-y-3">
                  <label className="text-[11px] font-black uppercase text-on-surface-variant dark:text-slate-400">Preset Penempatan Dana</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'checking', label: 'Tabungan', rate: '0.5%' },
                      { id: 'digital_bank', label: 'DigiBank', rate: '4.0%' },
                      { id: 'rdpu', label: 'RDPU MMF', rate: '5.5%' }
                    ].map((p) => (
                      <button
                        key={p.id}
                        onClick={() => handleYieldPresetChange(p.id as any)}
                        className={`py-2 px-1 rounded-xl border text-center transition-all ${
                          placementPreset === p.id
                            ? 'bg-green-500/10 border-green-500 text-green-700 dark:text-green-400 dark:border-green-400'
                            : 'bg-surface-container-low dark:bg-white/5 border-outline-variant/10 text-on-surface text-xs font-bold'
                        }`}
                      >
                        <p className="text-[10px] font-bold">{p.label}</p>
                        <p className="text-[9px] opacity-75 mt-0.5">{p.rate}</p>
                      </button>
                    ))}
                  </div>

                  <div>
                    <div className="flex justify-between items-end mb-1">
                      <label className="text-xs font-bold text-on-surface-variant">Kustom Yield Suku Bunga (p.a.)</label>
                      <span className="text-xs font-black text-green-500 dark:text-[#4ade80]">{customYield.toFixed(1)}%</span>
                    </div>
                    <input 
                      type="range" min={0} max={15} step={0.1} value={customYield} 
                      onChange={(e) => {
                        setCustomYield(Number(e.target.value));
                        setPlacementPreset('custom');
                      }}
                      className="w-full h-1 bg-surface-container-highest rounded-lg appearance-none cursor-pointer accent-green-500"
                    />
                  </div>
                </div>

                {/* Inflation settings */}
                <div className="border-t border-outline-variant/10 dark:border-white/5 pt-3 space-y-3">
                  <div className="flex items-center justify-between p-2 rounded-xl bg-surface-container-high/40 dark:bg-white/[0.02] border border-outline-variant/10">
                    <div className="flex flex-col">
                      <span className="text-[11px] font-black uppercase text-on-surface">Proteksi Inflasi Dinamis</span>
                      <span className="text-[9px] text-on-surface-variant/70 font-medium">Beban target naik mengikuti inflasi</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={includeInflation} 
                        onChange={(e) => setIncludeInflation(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-8 h-4 bg-surface-container-highest rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-primary dark:peer-checked:bg-[#a7c8ff]"></div>
                    </label>
                  </div>

                  {includeInflation && (
                    <div>
                      <div className="flex justify-between items-end mb-1">
                        <label className="text-xs font-bold text-on-surface-variant">Laju Inflasi Tahunan</label>
                        <span className="text-xs font-black text-red-400">{inflationRate.toFixed(1)}%</span>
                      </div>
                      <input 
                        type="range" min={0} max={10} step={0.1} value={inflationRate} 
                        onChange={(e) => setInflationRate(Number(e.target.value))}
                        className="w-full h-1 bg-surface-container-highest rounded-lg appearance-none cursor-pointer accent-red-400"
                      />
                      <div className="flex justify-between mt-1">
                        <p className="text-[8px] text-on-surface-variant/70 leading-none">Mengantisipasi penurunan daya beli di masa depan.</p>
                        <button 
                          onClick={() => setInflationRate(2.8)}
                          className="text-[9px] text-primary dark:text-[#a7c8ff] font-bold hover:underline"
                        >
                          Gunakan Inflasi RI (2.8%)
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </AccordionItem>

            </div>

            {/* Bottom buttons */}
            <button 
              onClick={onClose} 
              className="mt-6 w-full hidden md:block py-3 rounded-2xl font-bold bg-surface-container-low hover:bg-surface-container dark:bg-white/5 dark:hover:bg-white/10 text-on-surface dark:text-white transition-all border border-outline-variant/20 cursor-pointer text-xs"
            >
              Tutup Simulator
            </button>
          </div>

          {/* RIGHT SIDE: ROBO-ADVISOR & VISUALIZATION */}
          <div className="w-full md:w-[55%] p-5 md:p-6 flex flex-col bg-surface dark:bg-[#121416] overflow-y-visible md:overflow-y-auto custom-scrollbar h-auto md:h-full">
            <div className="flex-1 flex flex-col space-y-5">
              
              {/* ROBO-ADVISOR CONTEXTUAL CARD */}
              <div className={`p-4 rounded-3xl border transition-all duration-300 ${
                isTargetAchieved 
                  ? 'bg-blue-500/10 border-blue-500/30 text-blue-900 dark:text-blue-300' 
                  : 'bg-green-500/10 border-green-500/30 text-green-900 dark:text-green-300'
              }`}>
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-3xl mt-0.5">
                    {isTargetAchieved ? 'account_balance' : 'insights'}
                  </span>
                  <div className="flex-1 space-y-1.5">
                    <h3 className="text-[10px] font-black uppercase tracking-widest opacity-80">
                      Rekomendasi Financial Planner & Robo-Advisor
                    </h3>
                    
                    {isTargetAchieved ? (
                      <div className="space-y-1">
                        <p className="text-base font-black leading-snug font-headline">
                          Dana Darurat Terpenuhi & Surplus! 💎
                        </p>
                        <p className="text-[11px] leading-relaxed opacity-90">
                          Kas Anda setara dengan <strong>{currentMonthsCovered.toFixed(1)} bulan</strong> pengeluaran (melampaui target {activeTargetMonths} bulan). Kelebihan kas sebesar <strong>{formatCurrency(surplusCash)}</strong> disarankan diinvestasikan ke instrumen pertumbuhan (seperti Reksadana Saham atau Saham) untuk mengalahkan inflasi jangka panjang.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <p className="text-base font-black leading-snug font-headline">
                          {projectionData.reachMonth !== null ? (
                            <>Tercapai dalam <span className="text-xl font-black tabular-nums">{projectionData.reachMonth}</span> Bulan</>
                          ) : (
                            'Target Belum Tercapai (> 3 Tahun)'
                          )}
                        </p>
                        <p className="text-[11px] leading-relaxed opacity-90">
                          Dengan yield <strong>{customYield.toFixed(1)}% p.a.</strong> dan inflasi <strong>{inflationRate.toFixed(1)}% p.a.</strong>, target <strong>{formatCurrency(targetAmount)}</strong> Anda tercapai dalam <strong>{projectionData.reachMonth ?? '>36'} bulan</strong>.
                          {monthsSaved > 0 && (
                            <span> Anda menghemat waktu <strong className="underline text-[#4ade80]">{monthsSaved} bulan</strong> berkat imbal hasil bunga dibanding tabungan bank biasa!</span>
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
                  <p className="text-[9px] font-bold text-on-surface-variant dark:text-slate-400 uppercase tracking-wider mb-1">Rasio Saat Ini</p>
                  <p className="text-sm font-extrabold text-on-surface dark:text-white">{currentMonthsCovered.toFixed(1)} Bln</p>
                  <span className={`inline-block text-[8px] font-black px-1.5 py-0.5 rounded-full mt-1.5 border ${healthColor}`}>
                    {healthLabel}
                  </span>
                </div>
                <div className="bg-surface-container-low dark:bg-white/[0.02] p-3.5 rounded-2xl border border-outline-variant/10 text-center">
                  <p className="text-[9px] font-bold text-on-surface-variant dark:text-slate-400 uppercase tracking-wider mb-1">Total Target</p>
                  <p className="text-sm font-extrabold text-on-surface dark:text-white">{formatCurrency(targetAmount)}</p>
                  <span className="inline-block text-[8px] font-bold text-on-surface-variant/80 mt-2">
                    Termasuk Buffer {safetyBuffer}%
                  </span>
                </div>
                <div className="bg-surface-container-low dark:bg-white/[0.02] p-3.5 rounded-2xl border border-outline-variant/10 text-center">
                  <p className="text-[9px] font-bold text-on-surface-variant dark:text-slate-400 uppercase tracking-wider mb-1">Yield Akumulasi</p>
                  <p className="text-sm font-extrabold text-[#4ade80]">{formatCurrency(projectionData.accumulatedInterest)}</p>
                  <span className="inline-block text-[8px] font-bold text-on-surface-variant/80 mt-2">
                    Bunga Selama Proyeksi
                  </span>
                </div>
              </div>

              {/* CHART & LEGEND */}
              <div className="flex-1 flex flex-col space-y-2">
                <div className="flex justify-between items-center px-1">
                  <h4 className="text-[10px] font-black text-on-surface-variant uppercase tracking-wider">
                    Grafik Proyeksi Kas vs Target Inflasi (36 Bulan)
                  </h4>
                  <div className="flex items-center gap-3 text-[9px] font-bold text-on-surface-variant">
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2 rounded-sm bg-green-500"></span> Saldo Kas
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-0.5 bg-red-400 border-dashed border-t border-red-400"></span> Target Dinamis
                    </span>
                  </div>
                </div>

                <div className="h-[260px] md:h-auto md:flex-1 w-full bg-surface-container-lowest dark:bg-black/20 rounded-2xl p-4 border border-outline-variant/10">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={projectionData.data} margin={{ top: 15, right: 10, left: 10, bottom: 5 }}>
                      <defs>
                        <linearGradient id="colorCashGrad" x1="0" y1="0" x2="0" y2="1">
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
                      
                      {/* Cash Growth */}
                      <Area 
                        type="monotone" 
                        dataKey="balance" 
                        name="Saldo Kas" 
                        stroke="#22c55e" 
                        fill="url(#colorCashGrad)" 
                        strokeWidth={2.5} 
                      />
                      
                      {/* Target threshold with safety buffer */}
                      <ReferenceLine 
                        y={targetAmount} 
                        stroke="#ef4444" 
                        strokeWidth={1}
                        strokeDasharray="4 4" 
                      />

                      {/* Inflated Target Line */}
                      {includeInflation && (
                        <Area
                          type="monotone"
                          dataKey="target"
                          name="Target Dana"
                          stroke="#f87171"
                          strokeDasharray="4 4"
                          fill="transparent"
                          strokeWidth={1.5}
                        />
                      )}

                      {/* Achievement Milestone marker */}
                      {projectionData.reachMonth !== null && projectionData.reachMonth > 0 && (
                        <ReferenceLine 
                          x={`Bln ${projectionData.reachMonth}`} 
                          stroke="#3b82f6" 
                          strokeDasharray="3 3" 
                          label={{ 
                            position: 'top', 
                            value: 'Tercapai', 
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

export default FinanceEmergencyModal;
