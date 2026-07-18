// 补录 基础词汇 的 8 条未解析词条（按源文件位置插入）
const fs = require('fs');
const f = 'C:/Users/27894/Desktop/HY/vocabulary/src/books-extra.js';
let t = fs.readFileSync(f, 'utf8');
const m = t.match(/const BASIC_UNITS = (\[.*?\]);/s);
const units = JSON.parse(m[1]);

// [unit名, 锚点词(插在其后), 新词条...]
const plan = [
  ['UNIT 1', 'percent', [['percentage of', '……的百分比', '']]],
  ['UNIT 2', 'account', [['account for', '解释，占据', ''], ['take account of', '考虑', '']]],
  ['UNIT 5', 'routinely', [['daily routine', '日常生活', '']]],
  ['UNIT 7', 'brochure', [
    ['first name', '名', ''],
    ['given name / forename', '名', ''],
    ['last name', '姓', ''],
    ['family name / surname', '姓', ''],
  ]],
];

for (const [uname, anchor, entries] of plan) {
  const u = units.find(x => x.name === uname);
  let idx = u.words.findIndex(w => w[0] === anchor);
  if (idx < 0) { console.log('!! 锚点未找到:', uname, anchor); continue; }
  for (const e of entries) {
    if (u.words.some(w => w[0] === e[0])) { console.log('跳过(已存在):', e[0]); continue; }
    u.words.splice(++idx, 0, e);
    console.log(`${uname}: 插入 '${e[0]}' = '${e[1]}'`);
  }
}
t = t.replace(m[0], 'const BASIC_UNITS = ' + JSON.stringify(units) + ';');
fs.writeFileSync(f, t, 'utf8');
console.log('完成，UNIT词数:', units.map(u => u.words.length).join(','));
