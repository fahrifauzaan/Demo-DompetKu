import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface FinancePinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  savedPin: string; // The correct PIN to check against
  title?: string;
  subtitle?: string;
}

const FinancePinModal: React.FC<FinancePinModalProps> = ({ 
  isOpen, 
  onClose, 
  onSuccess, 
  savedPin,
  title = "Masukkan PIN",
  subtitle = "Demi keamanan, masukkan 6 digit PIN Transaksi Anda."
}) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPin('');
      setError(false);
    }
  }, [isOpen]);

  const handleKeyPress = (num: string) => {
    if (pin.length < 6) {
      const newPin = pin + num;
      setPin(newPin);
      setError(false);
      
      if (newPin.length === 6) {
        // Validate
        if (newPin === savedPin) {
          setTimeout(() => {
            onSuccess();
          }, 300);
        } else {
          setError(true);
          setTimeout(() => setPin(''), 500); // clear after short delay
        }
      }
    }
  };

  const handleBackspace = () => {
    setPin(prev => prev.slice(0, -1));
    setError(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" 
            onClick={onClose}
          />
          <motion.div 
            initial={{ scale: 0.95, opacity: 0, y: 20 }} 
            animate={{ scale: 1, opacity: 1, y: 0 }} 
            exit={{ scale: 0.95, opacity: 0, y: 20 }} 
            className="relative w-full max-w-sm bg-surface-container-lowest dark:bg-[#0b1221] p-5 sm:p-6 lg:p-8 rounded-2xl sm:rounded-[28px] lg:rounded-[32px] border border-white/20 shadow-2xl overflow-hidden flex flex-col items-center"
          >
            <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-primary/10 to-transparent pointer-events-none" />
            
            <button 
              onClick={onClose}
              className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 dark:bg-white/5 text-slate-500 hover:bg-slate-200 transition-colors z-10"
            >
              <span className="material-symbols-outlined text-sm">close</span>
            </button>

            <div className="w-16 h-16 rounded-full bg-primary/10 text-primary dark:bg-primary/20 flex items-center justify-center mb-6">
              <span className="material-symbols-outlined text-3xl">lock</span>
            </div>

            <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2 text-center">{title}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 text-center mb-8 px-4 leading-relaxed">{subtitle}</p>

            <motion.div 
              animate={error ? { x: [-10, 10, -10, 10, 0] } : {}}
              transition={{ duration: 0.4 }}
              className="flex justify-center gap-4 mb-10"
            >
              {[...Array(6)].map((_, i) => (
                <div 
                  key={i} 
                  className={`w-4 h-4 rounded-full transition-all duration-300 ${
                    i < pin.length 
                      ? error ? 'bg-red-500 scale-110' : 'bg-primary dark:bg-blue-400 scale-110' 
                      : 'bg-slate-200 dark:bg-white/10'
                  }`} 
                />
              ))}
            </motion.div>

            <div className="grid grid-cols-3 gap-y-6 gap-x-8 w-full max-w-[260px]">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <button
                  key={num}
                  onClick={() => handleKeyPress(num.toString())}
                  className="w-16 h-16 mx-auto rounded-full text-2xl font-semibold text-slate-800 dark:text-white hover:bg-slate-100 dark:hover:bg-white/5 active:bg-slate-200 dark:active:bg-white/10 transition-colors flex items-center justify-center"
                >
                  {num}
                </button>
              ))}
              <div /> {/* Empty space */}
              <button
                onClick={() => handleKeyPress('0')}
                className="w-16 h-16 mx-auto rounded-full text-2xl font-semibold text-slate-800 dark:text-white hover:bg-slate-100 dark:hover:bg-white/5 active:bg-slate-200 dark:active:bg-white/10 transition-colors flex items-center justify-center"
              >
                0
              </button>
              <button
                onClick={handleBackspace}
                className="w-16 h-16 mx-auto rounded-full text-2xl font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 active:bg-slate-200 dark:active:bg-white/10 transition-colors flex items-center justify-center"
              >
                <span className="material-symbols-outlined">backspace</span>
              </button>
            </div>
            
            {error && (
              <p className="absolute bottom-6 text-red-500 text-sm font-medium animate-in fade-in">
                PIN yang Anda masukkan salah.
              </p>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default FinancePinModal;
