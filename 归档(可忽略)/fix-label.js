const fs = require('fs');
const f = 'C:/Users/27894/Desktop/HY/vocabulary/src/units-data.js';
let t = fs.readFileSync(f, 'utf8');
const had = t.includes('<美>');
t = t.split('<美>').join('（美）');
fs.writeFileSync(f, t, 'utf8');
console.log('firefighter label fixed:', had);
