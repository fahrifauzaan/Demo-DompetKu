import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export type RatioType = 'DTI' | 'LIQUIDITY' | 'SOLVENCY';

interface RatioSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  ratioType: RatioType;
  initialIncome: number;
  initialDebtPayment: number;
  initialCash: number;
  initialExpenses: number;
  initialAssets: number;
  initialLiabilities: number;
}

const formatCurrency = (value: number) => {
  return `Rp ${Math.round(value).toLocaleString('id-ID')}`;
};


export const FinanceRatioSimulatorModal: React.FC<RatioSimulatorModalProps> = ({
  isOpen,
  onClose,
  ratioType,
  initialIncome,
  initialDebtPayment,
  initialCash,
  initialExpenses,
  initialAssets,
  initialLiabilities
}) => {
  // LIQUIDITY State (Direct CFP-based target model)
  const [cash, setCash] = useState(initialCash);
  const [expenses, setExpenses] = useState(initialExpenses);
  const [targetMonths, setTargetMonths] = useState<number>(6);
  const [cashYield, setCashYield] = useState(2.0); // % p.a.
  const [investmentYield, setInvestmentYield] = useState(8.0); // % p.a.

  // Local string inputs for decimal support
  const [cashYieldInput, setCashYieldInput] = useState("2.0");
  const [investmentYieldInput, setInvestmentYieldInput] = useState("8.0");
  const [taxDeductionInput, setTaxDeductionInput] = useState("10");

  const handleCashYieldChange = (val: string) => {
    setCashYieldInput(val);
    if (val.trim() === '') {
      setCashYield(0);
      return;
    }
    const parsed = parseFloat(val.replace(',', '.'));
    if (!isNaN(parsed)) {
      setCashYield(Math.max(0, Math.min(15, parsed)));
    }
  };

  const handleInvestmentYieldChange = (val: string) => {
    setInvestmentYieldInput(val);
    if (val.trim() === '') {
      setInvestmentYield(0);
      return;
    }
    const parsed = parseFloat(val.replace(',', '.'));
    if (!isNaN(parsed)) {
      setInvestmentYield(Math.max(0, Math.min(30, parsed)));
    }
  };

  const handleTaxDeductionChange = (val: string) => {
    setTaxDeductionInput(val);
    if (val.trim() === '') {
      setTaxDeduction(0);
      return;
    }
    const parsed = parseFloat(val.replace(',', '.'));
    if (!isNaN(parsed)) {
      setTaxDeduction(Math.max(0, Math.min(100, parsed)));
    }
  };

  const handleCashYieldBlur = () => {
    setCashYieldInput(cashYield.toString());
  };

  const handleInvestmentYieldBlur = () => {
    setInvestmentYieldInput(investmentYield.toString());
  };

  const handleTaxDeductionBlur = () => {
    setTaxDeductionInput(taxDeduction.toString());
  };

  // SOLVENCY State (Upgraded CFP/CFA asset-liability model)
  const [liquidAssets, setLiquidAssets] = useState(0);
  const [investmentAssets, setInvestmentAssets] = useState(0);
  const [personalAssets, setPersonalAssets] = useState(0);
  const [shortTermDebts, setShortTermDebts] = useState(0);
  const [longTermDebts, setLongTermDebts] = useState(0);

  // DTI State (Upgraded CFP Model)
  const [grossIncome, setGrossIncome] = useState(initialIncome);
  const [taxDeduction, setTaxDeduction] = useState(10); // % p.a. default tax + deductions
  const [housingPayment, setHousingPayment] = useState(0);
  const [otherDebtPayment, setOtherDebtPayment] = useState(0);

  // Sync initial values on open
  useEffect(() => {
    if (isOpen) {
      setCash(initialCash);
      setExpenses(Math.max(1000000, initialExpenses));

      // Initialize DTI parameters
      setGrossIncome(Math.max(1000000, initialIncome));
      setTaxDeduction(10);
      setTaxDeductionInput("10");
      const half = Math.round(initialDebtPayment / 2);
      setHousingPayment(half);
      setOtherDebtPayment(initialDebtPayment - half);

      // Initialize Liquidity settings
      setTargetMonths(6);
      setCashYield(2.0);
      setInvestmentYield(8.0);
      setCashYieldInput("2.0");
      setInvestmentYieldInput("8.0");

      // Initialize Solvency settings (Upgraded CFP/CFA asset-liability model)
      const initialLiquid = initialCash || Math.round(initialAssets * 0.15);
      setLiquidAssets(initialLiquid);
      const remainingAssets = Math.max(0, initialAssets - initialLiquid);
      const initialInv = Math.round(remainingAssets * 0.4);
      setInvestmentAssets(initialInv);
      setPersonalAssets(Math.max(0, initialAssets - initialLiquid - initialInv));

      const initialShort = Math.round(initialLiabilities * 0.2);
      setShortTermDebts(initialShort);
      setLongTermDebts(Math.max(0, initialLiabilities - initialShort));
    }
  }, [isOpen, initialIncome, initialDebtPayment, initialCash, initialExpenses, initialAssets, initialLiabilities]);

  // Format helpers for typable text input formatting
  const formatInputNumber = (val: number) => {
    if (val === 0) return '0';
    return val.toLocaleString('id-ID');
  };

  const parseInputNumber = (str: string) => {
    const clean = str.replace(/\D/g, '');
    return Number(clean) || 0;
  };

  // Calculations
  const liquidityRatio = cash / (expenses || 1);

  // Solvency computations (Upgraded CFP/CFA model)
  const totalAssets = ratioType === 'SOLVENCY'
    ? (liquidAssets + investmentAssets + personalAssets)
    : (initialAssets || 1);

  const totalLiabilities = ratioType === 'SOLVENCY'
    ? (shortTermDebts + longTermDebts)
    : initialLiabilities;

  const netWorth = totalAssets - totalLiabilities;
  const solvencyRatio = totalAssets > 0 ? (netWorth / totalAssets) * 100 : 0;
  const debtToAssetRatio = totalAssets > 0 ? (totalLiabilities / totalAssets) * 100 : 0;
  const liquidAssetRatio = totalAssets > 0 ? (liquidAssets / totalAssets) * 100 : 0;

  // CFP Target month model for Liquidity
  const activeLiquidityTargetMonths = targetMonths;

  const targetCashReserve = useMemo(() => {
    return expenses * activeLiquidityTargetMonths;
  }, [expenses, activeLiquidityTargetMonths]);

  const idleCash = useMemo(() => {
    return Math.max(0, cash - targetCashReserve);
  }, [cash, targetCashReserve]);

  const opportunityCostData = useMemo(() => {
    const years = [1, 3, 5, 10];
    const rCash = (cashYield / 100) / 12;
    const rInv = (investmentYield / 100) / 12;
    
    return years.map(y => {
      const months = y * 12;
      const fvCash = idleCash * Math.pow(1 + rCash, months);
      const fvInv = idleCash * Math.pow(1 + rInv, months);
      const diff = Math.round(fvInv - fvCash);
      
      return {
        yearLabel: `${y} Thn`,
        fvCash: Math.round(fvCash),
        fvInv: Math.round(fvInv),
        lostWealth: diff
      };
    });
  }, [idleCash, cashYield, investmentYield]);

  // DTI calculations
  const netIncome = useMemo(() => {
    return Math.round(grossIncome * (1 - taxDeduction / 100));
  }, [grossIncome, taxDeduction]);

  const frontEndDti = useMemo(() => {
    return grossIncome > 0 ? (housingPayment / grossIncome) * 100 : 0;
  }, [housingPayment, grossIncome]);

  const backEndDti = useMemo(() => {
    return grossIncome > 0 ? ((housingPayment + otherDebtPayment) / grossIncome) * 100 : 0;
  }, [housingPayment, otherDebtPayment, grossIncome]);

  const netDti = useMemo(() => {
    return netIncome > 0 ? ((housingPayment + otherDebtPayment) / netIncome) * 100 : 0;
  }, [housingPayment, otherDebtPayment, netIncome]);

  const remainingNetIncome = useMemo(() => {
    return Math.max(0, netIncome - (housingPayment + otherDebtPayment));
  }, [netIncome, housingPayment, otherDebtPayment]);

  // Configuration for current mode
  const modeConfig = useMemo(() => {
    switch (ratioType) {
      case 'DTI': {
        let status = 'Sangat Sehat';
        let color = '#4ade80'; // Green
        if (backEndDti >= 45) {
          status = 'Risiko Tinggi (Bahaya)';
          color = '#f87171'; // Red
        } else if (backEndDti >= 36) {
          status = 'Hati-hati (Waspada)';
          color = '#fb923c'; // Orange
        }

        return {
          title: 'Debt-to-Income (DTI)',
          icon: 'account_balance',
          desc: 'Simulasikan rasio cicilan terhadap pendapatan kotor (Gross) & bersih (Take Home Pay).',
          valueStr: `${backEndDti.toFixed(1)}%`,
          status,
          color,
          gaugeValue: Math.min(100, backEndDti),
          gaugeMax: 100,
        };
      }
      case 'LIQUIDITY': {
        let status = 'Rentan (Kurang)';
        let color = '#f87171'; // Red
        
        if (liquidityRatio > 12) {
          status = 'Over-Liquidity (Cash Drag)';
          color = '#fbbf24'; // Amber / Yellow-orange
        } else if (liquidityRatio >= activeLiquidityTargetMonths) {
          status = 'Sangat Sehat & Ideal';
          color = '#4ade80'; // Green
        } else if (liquidityRatio >= 3) {
          status = 'Cukup / Waspada';
          color = '#fb923c'; // Orange
        }

        return {
          title: 'Rasio Likuiditas Kas',
          icon: 'water_drop',
          desc: 'Berapa bulan Anda bisa bertahan hidup jika seluruh pemasukan tiba-tiba berhenti?',
          valueStr: `${liquidityRatio.toFixed(1)} Bln`,
          status,
          color,
          gaugeValue: Math.min(24, liquidityRatio),
          gaugeMax: 24,
        };
      }
      case 'SOLVENCY': {
        let status = 'Rentan (Over-Leverage)';
        let color = '#f87171'; // Red
        if (solvencyRatio >= 70) {
          status = 'Sangat Sehat (Mandiri)';
          color = '#4ade80'; // Green
        } else if (solvencyRatio >= 50) {
          status = 'Cukup / Aman';
          color = '#fb923c'; // Orange
        }

        return {
          title: 'Rasio Solvabilitas',
          icon: 'scale',
          desc: 'Mengukur tingkat kepemilikan bersih atas aset Anda setelah dikurangi seluruh utang.',
          valueStr: `${solvencyRatio.toFixed(1)}%`,
          status,
          color,
          gaugeValue: Math.min(100, Math.max(0, solvencyRatio)),
          gaugeMax: 100,
        };
      }
    }
  }, [ratioType, backEndDti, liquidityRatio, solvencyRatio]);

  if (!isOpen) return null;

  // Semicircular Gauge Zone segments
  let gaugeData = [];
  if (ratioType === 'LIQUIDITY') {
    // Red (0-3 Bln), Orange (3-6 Bln), Green (6-12 Bln), Yellow-orange (>12 Bln)
    gaugeData = [
      { name: 'Rentan', value: 3, fill: '#f87171' },
      { name: 'Cukup', value: 3, fill: '#fb923c' },
      { name: 'Ideal', value: 6, fill: '#4ade80' },
      { name: 'Over', value: 12, fill: '#fbbf24' }
    ];
  } else if (ratioType === 'SOLVENCY') {
    // Red (0-50%), Orange (50-70%), Green (70-100%)
    gaugeData = [
      { name: 'Rentan', value: 50, fill: '#f87171' },
      { name: 'Cukup', value: 20, fill: '#fb923c' },
      { name: 'Kuat', value: 30, fill: '#4ade80' }
    ];
  } else {
    // DTI: Green (0-36%), Orange (36-45%), Red (45-100%)
    gaugeData = [
      { name: 'Aman', value: 36, fill: '#4ade80' },
      { name: 'Waspada', value: 9, fill: '#fb923c' },
      { name: 'Bahaya', value: 55, fill: '#f87171' }
    ];
  }

  // Needle angle math
  const RADIAN = Math.PI / 180;
  const cx = 150;
  const cy = 150;
  const iR = 80;
  const oR = 120;
  const pct = Math.min(1, modeConfig.gaugeValue / modeConfig.gaugeMax);
  const angle = 180 - pct * 180;
  const needleX = cx + (iR + (oR - iR) / 2) * Math.cos(-angle * RADIAN);
  const needleY = cy + (iR + (oR - iR) / 2) * Math.sin(-angle * RADIAN);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 overflow-hidden">
        {/* Overlay */}
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
          className="relative w-full max-w-5xl h-[95vh] md:h-[85vh] bg-surface dark:bg-[#121416] rounded-[36px] shadow-2xl overflow-y-auto md:overflow-hidden flex flex-col md:flex-row border border-outline-variant/20 dark:border-white/10"
        >
          {/* LEFT PANEL: CONFIGURATION */}
          <div className="w-full md:w-1/2 bg-surface-container-lowest dark:bg-black/30 p-5 md:p-7 border-b md:border-b-0 md:border-r border-outline-variant/10 dark:border-white/5 overflow-y-visible md:overflow-y-auto custom-scrollbar flex flex-col h-auto md:h-full">
            
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl md:text-2xl font-black font-headline flex items-center gap-2" style={{ color: modeConfig.color }}>
                  <span className="material-symbols-outlined text-3xl">{modeConfig.icon}</span>
                  {modeConfig.title}
                </h2>
                <p className="text-[10px] text-on-surface-variant dark:text-slate-400 font-bold uppercase tracking-wider mt-0.5">{modeConfig.desc}</p>
              </div>
              <button 
                onClick={onClose} 
                className="w-9 h-9 rounded-full bg-surface-container hover:bg-surface-container-high dark:bg-white/5 flex items-center justify-center text-on-surface transition-colors cursor-pointer md:hidden"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            {/* Sliders base on Ratio Type */}
            <div className="space-y-6 flex-1">
              
              {/* DTI MODE SLIDERS WITH DIRECT TYPING INPUTS */}
              {ratioType === 'DTI' && (
                <>
                  {/* Gross Income */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-xs font-bold text-on-surface-variant">Pendapatan Kotor Bulanan (Gross)</label>
                      <div className="flex items-center gap-1 bg-surface-container dark:bg-white/5 px-2.5 py-1 rounded-xl border border-outline-variant/10 focus-within:border-primary">
                        <span className="text-[10px] font-bold text-on-surface-variant">Rp</span>
                        <input 
                          type="text" 
                          value={formatInputNumber(grossIncome)} 
                          onChange={(e) => setGrossIncome(parseInputNumber(e.target.value))}
                          className="w-24 text-right text-xs font-bold text-on-surface dark:text-white bg-transparent outline-none border-none focus:ring-0"
                        />
                      </div>
                    </div>
                    <input 
                      type="range" min={2000000} max={100000000} step={500000} value={grossIncome} 
                      onChange={(e) => setGrossIncome(Number(e.target.value))}
                      className="w-full h-1.5 bg-surface-container-highest rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                    <p className="text-[9px] text-on-surface-variant/70 italic">Gaji sebelum dipotong pajak & asuransi wajib.</p>
                  </div>

                  {/* Tax & Deductions */}
                  <div className="space-y-2 bg-surface-container-high/40 dark:bg-white/[0.02] p-3 rounded-xl border border-outline-variant/10">
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-xs font-bold text-on-surface-variant">Potongan Gaji & Pajak</label>
                      <div className="flex items-center gap-1 bg-surface-container dark:bg-white/5 px-2.5 py-1 rounded-xl border border-outline-variant/10 focus-within:border-tertiary">
                        <input 
                          type="text" 
                          value={taxDeductionInput} 
                          onChange={(e) => handleTaxDeductionChange(e.target.value)}
                          onBlur={handleTaxDeductionBlur}
                          className="w-12 text-right text-xs font-bold text-on-surface dark:text-white bg-transparent outline-none border-none focus:ring-0"
                        />
                        <span className="text-[10px] font-bold text-on-surface-variant">%</span>
                      </div>
                    </div>
                    <input 
                      type="range" min={0} max={30} step={1} value={taxDeduction} 
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setTaxDeduction(val);
                        setTaxDeductionInput(val.toString());
                      }}
                      className="w-full h-1.5 bg-surface-container-highest rounded-lg appearance-none cursor-pointer accent-tertiary"
                    />
                    <div className="flex justify-between text-[11px] font-bold text-on-surface dark:text-slate-300 border-t border-outline-variant/10 pt-2 mt-2">
                      <span>Estimasi Gaji Bersih (Take Home Pay):</span>
                      <span className="text-primary dark:text-[#a7c8ff]">{formatCurrency(netIncome)} / Bln</span>
                    </div>
                  </div>

                  {/* Housing Installments */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-xs font-bold text-on-surface-variant">Cicilan Perumahan (KPR / Sewa)</label>
                      <div className="flex items-center gap-1 bg-surface-container dark:bg-white/5 px-2.5 py-1 rounded-xl border border-outline-variant/10 focus-within:border-error">
                        <span className="text-[10px] font-bold text-on-surface-variant">Rp</span>
                        <input 
                          type="text" 
                          value={formatInputNumber(housingPayment)} 
                          onChange={(e) => setHousingPayment(parseInputNumber(e.target.value))}
                          className="w-24 text-right text-xs font-bold text-on-surface dark:text-white bg-transparent outline-none border-none focus:ring-0"
                        />
                      </div>
                    </div>
                    <input 
                      type="range" min={0} max={30000000} step={200000} value={housingPayment} 
                      onChange={(e) => setHousingPayment(Number(e.target.value))}
                      className="w-full h-1.5 bg-surface-container-highest rounded-lg appearance-none cursor-pointer accent-error"
                    />
                    <p className="text-[9px] text-on-surface-variant/70 italic">Basis perhitungan Rasio Cicilan Perumahan.</p>
                  </div>

                  {/* Other Debt Payments */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-xs font-bold text-on-surface-variant">Cicilan Utang Lainnya (Mobil, Kartu Kredit, Pinjol)</label>
                      <div className="flex items-center gap-1 bg-surface-container dark:bg-white/5 px-2.5 py-1 rounded-xl border border-outline-variant/10 focus-within:border-error">
                        <span className="text-[10px] font-bold text-on-surface-variant">Rp</span>
                        <input 
                          type="text" 
                          value={formatInputNumber(otherDebtPayment)} 
                          onChange={(e) => setOtherDebtPayment(parseInputNumber(e.target.value))}
                          className="w-24 text-right text-xs font-bold text-on-surface dark:text-white bg-transparent outline-none border-none focus:ring-0"
                        />
                      </div>
                    </div>
                    <input 
                      type="range" min={0} max={20000000} step={200000} value={otherDebtPayment} 
                      onChange={(e) => setOtherDebtPayment(Number(e.target.value))}
                      className="w-full h-1.5 bg-surface-container-highest rounded-lg appearance-none cursor-pointer accent-error"
                    />
                    <p className="text-[9px] text-on-surface-variant/70 italic">Gabungan cicilan non-perumahan untuk hitungan Rasio Cicilan Total.</p>
                  </div>
                </>
              )}

              {/* LIQUIDITY MODE SLIDERS WITH DIRECT TYPING INPUTS */}
              {ratioType === 'LIQUIDITY' && (
                <>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-xs font-bold text-on-surface-variant">Total Aset Cair (Kas / Tabungan)</label>
                      <div className="flex items-center gap-1 bg-surface-container dark:bg-white/5 px-2.5 py-1 rounded-xl border border-outline-variant/10 focus-within:border-primary">
                        <span className="text-[10px] font-bold text-on-surface-variant">Rp</span>
                        <input 
                          type="text" 
                          value={formatInputNumber(cash)} 
                          onChange={(e) => setCash(parseInputNumber(e.target.value))}
                          className="w-24 text-right text-xs font-bold text-on-surface dark:text-white bg-transparent outline-none border-none focus:ring-0"
                        />
                      </div>
                    </div>
                    <input 
                      type="range" min={0} max={Math.max(100000000, initialCash * 3)} step={1000000} value={cash} 
                      onChange={(e) => setCash(Number(e.target.value))}
                      className="w-full h-1.5 bg-surface-container-highest rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-xs font-bold text-on-surface-variant">Rata-rata Pengeluaran Bulanan</label>
                      <div className="flex items-center gap-1 bg-surface-container dark:bg-white/5 px-2.5 py-1 rounded-xl border border-outline-variant/10 focus-within:border-error">
                        <span className="text-[10px] font-bold text-on-surface-variant">Rp</span>
                        <input 
                          type="text" 
                          value={formatInputNumber(expenses)} 
                          onChange={(e) => setExpenses(Math.max(1, parseInputNumber(e.target.value)))}
                          className="w-24 text-right text-xs font-bold text-on-surface dark:text-white bg-transparent outline-none border-none focus:ring-0"
                        />
                      </div>
                    </div>
                    <input 
                      type="range" min={1000000} max={Math.max(50000000, initialExpenses * 2.5)} step={500000} value={expenses} 
                      onChange={(e) => setExpenses(Number(e.target.value))}
                      className="w-full h-1.5 bg-surface-container-highest rounded-lg appearance-none cursor-pointer accent-error"
                    />
                  </div>

                  {/* Target Cadangan Tenor & Panduan CFP */}
                  <div className="space-y-3.5 bg-surface-container-high/40 dark:bg-white/[0.02] p-3.5 rounded-2xl border border-outline-variant/10">
                    <h4 className="text-[10px] font-black uppercase text-primary dark:text-[#a7c8ff] tracking-wider mb-1 flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">track_changes</span>
                      Target Cadangan Tenor & Panduan CFP
                    </h4>
                    
                    <div className="space-y-1.5 pt-1">
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-xs font-bold text-on-surface-variant">Target Cadangan Tenor</label>
                        <span className="text-xs font-black text-primary dark:text-[#a7c8ff]">{activeLiquidityTargetMonths} Bulan</span>
                      </div>
                      <input 
                        type="range" min={3} max={12} step={1} value={activeLiquidityTargetMonths} 
                        onChange={(e) => setTargetMonths(Number(e.target.value))}
                        className="w-full h-1.5 bg-surface-container-highest rounded-lg appearance-none cursor-pointer accent-primary"
                      />
                    </div>

                    <div className="bg-primary/5 dark:bg-white/[0.02] p-3 rounded-xl border border-primary/10 dark:border-white/5 space-y-1.5">
                      <div className="flex items-center gap-1 text-primary dark:text-[#a7c8ff]">
                        <span className="material-symbols-outlined text-xs">info</span>
                        <h5 className="text-[9px] font-black uppercase tracking-wider">Panduan CFP Standard</h5>
                      </div>
                      <ul className="text-[10px] text-on-surface-variant dark:text-slate-400 space-y-1 leading-relaxed">
                        <li className="flex items-start gap-1">
                          <span className="text-primary dark:text-[#a7c8ff] font-bold">•</span>
                          <span><strong>3 - 6 Bulan:</strong> Lajang atau pasangan bekerja (dual income) tanpa tanggungan.</span>
                        </li>
                        <li className="flex items-start gap-1">
                          <span className="text-primary dark:text-[#a7c8ff] font-bold">•</span>
                          <span><strong>6 - 9 Bulan:</strong> Pasangan dengan anak, atau keluarga dengan satu sumber pendapatan.</span>
                        </li>
                        <li className="flex items-start gap-1">
                          <span className="text-primary dark:text-[#a7c8ff] font-bold">•</span>
                          <span><strong>9 - 12 Bulan:</strong> Pengusaha, pekerja lepas (freelancer), atau pekerjaan dengan stabilitas pendapatan rendah.</span>
                        </li>
                      </ul>
                    </div>
                  </div>

                  {/* Suku Bunga Pengaturan */}
                  <div className="grid grid-cols-2 gap-3 p-3.5 bg-surface-container-high/40 dark:bg-white/[0.02] rounded-2xl border border-outline-variant/10">
                    <div>
                      <label className="text-[9px] font-black text-on-surface-variant uppercase tracking-wider block mb-1.5">Bunga Kas (p.a.)</label>
                      <div className="flex items-center gap-1 bg-surface-container dark:bg-white/5 px-2.5 py-1 rounded-xl border border-outline-variant/10 focus-within:border-primary">
                        <input 
                          type="text" 
                          value={cashYieldInput} 
                          onChange={(e) => handleCashYieldChange(e.target.value)}
                          onBlur={handleCashYieldBlur}
                          className="w-full text-right text-xs font-bold text-on-surface dark:text-white bg-transparent outline-none border-none focus:ring-0"
                        />
                        <span className="text-[10px] font-bold text-on-surface-variant">%</span>
                      </div>
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-on-surface-variant uppercase tracking-wider block mb-1.5">Return Investasi</label>
                      <div className="flex items-center gap-1 bg-surface-container dark:bg-white/5 px-2.5 py-1 rounded-xl border border-outline-variant/10 focus-within:border-primary">
                        <input 
                          type="text" 
                          value={investmentYieldInput} 
                          onChange={(e) => handleInvestmentYieldChange(e.target.value)}
                          onBlur={handleInvestmentYieldBlur}
                          className="w-full text-right text-xs font-bold text-on-surface dark:text-white bg-transparent outline-none border-none focus:ring-0"
                        />
                        <span className="text-[10px] font-bold text-on-surface-variant">%</span>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* SOLVENCY MODE UPGRADED WITH COMPONENT INPUTS */}
              {ratioType === 'SOLVENCY' && (
                <>
                  {/* Bagian Aset */}
                  <div className="space-y-4 bg-surface-container-high/40 dark:bg-white/[0.02] p-4 rounded-2xl border border-outline-variant/10">
                    <h4 className="text-[10px] font-black uppercase text-primary dark:text-[#a7c8ff] tracking-wider flex items-center gap-1.5 border-b border-outline-variant/10 pb-2">
                      <span className="material-symbols-outlined text-xs">account_balance_wallet</span>
                      Komponen Aset (Kekayaan)
                    </h4>
                    
                    {/* Aset Likuid */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <label className="font-bold text-on-surface-variant">Aset Likuid (Kas, Tabungan, Deposito)</label>
                        <div className="flex items-center gap-1 bg-surface-container dark:bg-white/5 px-2.5 py-1 rounded-xl border border-outline-variant/10 focus-within:border-primary">
                          <span className="text-[10px] font-bold text-on-surface-variant">Rp</span>
                          <input 
                            type="text" 
                            value={formatInputNumber(liquidAssets)} 
                            onChange={(e) => setLiquidAssets(parseInputNumber(e.target.value))}
                            className="w-24 text-right text-xs font-bold text-on-surface dark:text-white bg-transparent outline-none border-none focus:ring-0"
                          />
                        </div>
                      </div>
                      <input 
                        type="range" min={0} max={Math.max(100000000, initialAssets)} step={1000000} value={liquidAssets} 
                        onChange={(e) => setLiquidAssets(Number(e.target.value))}
                        className="w-full h-1 bg-surface-container-highest rounded-lg appearance-none cursor-pointer accent-primary"
                      />
                    </div>

                    {/* Aset Investasi */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <label className="font-bold text-on-surface-variant">Aset Investasi (Saham, SBN, Reksadana)</label>
                        <div className="flex items-center gap-1 bg-surface-container dark:bg-white/5 px-2.5 py-1 rounded-xl border border-outline-variant/10 focus-within:border-primary">
                          <span className="text-[10px] font-bold text-on-surface-variant">Rp</span>
                          <input 
                            type="text" 
                            value={formatInputNumber(investmentAssets)} 
                            onChange={(e) => setInvestmentAssets(parseInputNumber(e.target.value))}
                            className="w-24 text-right text-xs font-bold text-on-surface dark:text-white bg-transparent outline-none border-none focus:ring-0"
                          />
                        </div>
                      </div>
                      <input 
                        type="range" min={0} max={Math.max(500000000, initialAssets * 1.5)} step={5000000} value={investmentAssets} 
                        onChange={(e) => setInvestmentAssets(Number(e.target.value))}
                        className="w-full h-1 bg-surface-container-highest rounded-lg appearance-none cursor-pointer accent-primary"
                      />
                    </div>

                    {/* Aset Pribadi */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <label className="font-bold text-on-surface-variant">Aset Pribadi (Rumah, Mobil, Emas)</label>
                        <div className="flex items-center gap-1 bg-surface-container dark:bg-white/5 px-2.5 py-1 rounded-xl border border-outline-variant/10 focus-within:border-primary">
                          <span className="text-[10px] font-bold text-on-surface-variant">Rp</span>
                          <input 
                            type="text" 
                            value={formatInputNumber(personalAssets)} 
                            onChange={(e) => setPersonalAssets(parseInputNumber(e.target.value))}
                            className="w-24 text-right text-xs font-bold text-on-surface dark:text-white bg-transparent outline-none border-none focus:ring-0"
                          />
                        </div>
                      </div>
                      <input 
                        type="range" min={0} max={Math.max(1000000000, initialAssets * 2)} step={10000000} value={personalAssets} 
                        onChange={(e) => setPersonalAssets(Number(e.target.value))}
                        className="w-full h-1 bg-surface-container-highest rounded-lg appearance-none cursor-pointer accent-primary"
                      />
                    </div>
                  </div>

                  {/* Bagian Utang */}
                  <div className="space-y-4 bg-surface-container-high/40 dark:bg-white/[0.02] p-4 rounded-2xl border border-outline-variant/10">
                    <h4 className="text-[10px] font-black uppercase text-error tracking-wider flex items-center gap-1.5 border-b border-outline-variant/10 pb-2">
                      <span className="material-symbols-outlined text-xs text-error">credit_card_heart</span>
                      Komponen Liabilitas (Utang)
                    </h4>
                    
                    {/* Utang Jangka Pendek */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <label className="font-bold text-on-surface-variant">Utang Pendek (Paylater, CC, Pinjol)</label>
                        <div className="flex items-center gap-1 bg-surface-container dark:bg-white/5 px-2.5 py-1 rounded-xl border border-outline-variant/10 focus-within:border-error">
                          <span className="text-[10px] font-bold text-on-surface-variant">Rp</span>
                          <input 
                            type="text" 
                            value={formatInputNumber(shortTermDebts)} 
                            onChange={(e) => setShortTermDebts(parseInputNumber(e.target.value))}
                            className="w-24 text-right text-xs font-bold text-on-surface dark:text-white bg-transparent outline-none border-none focus:ring-0"
                          />
                        </div>
                      </div>
                      <input 
                        type="range" min={0} max={Math.max(50000000, initialLiabilities)} step={500000} value={shortTermDebts} 
                        onChange={(e) => setShortTermDebts(Number(e.target.value))}
                        className="w-full h-1 bg-surface-container-highest rounded-lg appearance-none cursor-pointer accent-error"
                      />
                    </div>

                    {/* Utang Jangka Panjang */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <label className="font-bold text-on-surface-variant">Utang Panjang (KPR, Mobil, Usaha)</label>
                        <div className="flex items-center gap-1 bg-surface-container dark:bg-white/5 px-2.5 py-1 rounded-xl border border-outline-variant/10 focus-within:border-error">
                          <span className="text-[10px] font-bold text-on-surface-variant">Rp</span>
                          <input 
                            type="text" 
                            value={formatInputNumber(longTermDebts)} 
                            onChange={(e) => setLongTermDebts(parseInputNumber(e.target.value))}
                            className="w-24 text-right text-xs font-bold text-on-surface dark:text-white bg-transparent outline-none border-none focus:ring-0"
                          />
                        </div>
                      </div>
                      <input 
                        type="range" min={0} max={Math.max(500000000, initialLiabilities * 2)} step={5000000} value={longTermDebts} 
                        onChange={(e) => setLongTermDebts(Number(e.target.value))}
                        className="w-full h-1 bg-surface-container-highest rounded-lg appearance-none cursor-pointer accent-error"
                      />
                    </div>
                  </div>
                </>
              )}

            </div>
            
            <button 
              onClick={onClose} 
              className="mt-6 w-full hidden md:block py-3 rounded-2xl font-bold bg-surface-container-low hover:bg-surface-container dark:bg-white/5 dark:hover:bg-white/10 text-on-surface dark:text-white transition-all border border-outline-variant/20 cursor-pointer text-xs"
            >
              Tutup Simulator
            </button>
          </div>

          {/* RIGHT PANEL: SPEEDOMETER & ANALYSIS */}
          <div className="w-full md:w-1/2 p-5 md:p-7 flex flex-col bg-surface dark:bg-[#121416] overflow-y-visible md:overflow-y-auto custom-scrollbar items-center justify-center h-auto md:h-full">
            
            {/* Speedometer Gauge */}
            <div className="relative w-[300px] h-[150px] mb-8 mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    dataKey="value"
                    startAngle={180}
                    endAngle={0}
                    data={gaugeData}
                    cx="50%"
                    cy="100%"
                    innerRadius={80}
                    outerRadius={120}
                    stroke="none"
                  >
                    {gaugeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              {/* Gauge Needle */}
              <svg className="absolute inset-0 pointer-events-none" width="300" height="150">
                <circle cx={cx} cy={cy} r={8} fill={modeConfig.color} />
                <path d={`M ${cx} ${cy} L ${needleX} ${needleY}`} stroke={modeConfig.color} strokeWidth={4} strokeLinecap="round" />
              </svg>
              
              <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center justify-center translate-y-1/2">
                <div className="bg-surface dark:bg-[#1b1e21] px-4 py-1.5 rounded-full border border-outline-variant/20 shadow-lg text-center">
                  <p className="text-[10px] font-black uppercase text-on-surface-variant/80 tracking-widest leading-none">
                    {ratioType === 'DTI' ? 'Rasio Cicilan Total (DSR)' : ratioType === 'LIQUIDITY' ? 'Rasio Kas' : 'Rasio Solvabilitas'}
                  </p>
                  <p className="text-2xl font-black font-headline mt-1 leading-none" style={{ color: modeConfig.color }}>
                    {modeConfig.valueStr}
                  </p>
                </div>
              </div>
            </div>

            {/* DTI SECONDARY PROGRESS BARS */}
            {ratioType === 'DTI' && (
              <div className="w-full max-w-md space-y-3.5 mt-8 mb-4">
                {/* Housing Debt Progress Bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[10px] font-bold text-on-surface-variant">
                    <span>Rasio Cicilan Perumahan</span>
                    <span className={frontEndDti < 28 ? 'text-green-400' : frontEndDti < 35 ? 'text-orange-400' : 'text-red-400'}>
                      {frontEndDti.toFixed(1)}% <span className="text-[9px] font-medium opacity-80">(Target: &lt;28%)</span>
                    </span>
                  </div>
                  <div className="w-full h-2 bg-surface-container rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-300 ${frontEndDti < 28 ? 'bg-green-500' : frontEndDti < 35 ? 'bg-orange-500' : 'bg-red-500'}`} 
                      style={{ width: `${Math.min(100, (frontEndDti / 28) * 100)}%` }}
                    ></div>
                  </div>
                </div>

                {/* Net Income Progress Bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[10px] font-bold text-on-surface-variant">
                    <span>Rasio Cicilan Bersih</span>
                    <span className={netDti < 40 ? 'text-green-400' : netDti < 50 ? 'text-orange-400' : 'text-red-400'}>
                      {netDti.toFixed(1)}% <span className="text-[9px] font-medium opacity-80">(Target: &lt;40%)</span>
                    </span>
                  </div>
                  <div className="w-full h-2 bg-surface-container rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-300 ${netDti < 40 ? 'bg-green-500' : netDti < 50 ? 'bg-orange-500' : 'bg-red-500'}`} 
                      style={{ width: `${Math.min(100, (netDti / 40) * 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            )}

            {/* SOLVENCY SECONDARY PROGRESS BARS */}
            {ratioType === 'SOLVENCY' && (
              <div className="w-full max-w-md space-y-3.5 mt-8 mb-4">
                {/* Debt-to-Asset Ratio Progress Bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[10px] font-bold text-on-surface-variant">
                    <span>Rasio Utang terhadap Aset (Debt-to-Asset)</span>
                    <span className={debtToAssetRatio < 35 ? 'text-green-400' : debtToAssetRatio < 50 ? 'text-orange-400' : 'text-red-400'}>
                      {debtToAssetRatio.toFixed(1)}% <span className="text-[9px] font-medium opacity-80">(Target: &lt;50%)</span>
                    </span>
                  </div>
                  <div className="w-full h-2 bg-surface-container rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-300 ${debtToAssetRatio < 35 ? 'bg-green-500' : debtToAssetRatio < 50 ? 'bg-orange-500' : 'bg-red-500'}`} 
                      style={{ width: `${Math.min(100, debtToAssetRatio)}%` }}
                    ></div>
                  </div>
                </div>

                {/* Liquid Asset Ratio Progress Bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[10px] font-bold text-on-surface-variant">
                    <span>Rasio Aset Likuid terhadap Total Aset</span>
                    <span className={liquidAssetRatio >= 10 && liquidAssetRatio <= 20 ? 'text-green-400' : 'text-orange-400'}>
                      {liquidAssetRatio.toFixed(1)}% <span className="text-[9px] font-medium opacity-80">(Target: 10% - 20%)</span>
                    </span>
                  </div>
                  <div className="w-full h-2 bg-surface-container rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-300 ${liquidAssetRatio >= 10 && liquidAssetRatio <= 20 ? 'bg-green-500' : 'bg-orange-500'}`} 
                      style={{ width: `${Math.min(100, liquidAssetRatio)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            )}

            {/* LIQUIDITY PROJECTION & WEALTH DRAG CHART */}
            {ratioType === 'LIQUIDITY' && idleCash > 0 && (
              <div className="w-full max-w-md mt-8 mb-4 space-y-2 animate-fade-in">
                <div className="flex justify-between items-center px-1">
                  <h4 className="text-[10px] font-black text-on-surface-variant uppercase tracking-wider">
                    Opportunity Cost Kas Menganggur (Proyeksi 10 Tahun)
                  </h4>
                </div>
                
                <div className="h-[150px] w-full bg-surface-container-lowest dark:bg-black/20 rounded-2xl p-3 border border-outline-variant/10">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={opportunityCostData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-outline-variant/20 dark:text-white/5" />
                      <XAxis 
                        dataKey="yearLabel" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: 'currentColor', fontSize: 9 }} 
                        className="text-on-surface-variant" 
                      />
                      <YAxis 
                        tickFormatter={(val) => Math.round(val).toLocaleString('id-ID')}
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: 'currentColor', fontSize: 8 }} 
                        className="text-on-surface-variant" 
                        width={75}
                      />
                      <Tooltip 
                        formatter={(val: number) => [formatCurrency(val), '']}
                        contentStyle={{ 
                          borderRadius: '12px', 
                          backgroundColor: '#1b1e21', 
                          border: '1px solid rgba(255,255,255,0.1)',
                          color: '#fff',
                          fontSize: '10px'
                        }} 
                      />
                      <Bar dataKey="fvCash" name="Tabungan" fill="#f87171" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="fvInv" name="Investasi" fill="#4ade80" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-between text-[9px] font-bold text-on-surface-variant px-1 mt-1">
                  <span>🔴 Tabungan {cashYield}% p.a.</span>
                  <span>🟢 Portofolio {investmentYield}% p.a.</span>
                </div>
              </div>
            )}

            {ratioType === 'LIQUIDITY' && idleCash === 0 && (
              <div className="w-full max-w-md mt-8 mb-4 p-4 rounded-2xl bg-green-500/5 border border-green-500/20 text-center animate-fade-in">
                <span className="material-symbols-outlined text-green-500 text-3xl mb-1">check_circle</span>
                <p className="text-xs font-bold text-green-800 dark:text-green-300">Alokasi Kas Sudah Optimal!</p>
                <p className="text-[10px] text-on-surface-variant dark:text-slate-400 mt-1 leading-relaxed">
                  Seluruh saldo kas Anda dialokasikan dengan tepat sebagai dana darurat ideal ({activeLiquidityTargetMonths} bulan biaya hidup). Tidak ada dana menganggur (idle cash) yang memicu kerugian nilai waktu uang (time value of money).
                </p>
              </div>
            )}

            {/* ROBO-ADVISOR ADVICE FOR RATIO */}
            <div className={`w-full max-w-md mt-6 p-4 rounded-2xl border text-left ${
              modeConfig.color === '#4ade80'
                ? 'bg-green-500/5 border-green-500/20 text-green-900 dark:text-green-300'
                : modeConfig.color === '#fb923c'
                ? 'bg-orange-500/5 border-orange-500/20 text-orange-900 dark:text-orange-300'
                : modeConfig.color === '#fbbf24'
                ? 'bg-yellow-500/5 border-yellow-500/20 text-yellow-900 dark:text-yellow-300'
                : 'bg-red-500/5 border-red-500/20 text-red-900 dark:text-red-400'
            }`}>
              <h3 className="text-[10px] font-black uppercase tracking-wider mb-2 opacity-80 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-xs">analytics</span>
                Robo-Advisor Insight ({modeConfig.status})
              </h3>
              
              <p className="text-[11px] leading-relaxed">
                {ratioType === 'DTI' && (
                  backEndDti < 36 && frontEndDti < 28 ? (
                    `🟢 Probabilitas KPR Diterima Tinggi! Kedua rasio cicilan perumahan (${frontEndDti.toFixed(1)}%) dan rasio cicilan total (${backEndDti.toFixed(1)}%) Anda berada di zona aman standar perbankan (28/36). Gaji bersih menyisakan ${formatCurrency(remainingNetIncome)} untuk hidup.`
                  ) : backEndDti >= 45 ? (
                    `🔴 Probabilitas KPR Ditolak! Rasio cicilan total (${backEndDti.toFixed(1)}%) Anda di atas 45%. Bank menganggap Anda berisiko gagal bayar yang tinggi. Disarankan melunasi sebagian utang konsumtif terlebih dahulu.`
                  ) : (
                    `🟡 Toleransi Khusus (Waspada). Rasio cicilan total Anda (${backEndDti.toFixed(1)}%) berada di zona abu-abu. Bank mungkin menyetujui dengan syarat uang muka (DP) lebih tinggi atau suku bunga penawaran KPR yang lebih tinggi.`
                  )
                )}
                
                {ratioType === 'LIQUIDITY' && (
                  liquidityRatio > 12 ? (
                    `🟠 Peringatan Over-Liquidity (Cash Drag). Anda memiliki kas menganggur sebesar ${formatCurrency(idleCash)} yang setara dengan ${liquidityRatio.toFixed(1)} bulan biaya hidup (jauh melampaui target ideal ${activeLiquidityTargetMonths} bulan). Menahan uang kas berlebih akan merugi akibat inflasi. Disarankan memindahkan dana menganggur tersebut ke instrumen investasi produktif. Proyeksi 10 tahun ke depan, potensi kehilangan pertumbuhan kekayaan Anda mencapai ${formatCurrency(opportunityCostData[3].lostWealth)}!`
                  ) : liquidityRatio >= activeLiquidityTargetMonths ? (
                    `🟢 Sangat Sehat & Ideal! Saldo kas Anda mencukupi untuk memproteksi hidup selama ${liquidityRatio.toFixed(1)} bulan (Target ideal: ${activeLiquidityTargetMonths} bulan). Anda terlindung secara kokoh dari risiko mendadak tanpa membiarkan kas Anda menganggur terlalu besar.`
                  ) : liquidityRatio >= 3 ? (
                    `🟡 Cukup (Waspada). Anda memiliki ${liquidityRatio.toFixed(1)} bulan dana cadangan kas, mendekati target ideal Anda (${activeLiquidityTargetMonths} bulan). Disarankan meningkatkan tabungan secara perlahan agar mencapai zona perlindungan penuh.`
                  ) : (
                    `🔴 Rentan (Risiko Tinggi). Cadangan kas Anda hanya setara dengan ${liquidityRatio.toFixed(1)} bulan pengeluaran, di bawah standar minimal (3 bulan) dan target ideal (${activeLiquidityTargetMonths} bulan). Anda rentan terpaksa berutang jika terjadi pengeluaran tak terduga.`
                  )
                )}

                {ratioType === 'SOLVENCY' && (
                  (() => {
                    const nwStr = formatCurrency(netWorth);
                    const assetStr = formatCurrency(totalAssets);
                    const liabStr = formatCurrency(totalLiabilities);
                    
                    let baseInsight = '';
                    if (solvencyRatio >= 70) {
                      baseInsight = `🟢 Sangat Sehat! Kekayaan bersih (Net Worth) Anda adalah ${nwStr} (${solvencyRatio.toFixed(1)}% dari total aset ${assetStr}). Anda memiliki tingkat kemandirian finansial yang sangat tinggi dan risiko kepailitan yang sangat rendah.`;
                    } else if (solvencyRatio >= 50) {
                      baseInsight = `🟡 Cukup / Aman. Kekayaan bersih Anda sebesar ${nwStr} (${solvencyRatio.toFixed(1)}% dari aset). Masih aman, namun usahakan untuk tidak menambah utang jangka panjang baru agar posisi ekuitas bersih Anda terus meningkat.`;
                    } else {
                      baseInsight = `🔴 Rentan (Risiko Tinggi). Kekayaan bersih Anda hanya ${nwStr} (${solvencyRatio.toFixed(1)}% dari total aset). Porsi utang Anda (${debtToAssetRatio.toFixed(1)}%) terlalu mendominasi aset Anda. Jika terjadi penurunan nilai aset atau krisis pendapatan, Anda berisiko gagal bayar dan disita kreditur.`;
                    }

                    let liquidityInsight = '';
                    if (liquidAssetRatio < 10) {
                      liquidityInsight = ` ⚠️ Peringatan Likuiditas (Cash-Poor): Rasio aset likuid Anda hanya ${liquidAssetRatio.toFixed(1)}% (di bawah batas minimal 10%). Meskipun solvabilitas nominal Anda mungkin baik, Anda rentan mengalami krisis likuiditas jangka pendek karena sebagian besar kekayaan terikat pada aset tidak likuid. Disarankan menambah tabungan kas/aset likuid Anda.`;
                    } else if (liquidAssetRatio > 25) {
                      liquidityInsight = ` ⚠️ Peringatan Cash Drag: Porsi aset likuid Anda mencapai ${liquidAssetRatio.toFixed(1)}% (di atas batas ideal 20%). Terlalu banyak memegang kas akan menurunkan potensi imbal hasil keseluruhan portofolio Anda. Pertimbangkan mengalihkan sebagian ke aset investasi produktif.`;
                    }

                    return `${baseInsight}${liquidityInsight}`;
                  })()
                )}
              </p>
            </div>

          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default FinanceRatioSimulatorModal;
