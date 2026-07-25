const fs = require('fs');

const targetPath = 'C:/Users/27894/Desktop/HY/work/vocab3500-deep-rework/xb2/xb2_u1_data.json';
const baselinePath = 'C:/Users/27894/Desktop/HY/deploy/vocab3500/xb2_u1_data.json';
const data = JSON.parse(fs.readFileSync(targetPath, 'utf8'));
const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
const immutable = ['word', 'textbook', 'unit', 'pronunciation', 'partOfSpeech', 'source', 'section', 'sub_section', 'original_sentence', 'readingExamples'];
const issues = [];

const norm = (value) => String(value || '').toLowerCase().replace(/sb\.?|sth\.?|one'?s/g, 'x').replace(/[^a-z0-9]+/g, ' ').trim();
const englishWords = (value) => String(value || '').replace(/（[^）]*）/g, '').match(/[A-Za-z]+(?:['-][A-Za-z]+)*/g)?.length || 0;
const sim = (a, b) => {
  const left = new Set(norm(a).split(' ').filter(Boolean));
  const right = new Set(norm(b).split(' ').filter(Boolean));
  const intersection = [...left].filter((token) => right.has(token)).length;
  const union = new Set([...left, ...right]).size;
  return union ? intersection / union : 0;
};

if (data.length !== baseline.length) issues.push(`entry count ${data.length} != baseline ${baseline.length}`);

data.forEach((entry, index) => {
  const base = baseline[index];
  if (!base || base.word !== entry.word) {
    issues.push(`${index}: word/order mismatch`);
    return;
  }
  immutable.forEach((field) => {
    if (JSON.stringify(entry[field] ?? null) !== JSON.stringify(base[field] ?? null)) {
      issues.push(`${entry.word}: immutable ${field} changed`);
    }
  });

  if (!entry.definitionEn?.trim()) issues.push(`${entry.word}: missing definitionEn`);
  if (!Array.isArray(entry.collocations) || entry.collocations.length < 10 || entry.collocations.length > 12) {
    issues.push(`${entry.word}: collocations=${entry.collocations?.length}`);
  }
  for (let i = 0; i < entry.collocations.length; i += 1) {
    const item = entry.collocations[i];
    if (!item.phrase || !item.translation || !item.example) issues.push(`${entry.word}: incomplete collocation ${i + 1}`);
    for (let j = i + 1; j < entry.collocations.length; j += 1) {
      if (sim(entry.collocations[i].phrase, entry.collocations[j].phrase) >= 0.88) {
        issues.push(`${entry.word}: near-duplicate collocations ${i + 1}/${j + 1}`);
      }
    }
  }

  if (!Array.isArray(entry.synonyms) || entry.synonyms.length < 3) issues.push(`${entry.word}: synonyms=${entry.synonyms?.length}`);
  entry.synonyms.forEach((item, i) => {
    if (!item.synonym || !item.translation || !item.example || !item.usage) issues.push(`${entry.word}: incomplete distinction ${i + 1}`);
  });
  const syntaxDistinctions = entry.synonyms.filter((item) => item.usage && /(作|接|定语|表语|宾语|主语|及物|不及物|动词|名词|形容词|副词|介词|从句|结构|短语)/.test(item.usage));
  if (syntaxDistinctions.length < 2) issues.push(`${entry.word}: only ${syntaxDistinctions.length} distinctions have syntax/collocation detail`);

  const keys = ['noun', 'verb', 'adjective', 'adverb', 'other'];
  if (!entry.wordForms || keys.some((key) => !(key in entry.wordForms))) issues.push(`${entry.word}: incomplete wordForms keys`);
  if (!entry.wordForms?.other) issues.push(`${entry.word}: missing wordForms.other usage note`);

  const longPos = (entry.posExamples || []).filter((item) => {
    const count = englishWords(item.sentence);
    return count >= 20 && count <= 40;
  });
  if (longPos.length < 3) {
    issues.push(`${entry.word}: only ${longPos.length} long POS examples (${(entry.posExamples || []).map((x) => englishWords(x.sentence)).join(',')})`);
  }
  for (let i = 0; i < longPos.length; i += 1) {
    for (let j = i + 1; j < longPos.length; j += 1) {
      if (sim(longPos[i].sentence, longPos[j].sentence) > 0.72) issues.push(`${entry.word}: long POS examples ${i + 1}/${j + 1} too similar`);
    }
  }

  const types = new Set((entry.advancedExpressions || []).map((item) => item.type.split('·')[0]));
  if ((entry.advancedExpressions || []).length < 5) issues.push(`${entry.word}: advancedExpressions=${entry.advancedExpressions?.length}`);
  if (types.size < 4) issues.push(`${entry.word}: advanced type families=${types.size}`);

  const deepUpgrades = (entry.sentenceUpgrade || []).filter((item) => item.techniques?.includes('[深度返工'));
  if (deepUpgrades.length < 2) issues.push(`${entry.word}: deep upgrades=${deepUpgrades.length}`);
  deepUpgrades.forEach((pair, i) => {
    const a = englishWords(pair.original);
    const b = englishWords(pair.upgraded);
    if (a < 22 || a > 45 || b < 22 || b > 45) issues.push(`${entry.word}: deep upgrade ${i + 1} lengths ${a}/${b}`);
    const originalTail = pair.original.split('. ').slice(1).join('. ');
    const upgradedTail = pair.upgraded.split('. ').slice(1).join('. ');
    if (originalTail !== upgradedTail) issues.push(`${entry.word}: deep upgrade ${i + 1} changed context tail`);
  });

  const practices = entry.classPractice || [];
  if (practices.length < 4) issues.push(`${entry.word}: practices=${practices.length}`);
  if (!practices.some((item) => /短语填空|完成句子/.test(item.type))) issues.push(`${entry.word}: lacks collocation practice`);
  if (!practices.some((item) => item.type === '辨析选词')) issues.push(`${entry.word}: lacks distinction practice`);
  if (!practices.some((item) => /语法|指定语法/.test(item.type))) issues.push(`${entry.word}: lacks grammar practice`);
  if (!practices.some((item) => item.type === '汉译英')) issues.push(`${entry.word}: lacks translation practice`);
  practices.forEach((item, i) => {
    if (!item.question || !item.answer || !item.note) issues.push(`${entry.word}: incomplete practice ${i + 1}`);
    const blankRuns = (item.question || '').match(/_+/g) || [];
    if (blankRuns.some((run) => run.length !== 4)) issues.push(`${entry.word}: nonstandard blank in practice ${i + 1}`);
  });
});

const avg = (field) => (data.reduce((sum, entry) => sum + (Array.isArray(entry[field]) ? entry[field].length : 0), 0) / data.length).toFixed(2);
console.log(`entries=${data.length}`);
for (const field of ['uncommonMeanings', 'posExamples', 'idioms', 'collocations', 'synonyms', 'advancedExpressions', 'sentenceUpgrade', 'classPractice']) {
  const values = data.map((entry) => Array.isArray(entry[field]) ? entry[field].length : 0);
  console.log(`${field}: min=${Math.min(...values)} avg=${avg(field)} max=${Math.max(...values)}`);
}
console.log(`issues=${issues.length}`);
issues.slice(0, 250).forEach((issue) => console.log(`- ${issue}`));
if (issues.length) process.exitCode = 1;
