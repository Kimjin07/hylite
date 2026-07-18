// OXFORD_UNITS: 在 any 之后补录 any more（适配任意单元结构）
const fs = require('fs');
const f = 'C:/Users/27894/Desktop/HY/vocabulary/src/books-extra.js';
let t = fs.readFileSync(f, 'utf8');
const m = t.match(/const OXFORD_UNITS = (\[.*?\]);/s);
const units = JSON.parse(m[1]);
let done = false;
for (const u of units){
  const i = u.words.findIndex(w => w[0] === 'any');
  if (i >= 0){
    if (u.words.some(w => w[0] === 'any more')){ console.log('已存在'); done = true; break; }
    u.words.splice(i + 1, 0, ['any more', 'adv. (不)再', '']);
    console.log('插入到', u.name, '现', u.words.length, '词');
    done = true; break;
  }
}
if (!done) console.log('未找到锚点');
t = t.replace(m[0], 'const OXFORD_UNITS = ' + JSON.stringify(units) + ';');
fs.writeFileSync(f, t, 'utf8');
