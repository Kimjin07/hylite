// OXFORD_UNITS A2级: 在 any 之后补录 any more
const fs = require('fs');
const f = 'C:/Users/27894/Desktop/HY/vocabulary/src/books-extra.js';
let t = fs.readFileSync(f, 'utf8');
const m = t.match(/const OXFORD_UNITS = (\[.*?\]);/s);
const units = JSON.parse(m[1]);
const u = units.find(x => x.name.startsWith('A2'));
if (u.words.some(w => w[0] === 'any more')) { console.log('已存在'); process.exit(0); }
const idx = u.words.findIndex(w => w[0] === 'any');
u.words.splice(idx + 1, 0, ['any more', 'adv. (不)再', '']);
t = t.replace(m[0], 'const OXFORD_UNITS = ' + JSON.stringify(units) + ';');
fs.writeFileSync(f, t, 'utf8');
console.log('已插入 any more，A2级现', u.words.length, '词');
