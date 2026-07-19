'use strict';
/* ================= 云同步（可选功能，未登录时完全不影响原有使用） =================
 * 账号体系：同步码 HY-XXXX-XXXX 为根凭证（注册即得、可直接登录、忘记密码的找回钥匙）；
 *          账号名+密码为可选的第二种登录方式。
 * 同步策略：离线优先。本地 localStorage 永远是主副本，云端是镜像备份；
 *          同步失败静默重试，绝不打断学习。
 * 安全底线（对抗审查后加固）：
 *  - 任何"应用云端数据"前：先做结构校验，再把本地旧档存入带时间戳的备份槽（可在界面恢复）
 *  - 首次登录/换账号（本地无同步记录）且本地有进度时，一律走"进度多者胜"的冲突合并，绝不盲替换
 *  - 推送走乐观并发（base_server_at），云端被别的设备先写会返回 409，走冲突合并后重试
 *  - "疑似损坏档"（词态为空但 XP/打卡非零、或当前词书数据尚未加载）绝不推送
 *  - dirty 标记落盘，关页/杀进程后下次打开会补传
 *  - 训练中（背词/速刷/连连看或任何弹层界面）不替换当前进度
 * 注：顶层状态用 var（无 TDZ），杜绝构建拼接顺序引发的初始化崩溃。
 */

var SYNC_AUTH_KEY = 'hylite_sync_auth';
var SYNC_META_KEY = 'hylite_sync_meta';
var SYNC_BACKUP_PREFIX = 'hylite_sync_backup__';

var syncAuth = null;      // {token, user:{sync_code, username, nickname}}
var syncMeta = {};        // { bookId: {serverAt, pushedAt, dirty, seq, lastPushTs} }
var syncBusy = false;
var syncApplying = false; // 应用云端数据时不把 save() 记为脏
var syncLastOk = null, syncLastErr = null;
var syncPushT = null;
var syncUiBusy = false;   // 表单防重复提交

/* ---------------- 本地状态 ---------------- */
function syncLoadLocal(){
  try { syncAuth = JSON.parse(store() && store().getItem(SYNC_AUTH_KEY)) || null; } catch(e){ syncAuth = null; }
  try { syncMeta = JSON.parse(store() && store().getItem(SYNC_META_KEY)) || {}; } catch(e){ syncMeta = {}; }
  if (syncAuth && (!syncAuth.token || !syncAuth.user)) syncAuth = null;
}
function syncSaveLocal(){
  try { const st = store(); if (!st) return;
    if (syncAuth) st.setItem(SYNC_AUTH_KEY, JSON.stringify(syncAuth)); else st.removeItem(SYNC_AUTH_KEY);
    st.setItem(SYNC_META_KEY, JSON.stringify(syncMeta));
  } catch(e){}
}
function syncUser(){ return (syncAuth && syncAuth.user) || null; }
function syncDevice(){
  try { const ua = navigator.userAgent;
    const os = /iPhone|iPad/.test(ua) ? 'iOS' : /Android/.test(ua) ? 'Android' : /Windows/.test(ua) ? 'Windows' : /Mac/.test(ua) ? 'Mac' : '其他';
    return os + (/(MicroMessenger)/.test(ua) ? '·微信' : '');
  } catch(e){ return '未知'; }
}

/* ---------------- API（带 15 秒超时） ---------------- */
async function syncApi(path, opts){
  opts = opts || {};
  const headers = { 'Content-Type': 'application/json' };
  if (syncAuth && syncAuth.token) headers['Authorization'] = 'Bearer ' + syncAuth.token;
  let ctrl = null, timer = null;
  try { ctrl = new AbortController(); timer = setTimeout(()=>ctrl.abort(), 15000); } catch(e){}
  let res;
  try {
    res = await fetch('/api/' + path, {
      method: opts.method || 'GET',
      headers,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
      keepalive: !!opts.keepalive,
      signal: ctrl ? ctrl.signal : undefined,
    });
  } catch(e){
    if (timer) clearTimeout(timer);
    syncLastErr = '网络连不上';
    return { ok:false, error:'网络连不上', _net:true };
  }
  if (timer) clearTimeout(timer);
  let j; try { j = await res.json(); } catch(e){ j = { ok:false, error:'服务响应异常' }; }
  j._status = res.status;
  if (res.status === 401 && syncAuth && path !== 'logout' && !path.startsWith('login')){
    // 会话失效：清除登录态但绝不动本地进度
    syncAuth = null; syncSaveLocal();
    try { toast('云同步登录已过期，请重新登录'); } catch(e){}
    if (!screen) try { render(); } catch(e){}
  }
  return j;
}

