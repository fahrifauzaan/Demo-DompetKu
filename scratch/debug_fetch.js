const fs = require('fs');
const path = 'src/store/useFinanceStore.ts';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  /const data = await res\.json\(\);/,
  `const data = await res.json();\n          console.log('[FinanceStore] Fetched Promos:', data);`
);

fs.writeFileSync(path, content);
console.log('Added console.log');
