/**
 * Kanonikalisasi kategori ke Bahasa Indonesia.
 * Dulu: kategori DISIMPAN dalam Inggris ('Food') lalu diterjemahkan ke Indonesia ('Makanan & Minuman')
 * hanya saat DITAMPILKAN. Akibatnya transaksi hasil impor (yang memakai nama Indonesia langsung) tak
 * cocok dengan kategori Anggaran (Inggris) → Budget vs Aktual kosong.
 * Sekarang: Indonesia jadi nama KANONIK (disimpan). Peta di bawah dipakai untuk (a) migrasi data lama
 * Inggris→Indonesia, dan (b) menerjemahkan sisa nilai Inggris yang belum termigrasi saat tampil.
 */
export const CATEGORY_EN_TO_ID: Record<string, string> = {
  // Pengeluaran
  'Housing': 'Tempat Tinggal / KPR',
  'Food': 'Makanan & Minuman',
  'Utilities': 'Tagihan Listrik & Air',
  'Healthcare': 'Kesehatan & Obat',
  'Transportation': 'Transportasi & Bensin',
  'Debt': 'Cicilan & Pelunasan Utang',
  'Personal Care': 'Perawatan Diri',
  'Education': 'Pendidikan & Kursus',
  'Childcare': 'Kebutuhan Anak',
  'Household': 'Perabotan Rumah Tangga',
  'Pets': 'Hewan Peliharaan',
  'Clothing and Accessories': 'Pakaian & Aksesoris',
  'Insurance': 'Premi Asuransi',
  'Work Expenses': 'Pengeluaran Kerja/Bisnis',
  'Entertainment': 'Hiburan & Hobi',
  'Gift': 'Kado & Donasi',
  'Travel': 'Travel & Liburan',
  'Subscription': 'Layanan Berlangganan',
  'Bills': 'Tagihan Bulanan',
  // Pemasukan
  'Salary': 'Gaji Pokok',
  'Partner Salary': 'Gaji Pasangan',
  'Side Hustle / Freelance': 'Pekerjaan Sampingan',
  'Business Income': 'Pendapatan Bisnis',
  'Investments Income / Dividends / Capital Gains': 'Dividen & Investasi',
  'Rental Income': 'Uang Sewa / Kost',
  'Commissions': 'Komisi & Insentif',
  'Bonuses': 'Bonus & THR',
  'Pension Income': 'Uang Pensiun',
  'Scholarships / Grants': 'Beasiswa & Hibah',
  'Inheritance': 'Warisan',
  'Lottery / Gambling Winnings': 'Undian & Hadiah',
  'Gifts': 'Pemberian / Angpao',
  'Refunds / Reimbursements': 'Reimbursement Kerja',
  'Others': 'Pendapatan Lainnya',
};

/** Terjemahkan nama kategori ke Indonesia bila masih tersimpan dalam Inggris (pass-through bila sudah ID). */
export const toDisplayCategory = (name: string): string => CATEGORY_EN_TO_ID[name] || name;

export interface CategoryOption { name: string; icon: string }

// Pilihan kategori (nama KANONIK = Indonesia) untuk form Tambah Transaksi.
export const EXPENSE_CATEGORIES: CategoryOption[] = [
  { name: 'Tempat Tinggal / KPR', icon: 'home' },
  { name: 'Makanan & Minuman', icon: 'restaurant' },
  { name: 'Tagihan Listrik & Air', icon: 'bolt' },
  { name: 'Kesehatan & Obat', icon: 'medical_services' },
  { name: 'Transportasi & Bensin', icon: 'directions_car' },
  { name: 'Cicilan & Pelunasan Utang', icon: 'credit_card' },
  { name: 'Perawatan Diri', icon: 'spa' },
  { name: 'Pendidikan & Kursus', icon: 'school' },
  { name: 'Kebutuhan Anak', icon: 'child_care' },
  { name: 'Perabotan Rumah Tangga', icon: 'living' },
  { name: 'Hewan Peliharaan', icon: 'pets' },
  { name: 'Pakaian & Aksesoris', icon: 'checkroom' },
  { name: 'Premi Asuransi', icon: 'health_and_safety' },
  { name: 'Pengeluaran Kerja/Bisnis', icon: 'work' },
  { name: 'Hiburan & Hobi', icon: 'sports_esports' },
  { name: 'Kado & Donasi', icon: 'card_giftcard' },
  { name: 'Travel & Liburan', icon: 'flight' },
  { name: 'Layanan Berlangganan', icon: 'workspace_premium' },
  { name: 'Tagihan Bulanan', icon: 'receipt_long' },
];

export const INCOME_CATEGORIES: CategoryOption[] = [
  { name: 'Gaji Pokok', icon: 'work' },
  { name: 'Gaji Pasangan', icon: 'diversity_3' },
  { name: 'Pekerjaan Sampingan', icon: 'two_wheeler' },
  { name: 'Pendapatan Bisnis', icon: 'storefront' },
  { name: 'Dividen & Investasi', icon: 'pie_chart' },
  { name: 'Uang Sewa / Kost', icon: 'real_estate_agent' },
  { name: 'Komisi & Insentif', icon: 'percent' },
  { name: 'Bonus & THR', icon: 'star' },
  { name: 'Uang Pensiun', icon: 'elderly' },
  { name: 'Beasiswa & Hibah', icon: 'school' },
  { name: 'Warisan', icon: 'volunteer_activism' },
  { name: 'Undian & Hadiah', icon: 'casino' },
  { name: 'Pemberian / Angpao', icon: 'card_giftcard' },
  { name: 'Reimbursement Kerja', icon: 'currency_exchange' },
  { name: 'Pendapatan Lainnya', icon: 'payments' },
];