/* ---------------- 进度读取 / 档案体检 ---------------- */
function syncBookRaw(id){
  if (id === curBookId){
    // 当前词书数据未加载完成时，内存 S 可能是被 normalize 掏空的档 → 用 localStorage 里的原档
    if (typeof TOTAL !== 'undefined' && TOTAL === 0){
      try { return (store() && store().getItem(KEY_BASE + '__' + id)) || null; } catch(e){ return null; }
    }
    try { return JSON.stringify(S); } catch(e){ return null; }
  }
  try { return (store() && store().getItem(KEY_BASE + '__' + id)) || null; } catch(e){ return null; }
}
function syncParse(raw){
  if (!raw) return null;
  try { const d = JSON.parse(raw); return (d && typeof d === 'object' && !Array.isArray(d)) ? d : null; } catch(e){ return null; }
}
function syncIsEmpty(raw){
  const d = syncParse(raw);
  if (!d) return true;
  return Object.keys(d.w || {}).length === 0 && !(d.xp > 0) && Object.keys(d.ck || {}).length === 0;
}
function syncValidArchive(d){
  return !!(d && typeof d === 'object' && !Array.isArray(d) && d.w && typeof d.w === 'object' && !Array.isArray(d.w));
}
// 疑似损坏档：词态空但 XP/打卡非零（多半是词书数据没加载时被清洗过的档）→ 禁止外传
function syncLooksPoisoned(d){
  return syncValidArchive(d) && Object.keys(d.w).length === 0 && ((d.xp|0) > 0 || Object.keys(d.ck || {}).length > 0);
}
// 档案体检：{ok, raw, reason} reason: missing|invalid|poisoned|empty|oversize
function syncInspectBook(id){
  const raw = syncBookRaw(id);
  if (!raw) return { ok:false, reason:'missing' };
  const d = syncParse(raw);
  if (!syncValidArchive(d)) return { ok:false, reason:'invalid' };
  if (syncLooksPoisoned(d)) return { ok:false, reason:'poisoned' };
  if (Object.keys(d.w).length === 0 && !(d.xp > 0) && Object.keys(d.ck || {}).length === 0) return { ok:false, reason:'empty' };
  if (raw.length > 1200000) return { ok:false, raw, reason:'oversize' };
  return { ok:true, raw };
}
// 可安全推送的档；不可推送返回 null
function syncPushableRaw(id){
  const r = syncInspectBook(id);
  if (r.reason === 'oversize') syncLastErr = '进度体积超限，暂无法同步';
  return r.ok ? r.raw : null;
}
function syncScore(d){ // 冲突时比较"谁的进度多"：XP 为主，已学词数为辅
  let seen = 0; for (const k in (d.w || {})){ const st = d.w[k]; if (st && (st.s > 0 || st.z)) seen++; }
  return (d.xp|0) * 1000000 + seen;
}

/* ---------------- 备份槽（带时间戳，每本书保留最近 2 份，可在界面恢复） ---------------- */
function syncBackup(id, raw, why){
  try {
    const st = store(); if (!st) return;
    st.setItem(SYNC_BACKUP_PREFIX + id + '__' + Date.now() + '__' + why, raw);
    // 修剪：每本书最多留 2 份
    const keys = [];
    for (let i = 0; i < st.length; i++){ const k = st.key(i); if (k && k.indexOf(SYNC_BACKUP_PREFIX + id + '__') === 0) keys.push(k); }
    keys.sort();
    while (keys.length > 2) st.removeItem(keys.shift());
  } catch(e){}
}
function syncListBackups(){
  const out = [];
  try {
    const st = store(); if (!st) return out;
    for (let i = 0; i < st.length; i++){
      const k = st.key(i);
      if (!k || k.indexOf(SYNC_BACKUP_PREFIX) !== 0) continue;
      const rest = k.slice(SYNC_BACKUP_PREFIX.length).split('__');   // id, ts, why
      if (rest.length < 3) continue;
      out.push({ key: k, book: rest[0], ts: Number(rest[1]) || 0, why: rest[2] });
    }
  } catch(e){}
  out.sort((a, b) => b.ts - a.ts);
  return out;
}
function syncRestoreBackup(key){
  try {
    const st = store(); if (!st) return;
    const raw = st.getItem(key); if (!raw) { toast('备份不存在'); return; }
    const d = syncParse(raw);
    if (!syncValidArchive(d)){ toast('备份数据损坏，无法恢复'); return; }
    const book = key.slice(SYNC_BACKUP_PREFIX.length).split('__')[0];
    ask('用这份备份覆盖《' + ((BOOKS.find(b=>b.id===book)||{}).name || book) + '》当前进度吗？\n覆盖前会把当前进度存为新备份。', ()=>{
      const cur = syncBookRaw(book);
      if (cur && !syncIsEmpty(cur)) syncBackup(book, cur, 'beforerestore');
      syncApplying = true;
      try {
        st.setItem(KEY_BASE + '__' + book, raw);
        if (book === curBookId){ S = load(); todayPlan(); applyTheme(); }
      } finally { syncApplying = false; }
      const m = syncMeta[book] || (syncMeta[book] = {});
      m.dirty = true; m.seq = (m.seq||0) + 1; syncSaveLocal();
      toast('✔ 已恢复备份' + (syncAuth ? '，正在同步到云端…' : ''));
      if (syncAuth) syncPushIntent(book);
      closeModal(); if (!screen) render();
    }, '恢 复', true);
  } catch(e){ toast('恢复失败'); }
}
// 用户显式意图(恢复备份/导入文件)的推送：先对齐云端当前版本号再立即强推，
// 不参与"进度多者胜"合并——用户点了恢复，就要以用户选择为准
async function syncPushIntent(book){
  if (!syncAuth) return;
  try {
    const cur = await syncApi('sync?book=' + book);
    const m = syncMeta[book] || (syncMeta[book] = {});
    if (cur.ok) m.serverAt = cur.exists ? cur.server_at : null;
    m.dirty = true; m.seq = (m.seq||0) + 1; m.force = true;
    syncSaveLocal();
    const okPush = await syncPushBook(book);
    if (okPush) try { toast('✔ 已同步到云端'); } catch(e){}
  } catch(e){}
}

