// 把 "look at" 插入 A2 U4 (Unit 5), 位置在 though 之后
const fs = require('fs');
const f = 'C:/Users/27894/Desktop/HY/vocabulary/src/books-extra.js';
let t = fs.readFileSync(f, 'utf8');
const m = t.match(/const A2_UNITS = (\[.*?\]);/s);
const units = JSON.parse(m[1]);
const u = units.find(x => x.name.startsWith('Unit 5'));
if (u.words.some(w => w[0] === 'look at')) { console.log('已存在，跳过'); process.exit(0); }
const idx = u.words.findIndex(w => w[0] === 'though');
u.words.splice(idx + 1, 0, ['look at', '看', '']);
t = t.replace(m[0], 'const A2_UNITS = ' + JSON.stringify(units) + ';');
fs.writeFileSync(f, t, 'utf8');
console.log('已插入 look at 到', u.name, ', 现有', u.words.length, '词');
