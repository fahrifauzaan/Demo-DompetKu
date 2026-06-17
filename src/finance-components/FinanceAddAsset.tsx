import React, { useState } from 'react';
import { FeatureCTA } from './MarketingCTAModal';
import { useFinanceStore, formatDateString } from '../store/useFinanceStore';

interface FinanceAddAssetProps {
  onShowCTA: (feature?: FeatureCTA) => void;
  onBack: () => void;
}

type AssetType = 'liquid' | 'physical' | 'investment';

const FinanceAddAsset: React.FC<FinanceAddAssetProps> = ({ onShowCTA, onBack }) => {
  const [assetType, setAssetType] = useState<AssetType>('liquid');
  const [assetName, setAssetName] = useState('');
  const [assetValue, setAssetValue] = useState('0');
  const [valuationReminder, setValuationReminder] = useState(true);
  const [documentLink, setDocumentLink] = useState('');
  
  // Investment Specific State
  const [ticker, setTicker] = useState('');
  const [units, setUnits] = useState('100');
  const [avgPrice, setAvgPrice] = useState('9.150');
  const [brokerFee, setBrokerFee] = useState('13.725');
  const [platform, setPlatform] = useState('Ajaib Sekuritas');
  const [investmentCategory, setInvestmentCategory] = useState('Saham');
  const [interestRate, setInterestRate] = useState('6.4');
  const [maturityDate, setMaturityDate] = useState(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 2);
    return d.toISOString().split('T')[0];
  });

  // Fixed Income Specific States
  const [fixedIncomeType, setFixedIncomeType] = useState('Sukuk Tabungan (ST)');
  const [issuer, setIssuer] = useState('SBSN Indonesia');
  const [tenor, setTenor] = useState('2');
  const [tenorUnit, setTenorUnit] = useState('Years');
  const [couponType, setCouponType] = useState('Floating with Floor');
  const [taxRateInput, setTaxRateInput] = useState('10');
  const [paymentDateInput, setPaymentDateInput] = useState('10');
  const [interestPeriod, setInterestPeriod] = useState('Monthly');
  const [investmentPurchaseDate, setInvestmentPurchaseDate] = useState(() => new Date().toISOString().split('T')[0]);

  const platformsForCategory: Record<string, string[]> = {
    Saham: ['Ajaib Sekuritas', 'Stockbit', 'IPOT (Indo Premier)', 'Mandiri Sekuritas', 'RHB Sekuritas', 'Mirae Asset'],
    Crypto: ['Indodax', 'Tokocrypto', 'Pintu', 'Pluang', 'Binance', 'KuCoin'],
    Reksadana: ['Bibit', 'Bareksa', 'Ajaib', 'Pluang', 'IPOT Fund'],
    Bonds: ['Bibit', 'Bareksa', 'BCA (Welma)', 'Mandiri (Livin)', 'IPOT', 'Commonwealth Bank'],
    'Time Deposit': ['BCA', 'Bank Mandiri', 'BRI', 'BNI', 'CIMB Niaga', 'Bank Jago', 'Allo Bank', 'SeaBank'],
    P2P: ['KoinWorks', 'Amartha', 'EasyCash', 'Modalku', 'Asetku']
  };

  const handleCategoryChange = (cat: string) => {
    setInvestmentCategory(cat);
    const defaults = platformsForCategory[cat] || [];
    if (defaults.length > 0) {
      setPlatform(defaults[0]);
    }
    // Pre-fill realistic values based on category
    if (cat === 'Saham') {
      setUnits('10'); // 10 lot
      setAvgPrice('9.150'); // e.g. Rp 9.150 per share (like BBCA)
      setBrokerFee('13.725');
    } else if (cat === 'Crypto') {
      setUnits('0.05'); // e.g. 0.05 BTC
      setAvgPrice('1.100.000.000'); // e.g. Rp 1.1 Milyar per BTC
      setBrokerFee('25.000');
    } else if (cat === 'Reksadana') {
      setUnits('150.25'); // e.g. 150.25 units
      setAvgPrice('4.500'); // e.g. NAV Rp 4.500
      setBrokerFee('0'); // Reksadana purchases are often fee-free (0%)
    } else if (cat === 'Bonds') {
      setUnits('1');
      setAvgPrice('100.000.000');
      setBrokerFee('0');
      setInterestRate('6.4');
      const d = new Date();
      d.setFullYear(d.getFullYear() + 2);
      setMaturityDate(d.toISOString().split('T')[0]);
      setFixedIncomeType('Sukuk Tabungan (ST)');
      setIssuer('SBSN Indonesia');
      setTenor('2');
      setTenorUnit('Years');
      setCouponType('Floating with Floor');
      setTaxRateInput('10');
      setPaymentDateInput('10');
      setInterestPeriod('Monthly');
    } else if (cat === 'Time Deposit') {
      setUnits('1');
      setAvgPrice('50.000.000');
      setBrokerFee('0');
      setInterestRate('4.5');
      const d = new Date();
      d.setFullYear(d.getFullYear() + 1);
      setMaturityDate(d.toISOString().split('T')[0]);
      setFixedIncomeType('Deposito Berjangka');
      setIssuer('');
      setTenor('12');
      setTenorUnit('Months');
      setCouponType('');
      setTaxRateInput('20');
      setPaymentDateInput('10');
      setInterestPeriod('Monthly');
    } else {
      // P2P
      setUnits('1');
      setAvgPrice('10.000.000');
      setBrokerFee('0');
      setInterestRate('12.0');
      const d = new Date();
      d.setFullYear(d.getFullYear() + 1);
      setMaturityDate(d.toISOString().split('T')[0]);
      setFixedIncomeType('Productive Loan');
      setIssuer('');
      setTenor('12');
      setTenorUnit('Months');
      setCouponType('');
      setTaxRateInput('15');
      setPaymentDateInput('10');
      setInterestPeriod('Monthly');
    }
  };

  // Computed values for real-time calculations
  const getCalculatedInvestmentMetrics = () => {
    const parsedUnits = parseFloat(units) || 0;
    // Strip dots (thousands separator) to get the actual numeric string, then parse
    const cleanPrice = avgPrice.replace(/\./g, '').replace(/,/g, '.');
    const parsedPrice = parseFloat(cleanPrice) || 0;
    
    const cleanFee = brokerFee.replace(/\./g, '').replace(/,/g, '.');
    const parsedFee = parseFloat(cleanFee) || 0;

    let totalCost = 0;
    let totalUnitsText = '';
    let priceLabel = '';
    
    if (investmentCategory === 'Saham') {
      // 1 Lot = 100 Lembar
      totalCost = (parsedUnits * 100 * parsedPrice) + parsedFee;
      totalUnitsText = `${(parsedUnits * 100).toLocaleString('id-ID')} lembar`;
      priceLabel = 'lembar';
    } else if (investmentCategory === 'Crypto') {
      totalCost = (parsedUnits * parsedPrice) + parsedFee;
      totalUnitsText = `${parsedUnits} koin`;
      priceLabel = 'koin';
    } else if (investmentCategory === 'Bonds') {
      totalCost = (parsedUnits * parsedPrice) + parsedFee;
      totalUnitsText = `${parsedUnits.toLocaleString('id-ID')} unit`;
      priceLabel = 'unit';
    } else if (investmentCategory === 'Time Deposit') {
      totalCost = (parsedUnits * parsedPrice) + parsedFee;
      totalUnitsText = `${parsedUnits.toLocaleString('id-ID')} bilyet`;
      priceLabel = 'bilyet';
    } else if (investmentCategory === 'P2P') {
      totalCost = (parsedUnits * parsedPrice) + parsedFee;
      totalUnitsText = `${parsedUnits.toLocaleString('id-ID')} portfolio`;
      priceLabel = 'portfolio';
    } else {
      // Reksadana
      totalCost = (parsedUnits * parsedPrice) + parsedFee;
      totalUnitsText = `${parsedUnits.toLocaleString('id-ID')} unit`;
      priceLabel = 'unit';
    }

    return {
      totalCost,
      totalUnitsText,
      priceLabel
    };
  };

  const { totalCost: computedTotalCost, totalUnitsText: computedUnitsText, priceLabel: computedPriceLabel } = getCalculatedInvestmentMetrics();

  const assets = useFinanceStore(state => state.assets);
  const existingInvestmentTotal = assets
    .filter(a => a.category === 'investasi')
    .reduce((sum, a) => sum + a.currentValue, 0);

  const totalPortfolio = existingInvestmentTotal + computedTotalCost;
  const newAssetPercentage = totalPortfolio > 0 ? Math.round((computedTotalCost / totalPortfolio) * 100) : 0;
  const existingPercentage = 100 - newAssetPercentage;

  const formatCompactVal = (val: number) => {
    if (val >= 1000000000) {
      return `Rp ${(val / 1000000000).toLocaleString('id-ID', { maximumFractionDigits: 2 })} M`;
    }
    if (val >= 1000000) {
      return `Rp ${(val / 1000000).toLocaleString('id-ID', { maximumFractionDigits: 1 })} Jt`;
    }
    if (val >= 1000) {
      return `Rp ${(val / 1000).toLocaleString('id-ID', { maximumFractionDigits: 0 })}k`;
    }
    return `Rp ${val.toLocaleString('id-ID')}`;
  };

  // Physical Asset Specific State
  const [physicalCategory, setPhysicalCategory] = useState('Properti');
  const [location, setLocation] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('2.000.000.000');
  const [purchaseDate, setPurchaseDate] = useState('2023-01-01');
  const [valuationType, setValuationType] = useState<'Apresiasi' | 'Depresiasi' | 'Manual'>('Apresiasi');
  const [valuationPercentage, setValuationPercentage] = useState('5.0');

  // New Physical Asset attributes for Depreciation & Details
  const [landArea, setLandArea] = useState('');
  const [buildingArea, setBuildingArea] = useState('');
  const [specification, setSpecification] = useState('');
  const [mfgYear, setMfgYear] = useState('');
  const [usefulLife, setUsefulLife] = useState('10');
  const [depreciationMethod, setDepreciationMethod] = useState<'Garis Lurus Tahunan' | 'Garis Lurus Bulanan' | 'Tidak Menyusut'>('Tidak Menyusut');
  const [subType, setSubType] = useState('Electronics');
  const [currentValuationInput, setCurrentValuationInput] = useState('2.000.000.000');

  // Liquid Asset Specific State
  const [institution, setInstitution] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [currency, setCurrency] = useState('Rupiah (IDR)');
  const [step, setStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);

  const addAccount = useFinanceStore(state => state.addAccount);
  const addAsset = useFinanceStore(state => state.addAsset);

  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '');
    if (!val) {
      setAssetValue('0');
      return;
    }
    setAssetValue(parseInt(val, 10).toLocaleString('id-ID'));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (assetType === 'liquid') {
        if (!institution) {
          alert('Nama institusi tidak boleh kosong!');
          setIsSaving(false);
          return;
        }
        const parsedBalance = parseInt(assetValue.replace(/\D/g, ''), 10) || 0;
        
        let typeIcon = 'account_balance';
        let typeVal: 'bank' | 'wallet' | 'cash' = 'bank';
        
        const walletInstitutions = ['GoPay', 'OVO', 'Dana', 'LinkAja', 'ShopeePay', 'Jenius', 'Blu BCA', 'Jago', 'Neobank', 'BTPN Jenius'];
        const investInstitutions = ['Ajaib', 'Bibit', 'Pluang', 'Stockbit', 'IPOT', 'RHB Sekuritas', 'Mandiri Sekuritas', 'Bareksa'];
        if (walletInstitutions.includes(institution)) {
          typeIcon = 'account_balance_wallet';
          typeVal = 'wallet';
        } else if (investInstitutions.includes(institution)) {
          typeIcon = 'trending_up';
          typeVal = 'bank';
        } else if (institution === 'Cash' || institution === 'Tunai') {
          typeIcon = 'payments';
          typeVal = 'cash';
        }

        const name = accountNumber ? `${institution} - ${accountNumber}` : institution;
        const curCode = currency.includes('USD') ? 'USD' : currency.includes('SGD') ? 'SGD' : 'IDR';

        await addAccount({
          name,
          type: typeVal,
          balance: parsedBalance,
          currency: curCode,
          icon: typeIcon,
          startDate: new Date().toISOString().split('T')[0],
          valuationReminder,
          lastValuationUpdate: new Date().toISOString().split('T')[0]
        });
      } else if (assetType === 'physical') {
        if (!assetName.trim()) {
          alert('Nama aset tidak boleh kosong!');
          setIsSaving(false);
          return;
        }
        const parsedPrice = parseInt(purchasePrice.replace(/\D/g, ''), 10) || 0;
        
        let cat: 'real-estat' | 'kendaraan' | 'koleksi' = 'koleksi';
        let icon = 'category';
        let noteText = '';
        let finalSubType = subType;

        let finalTitle = assetName;
        if (physicalCategory === 'Aset Personal') {
          finalTitle = assetName && specification ? `${assetName} - ${specification}` : (specification || assetName);
        }

        if (physicalCategory === 'Properti') {
          cat = 'real-estat';
          icon = 'home';
          finalSubType = 'property';
          noteText = `Property • Luas Tanah: ${landArea || '-'} m², Luas Bangunan: ${buildingArea || '-'} m²`;
        } else if (physicalCategory === 'Kendaraan') {
          cat = 'kendaraan';
          icon = 'directions_car';
          finalSubType = 'vehicle';
          noteText = `Vehicle • No. Pol: ${specification || '-'} • Masa Manfaat: ${usefulLife} Tahun`;
        } else {
          // Aset Personal
          cat = 'koleksi';
          finalSubType = subType;
          if (subType === 'Jewelry') icon = 'diamond';
          else if (subType === 'Watches') icon = 'watch';
          else if (subType === 'Electronics') {
            const isPhone = /iphone|phone|samsung|android|xiaomi|hp|handphone|smartphone|gadget/i.test(finalTitle || assetName || specification || '');
            icon = isPhone ? 'smartphone' : 'laptop';
          }
          else if (subType === 'Home Furnishings') icon = 'chair';
          else icon = 'palette';
          noteText = `Personal Asset • Sub-Type: ${subType} • Masa Manfaat: ${usefulLife} Tahun`;
        }

        const parsedCurrentVal = physicalCategory === 'Properti' 
          ? (parseInt(currentValuationInput.replace(/\D/g, ''), 10) || parsedPrice)
          : parsedPrice;

        await addAsset({
          title: finalTitle,
          category: cat,
          subType: finalSubType,
          purchasePrice: parsedPrice,
          currentValue: parsedCurrentVal,
          purchaseDate: formatDateString(purchaseDate),
          location,
          icon,
          equity: 100,
          notes: noteText,
          usefulLife: Number(usefulLife) || 10,
          depreciationMethod: depreciationMethod,
          landArea: landArea ? Number(landArea) : undefined,
          buildingArea: buildingArea ? Number(buildingArea) : undefined,
          mfgYear: mfgYear ? Number(mfgYear) : undefined,
          specification: specification || undefined,
          valuationReminder,
          documentLink: documentLink || undefined,
          lastValuationUpdate: new Date().toISOString().split('T')[0]
        });
      } else if (assetType === 'investment') {
        if (!assetName.trim()) {
          alert('Nama aset investasi / ticker tidak boleh kosong!');
          setIsSaving(false);
          return;
        }

        let noteText = '';
        if (investmentCategory === 'Saham') {
          noteText = `${investmentCategory} • ${units} Lot (${computedUnitsText}) • Avg Rp ${avgPrice}/lembar`;
        } else if (investmentCategory === 'Crypto') {
          noteText = `${investmentCategory} • ${computedUnitsText} • Avg Rp ${avgPrice}/koin`;
        } else if (investmentCategory === 'Reksadana') {
          noteText = `${investmentCategory} • ${computedUnitsText} • Avg Rp ${avgPrice}/unit`;
        } else if (investmentCategory === 'Bonds') {
          noteText = `${fixedIncomeType} • Seri ${assetName} • Kupon ${interestRate}% (${couponType})`;
        } else if (investmentCategory === 'Time Deposit') {
          noteText = `${fixedIncomeType} • Bank ${platform} • Bunga ${interestRate}% p.a.`;
        } else if (investmentCategory === 'P2P') {
          noteText = `P2P Lending • ${fixedIncomeType} • Bunga ${interestRate}% p.a.`;
        } else {
          noteText = `${investmentCategory} • Rp ${computedTotalCost.toLocaleString('id-ID')} • Platform: ${platform}`;
        }

        const parsedUnitsNum = parseFloat(units) || 0;
        const cleanPriceStr = avgPrice.replace(/\./g, '').replace(/,/g, '.');
        const parsedPriceNum = parseFloat(cleanPriceStr) || 0;
        const actualShares = investmentCategory === 'Saham' ? parsedUnitsNum * 100 : parsedUnitsNum;

        let finalSubType: 'saham' | 'kripto' | 'reksadana' | 'sbn' | 'deposito' | 'p2p' = 'saham';
        let iconName = 'show_chart';
        if (investmentCategory === 'Saham') {
          finalSubType = 'saham';
          iconName = 'show_chart';
        } else if (investmentCategory === 'Crypto') {
          finalSubType = 'kripto';
          iconName = 'currency_bitcoin';
        } else if (investmentCategory === 'Reksadana') {
          finalSubType = 'reksadana';
          iconName = 'account_balance';
        } else if (investmentCategory === 'Bonds') {
          finalSubType = 'sbn';
          iconName = 'account_balance';
        } else if (investmentCategory === 'Time Deposit') {
          finalSubType = 'deposito';
          iconName = 'savings';
        } else if (investmentCategory === 'P2P') {
          finalSubType = 'p2p';
          iconName = 'show_chart';
        }

        const parsedRate = parseFloat(interestRate) || 6.4;

        await addAsset({
          title: assetName,
          ticker: ticker || assetName.split(' ')[0],
          category: 'investasi',
          subType: finalSubType as any,
          shares: actualShares,
          avgCost: parsedPriceNum,
          currentPrice: parsedPriceNum,
          purchasePrice: computedTotalCost,
          currentValue: computedTotalCost,
          purchaseDate: formatDateString(['Bonds', 'Time Deposit', 'P2P'].includes(investmentCategory) ? investmentPurchaseDate : new Date().toISOString().split('T')[0]),
          location: platform,
          icon: iconName,
          equity: 100,
          notes: noteText,
          interestRate: parsedRate,
          maturityDate: ['Bonds', 'Time Deposit', 'P2P'].includes(investmentCategory) ? formatDateString(maturityDate) : undefined,
          
          // Additional custom fields sent directly to sheet
          fixedIncomeType: ['Bonds', 'Time Deposit', 'P2P'].includes(investmentCategory) ? fixedIncomeType : undefined,
          bondType: investmentCategory === 'Bonds' ? fixedIncomeType : undefined,
          depositType: investmentCategory === 'Time Deposit' ? fixedIncomeType : undefined,
          type: investmentCategory === 'P2P' ? fixedIncomeType : undefined,
          issuer: investmentCategory === 'Bonds' ? issuer : undefined,
          tenor: ['Bonds', 'Time Deposit', 'P2P'].includes(investmentCategory) ? Number(tenor) : undefined,
          tenorUnit: ['Time Deposit', 'P2P'].includes(investmentCategory) ? tenorUnit : undefined,
          couponType: investmentCategory === 'Bonds' ? couponType : undefined,
          tax: ['Bonds', 'Time Deposit', 'P2P'].includes(investmentCategory) ? parseFloat(taxRateInput) / 100 : undefined,
          paymentDate: ['Bonds', 'Time Deposit', 'P2P'].includes(investmentCategory) ? Number(paymentDateInput) : undefined,
          interestPaymentPeriod: ['Bonds', 'Time Deposit', 'P2P'].includes(investmentCategory) ? interestPeriod : undefined
        });
      }
      
      onBack();
    } catch (e) {
      console.error(e);
      alert('Terjadi kesalahan saat menyimpan aset!');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="w-full animate-in slide-in-from-bottom-4 duration-500 pb-24">
      {/* Header with Back Button */}
      <div className="flex items-center gap-4 mb-10">
        <button 
          onClick={onBack}
          className="p-2.5 rounded-full hover:bg-surface-container-high dark:hover:bg-white/10 transition-colors flex items-center justify-center bg-surface-container-low dark:bg-white/5 active:scale-95 text-on-surface dark:text-white"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <div>
          <h2 className="font-headline font-extrabold text-2xl lg:text-4xl tracking-tight text-primary dark:text-[#a7c8ff]">Tambah Aset Baru</h2>
          <p className="text-on-surface-variant dark:text-outline text-xs lg:text-sm font-medium mt-1">Lacak pertumbuhan kekayaan Anda dengan menambahkan instrumen keuangan ke dalam Ledger.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Form Section */}
        <div className="lg:col-span-8 space-y-10">
          
          {/* 1. Pilih Jenis Aset */}
          <section>
            <h3 className="text-lg font-bold text-on-surface dark:text-white mb-6 flex items-center gap-3">
              <span className="w-7 h-7 rounded-full bg-primary-container dark:bg-[#a7c8ff] text-white dark:text-[#001b3c] text-xs flex items-center justify-center font-black">1</span>
              Pilih Jenis Aset
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Asset Type Cards */}
              <button 
                onClick={() => setAssetType('liquid')}
                className={`p-5 text-left rounded-2xl transition-all group relative overflow-hidden ${assetType === 'liquid' ? 'bg-surface-container-lowest dark:bg-white/10 border-2 border-primary-container dark:border-[#a7c8ff] shadow-md' : 'bg-surface-container-low dark:bg-white/5 border-2 border-transparent hover:bg-white dark:hover:bg-white/10'}`}
              >
                <span className={`material-symbols-outlined mb-3 block ${assetType === 'liquid' ? 'text-primary dark:text-[#a7c8ff]' : 'text-on-surface-variant dark:text-slate-400 group-hover:text-primary dark:group-hover:text-[#a7c8ff] transition-colors'}`} style={assetType === 'liquid' ? { fontVariationSettings: "'FILL' 1" } : {}}>account_balance</span>
                <p className={`font-bold ${assetType === 'liquid' ? 'text-primary dark:text-white' : 'text-on-surface dark:text-white'}`}>Aset Lancar</p>
                <p className="text-xs text-on-surface-variant dark:text-outline mt-1">Kas, Rekening Bank, E-Wallet</p>
                {assetType === 'liquid' && (
                  <div className="absolute top-3 right-3">
                    <span className="material-symbols-outlined text-primary dark:text-[#a7c8ff] text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  </div>
                )}
              </button>

              <button 
                onClick={() => setAssetType('physical')}
                className={`p-5 text-left rounded-2xl transition-all group relative overflow-hidden ${assetType === 'physical' ? 'bg-surface-container-lowest dark:bg-white/10 border-2 border-primary-container dark:border-[#a7c8ff] shadow-md' : 'bg-surface-container-low dark:bg-white/5 border-2 border-transparent hover:bg-white dark:hover:bg-white/10'}`}
              >
                <span className={`material-symbols-outlined mb-3 block ${assetType === 'physical' ? 'text-primary dark:text-[#a7c8ff]' : 'text-on-surface-variant dark:text-slate-400 group-hover:text-primary dark:group-hover:text-[#a7c8ff] transition-colors'}`} style={assetType === 'physical' ? { fontVariationSettings: "'FILL' 1" } : {}}>domain</span>
                <p className={`font-bold ${assetType === 'physical' ? 'text-primary dark:text-white' : 'text-on-surface dark:text-white'}`}>Aset Fisik</p>
                <p className="text-xs text-on-surface-variant dark:text-outline mt-1">Properti, Kendaraan, Logam</p>
                {assetType === 'physical' && (
                  <div className="absolute top-3 right-3">
                    <span className="material-symbols-outlined text-primary dark:text-[#a7c8ff] text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  </div>
                )}
              </button>

              <button 
                onClick={() => setAssetType('investment')}
                className={`p-5 text-left rounded-2xl transition-all group relative overflow-hidden ${assetType === 'investment' ? 'bg-surface-container-lowest dark:bg-white/10 border-2 border-primary-container dark:border-[#a7c8ff] shadow-md' : 'bg-surface-container-low dark:bg-white/5 border-2 border-transparent hover:bg-white dark:hover:bg-white/10'}`}
              >
                <span className={`material-symbols-outlined mb-3 block ${assetType === 'investment' ? 'text-primary dark:text-[#a7c8ff]' : 'text-on-surface-variant dark:text-slate-400 group-hover:text-primary dark:group-hover:text-[#a7c8ff] transition-colors'}`} style={assetType === 'investment' ? { fontVariationSettings: "'FILL' 1" } : {}}>show_chart</span>
                <p className={`font-bold ${assetType === 'investment' ? 'text-primary dark:text-white' : 'text-on-surface dark:text-white'}`}>Aset Investasi</p>
                <p className="text-xs text-on-surface-variant dark:text-outline mt-1">Saham, Crypto, Reksa Dana</p>
                {assetType === 'investment' && (
                  <div className="absolute top-3 right-3">
                    <span className="material-symbols-outlined text-primary dark:text-[#a7c8ff] text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  </div>
                )}
              </button>
            </div>
          </section>

            {/* 2. Formulir Detail Aset */}
            <section className="bg-surface-container-low dark:bg-transparent border border-outline-variant/10 dark:border-white/10 rounded-3xl p-8 space-y-8 shadow-sm transition-all duration-500">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-on-surface dark:text-white flex items-center gap-3">
                  <span className="w-7 h-7 rounded-full bg-primary-container dark:bg-[#a7c8ff] text-white dark:text-[#001b3c] text-xs flex items-center justify-center font-black">2</span>
                  Detail {assetType === 'liquid' ? 'Aset Lancar' : assetType === 'physical' ? 'Aset Fisik' : 'Aset Investasi'}
                </h3>
                <span className="text-xs font-bold text-primary dark:text-[#001b3c] px-3 py-1 bg-primary/10 dark:bg-[#a7c8ff] rounded-full uppercase tracking-widest hidden sm:block">
                  {assetType === 'liquid' ? 'Liquid' : assetType === 'physical' ? 'Tangible' : 'Portfolio'}
                </span>
              </div>
              
              {assetType === 'investment' && (
                /* DETAILED INVESTMENT LAYOUT */
                <div className="space-y-8 animate-in fade-in slide-in-from-top-2 duration-500">
                  {/* Instrument Search */}
                  <div className="grid grid-cols-1 gap-6">
                    <div className="space-y-4">
                      <div className="flex gap-4">
                        <div className="relative flex-1">
                          <label className="text-[10px] font-bold text-on-surface-variant dark:text-outline uppercase tracking-widest mb-2 block">
                            {investmentCategory === 'Saham'
                              ? 'Nama Perusahaan / Saham'
                              : investmentCategory === 'Crypto'
                                ? 'Nama Koin / Token'
                                : investmentCategory === 'Reksadana'
                                  ? 'Nama Reksa Dana'
                                  : investmentCategory === 'Bonds'
                                    ? 'Seri SBN / Nama Obligasi'
                                    : investmentCategory === 'Time Deposit'
                                      ? 'Keterangan Deposito'
                                      : 'Nama Produk / Pendaftar'}
                          </label>
                          <div className="flex items-center bg-surface-container-lowest dark:bg-white/5 border border-outline-variant/10 dark:border-white/10 rounded-xl px-4 py-1 focus-within:ring-2 focus-within:ring-primary-container dark:focus-within:ring-white/20 transition-all">
                            <span className="material-symbols-outlined text-outline-variant">search</span>
                            <input 
                              className="w-full bg-transparent border-none p-4 text-sm focus:ring-0 text-on-surface dark:text-white placeholder:text-outline-variant/50 font-medium" 
                              placeholder={
                                investmentCategory === 'Saham' ? 'Contoh: Bank Central Asia...' :
                                investmentCategory === 'Crypto' ? 'Contoh: Bitcoin...' :
                                investmentCategory === 'Reksadana' ? 'Contoh: Sucorinvest Money Market...' :
                                investmentCategory === 'Bonds' ? 'Contoh: Sukuk Ritel SR020...' :
                                investmentCategory === 'Time Deposit' ? 'Contoh: Deposito Jago Bulanan...' :
                                'Contoh: Pinjaman Produktif Amartha...'
                              }
                              type="text"
                              value={assetName}
                              onChange={(e) => setAssetName(e.target.value)}
                            />
                          </div>
                        </div>
                        {!['Bonds', 'Time Deposit', 'P2P'].includes(investmentCategory) && (
                          <div className="relative w-1/3">
                            <label className="text-[10px] font-bold text-on-surface-variant dark:text-outline uppercase tracking-widest mb-2 block">Ticker</label>
                            <div className="flex items-center bg-surface-container-lowest dark:bg-white/5 border border-outline-variant/10 dark:border-white/10 rounded-xl px-4 py-1 focus-within:ring-2 focus-within:ring-primary-container dark:focus-within:ring-white/20 transition-all">
                              <span className="material-symbols-outlined text-outline-variant">tag</span>
                              <input 
                                className="w-full bg-transparent border-none p-4 text-sm focus:ring-0 text-on-surface dark:text-white placeholder:text-outline-variant/50 font-medium" 
                                placeholder="BBCA" 
                                type="text"
                                value={ticker}
                                onChange={(e) => setTicker(e.target.value)}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex flex-wrap gap-2">
                        {['Saham', 'Crypto', 'Reksadana', 'Bonds', 'Time Deposit', 'P2P'].map((cat) => (
                          <button 
                            key={cat}
                            onClick={() => handleCategoryChange(cat)}
                            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${investmentCategory === cat ? 'bg-primary dark:bg-[#a7c8ff] text-white dark:text-[#001b3c]' : 'bg-surface-container-high dark:bg-white/5 text-on-surface-variant dark:text-outline hover:bg-surface-variant dark:hover:bg-white/10'}`}
                          >
                            <span className="material-symbols-outlined text-base">
                              {cat === 'Saham' ? 'show_chart' : cat === 'Crypto' ? 'currency_bitcoin' : cat === 'Reksadana' ? 'account_balance' : cat === 'Bonds' ? 'account_balance' : cat === 'Time Deposit' ? 'savings' : 'show_chart'}
                            </span>
                            {cat}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-on-surface-variant dark:text-outline uppercase tracking-widest block">
                          {investmentCategory === 'Saham' 
                            ? 'Jumlah Lot' 
                            : investmentCategory === 'Crypto' 
                              ? 'Jumlah Koin' 
                              : investmentCategory === 'Time Deposit'
                                ? 'Jumlah Bilyet'
                                : investmentCategory === 'P2P'
                                  ? 'Jumlah Penyaluran Pinjaman'
                                  : 'Jumlah Unit'}
                        </label>
                        <input 
                          className="w-full bg-surface-container-lowest dark:bg-white/5 border-none rounded-xl p-4 text-sm focus:ring-2 focus:ring-primary-container dark:focus:ring-white/20 text-on-surface dark:text-white font-bold tabular-nums" 
                          type="number" 
                          step={investmentCategory === 'Saham' ? '1' : '0.0001'}
                          placeholder={investmentCategory === 'Saham' ? '10' : investmentCategory === 'Crypto' ? '0.05' : '1'}
                          value={units}
                          onChange={(e) => setUnits(e.target.value)}
                        />
                        {investmentCategory === 'Saham' && (
                          <p className="text-[10px] text-on-surface-variant dark:text-outline italic">
                            1 Lot = 100 Lembar Saham. Setara dengan <span className="font-bold text-primary dark:text-[#a7c8ff]">{computedUnitsText}</span>.
                          </p>
                        )}
                        {investmentCategory === 'Crypto' && (
                          <p className="text-[10px] text-on-surface-variant dark:text-outline italic">
                            Masukkan fraksi koin desimal (contoh: 0.005 BTC).
                          </p>
                        )}
                        {investmentCategory === 'Reksadana' && (
                          <p className="text-[10px] text-on-surface-variant dark:text-outline italic">
                            Unit penyertaan reksadana hingga 4 angka desimal.
                          </p>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-on-surface-variant dark:text-outline uppercase tracking-widest block">
                          {investmentCategory === 'Saham' 
                            ? 'Harga Beli per Lembar' 
                            : investmentCategory === 'Crypto' 
                              ? 'Harga Beli per Koin' 
                              : investmentCategory === 'Reksadana' 
                                ? 'NAV per Unit (Harga Beli)' 
                                : investmentCategory === 'Bonds'
                                  ? 'Nilai Nominal SBN per Unit'
                                  : investmentCategory === 'Time Deposit'
                                    ? 'Nilai Pokok Deposito (Principal)'
                                    : 'Nilai Pendanaan Pokok (Principal)'} (IDR)
                        </label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-outline-variant">Rp</span>
                          <input 
                            className="w-full bg-surface-container-lowest dark:bg-white/5 border-none rounded-xl pl-10 pr-4 py-4 text-sm focus:ring-2 focus:ring-primary-container dark:focus:ring-white/20 text-on-surface dark:text-white font-bold tabular-nums" 
                            type="text"
                            placeholder={investmentCategory === 'Saham' ? '9.150' : investmentCategory === 'Crypto' ? '1.100.000.000' : '4.500'}
                            value={avgPrice}
                            onChange={(e) => setAvgPrice(e.target.value)}
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-on-surface-variant dark:text-outline uppercase tracking-widest block">
                          {investmentCategory === 'Saham' ? 'Biaya Transaksi (Broker Fee)' : investmentCategory === 'Crypto' ? 'Biaya Transaksi (Exchange Fee)' : 'Biaya Transaksi (Subscription Fee)'}
                        </label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-outline-variant">Rp</span>
                          <input 
                            className="w-full bg-surface-container-lowest dark:bg-white/5 border-none rounded-xl pl-10 pr-4 py-4 text-sm focus:ring-2 focus:ring-primary-container dark:focus:ring-white/20 text-on-surface dark:text-white font-bold tabular-nums" 
                            type="text" 
                            placeholder="0"
                            value={brokerFee}
                            onChange={(e) => setBrokerFee(e.target.value)}
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-on-surface-variant dark:text-outline uppercase tracking-widest block">
                          {investmentCategory === 'Saham' ? 'Broker / Sekuritas' : investmentCategory === 'Crypto' ? 'Crypto Exchange' : (investmentCategory === 'Reksadana' ? 'Agen Penjual Reksadana (APERD)' : 'Mitra Distribusi / Bank / Provider')}
                        </label>
                        <select 
                          className="w-full bg-surface-container-lowest dark:bg-white/5 border-none rounded-xl p-4 text-sm focus:ring-2 focus:ring-primary-container dark:focus:ring-white/20 text-on-surface dark:text-white font-bold"
                          value={platform}
                          onChange={(e) => setPlatform(e.target.value)}
                        >
                          {(platformsForCategory[investmentCategory] || []).map((plat) => (
                            <option key={plat} value={plat}>{plat}</option>
                          ))}
                        </select>
                      </div>

                      {['Bonds', 'Time Deposit', 'P2P'].includes(investmentCategory) && (
                        <>
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-on-surface-variant dark:text-outline uppercase tracking-widest block">
                              Tanggal Pembelian / Mulai
                            </label>
                            <input 
                              className="w-full bg-surface-container-lowest dark:bg-white/5 border-none rounded-xl p-4 text-sm focus:ring-2 focus:ring-primary-container dark:focus:ring-white/20 text-on-surface dark:text-white font-bold tabular-nums" 
                              type="date"
                              value={investmentPurchaseDate}
                              onChange={(e) => setInvestmentPurchaseDate(e.target.value)}
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-on-surface-variant dark:text-outline uppercase tracking-widest block">
                              Tanggal Jatuh Tempo
                            </label>
                            <input 
                              className="w-full bg-surface-container-lowest dark:bg-white/5 border-none rounded-xl p-4 text-sm focus:ring-2 focus:ring-primary-container dark:focus:ring-white/20 text-on-surface dark:text-white font-bold tabular-nums" 
                              type="date"
                              value={maturityDate}
                              onChange={(e) => setMaturityDate(e.target.value)}
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-on-surface-variant dark:text-outline uppercase tracking-widest block">
                              {investmentCategory === 'Bonds' ? 'Jenis Obligasi / SBN' : investmentCategory === 'Time Deposit' ? 'Jenis Deposito' : 'Jenis Pinjaman P2P'}
                            </label>
                            <select 
                              className="w-full bg-surface-container-lowest dark:bg-white/5 border-none rounded-xl p-4 text-sm focus:ring-2 focus:ring-primary-container dark:focus:ring-white/20 text-on-surface dark:text-white font-bold"
                              value={fixedIncomeType}
                              onChange={(e) => setFixedIncomeType(e.target.value)}
                            >
                              {investmentCategory === 'Bonds' && (
                                <>
                                  <option value="Sukuk Tabungan (ST)">Sukuk Tabungan (ST)</option>
                                  <option value="Obligasi Negara Ritel (ORI)">Obligasi Negara Ritel (ORI)</option>
                                  <option value="Sukuk Ritel (SR)">Sukuk Ritel (SR)</option>
                                  <option value="Savings Bond Ritel (SBR)">Savings Bond Ritel (SBR)</option>
                                  <option value="Project Base Sukuk (PBS)">Project Base Sukuk (PBS)</option>
                                </>
                              )}
                              {investmentCategory === 'Time Deposit' && (
                                <>
                                  <option value="Deposito Berjangka">Deposito Berjangka</option>
                                  <option value="Deposito Syariah">Deposito Syariah</option>
                                  <option value="Automatic Roll Over (ARO)">Automatic Roll Over (ARO)</option>
                                </>
                              )}
                              {investmentCategory === 'P2P' && (
                                <>
                                  <option value="Productive Loan">Productive Loan</option>
                                  <option value="Consumptive Loan">Consumptive Loan</option>
                                  <option value="Invoice Financing">Invoice Financing</option>
                                </>
                              )}
                            </select>
                          </div>

                          {investmentCategory === 'Bonds' && (
                            <div className="space-y-2">
                              <label className="text-[10px] font-bold text-on-surface-variant dark:text-outline uppercase tracking-widest block">
                                Penerbit (Issuer)
                              </label>
                              <input 
                                className="w-full bg-surface-container-lowest dark:bg-white/5 border-none rounded-xl p-4 text-sm focus:ring-2 focus:ring-primary-container dark:focus:ring-white/20 text-on-surface dark:text-white font-bold" 
                                type="text"
                                value={issuer}
                                onChange={(e) => setIssuer(e.target.value)}
                              />
                            </div>
                          )}

                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-on-surface-variant dark:text-outline uppercase tracking-widest block">
                              Tenor ({investmentCategory === 'Bonds' ? 'Tahun' : tenorUnit === 'Months' ? 'Bulan' : tenorUnit === 'Years' ? 'Tahun' : 'Hari'})
                            </label>
                            <div className="flex gap-2">
                              <input 
                                className="w-full bg-surface-container-lowest dark:bg-white/5 border-none rounded-xl p-4 text-sm focus:ring-2 focus:ring-primary-container dark:focus:ring-white/20 text-on-surface dark:text-white font-bold tabular-nums" 
                                type="number"
                                placeholder={investmentCategory === 'Bonds' ? '2' : '12'}
                                value={tenor}
                                onChange={(e) => setTenor(e.target.value)}
                              />
                              {investmentCategory !== 'Bonds' && (
                                <select 
                                  className="bg-surface-container-lowest dark:bg-white/5 border-none rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-primary-container dark:focus:ring-white/20 text-on-surface dark:text-white font-bold w-1/3"
                                  value={tenorUnit}
                                  onChange={(e) => setTenorUnit(e.target.value)}
                                >
                                  <option value="Months">Bulan</option>
                                  <option value="Days">Hari</option>
                                  <option value="Years">Tahun</option>
                                </select>
                              )}
                            </div>
                          </div>

                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-on-surface-variant dark:text-outline uppercase tracking-widest block">
                              Kupon / Suku Bunga (% p.a.)
                            </label>
                            <div className="relative">
                              <input 
                                className="w-full bg-surface-container-lowest dark:bg-white/5 border-none rounded-xl p-4 text-sm focus:ring-2 focus:ring-primary-container dark:focus:ring-white/20 text-on-surface dark:text-white font-bold tabular-nums" 
                                type="text"
                                placeholder={investmentCategory === 'Bonds' ? '6.4' : investmentCategory === 'Time Deposit' ? '4.5' : '12.0'}
                                value={interestRate}
                                onChange={(e) => setInterestRate(e.target.value)}
                              />
                              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-outline-variant">%</span>
                            </div>
                          </div>

                          {investmentCategory === 'Bonds' && (
                            <div className="space-y-2">
                              <label className="text-[10px] font-bold text-on-surface-variant dark:text-outline uppercase tracking-widest block">
                                Jenis Kupon (Coupon Type)
                              </label>
                              <select 
                                className="w-full bg-surface-container-lowest dark:bg-white/5 border-none rounded-xl p-4 text-sm focus:ring-2 focus:ring-primary-container dark:focus:ring-white/20 text-on-surface dark:text-white font-bold"
                                value={couponType}
                                onChange={(e) => setCouponType(e.target.value)}
                              >
                                <option value="Floating with Floor">Floating with Floor</option>
                                <option value="Fixed Rate">Fixed Rate</option>
                              </select>
                            </div>
                          )}

                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-on-surface-variant dark:text-outline uppercase tracking-widest block">
                              Pajak (%)
                            </label>
                            <div className="relative">
                              <input 
                                className="w-full bg-surface-container-lowest dark:bg-white/5 border-none rounded-xl p-4 text-sm focus:ring-2 focus:ring-primary-container dark:focus:ring-white/20 text-on-surface dark:text-white font-bold tabular-nums" 
                                type="text"
                                placeholder={investmentCategory === 'Bonds' ? '10' : investmentCategory === 'Time Deposit' ? '20' : '15'}
                                value={taxRateInput}
                                onChange={(e) => setTaxRateInput(e.target.value)}
                              />
                              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-outline-variant">%</span>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-on-surface-variant dark:text-outline uppercase tracking-widest block">
                              Tanggal Bayar Bunga (Day of Month)
                            </label>
                            <input 
                              className="w-full bg-surface-container-lowest dark:bg-white/5 border-none rounded-xl p-4 text-sm focus:ring-2 focus:ring-primary-container dark:focus:ring-white/20 text-on-surface dark:text-white font-bold tabular-nums" 
                              type="number"
                              min="1"
                              max="31"
                              value={paymentDateInput}
                              onChange={(e) => setPaymentDateInput(e.target.value)}
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-on-surface-variant dark:text-outline uppercase tracking-widest block">
                              Frekuensi Bunga
                            </label>
                            <select 
                              className="w-full bg-surface-container-lowest dark:bg-white/5 border-none rounded-xl p-4 text-sm focus:ring-2 focus:ring-primary-container dark:focus:ring-white/20 text-on-surface dark:text-white font-bold"
                              value={interestPeriod}
                              onChange={(e) => setInterestPeriod(e.target.value)}
                            >
                              <option value="Monthly">Monthly</option>
                              {investmentCategory === 'Bonds' && <option value="Quarterly">Quarterly</option>}
                              <option value="At Maturity">At Maturity</option>
                            </select>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Real-time Preview Card (The Architect Design) */}
                  <div className="relative overflow-hidden bg-primary dark:bg-gradient-to-br dark:from-[#00174a] dark:to-primary p-8 rounded-2xl text-white shadow-xl group">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary to-primary-container opacity-90 group-hover:opacity-80 transition-opacity"></div>
                    <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
                      <div className="flex-1">
                        <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest mb-1">Estimasi Total Modal Investasi</p>
                        <h4 className="text-3xl font-extrabold font-headline tabular-nums">
                          Rp {computedTotalCost.toLocaleString('id-ID')}
                        </h4>
                        <div className="flex items-center gap-2 mt-2 text-[#b1f0ce]">
                          <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>info</span>
                          <span className="text-xs font-semibold">Estimasi Total Kepemilikan: {computedUnitsText}</span>
                        </div>
                      </div>
                      <div className="hidden md:block h-12 w-px bg-white/20"></div>
                      <div className="text-right">
                        <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest mb-1">Harga per {computedPriceLabel}</p>
                        <p className="text-xl font-bold font-headline tabular-nums">Rp {avgPrice} <span className="text-xs font-normal opacity-70">/ {computedPriceLabel}</span></p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {assetType === 'physical' && (
                /* DETAILED PHYSICAL ASSET LAYOUT WITH SPECIFIC SUB-FORM */
                <div className="space-y-10 animate-in fade-in slide-in-from-top-2 duration-500">
                  
                  {/* Sub-Category Selection */}
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold text-on-surface-variant dark:text-outline uppercase tracking-widest block">Kategori Aset Fisik</label>
                    <div className="flex flex-wrap gap-2.5">
                      {['Properti', 'Kendaraan', 'Aset Personal'].map((cat) => (
                        <button 
                          key={cat}
                          type="button"
                          onClick={() => {
                            setPhysicalCategory(cat);
                            if (cat === 'Properti') {
                              setDepreciationMethod('Tidak Menyusut');
                              setAssetName('');
                              setLocation('');
                              setPurchasePrice('1.000.000.000');
                              setCurrentValuationInput('1.000.000.000');
                            } else if (cat === 'Kendaraan') {
                              setDepreciationMethod('Garis Lurus Tahunan');
                              setUsefulLife('15');
                              setAssetName('');
                              setLocation('Garasi');
                              setPurchasePrice('300.000.000');
                            } else {
                              setDepreciationMethod('Tidak Menyusut');
                              setUsefulLife('10');
                              setAssetName('');
                              setLocation('Rumah');
                              setPurchasePrice('10.000.000');
                            }
                          }}
                          className={`px-5 py-3 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${physicalCategory === cat ? 'bg-primary dark:bg-[#a7c8ff] text-white dark:text-[#001b3c] shadow-md shadow-primary/20' : 'bg-surface-container-high dark:bg-white/5 text-on-surface-variant dark:text-outline hover:bg-surface-variant dark:hover:bg-white/10 hover:scale-[1.01]'}`}
                        >
                          <span className="material-symbols-outlined text-base">
                            {cat === 'Properti' ? 'home' : cat === 'Kendaraan' ? 'directions_car' : 'category'}
                          </span>
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* FORM 1: PROPERTIS (Appreciating Assets) */}
                  {physicalCategory === 'Properti' && (
                    <div className="space-y-8 animate-in fade-in duration-300">
                      <div className="space-y-6">
                        <div className="flex items-center gap-3 border-b border-outline-variant/10 dark:border-white/10 pb-4">
                          <span className="material-symbols-outlined text-primary dark:text-[#a7c8ff]">home</span>
                          <h4 className="font-bold text-on-surface dark:text-white">Spesifikasi Properti</h4>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-on-surface-variant dark:text-outline uppercase tracking-widest block">Nama Aset / Properti</label>
                            <input 
                              className="w-full bg-surface-container-lowest dark:bg-white/5 border-none rounded-xl p-4 text-sm focus:ring-2 focus:ring-primary-container dark:focus:ring-white/20 text-on-surface dark:text-white font-medium" 
                              placeholder="Contoh: NAMKOST 3" 
                              type="text"
                              value={assetName}
                              onChange={(e) => setAssetName(e.target.value)}
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-on-surface-variant dark:text-outline uppercase tracking-widest block">Alamat / Lokasi</label>
                            <input 
                              className="w-full bg-surface-container-lowest dark:bg-white/5 border-none rounded-xl p-4 text-sm focus:ring-2 focus:ring-primary-container dark:focus:ring-white/20 text-on-surface dark:text-white font-medium" 
                              placeholder="Contoh: Jl. Merbau Blok BB No 29" 
                              type="text"
                              value={location}
                              onChange={(e) => setLocation(e.target.value)}
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-on-surface-variant dark:text-outline uppercase tracking-widest block">Spesifikasi / Detail</label>
                            <input 
                              className="w-full bg-surface-container-lowest dark:bg-white/5 border-none rounded-xl p-4 text-sm focus:ring-2 focus:ring-primary-container dark:focus:ring-white/20 text-on-surface dark:text-white font-medium" 
                              placeholder="Contoh: Pabean, Sedati, Sidoarjo" 
                              type="text"
                              value={specification}
                              onChange={(e) => setSpecification(e.target.value)}
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label className="text-[10px] font-bold text-on-surface-variant dark:text-outline uppercase tracking-widest block">Luas Tanah (m²)</label>
                              <input 
                                className="w-full bg-surface-container-lowest dark:bg-white/5 border-none rounded-xl p-4 text-sm focus:ring-2 focus:ring-primary-container dark:focus:ring-white/20 text-on-surface dark:text-white font-medium tabular-nums" 
                                placeholder="200" 
                                type="number"
                                value={landArea}
                                onChange={(e) => setLandArea(e.target.value)}
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-[10px] font-bold text-on-surface-variant dark:text-outline uppercase tracking-widest block">Luas Bangunan (m²)</label>
                              <input 
                                className="w-full bg-surface-container-lowest dark:bg-white/5 border-none rounded-xl p-4 text-sm focus:ring-2 focus:ring-primary-container dark:focus:ring-white/20 text-on-surface dark:text-white font-medium tabular-nums" 
                                placeholder="200" 
                                type="number"
                                value={buildingArea}
                                onChange={(e) => setBuildingArea(e.target.value)}
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-on-surface-variant dark:text-outline uppercase tracking-widest block">Tanggal Pembelian</label>
                            <input 
                              className="w-full bg-surface-container-lowest dark:bg-white/5 border-none rounded-xl p-4 text-sm focus:ring-2 focus:ring-primary-container dark:focus:ring-white/20 text-on-surface dark:text-white font-medium" 
                              type="date"
                              value={purchaseDate}
                              onChange={(e) => setPurchaseDate(e.target.value)}
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-on-surface-variant dark:text-outline uppercase tracking-widest block">Harga Pembelian (IDR)</label>
                            <div className="relative">
                              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-outline-variant">Rp</span>
                              <input 
                                className="w-full bg-surface-container-lowest dark:bg-white/5 border-none rounded-xl pl-10 pr-4 py-4 text-sm focus:ring-2 focus:ring-primary-container dark:focus:ring-white/20 text-on-surface dark:text-white font-bold tabular-nums" 
                                type="text" 
                                value={purchasePrice}
                                onChange={(e) => {
                                  const val = e.target.value.replace(/\D/g, '');
                                  setPurchasePrice(val ? parseInt(val, 10).toLocaleString('id-ID') : '0');
                                }}
                              />
                            </div>
                          </div>

                          <div className="space-y-2 md:col-span-2">
                            <label className="text-[10px] font-bold text-on-surface-variant dark:text-outline uppercase tracking-widest block">Nilai Pasar Saat Ini (IDR)</label>
                            <div className="relative">
                              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-primary dark:text-[#a7c8ff]">Rp</span>
                              <input 
                                className="w-full bg-surface-container-lowest dark:bg-white/5 border-none rounded-xl pl-10 pr-4 py-4 text-sm focus:ring-2 focus:ring-primary-container dark:focus:ring-white/20 text-on-surface dark:text-white font-bold tabular-nums" 
                                type="text" 
                                value={currentValuationInput}
                                onChange={(e) => {
                                  const val = e.target.value.replace(/\D/g, '');
                                  setCurrentValuationInput(val ? parseInt(val, 10).toLocaleString('id-ID') : '0');
                                }}
                              />
                            </div>
                            <p className="text-[10px] text-on-surface-variant dark:text-outline italic">Properti merupakan aset apresiatif. Nilai pasar saat ini menentukan capital gain portofolio Anda.</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* FORM 2: KENDARAAN (Depreciating Assets) */}
                  {physicalCategory === 'Kendaraan' && (
                    <div className="space-y-8 animate-in fade-in duration-300">
                      <div className="space-y-6">
                        <div className="flex items-center gap-3 border-b border-outline-variant/10 dark:border-white/10 pb-4">
                          <span className="material-symbols-outlined text-primary dark:text-[#a7c8ff]">directions_car</span>
                          <h4 className="font-bold text-on-surface dark:text-white">Detail Kendaraan</h4>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-on-surface-variant dark:text-outline uppercase tracking-widest block">Merk / Tipe Kendaraan</label>
                            <input 
                              className="w-full bg-surface-container-lowest dark:bg-white/5 border-none rounded-xl p-4 text-sm focus:ring-2 focus:ring-primary-container dark:focus:ring-white/20 text-on-surface dark:text-white font-medium" 
                              placeholder="Contoh: Wuling Cloud EV" 
                              type="text"
                              value={assetName}
                              onChange={(e) => setAssetName(e.target.value)}
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-on-surface-variant dark:text-outline uppercase tracking-widest block">Tahun Pembuatan</label>
                            <input 
                              className="w-full bg-surface-container-lowest dark:bg-white/5 border-none rounded-xl p-4 text-sm focus:ring-2 focus:ring-primary-container dark:focus:ring-white/20 text-on-surface dark:text-white font-medium tabular-nums" 
                              placeholder="2024" 
                              type="number"
                              value={mfgYear}
                              onChange={(e) => setMfgYear(e.target.value)}
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-on-surface-variant dark:text-outline uppercase tracking-widest block">No. Polisi / Mesin / Rangka</label>
                            <input 
                              className="w-full bg-surface-container-lowest dark:bg-white/5 border-none rounded-xl p-4 text-sm focus:ring-2 focus:ring-primary-container dark:focus:ring-white/20 text-on-surface dark:text-white font-medium" 
                              placeholder="Contoh: B 1234 ABC" 
                              type="text"
                              value={specification}
                              onChange={(e) => setSpecification(e.target.value)}
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-on-surface-variant dark:text-outline uppercase tracking-widest block">Tanggal Pembelian</label>
                            <input 
                              className="w-full bg-surface-container-lowest dark:bg-white/5 border-none rounded-xl p-4 text-sm focus:ring-2 focus:ring-primary-container dark:focus:ring-white/20 text-on-surface dark:text-white font-medium" 
                              type="date"
                              value={purchaseDate}
                              onChange={(e) => setPurchaseDate(e.target.value)}
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-on-surface-variant dark:text-outline uppercase tracking-widest block">Harga Pembelian (IDR)</label>
                            <div className="relative">
                              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-outline-variant">Rp</span>
                              <input 
                                className="w-full bg-surface-container-lowest dark:bg-white/5 border-none rounded-xl pl-10 pr-4 py-4 text-sm focus:ring-2 focus:ring-primary-container dark:focus:ring-white/20 text-on-surface dark:text-white font-bold tabular-nums" 
                                type="text" 
                                value={purchasePrice}
                                onChange={(e) => {
                                  const val = e.target.value.replace(/\D/g, '');
                                  setPurchasePrice(val ? parseInt(val, 10).toLocaleString('id-ID') : '0');
                                }}
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-on-surface-variant dark:text-outline uppercase tracking-widest block">Masa Manfaat (Tahun)</label>
                            <input 
                              className="w-full bg-surface-container-lowest dark:bg-white/5 border-none rounded-xl p-4 text-sm focus:ring-2 focus:ring-primary-container dark:focus:ring-white/20 text-on-surface dark:text-white font-bold tabular-nums" 
                              placeholder="15" 
                              type="number"
                              value={usefulLife}
                              onChange={(e) => setUsefulLife(e.target.value)}
                            />
                          </div>

                          <div className="space-y-2 md:col-span-2">
                            <label className="text-[10px] font-bold text-on-surface-variant dark:text-outline uppercase tracking-widest block">Metode Penyusutan</label>
                            <select 
                              className="w-full bg-surface-container-lowest dark:bg-white/5 border-none rounded-xl p-4 text-sm focus:ring-2 focus:ring-primary-container dark:focus:ring-white/20 text-on-surface dark:text-white font-bold"
                              value={depreciationMethod}
                              onChange={(e) => setDepreciationMethod(e.target.value as any)}
                            >
                              <option value="Garis Lurus Tahunan">Garis Lurus Tahunan (Straight-line Yearly)</option>
                              <option value="Garis Lurus Bulanan">Garis Lurus Bulanan (Straight-line Monthly)</option>
                              <option value="Tidak Menyusut">Tidak Menyusut (No Depreciation)</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* FORM 3: ASET PERSONAL (Electronics, Jewelry, Watches, Furnishings) */}
                  {physicalCategory === 'Aset Personal' && (
                    <div className="space-y-8 animate-in fade-in duration-300">
                      <div className="space-y-6">
                        <div className="flex items-center gap-3 border-b border-outline-variant/10 dark:border-white/10 pb-4">
                          <span className="material-symbols-outlined text-primary dark:text-[#a7c8ff]">category</span>
                          <h4 className="font-bold text-on-surface dark:text-white">Aset Personal & Koleksi</h4>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-on-surface-variant dark:text-outline uppercase tracking-widest block">Sub-Tipe Aset</label>
                            <select 
                              className="w-full bg-surface-container-lowest dark:bg-white/5 border-none rounded-xl p-4 text-sm focus:ring-2 focus:ring-primary-container dark:focus:ring-white/20 text-on-surface dark:text-white font-bold"
                              value={subType}
                              onChange={(e) => {
                                setSubType(e.target.value);
                                if (e.target.value === 'Jewelry') {
                                  setDepreciationMethod('Garis Lurus Bulanan');
                                } else {
                                  setDepreciationMethod('Tidak Menyusut');
                                }
                              }}
                            >
                              <option value="Electronics">Electronics (Gadget, Laptop, TV)</option>
                              <option value="Home Furnishings">Home Furnishings (Kulkas, Sofa, Bed)</option>
                              <option value="Watches">Watches (Jam Tangan Mewah)</option>
                              <option value="Jewelry">Jewelry (Emas, Cincin, Gelang)</option>
                              <option value="Collectibles">Collectibles (Karya Seni, Lukisan)</option>
                            </select>
                          </div>

                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-on-surface-variant dark:text-outline uppercase tracking-widest block">Merk / Pembuat</label>
                            <input 
                              className="w-full bg-surface-container-lowest dark:bg-white/5 border-none rounded-xl p-4 text-sm focus:ring-2 focus:ring-primary-container dark:focus:ring-white/20 text-on-surface dark:text-white font-medium" 
                              placeholder="Contoh: Apple" 
                              type="text"
                              value={assetName}
                              onChange={(e) => setAssetName(e.target.value)}
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-on-surface-variant dark:text-outline uppercase tracking-widest block">Model / Rincian</label>
                            <input 
                              className="w-full bg-surface-container-lowest dark:bg-white/5 border-none rounded-xl p-4 text-sm focus:ring-2 focus:ring-primary-container dark:focus:ring-white/20 text-on-surface dark:text-white font-medium" 
                              placeholder="Contoh: Macbook Pro M3 Pro" 
                              type="text"
                              value={specification}
                              onChange={(e) => setSpecification(e.target.value)}
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-on-surface-variant dark:text-outline uppercase tracking-widest block">Tanggal Pembelian</label>
                            <input 
                              className="w-full bg-surface-container-lowest dark:bg-white/5 border-none rounded-xl p-4 text-sm focus:ring-2 focus:ring-primary-container dark:focus:ring-white/20 text-on-surface dark:text-white font-medium" 
                              type="date"
                              value={purchaseDate}
                              onChange={(e) => setPurchaseDate(e.target.value)}
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-on-surface-variant dark:text-outline uppercase tracking-widest block">Harga Pembelian (IDR)</label>
                            <div className="relative">
                              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-outline-variant">Rp</span>
                              <input 
                                className="w-full bg-surface-container-lowest dark:bg-white/5 border-none rounded-xl pl-10 pr-4 py-4 text-sm focus:ring-2 focus:ring-primary-container dark:focus:ring-white/20 text-on-surface dark:text-white font-bold tabular-nums" 
                                type="text" 
                                value={purchasePrice}
                                onChange={(e) => {
                                  const val = e.target.value.replace(/\D/g, '');
                                  setPurchasePrice(val ? parseInt(val, 10).toLocaleString('id-ID') : '0');
                                }}
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-on-surface-variant dark:text-outline uppercase tracking-widest block">Masa Manfaat (Tahun)</label>
                            <input 
                              className="w-full bg-surface-container-lowest dark:bg-white/5 border-none rounded-xl p-4 text-sm focus:ring-2 focus:ring-primary-container dark:focus:ring-white/20 text-on-surface dark:text-white font-bold tabular-nums" 
                              placeholder="10" 
                              type="number"
                              value={usefulLife}
                              onChange={(e) => setUsefulLife(e.target.value)}
                            />
                          </div>

                          <div className="space-y-2 md:col-span-2">
                            <label className="text-[10px] font-bold text-on-surface-variant dark:text-outline uppercase tracking-widest block">Metode Penyusutan</label>
                            <select 
                              className="w-full bg-surface-container-lowest dark:bg-white/5 border-none rounded-xl p-4 text-sm focus:ring-2 focus:ring-primary-container dark:focus:ring-white/20 text-on-surface dark:text-white font-bold"
                              value={depreciationMethod}
                              onChange={(e) => setDepreciationMethod(e.target.value as any)}
                            >
                              <option value="Tidak Menyusut">Tidak Menyusut (No Depreciation)</option>
                              <option value="Garis Lurus Bulanan">Garis Lurus Bulanan (Straight-line Monthly)</option>
                              <option value="Garis Lurus Tahunan">Garis Lurus Tahunan (Straight-line Yearly)</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Google Drive / Document Link Input (Optional) */}
                  <div className="space-y-2 text-left">
                    <label className="text-[10px] font-bold text-on-surface-variant dark:text-outline uppercase tracking-widest block flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm text-primary dark:text-[#a7c8ff]">link</span>
                      {physicalCategory === 'Properti' 
                        ? 'Link Sertifikat & Dokumentasi (Google Drive / Cloud)' 
                        : physicalCategory === 'Kendaraan'
                          ? 'Link BPKB, STNK & Foto Aset (Google Drive / Cloud)'
                          : 'Link Bukti Pembelian & Foto Aset (Google Drive / Cloud)'} (Opsional)
                    </label>
                    <div className="flex items-center bg-surface-container-lowest dark:bg-white/5 border border-outline-variant/10 dark:border-white/10 rounded-xl px-4 py-1 focus-within:ring-2 focus-within:ring-primary-container dark:focus-within:ring-white/20 transition-all">
                      <span className="material-symbols-outlined text-outline-variant text-base">cloud_queue</span>
                      <input 
                        className="w-full bg-transparent border-none p-4 text-sm focus:ring-0 text-on-surface dark:text-white placeholder:text-outline-variant/40 font-medium font-sans" 
                        placeholder="Contoh: https://drive.google.com/drive/folders/..." 
                        type="url"
                        value={documentLink}
                        onChange={(e) => setDocumentLink(e.target.value)}
                      />
                    </div>
                    <p className="text-[10px] text-on-surface-variant dark:text-outline italic">
                      Masukkan tautan folder atau file Google Drive Anda yang berisi sertifikat, BPKB, foto fisik barang, atau bukti pembayaran agar data kepemilikan tersimpan rapi dan aman.
                    </p>
                  </div>
                </div>
              )}

              {assetType === 'liquid' && (
                /* DETAILED LIQUID ASSET LAYOUT */
                <div className="space-y-10 animate-in fade-in slide-in-from-top-2 duration-500">
                  {/* Stepper (Simplified) */}
                  <div className="flex items-center gap-4 px-2 overflow-x-auto pb-4 scrollbar-hide">
                    {[1, 2, 3].map((s) => (
                      <React.Fragment key={s}>
                        <div className="flex items-center gap-3 shrink-0">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${step >= s ? 'bg-primary dark:bg-[#a7c8ff] text-white dark:text-[#001b3c]' : 'bg-surface-container-high dark:bg-white/10 text-on-surface-variant dark:text-outline'}`}>
                            {s}
                          </div>
                          <span className={`text-xs font-bold tracking-tight ${step >= s ? 'text-primary dark:text-white' : 'text-on-surface-variant dark:text-outline'}`}>
                            {s === 1 ? 'Informasi Akun' : s === 2 ? 'Verifikasi' : 'Selesai'}
                          </span>
                        </div>
                        {s < 3 && <div className="h-px w-8 bg-outline-variant/20 shrink-0"></div>}
                      </React.Fragment>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-on-surface-variant dark:text-outline uppercase tracking-widest block">Nama Institusi</label>
                      <select 
                        className="w-full bg-surface-container-lowest dark:bg-white/5 border-none rounded-xl p-4 text-sm focus:ring-2 focus:ring-primary-container dark:focus:ring-white/20 text-on-surface dark:text-white font-medium"
                        value={institution}
                        onChange={(e) => setInstitution(e.target.value)}
                      >
                        <option value="">Pilih Bank / e-Wallet</option>
                        <optgroup label="── Bank Nasional">
                          <option>BCA</option>
                          <option>Mandiri</option>
                          <option>BRI</option>
                          <option>BNI</option>
                          <option>CIMB Niaga</option>
                          <option>Permata Bank</option>
                          <option>Danamon</option>
                          <option>BTN</option>
                          <option>BTPN</option>
                          <option>Bank Syariah Indonesia (BSI)</option>
                          <option>BCA Syariah</option>
                        </optgroup>
                        <optgroup label="── Bank Digital">
                          <option>Jago</option>
                          <option>Blu BCA</option>
                          <option>Neobank</option>
                          <option>Jenius</option>
                          <option>Seabank</option>
                          <option>Allo Bank</option>
                          <option>Motion Banking</option>
                        </optgroup>
                        <optgroup label="── E-Wallet">
                          <option>GoPay</option>
                          <option>OVO</option>
                          <option>Dana</option>
                          <option>LinkAja</option>
                          <option>ShopeePay</option>
                          <option>Flip</option>
                        </optgroup>
                        <optgroup label="── Sekuritas & Investasi">
                          <option>Ajaib</option>
                          <option>Bibit</option>
                          <option>Pluang</option>
                          <option>Stockbit</option>
                          <option>IPOT</option>
                          <option>Bareksa</option>
                          <option>RHB Sekuritas</option>
                          <option>Mandiri Sekuritas</option>
                        </optgroup>
                        <optgroup label="── Lainnya">
                          <option>Tunai</option>
                          <option>PayPal</option>
                          <option>Wise</option>
                          <option>Lainnya</option>
                        </optgroup>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-on-surface-variant dark:text-outline uppercase tracking-widest block">Nomor Rekening / ID</label>
                      <input 
                        className="w-full bg-surface-container-lowest dark:bg-white/5 border-none rounded-xl p-4 text-sm focus:ring-2 focus:ring-primary-container dark:focus:ring-white/20 text-on-surface dark:text-white font-medium" 
                        placeholder="Contoh: 8012345678"
                        value={accountNumber}
                        onChange={(e) => setAccountNumber(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-on-surface-variant dark:text-outline uppercase tracking-widest block">Saldo Saat Ini</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-primary dark:text-[#a7c8ff]">IDR</span>
                        <input 
                          className="w-full bg-surface-container-lowest dark:bg-white/5 border-none rounded-xl pl-12 pr-4 py-4 text-sm focus:ring-2 focus:ring-primary-container dark:focus:ring-white/20 text-on-surface dark:text-white font-bold tabular-nums" 
                          placeholder="0"
                          value={assetValue}
                          onChange={handleValueChange}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-on-surface-variant dark:text-outline uppercase tracking-widest block">Mata Uang</label>
                      <select 
                        className="w-full bg-surface-container-lowest dark:bg-white/5 border-none rounded-xl p-4 text-sm focus:ring-2 focus:ring-primary-container dark:focus:ring-white/20 text-on-surface dark:text-white font-medium"
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value)}
                      >
                        <option>Rupiah (IDR)</option>
                        <option>US Dollar (USD)</option>
                        <option>SGD</option>
                      </select>
                    </div>
                  </div>

                </div>
              )}
            </section>




          {/* 3. Integrasi & Pengingat */}
          <section>
            <h3 className="text-lg font-bold text-on-surface dark:text-white mb-6 flex items-center gap-3">
              <span className="w-7 h-7 rounded-full bg-primary-container dark:bg-[#a7c8ff] text-white dark:text-[#001b3c] text-xs flex items-center justify-center font-black">3</span>
              Pengaturan &amp; Pengingat
            </h3>
            <div className="bg-surface-container-lowest dark:bg-transparent border border-outline-variant/10 dark:border-white/10 rounded-3xl p-6 md:p-8 space-y-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-surface-container-low dark:bg-white/5 flex items-center justify-center text-primary dark:text-[#a7c8ff]">
                    <span className="material-symbols-outlined">notifications_active</span>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-on-surface dark:text-white">Pengingat Valuasi {assetType === 'physical' ? 'Tahunan' : 'Otomatis'}</p>
                    <p className="text-xs text-on-surface-variant dark:text-outline mt-0.5">Ingatkan saya untuk memperbarui nilai {assetType === 'liquid' ? 'saldo' : 'aset'} ini agar neraca tetap akurat.</p>
                  </div>
                </div>
                {/* Custom Toggle */}
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input 
                    type="checkbox" 
                    className="sr-only peer" 
                    checked={valuationReminder} 
                    onChange={() => setValuationReminder(!valuationReminder)} 
                  />
                  <div className="w-12 h-6 bg-surface-container-high dark:bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white dark:after:bg-[#001b3c] after:border-gray-300 dark:after:border-transparent after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-container dark:peer-checked:bg-[#a7c8ff]"></div>
                </label>
              </div>
            </div>
          </section>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-center gap-4 pt-4">
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className="w-full sm:flex-1 py-5 bg-gradient-to-r from-primary to-primary-container dark:from-[#a7c8ff] dark:to-[#82b1ff] text-white dark:text-[#001b3c] rounded-2xl font-bold text-lg hover:opacity-95 active:scale-[0.98] transition-all shadow-lg shadow-primary/20 dark:shadow-[#a7c8ff]/20 flex justify-center items-center gap-2 disabled:opacity-75"
            >
              {isSaving ? (
                <>
                  <span className="animate-spin rounded-full h-5 w-5 border-2 border-white dark:border-[#001b3c] border-t-transparent"></span>
                  Menyimpan Aset...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined">save</span>
                  Simpan Aset ke Ledger
                </>
              )}
            </button>
            <button 
              onClick={onBack}
              disabled={isSaving}
              className="w-full sm:w-auto px-8 py-5 bg-transparent border-2 border-outline-variant/30 dark:border-white/20 text-on-surface-variant dark:text-slate-300 font-bold rounded-2xl hover:bg-surface-container-low dark:hover:bg-white/5 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              Batal
            </button>
          </div>

        </div>

        {/* Sidebar Preview Section */}
        <div className="lg:col-span-4 hidden lg:block">
          <div className="sticky top-28 space-y-6">
            
            {assetType === 'investment' && (
              /* INVESTMENT SPECIFIC SIDEBAR */
              <section className="bg-surface-container-low dark:bg-white/5 p-8 rounded-3xl border border-outline-variant/10 dark:border-white/10 shadow-sm animate-in fade-in slide-in-from-right-4 duration-500">
                <h3 className="text-lg font-bold mb-6 text-primary dark:text-[#a7c8ff] font-headline">Dampak Portofolio</h3>
                <div className="flex justify-center mb-8 relative">
                  <div className="relative h-48 w-48">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                      <circle className="stroke-surface-container-high dark:stroke-white/5" cx="18" cy="18" fill="none" r="16" strokeWidth="3"></circle>
                      {/* Primary Segment (Existing) */}
                      <circle className="stroke-primary dark:stroke-[#a7c8ff]" cx="18" cy="18" fill="none" r="16" strokeDasharray={`${existingPercentage}, 100`} strokeWidth="3" strokeLinecap="round"></circle>
                      {/* New Asset Segment (Visual Highlight) */}
                      {newAssetPercentage > 0 && (
                        <circle className="stroke-[#b1f0ce] dark:stroke-[#b1f0ce]" cx="18" cy="18" fill="none" r="16" strokeDasharray={`${newAssetPercentage}, 100`} strokeDashoffset={`-${existingPercentage}`} strokeWidth="3.5" strokeLinecap="round"></circle>
                      )}
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                      <span className="text-[10px] text-on-surface-variant dark:text-outline font-bold uppercase tracking-wider">{investmentCategory}</span>
                      <span className="text-3xl font-black text-primary dark:text-white font-headline">{newAssetPercentage}%</span>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-surface-container-lowest dark:bg-white/5">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-primary dark:bg-[#a7c8ff]"></div>
                      <span className="text-xs font-semibold text-on-surface dark:text-outline">Portfolio Saat Ini</span>
                    </div>
                    <span className="text-xs font-bold tabular-nums text-on-surface dark:text-white">{formatCompactVal(existingInvestmentTotal)}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-primary/5 dark:bg-[#a7c8ff]/10 border-l-4 border-[#b1f0ce]">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-[#b1f0ce]"></div>
                      <span className="text-xs font-bold text-primary dark:text-[#a7c8ff]">{assetName || 'Aset Baru'}</span>
                    </div>
                    <span className="text-xs font-bold text-primary dark:text-[#a7c8ff] tabular-nums">{formatCompactVal(computedTotalCost)}</span>
                  </div>
                </div>

                {/* Tips Arsitek Contextual */}
                <div className="mt-8 bg-[#b1f0ce]/20 dark:bg-[#b1f0ce]/10 p-5 rounded-2xl flex gap-4 items-start border border-[#b1f0ce]/30">
                  <span className="material-symbols-outlined text-[#0e5138] dark:text-[#b1f0ce]" style={{ fontVariationSettings: "'FILL' 1" }}>lightbulb</span>
                  <div>
                    <p className="text-[#0e5138] dark:text-[#b1f0ce] text-[10px] font-bold uppercase tracking-widest mb-1">Tips Arsitek</p>
                    <p className="text-[#002114] dark:text-outline text-xs leading-relaxed font-medium">
                      Menambah {assetName || 'Aset ini'} akan meningkatkan eksposur di sektor {investmentCategory}. Pertimbangkan diversifikasi untuk manajemen risiko.
                    </p>
                  </div>
                </div>
              </section>
            )}

            {assetType === 'physical' && (
              /* PHYSICAL SPECIFIC SIDEBAR */
              <section className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                {/* Preview Card */}
                <div className="bg-primary dark:bg-gradient-to-br dark:from-[#001b3c] dark:to-[#002f5e] text-white rounded-[32px] p-8 relative overflow-hidden shadow-2xl">
                  <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                  <div className="relative z-10">
                    <div className="flex justify-between items-start mb-10">
                      <div className="p-2 bg-white/10 rounded-xl backdrop-blur-md">
                        <span className="material-symbols-outlined text-white">home</span>
                      </div>
                      <span className="text-[10px] font-bold bg-white/20 px-2 py-1 rounded tracking-widest uppercase">Preview Kartu</span>
                    </div>
                    <p className="text-xs text-white/60 font-medium uppercase tracking-wider mb-2">Estimasi Nilai Saat Ini</p>
                    <h4 className="text-3xl font-extrabold font-headline tracking-tighter tabular-nums mb-8">Rp {purchasePrice}</h4>
                    <div className="grid grid-cols-2 gap-4 border-t border-white/10 pt-4">
                      <div>
                        <p className="text-[10px] text-white/40 uppercase font-bold mb-1">Pertumbuhan</p>
                        <p className="text-sm font-bold text-[#b1f0ce] flex items-center gap-1">
                          <span className="material-symbols-outlined text-xs">arrow_upward</span> {valuationPercentage}%
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-white/40 uppercase font-bold mb-1">Portofolio</p>
                        <p className="text-sm font-bold">42.5%</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Portfolio Impact */}
                <div className="bg-surface-container-low dark:bg-white/5 p-6 rounded-3xl border border-outline-variant/10 dark:border-white/10">
                  <h4 className="text-sm font-bold text-on-surface dark:text-white mb-4">Analisis Portofolio</h4>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-[10px] font-bold text-on-surface-variant dark:text-outline uppercase mb-2">
                        <span>Fisik vs Likuid</span>
                        <span className="text-primary dark:text-[#a7c8ff]">65% Fisik</span>
                      </div>
                      <div className="h-1.5 w-full bg-surface-container-high dark:bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-primary dark:bg-[#a7c8ff] rounded-full" style={{ width: '65%' }}></div>
                      </div>
                    </div>
                    <p className="text-[11px] text-on-surface-variant dark:text-outline leading-relaxed italic">
                      Konsentrasi kekayaan pada sektor <span className="font-bold text-primary dark:text-[#a7c8ff]">{physicalCategory}</span> akan meningkat sebesar 8.2%.
                    </p>
                  </div>
                </div>

                {/* Recently Added Mockup */}
                <div className="space-y-3 px-2">
                  <h4 className="text-[10px] font-bold text-on-surface-variant dark:text-outline uppercase tracking-widest">Terakhir Ditambahkan</h4>
                  <div className="flex gap-2">
                    {[1, 2].map((i) => (
                      <div key={i} className="w-14 h-14 rounded-xl bg-surface-container-high dark:bg-white/10 overflow-hidden relative group">
                        <div className="w-full h-full bg-slate-200 dark:bg-slate-700 animate-pulse"></div>
                      </div>
                    ))}
                    <div className="w-14 h-14 rounded-xl border border-dashed border-outline-variant/30 dark:border-white/20 flex items-center justify-center">
                      <span className="material-symbols-outlined text-outline text-lg">add</span>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {assetType === 'liquid' && (
              /* LIQUID SPECIFIC SIDEBAR */
              <section className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                {/* Preview Card (Glassmorphism) */}
                <div className="relative overflow-hidden p-8 rounded-[32px] bg-primary-container dark:bg-gradient-to-br dark:from-[#001b3c] dark:to-[#002f5e] text-white shadow-2xl border border-white/5">
                  <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
                  <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/4 w-32 h-32 bg-[#a7c8ff]/10 rounded-full blur-2xl"></div>
                  <div className="relative z-10 space-y-10">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold uppercase tracking-widest opacity-40">Pratinjau Aset</p>
                        <h3 className="font-headline font-extrabold text-xl tracking-tight">{institution || 'Nama Bank'}</h3>
                      </div>
                      <span className="material-symbols-outlined text-3xl opacity-60">contactless</span>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs opacity-40 font-medium">Saldo Tersedia</p>
                      <div className="flex items-baseline gap-2">
                        <span className="text-lg font-bold opacity-60">IDR</span>
                        <span className="text-3xl font-headline font-black tracking-tight tabular-nums">{assetValue || '0'}</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-end pt-4 border-t border-white/10">
                      <div className="space-y-0.5">
                        <p className="text-[10px] uppercase opacity-30">Nomor Rekening</p>
                        <p className="font-mono text-sm tracking-widest opacity-70 italic">{accountNumber || '•••• •••• ••••'}</p>
                      </div>
                      <span className="material-symbols-outlined text-white/40">account_balance</span>
                    </div>
                  </div>
                </div>

                {/* Net Worth Impact */}
                <div className="bg-surface-container-low dark:bg-white/5 p-6 rounded-3xl border border-outline-variant/10 dark:border-white/10">
                  <h4 className="text-sm font-bold text-on-surface dark:text-white mb-4 italic">Dampak Kekayaan Bersih</h4>
                  <div className="space-y-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex justify-between text-[10px] font-bold text-on-surface-variant dark:text-outline uppercase tracking-wider">
                        <span>Saat Ini</span>
                        <span className="text-primary dark:text-[#a7c8ff]">+12.5%</span>
                      </div>
                      <div className="h-1.5 w-full bg-surface-container-high dark:bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-primary dark:bg-[#a7c8ff] rounded-full" style={{ width: '65%' }}></div>
                      </div>
                    </div>
                    <div className="p-4 bg-[#b1f0ce]/10 rounded-2xl border border-[#b1f0ce]/20 flex gap-3">
                      <span className="material-symbols-outlined text-[#b1f0ce] text-lg">trending_up</span>
                      <p className="text-[11px] text-on-surface-variant dark:text-outline font-medium leading-relaxed">
                        Penambahan ini akan meningkatkan <span className="font-bold text-[#b1f0ce]">Likuiditas Kas</span> Anda sebesar 18.4%.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Architect Tips */}
                <div className="p-6 bg-surface-container-high dark:bg-white/5 rounded-3xl border border-outline-variant/5 dark:border-white/5">
                  <h4 className="font-headline font-bold text-primary dark:text-[#a7c8ff] text-sm flex items-center gap-2 mb-4">
                    <span className="material-symbols-outlined text-lg">tips_and_updates</span>
                    Tips Arsitek
                  </h4>
                  <ul className="space-y-3">
                    <li className="flex gap-3 items-start">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary dark:bg-[#a7c8ff] mt-1.5 shadow-[0_0_8px_rgba(167,200,255,0.5)]"></div>
                      <p className="text-[11px] text-on-surface-variant dark:text-outline leading-relaxed">Pastikan saldo yang dimasukkan adalah saldo akhir yang tertera pada m-banking hari ini.</p>
                    </li>
                  </ul>
                </div>
              </section>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default FinanceAddAsset;
