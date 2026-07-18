// 乱码专项扫描：检查所有词条三个字段的编码/字符异常
const fs = require('fs');

const files = [
  'C:/Users/27894/Desktop/HY/vocabulary/src/units-data.js',
  'C:/Users/27894/Desktop/HY/vocabulary/src/books-extra.js',
];

const issues = [];
let total = 0;

// 允许出现在中文释义里的字符类别
const GLOSS_OK = new RegExp(
  '^[' +
  '\\u4e00-\\u9fff' +            // CJK
  '\\u3400-\\u4dbf' +            // CJK 扩展A
  'A-Za-z0-9' +
  '\\s' +
  '，。、；：？！…—·《》〈〉（）【】“”‘’' +  // 中文标点
  ',\\.;:?!\\-\'"()\\[\\]/&%+=~*ⅠⅡⅢⅣ' +      // 英文标点/罗马数字
  '℃°£$€¥×÷' +
  ']+$'
);
// UTF-8 被误解码的典型特征字符
const MOJI = /[ÃÂÅåæ¬â€œ¢£¥§©®°±µ¶º»¿ÀÁÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞßàáâãäçèéêëìíîïðñòóôõöøùúûüýþÿ�]/;
// 音标栏合法字符（IPA + 常见备用写法）
const PHON_OK = /^[a-zA-Zɑɐɒæɓʙβɔɕçɗɖðʤəɘɚɛɜɝɞɟʄɡɠɢʛɦɧħɥʜɨɪʝɭɬɫɮʟɱɯɰŋɳɲɴøɵɸθœɶʘɹɺɾɻʀʁɽʂʃʈʧʉʊʋⱱʌɣɤʍχʎʏʑʐʒʔʡʕʢǀǁǂǃˈˌːˑʼʴʰʱʲʷˠˤ˞ãẽĩõũ̃ⁿᵻᵿ‿ .,:;()\-\/'ˈ̩̥̯̃]*$/u;

for (const f of files) {
  const txt = fs.readFileSync(f, 'utf8');
  const fname = f.split('/').pop();
  for (const m of txt.matchAll(/const\s+(\w+)\s*=\s*(\[[\s\S]*?\]);/g)) {
    const [, name, json] = m;
    const data = JSON.parse(json);
    for (const unit of data) {
      for (const [word, gloss, phon] of unit.words) {
        total++;
        const loc = `[${fname}/${name} ${unit.id}] '${word}'`;
        // 1) UTF-8 mojibake 特征字符（只查 word/gloss；phon 里 æ 等是合法 IPA）
        for (const [fld, val] of [['word', word], ['gloss', gloss]]) {
          if (MOJI.test(val)) issues.push(`${loc} ${fld} 疑似乱码字符: ${val}`);
        }
        // 2) 连续问号（编码丢失常表现为 ??）
        if (/\?\?/.test(word + gloss + phon)) issues.push(`${loc} 出现连续问号: ${gloss}`);
        // 3) 释义字符白名单外的字符
        if (gloss && !GLOSS_OK.test(gloss)) {
          const bad = [...gloss].filter(c => !GLOSS_OK.test(c));
          issues.push(`${loc} gloss 含非常用字符 [${[...new Set(bad)].map(c=>c+'(U+'+c.codePointAt(0).toString(16).toUpperCase().padStart(4,'0')+')').join(' ')}]: ${gloss}`);
        }
        // 4) 音标栏异常（中文/引号/白名单外）
        if (phon && /[一-鿿]/.test(phon)) issues.push(`${loc} phon 含中文: ${phon}`);
        else if (phon && !PHON_OK.test(phon)) {
          const bad = [...phon].filter(c => !PHON_OK.test(c));
          issues.push(`${loc} phon 含异常字符 [${[...new Set(bad)].map(c=>c+'(U+'+c.codePointAt(0).toString(16).toUpperCase().padStart(4,'0')+')').join(' ')}]: ${phon}`);
        }
        // 5) 半个括号/引号（不成对）
        for (const [l, r] of [['（','）'], ['《','》'], ['(',')'], ['“','”'], ['[',']']]) {
          const cl = gloss.split(l).length - 1, cr = gloss.split(r).length - 1;
          if (cl !== cr) issues.push(`${loc} gloss 括号不成对 ${l}${r}: ${gloss}`);
        }
      }
    }
  }
}

console.log(`扫描词条: ${total}`);
console.log(`发现问题: ${issues.length}`);
issues.forEach(i => console.log(i));
