// 听力词表转换器: 处理 "word [ipa] 释义" 方括号格式 + 分隔线 + 含中文的章节标题
// 用法: node convert-listen.js <txt路径> <常量名>
const fs = require('fs');
const [src, constName] = process.argv.slice(2);
const target = 'C:/Users/27894/Desktop/HY/vocabulary/src/books-extra.js';

const lines = fs.readFileSync(src, 'utf8').split(/\r?\n/);
const units = [];
let cur = null;
const unparsed = [];
let n = 0;

for (const raw of lines) {
  const line = raw.trim();
  if (!line) continue;
  if (/^[=═─—-]+$/.test(line)) continue;                       // 分隔线
  // 章节标题: "Day N" / "N. 中文场景名" / "A1 级（入门） 共 900 词"(CEFR等级)
  if (/^Day\s*\d+$/i.test(line) || (/^\d+\.\s*\S+/.test(line) && !line.includes('[')) || /^[A-C][12]\s*级/.test(line)) {
    const name = line.replace(/\s*共\s*\d+\s*词\s*$/, '').trim();
    cur = { id: 'U' + units.length, name, words: [] };
    units.push(cur);
    continue;
  }
  if (!cur) { unparsed.push('(无章节,跳过) ' + line); continue; }
  let m;
  if ((m = line.match(/^(.+?)\s*\[([^\]]+)\]\s*(.+)$/))) {
    cur.words.push([m[1].trim(), m[3].trim(), m[2].trim()]); n++;
  } else if ((m = line.match(/^([A-Za-z][^一-鿿\[]*?)\s+([一-鿿].+)$/))) {
    cur.words.push([m[1].trim(), m[2].trim(), '']); n++;
  } else {
    unparsed.push(line);
  }
}

console.log('单元数:', units.length, ' 总词数:', n);
units.forEach(u => console.log(`  ${u.id} ${u.name}: ${u.words.length} 词`));
if (unparsed.length) { console.log('!! 未解析 ' + unparsed.length + ' 条:'); unparsed.slice(0, 15).forEach(l => console.log('   ' + l)); }

let t = fs.readFileSync(target, 'utf8');
const re = new RegExp('const ' + constName + ' = \\[.*?\\];\\n?', 's');
if (re.test(t)) { t = t.replace(re, ''); console.log('(已替换旧 ' + constName + ')'); }
t = t.trimEnd() + '\nconst ' + constName + ' = ' + JSON.stringify(units) + ';\n';
fs.writeFileSync(target, t, 'utf8');
console.log(constName + ' 已写入 books-extra.js');
