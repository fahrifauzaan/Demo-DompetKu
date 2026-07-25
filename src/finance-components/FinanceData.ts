import { FinanceTab } from '../FinanceDemo';

export interface SearchResult {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: 'Menu' | 'Transaksi' | 'Aset' | 'Aksi';
  targetTab?: FinanceTab;
  action?: () => void;
}

export const NAV_ITEMS: { id: FinanceTab; label: string; icon: string }[] = [
  { id: 'dashboard', label: 'Dasbor', icon: 'dashboard' },
  { id: 'transactions', label: 'Transaksi', icon: 'receipt_long' },
  { id: 'budget', label: 'Anggaran', icon: 'payments' },
  { id: 'assets', label: 'Aset', icon: 'account_balance' },
  { id: 'debts', label: 'Rencana Utang', icon: 'leaderboard' },
  { id: 'analytics', label: 'Laporan', icon: 'query_stats' },
];

export const TRANSACTIONS_DATA = [
  { id: '1', date: '23 Mar 2024', desc: 'Apple Store Jakarta', location: 'Grand Indonesia', amount: -24999000, category: 'Perabotan Rumah Tangga', icon: 'living', status: 'Selesai', account: 'Platinum Card', type: 'PENGELUARAN' },
  { id: '2', date: '22 Mar 2024', desc: 'Netflix Subscription', location: 'Online', amount: -186000, category: 'Layanan Berlangganan', icon: 'workspace_premium', status: 'Selesai', account: 'Debit Bank Central', type: 'PENGELUARAN' },
  { id: '3', date: '22 Mar 2024', desc: 'Dividen Saham BBCA', location: 'Stockbit', amount: 15400000, category: 'Dividen & Investasi', icon: 'pie_chart', status: 'Selesai', account: 'RDI Investasi', type: 'PEMASUKAN' },
  { id: '4', date: '21 Mar 2024', desc: 'Shell V-Power Nitro', location: 'Shell Kemang', amount: -850000, category: 'Transportasi & Bensin', icon: 'directions_car', status: 'Selesai', account: 'Platinum Card', type: 'PENGELUARAN' },
  { id: '5', date: '20 Mar 2024', desc: 'Gaji Bulanan PT. NAM', location: 'Transfer', amount: 85000000, category: 'Gaji Pokok', icon: 'work', status: 'Selesai', account: 'Debit Bank Central', type: 'PEMASUKAN' },
  { id: '6', date: '19 Mar 2024', desc: 'Tokopedia - Kursi Kerja', location: 'Online', amount: -4200000, category: 'Tempat Tinggal / KPR', icon: 'home', status: 'Tertunda', account: 'Platinum Card', type: 'PENGELUARAN' },
  { id: '7', date: '18 Mar 2024', desc: 'Adobe Creative Cloud', location: 'Online', amount: -715000, category: 'Layanan Berlangganan', icon: 'workspace_premium', status: 'Selesai', account: 'Debit Bank Central', type: 'PENGELUARAN' },
];

export const ASSETS_DATA = [
  { id: 'a1', title: 'Rumah Mewah Menteng', value: 12500000000, icon: 'home' },
  { id: 'a2', title: 'Porsche 911 Carrera', value: 3200000000, icon: 'directions_car' },
  { id: 'a3', title: 'Saham Blue Chip (BBCA, TLKM)', value: 1500000000, icon: 'show_chart' },
  { id: 'a4', title: 'Simpanan Bank Central', value: 1800000000, icon: 'account_balance' },
];

export const DEBTS_DATA: any[] = [];