/* ---------------- 推送（乐观并发 + 409 冲突合并） ---------------- */
async function syncPushBook(id, isRetry){
  if (!syncAuth) return false;
  const m = syncMeta[id] || (syncMeta[id] = {});
  const insp = syncInspectBook(id);
  if (!insp.ok){
    // 超限是"合法数据暂时推不动"→ 保持脏标记等待(比如用户删些笔记后就能推)；其余(空/损坏/缺档)清脏防空转
    if (insp.reason === 'oversize'){ syncLastErr = '进度体积超限，暂无法同步'; }
    else { m.dirty = false; syncSaveLocal(); }
    return false;
  }
  const raw = insp.raw;
  const seq0 = m.seq || 0;
  const r = await syncApi('sync', { method:'POST', body:{
    book_id: id, data: raw,
    updated_at: new Date().toISOString(),
    base_server_at: m.serverAt || null,
    device: syncDevice(),
  }});
  if (r.ok){
    m.serverAt = r.server_at; m.pushedAt = r.updated_at; m.lastPushTs = Date.now();
    if ((m.seq || 0) === seq0) m.dirty = false;    // 请求在途期间又有新改动则保持脏
    syncLastOk = Date.now(); syncLastErr = null; syncSaveLocal();
    return true;
  }
  if (r._status === 409 && r.conflict && !isRetry){
    // 同数据快进：云端就是这份数据(典型: keepalive 推送成功但没记账) → 只对齐版本号，不备份不重推
    if (r.data === raw){
      m.serverAt = r.server_at;
      if ((m.seq || 0) === seq0) m.dirty = false;
      syncSaveLocal();
      return true;
    }
    // 云端被别的设备先写：进度多者胜
    const cloudD = syncParse(r.data), localD = syncParse(raw);
    if (cloudD && localD && syncValidArchive(cloudD)){
      if (syncScore(cloudD) > syncScore(localD)){
        if (!syncCanApply(id)) return false;       // 界面忙时跳过本轮，不写备份不空转
        syncBackup(id, raw, 'conflictlocal');
        const applied = await syncApplyCloud(id, { data: r.data, server_at: r.server_at, updated_at: r.server_at });
        if (applied) try { toast('检测到另一台设备的更新，已采用进度较多的一份'); } catch(e){}
        return applied;
      }
      syncBackup(id, r.data, 'conflictcloud');
      m.serverAt = r.server_at; syncSaveLocal();   // 接受新 base 再推一次
      return syncPushBook(id, true);
    }
  }
  if (!r._net) syncLastErr = r.error || '同步失败';
  return false;
}
async function syncPushDirty(){
  if (!syncAuth || syncBusy) return;
  syncBusy = true;
  try {
    for (const id of Object.keys(syncMeta)){
      const m = syncMeta[id];
      if (!m || !m.dirty) continue;
      if (m.lastPushTs && Date.now() - m.lastPushTs < 20000 && !m.force) continue;   // 每本书至少间隔 20 秒
      delete m.force;
      await syncPushBook(id);
    }
  } finally { syncBusy = false; }
  syncRefreshCard();
}
function syncSchedulePush(){
  clearTimeout(syncPushT);
  syncPushT = setTimeout(()=>{ syncPushDirty(); }, 10000);
}

