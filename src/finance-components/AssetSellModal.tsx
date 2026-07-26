import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useFinanceStore, type Asset } from '../store/useFinanceStore';
import { costTag } from './realizedGainUtils';

interface AssetSellModalProps {
  isOpen: boolean;
  onClose: () => void;
  asset: Asset | null;
}

const formatRp = (n: number) => `Rp ${Math.round(n || 0).toLocaleString('id-ID')}`;
const parseNum = (s: string) => Number(String(s).replace(/[^0-9.]/g, '')) || 0;
const parseDigits = (s: string) => Number(String(s).replace(/\D/g, '')) || 0;
const todayISO = () => new Date().toISOString().slice(0, 10);

export const AssetSellModal: React.FC<AssetSellModalProps> = ({ isOpen, onClose, asset }) => {
  const accounts = useFinanceStore((s) => s.accounts);
  const addTransaction = useFinanceStore((s) => s.addTransaction);
  const updateAccount = useFinanceStore((s) => s.updateAccount);
  const updateAsset = useFinanceStore((s) => s.updateAsset);

  const hasUnits = !!(asset && asset.shares && asset.shares > 0);
  const avgCost = useMemo(() => {
    if (!asset) return 0;
    if (asset.avgCost && asset.avgCost > 0) return asset.avgCost;
    if (hasUnits) return (asset.purchasePrice || 0) / (asset.shares || 1);
    return asset.currentPrice || 0;
  }, [asset, hasUnits]);

  const [qty, setQty] = useState(0);
  const [price, setPrice] = useState(0);
  const [proceedsInput, setProceedsInput] = useState(0); // untuk aset tanpa unit
  const [accountName, setAccountName] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isOpen || !asset) return;
    setQty(asset.shares || 0);
    setPrice(asset.currentPrice || avgCost || 0);
    setProceedsInput(asset.currentValue || asset.purchasePrice || 0);
    setAccountName(accounts.find((a) => a.type === 'bank' || a.type === 'cash' || a.type === 'wallet')?.name || accounts[0]?.name || '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, asset]);

  if (!isOpen || !asset) return null;

  const maxShares = asset.shares || 0;
  const clampedQty = hasUnits ? Math.min(qty, maxShares) : 0;
  const proceeds = hasUnits ? clampedQty * price : proceedsInput;
  const costSold = hasUnits ? clampedQty * avgCost : (asset.purchasePrice || 0);
  const gain = proceeds - costSold;
  const isFullSell = !hasUnits || clampedQty >= maxShares;
  const valid = proceeds > 0 && accountName && (!hasUnits || clampedQty > 0);

  const handleSell = async () => {
    if (!valid || busy) return;
    setBusy(true);
    const ticker = asset.ticker || (asset.title || '').split(' ')[0] || 'ASET';
    const desc = hasUnits
      ? `Jual ${ticker} — ${clampedQty} unit @ ${formatRp(price)}`
      : `Jual ${asset.title}`;
    // Penjualan = 3 penulisan berurutan (transaksi → saldo akun → holding). Store TIDAK melempar error
    // (postToSheet menampungnya ke `saveError`), jadi tanpa pemeriksaan ini langkah 2/3 tetap dijalankan
    // walau langkah 1 gagal → tercatat laku + saldo naik padahal holding tak pernah berkurang di Sheet.
    // Berhenti di langkah pertama yang gagal dan laporkan jujur; jangan tutup modal seolah sukses.
    const failed = (step: string): boolean => {
      const err = useFinanceStore.getState().saveError;
      if (!err) return false;
      setBusy(false);
      alert(`Penjualan DIBATALKAN pada tahap "${step}".\n\n${err}\n\nSilakan periksa koneksi lalu coba lagi. Cek juga tab Transaksi/Aset di Google Sheet Anda untuk memastikan tidak ada catatan setengah jadi.`);
      return true;
    };

    await addTransaction({
      date: todayISO(),
      desc,
      location: costTag(costSold), // machine tag: "Jual • cost:<n>"
      amount: proceeds,
      category: 'Capital Gain',
      icon: 'sell',
      status: 'Selesai',
      account: accountName,
      type: 'PEMASUKAN',
    });
    if (failed('mencatat transaksi penjualan')) return;

    const acc = accounts.find((a) => a.name === accountName);
    if (acc) {
      await updateAccount({ ...acc, balance: acc.balance + proceeds });
      if (failed('memperbarui saldo rekening')) return;
    }

    if (isFullSell) {
      await updateAsset({ ...asset, shares: 0, currentValue: 0, purchasePrice: 0, notes: `Terjual ${todayISO()} • ${(asset.notes || '').slice(0, 60)}` });
    } else {
      const remShares = maxShares - clampedQty;
      await updateAsset({
        ...asset,
        shares: remShares,
        purchasePrice: Math.max(0, (asset.purchasePrice || 0) - costSold),
        currentValue: remShares * (asset.currentPrice || price),
      });
    }
    if (failed('memperbarui kepemilikan aset')) return;

    setBusy(false);
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[115] flex items-start sm:items-center justify-center p-3 sm:p-4 overflow-y-auto">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />
        <motion.div initial={{ opacity: 0, scale: 0.97, y: 24 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97, y: 24 }}
          transition={{ type: 'spring', damping: 28, stiffness: 240 }}
          className="relative w-full max-w-md my-auto bg-surface dark:bg-[#191c1e] rounded-3xl shadow-2xl border border-outline-variant/15 dark:border-white/10 p-5 sm:p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 dark:bg-emerald-400/15 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0"><span className="material-symbols-outlined text-2xl">sell</span></div>
              <div className="min-w-0"><h2 className="text-lg font-black font-headline text-on-surface dark:text-white truncate">Jual Aset</h2><p className="text-[11px] text-on-surface-variant dark:text-slate-400 font-bold uppercase tracking-wider truncate">{asset.title}</p></div>
            </div>
            <button onClick={onClose} className="w-9 h-9 rounded-full bg-surface-container dark:bg-white/5 flex items-center justify-center text-on-surface dark:text-white cursor-pointer"><span className="material-symbols-outlined text-lg">close</span></button>
          </div>

          <div className="space-y-3">
            {hasUnits ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-on-surface-variant dark:text-slate-400">Jumlah unit (maks {maxShares})</label>
                    <input type="text" inputMode="decimal" value={qty} onChange={(e) => setQty(Math.min(maxShares, parseNum(e.target.value)))}
                      className="w-full bg-surface-container-low dark:bg-white/5 border border-outline-variant/10 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm font-bold text-on-surface dark:text-white tabular-nums outline-none focus:border-emerald-500/50" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-on-surface-variant dark:text-slate-400">Harga jual / unit</label>
                    <div className="flex items-center gap-1 bg-surface-container-low dark:bg-white/5 border border-outline-variant/10 dark:border-white/10 rounded-xl px-3 py-2.5 focus-within:border-emerald-500/50">
                      <span className="text-[10px] font-bold text-on-surface-variant">Rp</span>
                      <input type="text" inputMode="numeric" value={price.toLocaleString('id-ID')} onChange={(e) => setPrice(parseDigits(e.target.value))} className="w-full bg-transparent border-none p-0 text-sm font-bold text-on-surface dark:text-white tabular-nums outline-none focus:ring-0" />
                    </div>
                  </div>
                </div>
                <button onClick={() => setQty(maxShares)} className="text-[11px] font-bold text-primary dark:text-[#a7c8ff] hover:underline cursor-pointer">Jual semua ({maxShares} unit)</button>
              </>
            ) : (
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-on-surface-variant dark:text-slate-400">Nilai jual / pencairan (Rp)</label>
                <div className="flex items-center gap-2 bg-surface-container-low dark:bg-white/5 border border-outline-variant/10 dark:border-white/10 rounded-2xl px-4 py-3 focus-within:border-emerald-500/50">
                  <span className="text-sm font-bold text-on-surface-variant">Rp</span>
                  <input type="text" inputMode="numeric" value={proceedsInput.toLocaleString('id-ID')} onChange={(e) => setProceedsInput(parseDigits(e.target.value))} className="w-full bg-transparent border-none p-0 text-lg font-black text-on-surface dark:text-white tabular-nums outline-none focus:ring-0" />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-on-surface-variant dark:text-slate-400">Dana masuk ke akun</label>
              <select value={accountName} onChange={(e) => setAccountName(e.target.value)} className="w-full bg-surface-container-low dark:bg-white/5 border border-outline-variant/10 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm font-bold text-on-surface dark:text-white outline-none focus:border-emerald-500/50 cursor-pointer">
                {accounts.map((a) => <option key={a.id} value={a.name}>{a.name}</option>)}
              </select>
            </div>

            {/* Ringkasan realized gain */}
            <div className="rounded-2xl border border-outline-variant/10 dark:border-white/10 divide-y divide-outline-variant/10 dark:divide-white/5 overflow-hidden">
              {[
                { l: 'Hasil penjualan', v: formatRp(proceeds) },
                { l: `Modal (avg cost${hasUnits ? ` ${formatRp(avgCost)}/unit` : ''})`, v: `− ${formatRp(costSold)}` },
              ].map((r) => (
                <div key={r.l} className="flex items-center justify-between px-3.5 py-2"><span className="text-xs text-on-surface-variant dark:text-slate-400">{r.l}</span><span className="text-xs font-bold text-on-surface dark:text-slate-200 tabular-nums">{r.v}</span></div>
              ))}
              <div className={`flex items-center justify-between px-3.5 py-2.5 ${gain >= 0 ? 'bg-emerald-500/10' : 'bg-error/10'}`}>
                <span className="text-xs font-black text-on-surface dark:text-white">Realized {gain >= 0 ? 'Gain' : 'Loss'}</span>
                <span className={`text-sm font-black tabular-nums ${gain >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-error dark:text-[#ffb4ab]'}`}>{gain >= 0 ? '+' : '−'} {formatRp(Math.abs(gain))}</span>
              </div>
            </div>

            <p className="text-[10.5px] text-on-surface-variant/80 dark:text-slate-500 leading-relaxed">
              {isFullSell ? 'Seluruh holding terjual → aset ditandai "Terjual".' : `Sisa holding: ${maxShares - clampedQty} unit.`} Transaksi pemasukan otomatis dibuat & saldo akun bertambah.
            </p>

            <div className="flex gap-2 pt-1">
              <button onClick={onClose} className="flex-1 py-3 rounded-2xl bg-surface-container dark:bg-white/10 text-on-surface dark:text-white font-bold text-sm cursor-pointer">Batal</button>
              <button onClick={handleSell} disabled={!valid || busy} className="flex-1 py-3 rounded-2xl bg-emerald-500 text-white font-bold text-sm hover:bg-emerald-600 disabled:opacity-40 active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-1.5">
                <span className="material-symbols-outlined text-lg">sell</span>Jual Sekarang
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default AssetSellModal;
