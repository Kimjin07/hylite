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
ck('初始点亮0、无券', petUnlockedCount()===0 && petCredits()===0);
for(let i=0;i<20;i++) petFeed('learn');
ck('背20词=得1张券(不自动点亮)', petCredits()===1 && petUnlockedCount()===0);
petUnlockPick(5);   // 自选第5个(非顺序)
ck('用券点亮第5个(非顺序)', petIsUnlocked({id:5}) && petUnlockedCount()===1);
ck('第1个仍未点亮(没被自动解锁)', petIsUnlocked({id:1})===false);
ck('点亮后券花光', petCredits()===0);
petUnlockPick(2);
ck('没券时点亮无效', petUnlockedCount()===1 && petIsUnlocked({id:2})===false);
ck('今日可领取', petCanClaim()===true);
petClaim();
ck('签到再得1张券', petCredits()===1 && petUnlockedCount()===1);
ck('领取后今日不可再领', petCanClaim()===false);
petUnlockPick(2);
ck('券点亮第2个', petIsUnlocked({id:2}) && petUnlockedCount()===2);
petUnlockPick(2);
ck('已点亮的不能重复点', petUnlockedCount()===2);
for(let i=0;i<400;i++) petFeed('learn');
ck('狂背券封顶=物种总数9', petState.dex.cat===9 && petCredits()===7);
for(const e of petSpecies().emotes){ if(!petIsUnlocked(e)) petUnlockPick(e.id); }   // 剩余券全点亮
ck('全部点亮=9', petUnlockedCount()===9 && petCredits()===0);
ck('猫集满后不可领取', petCanClaim()===false);
// 换到大鼠(5表情)：另一套独立
petChooseSpecies('rat');
ck('切到大鼠', petSpecies().id==='rat' && petSlots()===5);
ck('大鼠独立从0开始', petUnlockedCount()===0 && petCredits()===0);
petState.lastClaim='';   // 允许再领(测试)
ck('大鼠可领取', petCanClaim()===true);
petChooseSpecies('linedog');
ck('切到线条小狗(8表情)', petSlots()===8);
petChooseSpecies('cat');
ck('切回猫仍全点亮9', petUnlockedCount()===9);
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
// 做题露脸开关 + 未指定时随机取一个已点亮的
ck('默认做题露脸开', petState.quiz===true);
petState.pick=0;
ck('未选时做题随机取一个已点亮的', petCornerHtml().indexOf('petcorner')>=0);
petToggleQuiz();
ck('关掉后做题不露脸(角落空)', petState.quiz===false && petCornerHtml()==='');
petToggleQuiz();
ck('再开做题露脸', petState.quiz===true && petCornerHtml().indexOf('petcorner')>=0);
// —— 旧版存档迁移：老用户按顺序解锁的前 N 个要原样保留 ——
st.d[PET_KEY] = JSON.stringify({ name:'旧', learned:60, wordGranted:3, dex:{cat:3}, lastClaim:'', species:'cat', pick:0 });  // 无 v/unl = 旧版
petLoad();
ck('旧存档迁移: dex3→保留点亮前3个', petUnlockedCount()===3 && petIsUnlocked({id:1}) && petIsUnlocked({id:3}) && !petIsUnlocked({id:4}));
ck('旧存档迁移后标记 v=2', petState.v===2);
ck('迁移后无凭空多出的券', petCredits()===0);
// —— 每日签到提醒弹窗：没领弹一次、领了不弹 ——
petDayPrompted=false; petState.lastClaim='';
petMaybeDailyPrompt();
ck('没领当日→弹签到提醒', petDayPrompted===true);
petDayPrompted=false; petState.lastClaim=today();   // 已领
petMaybeDailyPrompt();
ck('已领当日→不弹', petDayPrompted===false);
petState.lastClaim='';
const dexBefore=petState.dex.cat;
petClaimFromPrompt();
ck('弹窗领取=赚1张券+记当日', petState.dex.cat===dexBefore+1 && petState.lastClaim===today());

console.log('\n结果: '+pass+' 通过, '+fail+' 失败');
process.exit(fail?1:0);