/* ---------------- 应用云端数据（结构校验 + 备份 + 经 normalize 落地） ---------------- */
// 当前书能否安全替换：训练/速刷/连连看/子页面/弹窗打开时都不行；词书数据没加载好也不行
function syncCanApply(id){
  if (id !== curBookId) return true;
  if ((typeof SES !== 'undefined' && SES) || (typeof FL !== 'undefined' && FL) ||
      (typeof ML !== 'undefined' && ML) || screen) return false;
  try { const md = document.getElementById('modal'); if (md && md.classList.contains('show')) return false; } catch(e){}
  if (typeof TOTAL !== 'undefined' && TOTAL === 0) return false;
  return true;
}
async function syncApplyCloud(id, r){
  const cloud = syncParse(r.data);
  if (!syncValidArchive(cloud)) return false;
  if (!syncCanApply(id)) return false;
  const oldRaw = syncBookRaw(id);
  if (oldRaw && !syncIsEmpty(oldRaw)) syncBackup(id, oldRaw, 'replaced');
  syncApplying = true;
  try {
    const st = store(); if (!st) return false;
    st.setItem(KEY_BASE + '__' + id, r.data);
    if (id === curBookId){
      S = load();          // 经 load()→normalize() 清洗落地，畸形字段在这里被修正
      todayPlan(); applyTheme();
      try { updateChrome(); } catch(e){}
    }
  } catch(e){ return false; }
  finally { syncApplying = false; }
  syncMeta[id] = { serverAt: r.server_at, pushedAt: r.updated_at, dirty: false, seq: (syncMeta[id]||{}).seq || 0 };
  syncSaveLocal();
  if (id === curBookId){
    if (!screen) try { render(); } catch(e){}
    // render()→tryCheckin() 可能刚在应用后的新档上打了卡(改动 S) → 正常标脏走同步，防本地静默领先
    try { if (JSON.stringify(S) !== r.data) syncOnSave(); } catch(e){}
  }
  return true;
}

/* ---------------- 全量核对（拉取 + 冲突合并 + 云端缺的书补传） ---------------- */
async function syncPullCheck(){
  if (!syncAuth || syncBusy) return;
  syncBusy = true;
  let metaOk = false;
  try {
    const meta = await syncApi('sync-meta');
    if (!meta.ok){ if (!meta._net) syncLastErr = meta.error; return; }
    metaOk = true;
    const cloudBooks = {};
    for (const b of (meta.books || [])) cloudBooks[b.book_id] = b;

    for (const bid of Object.keys(cloudBooks)){
      const cb = cloudBooks[bid];
      const m = syncMeta[bid];
      const known = (m || {}).serverAt;
      const dirty = !!(m || {}).dirty;
      const raw = syncBookRaw(bid);
      const localHasData = !syncIsEmpty(raw);
      const cloudNew = cb.server_at !== known;
      const firstContact = !m || !m.serverAt;    // 本机对这本书没有任何同步记录（首次登录/换账号/清过缓存）

      if (!cloudNew && !dirty) continue;
      if (!cloudNew && dirty){ await syncPushBook(bid); continue; }

      // 云端有本机未见过的版本
      const r = await syncApi('sync?book=' + bid);
      if (!r.ok || !r.exists) continue;

      // 同数据快进：云端与本机内容一致(典型: keepalive 推送成功但没记账) → 只对齐版本号
      if (r.data === raw){
        const mm = syncMeta[bid] || (syncMeta[bid] = {});
        mm.serverAt = r.server_at; mm.pushedAt = r.updated_at; mm.dirty = false;
        syncSaveLocal();
        continue;
      }

      if (!localHasData){ await syncApplyCloud(bid, r); continue; }

      if (firstContact || dirty){
        // 首次接触 或 双边都有改动 → 进度多者胜，落败方备份
        const cloudD = syncParse(r.data), localD = syncParse(raw);
        if (!cloudD || !localD || !syncValidArchive(cloudD)){ if (dirty) await syncPushBook(bid); continue; }
        const localInsp = syncInspectBook(bid);
        // 本地档不可推送时不能"胜出"：损坏档 → 采用云端修复；超限档 → 保持现状等待，不动版本号
        const localWins = syncScore(localD) >= syncScore(cloudD) && localInsp.ok;
        if (!localInsp.ok && localInsp.reason !== 'oversize'){
          if (syncCanApply(bid)){ syncBackup(bid, raw, 'loginlocal'); await syncApplyCloud(bid, r); }
          continue;
        }
        if (!localInsp.ok && localInsp.reason === 'oversize'){ syncLastErr = '进度体积超限，暂无法同步'; continue; }
        if (!localWins){
          if (!syncCanApply(bid)) continue;        // 界面忙 → 本轮跳过，不写备份
          syncBackup(bid, raw, firstContact ? 'loginlocal' : 'conflictlocal');
          const applied = await syncApplyCloud(bid, r);
          if (applied) try { toast('《' + ((BOOKS.find(b=>b.id===bid)||{}).name||bid) + '》已采用云端较多的进度，本机原进度已备份'); } catch(e){}
        } else {
          syncBackup(bid, r.data, firstContact ? 'logincloud' : 'conflictcloud');
          const mm = syncMeta[bid] || (syncMeta[bid] = {});
          mm.serverAt = r.server_at;             // 以云端当前版本为 base 覆盖推送
          mm.dirty = true; mm.seq = (mm.seq||0) + 1;
          await syncPushBook(bid);
        }
        continue;
      }

      // 本机干净、云端更新（典型：另一台设备学习了）→ 采用云端
      await syncApplyCloud(bid, r);
    }

    // 云端没有、本机有实际进度的书 → 补传（仅在 meta 拉取成功后才做，防止盲推覆盖）
    for (const b of BOOKS){
      if (cloudBooks[b.id]) continue;
      const raw = syncPushableRaw(b.id);
      if (raw){
        const mm = syncMeta[b.id] || (syncMeta[b.id] = {});
        mm.serverAt = null; mm.dirty = true; mm.seq = (mm.seq||0) + 1;
        await syncPushBook(b.id);
      }
    }
    syncLastOk = Date.now(); syncLastErr = null; syncSaveLocal();
  } finally {
    syncBusy = false;
    syncRefreshCard();
  }
  return metaOk;
}

