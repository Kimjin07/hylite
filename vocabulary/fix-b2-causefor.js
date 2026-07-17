// 把 "cause for" 插入 B2 U9，位置在 aspiration 之后
const fs = require('fs');
const f = 'C:/Users/27894/Desktop/HY/vocabulary/src/books-extra.js';
let t = fs.readFileSync(f, 'utf8');
const m = t.match(/const B2_UNITS = (\[.*?\]);/s);
const units = JSON.parse(m[1]);
const u9 = units.find(u => u.name === 'Unit 9');
const idx = u9.words.findIndex(w => w[0] === 'aspiration');
if (u9.words.some(w => w[0] === 'cause for')) { console.log('已存在，跳过'); process.exit(0); }
u9.words.splice(idx + 1, 0, ['cause for', '…的原因', '']);
t = t.replace(m[0], 'const B2_UNITS = ' + JSON.stringify(units) + ';');
fs.writeFileSync(f, t, 'utf8');
console.log('已插入 cause for 到 U9 第', idx + 2, '位，U9 现有', u9.words.length, '词');
