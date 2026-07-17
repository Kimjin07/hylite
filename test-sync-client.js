// 客户端同步引擎仿真测试 v2：加载真实 bc-sync.js，模拟多台设备对着本地服务器验证
// 覆盖对抗审查确认的回归场景。用法: node test-sync-client.js [baseUrl]
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

function makeDevice(name){
  const storage = new Map();
  const storeObj = {
    getItem: k => storage.has(k) ? storage.get(k) : null,
    setItem: (k, v) => storage.set(k, String(v)),
    removeItem: k => storage.delete(k),
    key: i => [...storage.keys()][i],
    get length(){ return storage.size; },
  };
  const ctx = {
    console, JSON, Object, Array, Date, Math, String, Number, Boolean, RegExp, Promise, Error,
    AbortController, setTimeout: () => 0, clearTimeout: () => {}, setInterval: () => 0,
    navigator: { userAgent: 'TestRig/' + name },
    document: { addEventListener: () => {}, visibilityState: 'visible', getElementById: () => null },
    window: {},
    fetch: (url, opts) => fetch(BASE + url, opts),
    store: () => storeObj,
    KEY_BASE: 'hylite_bcz_v3',
    curBookId: 'b3000',
    BOOKS: [{id:'b3000',name:'必会3000'},{id:'prep'},{id:'basic'},{id:'core'},{id:'green'},{id:'a2'},{id:'b1'},{id:'b1p'},{id:'b2'}],
    SES: null, FL: null, ML: null, screen: null, tab: 4, modalK: null, TOTAL: 100,
    S: null,
    todayPlan: () => {}, render: () => {}, closeModal: () => {}, go: () => {},
    applyTheme: () => {}, updateChrome: () => {},
    ask: (msg, yes) => yes && yes(),
    toast: () => {},
    $: () => null,
    esc: s => String(s),
  };
  ctx.load = function(){
    try { return JSON.parse(storeObj.getItem(ctx.KEY_BASE + '__' + ctx.curBookId)) || { w:{}, xp:0, ck:{} }; }
    catch(e){ return { w:{}, xp:0, ck:{} }; }
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
const freshS = (xp, extraWords) => {
  const w = { 'B01:0':{b:2,due:null,s:1,ng:0,cs:1} };
  for (let i = 1; i <= (extraWords||0); i++) w['B01:'+i] = { b:1, due:null, s:1, ng:0, cs:1 };
  return { v:3, w, log:{}, ck:{}, ach:{}, xp, best:{}, plan:{mode:'count',quota:50,units:1}, today:null,
    cfg:{theme:'auto',voice:1,auto:true,sfx:true,pal:'ink'} };
};
async function newAccount(nick){
  return (await fetch(BASE + '/api/register', { method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ nickname: nick }) })).json();
}
function loginAs(ctx, auth){
  vm.runInContext(`syncAuth=${JSON.stringify({token:auth.token,user:auth.user})}; syncMeta={}; syncSaveLocal();`, ctx);
}
async function cloudBook(token, book){
  const r = await (await fetch(BASE + '/api/sync?book=' + (book||'b3000'), { headers:{ Authorization:'Bearer '+token } })).json();
  return r.exists ? JSON.parse(r.data) : null;
}
// 立即推送（等价于节流窗口已过/定时器已触发）
async function pushNow(ctx){
  vm.runInContext('if (syncMeta[curBookId]) syncMeta[curBookId].force = true;', ctx);
  await ctx.syncPushDirty();
}

