// 修复乱码专项扫描发现的 6 处真实问题 + 规范西里尔ә为IPA ə
const fs = require('fs');
const log = [];

// ---- 1. units-data.js / books-extra.js: ә(U+04D9) -> ə(U+0259) ----
for (const f of ['C:/Users/27894/Desktop/HY/vocabulary/src/units-data.js',
                 'C:/Users/27894/Desktop/HY/vocabulary/src/books-extra.js']) {
  let t = fs.readFileSync(f, 'utf8');
  const n = (t.match(/ә/g) || []).length;
  if (n) { t = t.split('ә').join('ə'); fs.writeFileSync(f, t, 'utf8'); }
  log.push(`${f.split('/').pop()}: ә->ə 替换 ${n} 处`);
}

// ---- 2. books-extra.js 结构性修复 ----
const f = 'C:/Users/27894/Desktop/HY/vocabulary/src/books-extra.js';
let t = fs.readFileSync(f, 'utf8');

t = t.replace(/const\s+(\w+)\s*=\s*(\[[\s\S]*?\]);/g, (full, name, json) => {
  const data = JSON.parse(json);
  if (name === 'B1_UNITS') {
    for (const u of data) {
      for (let i = 0; i < u.words.length; i++) {
        const w = u.words[i];
        if (w[0] === 'blindfold' && w[1].includes('nonsense')) {
          w[1] = '蒙住眼睛';
          if (!data.some(x => x.words.some(y => y[0] === 'nonsense')))
            u.words.splice(i + 1, 0, ['nonsense', '荒谬的想法', 'ˈnɒns(ə)ns']);
          log.push(`B1 ${u.id}: blindfold 释义修复 + 补录 nonsense`);
        }
        if (w[0] === 'tourist attractions' && w[1].includes('trækʃən')) {
          if (!w[2]) w[2] = "ə'trækʃən";
          w[1] = '观光胜地';
          log.push(`B1 ${u.id}: tourist attractions 音标归位`);
        }
      }
    }
  }
  if (name === 'A2_UNITS') {
    for (const u of data) {
      for (let i = 0; i < u.words.length; i++) {
        const w = u.words[i];
        if (w[0] === 'set' && w[1].includes('摆餐具')) {
          u.words[i] = ['set/clear the table', '摆餐具，摆饭桌／收拾餐桌', 'set'];
          log.push(`A2 ${u.id}: set/clear the table 修复`);
        }
        if (w[0] === 'load' && w[1].includes('碗碟')) {
          u.words[i] = ['load/empty the dishwasher', '把碗碟放入／拿出洗碗机', 'ləʊd / ˈempti / ˈdɪʃwɒʃə'];
          log.push(`A2 ${u.id}: load/empty the dishwasher 修复`);
        }
        if (w[0] === 'in the middle of the ocean' && w[1].includes('əʊʃn')) {
          u.words[i] = ['in the middle of the ocean', '在海洋中间', 'ˈmɪdl / ˈəʊʃn'];
          log.push(`A2 ${u.id}: in the middle of the ocean 修复`);
        }
        if (w[0] === 'record (n.)') {
          u.words[i] = ['record', '记录，记载；记下', '(n.) ˈrekɔːd / (v.) rɪˈkɔːd'];
          log.push(`A2 ${u.id}: record 双音标修复`);
        }
      }
    }
  }
  return `const ${name} = ${JSON.stringify(data)};`;
});
fs.writeFileSync(f, t, 'utf8');
log.forEach(l => console.log(l));
