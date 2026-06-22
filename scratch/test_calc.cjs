const fs = require('fs');
const path = require('path');

const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'sheet_data.json'), 'utf8'));

// Mappings from useFinanceStore.ts
const parseNumber = (val) => {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') return val;
  return Number(String(val).replace(/[^0-9.-]/g, '')) || 0;
};

const formatDateString = (dateVal) => {
  if (!dateVal) return '';
  let str = String(dateVal).trim();
  if (str.includes('T')) {
    const part = str.split('T')[0];
    if (/^\d{4}-\d{2}-\d{2}$/.test(part)) return part;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  try {
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  } catch (e) {}
  return str;
};

const getVal = (obj, keys) => {
  if (!obj) return undefined;
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== '') return obj[k];
  }
  const cleanKeys = keys.map(k => k.toLowerCase().replace(/[^a-z0-9]/g, ''));
  for (const key of Object.keys(obj)) {
    const cleanKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (cleanKeys.includes(cleanKey)) return obj[key];
  }
  return undefined;
};

const parsedAssets = [];

// Fixed Income
const fixedIncomeData = data.data['Fixed Income Investment'] || [];
parsedAssets.push(...fixedIncomeData
  .filter((a) => {
    const idVal = String(a.id || a.ID || '').trim().toLowerCase();
    return idVal && idVal !== 'id' && idVal !== 'deposit type' && idVal !== 'product name' && idVal !== 'bond type';
  })
  .map((a) => {
    const id = String(a.id || a.ID || '');
    const title = String(a.title || getVal(a, ['title', 'Title', 'seri', 'Seri', 'Bond Type', 'bondType', 'Product Name', 'productName', 'Bank']) || 'Aset Pendapatan Tetap');
    let interestRate = a.interestRate !== undefined && a.interestRate !== '' ? Number(a.interestRate) : undefined;
    if (interestRate === undefined || isNaN(interestRate)) {
      const rawRate = getVal(a, ['Interest Rate (%)', 'interestRate', 'Coupon Type']);
      if (rawRate !== undefined && rawRate !== '') {
        interestRate = Number(String(rawRate).replace('%', '').trim());
      }
    }
    if (interestRate !== undefined && interestRate > 0 && interestRate < 1) {
      interestRate = interestRate * 100;
    }
    return {
      id,
      title,
      purchasePrice: parseNumber(a.purchasePrice !== undefined && a.purchasePrice !== '' ? a.purchasePrice : getVal(a, ['Principal', 'purchasePrice'])),
      currentValue: parseNumber(a.currentValue !== undefined && a.currentValue !== '' ? a.currentValue : getVal(a, ['Principal', 'purchasePrice'])),
      equity: parseNumber(a.equity) || 100,
      purchaseDate: a.purchaseDate ? formatDateString(a.purchaseDate) : (getVal(a, ['Issue Date', 'purchaseDate']) ? formatDateString(getVal(a, ['Issue Date', 'purchaseDate'])) : undefined),
      interestRate: interestRate || 6.4,
      ticker: a.ticker !== undefined && a.ticker !== '' ? String(a.ticker) : String(getVal(a, ['Seri', 'Ticker', 'ticker']) || ''),
      subType: a.subType !== undefined && a.subType !== '' ? String(a.subType) : 'sbn',
      maturityDate: a.maturityDate !== undefined && a.maturityDate !== '' ? String(a.maturityDate) : (getVal(a, ['Maturity Date']) ? String(getVal(a, ['Maturity Date'])) : undefined),
      category: 'investasi'
    };
  })
);

// AssetsNonLiquid
const assetsNonLiquid = data.data['AssetsNonLiquid'] || [];
parsedAssets.push(...assetsNonLiquid.map((a) => {
  const purchasePrice = parseNumber(a.purchasePrice);
  const purchaseDate = formatDateString(a.purchaseDate || new Date().toISOString());
  let currentValue = a.currentValue !== undefined && a.currentValue !== '' ? parseNumber(a.currentValue) : purchasePrice;
  return {
    ...a,
    id: a.id || a.ID || 'nonliquid',
    title: a.title || getVal(a, ['title', 'Title', 'Asset Name', 'name']),
    purchasePrice,
    currentValue,
    purchaseDate,
    category: a.category || 'real-estat'
  };
}));

// Saham
const sahamData = data.data['Saham'] || [];
parsedAssets.push(...sahamData.map((a) => {
  const id = String(getVal(a, ['id', 'ID']) || 'saham');
  const shares = parseNumber(getVal(a, ['shares', 'Shares']));
  const avgCost = parseNumber(getVal(a, ['avgCost', 'Avg. Cost', 'avg_cost']));
  const currentPrice = parseNumber(getVal(a, ['currentPrice', 'Current Price', 'current_price']));
  return {
    id,
    title: String(getVal(a, ['title', 'Title']) || 'Saham'),
    ticker: String(getVal(a, ['ticker', 'Ticker']) || ''),
    category: 'investasi',
    subType: 'saham',
    shares,
    avgCost,
    currentPrice,
    currentValue: shares * currentPrice,
    purchasePrice: shares * avgCost,
    purchaseDate: formatDateString(getVal(a, ['purchaseDate', 'Purchase Date', 'date']) || ''),
  };
}));

console.log("ALL PARSED INVESTASI ASSETS:");
parsedAssets.filter(a => a.category === 'investasi').forEach(a => {
  console.log({
    id: a.id,
    title: a.title,
    subType: a.subType,
    purchasePrice: a.purchasePrice,
    currentValue: a.currentValue,
    purchaseDate: a.purchaseDate,
    maturityDate: a.maturityDate,
    interestRate: a.interestRate
  });
});
