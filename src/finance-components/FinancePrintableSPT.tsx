import React, { useMemo } from 'react';
import { useFinanceStore } from '../store/useFinanceStore';
import { hartaCodeLabel, type SptRow } from './sptUtils';

const FinancePrintableSPT: React.FC = () => {
  const { sptPrintRows, printType } = useFinanceStore();

  const rows: SptRow[] = useMemo(
    () => (sptPrintRows as SptRow[]).filter((r) => !r.excluded),
    [sptPrintRows]
  );
  const total = useMemo(() => rows.reduce((s, r) => s + (r.hargaPerolehan || 0), 0), [rows]);

  if (printType !== 'spt') return null;

  const today = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="hidden print:block bg-white text-black min-h-screen font-['Inter'] px-12 py-10">
      {/* HEADER */}
      <div className="flex justify-between items-start border-b-2 border-black pb-6 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight mb-1 uppercase">Daftar Harta pada Akhir Tahun</h1>
          <p className="text-gray-600 text-sm">Lampiran IV SPT Tahunan PPh Orang Pribadi · DompetKu</p>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold uppercase mb-1">NAM-TECH</div>
          <p className="text-xs text-gray-500">Dicetak: {today}</p>
        </div>
      </div>

      <p className="text-[11px] text-gray-600 mb-4 italic">
        Nilai yang tercantum adalah <strong>harga perolehan</strong> (bukan nilai pasar), sesuai ketentuan pelaporan Daftar Harta.
      </p>

      {/* TABLE */}
      <table className="w-full text-left text-sm border-collapse">
        <thead>
          <tr className="border-y-2 border-black">
            <th className="py-2.5 px-2 font-bold uppercase text-xs">No</th>
            <th className="py-2.5 px-2 font-bold uppercase text-xs">Kode Harta</th>
            <th className="py-2.5 px-2 font-bold uppercase text-xs">Nama Harta</th>
            <th className="py-2.5 px-2 font-bold uppercase text-xs text-center">Thn Perolehan</th>
            <th className="py-2.5 px-2 font-bold uppercase text-xs text-right">Harga Perolehan (Rp)</th>
            <th className="py-2.5 px-2 font-bold uppercase text-xs">Keterangan</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-300">
          {rows.length > 0 ? rows.map((r, idx) => (
            <tr key={r.id} className="page-break-inside-avoid align-top">
              <td className="py-2.5 px-2">{idx + 1}</td>
              <td className="py-2.5 px-2 font-mono font-semibold whitespace-nowrap">{hartaCodeLabel(r.kode)}</td>
              <td className="py-2.5 px-2 font-semibold">{r.nama}</td>
              <td className="py-2.5 px-2 text-center">{r.tahun}</td>
              <td className="py-2.5 px-2 text-right font-mono">{Math.round(r.hargaPerolehan || 0).toLocaleString('id-ID')}</td>
              <td className="py-2.5 px-2 text-xs text-gray-600">{r.keterangan}</td>
            </tr>
          )) : (
            <tr><td colSpan={6} className="py-8 text-center text-gray-500 italic">Tidak ada harta untuk dilaporkan.</td></tr>
          )}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-black font-bold">
            <td className="py-3 px-2" colSpan={4}>TOTAL HARGA PEROLEHAN</td>
            <td className="py-3 px-2 text-right font-mono">{Math.round(total).toLocaleString('id-ID')}</td>
            <td className="py-3 px-2"></td>
          </tr>
        </tfoot>
      </table>

      <div className="mt-10 text-[10px] text-gray-500 leading-relaxed">
        <p>Dokumen bantu ini digenerate otomatis oleh DompetKu untuk memudahkan pengisian e-Filing DJP (djponline.pajak.go.id).
        Bukan dokumen resmi DJP. Pastikan kembali kode harta &amp; nilai sebelum melapor.</p>
      </div>

      <div className="fixed bottom-0 left-0 w-full pb-4 text-center">
        <p className="text-[10px] text-gray-400 font-medium tracking-widest uppercase">
          Digenerate oleh DompetKu — Developed by NAMTECH
        </p>
      </div>
    </div>
  );
};

export default FinancePrintableSPT;