/* ---------------- 存档/切书钩子（bc-core 调用） ---------------- */
function syncOnSave(){
  if (!syncAuth || syncApplying) return;
  const m = syncMeta[curBookId] || (syncMeta[curBookId] = {});
  m.dirty = true; m.seq = (m.seq || 0) + 1;
  syncSaveLocal();                                   // 脏标记落盘：关页/杀进程后下次打开补传
  syncSchedulePush();
}
function syncOnBookSwitch(){
  if (!syncAuth) return;
  setTimeout(()=>{ syncPullCheck(); }, 400);
}

/* ---------------- 手动操作 ---------------- */
async function syncNow(){
  if (!syncAuth){ try { toast('请先登录云同步'); } catch(e){} return; }
  if (syncBusy){ try { toast('正在同步中…'); } catch(e){} return; }
  try { toast('同步中…'); } catch(e){}
  const m = syncMeta[curBookId] || (syncMeta[curBookId] = {});
  m.dirty = true; m.seq = (m.seq || 0) + 1; m.force = true;
  await syncPushDirty();
  const pulled = await syncPullCheck();
  try { toast(syncLastErr ? ('⚠ ' + syncLastErr) : (pulled === false || pulled === undefined) && !syncLastOk ? '⚠ 同步未完成，请稍后再试' : '✔ 同步完成'); } catch(e){}
  if (!screen && tab === 4) render();
}

