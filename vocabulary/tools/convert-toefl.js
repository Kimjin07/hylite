// 托福词表转换器: 处理两种格式并写入 books-extra.js
//  A) tab格式  "word\t/ipa/\t释义"（无章节行，按每50词自动分单元）
//  B) 编号格式 "N. word  /ipa/  释义" + 【X、类名】单元N 标题（阅读800）
// 用法: node convert-toefl.js <txt路径> <常量名>
const fs = require('fs');
const [src, constName] = process.argv.slice(2);
const target = 'C:/Users/27894/Desktop/HY/vocabulary/src/books-extra.js';

const lines = fs.readFileSync(src, 'utf8').split(/\r?\n/);
const units = [];
let cur = null;
const unparsed = [];
let n = 0;
const CHUNK = 50; // tab格式自动分组大小

const pushWord = (word, gloss, phon) => {
  // 自动分单元（无显式章节时）
  if (!cur || (cur.auto && cur.words.length >= CHUNK)) {
    cur = { id: 'U' + units.length, name: '', words: [], auto: true };
    units.push(cur);
  }
  cur.words.push([word.replace(/\s+/g, ' ').trim(), gloss.trim(), phon.trim()]); n++;
};

for (const raw of lines) {
  const line = raw.trim();
  if (!line) continue;
  if (/^[=═─—-]+$/.test(line)) continue;                        // 分隔线
  let m;
  // 【一、自然科学类】单元1  (词 1-40, 共40词)  话题:... → "自然科学 1 · 词1-40"
  if ((m = line.match(/^【[一二三四五六七八九十]+、(.+?)类?】单元(\d+)\s*\(词\s*(\d+)-(\d+)/))) {
    cur = { id: 'U' + units.length, name: `${m[1]} ${m[2]} · 词${m[3]}-${m[4]}`, words: [] };
    units.push(cur);
    continue;
  }
  if (/^\d{4}托福/.test(line)) continue;                        // 文件首行大标题
  // 双音标词条: "64. compound  /ipa1/ n./adj. /ipa2/ v.  释义"（词性不同读音不同）
  if ((m = line.match(/^\d+\.\s*([A-Za-z][A-Za-z ()'\-]*?)\s*\/([^\/]+)\/\s*([a-z./]+)\s*\/([^\/]+)\/\s*([a-z./]+)\s+([一-鿿a-z].*[一-鿿].*)$/))) {
    pushWord(m[1], m[6], `${m[2].trim()}; (${m[5]}) ${m[4].trim()}`);
    continue;
  }
  // 编号词条: "1. evolve  /ipa/  释义"
  if ((m = line.match(/^\d+\.\s*([A-Za-z][A-Za-z ()'\/\-]*?)\s*\/([^\/]+)\/\s*(.+)$/))) {
    pushWord(m[1], m[3], m[2]);
    continue;
  }
  // tab词条: "word\t/ipa/\t释义"（也容错空格分隔）
  if ((m = line.match(/^([^一-鿿\d【][^一-鿿]*?)\s*\/([^\/]+)\/\s*(.+)$/)) && /[一-鿿]/.test(m[3])) {
    pushWord(m[1], m[3], m[2]);
    continue;
  }
  // 无音标词条: "word\t释义"
  if ((m = line.match(/^([A-Za-z][^一-鿿]*?)\s+([一-鿿…].+)$/))) {
    pushWord(m[1], m[2], '');
    continue;
  }
  unparsed.push(line);
}

// 自动分组的单元补名字: "1-50" 范围
let start = 1;
for (const u of units) {
  if (u.auto) { u.name = `词 ${start}-${start + u.words.length - 1}`; start += u.words.length; }
  delete u.auto;
}

console.log('单元数:', units.length, ' 总词数:', n);
units.forEach(u => console.log(`  ${u.id} ${u.name}: ${u.words.length} 词`));
if (unparsed.length) { console.log('!! 未解析 ' + unparsed.length + ' 条:'); unparsed.forEach(l => console.log('   ' + l)); }

let t = fs.readFileSync(target, 'utf8');
const re = new RegExp('const ' + constName + ' = \\[.*?\\];\\n?', 's');
if (re.test(t)) { t = t.replace(re, ''); console.log('(已替换旧 ' + constName + ')'); }
t = t.trimEnd() + '\nconst ' + constName + ' = ' + JSON.stringify(units) + ';\n';
fs.writeFileSync(target, t, 'utf8');
console.log(constName + ' 已写入 books-extra.js');
