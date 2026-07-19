// 宠物解锁逻辑冒烟测试: node vocabulary/tools/test-pet.js
const fs = require('fs');
const st = { d:{}, getItem(k){ return this.d[k]||null; }, setItem(k,v){ this.d[k]=String(v); } };
global.today = ()=>'2026-07-19';
global.store = ()=>st;
global.counts = ()=>({ seen:0 });
global.toast = ()=>{}; global.sfx = ()=>{}; global.confetti = ()=>{};
global.S = { log:{}, ck:{} };
global.streak = ()=>3; global.esc = s=>s; global.screen = null;
global.window = { _noPet:0 };
global.syncUser = ()=>({ nickname:'测试' });   // 模拟已登录
global.location = { search:'?pet=1' };          // 预览开启(测试角落挂件可见)
global.closeModal = ()=>{}; global.render = ()=>{};
let src = fs.readFileSync('C:/Users/27894/Desktop/HY/vocabulary/src/bc-pet.js','utf8').replace(/^'use strict';/, '');
const geval = eval;
geval(src);

let pass=0, fail=0;
const ck=(n,c)=>{ if(c){pass++;console.log('  ✔ '+n);}else{fail++;console.log('  ✘ '+n);} };
ck('默认物种月薪喵(9表情)', petSpecies().id==='cat' && petSlots()===9);
ck('初始已解锁 0', petUnlockedCount()===0);
for(let i=0;i<20;i++) petFeed('learn');
ck('背20词解锁1', petUnlockedCount()===1);
ck('今日可领取', petCanClaim()===true);
petClaim();
ck('签到后解锁2', petUnlockedCount()===2);
ck('领取后今日不可再领', petCanClaim()===false);
for(let i=0;i<400;i++) petFeed('learn');
ck('狂背封顶=物种总数9', petUnlockedCount()===9);
ck('猫集满后不可领取', petCanClaim()===false);
// 换到大鼠(5表情)：另一套独立收集
petChooseSpecies('rat');
ck('切到大鼠', petSpecies().id==='rat' && petSlots()===5);
ck('大鼠独立收集从0开始', petUnlockedCount()===0);
petState.lastClaim='';   // 允许再领(测试)
ck('大鼠可领取', petCanClaim()===true);
petChooseSpecies('linedog');
ck('切到线条小狗(8表情)', petSlots()===8);
petChooseSpecies('cat');
ck('切回猫仍集满9', petUnlockedCount()===9);
// 选展示表情 + 预览
petSetPick(3);
ck('选中表情3', petState.pick===3);
ck('答题角落有挂件', petCornerHtml().indexOf('petcorner')>=0);
ck('性格台词存在', typeof petSayLine()==='string' && petSayLine().length>0);
global.$ = ()=>({ innerHTML:'', classList:{add(){}} });
global.document = { getElementById:()=>({classList:{add(){},contains(){return false}}}), querySelector:()=>null };
petPreview(1); ck('点开预览不报错', true);
petSetPick(3);
ck('再点取消选中', petState.pick===0);
// 静止/动图开关
ck('默认动图', petState.still===false);
ck('动图模式主图用 .gif', /p1\.gif$/.test(petShowSrc(petSpecies().emotes[0])));
petToggleStill();
ck('切到静止', petState.still===true);
ck('静止模式主图用 -s.gif', /p1-s\.gif$/.test(petShowSrc(petSpecies().emotes[0])));
ck('图鉴/预览恒用动图', /p1\.gif$/.test(petEmoteSrc(petSpecies().emotes[0])));
petToggleStill();
ck('再切回动图', petState.still===false);

console.log('\n结果: '+pass+' 通过, '+fail+' 失败');
process.exit(fail?1:0);
