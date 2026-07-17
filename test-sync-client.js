// 客户端同步引擎仿真测试：加载真实 bc-sync.js，模拟两台设备对着本地服务器全流程验证
// 用法: node test-sync-client.js [baseUrl]
'use strict';
const vm = require('vm');
const fs = require('fs');
const BASE = process.argv[2] || 'http://localhost:8788';
const SYNC_SRC = fs.readFileSync('C:/Users/27894/Desktop/HY/vocabulary/src/bc-sync.js', 'utf8');

let pass = 0, fail = 0; const failures = [];
function check(name, cond, extra){
  if (cond){ pass++; console.log('  ✔ ' + name); }
  else { fail++; failures.push(name); console.log('  ✘ ' + name + (extra !== undefined ? '  ← ' + JSON.stringify(extra) : '')); }
}

// —— 构造一台"设备"：独立 localStorage + 独立 bc-sync 运行环境 ——
function makeDevice(name){
  const storage = new Map();
  const storeObj = {
    getItem: k => storage.has(k) ? storage.get(k) : null,
    setItem: (k, v) => storage.set(k, String(v)),
    removeItem: k => storage.delete(k),
  };
  const ctx = {
    console, JSON, Object, Array, Date, Math, String, Number, Boolean, RegExp, Promise, Error,
    setTimeout: (fn) => 0,          // 关掉自动定时器，测试手动驱动
    clearTimeout: () => {},
    setInterval: () => 0,
    navigator: { userAgent: 'TestRig/' + name },
    document: { addEventListener: () => {}, visibilityState: 'visible', getElementById: () => null },
    fetch: (url, opts) => fetch(BASE + url, opts),
    store: () => storeObj,
    KEY_BASE: 'hylite_bcz_v3',
    curBookId: 'b3000',
    BOOKS: [{id:'b3000'},{id:'prep'},{id:'basic'},{id:'core'},{id:'green'},{id:'a2'},{id:'b1'},{id:'b1p'},{id:'b2'}],
    SES: null, screen: null, tab: 4, modalK: null, TOTAL: 100,
    S: null,
    todayPlan: () => {}, render: () => {}, closeModal: () => {}, go: () => {},
    ask: (msg, yes) => yes && yes(),
    toast: () => {},
    $: () => null,
    esc: s => String(s),
  };
  ctx.save = function(){
    storeObj.setItem(ctx.KEY_BASE + '__' + ctx.curBookId, JSON.stringify(ctx.S));
    try { if (typeof ctx.syncOnSave === 'function') ctx.syncOnSave(); } catch(e){}
  };
  vm.createContext(ctx);
  vm.runInContext(SYNC_SRC, ctx);
  ctx.__storage = storage;
  return ctx;
}
const freshS = (xp) => ({ v:3, w:{ 'B01:0':{b:2,due:null,s:1,ng:0,cs:1} }, log:{}, ck:{}, ach:{}, xp, best:{},
  plan:{mode:'count',quota:50,units:1}, today:null, cfg:{theme:'auto',voice:1,auto:true,sfx:true,pal:'ink'} });