/* ---------------- 登录/注册/退出 ---------------- */
async function syncDoRegister(){
  if (syncUiBusy) return; syncUiBusy = true;
  try {
    const nick = ($('#syncNick') || {}).value || '';
    const user = (($('#syncUser') || {}).value || '').trim();
    const pass = ($('#syncPass') || {}).value || '';
    if (!nick.trim()){ toast('请填写姓名'); return; }
    if ((user && !pass) || (!user && pass)){ toast('账号和密码要一起填（也可以都不填，只用同步码）'); return; }
    const body = { nickname: nick.trim() };
    if (user){ body.username = user; body.password = pass; }
    const r = await syncApi('register', { method:'POST', body });
    if (!r.ok){ toast('⚠ ' + (r.error || '注册失败')); return; }
    syncAuth = { token: r.token, user: r.user };
    syncMeta = {}; syncSaveLocal();
    closeModal();
    // 展示同步码（关键凭证，引导保存）
    $('#sheet').innerHTML = `<div class="grab"></div>
      <div class="dw" style="font-size:22px;margin-bottom:6px">✔ 注册成功</div>
      <div class="muted" style="margin-bottom:14px">这是你的<b>同步码</b>，换设备或忘记密码时凭它找回全部进度。<b>请立即截图保存！</b></div>
      <div class="card" style="text-align:center"><div class="num" style="font-size:30px;font-weight:900;letter-spacing:2px">${esc(r.user.sync_code)}</div></div>
      <button class="b3d" onclick="syncCopyCode()">复制同步码</button>
      <button class="b3d ghost" onclick="closeModal();go(4)">我已保存，完成</button>`;
    $('#modal').classList.add('show');
    await syncPullCheck();     // 全新账号云端为空 → 此调用会把本机已有进度全部补传
    try { if (typeof petCloudPull==='function') petCloudPull(); } catch(e){}   // 本机宠物也补传到新账号
  } finally { syncUiBusy = false; }
}
async function syncDoLogin(){
  if (syncUiBusy) return; syncUiBusy = true;
  try {
    const user = (($('#syncUser') || {}).value || '').trim();
    const pass = ($('#syncPass') || {}).value || '';
    if (!user || !pass){ toast('请输入账号和密码'); return; }
    const r = await syncApi('login', { method:'POST', body:{ username:user, password:pass } });
    if (!r.ok){ toast('⚠ ' + (r.error || '登录失败')); return; }
    await syncAfterLogin(r);
  } finally { syncUiBusy = false; }
}
async function syncDoLoginCode(){
  if (syncUiBusy) return; syncUiBusy = true;
  try {
    const code = (($('#syncCode') || {}).value || '').trim();
    if (!code){ toast('请输入同步码'); return; }
    const r = await syncApi('login-code', { method:'POST', body:{ sync_code:code } });
    if (!r.ok){ toast('⚠ ' + (r.error || '登录失败')); return; }
    await syncAfterLogin(r);
  } finally { syncUiBusy = false; }
}
async function syncAfterLogin(r){
  syncAuth = { token: r.token, user: r.user };
  syncMeta = {}; syncSaveLocal();
  closeModal();
  toast('✔ 已登录，正在同步…');
  const okPull = await syncPullCheck();   // 首次接触：内部走"进度多者胜"合并，云端缺的书自动补传
  try { if (typeof petCloudPull==='function') petCloudPull(); } catch(e){}   // 宠物图鉴也跟随账号
  toast(okPull ? '✔ 同步完成' : '⚠ 已登录，但同步未完成，稍后会自动重试');
  go(4);
}
function syncLogoutAsk(){
  ask('退出云同步登录？\n本机进度不受影响，只是不再自动同步。', async ()=>{
    // 退出前把最后的改动传完，否则最近几十秒的学习就永远留在本机了
    const hasDirty = Object.keys(syncMeta).some(id => syncMeta[id] && syncMeta[id].dirty);
    if (hasDirty){
      try { toast('正在保存最后的进度…'); } catch(e){}
      for (const id of Object.keys(syncMeta)){ if (syncMeta[id] && syncMeta[id].dirty) syncMeta[id].force = true; }
      await syncPushDirty();
      const stillDirty = Object.keys(syncMeta).some(id => syncMeta[id] && syncMeta[id].dirty);
      if (stillDirty){
        ask('还有进度没同步上去（可能是网络问题）。\n现在退出的话这部分进度只留在本机。确定退出吗？', ()=>{
          syncApi('logout', { method:'POST' });
          syncAuth = null; syncMeta = {}; syncSaveLocal();
          toast('已退出云同步'); render();
        }, '仍要退出', true);
        return;
      }
    }
    await syncApi('logout', { method:'POST' });
    syncAuth = null; syncMeta = {}; syncSaveLocal();
    toast('已退出云同步'); render();
  }, '退 出');
}
async function syncSetCred(){
  if (syncUiBusy) return; syncUiBusy = true;
  try {
    const user = (($('#syncUser') || {}).value || '').trim();
    const pass = ($('#syncPass') || {}).value || '';
    if (!user || !pass){ toast('请输入账号和密码'); return; }
    const r = await syncApi('set-credentials', { method:'POST', body:{ username:user, password:pass } });
    if (!r.ok){ toast('⚠ ' + (r.error || '设置失败')); return; }
    syncAuth.user = r.user; syncSaveLocal();
    closeModal(); toast('✔ 账号密码已设置'); render();
  } finally { syncUiBusy = false; }
}
function syncRotateCodeAsk(){
  ask('更换同步码？\n旧同步码立即失效，其他已登录设备会被强制退出。\n适用于同步码不小心泄漏给别人的情况。', async ()=>{
    const r = await syncApi('rotate-code', { method:'POST' });
    if (!r.ok){ toast('⚠ ' + (r.error || '更换失败')); return; }
    syncAuth.user = r.user; syncSaveLocal();
    $('#sheet').innerHTML = `<div class="grab"></div>
      <div class="dw" style="font-size:22px;margin-bottom:6px">✔ 已更换同步码</div>
      <div class="muted" style="margin-bottom:14px">旧码已失效，这是<b>新的同步码</b>，请立即截图保存！</div>
      <div class="card" style="text-align:center"><div class="num" style="font-size:30px;font-weight:900;letter-spacing:2px">${esc(r.user.sync_code)}</div></div>
      <button class="b3d" onclick="syncCopyCode()">复制同步码</button>
      <button class="b3d ghost" onclick="closeModal();go(4)">我已保存，完成</button>`;
    $('#modal').classList.add('show');
  }, '更 换', true);
}
function syncCopyCode(){
  const u = syncUser(); if (!u) return;
  try {
    navigator.clipboard.writeText(u.sync_code)
      .then(()=>toast('已复制同步码'))
      .catch(()=>{ try { window.prompt('自动复制失败，请长按选中复制：', u.sync_code); } catch(e){ toast(u.sync_code); } });
  } catch(e){ try { window.prompt('请长按选中复制：', u.sync_code); } catch(_){ toast(u.sync_code); } }
}

