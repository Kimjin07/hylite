// 系统性修复词库数据：XML泄漏、被吞单词补录、单词栏格式、空释义
const fs = require('fs');

const CJK = /[一-鿿]/;
const report = [];

// 空释义补全表
const GLOSS_FILL = {
  'plc': 'abbr. 上市公司 (public limited company)',
  'organiser': 'n. 组织者',
  'benjamin': 'n. 本杰明（人名）',
  'affordable': 'a. 负担得起的, 价格实惠的',
  'pasta': '意大利面',
  'beg': '乞求, 恳求',
};
// 被吞单词缺释义时的补全表
const SWALLOWED_INFO = {
  'opposite': { gloss: '对面的, 相反的', phon: 'ˈɒpəzɪt' },
};

function parseSwallowedSegments(xmlBlob) {
  // 把 XML 标签替换为分隔符后逐段解析
  const segs = xmlBlob.replace(/<[^>]*>/g, '\n').split('\n')
    .map(s => s.trim()).filter(s => s.length > 0);
  const out = { chineseOnly: [], entries: [], bareWords: [] };
  for (const s of segs) {
    if (/^P\d+$/.test(s)) continue;                    // 页码垃圾
    if (!/[A-Za-z一-鿿]/.test(s)) continue;    // 无内容
    let m;
    if ((m = s.match(/^([A-Za-z][A-Za-z ()\-']*?)\s*\[([^\]]+)\]\s*(.*[一-鿿].*)$/))) {
      out.entries.push([m[1].trim(), m[3].trim(), m[2].trim()]);
    } else if ((m = s.match(/^([A-Za-z][A-Za-z ()\-']*?)\s+([一-鿿].*)$/))) {
      out.entries.push([m[1].trim(), m[2].trim(), '']);
    } else if (/^[一-鿿].*$/.test(s) && !/[<>=]/.test(s)) {
      out.chineseOnly.push(s);
    } else if (/^[A-Za-z][A-Za-z '\-]*$/.test(s)) {
      out.bareWords.push(s);
    }
  }
  return out;
}

function fixWordField(entry, loc) {
  let [word, gloss, phon] = entry;
  const orig = word;
  // 全角括号
  word = word.replace(/（/g, ' (').replace(/）/g, ')').replace(/\s+/g, ' ').trim();
  // "word /ipa/" 混排
  let m = word.match(/^(.+?)\s*\/(.+)\/\s*$/);
  if (m) { word = m[1].trim(); if (!phon) phon = m[2].trim(); }
  // "hero ˈhɪərəʊ]" 残缺音标
  m = word.match(/^([A-Za-z][A-Za-z ()\-']*?)\s+\[?([^\sA-Za-z\]]\S*)\]$/);
  if (m) { word = m[1].trim(); if (!phon) phon = m[2].trim(); }
  // "fantasy<w:t>" XML 混入（无中文时直接截断）
  if (word.includes('<') && !CJK.test(word)) word = word.split('<')[0].trim();
  // asap 特例
  if (/^asap\s*=/.test(word)) { word = 'asap'; if (!gloss) gloss = '尽快 (= as soon as possible)'; }
  if (word !== orig) report.push(`[${loc}] word: '${orig}' -> '${word}'` + (phon !== entry[2] ? ` (phon='${phon}')` : ''));
  return [word, gloss, phon];
}

function processConst(data, constName, wordSet) {
  const inserts = [];
  for (const unit of data) {
    for (let i = 0; i < unit.words.length; i++) {
      let entry = unit.words[i];
      let [word, gloss, phon] = entry;
      const loc = `${constName} ${unit.id}`;

      // ---- 单词栏本身混入了 中文+XML（fed up 合并条目）----
      if (word.includes('<w:') && CJK.test(word)) {
        const head = word.split('<w:')[0].trim();
        const xmlStart = word.indexOf('<w:');
        const blob = word.slice(xmlStart);
        const hm = head.match(/^([A-Za-z][A-Za-z ()\-']*?)\s+([一-鿿].*)$/);
        if (hm) {
          report.push(`[${loc}] 拆分合并条目: '${word.slice(0, 40)}...' -> '${hm[1]}'='${hm[2]}'`);
          word = hm[1].trim(); gloss = hm[2].trim();
          const segs = parseSwallowedSegments(blob);
          for (const e of segs.entries) inserts.push({ unit, after: i, entry: e });
          for (const bw of segs.bareWords) {
            const info = SWALLOWED_INFO[bw] || { gloss: '', phon: '' };
            inserts.push({ unit, after: i, entry: [bw, info.gloss, info.phon] });
          }
        }
      }

      // ---- 常规单词栏修复 ----
      [word, gloss, phon] = fixWordField([word, gloss, phon], loc);

      // ---- 释义里的 XML 泄漏 ----
      if (gloss.includes('<w:')) {
        const head = gloss.split('<w:')[0].trim();
        const blob = gloss.slice(gloss.indexOf('<w:'));
        const segs = parseSwallowedSegments(blob);
        let newGloss = '';
        if (CJK.test(head)) newGloss = head;
        else if (segs.chineseOnly.length) newGloss = segs.chineseOnly[0]; // intention/representative：真释义藏在XML里
        report.push(`[${loc}] '${word}' 释义去XML: -> '${newGloss}'`);
        gloss = newGloss;
        for (const e of segs.entries) inserts.push({ unit, after: i, entry: e });
        for (const bw of segs.bareWords) {
          const info = SWALLOWED_INFO[bw] || { gloss: '', phon: '' };
          inserts.push({ unit, after: i, entry: [bw, info.gloss, info.phon] });
        }
      }

      // ---- <<>> 书名号 ----
      if (gloss.includes('<<')) {
        const g2 = gloss.replace(/<<([^<>]*)>>/g, '《$1》');
        if (g2 !== gloss) { report.push(`[${loc}] '${word}' 书名号: '${gloss}' -> '${g2}'`); gloss = g2; }
      }

      // ---- 空释义补全 ----
      if (!gloss.trim() && GLOSS_FILL[word]) {
        gloss = GLOSS_FILL[word];
        report.push(`[${loc}] '${word}' 补释义: '${gloss}'`);
      }

      unit.words[i] = [word, gloss, phon];
      wordSet.add(word.toLowerCase());
    }
  }
  // 执行补录（跳过已存在的词），倒序插入避免索引偏移
  const grouped = new Map();
  for (const ins of inserts) {
    const w = ins.entry[0].toLowerCase();
    if (wordSet.has(w)) { report.push(`[${constName}] 跳过补录(已存在): '${ins.entry[0]}'`); continue; }
    wordSet.add(w);
    if (!grouped.has(ins.unit)) grouped.set(ins.unit, []);
    grouped.get(ins.unit).push(ins);
  }
  for (const [unit, list] of grouped) {
    list.sort((a, b) => b.after - a.after);
    for (const ins of list) {
      unit.words.splice(ins.after + 1, 0, ins.entry);
      report.push(`[${constName} ${unit.id}] 补录被吞单词: ['${ins.entry[0]}','${ins.entry[1]}','${ins.entry[2]}']`);
    }
  }
  return data;
}

for (const file of [
  'C:\\Users\\27894\\Desktop\\HY\\vocabulary\\src\\units-data.js',
  'C:\\Users\\27894\\Desktop\\HY\\vocabulary\\src\\books-extra.js',
]) {
  let txt = fs.readFileSync(file, 'utf8');
  const wordSet = new Set(); // 每本词书独立判重：按 const 分
  txt = txt.replace(/const\s+(\w+)\s*=\s*(\[[\s\S]*?\]);/g, (full, name, json) => {
    const data = JSON.parse(json);
    const set = new Set(); // per-const word set
    const fixed = processConst(data, name, set);
    return `const ${name} = ${JSON.stringify(fixed)};`;
  });
  fs.writeFileSync(file, txt, 'utf8');
}

console.log('===== 修复报告 =====');
for (const r of report) console.log(r);
console.log(`共 ${report.length} 项改动`);
