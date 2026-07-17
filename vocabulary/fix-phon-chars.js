// BOOK3000 音标字符规范化: є/ε -> ɛ, ^ -> g, 清理 simultaneously
const fs = require('fs');
const f = 'C:/Users/27894/Desktop/HY/vocabulary/src/units-data.js';
let t = fs.readFileSync(f, 'utf8');
const m = t.match(/const BOOK3000 = (\[.*?\]);/s);
const units = JSON.parse(m[1]);
let ce = 0, cg = 0;
for (const u of units) for (const w of u.words) {
  if (!w[2]) continue;
  const before = w[2];
  w[2] = w[2].replace(/[єε]/g, 'ɛ').replace(/\^/g, 'g');
  if (w[0] === 'simultaneously') { w[2] = "siməl'teiniəsli"; console.log('simultaneously ->', w[2]); }
  if (before !== w[2]) { if (/[єε]/.test(before)) ce++; if (before.includes('^')) cg++; }
}
t = t.replace(m[0], 'const BOOK3000 = ' + JSON.stringify(units) + ';');
fs.writeFileSync(f, t, 'utf8');
console.log('є/ε->ɛ 修复词条:', ce, ' ^->g 修复词条:', cg);
