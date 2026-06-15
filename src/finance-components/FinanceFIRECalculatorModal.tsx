import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ResponsiveContainer, ComposedChart, Line, Area, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine } from 'recharts';

interface FIRECalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialNetWorth: number;
  initialMonthlyExpense: number;
  initialMonthlySavings: number;
}

const formatCurrency = (value: number) => {
  return `Rp ${Math.round(value).toLocaleString('id-ID')}`;
};

export const FinanceFIRECalculatorModal: React.FC<FIRECalculatorModalProps> = ({
  isOpen,
  onClose,
  initialNetWorth,
  initialMonthlyExpense,
  initialMonthlySavings
}) => {
  // Format helpers for typable text input formatting
  const formatInputNumber = (val: number) => {
    if (val === 0) return '0';
    return val.toLocaleString('id-ID');
  };

  const parseInputNumber = (str: string) => {
    const clean = str.replace(/\D/g, '');
    return Number(clean) || 0;
  };

  const [monthlyExpense, setMonthlyExpense] = useState(initialMonthlyExpense || 10000000);
  const [monthlySavings, setMonthlySavings] = useState(initialMonthlySavings || 5000000);
  const [expectedReturn, setExpectedReturn] = useState(8); // 8% annual return
  const [swr, setSwr] = useState(4); // 4% safe withdrawal rate
  const [inflation, setInflation] = useState(4); // 4% inflation

  // Reset values when opened with new props
  useEffect(() => {
    if (isOpen) {
      setMonthlyExpense(initialMonthlyExpense || 10000000);
      setMonthlySavings(initialMonthlySavings || 5000000);
    }
  }, [isOpen, initialMonthlyExpense, initialMonthlySavings]);

  const fireTarget = useMemo(() => {
    const annualExpense = monthlyExpense * 12;
    return annualExpense / (swr / 100);
  }, [monthlyExpense, swr]);

  const projectionData = useMemo(() => {
    let currentNW = initialNetWorth;
    const data = [];
    let fireYear = null;
    let targetWithInflation = fireTarget;
    
    const realReturn = (expectedReturn - inflation) / 100;

    for (let year = 0; year <= 40; year++) {
      data.push({
        year: `Tahun ${year}`,
        netWorth: Math.round(currentNW),
        target: Math.round(targetWithInflation),
        isFire: currentNW >= targetWithInflation
      });

      if (currentNW >= targetWithInflation && fireYear === null) {
        fireYear = year;
      }

      // Next year projection
      currentNW = currentNW * (1 + realReturn) + (monthlySavings * 12);
      // We assume FIRE target stays constant in today's money since we are using REAL return (Return - Inflation)
      // So targetWithInflation doesn't need to grow if we use real returns for NW growth.
    }

    return { data, fireYear };
  }, [initialNetWorth, monthlySavings, expectedReturn, inflation, fireTarget]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-hidden">
        {/* Backdrop */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal Content */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-6xl max-h-[95vh] bg-surface dark:bg-[#191c1e] rounded-[32px] shadow-2xl overflow-y-auto md:overflow-hidden flex flex-col md:flex-row border border-outline-variant/20 dark:border-white/10"
        >
          
          {/* Left Panel - Controls */}
          <div className="w-full md:w-1/3 bg-surface-container-lowest dark:bg-black/20 p-6 md:p-8 border-b md:border-b-0 md:border-r border-outline-variant/10 dark:border-white/5 overflow-y-visible md:overflow-y-auto custom-scrollbar flex flex-col h-auto md:h-full">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-2xl font-extrabold font-headline text-primary dark:text-[#a7c8ff] flex items-center gap-2">
                  <span className="material-symbols-outlined text-3xl">local_fire_department</span>
                  Kalkulator FIRE
                </h2>
                <p className="text-xs text-on-surface-variant dark:text-slate-400 mt-1 font-medium">Financial Independence, Retire Early</p>
              </div>
              <button 
                onClick={onClose}
                className="w-10 h-10 rounded-full bg-surface-container hover:bg-surface-container-high dark:bg-white/5 dark:hover:bg-white/10 flex items-center justify-center text-on-surface dark:text-white transition-colors md:hidden"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-6 flex-1">
              {/* Target & Expenses */}
              <div className="space-y-4 bg-primary-container/20 dark:bg-[#a7c8ff]/5 p-5 rounded-2xl border border-primary/10 dark:border-[#a7c8ff]/10">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant dark:text-slate-400">Pengeluaran Bulanan</label>
                    <div className="flex items-center gap-1 bg-surface-container dark:bg-white/5 px-2.5 py-1 rounded-xl border border-outline-variant/10 focus-within:border-primary">
                      <span className="text-[10px] font-bold text-on-surface-variant">Rp</span>
                      <input 
                        type="text" 
                        value={formatInputNumber(monthlyExpense)} 
                        onChange={(e) => setMonthlyExpense(parseInputNumber(e.target.value))}
                        className="w-24 text-right text-xs font-bold text-on-surface dark:text-white bg-transparent outline-none border-none focus:ring-0"
                      />
                    </div>
                  </div>
                  <input 
                    type="range" 
                    min={1000000} 
                    max={100000000} 
                    step={500000} 
                    value={monthlyExpense} 
                    onChange={(e) => setMonthlyExpense(Number(e.target.value))}
                    className="w-full h-2 bg-surface-container-highest dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary dark:accent-[#a7c8ff]"
                  />
                  <p className="text-[10px] text-on-surface-variant/70 dark:text-slate-500 mt-1">Estimasi biaya hidup saat Anda pensiun nanti.</p>
                </div>

                <div>
                  <div className="flex justify-between items-end mb-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant dark:text-slate-400">Target FIRE</label>
                    <span className="text-lg font-extrabold text-primary dark:text-[#a7c8ff]">Rp {fireTarget.toLocaleString('id-ID')}</span>
                  </div>
                </div>
              </div>

              {/* Savings & Investments */}
              <div className="space-y-5">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant dark:text-slate-400">Investasi Bulanan</label>
                    <div className="flex items-center gap-1 bg-surface-container dark:bg-white/5 px-2.5 py-1 rounded-xl border border-outline-variant/10 focus-within:border-tertiary">
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
                    type="range" 
                    min={0} 
                    max={100000000} 
                    step={500000} 
                    value={monthlySavings} 
                    onChange={(e) => setMonthlySavings(Number(e.target.value))}
                    className="w-full h-2 bg-surface-container-highest dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-tertiary dark:accent-[#ffb4ab]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant dark:text-slate-400 mb-1 block">Return Tahunan (%)</label>
                    <input 
                      type="number" 
                      value={expectedReturn} 
                      onChange={(e) => setExpectedReturn(Number(e.target.value))}
                      className="w-full bg-surface-container-lowest dark:bg-black/30 border border-outline-variant/30 dark:border-white/10 rounded-xl px-3 py-2 text-sm font-bold text-on-surface dark:text-white focus:outline-none focus:border-primary dark:focus:border-[#a7c8ff]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant dark:text-slate-400 mb-1 block">Inflasi (%)</label>
                    <input 
                      type="number" 
                      value={inflation} 
                      onChange={(e) => setInflation(Number(e.target.value))}
                      className="w-full bg-surface-container-lowest dark:bg-black/30 border border-outline-variant/30 dark:border-white/10 rounded-xl px-3 py-2 text-sm font-bold text-on-surface dark:text-white focus:outline-none focus:border-primary dark:focus:border-[#a7c8ff]"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-end mb-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant dark:text-slate-400 block">Safe Withdrawal Rate (%)</label>
                    <span className="text-xs font-bold text-on-surface dark:text-white">{swr}%</span>
                  </div>
                  <p className="text-[10px] text-on-surface-variant/70 dark:text-slate-500 mb-2 leading-relaxed">Aturan 4% (Rule of 25) adalah standar umum penarikan dana aman tahunan dari portofolio saat pensiun.</p>
                  <input 
                    type="range" 
                    min={2} 
                    max={10} 
                    step={0.5} 
                    value={swr} 
                    onChange={(e) => setSwr(Number(e.target.value))}
                    className="w-full h-1.5 bg-surface-container-highest dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary-fixed dark:accent-slate-400"
                  />
                </div>
              </div>
            </div>
            
            <button 
              onClick={onClose}
              className="mt-8 w-full hidden md:block py-3 rounded-xl font-bold bg-surface-container-low hover:bg-surface-container dark:bg-white/5 dark:hover:bg-white/10 text-on-surface dark:text-white transition-colors border border-outline-variant/20 dark:border-white/10 cursor-pointer"
            >
              Tutup Kalkulator
            </button>
          </div>

          {/* Right Panel - Chart & Results */}
          <div className="w-full md:w-2/3 p-6 md:p-8 flex flex-col bg-surface dark:bg-transparent overflow-y-visible md:overflow-y-auto h-auto md:h-full">
            <div className="md:hidden flex justify-end mb-4">
               {/* Mobile close button is in header */}
            </div>

            <div className="flex-1 flex flex-col">
              {/* Result Banner */}
              <div className={`p-6 rounded-2xl mb-8 flex items-center justify-between border ${projectionData.fireYear !== null ? 'bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-400' : 'bg-orange-500/10 border-orange-500/20 text-orange-700 dark:text-orange-400'}`}>
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-widest opacity-80 mb-1">Proyeksi Pencapaian</h3>
                  {projectionData.fireYear !== null ? (
                    <p className="text-2xl md:text-3xl font-extrabold font-headline">
                      Anda bisa pensiun dalam <span className="text-3xl md:text-4xl tabular-nums">{projectionData.fireYear}</span> tahun! 🎉
                    </p>
                  ) : (
                    <p className="text-xl md:text-2xl font-extrabold font-headline">
                      Target belum tercapai dalam 40 tahun.
                    </p>
                  )}
                </div>
                <div className="hidden sm:flex w-16 h-16 rounded-full bg-white/20 items-center justify-center">
                  <span className="material-symbols-outlined text-4xl">
                    {projectionData.fireYear !== null ? 'celebration' : 'warning'}
                  </span>
                </div>
              </div>

              {/* Chart */}
              <div className="h-[320px] md:h-auto md:flex-1 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={projectionData.data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <defs>
                      <linearGradient id="colorNw" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#a7c8ff" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#a7c8ff" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-outline-variant/30 dark:text-white/5" />
                    <XAxis 
                      dataKey="year" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: 'currentColor', fontSize: 12 }} 
                      className="text-on-surface-variant dark:text-slate-400"
                      tickMargin={10}
                      minTickGap={30}
                    />
                    <YAxis 
                      tickFormatter={formatCurrency}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: 'currentColor', fontSize: 12 }}
                      className="text-on-surface-variant dark:text-slate-400"
                      width={80}
                    />
                    <Tooltip 
                      formatter={(value: number) => [`Rp ${value.toLocaleString('id-ID')}`, '']}
                      labelFormatter={(label) => `${label}`}
                      contentStyle={{ borderRadius: '16px', border: 'none', backgroundColor: '#191c1e', color: '#fff', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}
                      itemStyle={{ color: '#a7c8ff', fontWeight: 'bold' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="netWorth" 
                      name="Kekayaan Bersih" 
                      stroke="#004b99" 
                      fill="url(#colorNw)" 
                      className="dark:stroke-[#a7c8ff]"
                      strokeWidth={3}
                    />
                    <Line 
                      type="stepAfter" 
                      dataKey="target" 
                      name="Target FIRE" 
                      stroke="#ffb4ab" 
                      strokeWidth={2} 
                      strokeDasharray="5 5" 
                      dot={false}
                    />
                    
                    {projectionData.fireYear !== null && (
                      <ReferenceLine 
                        x={`Tahun ${projectionData.fireYear}`} 
                        stroke="#4ade80" 
                        strokeDasharray="3 3" 
                        label={{ position: 'top', value: 'Bebas Finansial', fill: '#4ade80', fontSize: 10, fontWeight: 'bold' }} 
                      />
                    )}
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-6 flex items-center justify-center gap-6">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-primary dark:bg-[#a7c8ff]"></div>
                  <span className="text-xs font-bold text-on-surface-variant dark:text-slate-400">Proyeksi Kekayaan</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-1 border-t-2 border-dashed border-tertiary dark:border-[#ffb4ab]"></div>
                  <span className="text-xs font-bold text-on-surface-variant dark:text-slate-400">Target FIRE</span>
                </div>
              </div>

            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default FinanceFIRECalculatorModal;
