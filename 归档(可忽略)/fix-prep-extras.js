// 补录 预备词汇 的 2 条未解析词条
const fs = require('fs');
const f = 'C:/Users/27894/Desktop/HY/vocabulary/src/books-extra.js';
let t = fs.readFileSync(f, 'utf8');
const m = t.match(/const PREP_UNITS = (\[.*?\]);/s);
const units = JSON.parse(m[1]);
const u3 = units.find(x => x.name === 'Unit 3');
const plan = [
  ['tyre', ['have got', '有', '']],
  ['considerably=significantly=dramatically', ['(reach a) peak at', '到达顶点', '']],
];
for (const [anchor, entry] of plan) {
  const idx = u3.words.findIndex(w => w[0] === anchor);
  if (idx < 0) { console.log('!! 锚点未找到:', anchor); continue; }
  if (u3.words.some(w => w[0] === entry[0])) { console.log('已存在:', entry[0]); continue; }
  u3.words.splice(idx + 1, 0, entry);
  console.log('插入:', entry[0]);
}
t = t.replace(m[0], 'const PREP_UNITS = ' + JSON.stringify(units) + ';');
fs.writeFileSync(f, t, 'utf8');
console.log('Unit 3 词数:', u3.words.length);
