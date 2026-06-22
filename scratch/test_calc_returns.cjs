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

// Reksadana
const reksadanaData = data.data['Reksadana'] || [];
parsedAssets.push(...reksadanaData.map((a) => {
  const id = String(getVal(a, ['id', 'ID']) || 'reksadana');
  const title = String(getVal(a, ['title', 'Title']) || '');
  const ticker = String(getVal(a, ['ticker', 'Ticker']) || '');
  const shares = parseNumber(getVal(a, ['units', 'Units', 'shares', 'Shares']));
  const avgCost = parseNumber(getVal(a, ['navPerUnit', 'nav_per_unit', 'avgCost', 'Avg. Cost']));
  const rawCurrentNav = parseNumber(getVal(a, ['currentNav', 'Current_NAV', 'current_nav', 'currentPrice', 'Current Price']));
  const purchaseDate = formatDateString(getVal(a, ['purchaseDate', 'Purchase Date', 'date']) || '');
  const location = String(getVal(a, ['location', 'Location']) || '');
  const icon = String(getVal(a, ['icon', 'Icon']) || 'account_balance');
  const notes = String(getVal(a, ['notes', 'Notes']) || '');

  const isTotalValue = rawCurrentNav > 100000 && rawCurrentNav > avgCost * 2;
  const currentValue = isTotalValue ? rawCurrentNav : (shares * rawCurrentNav);
  const currentPrice = isTotalValue ? (shares > 0 ? rawCurrentNav / shares : 0) : rawCurrentNav;
  const purchasePrice = shares * avgCost;

  return {
    id,
    title,
    ticker,
    category: 'investasi',
    subType: 'reksadana',
    shares,
    avgCost,
    currentPrice,
    currentNav: currentPrice,
    currentValue,
    purchasePrice,
    purchaseDate,
    location,
    icon,
    notes,
    equity: 100
  };
}));

// Now replicate FinancePerformanceReport logic
const selectedPeriod = 'ytd';

const getPeriodStartAndEnd = (period) => {
  const now = new Date();
  const curYear = now.getFullYear();
  const curMonth = now.getMonth();
  let start;
  let end = now;
  if (period === 'this_month') {
    start = new Date(curYear, curMonth, 1);
  } else if (period === '3_months') {
    start = new Date(curYear, curMonth - 2, 1);
  } else if (period === '12_months') {
    start = new Date(curYear, curMonth - 11, 1);
  } else if (period === 'ytd') {
    start = new Date(curYear, 0, 1);
  } else if (period.includes('-')) {
    const parts = period.split('-');
    const year = parseInt(parts[0]);
    const month = parseInt(parts[1]) - 1;
    start = new Date(year, month, 1);
    end = new Date(year, month + 1, 0, 23, 59, 59, 999);
  } else {
    start = new Date(curYear, curMonth, 1);
  }
  return { start, end };
};

const getPeriodMonthsBetween = (startDateStr, maturityDateStr, totalTenorMonths, periodStart, periodEnd) => {
  if (!startDateStr) return 0;
  try {
    const earnStart = new Date(startDateStr);
    let earnEnd = new Date();
    if (maturityDateStr) {
      const maturity = new Date(maturityDateStr);
      if (maturity < earnEnd) {
        earnEnd = maturity;
      }
    }
    const overlapStart = earnStart > periodStart ? earnStart : periodStart;
    const overlapEnd = earnEnd < periodEnd ? earnEnd : periodEnd;
    if (overlapStart >= overlapEnd) return 0;
    const dayDiff = (overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60 * 24);
    const months = dayDiff / 30.44;
    return Math.max(0, Math.min(totalTenorMonths, parseFloat(months.toFixed(2))));
  } catch (e) {
    return 0;
  }
};

const { start: periodStart, end: periodEnd } = getPeriodStartAndEnd(selectedPeriod);

