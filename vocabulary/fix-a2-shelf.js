const fs = require('fs');
const f = 'C:/Users/27894/Desktop/HY/vocabulary/src/books-extra.js';
let t = fs.readFileSync(f, 'utf8');
const bad = JSON.stringify(['shelf (复数：shelves)', '架子，搁板', 'ʃelf']);
const good = JSON.stringify(['shelf', '架子，搁板（复数 shelves）', 'ʃelf']);
const had = t.includes(bad);
t = t.split(bad).join(good);
fs.writeFileSync(f, t, 'utf8');
console.log('shelf fixed:', had);
