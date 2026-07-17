// 通用词表转换器: node convert-book.js <txt路径> <常量名>
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
  if (!/[一-鿿]/.test(line)) {  // 无中文 => 章节标题
    const name = line === 'WELCOME' ? 'Welcome' : line;
    cur = { id: 'U' + units.length, name, words: [] };
    units.push(cur);
    continue;
  }
  if (!cur) { unparsed.push('(无章节,跳过) ' + line); continue; }
  let m;
  // 释义末尾的词性标签挪到开头 (热闹的 adj. -> adj. 热闹的)；多词性的复合释义不动
  const POS = /(?:adj|adv|n|v|vt|vi|prep|conj|pron|num|int|art|phr|phrase)/.source;
  const posFix = g => {
    const pm = g.match(new RegExp('^(.+?)\\s+((?:' + POS + ')\\.?)\\s*$', 'i'));
    if (!pm) return g;
    if (new RegExp('(?:' + POS + ')\\.', 'i').test(pm[1])) return g; // 释义中已有词性(复合条目)
    return pm[2].replace(/\.?$/, '.') + ' ' + pm[1].trim();
  };
  const normWord = w => w.replace(/[‘’]/g, "'").replace(/（/g, ' (').replace(/）/g, ')').replace(/\s+/g, ' ').trim();
  const IPA = /[ːˈˌəɪʊɒʌɔɜæθðʃʒŋ]/;
  // 词条入库（自动拆分释义里嵌的第二个词条，如 "潮汐的 adj./tide /taɪd/ 潮汐 n."）
  const push = (word, gloss, phon) => {
    const em = gloss.match(/^(.+?)\/([A-Za-z][A-Za-z ()'\-]*)\s*\/([^\/]+)\/\s*(.+)$/);
    if (em && /[一-鿿]/.test(em[1]) && /[一-鿿]/.test(em[4])) {
      cur.words.push([normWord(word), posFix(em[1].trim()), phon]); n++;
      cur.words.push([normWord(em[2]), posFix(em[4].trim()), em[3].trim()]); n++;
      console.log(`  (拆分行内双词条: ${word} + ${em[2].trim()})`);
    } else {
      cur.words.push([normWord(word), posFix(gloss), phon]); n++;
    }
  };
  if ((m = line.match(/^([^一-鿿]+?)\s*\/([^\/]+)\/\s*(.+)$/)) && !/[一-鿿]/.test(m[2])) {
    // 若音标组不含 IPA 特征字符(可能误切了 word 里的斜杠)，改用"必须含IPA字符"的严格匹配
    if (!IPA.test(m[2])) {
      const m2 = line.match(/^([^一-鿿]+?)\s*\/([^\/]*[ːˈˌəɪʊɒʌɔɜæθðʃʒŋ][^\/]*)\/\s*(.+)$/);
      if (m2) m = m2;
    }
    push(m[1], m[3].trim(), m[2].trim());
  } else if ((m = line.match(/^([A-Za-z][^一-鿿]*?)\s+([一-鿿…].+)$/))) {
    push(m[1], m[2].trim(), '');
  } else {
    unparsed.push(line);
  }
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