const portfolioItems = parsedAssets
  .filter(a => a.category === 'investasi' && (a.purchasePrice > 0 || a.currentValue > 0))
  .map(a => {
    const titleLower = (a.title || '').toLowerCase();
    let subType = a.subType || '';
    if (!subType) {
      if (titleLower.includes('st012') || titleLower.includes('sbn') || titleLower.includes('sukuk') || titleLower.includes('obligasi') || titleLower.includes('ori') || titleLower.includes('deposito') || titleLower.includes('p2p')) {
        subType = 'sbn';
      } else if (titleLower.includes('reksadana') || titleLower.includes('mutual fund') || titleLower.includes('kolektif') || titleLower.includes('schroder') || titleLower.includes('indeks')) {
        subType = 'reksadana';
      } else {
        subType = 'saham';
      }
    }
    return {
      ...a,
      ticker: a.ticker || a.title.split(' ')[0] || 'ASSET',
      shares: a.shares || 1,
      avgCost: a.avgCost || a.purchasePrice || a.currentValue,
      subType
    };
  });

const portfolioItemsWithLive = portfolioItems.map(item => {
  const ticker = item.ticker || '';
  const initial = item.purchasePrice || item.currentValue;
  const isFixedIncome = item.subType === 'sbn' || item.subType === 'deposito' || item.subType === 'p2p' || (item.title || '').includes('ST012');
  
  let marketValue = item.currentValue;
  if (isFixedIncome && marketValue === 0 && initial > 0) {
    marketValue = initial;
  }

  let pl = marketValue - initial;
  let percentChange = initial > 0 ? (pl / initial) * 100 : 0;
  let couponsReceived = 0;

  if (isFixedIncome && initial > 0) {
    const principal = initial;
    const couponRate = item.interestRate || (item.subType === 'deposito' ? 4.5 : item.subType === 'p2p' ? 12.0 : 6.4);
    const taxRate = item.tax !== undefined ? item.tax : (item.subType === 'deposito' ? 0.20 : item.subType === 'p2p' ? 0.15 : 0.10);
    const yearlyGross = principal * (couponRate / 100);
    const yearlyNet = yearlyGross * (1 - taxRate);
    const monthlyNet = Math.round(yearlyNet / 12);
    const totalTenorMonths = item.tenor !== undefined ? (item.subType === 'sbn' ? item.tenor * 12 : item.tenor) : (item.subType === 'sbn' ? 24 : 12);
    
    const elapsedMonths = getPeriodMonthsBetween(item.purchaseDate, item.maturityDate, totalTenorMonths, periodStart, periodEnd);
    couponsReceived = Math.round(monthlyNet * elapsedMonths);
    
    pl = (marketValue - initial) + couponsReceived;
    percentChange = (pl / initial) * 100;
  }

  return {
    ...item,
    ticker,
    initial,
    marketValue,
    pl,
    percentChange,
    isFixedIncome,
    couponsReceived
  };
});

const sectorAssets = { saham: [], reksadana: [], sbn: [] };
portfolioItemsWithLive.forEach(item => {
  const subType = item.subType || 'saham';
  if (subType === 'saham') {
    sectorAssets.saham.push(item);
  } else if (subType === 'reksadana') {
    sectorAssets.reksadana.push(item);
  } else {
    sectorAssets.sbn.push(item);
  }
});

const sectorPerformance = ['saham', 'reksadana', 'sbn'].reduce((acc, sectorKey) => {
  const items = sectorAssets[sectorKey] || [];
  let totalInitial = 0;
  let totalMarketValue = 0;
  let totalPL = 0;
  items.forEach(item => {
    totalInitial += item.initial;
    totalMarketValue += item.marketValue;
    totalPL += item.pl;
  });
  acc[sectorKey] = { totalInitial, totalMarketValue, pl: totalPL, percentChange: totalInitial > 0 ? (totalPL / totalInitial) * 100 : 0 };
  return acc;
}, {});

const totalMarketValueAll = Object.values(sectorPerformance).reduce((sum, item) => sum + item.totalMarketValue, 0);
const totalInitialAll = Object.values(sectorPerformance).reduce((sum, item) => sum + item.totalInitial, 0);
const totalPLAll = Object.values(sectorPerformance).reduce((sum, item) => sum + item.pl, 0);
const portfolioReturnAll = totalInitialAll > 0 ? (totalPLAll / totalInitialAll) * 100 : 0;

console.log("\nDETAILED CALCULATION RESULTS:");
console.log({
  totalInitialAll,
  totalMarketValueAll,
  totalPLAll,
  portfolioReturnAll
});
portfolioItemsWithLive.forEach(item => {
  console.log({
    title: item.title,
    initial: item.initial,
    marketValue: item.marketValue,
    couponsReceived: item.couponsReceived,
    pl: item.pl,
    percentChange: item.percentChange
  });
});

