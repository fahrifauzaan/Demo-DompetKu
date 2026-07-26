import React, { useMemo } from 'react';
import { useFinanceStore } from '../store/useFinanceStore';

const FinancePrintableLedger: React.FC = () => {
  const { ledgerPrintTransactions, printType } = useFinanceStore();

  const totalPemasukan = useMemo(() => {
    return ledgerPrintTransactions
      .filter(t => t.type === 'PEMASUKAN')
      .reduce((sum, t) => sum + Math.abs(t.amount || 0), 0);
  }, [ledgerPrintTransactions]);

  const totalPengeluaran = useMemo(() => {
    return ledgerPrintTransactions
      .filter(t => t.type === 'PENGELUARAN')
      .reduce((sum, t) => sum + Math.abs(t.amount || 0), 0);
  }, [ledgerPrintTransactions]);

  // Don't render if it's not the active print target
  if (printType !== 'ledger') return null;

  const today = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  return (
    <div className="hidden print:block bg-white text-black min-h-screen font-['Inter'] px-12 py-10">
      
      {/* HEADER: Rekening Koran Bank */}
      <div className="flex justify-between items-start border-b-2 border-black pb-6 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight mb-1 uppercase">Rekening Koran</h1>
          <p className="text-gray-600 text-sm">LOG TRANSAKSI DOMPETKU</p>
        </div>
        <div className="text-right">
          <div className="text-xl font-bold uppercase mb-1">NAM-TECH</div>
          <p className="text-xs text-gray-500 max-w-[200px] ml-auto">
            Gedung Financial Center Lt. 8<br/>
            Jl. Jend. Sudirman Kav. 21, Jakarta 12920
          </p>
        </div>
      </div>

      {/* NASABAH INFO */}
      <div className="flex justify-between items-end mb-8">
        <div>
          <table className="text-sm">
            <tbody>
              <tr>
                <td className="py-1 pr-6 font-bold text-gray-500 uppercase text-xs">Nama Pengguna</td>
                <td className="py-1 font-semibold uppercase">{import.meta.env.VITE_APP_OWNER_NAME || 'Pengguna DompetKu'}</td>
              </tr>
              <tr>
                <td className="py-1 pr-6 font-bold text-gray-500 uppercase text-xs">Tanggal Cetak</td>
                <td className="py-1 font-semibold">{today}</td>
              </tr>
              <tr>
                <td className="py-1 pr-6 font-bold text-gray-500 uppercase text-xs">Total Transaksi</td>
                <td className="py-1 font-semibold">{ledgerPrintTransactions.length} Data Transaksi Terfilter</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* TRANSAKSI TABLE */}
      <div className="w-full">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="border-y-2 border-black">
              <th className="py-3 px-2 font-bold uppercase text-xs">Tanggal</th>
              <th className="py-3 px-2 font-bold uppercase text-xs">Deskripsi / Lokasi</th>
              <th className="py-3 px-2 font-bold uppercase text-xs">Akun</th>
              <th className="py-3 px-2 font-bold uppercase text-xs text-center">Tipe</th>
              <th className="py-3 px-2 font-bold uppercase text-xs text-center">Status</th>
              <th className="py-3 px-2 font-bold uppercase text-xs text-right">Mutasi (Rp)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-300">
            {ledgerPrintTransactions.length > 0 ? (
              ledgerPrintTransactions.map((t, idx) => (
                <tr key={idx} className="print:break-inside-avoid">
                  <td className="py-3 px-2 whitespace-nowrap align-top">{t.date || '-'}</td>
                  <td className="py-3 px-2 align-top">
                    <div className="font-semibold">{t.desc}</div>
                    <div className="text-xs text-gray-500 mt-1">{t.location} | {t.category}</div>
                  </td>
                  <td className="py-3 px-2 align-top">{t.account}</td>
                  <td className="py-3 px-2 align-top text-center text-xs">
                    {t.type === 'PEMASUKAN' ? 'CR' : 'DB'}
                  </td>
                  <td className="py-3 px-2 align-top text-center text-xs">
                    {t.status === 'Selesai' ? 'Berhasil' : t.status}
                  </td>
                  <td className={`py-3 px-2 align-top text-right font-mono font-bold ${t.type === 'PEMASUKAN' ? '' : ''}`}>
                    {t.type === 'PEMASUKAN' ? '+' : '-'} {Math.abs(t.amount).toLocaleString('id-ID')}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="py-8 text-center text-gray-500 italic">
                  Tidak ada transaksi pada filter ini.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* REKAPITULASI FOOTER */}
      <div className="mt-8 pt-4 border-t-2 border-black flex justify-end print:break-inside-avoid">
        <div className="w-64">
          <table className="w-full text-sm">
            <tbody>
              <tr>
                <td className="py-2 text-gray-600 uppercase text-xs font-bold">Total Pemasukan (CR)</td>
                <td className="py-2 text-right font-mono font-bold">+ {totalPemasukan.toLocaleString('id-ID')}</td>
              </tr>
              <tr>
                <td className="py-2 text-gray-600 uppercase text-xs font-bold">Total Pengeluaran (DB)</td>
                <td className="py-2 text-right font-mono font-bold">- {totalPengeluaran.toLocaleString('id-ID')}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* TTD VALIDATOR */}
      <div className="mt-16 pt-16 flex justify-end print:break-inside-avoid">
        <div className="text-center">
          <p className="text-xs text-gray-500 mb-16">Divalidasi Oleh Sistem</p>
          <p className="font-bold border-b border-black inline-block px-4 pb-1">DompetKu Automated Ledger</p>
          <p className="text-xs text-gray-500 mt-1">Dicetak pada: {new Date().toLocaleString('id-ID')}</p>
        </div>
      </div>

      {/* WATERMARK BAGAIMANA */}
      <div className="fixed bottom-0 left-0 w-full pb-4 text-center">
        <p className="text-[10px] text-gray-400 font-medium tracking-widest uppercase">
          Dokumen ini digenerate secara otomatis oleh sistem DompetKu - Developed by NAMTECH
        </p>
      </div>

    </div>
  );
};

export default FinancePrintableLedger;
