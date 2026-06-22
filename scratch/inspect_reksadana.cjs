const fs = require('fs');
const path = require('path');

const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'sheet_data.json'), 'utf8'));

const reksadana = data.data['Reksadana'] || [];
console.log("\nREKSADANA ASSETS (FIRST 5):");
reksadana.forEach(a => {
  console.log(a);
});