// Risk Metrics
const getRiskMetrics = () => {
  const pReturns = [];
  const bReturns = [];
  
  // Replicate chartData YTD
  const now = new Date();
  const currentMonthIndex = now.getMonth();
  const length = Math.max(2, currentMonthIndex + 1);
  const chartData = [];
  const ytdReturn = 6.25497 > 0 ? ((6254.97 - 9174.47) / 9174.47) * 100 : 6.2;
  const ihsgReturn = ytdReturn;
  
  for (let idx = 0; idx < length; idx++) {
    const d = new Date(now.getFullYear(), idx, 1);
    const monthName = d.toLocaleDateString('id-ID', { month: 'short' });
    const factor = idx / (length - 1);
    const baseVal = BASE_CHART_TREND[idx % 12];
    chartData.push({
      month: monthName,
      portfolio: portfolioReturnAll * factor * ((baseVal?.portfolio || 10) / 32 || 1),
      ihsg: ihsgReturn * factor * ((baseVal?.ihsg || 2) / 6 || 1),
    });
  }

  for (let i = 1; i < chartData.length; i++) {
    pReturns.push(chartData[i].portfolio - chartData[i-1].portfolio);
    bReturns.push(chartData[i].ihsg - chartData[i-1].ihsg);
  }
  
  if (pReturns.length === 0) {
    return { stdDev: 11.8, beta: 1.08, sharpe: 2.28, jensenAlpha: 33.10, treynor: 30.65 };
  }
  
  const pMean = pReturns.reduce((s, r) => s + r, 0) / pReturns.length;
  const bMean = bReturns.reduce((s, r) => s + r, 0) / bReturns.length;
  
  const pVar = pReturns.reduce((s, r) => s + Math.pow(r - pMean, 2), 0) / (pReturns.length - 1 || 1);
  const stdDev = Math.sqrt(pVar) * Math.sqrt(12);
  
  let cov = 0;
  for (let i = 0; i < pReturns.length; i++) {
    cov += (pReturns[i] - pMean) * (bReturns[i] - bMean);
  }
  cov = cov / (pReturns.length - 1 || 1);
  
  const bVar = bReturns.reduce((s, r) => s + Math.pow(r - bMean, 2), 0) / (bReturns.length - 1 || 1);
  let beta = bVar > 0.0001 ? cov / bVar : 1.0;
  
  const riskFreeRate = 5.5;
  const sharpe = stdDev > 0.1 ? (portfolioReturnAll - riskFreeRate) / stdDev : 0;
  const jensenAlpha = portfolioReturnAll - (riskFreeRate + beta * (ihsgReturn - riskFreeRate));
  const treynor = beta > 0.01 ? (portfolioReturnAll - riskFreeRate) / beta : 0;
  
  return {
    stdDev: Math.max(2.0, Math.min(30.0, stdDev)),
    beta: Math.max(0.2, Math.min(2.5, beta)),
    sharpe: Math.max(-10.0, Math.min(10.0, sharpe)),
    jensenAlpha,
    treynor
  };
};

const BASE_CHART_TREND = [
  { month: 'Jan', portfolio: 0, ihsg: 0 },
  { month: 'Feb', portfolio: 5, ihsg: 2 },
  { month: 'Mar', portfolio: 10, ihsg: -2 },
  { month: 'Apr', portfolio: 8, ihsg: 1 },
  { month: 'Mei', portfolio: 15, ihsg: 3 },
  { month: 'Jun', portfolio: 20, ihsg: 5 },
  { month: 'Jul', portfolio: 18, ihsg: 4 },
  { month: 'Ags', portfolio: 22, ihsg: 6 },
  { month: 'Sep', portfolio: 25, ihsg: 5 },
  { month: 'Okt', portfolio: 22, ihsg: 4 },
  { month: 'Nov', portfolio: 28, ihsg: 5 },
  { month: 'Des', portfolio: 32, ihsg: 6 },
];

console.log("\nRISK METRICS FOR SIMULATED PORTFOLIO:");
console.log(getRiskMetrics());