(async () => {
  /* ===== 场景1: 注册 + 全量核对自动补传本地进度 ===== */
  console.log('== 场景1: 注册 + 核对补传本地进度 ==');
  const acct = await newAccount('仿真学生');
  check('注册成功', acct.ok);
  const d1 = makeDevice('D1');
  d1.S = freshS(42); d1.save();
  loginAs(d1, acct);
  await d1.syncPullCheck();
  const c1 = await cloudBook(acct.token);
  check('本地已有进度自动上云(xp=42)', c1 && c1.xp === 42, c1 && c1.xp);

  /* ===== 场景2: 学习 → 脏标记落盘 → 推送 ===== */
  console.log('== 场景2: 脏标记落盘 + 推送 ==');
  d1.S.xp = 99; d1.S.w['B01:1'] = { b:1, due:null, s:1, ng:0, cs:1 }; d1.save();
  const persisted = JSON.parse(d1.__storage.get('hylite_sync_meta') || '{}');
  check('脏标记立即落盘(防关页丢失)', persisted.b3000 && persisted.b3000.dirty === true);
  await pushNow(d1);
  const c2 = await cloudBook(acct.token);
  check('推送后云端 xp=99', c2 && c2.xp === 99);
  check('推送后脏标记清除', vm.runInContext('syncMeta.b3000.dirty', d1) === false);

  /* ===== 场景3: 新设备恢复 ===== */
  console.log('== 场景3: 新设备同步码登录恢复 ==');
  const d2 = makeDevice('D2');
  d2.S = { w:{}, xp:0, ck:{} };
  const lg = await (await fetch(BASE + '/api/login-code', { method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ sync_code: acct.user.sync_code }) })).json();
  check('同步码登录成功', lg.ok);
  loginAs(d2, lg);
  await d2.syncPullCheck();
  check('恢复进度(xp=99, 2词)', d2.S && d2.S.xp === 99 && Object.keys(d2.S.w).length === 2, d2.S && d2.S.xp);

  /* ===== 场景4(致命回归): 首次登录时本地大档不被云端小档吃掉 ===== */
  console.log('== 场景4: 首次登录合并——本地大档胜出 ==');
  const d3 = makeDevice('D3');
  d3.S = freshS(999, 30); d3.save();       // 本地 31 词 xp=999，非脏(登录前从未同步过)
  loginAs(d3, lg);                          // 云端此刻是 xp=99 的小档
  await d3.syncPullCheck();
  check('本地大档保留(xp=999)', d3.S.xp === 999, d3.S.xp);
  const c4 = await cloudBook(acct.token);
  check('云端被大档覆盖(xp=999)', c4 && c4.xp === 999, c4 && c4.xp);
  check('云端落败档已备份', [...d3.__storage.keys()].some(k => k.includes('logincloud')));

  console.log('== 场景4b: 首次登录合并——云端大档胜出 ==');
  const d4 = makeDevice('D4');
  d4.S = freshS(10); d4.save();             // 本地小档
  loginAs(d4, lg);                          // 云端现在是 xp=999
  await d4.syncPullCheck();
  check('采用云端大档(xp=999)', d4.S.xp === 999, d4.S.xp);
  check('本地落败档已备份', [...d4.__storage.keys()].some(k => k.includes('loginlocal')));

  /* ===== 场景5: 双设备竞态(409 乐观并发) ===== */
  console.log('== 场景5: 双设备同时推送 409 冲突合并 ==');
  d3.S.xp = 1500; d3.save(); await pushNow(d3);       // D3 先推 1500
  d4.S.xp = 1200; d4.save(); await pushNow(d4);       // D4 拿着旧 base 推 1200 → 409 → 云端1500 > 本地1200 → 采用云端
  check('D4 冲突后采用较多进度(xp=1500)', d4.S.xp === 1500, d4.S.xp);
  const c5 = await cloudBook(acct.token);
  check('云端保持 1500', c5 && c5.xp === 1500, c5 && c5.xp);
  d4.S.xp = 2000; d4.save(); await pushNow(d4);       // D4 现在 base 正确 → 正常推
  const c5b = await cloudBook(acct.token);
  check('后续正常推送成功(xp=2000)', c5b && c5b.xp === 2000, c5b && c5b.xp);

  /* ===== 场景6(致命回归): 损坏档/未加载态不外传 ===== */
  console.log('== 场景6: 损坏档防扩散 ==');
  const d5 = makeDevice('D5');
  d5.S = { v:3, w:{}, log:{}, ck:{'2026-07-17':1}, ach:{}, xp:777, best:{}, plan:{}, cfg:{} };  // 疑似损坏：无词态但有xp/打卡
  d5.save();
  loginAs(d5, lg);
  vm.runInContext('syncMeta.b3000={dirty:true,seq:1};', d5);
  await pushNow(d5);
  const c6 = await cloudBook(acct.token);
  check('疑似损坏档被拒推(云端仍 xp=2000)', c6 && c6.xp === 2000, c6 && c6.xp);

  console.log('== 场景6b: 词书未加载时用本地存档而非内存空 S ==');
  const d6 = makeDevice('D6');
  d6.__storage.set(d6.KEY_BASE + '__b3000', JSON.stringify(freshS(555)));   // 存档是好的
  d6.S = { v:3, w:{}, xp:555, ck:{}, log:{}, ach:{}, best:{}, plan:{}, cfg:{} };  // 内存 S 被掏空
  vm.runInContext('TOTAL = 0;', d6);                                        // 词书数据未加载
  const raw6 = vm.runInContext("syncBookRaw('b3000')", d6);
  check('TOTAL=0 时读取存档版本(词态完整)', JSON.parse(raw6).w['B01:0'] !== undefined);

  /* ===== 场景7: 训练/弹层界面保护 ===== */
  console.log('== 场景7: 界面保护 ==');
  vm.runInContext('SES = { pos:1, steps:[1,2,3] };', d4);
  d3.S.xp = 3000; d3.save(); await pushNow(d3);
  vm.runInContext('syncMeta.b3000.dirty = false;', d4);
  await d4.syncPullCheck();
  check('背词会话中不替换进度(xp仍2000)', d4.S.xp === 2000, d4.S.xp);
  vm.runInContext('SES = null; screen = { type:"list" };', d4);
  await d4.syncPullCheck();
  check('弹层界面打开时也不替换', d4.S.xp === 2000, d4.S.xp);
  vm.runInContext('screen = null;', d4);
  await d4.syncPullCheck();
  check('回到主界面后正常拉取(xp=3000)', d4.S.xp === 3000, d4.S.xp);

  /* ===== 场景8: 未登录零影响 ===== */
  console.log('== 场景8: 未登录零影响 ==');
  const d7 = makeDevice('D7');
  d7.S = freshS(5); d7.save();
  await pushNow(d7); await d7.syncPullCheck();
  check('未登录不产生认证数据', !d7.__storage.has('hylite_sync_auth'));
  check('未登录本地进度正常', JSON.parse(d7.__storage.get(d7.KEY_BASE + '__b3000')).xp === 5);

  /* ===== 场景9: 会话过期 ===== */
  console.log('== 场景9: 会话过期自动登出但保留进度 ==');
  vm.runInContext(`syncAuth={token:'${'e'.repeat(64)}',user:{sync_code:'HY-FAKE-FAKE',nickname:'x'}}; syncSaveLocal();`, d4);
  await d4.syncPullCheck();
  check('失效 token 自动登出', vm.runInContext('syncAuth', d4) === null);
  check('本地进度保留(xp=3000)', JSON.parse(d4.__storage.get(d4.KEY_BASE + '__b3000')).xp === 3000);

  /* ===== 场景10: 备份列表与恢复 ===== */
  console.log('== 场景10: 备份可列出可恢复 ==');
  const bl = vm.runInContext('JSON.stringify(syncListBackups())', d3);
  check('备份列表非空', JSON.parse(bl).length > 0);
  const d4backups = vm.runInContext('JSON.stringify(syncListBackups())', d4);
  const firstKey = JSON.parse(d4backups)[0];
  if (firstKey){
    vm.runInContext(`syncRestoreBackup('${firstKey.key}')`, d4);
    check('恢复备份后进度被替换且标脏', vm.runInContext('syncMeta["' + firstKey.book + '"].dirty', d4) === true);
  } else { check('恢复备份后进度被替换且标脏', false, '无备份可测'); }

  /* ===== 场景11: 同数据快进(keepalive 记账缺失的自愈) ===== */
  console.log('== 场景11: 云端与本机同数据 → 快进不自我冲突 ==');
  // d3 与云端一致(刚推过 3000)；人为把 serverAt 弄陈旧并标脏，模拟 keepalive 已推成功但没记账
  vm.runInContext('syncMeta.b3000.serverAt = "2020-01-01T00:00:00.000Z"; syncMeta.b3000.dirty = true;', d3);
  const backupsBefore = vm.runInContext('syncListBackups().length', d3);
  await d3.syncPullCheck();
  check('同数据快进后版本号对齐且不再脏', vm.runInContext('syncMeta.b3000.dirty', d3) === false);
  const backupsAfter = vm.runInContext('syncListBackups().length', d3);
  check('未产生垃圾备份', backupsAfter === backupsBefore, backupsAfter - backupsBefore);
  const c11 = await cloudBook(acct.token);
  check('云端数据未被动过(xp=3000)', c11 && c11.xp === 3000, c11 && c11.xp);

  /* ===== 场景12: 恢复备份是显式意图 → 直推云端不被分数合并撤销 ===== */
  console.log('== 场景12: 恢复备份直推云端 ==');
  const d3backs = JSON.parse(vm.runInContext('JSON.stringify(syncListBackups())', d3));
  const restoreKey = d3backs.find(b => b.book === 'b3000');
  if (restoreKey){
    await vm.runInContext(`syncRestoreBackup('${restoreKey.key}')`, d3);   // ask 桩自动确认; 内部 await syncPushIntent
    await new Promise(r => setTimeout(r, 1500));                            // 等意图推送完成
    const c12 = await cloudBook(acct.token);
    const localXp = d3.S.xp;
    check('云端已变为恢复后的进度(即使分数更低)', c12 && c12.xp === localXp, JSON.stringify({cloud: c12 && c12.xp, local: localXp}));
  } else { check('云端已变为恢复后的进度(即使分数更低)', false, '无备份可恢复'); }

  /* ===== 场景13: 退出登录前冲刷未同步进度 ===== */
  console.log('== 场景13: 退出登录先传完最后的进度 ==');
  d3.S.xp = d3.S.xp + 111; d3.save();                     // 有新改动未推
  vm.runInContext('syncLogoutAsk()', d3);                  // ask 桩自动确认
  await new Promise(r => setTimeout(r, 2000));
  const c13 = await cloudBook(acct.token);
  check('退出前进度已上云', c13 && c13.xp === d3.S.xp, JSON.stringify({cloud: c13 && c13.xp, local: d3.S.xp}));
  check('已退出登录', vm.runInContext('syncAuth', d3) === null);

  console.log('\n========== 结果: ' + pass + ' 通过, ' + fail + ' 失败 ==========');
  if (failures.length){ console.log('失败项:'); failures.forEach(f => console.log('  - ' + f)); process.exit(1); }
  process.exit(0);
})().catch(e => { console.error('测试脚本异常:', e); process.exit(2); });
