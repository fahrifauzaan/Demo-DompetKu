import React from 'react';
import { X, ExternalLink } from 'lucide-react';

export interface FeatureCTA {
  title: string;
  description: string;
  icon?: string;
}

interface MarketingCTAModalProps {
  isOpen?: boolean;
  onClose: () => void;
  feature?: FeatureCTA | null;
}

const MarketingCTAModal: React.FC<MarketingCTAModalProps> = ({ isOpen = true, onClose, feature }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start sm:items-center justify-center p-3 sm:p-4 md:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-surface-container-lowest dark:bg-[#191c1e] w-full max-w-md my-auto rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 zoom-in-95 duration-200 border border-outline-variant/10 dark:border-white/10 relative max-h-[calc(100vh-1.5rem)] sm:max-h-[calc(100vh-2rem)] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-surface-container-low dark:hover:bg-white/10 transition-colors text-outline z-10"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-5 sm:p-6 lg:p-8 text-center flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-primary-container/20 dark:bg-white/5 flex items-center justify-center mb-6">
             <span className="material-symbols-outlined text-4xl text-primary dark:text-[#a7c8ff]" style={{ fontVariationSettings: "'FILL' 1" }}>
               {feature && feature.icon ? feature.icon : 'campaign'}
             </span>
          </div>
          <h2 className="text-2xl font-headline font-extrabold text-on-surface dark:text-white mb-3 leading-tight">
            {feature ? feature.title : 'Upgrade Sistem Anda'}
          </h2>
          <p className="text-on-surface-variant dark:text-outline font-medium text-sm leading-relaxed mb-8">
            {feature ? (
              <>
                {feature.description}
                <span className="block mt-4 pt-4 border-t border-outline-variant/10 dark:border-white/10 text-xs italic opacity-80">Fitur ini tersedia secara eksklusif pada versi Enterprise. Hubungi kami untuk demonstrasi langsung.</span>
              </>
            ) : (
              'Fitur ini tersedia secara penuh pada versi produksi. Ingin sistem ini lebih lengkap dan disesuaikan dengan kebutuhan bisnis Anda? Silakan menghubungi tim representatif kami.'
            )}
          </p>
          
          <div className="flex flex-col w-full gap-3">
            <a 
              href="https://wa.me/6287751334784" 
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3.5 bg-gradient-to-r from-primary to-primary-container dark:from-[#a7c8ff] dark:to-[#82b1ff] text-white dark:text-[#001b3c] rounded-xl font-extrabold flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg hover:shadow-xl hover:opacity-90"
            >
              <span className="material-symbols-outlined text-lg">chat</span>
              Hubungi Marketing Kami
            </a>
            <button 
              onClick={onClose}
              className="w-full py-3.5 bg-surface-container-low dark:bg-white/5 text-on-surface dark:text-white rounded-xl font-bold hover:bg-surface-container-high transition-colors active:scale-95"
            >
              Kembali ke Demo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarketingCTAModal;
