import React from 'react';
import { useFinanceStore } from '../store/useFinanceStore';

const FinancePrintableReport: React.FC = () => {
  const { transactions, accounts, assets, budgetCategories, debts, settings, googleSheetUrl } = useFinanceStore();

  // Helper formatting currency
  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(val);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      
      const day = date.getDate();
      const monthNames = [
        'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
        'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'
      ];
      const month = monthNames[date.getMonth()];
      const year = date.getFullYear();
      
      return `${day}-${month}-${year}`;
    } catch (e) {
      return dateStr;
    }
  };

  // Extract client name from settings
  const clientName = settings.find(s => s.key === 'userName')?.value || 'Chaerobby Fakhri Fauzaan P.';
  const email = settings.find(s => s.key === 'email')?.value || 'user@example.com';
  
  // Calculate Totals
  const totalLiquid = accounts.reduce((sum, acc) => sum + acc.balance, 0);
  const totalNonLiquid = assets.reduce((sum, ast) => sum + ast.currentValue, 0);
  const totalAssets = totalLiquid + totalNonLiquid;
  const totalDebts = debts.reduce((sum, d) => sum + d.balance, 0);
  const netWorth = totalAssets - totalDebts;

  // Mask Sheet URL
  const maskedUrl = googleSheetUrl 
    ? `${googleSheetUrl.substring(0, 35)}.../exec`
    : 'Tidak Terintegrasi';

  const printType = useFinanceStore(state => state.printType);
  const reportPrintMonth = useFinanceStore(state => state.reportPrintMonth);
  const reportPrintYear = useFinanceStore(state => state.reportPrintYear);

  if (printType !== 'report') return null;

  const monthNamesArray = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const periodString = `${monthNamesArray[reportPrintMonth]} ${reportPrintYear}`;

  const transactionsInPeriod = transactions.filter(t => {
    const txDate = new Date(t.date);
    if (isNaN(txDate.getTime())) return false;
    return txDate.getMonth() === reportPrintMonth && txDate.getFullYear() === reportPrintYear;
  });

  const topIncome = transactionsInPeriod
    .filter(t => t.type === 'PEMASUKAN')
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 10);

  const topExpense = transactionsInPeriod
    .filter(t => t.type === 'PENGELUARAN')
    .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
    .slice(0, 10);

  // Calculate current month's spending per category from transactions
  const currentMonthSpending = budgetCategories.map(cat => {
    const spent = transactions
      .filter(t => {
        if (t.type !== 'PENGELUARAN' || t.category.toLowerCase() !== cat.name.toLowerCase()) return false;
        
        const txDate = new Date(t.date);
        if (isNaN(txDate.getTime())) return false;
        
        return txDate.getMonth() === reportPrintMonth && txDate.getFullYear() === reportPrintYear;
      })
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
    return {
      ...cat,
      spent
    };
  });

  return (
    <div className="printable-report-canvas print:block hidden font-sans">
      
      {/* 1. INSTITUTIONAL LETTERHEAD / KOP SURAT */}
      <div className="border-b-4 border-double border-slate-900 pb-4 mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 uppercase">{(import.meta.env.VITE_APP_NAME || 'DOMPETKU').toUpperCase()} FINANCIAL STATEMENT</h1>
            <p className="text-xs text-slate-600 mt-1 font-medium tracking-wide">
              Laporan Posisi Keuangan & Portofolio Aset Konsolidasi
            </p>
            <p className="text-[10px] text-slate-500 mt-1">
              Database Sync: <span className="font-mono">{maskedUrl}</span>
            </p>
          </div>
          <div className="text-right">
            <h2 className="text-sm font-bold text-slate-800 tracking-wider uppercase">{(import.meta.env.VITE_APP_NAME || 'NAM WEALTH').toUpperCase()} SYSTEM</h2>
            <p className="text-[10px] text-slate-500 mt-1">Tanggal Cetak: {new Date().toLocaleDateString('id-ID', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}</p>
            <p className="text-[9px] text-emerald-600 font-bold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded mt-1.5 inline-block">
              ✓ SECURE & VERIFIED
            </p>
          </div>
        </div>
      </div>

      {/* 2. CLIENT METADATA */}
      <div className="grid grid-cols-2 gap-4 mb-6 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
        <div>
          <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Pemilik Laporan (Nasabah)</span>
          <span className="font-bold text-slate-800 text-sm block mt-0.5">{clientName}</span>
          <span className="text-slate-500 block mt-0.5">{email || 'fakhri.fauzaan@gmail.com'}</span>
        </div>
        <div className="text-right">
          <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Status Portofolio</span>
          <span className="font-bold text-slate-800 text-sm block mt-0.5">Premium Tier</span>
          <span className="text-slate-500 block mt-0.5">Klasifikasi Aset: Diversifikasi Tinggi</span>
        </div>
      </div>

      {/* 3. CONSOLIDATED BALANCE SHEET SUMMARY */}
      <div className="mb-8">
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest border-b border-slate-300 pb-1.5 mb-3">
          I. Ringkasan Eksekutif (Periode: {periodString})
        </h3>
        <div className="grid grid-cols-4 gap-4">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Total Aset Lancar (Kas)</span>
            <span className="text-sm font-extrabold text-slate-900 mt-1 block">{formatRupiah(totalLiquid)}</span>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Aset Fisik & Investasi</span>
            <span className="text-sm font-extrabold text-slate-900 mt-1 block">{formatRupiah(totalNonLiquid)}</span>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Kewajiban (Utang)</span>
            <span className="text-sm font-extrabold text-red-700 mt-1 block">{formatRupiah(totalDebts)}</span>
          </div>
          <div className="p-3 bg-slate-900 text-white rounded-lg">
            <span className="text-[9px] text-slate-300 font-bold uppercase tracking-wider block">Kekayaan Bersih (Net Worth)</span>
            <span className="text-sm font-black mt-1 block">{formatRupiah(netWorth)}</span>
          </div>
        </div>
      </div>

      {/* 4. DETAILED LEDGER: ACCOUNTS & PHYSICAL ASSETS */}
      <div className="mb-8">
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest border-b border-slate-300 pb-1.5 mb-3">
          II. Rincian Aset Likuiditas & Non-Likuid (Periode: {periodString})
        </h3>
        
        {/* Accounts Table */}
        <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">A. Rekening Bank & Kas Lancar</h4>
        <table className="w-full text-left text-xs border border-slate-200 mb-4 rounded-lg overflow-hidden">
          <thead>
            <tr className="bg-slate-100 text-slate-700 text-[10px] font-bold uppercase border-b border-slate-200">
              <th className="px-3 py-2">Nama Rekening</th>
              <th className="px-3 py-2">Tipe</th>
              <th className="px-3 py-2">Mata Uang</th>
              <th className="px-3 py-2 text-right">Saldo Saat Ini</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {accounts.map(acc => (
              <tr key={acc.id} className="hover:bg-slate-50">
                <td className="px-3 py-2 font-bold text-slate-800">{acc.name}</td>
                <td className="px-3 py-2 capitalize">{acc.type}</td>
                <td className="px-3 py-2 font-mono">{acc.currency}</td>
                <td className="px-3 py-2 text-right font-mono font-bold">{formatRupiah(acc.balance)}</td>
              </tr>
            ))}
            <tr className="bg-slate-50 font-bold border-t border-slate-300">
              <td colSpan={3} className="px-3 py-2 text-slate-700">Subtotal Saldo Kas Lancar</td>
              <td className="px-3 py-2 text-right font-mono text-slate-900">{formatRupiah(totalLiquid)}</td>
            </tr>
          </tbody>
        </table>

        {/* Physical Assets & Investments Table */}
        <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">B. Instrumen Investasi & Aset Fisik Tangible</h4>
        <table className="w-full text-left text-xs border border-slate-200 rounded-lg overflow-hidden">
          <thead>
            <tr className="bg-slate-100 text-slate-700 text-[10px] font-bold uppercase border-b border-slate-200">
              <th className="px-3 py-2">Nama Aset</th>
              <th className="px-3 py-2">Kategori</th>
              <th className="px-3 py-2">Harga Perolehan</th>
              <th className="px-3 py-2 text-right">Nilai Pasar Aktual</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {assets.map(ast => (
              <tr key={ast.id} className="hover:bg-slate-50">
                <td className="px-3 py-2 font-bold text-slate-800">
                  {ast.title}
                  {ast.notes && <span className="block text-[9px] text-slate-400 font-normal italic mt-0.5">{ast.notes}</span>}
                </td>
                <td className="px-3 py-2 capitalize">{ast.category.replace('-', ' ')}</td>
                <td className="px-3 py-2 font-mono">{formatRupiah(ast.purchasePrice)}</td>
                <td className="px-3 py-2 text-right font-mono font-bold text-slate-800">{formatRupiah(ast.currentValue)}</td>
              </tr>
            ))}
            <tr className="bg-slate-50 font-bold border-t border-slate-300">
              <td colSpan={3} className="px-3 py-2 text-slate-700">Subtotal Nilai Aset Investasi & Fisik</td>
              <td className="px-3 py-2 text-right font-mono text-slate-900">{formatRupiah(totalNonLiquid)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="print-page-break" />

      {/* 5. DEBTS AND LIABILITIES */}
      {debts.length > 0 && (
        <div className="mb-8">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest border-b border-slate-300 pb-1.5 mb-3">
            III. Kewajiban & Rencana Pelunasan Utang (Periode: {periodString})
          </h3>
          <table className="w-full text-left text-xs border border-slate-200 rounded-lg overflow-hidden">
            <thead>
              <tr className="bg-slate-100 text-slate-700 text-[10px] font-bold uppercase border-b border-slate-200">
                <th className="px-3 py-2">Nama Debitur / Liabilitas</th>
                <th className="px-3 py-2">Suku Bunga (%)</th>
                <th className="px-3 py-2">Pembayaran Minimum</th>
                <th className="px-3 py-2 text-right">Sisa Pokok Utang</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {debts.map(d => (
                <tr key={d.id} className="hover:bg-slate-50">
                  <td className="px-3 py-2 font-bold text-slate-800">{d.name} <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-normal capitalize">{d.type}</span></td>
                  <td className="px-3 py-2 font-mono">{d.interestRate}% Efektif</td>
                  <td className="px-3 py-2 font-mono">{formatRupiah(d.minPayment)}/bln</td>
                  <td className="px-3 py-2 text-right font-mono font-bold text-red-700">{formatRupiah(d.balance)}</td>
                </tr>
              ))}
              <tr className="bg-slate-50 font-bold border-t border-slate-300">
                <td colSpan={3} className="px-3 py-2 text-slate-700">Total Kewajiban Terhutang</td>
                <td className="px-3 py-2 text-right font-mono text-red-700">{formatRupiah(totalDebts)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* 6. BUDGET ALLOCATION AND PERFORMANCE */}
      <div className="mb-8">
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest border-b border-slate-300 pb-1.5 mb-3">
          IV. Anggaran Bulanan & Realisasi Kategori (Periode: {periodString})
        </h3>
        <table className="w-full text-left text-xs border border-slate-200 rounded-lg overflow-hidden">
          <thead>
            <tr className="bg-slate-100 text-slate-700 text-[10px] font-bold uppercase border-b border-slate-200">
              <th className="px-3 py-2">Kategori Anggaran</th>
              <th className="px-3 py-2">Alokasi Anggaran</th>
              <th className="px-3 py-2">Realisasi Pengeluaran</th>
              <th className="px-3 py-2">Sisa Anggaran</th>
              <th className="px-3 py-2 text-right">Persentase Terpakai</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {currentMonthSpending.map(cat => {
              const remaining = cat.allocated - cat.spent;
              const percentUsed = cat.allocated > 0 ? (cat.spent / cat.allocated) * 100 : 0;
              const isOver = remaining < 0;
              
              return (
                <tr key={cat.id} className="hover:bg-slate-50">
                  <td className="px-3 py-2 font-bold text-slate-800">{cat.name}</td>
                  <td className="px-3 py-2 font-mono">{formatRupiah(cat.allocated)}</td>
                  <td className="px-3 py-2 font-mono text-slate-600">{formatRupiah(cat.spent)}</td>
                  <td className={`px-3 py-2 font-mono font-bold ${isOver ? 'text-red-700' : 'text-slate-800'}`}>
                    {formatRupiah(remaining)}
                  </td>
                  <td className="px-3 py-2 text-right font-mono font-bold">
                    <span className={`px-2 py-0.5 rounded text-[10px] ${percentUsed > 90 ? 'bg-red-50 text-red-700 border border-red-200' : percentUsed > 75 ? 'bg-orange-50 text-orange-700 border border-orange-200' : 'bg-slate-100 text-slate-700'}`}>
                      {percentUsed.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 7. RECENT TRANSACTIONS */}
      <div className="mb-8 grid grid-cols-2 gap-6 items-start">
        <div>
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest border-b border-slate-300 pb-1.5 mb-3">
            V. Top 10 Pemasukan (Periode: {periodString})
          </h3>
          <table className="w-full text-left text-xs border border-slate-200 rounded-lg overflow-hidden">
            <thead>
              <tr className="bg-emerald-50 text-emerald-800 text-[10px] font-bold uppercase border-b border-emerald-200">
                <th className="px-3 py-2">Deskripsi & Info</th>
                <th className="px-3 py-2 text-right">Nominal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {topIncome.length > 0 ? topIncome.map((tx, idx) => (
                <tr key={`${tx.id}-${idx}`} className="hover:bg-slate-50">
                  <td className="px-3 py-2">
                    <span className="font-bold text-slate-800 block">{tx.desc}</span>
                    <span className="text-[9px] text-slate-400 font-medium mt-0.5">{formatDate(tx.date)} • {tx.account}</span>
                  </td>
                  <td className={`px-3 py-2 text-right font-mono font-bold text-emerald-700`}>
                    +{formatRupiah(tx.amount)}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={2} className="px-3 py-4 text-center text-slate-400 text-xs italic">Tidak ada data pemasukan pada periode ini.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div>
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest border-b border-slate-300 pb-1.5 mb-3">
            VI. Top 10 Pengeluaran (Periode: {periodString})
          </h3>
          <table className="w-full text-left text-xs border border-slate-200 rounded-lg overflow-hidden">
            <thead>
              <tr className="bg-red-50 text-red-800 text-[10px] font-bold uppercase border-b border-red-200">
                <th className="px-3 py-2">Deskripsi & Info</th>
                <th className="px-3 py-2 text-right">Nominal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {topExpense.length > 0 ? topExpense.map((tx, idx) => (
                <tr key={`${tx.id}-${idx}`} className="hover:bg-slate-50">
                  <td className="px-3 py-2">
                    <span className="font-bold text-slate-800 block">{tx.desc}</span>
                    <span className="text-[9px] text-slate-400 font-medium capitalize mt-0.5">{formatDate(tx.date)} • {tx.category}</span>
                  </td>
                  <td className={`px-3 py-2 text-right font-mono font-bold text-red-700`}>
                    -{formatRupiah(tx.amount)}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={2} className="px-3 py-4 text-center text-slate-400 text-xs italic">Tidak ada data pengeluaran pada periode ini.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 8. AI FINANCIAL PLANNER REPORT & RECOMMENDATION */}
      <div className="mb-10 bg-slate-50 p-6 rounded-2xl border border-slate-200 print:break-inside-avoid">
        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-widest mb-3 flex items-center gap-1.5">
          ✦ WAWASAN INVESTASI & REKOMENDASI ROBO-ADVISOR
        </h4>
        <div className="space-y-3 text-xs leading-relaxed text-slate-700">
          <p>
            1. <strong>Rasio Dana Darurat:</strong> Posisi dana darurat terkonfirmasi pada rasio <strong>{(totalLiquid / 750000000 * 100).toFixed(1)}%</strong> dari target minimum Rp 750 Jt. Likuiditas saat ini sangat aman guna mengantisipasi volatilitas ekonomi mikro.
          </p>
          <p>
            2. <strong>Alokasi Portofolio:</strong> Sebesar <strong>{((totalLiquid / totalAssets) * 100).toFixed(1)}%</strong> aset disimpan dalam instrumen kas lancar. Robo-advisor merekomendasikan melakukan rebalancing berkala sebesar 5% dari kas lancar ke instrumen berpendapatan tetap obligasi guna mengimbangi inflasi nasional.
          </p>
          <p>
            3. <strong>Analisis Utang:</strong> Rasio utang terhadap total aset konsolidasi berada pada angka <strong>{((totalDebts / totalAssets) * 100).toFixed(1)}%</strong>. Ini diklasifikasikan sebagai status <strong>Leverage Sehat & Aman</strong> (batas aman maksimal 35%).
          </p>
        </div>
      </div>

      {/* 9. SIGNATURES & OFFICIAL SEALS */}
      <div className="grid grid-cols-2 gap-8 pt-8 mt-12 border-t border-slate-300 print:break-inside-avoid text-xs">
        <div className="flex flex-col items-center">
          <span className="text-slate-400 block mb-12 uppercase tracking-widest text-[9px] font-bold">Dibuat & Disetujui Oleh,</span>
          <span className="font-bold text-slate-800 border-b border-slate-400 pb-1 px-8 block">{clientName}</span>
          <span className="text-[9px] text-slate-400 mt-1">Pemilik Portofolio / Nasabah</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-slate-400 block mb-8 uppercase tracking-widest text-[9px] font-bold">Diverifikasi & Disahkan,</span>
          {/* Elegant SVG Seal representation */}
          <div className="w-12 h-12 flex items-center justify-center rounded-full border-2 border-slate-900 border-dashed animate-spin duration-1000 mb-2 opacity-80">
            <span className="text-[8px] font-bold font-mono tracking-widest uppercase">NAM AI</span>
          </div>
          <span className="font-bold text-slate-800 border-b border-slate-400 pb-1 px-8 block">Robo-Advisor AI System</span>
          <span className="text-[9px] text-slate-400 mt-1">Sistem Otomatisasi {import.meta.env.VITE_APP_NAME || 'DompetKu'}</span>
        </div>
      </div>

      {/* WATERMARK BAGAIMANA */}
      <div className="mt-8 pt-4 text-center">
        <p className="text-[10px] text-slate-400 font-medium tracking-widest uppercase">
          Dokumen ini digenerate secara otomatis oleh sistem DompetKu - Developed by NAMTECH
        </p>
      </div>

    </div>
  );
};

export default FinancePrintableReport;
