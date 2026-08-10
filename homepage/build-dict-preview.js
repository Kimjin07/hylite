'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SOURCE = path.join(ROOT, 'deploy', 'vocab3500', 'bx1_u1_data.json');
const OUTPUTS = [
  path.join(ROOT, 'homepage', 'dict-preview.json'),
  path.join(ROOT, 'deploy', 'new', 'dict-preview.json'),
];

const PREVIEW_WORDS = [
  'potential', "can't wait (to do sth)", 'senior', 'path', 'lead to',
  'challenge', 'thinking', 'positive', 'opportunity', 'lie in', 'rise to',
  'acquire', 'effort', 'advance', 'amazing', 'confidence',
  'make a difference', 'make the most of', 'resource', 'take advantage of',
  'facility', 'equal', 'attitude', 'goal', 'balance', 'improve',
  'last but not least', 'well-rounded', 'individual', 'character',
  'responsible', 'ahead', 'junior', 'forward', 'look forward to', 'independent',
];

const source = JSON.parse(fs.readFileSync(SOURCE, 'utf8'));
const byWord = new Map(source.map((entry) => [entry.word, entry]));
const missing = PREVIEW_WORDS.filter((word) => !byWord.has(word));

if (missing.length) {
  throw new Error(`Missing preview words in ${SOURCE}: ${missing.join(', ')}`);
}

const preview = PREVIEW_WORDS.map((word) => byWord.get(word));
if (preview.some((entry) => entry.source !== 'Reading')) {
  throw new Error('Preview selection must contain Reading entries only.');
}

const json = `${JSON.stringify(preview, null, 2)}\n`;
for (const output of OUTPUTS) {
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, json, 'utf8');
}

console.log(`Built ${preview.length} complete Reading entries.`);
