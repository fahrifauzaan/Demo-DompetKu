import React, { useState } from 'react';
import { useFinanceStore } from '../store/useFinanceStore';

interface FinanceEmergencyFundModalProps {
  onClose: () => void;
}

const FinanceEmergencyFundModal: React.FC<FinanceEmergencyFundModalProps> = ({ onClose }) => {
  const { settings, updateSettings } = useFinanceStore();
  
  const getSetting = (key: string, fallback: string) => {
    return settings.find(s => s.key === key)?.value || fallback;
  };

  const [target, setTarget] = useState(getSetting('emergencyFundTarget', '750000000'));
  const [current, setCurrent] = useState(getSetting('emergencyFundCurrent', '637500000'));

  const handleTargetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '');
    setTarget(val || '0');
  };

  const handleCurrentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '');
    setCurrent(val || '0');
  };

  const handleSave = async () => {
    const newSettings = [...settings];
    
    const updateOrAdd = (key: string, value: string) => {
      const index = newSettings.findIndex(s => s.key === key);
      if (index >= 0) {
        newSettings[index] = { key, value };
      } else {
        newSettings.push({ key, value });
      }
    };

    updateOrAdd('emergencyFundTarget', target);
    updateOrAdd('emergencyFundCurrent', current);

    await updateSettings(newSettings);
    onClose();
  };

  const percent = Number(target) > 0 ? Math.min(Math.round((Number(current) / Number(target)) * 100), 100) : 0;

  return (
    <div className="fixed inset-0 z-[100] flex items-start sm:items-center justify-center p-3 sm:p-4 md:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-surface-container-lowest dark:bg-[#191c1e] w-full max-w-md my-auto rounded-2xl sm:rounded-3xl shadow-2xl animate-in slide-in-from-bottom-4 zoom-in-95 duration-200 border border-outline-variant/10 dark:border-white/10 p-4 sm:p-6 lg:p-8 max-h-[calc(100vh-1.5rem)] sm:max-h-[calc(100vh-2rem)] overflow-y-auto">
        
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 dark:bg-[#a7c8ff]/20 flex items-center justify-center text-primary dark:text-[#a7c8ff]">
              <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>shield</span>
            </div>
            <div>
              <h2 className="text-xl font-bold font-headline text-on-surface dark:text-white">Pengaturan Dana Darurat</h2>
              <p className="text-xs text-on-surface-variant dark:text-outline font-medium">Kelola target perlindungan finansialmu.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-surface-container-high dark:hover:bg-white/10 text-on-surface-variant dark:text-outline transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="space-y-6">
          {/* Target Input */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant dark:text-outline">Target Dana Darurat</label>
            <div className="flex items-center gap-2 bg-surface-container-low dark:bg-white/5 px-4 py-3 rounded-xl focus-within:ring-2 focus-within:ring-primary/20 dark:focus-within:ring-white/20 transition-all">
              <span className="font-bold text-on-surface-variant dark:text-outline">Rp</span>
              <input 
                type="text" 
                value={Number(target).toLocaleString('id-ID')}
                onChange={handleTargetChange}
                className="w-full bg-transparent border-none p-0 font-headline text-lg font-bold text-on-surface dark:text-white tabular-nums focus:ring-0"
              />
            </div>
          </div>

          {/* Current Input */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant dark:text-outline">Terkumpul Saat Ini</label>
            <div className="flex items-center gap-2 bg-surface-container-low dark:bg-white/5 px-4 py-3 rounded-xl focus-within:ring-2 focus-within:ring-primary/20 dark:focus-within:ring-white/20 transition-all">
              <span className="font-bold text-on-surface-variant dark:text-outline">Rp</span>
              <input 
                type="text" 
                value={Number(current).toLocaleString('id-ID')}
                onChange={handleCurrentChange}
                className="w-full bg-transparent border-none p-0 font-headline text-lg font-bold text-on-surface dark:text-white tabular-nums focus:ring-0"
              />
            </div>
          </div>

          {/* Progress Visual */}
          <div className="bg-surface-container dark:bg-white/5 p-4 rounded-xl border border-outline-variant/10 dark:border-white/10">
            <div className="flex justify-between items-end mb-2">
              <span className="text-xs font-bold text-on-surface-variant dark:text-outline">Progress</span>
              <span className="text-xl font-extrabold font-headline text-primary dark:text-[#a7c8ff]">{percent}%</span>
            </div>
            <div className="w-full h-3 bg-surface-container-high dark:bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-tertiary-fixed-dim dark:bg-tertiary-fixed rounded-full transition-all duration-500" style={{ width: `${percent}%` }}></div>
            </div>
          </div>
          
          <div className="pt-4 flex gap-3">
            <button 
              onClick={onClose}
              className="flex-1 py-3 bg-surface-container dark:bg-white/10 text-on-surface-variant dark:text-outline rounded-xl font-bold hover:bg-surface-bright dark:hover:bg-white/20 transition-colors active:scale-95"
            >
              Batal
            </button>
            <button 
              onClick={handleSave}
              className="flex-1 py-3 bg-primary dark:bg-[#a7c8ff] text-white dark:text-[#001b3c] rounded-xl font-bold hover:opacity-90 active:scale-95 transition-all shadow-md shadow-primary/20"
            >
              Simpan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinanceEmergencyFundModal;