/* ---------------- UI ---------------- */
function syncOpenPanel(mode){
  modalK = null;
  const attrs = 'autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false"';
  let h = `<div class="grab"></div>`;
  if (mode === 'reg'){
    h += `<div class="dw" style="font-size:22px;margin-bottom:4px">注册云同步</div>
      <div class="muted" style="margin-bottom:12px">注册后进度自动存到云端，换手机、换电脑输同步码就能接着学。</div>
      <div class="card">
        <div class="st1" style="margin-bottom:6px">姓名（必填，老师用来认人）</div>
        <input id="syncNick" class="search" style="width:100%" maxlength="24" placeholder="例如：张小明">
        <div class="st1" style="margin:12px 0 6px">账号名（选填）</div>
        <input id="syncUser" class="search" style="width:100%" maxlength="24" ${attrs} placeholder="建议用手机号，方便记">
        <div class="st1" style="margin:12px 0 6px">密码（选填，填了账号就必填）</div>
        <input id="syncPass" class="search" type="password" style="width:100%" maxlength="64" placeholder="至少 6 位">
        <div class="muted" style="font-size:12px;margin-top:8px">不填账号密码也行——注册会发你一个同步码，凭码登录。</div>
      </div>
      <button class="b3d" onclick="syncDoRegister()">注 册</button>
      <button class="b3d ghost" onclick="syncOpenPanel('login')">已有账号？去登录</button>`;
  } else if (mode === 'cred'){
    h += `<div class="dw" style="font-size:22px;margin-bottom:4px">设置账号密码</div>
      <div class="muted" style="margin-bottom:12px">给当前账号补一个账号名和密码，以后可以不用同步码登录。</div>
      <div class="card">
        <div class="st1" style="margin-bottom:6px">账号名</div>
        <input id="syncUser" class="search" style="width:100%" maxlength="24" ${attrs} placeholder="建议用手机号">
        <div class="st1" style="margin:12px 0 6px">密码</div>
        <input id="syncPass" class="search" type="password" style="width:100%" maxlength="64" placeholder="至少 6 位">
      </div>
      <button class="b3d" onclick="syncSetCred()">保 存</button>
      <button class="b3d ghost" onclick="closeModal()">取 消</button>`;
  } else if (mode === 'backup'){
    const list = syncListBackups();
    h += `<div class="dw" style="font-size:22px;margin-bottom:4px">本机备份</div>
      <div class="muted" style="margin-bottom:12px">同步在覆盖本机进度前会自动留底。选一份可恢复（当前进度也会先备份，不怕点错）。</div>`;
    if (!list.length) h += `<div class="card"><span class="muted">暂无备份。备份会在云端与本机进度合并时自动产生。</span></div>`;
    for (const b of list.slice(0, 8)){
      const bn = (BOOKS.find(x=>x.id===b.book)||{}).name || b.book;
      const t = new Date(b.ts);
      const why = { replaced:'被云端覆盖前', loginlocal:'登录合并前(本机)', logincloud:'登录合并时(云端)', conflictlocal:'冲突落败(本机)', conflictcloud:'冲突落败(云端)', beforerestore:'恢复操作前' }[b.why] || b.why;
      h += `<button class="bookopt" onclick="syncRestoreBackup('${esc(b.key)}')">
        <div class="spread"><b>${esc(bn)}</b><span class="muted">${t.getMonth()+1}/${t.getDate()} ${t.getHours()}:${String(t.getMinutes()).padStart(2,'0')}</span></div>
        <div class="muted" style="font-size:12px;margin-top:2px">${esc(why)}</div></button>`;
    }
    h += `<button class="b3d ghost" style="margin-top:10px" onclick="closeModal()">关 闭</button>`;
  } else {
    h += `<div class="dw" style="font-size:22px;margin-bottom:4px">登录云同步</div>
      <div class="card">
        <div class="st1" style="margin-bottom:6px">方式一：同步码</div>
        <input id="syncCode" class="search" style="width:100%;text-transform:uppercase" maxlength="20" ${attrs} placeholder="HY-XXXX-XXXX">
        <button class="b3d" style="margin-top:10px" onclick="syncDoLoginCode()">用同步码登录</button>
      </div>
      <div class="card">
        <div class="st1" style="margin-bottom:6px">方式二：账号密码</div>
        <input id="syncUser" class="search" style="width:100%" maxlength="24" ${attrs} placeholder="账号名">
        <input id="syncPass" class="search" type="password" style="width:100%;margin-top:8px" maxlength="64" placeholder="密码">
        <button class="b3d" style="margin-top:10px" onclick="syncDoLogin()">登 录</button>
        <div class="muted" style="font-size:12px;margin-top:8px">忘记密码？用同步码登录后可重设。</div>
      </div>
      <button class="b3d ghost" onclick="syncOpenPanel('reg')">没有账号？去注册</button>`;
  }
  $('#sheet').innerHTML = h;
  $('#modal').classList.add('show');
}
function syncCardHtml(){
  const u = syncUser();
  if (!u){
    return `<div class="sec">云同步</div><div class="card">
      <div class="setrow" style="border:none;padding-top:0"><div><div class="st1">进度云同步</div><div class="st2">注册后自动备份到云端，换设备登录即恢复</div></div></div>
      <div class="row2" style="margin-top:8px">
        <button class="b3d" onclick="syncOpenPanel('reg')">注 册</button>
        <button class="b3d line" onclick="syncOpenPanel('login')">登 录</button>
      </div></div>`;
  }
  const t = syncLastOk ? new Date(syncLastOk) : null;
  const timeStr = t ? (t.getHours()+':'+String(t.getMinutes()).padStart(2,'0')) : '—';
  const st = syncLastErr ? `<span style="color:var(--red)">⚠ ${esc(syncLastErr)}</span>` : `上次同步 ${timeStr}`;
  const hasBackups = syncListBackups().length > 0;
  return `<div class="sec">云同步</div><div class="card" id="syncCard">
    <div class="setrow" style="border:none;padding-top:0"><div>
      <div class="st1">${esc(u.nickname)}${u.username ? ' · ' + esc(u.username) : ''}</div>
      <div class="st2">同步码 <b class="num">${esc(u.sync_code)}</b> · <span id="syncStatus">${st}</span></div>
    </div></div>
    <div class="row2" style="margin-top:8px">
      <button class="b3d line" onclick="syncNow()">立即同步</button>
      <button class="b3d ghost" onclick="syncCopyCode()">复制同步码</button>
    </div>
    ${u.username ? '' : `<button class="b3d ghost" style="margin-top:8px" onclick="syncOpenPanel('cred')">设置账号密码（可选）</button>`}
    ${hasBackups ? `<button class="b3d ghost" style="margin-top:8px" onclick="syncOpenPanel('backup')">本机备份恢复</button>` : ''}
    <button class="b3d ghost" style="margin-top:8px" onclick="syncRotateCodeAsk()">更换同步码（泄漏时用）</button>
    <button class="b3d ghost" style="margin-top:8px" onclick="syncLogoutAsk()">退出登录</button>
  </div>`;
}
function syncRefreshCard(){
  const el = document.getElementById('syncStatus');
  if (!el) return;
  const t = syncLastOk ? new Date(syncLastOk) : null;
  const timeStr = t ? (t.getHours()+':'+String(t.getMinutes()).padStart(2,'0')) : '—';
  el.innerHTML = syncLastErr ? `<span style="color:var(--red)">⚠ ${esc(syncLastErr)}</span>` : `上次同步 ${timeStr}`;
}