(async () => {
  /* ========== 场景1: 设备1 注册并上传已有进度 ========== */
  console.log('== 场景1: 设备1 注册 + 首传本地进度 ==');
  const d1 = makeDevice('D1');
  d1.S = freshS(42);
  d1.save();                             // 本地已有进度(未登录时的老学生)
  const reg = await (await fetch(BASE + '/api/register', { method:'POST',
    headers:{'Content-Type':'application/json'}, body: JSON.stringify({ nickname:'仿真学生' }) })).json();
  check('注册成功', reg.ok);
  const CODE = reg.user.sync_code;
  // 模拟 syncAfterLogin 的核心路径
  vm.runInContext(`syncAuth=${JSON.stringify({token:reg.token,user:reg.user})}; syncMeta={}; syncSaveLocal();`, d1);
  await d1.syncPullCheck();              // 云端还没数据 → 无操作
  await d1.syncPushAllLocal();           // 本地 b3000 有进度 → 上传
  const cloud1 = await (await fetch(BASE + '/api/sync?book=b3000', { headers:{ Authorization:'Bearer '+reg.token } })).json();
  check('本地已有进度自动上云', cloud1.exists && JSON.parse(cloud1.data).xp === 42, cloud1.exists);

  /* ========== 场景2: 学习后自动标脏并推送 ========== */
  console.log('== 场景2: 设备1 学习 → 脏标记 → 推送 ==');
  d1.S.xp = 99; d1.S.w['B01:1'] = { b:1, due:null, s:1, ng:0, cs:1 };
  d1.save();                             // save() 钩子 → syncOnSave → dirty
  check('save() 触发脏标记', vm.runInContext('!!(syncMeta.b3000 && syncMeta.b3000.dirty)', d1) === true);
  await d1.syncPushDirty();
  const cloud2 = await (await fetch(BASE + '/api/sync?book=b3000', { headers:{ Authorization:'Bearer '+reg.token } })).json();
  check('推送后云端为最新(xp=99)', JSON.parse(cloud2.data).xp === 99);
  check('推送后脏标记清除', vm.runInContext('syncMeta.b3000.dirty', d1) === false);

  /* ========== 场景3: 设备2 用同步码登录恢复全部进度 ========== */
  console.log('== 场景3: 设备2(全新) 同步码登录 → 恢复进度 ==');
  const d2 = makeDevice('D2');
  d2.S = freshS(0); d2.S.w = {};         // 全新设备无进度
  d2.__storage.delete(d2.KEY_BASE + '__b3000');
  const lg = await (await fetch(BASE + '/api/login-code', { method:'POST',
    headers:{'Content-Type':'application/json'}, body: JSON.stringify({ sync_code: CODE }) })).json();
  check('设备2 同步码登录成功', lg.ok);
  vm.runInContext(`syncAuth=${JSON.stringify({token:lg.token,user:lg.user})}; syncMeta={}; syncSaveLocal();`, d2);
  await d2.syncPullCheck();
  check('设备2 拉到云端进度(xp=99)', d2.S && d2.S.xp === 99, d2.S && d2.S.xp);
  check('设备2 词条完整(2个)', d2.S && Object.keys(d2.S.w).length === 2);
  check('设备2 本地存档已写入', JSON.parse(d2.__storage.get(d2.KEY_BASE + '__b3000') || '{}').xp === 99);

  /* ========== 场景4: 双设备冲突 → 进度多者胜 + 落败方有备份 ========== */
  console.log('== 场景4: 双设备同时改 → 冲突取进度多者 ==');
  // 设备2 学到 xp=120 并推送
  d2.S.xp = 120; d2.save(); await d2.syncPushDirty();
  // 设备1 离线学到 xp=150(比设备2多)，然后联网核对
  d1.S.xp = 150; d1.S.w['B01:2'] = { b:1, due:null, s:1, ng:0, cs:1 }; d1.save();
  await d1.syncPullCheck();
  const cloud4 = await (await fetch(BASE + '/api/sync?book=b3000', { headers:{ Authorization:'Bearer '+reg.token } })).json();
  check('冲突后云端保留进度多的一方(xp=150)', JSON.parse(cloud4.data).xp === 150, JSON.parse(cloud4.data).xp);
  const backupKeys1 = [...d1.__storage.keys()].filter(k => k.startsWith('hylite_sync_backup__'));
  check('设备1 保留了云端落败副本备份', backupKeys1.some(k => k.includes('conflict-cloud')));
  check('设备1 本地进度未被覆盖(xp=150)', d1.S.xp === 150);

  // 设备2 再核对 → 云端(150) 比本地(120) 多 → 应用云端并备份本地
  d2.S.xp = 130; d2.save();              // 设备2 也有少量新改动(dirty)
  await d2.syncPullCheck();
  check('设备2 冲突时采用云端更多进度(xp=150)', d2.S.xp === 150, d2.S.xp);
  const backupKeys2 = [...d2.__storage.keys()].filter(k => k.startsWith('hylite_sync_backup__'));
  check('设备2 本地落败副本已备份', backupKeys2.some(k => k.includes('conflict-local')));

  /* ========== 场景5: 训练会话中不应用云端数据 ========== */
  console.log('== 场景5: 会话保护 ==');
  vm.runInContext('SES = { pos:1, steps:[1,2,3] };', d2);
  d1.S.xp = 200; d1.save(); await d1.syncPushDirty();     // 云端更新到 200
  vm.runInContext('syncMeta.b3000.dirty = false;', d2);   // 设备2 无本地改动
  await d2.syncPullCheck();
  check('会话中设备2 不被替换进度(仍 xp=150)', d2.S.xp === 150, d2.S.xp);
  vm.runInContext('SES = null;', d2);
  await d2.syncPullCheck();
  check('会话结束后正常拉取(xp=200)', d2.S.xp === 200, d2.S.xp);

  /* ========== 场景6: 未登录时零行为 ========== */
  console.log('== 场景6: 未登录零影响 ==');
  const d3 = makeDevice('D3');
  d3.S = freshS(5);
  d3.save();
  await d3.syncPushDirty(); await d3.syncPullCheck();
  const netKeys = [...d3.__storage.keys()].filter(k => k.startsWith('hylite_sync_auth'));
  check('未登录不产生认证数据', netKeys.length === 0);
  check('未登录本地进度正常(xp=5)', JSON.parse(d3.__storage.get(d3.KEY_BASE + '__b3000')).xp === 5);

  /* ========== 场景7: 会话失效自动清理登录态但不动进度 ========== */
  console.log('== 场景7: 会话过期处理 ==');
  vm.runInContext(`syncAuth={token:'${'e'.repeat(64)}',user:{sync_code:'HY-FAKE-FAKE',nickname:'x'}}; syncSaveLocal();`, d2);
  await d2.syncPullCheck();
  check('失效 token 自动登出', vm.runInContext('syncAuth', d2) === null);
  check('登出后本地进度保留(xp=200)', JSON.parse(d2.__storage.get(d2.KEY_BASE + '__b3000')).xp === 200);

  console.log('\n========== 结果: ' + pass + ' 通过, ' + fail + ' 失败 ==========');
  if (failures.length){ console.log('失败项:'); failures.forEach(f => console.log('  - ' + f)); process.exit(1); }
  process.exit(0);
})().catch(e => { console.error('测试脚本异常:', e); process.exit(2); });
