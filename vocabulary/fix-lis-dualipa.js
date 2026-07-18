// LIS18/LISCENE: 释义开头残留的第二段 [音标] 归并进音标栏
const fs = require('fs');
const f = 'C:/Users/27894/Desktop/HY/vocabulary/src/books-extra.js';
let t = fs.readFileSync(f, 'utf8');
let fixed = 0;
for (const cname of ['LIS18_UNITS', 'LISCENE_UNITS']) {
  const m = t.match(new RegExp('const ' + cname + ' = (\\[.*?\\]);', 's'));
  if (!m) continue;
  const units = JSON.parse(m[1]);
  for (const u of units) for (const w of u.words) {
    let gm;
    while ((gm = w[1].match(/^\s*\[([^\]]+)\]\s*(.+)$/))) {
      w[2] = (w[2] ? w[2] + ' ' : '') + gm[1].trim();
      w[1] = gm[2].trim();
      fixed++;
      console.log(`${cname}: '${w[0]}' 音标归位 -> phon='${w[2]}' gloss='${w[1]}'`);
    }
  }
  t = t.replace(m[0], 'const ' + cname + ' = ' + JSON.stringify(units) + ';');
}
fs.writeFileSync(f, t, 'utf8');
console.log('共归位', fixed, '处');
