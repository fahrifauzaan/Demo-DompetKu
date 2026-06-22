const fs = require('fs');
const path = require('path');

const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'sheet_data.json'), 'utf8'));

const settings = data.data['Settings'] || [];
console.log("SETTINGS:");
settings.forEach(s => {
  console.log(`${s.Key || s.key}: ${s.Value || s.value}`);
});
