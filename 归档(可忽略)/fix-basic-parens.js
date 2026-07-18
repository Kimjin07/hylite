// BASIC_UNITS: 剥掉整词括号 '(psychology)' -> 'psychology'
const fs = require('fs');
const f = 'C:/Users/27894/Desktop/HY/vocabulary/src/books-extra.js';
let t = fs.readFileSync(f, 'utf8');
const m = t.match(/const BASIC_UNITS = (\[.*?\]);/s);
const units = JSON.parse(m[1]);
let n = 0;
for (const u of units) for (const w of u.words) {
  const pm = w[0].match(/^\(([^()]+)\)$/);
  if (pm) { w[0] = pm[1].trim(); n++; }
}
t = t.replace(m[0], 'const BASIC_UNITS = ' + JSON.stringify(units) + ';');
fs.writeFileSync(f, t, 'utf8');
console.log('剥括号:', n, '个');
