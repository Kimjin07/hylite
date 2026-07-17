const fs = require('fs');
const f = 'C:/Users/27894/Desktop/HY/vocabulary/src/books-extra.js';
let t = fs.readFileSync(f, 'utf8');
const bad = '",ɔːɡənaɪ\'zeɪʃən"';
const good = '"ˌɔːɡənaɪˈzeɪʃən"';
const had = t.includes(bad);
t = t.split(bad).join(good);
fs.writeFileSync(f, t, 'utf8');
console.log('organisation phon fixed:', had);
