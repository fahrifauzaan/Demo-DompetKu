import React from 'react';

interface AssetCardVisualProps {
  asset: any;
}

const AssetCardVisual: React.FC<AssetCardVisualProps> = ({ asset }) => {
  const category = asset.category;
  const title = asset.title || '';
  const lowerTitle = title.toLowerCase();
  const subType = (asset.subType || '').toLowerCase();
  
  // Extract initials (max 2 characters)
  const cleanTitle = title.replace(/[^a-zA-Z0-9 ]/g, '').trim();
  const words = cleanTitle.split(/\s+/);
  let initials = '';
  if (words.length >= 2) {
    initials = (words[0][0] + words[1][0]).toUpperCase();
  } else if (words[0]) {
    initials = words[0].substring(0, 2).toUpperCase();
  }

  // Determine Icon and Gradient based on category/subType/keywords
  let iconName = 'category';
  let gradientStyle = 'linear-gradient(135deg, #1e293b 0%, #0f172a 50%, #020617 100%)'; // Default dark metal
  let glowColor = 'rgba(255,255,255,0.06)'; // Default soft silver glow
  
  if (category === 'real-estat' || lowerTitle.includes('rumah') || lowerTitle.includes('apartemen') || lowerTitle.includes('kost') || lowerTitle.includes('senayan') || lowerTitle.includes('park') || subType.includes('property') || subType.includes('estat')) {
    iconName = 'domain';
    // Deep emerald-to-navy premium gradient
    gradientStyle = 'linear-gradient(135deg, #064e3b 0%, #022c22 60%, #08100c 100%)';
    glowColor = 'rgba(16,185,129,0.15)';
  } else if (category === 'kendaraan' || subType.includes('vehicle') || subType.includes('kendaraan') || lowerTitle.includes('mobil') || lowerTitle.includes('motor') || lowerTitle.includes('wuling') || lowerTitle.includes('porsche') || lowerTitle.includes('cloud ev')) {
    iconName = 'directions_car';
    // Sleek sports carbon-to-navy gradient
    gradientStyle = 'linear-gradient(135deg, #0d1e3d 0%, #071024 60%, #030611 100%)';
    glowColor = 'rgba(59,130,246,0.18)';
  } else if (subType.includes('electron') || subType.includes('gadget') || lowerTitle.includes('macbook') || lowerTitle.includes('phone') || lowerTitle.includes('laptop') || lowerTitle.includes('kulkas') || lowerTitle.includes('kompor') || lowerTitle.includes('laundry') || lowerTitle.includes('refrigerator') || lowerTitle.includes('aqua') || lowerTitle.includes('laundry') || lowerTitle.includes('cuci') || lowerTitle.includes('cooker') || lowerTitle.includes('catristo')) {
    iconName = lowerTitle.includes('macbook') || lowerTitle.includes('laptop') ? 'laptop' : 
               lowerTitle.includes('phone') || lowerTitle.includes('hp') || lowerTitle.includes('smartphone') ? 'smartphone' : 
               lowerTitle.includes('kulkas') || lowerTitle.includes('refrigerator') || lowerTitle.includes('aqua') ? 'kitchen' :
               lowerTitle.includes('laundry') || lowerTitle.includes('cuci') ? 'local_laundry_service' :
               lowerTitle.includes('kompor') || lowerTitle.includes('cooker') || lowerTitle.includes('catristo') ? 'oven' : 'devices';
    // High-tech deep space purple-to-indigo gradient
    gradientStyle = 'linear-gradient(135deg, #240b36 0%, #110221 60%, #05000a 100%)';
    glowColor = 'rgba(192,132,252,0.18)';
  } else if (subType.includes('watch') || subType.includes('jewel') || lowerTitle.includes('patek') || lowerTitle.includes('watch') || lowerTitle.includes('jam') || lowerTitle.includes('emas') || lowerTitle.includes('gold')) {
    iconName = subType.includes('jewel') || lowerTitle.includes('emas') || lowerTitle.includes('gold') ? 'diamond' : 'watch';
    // Luxury bronze-to-gold-to-black gradient
    gradientStyle = 'linear-gradient(135deg, #2c1b09 0%, #150c04 60%, #070301 100%)';
    glowColor = 'rgba(245,158,11,0.18)';
  } else if (subType.includes('art') || subType.includes('antique') || lowerTitle.includes('affandi') || lowerTitle.includes('paint') || lowerTitle.includes('art') || lowerTitle.includes('lukisan')) {
    iconName = 'palette';
    // Artistic royal berry-to-purple gradient
    gradientStyle = 'linear-gradient(135deg, #31102f 0%, #12001c 60%, #060009 100%)';
    glowColor = 'rgba(236,72,153,0.18)';
  }

  return (
    <div 
      className="relative w-full h-full flex flex-col justify-between pt-5 pb-4.5 px-5 select-none overflow-hidden transition-all duration-500 group-hover:scale-[1.02] border border-white/[0.04] rounded-2xl shadow-xl shadow-black/25"
      style={{ background: gradientStyle }}
    >
      {/* Mesh glow light effect */}
      <div 
        className="absolute right-[-20%] bottom-[-20%] w-[80%] h-[80%] rounded-full blur-[70px] pointer-events-none"
        style={{ background: `radial-gradient(circle, ${glowColor} 0%, transparent 80%)` }}
      />
      
      {/* Decorative Grid Lines Overlay (Sleek Fintech Credit Card feel) */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(transparent_50%,rgba(0,0,0,0.5)_100%)] pointer-events-none" />

      {/* Header section of card */}
      <div className="flex justify-between items-start z-10 w-full">
        {/* Chip or Premium Simplex Accent */}
        <div className="w-9 h-6.5 rounded-md bg-gradient-to-r from-amber-400/20 to-yellow-500/10 border border-yellow-500/20 flex items-center justify-center backdrop-blur-sm opacity-70">
          {/* Subtle SIM chip graphic */}
          <div className="grid grid-cols-3 gap-[2px] w-5.5 h-3.5 opacity-60">
            <div className="border border-white/20 rounded-[1px]" />
            <div className="border border-white/20 rounded-[1px]" />
            <div className="border border-white/20 rounded-[1px]" />
            <div className="border border-white/20 rounded-[1px]" />
            <div className="border border-white/20 rounded-[1px]" />
            <div className="border border-white/20 rounded-[1px]" />
          </div>
        </div>
        
        {/* Editorial Initials badge */}
        <span className="font-serif italic text-2xl lg:text-3xl font-black text-white/15 tracking-wider">
          {initials}
        </span>
      </div>

      {/* Center Display: Giant glowing icon */}
      <div className="flex flex-col items-center justify-center py-1 z-10">
        <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.08] backdrop-blur-md flex items-center justify-center shadow-lg transition-transform duration-500 group-hover:scale-110">
          <span className="material-symbols-outlined text-3xl text-white" style={{ fontVariationSettings: "'FILL' 0, 'wght' 300" }}>
            {iconName}
          </span>
        </div>
      </div>

      {/* Footer section of card */}
      <div className="flex justify-between items-end z-10 w-full mt-auto gap-4">
        <div className="flex flex-col flex-1 min-w-0">
          <span className="text-[8px] uppercase tracking-widest text-white/35 font-bold">Lacak Aset</span>
          <span className="text-[10px] text-white/90 font-semibold tracking-wide font-sans line-clamp-2 break-words">
            {title}
          </span>
        </div>
        
        {/* Premium Visa/World Elite branding accent */}
        <div className="flex items-center gap-[2px] opacity-30">
          <div className="w-3.5 h-3.5 rounded-full bg-white/40" />
          <div className="w-3.5 h-3.5 rounded-full bg-white/25 -ml-2" />
        </div>
      </div>
    </div>
  );
};

export default AssetCardVisual;
