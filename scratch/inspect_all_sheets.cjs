const fs = require('fs');
const path = require('path');

const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'sheet_data.json'), 'utf8'));

console.log("LENGTH OF EACH SHEET:");
Object.keys(data.data).forEach(k => {
  console.log(`${k}: ${data.data[k].length} rows`);
});

const assetsNonLiquid = data.data['AssetsNonLiquid'] || [];
console.log("\nRAW ASSETS NON LIQUID (FIRST 5):");
console.log(assetsNonLiquid.slice(0, 5));
