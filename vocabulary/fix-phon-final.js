const fs = require('fs');
const f = 'C:/Users/27894/Desktop/HY/vocabulary/src/units-data.js';
let t = fs.readFileSync(f, 'utf8');
const m = t.match(/const BOOK3000 = (\[.*?\]);/s);
const units = JSON.parse(m[1]);
for (const u of units) for (const w of u.words) {
  if (w[0] === 'permanently') { console.log('permanently:', JSON.stringify(w[2]), '-> "pə:mənəntli"'); w[2] = "'pə:mənəntli"; }
  if (w[0] === 'psychiatric') { console.log('psychiatric:', JSON.stringify(w[2]), '-> "saiki\'ætrik"'); w[2] = "saiki'ætrik"; }
}
t = t.replace(m[0], 'const BOOK3000 = ' + JSON.stringify(units) + ';');
fs.writeFileSync(f, t, 'utf8');
console.log('done');
