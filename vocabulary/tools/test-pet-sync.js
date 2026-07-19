// 宠物云同步逻辑测试: node vocabulary/tools/test-pet-sync.js
const fs = require('fs');
const st = { d:{}, getItem(k){ return this.d[k]||null; }, setItem(k,v){ this.d[k]=String(v); } };
global.today = ()=>'2026-07-19';
global.store = ()=>st;
global.counts = ()=>({ seen:0 });
global.toast = ()=>{}; global.sfx = ()=>{}; global.confetti = ()=>{};
global.S = { log:{}, ck:{} };
global.streak = ()=>3; global.esc = s=>s; global.screen = null;
global.window = { _noPet:0 };
global.syncUser = ()=>({ nickname:'测试' });   // 已登录
global.location = { search:'?pet=1' };
global.closeModal = ()=>{}; global.render = ()=>{};

// 模拟云端一份存储 + syncApi（GET/POST /pet）
let cloud = null;
const petScoreSrv = p => { let s=Math.max(0,Number(p&&p.learned)||0); if(p&&p.dex) for(const k in p.dex) s+=Math.max(0,Number(p.dex[k])||0)*5; return s; };
let apiCalls = 0;
global.syncApi = async (path, opts)=>{
  apiCalls++;
  if (path==='pet' && (!opts || (opts.method||'GET')==='GET')){
    return cloud ? { ok:true, exists:true, data:cloud, server_at:'t' } : { ok:true, exists:false };
  }
  if (path==='pet' && opts && opts.method==='POST'){
    const incoming = opts.body.data;
    let storeStr = incoming;
    if (cloud){ try { if (petScoreSrv(JSON.parse(cloud)) > petScoreSrv(JSON.parse(incoming))) storeStr = cloud; } catch(e){} }
    cloud = storeStr;
    return { ok:true, server_at:'t2', data:storeStr };
  }
  return { ok:false };
};

let src = fs.readFileSync('C:/Users/27894/Desktop/HY/vocabulary/src/bc-pet.js','utf8').replace(/^'use strict';/, '');
const geval = eval;
geval(src);

let pass=0, fail=0;
const ck=(n,c)=>{ if(c){pass++;console.log('  ✔ '+n);}else{fail++;console.log('  ✘ '+n);} };
const sleep = ms=>new Promise(r=>setTimeout(r,ms));

(async ()=>{
  // 1. 本机有进度、云端空 → pull 后应把本机推上云
  petLoad();
  for(let i=0;i<40;i++) petFeed('learn');   // learned=40, cat dex 至少若干
  const localLearned = petState.learned;
  await petCloudPull();
  await sleep(10);
  ck('云端空时 pull 会把本机推上云', cloud && JSON.parse(cloud).learned===localLearned);

  // 2. 云端分更高(learned 大 + dex 多) → pull 合并取大
  cloud = JSON.stringify({ learned: 500, wordGranted: 500, dex:{ cat:9, rat:5 }, lastClaim:'2026-07-19', name:'云宝', species:'rat', pick:2 });
  await petCloudPull();
  await sleep(10);
  ck('pull 合并 learned 取大', petState.learned===500);
  ck('pull 合并 dex 每套取大(rat=5)', petState.dex.rat===5);
  ck('云端更资深→沿用其名字', petState.name==='云宝');
  ck('云端更资深→沿用其当前物种', petState.species==='rat');

  // 3. 本机分更高 → push 后云端被本机覆盖，名字不被云端拉回
  petState.learned = 9999; petState.name='本机宝'; petState.species='cat';
  await petCloudPush();
  await sleep(10);
  ck('本机分更高→云端更新为本机', JSON.parse(cloud).learned===9999);
  ck('本机分更高→本机名字保留', petState.name==='本机宝');

  // 4. 未登录时不触发云调用
  const before = apiCalls;
  global.syncUser = ()=>null;
  ck('未登录 petCloudOn=false', petCloudOn()===false);
  await petCloudPush();
  ck('未登录 push 不发请求', apiCalls===before);

  console.log('\n结果: '+pass+' 通过, '+fail+' 失败');
  process.exit(fail?1:0);
})();
