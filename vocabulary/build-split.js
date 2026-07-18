// 拆分构建：生成 deploy/vocabulary/index.html（不含词书数据）+ data/<id>.js（每本词书独立按需加载）
// 用法: node build-split.js
const fs = require('fs');
const path = require('path');

const ROOT = 'C:/Users/27894/Desktop/HY/vocabulary';
const OUT = 'C:/Users/27894/Desktop/HY/deploy/vocabulary';
const SRC = f => fs.readFileSync(path.join(ROOT, 'src', f), 'utf8');

// 词书 id -> 数据常量名（与 bc-core.js BOOKS/__reg 对应）
const BOOK_MAP = {
  b3000: 'BOOK3000', prep: 'PREP_UNITS', basic: 'BASIC_UNITS',
  core: 'CORE_UNITS', green: 'GREEN_UNITS', a2: 'A2_UNITS',
  oxford: 'OXFORD_UNITS', a1: 'A1_UNITS', b1: 'B1_UNITS', b1p: 'B1P_UNITS', b2: 'B2_UNITS',
  lis18: 'LIS18_UNITS', liscene: 'LISCENE_UNITS', sat: 'SAT_UNITS',
};

// 1) 从数据源文件提取每个常量的 JSON
const dataTxt = SRC('units-data.js') + '\n' + SRC('books-extra.js');
const consts = {};
for (const m of dataTxt.matchAll(/const\s+(\w+)\s*=\s*(\[[\s\S]*?\]);/g)) consts[m[1]] = m[2];

fs.mkdirSync(path.join(OUT, 'data'), { recursive: true });
const stats = {};
for (const [id, cname] of Object.entries(BOOK_MAP)) {
  if (!consts[cname]) { console.error('!! 缺少数据常量:', cname); process.exit(1); }
  const units = JSON.parse(consts[cname]);
  stats[id] = { units: units.length, words: units.reduce((s, u) => s + u.words.length, 0) };
  fs.writeFileSync(path.join(OUT, 'data', id + '.js'), `__reg('${id}', ${consts[cname]});\n`, 'utf8');
}

// 2) 组装应用壳 index.html：DATA 段只放 BOOK_STATS 清单
const shell = SRC('shell.html');
const html = shell
  .replace('{{CSS}}', SRC('bc.css'))
  .replace('{{BODY}}', SRC('bc-body.html'))
  .replace('{{DATA}}', 'const BOOK_STATS = ' + JSON.stringify(stats) + ';')
  .replace('{{JS}}', SRC('bc-core.js') + '\n' + SRC('bc-session.js') + '\n' + SRC('bc-sync.js') + '\n' + SRC('bc-views.js'));
fs.writeFileSync(path.join(OUT, 'index.html'), html, 'utf8');

const kb = n => Math.round(n / 1024) + ' KB';
console.log('OK -> deploy/vocabulary/index.html (' + kb(Buffer.byteLength(html)) + ')');
for (const id of Object.keys(BOOK_MAP)) {
  const sz = fs.statSync(path.join(OUT, 'data', id + '.js')).size;
  console.log(`  data/${id}.js  ${kb(sz)}  (${stats[id].units} 单元 ${stats[id].words} 词)`);
}
