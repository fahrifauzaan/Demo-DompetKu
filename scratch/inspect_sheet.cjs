const fs = require('fs');
const path = require('path');

const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'sheet_data.json'), 'utf8'));

console.log("SHEET TAB NAMES:", Object.keys(data.data));

const fixedIncome = data.data['Fixed Income Investment'] || [];
console.log("\nFIXED INCOME ASSETS (FIRST 5):");
fixedIncome.slice(0, 5).forEach(a => {
  console.log({
    id: a.id || a.ID,
    Seri: a.Seri || a['Bond Type'] || a['Product Name'] || a['Bank'],
    Principal: a.Principal,
    IssueDate: a['Issue Date'] || a['purchaseDate'],
    MaturityDate: a['Maturity Date'],
    AccruedInterest: a['Accrued Interest'],
    PeriodPassed: a['Period Passed']
  });
});

const assets = data.data['Assets'] || [];
console.log("\nASSETS (FIRST 5):");
assets.slice(0, 5).forEach(a => {
  console.log({
    id: a.id || a.ID,
    Title: a.Title || a.title || a['Asset Name'],
    Category: a.Category || a.category,
    PurchasePrice: a.PurchasePrice || a.purchasePrice,
    PurchaseDate: a.PurchaseDate || a.purchaseDate,
  });
});

const saham = data.data['Saham'] || [];
console.log("\nSAHAM ASSETS (FIRST 5):");
saham.slice(0, 5).forEach(a => {
  console.log({
    id: a.id || a.ID,
    Title: a.Title || a.title,
    Ticker: a.Ticker || a.ticker,
    Shares: a.Shares || a.shares,
    AvgCost: a.AvgCost || a.avgCost,
    CurrentPrice: a.CurrentPrice || a.currentPrice,
    PurchaseDate: a.PurchaseDate || a.purchaseDate,
  });
});