/* ---------------- 启动与周期任务 ---------------- */
function syncBoot(){
  syncLoadLocal();
  if (syncAuth){
    try { if (typeof petCloudPull==='function') setTimeout(()=>petCloudPull(), 1200); } catch(e){}   // 启动拉宠物
    // 等词书数据就绪后做一次全量核对（含上次没传完的脏数据补传）
    const tryStart = (n)=>{
      if (typeof TOTAL !== 'undefined' && TOTAL > 0){ syncPullCheck(); return; }
      if (n < 30) setTimeout(()=>tryStart(n+1), 500);
    };
    tryStart(0);
  }
  setInterval(()=>{ syncPushDirty(); }, 60 * 1000);
  setInterval(()=>{ if (typeof SES === 'undefined' || !SES) syncPullCheck(); }, 8 * 60 * 1000);
  document.addEventListener('visibilitychange', ()=>{
    if (document.visibilityState === 'hidden'){
      // 离开页面前尽力推送当前词书。keepalive 有 64KB 字节上限(中文按 3 字节估算)，
      // 大档跳过——脏标记已落盘，下次打开会自动补传，不会丢。
      if (!syncAuth) return;
      const id = curBookId;
      const m = syncMeta[id];
      if (!m || !m.dirty) return;
      const raw = syncPushableRaw(id);
      if (raw && raw.length * 3 < 60000){
        const seq0 = m.seq || 0;
        syncApi('sync', { method:'POST', keepalive:true, body:{
          book_id:id, data:raw, updated_at:new Date().toISOString(),
          base_server_at:m.serverAt || null, device:syncDevice() } })
        .then(r => {
          // 页面若还活着(切后台没被杀)，把推送结果记账，避免切回时误判冲突
          if (r && r.ok){
            m.serverAt = r.server_at; m.pushedAt = r.updated_at; m.lastPushTs = Date.now();
            if ((m.seq || 0) === seq0) m.dirty = false;
            syncSaveLocal();
          }
        }).catch(()=>{});
      }
    } else if (document.visibilityState === 'visible'){
      if (syncAuth && (typeof SES === 'undefined' || !SES)) setTimeout(()=>syncPullCheck(), 800);
    }
  });
}
setTimeout(syncBoot, 600);
