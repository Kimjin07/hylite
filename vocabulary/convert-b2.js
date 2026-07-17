// 把 B2单词表.txt 转成 B2_UNITS 并追加到 books-extra.js
const fs = require('fs');
const src = 'C:/Users/27894/Desktop/HY/B2单词表.txt';
const target = 'C:/Users/27894/Desktop/HY/vocabulary/src/books-extra.js';

const lines = fs.readFileSync(src, 'utf8').split(/\r?\n/);
const units = [];
let cur = null;
const unparsed = [];
let n = 0;

for (const raw of lines) {
  const line = raw.trim();
  if (!line) continue;
  // 章节标题：无中文的短行 (WELCOME / Unit N)
  if (!/[一-鿿]/.test(line)) {
    const name = line === 'WELCOME' ? 'Welcome' : line;
    cur = { id: 'U' + units.length, name, words: [] };
    units.push(cur);
    continue;
  }
  if (!cur) { unparsed.push('无章节: ' + line); continue; }
  let m;
  if ((m = line.match(/^(.+?)\s*\/([^\/]+)\/\s*(.+)$/))) {
    cur.words.push([m[1].trim(), m[3].trim(), m[2].trim()]); n++;
  } else if ((m = line.match(/^([A-Za-z][A-Za-z0-9 '()\-\.]*?)\s+([一-鿿].+)$/))) {
    cur.words.push([m[1].trim(), m[2].trim(), '']); n++;
  } else {
    unparsed.push(line);
  }
}

console.log('单元数:', units.length);
units.forEach(u => console.log(`  ${u.id} ${u.name}: ${u.words.length} 词`));
console.log('总词数:', n);
if (unparsed.length) { console.log('!! 未解析行 ' + unparsed.length + ' 条:'); unparsed.forEach(l => console.log('   ' + l)); }

let t = fs.readFileSync(target, 'utf8');
if (t.includes('const B2_UNITS')) {
  t = t.replace(/const B2_UNITS = \[.*?\];\n?/s, '');
  console.log('(已替换旧 B2_UNITS)');
}
t = t.trimEnd() + '\nconst B2_UNITS = ' + JSON.stringify(units) + ';\n';
fs.writeFileSync(target, t, 'utf8');
console.log('B2_UNITS 已写入 books-extra.js');
