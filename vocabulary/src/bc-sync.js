'use strict';
/* ================= 云同步（可选功能，未登录时完全不影响原有使用） =================
 * 账号体系：同步码 HY-XXXX-XXXX 为根凭证（注册即得、可直接登录、忘记密码的找回钥匙）；
 *          账号名+密码为可选的第二种登录方式。
 * 同步策略：离线优先。本地 localStorage 永远是主副本，云端是镜像备份；
 *          同步失败静默重试，绝不打断学习；应用云端数据前先把本地旧档备份到 localStorage。
 */

const SYNC_AUTH_KEY = 'hylite_sync_auth';
const SYNC_META_KEY = 'hylite_sync_meta';

let syncAuth = null;      // {token, user:{sync_code, username, nickname}}
let syncMeta = {};        // { bookId: {serverAt, pushedAt, dirty} }
let syncBusy = false;
let syncApplying = false; // 应用云端数据时不把 save() 记为脏
let syncLastOk = null, syncLastErr = null;
let syncPushT = null;

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

/* ---------------- API ---------------- */
async function syncApi(path, opts){
  opts = opts || {};
  const headers = { 'Content-Type': 'application/json' };
  if (syncAuth && syncAuth.token) headers['Authorization'] = 'Bearer ' + syncAuth.token;
  let res;
  try {
    res = await fetch('/api/' + path, {
      method: opts.method || 'GET',
      headers,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
      keepalive: !!opts.keepalive,
    });
  } catch(e){ return { ok:false, error:'网络连不上', _net:true }; }
  let j; try { j = await res.json(); } catch(e){ j = { ok:false, error:'服务响应异常' }; }
  if (res.status === 401 && syncAuth && path !== 'logout' && !path.startsWith('login')){
    // 会话失效：清除登录态但绝不动本地进度
    syncAuth = null; syncSaveLocal();
    try { toast('云同步登录已过期，请重新登录'); } catch(e){}
    if (!screen) try { render(); } catch(e){}
  }
  return j;
}

/* ---------------- 进度读写与判空 ---------------- */
function syncBookRaw(id){
  if (id === curBookId) { try { return JSON.stringify(S); } catch(e){ return null; } }
  try { return (store() && store().getItem(KEY_BASE + '__' + id)) || null; } catch(e){ return null; }
}
function syncIsEmpty(raw){
  if (!raw) return true;
  try {
    const d = JSON.parse(raw);
    if (!d || typeof d !== 'object') return true;
    return Object.keys(d.w || {}).length === 0 && !(d.xp > 0) && Object.keys(d.ck || {}).length === 0;
  } catch(e){ return true; }
}
function syncScore(d){ // 冲突时比较"谁的进度多"：XP 为主，已学词数为辅
  let seen = 0; for (const k in (d.w || {})){ const st = d.w[k]; if (st && (st.s > 0 || st.z)) seen++; }
  return (d.xp|0) * 1000000 + seen;
}
function syncBackup(id, raw, why){
  try { store() && store().setItem('hylite_sync_backup__' + id + '__' + why, raw); } catch(e){}
}

/* ---------------- 推送 ---------------- */
async function syncPushBook(id){
  if (!syncAuth) return false;
  const raw = syncBookRaw(id);
  if (!raw || syncIsEmpty(raw)) { if (syncMeta[id]) { syncMeta[id].dirty = false; syncSaveLocal(); } return false; }
  const r = await syncApi('sync', { method:'POST', body:{ book_id:id, data:raw, updated_at:new Date().toISOString(), device:syncDevice() } });
  if (r.ok){
    syncMeta[id] = { serverAt: r.server_at, pushedAt: r.updated_at, dirty: false };
    syncLastOk = Date.now(); syncLastErr = null; syncSaveLocal();
    return true;
  }
  if (!r._net) syncLastErr = r.error || '同步失败';
  return false;
}
async function syncPushDirty(){
  if (!syncAuth || syncBusy) return;
  syncBusy = true;
  try {
    for (const id of Object.keys(syncMeta)){
      if (syncMeta[id] && syncMeta[id].dirty) await syncPushBook(id);
    }
  } finally { syncBusy = false; }
  syncRefreshCard();
}
async function syncPushAllLocal(){ // 注册/登录后：把本地已有进度的书全部传上去（云端没有的）
  for (const b of BOOKS){
    const raw = syncBookRaw(b.id);
    if (raw && !syncIsEmpty(raw) && !(syncMeta[b.id] && syncMeta[b.id].serverAt)) await syncPushBook(b.id);
  }
}

/* ---------------- 拉取与冲突处理 ---------------- */
async function syncApplyCloud(id, r){
  let cloud; try { cloud = JSON.parse(r.data); } catch(e){ return false; }
  if (!cloud || typeof cloud !== 'object' || !cloud.w) return false;
  if (typeof SES !== 'undefined' && SES) return false;   // 训练会话中绝不替换存档
  const oldRaw = syncBookRaw(id);
  if (oldRaw && !syncIsEmpty(oldRaw)) syncBackup(id, oldRaw, 'replaced');
  syncApplying = true;
  try {
    if (id === curBookId){
      S = cloud; save(); todayPlan();
      if (!screen) try { render(); } catch(e){}
    } else {
      try { store() && store().setItem(KEY_BASE + '__' + id, JSON.stringify(cloud)); } catch(e){}
    }
  } finally { syncApplying = false; }
  syncMeta[id] = { serverAt: r.server_at, pushedAt: r.updated_at, dirty: false };
  syncSaveLocal();
  return true;
}
async function syncPullCheck(){
  if (!syncAuth || syncBusy) return;
  syncBusy = true;
  try {
    const meta = await syncApi('sync-meta');
    if (!meta.ok){ if (!meta._net) syncLastErr = meta.error; return; }
    const cloudBooks = {};
    for (const b of (meta.books || [])) cloudBooks[b.book_id] = b;

    for (const bid of Object.keys(cloudBooks)){
      const cb = cloudBooks[bid];
      const known = (syncMeta[bid] || {}).serverAt;
      const dirty = !!(syncMeta[bid] || {}).dirty;
      const raw = syncBookRaw(bid);
      const cloudNew = cb.server_at !== known;

      if (!cloudNew && !dirty) continue;
      if (!cloudNew && dirty){ await syncPushBook(bid); continue; }

      // 云端有新数据
      const r = await syncApi('sync?book=' + bid);
      if (!r.ok || !r.exists) continue;

      if (syncIsEmpty(raw) || !dirty){ await syncApplyCloud(bid, r); continue; }

      // 双边都有新改动 → 保留进度多的一方，另一方备份
      let cloudD = null, localD = null;
      try { cloudD = JSON.parse(r.data); localD = JSON.parse(raw); } catch(e){}
      if (!cloudD || !localD){ await syncPushBook(bid); continue; }
      if (syncScore(cloudD) > syncScore(localD)){
        syncBackup(bid, raw, 'conflict-local');
        const applied = await syncApplyCloud(bid, r);
        if (applied) try { toast('检测到另一台设备的更新，已采用进度较多的一份'); } catch(e){}
      } else {
        syncBackup(bid, r.data, 'conflict-cloud');
        await syncPushBook(bid);
      }
    }
    syncLastOk = Date.now(); syncLastErr = null; syncSaveLocal();
  } finally { syncBusy = false; }
  syncRefreshCard();
}

/* ---------------- 存档/切书钩子（bc-core 调用） ---------------- */
function syncOnSave(){
  if (!syncAuth || syncApplying) return;
  const m = syncMeta[curBookId] || (syncMeta[curBookId] = {});
  m.dirty = true;
  clearTimeout(syncPushT);
  syncPushT = setTimeout(()=>{ syncPushDirty(); }, 6000);   // 改动后 6 秒静默推送
}
function syncOnBookSwitch(){
  if (!syncAuth) return;
  setTimeout(()=>{ syncPullCheck(); }, 400);
}

/* ---------------- 手动操作 ---------------- */
async function syncNow(){
  if (!syncAuth){ try { toast('请先登录云同步'); } catch(e){} return; }
  try { toast('同步中…'); } catch(e){}
  const m = syncMeta[curBookId] || (syncMeta[curBookId] = {});
  m.dirty = true;
  await syncPushDirty();
  await syncPullCheck();
  try { toast(syncLastErr ? ('⚠ ' + syncLastErr) : '✔ 同步完成'); } catch(e){}
  if (!screen && tab === 4) render();
}

/* ---------------- 登录/注册/退出 ---------------- */
async function syncDoRegister(){
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
    <div class="card" style="text-align:center"><div class="num" style="font-size:30px;font-weight:900;letter-spacing:2px" id="syncCodeShow">${esc(r.user.sync_code)}</div></div>
    <button class="b3d" onclick="syncCopyCode()">复制同步码</button>
    <button class="b3d ghost" onclick="closeModal();go(4)">我已保存，完成</button>`;
  $('#modal').classList.add('show');
  await syncPushAllLocal();            // 把本机已有进度全部传上云
  await syncPullCheck();
}
async function syncDoLogin(){
  const user = (($('#syncUser') || {}).value || '').trim();
  const pass = ($('#syncPass') || {}).value || '';
  if (!user || !pass){ toast('请输入账号和密码'); return; }
  const r = await syncApi('login', { method:'POST', body:{ username:user, password:pass } });
  if (!r.ok){ toast('⚠ ' + (r.error || '登录失败')); return; }
  await syncAfterLogin(r);
}
async function syncDoLoginCode(){
  const code = (($('#syncCode') || {}).value || '').trim();
  if (!code){ toast('请输入同步码'); return; }
  const r = await syncApi('login-code', { method:'POST', body:{ sync_code:code } });
  if (!r.ok){ toast('⚠ ' + (r.error || '登录失败')); return; }
  await syncAfterLogin(r);
}
async function syncAfterLogin(r){
  syncAuth = { token: r.token, user: r.user };
  syncMeta = {}; syncSaveLocal();
  closeModal();
  toast('✔ 已登录，正在同步…');
  await syncPullCheck();       // 先拉云端（新设备恢复的主路径）
  await syncPushAllLocal();    // 再把本机独有的书传上去
  toast('✔ 同步完成');
  go(4);
}
function syncLogoutAsk(){
  ask('退出云同步登录？\n本机进度不受影响，只是不再自动同步。', async ()=>{
    await syncApi('logout', { method:'POST' });
    syncAuth = null; syncMeta = {}; syncSaveLocal();
    toast('已退出云同步'); render();
  }, '退 出');
}
async function syncSetCred(){
  const user = (($('#syncUser') || {}).value || '').trim();
  const pass = ($('#syncPass') || {}).value || '';
  if (!user || !pass){ toast('请输入账号和密码'); return; }
  const r = await syncApi('set-credentials', { method:'POST', body:{ username:user, password:pass } });
  if (!r.ok){ toast('⚠ ' + (r.error || '设置失败')); return; }
  syncAuth.user = r.user; syncSaveLocal();
  closeModal(); toast('✔ 账号密码已设置'); render();
}
function syncCopyCode(){
  const u = syncUser(); if (!u) return;
  try { navigator.clipboard.writeText(u.sync_code).then(()=>toast('已复制同步码')); }
  catch(e){ toast(u.sync_code); }
}

/* ---------------- UI ---------------- */
function syncOpenPanel(mode){
  modalK = null;
  let h = `<div class="grab"></div>`;
  if (mode === 'reg'){
    h += `<div class="dw" style="font-size:22px;margin-bottom:4px">注册云同步</div>
      <div class="muted" style="margin-bottom:12px">注册后进度自动存到云端，换手机、换电脑输同步码就能接着学。</div>
      <div class="card">
        <div class="st1" style="margin-bottom:6px">姓名（必填，老师用来认人）</div>
        <input id="syncNick" class="search" style="width:100%" maxlength="24" placeholder="例如：张小明">
        <div class="st1" style="margin:12px 0 6px">账号名（选填）</div>
        <input id="syncUser" class="search" style="width:100%" maxlength="24" placeholder="建议用手机号，方便记">
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
        <input id="syncUser" class="search" style="width:100%" maxlength="24" placeholder="建议用手机号">
        <div class="st1" style="margin:12px 0 6px">密码</div>
        <input id="syncPass" class="search" type="password" style="width:100%" maxlength="64" placeholder="至少 6 位">
      </div>
      <button class="b3d" onclick="syncSetCred()">保 存</button>
      <button class="b3d ghost" onclick="closeModal()">取 消</button>`;
  } else {
    h += `<div class="dw" style="font-size:22px;margin-bottom:4px">登录云同步</div>
      <div class="card">
        <div class="st1" style="margin-bottom:6px">方式一：同步码</div>
        <input id="syncCode" class="search" style="width:100%;text-transform:uppercase" maxlength="14" placeholder="HY-XXXX-XXXX">
        <button class="b3d" style="margin-top:10px" onclick="syncDoLoginCode()">用同步码登录</button>
      </div>
      <div class="card">
        <div class="st1" style="margin-bottom:6px">方式二：账号密码</div>
        <input id="syncUser" class="search" style="width:100%" maxlength="24" placeholder="账号名">
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
      <div class="setrow" style="border:none;padding-top:0"><div><div class="st1">进度云同步</div><div class="st2">注册后自动备份到云端，换设备扫码即恢复，不怕清缓存</div></div></div>
      <div class="row2" style="margin-top:8px">
        <button class="b3d" onclick="syncOpenPanel('reg')">注 册</button>
        <button class="b3d sec" onclick="syncOpenPanel('login')">登 录</button>
      </div></div>`;
  }
  const t = syncLastOk ? new Date(syncLastOk) : null;
  const timeStr = t ? (t.getHours()+':'+String(t.getMinutes()).padStart(2,'0')) : '—';
  const st = syncLastErr ? `<span style="color:var(--red)">⚠ ${esc(syncLastErr)}</span>` : `上次同步 ${timeStr}`;
  return `<div class="sec">云同步</div><div class="card" id="syncCard">
    <div class="setrow" style="border:none;padding-top:0"><div>
      <div class="st1">${esc(u.nickname)}${u.username ? ' · ' + esc(u.username) : ''}</div>
      <div class="st2">同步码 <b class="num">${esc(u.sync_code)}</b> · <span id="syncStatus">${st}</span></div>
    </div></div>
    <div class="row2" style="margin-top:8px">
      <button class="b3d sec" onclick="syncNow()">立即同步</button>
      <button class="b3d ghost" onclick="syncCopyCode()">复制同步码</button>
    </div>
    ${u.username ? '' : `<button class="b3d ghost" style="margin-top:8px" onclick="syncOpenPanel('cred')">设置账号密码（可选）</button>`}
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
    // 等词书数据就绪后做一次全量核对
    const tryStart = (n)=>{
      if (typeof TOTAL !== 'undefined' && TOTAL > 0){ syncPullCheck(); return; }
      if (n < 20) setTimeout(()=>tryStart(n+1), 500);
    };
    tryStart(0);
  }
  setInterval(()=>{ syncPushDirty(); }, 45 * 1000);
  setInterval(()=>{ if (!SES) syncPullCheck(); }, 8 * 60 * 1000);
  document.addEventListener('visibilitychange', ()=>{
    if (document.visibilityState === 'hidden'){
      // 离开页面前尽力推送（keepalive 保证请求存活）
      if (!syncAuth) return;
      for (const id of Object.keys(syncMeta)){
        if (syncMeta[id] && syncMeta[id].dirty){
          const raw = syncBookRaw(id);
          if (raw && !syncIsEmpty(raw)){
            syncApi('sync', { method:'POST', keepalive:true, body:{ book_id:id, data:raw, updated_at:new Date().toISOString(), device:syncDevice() } });
          }
        }
      }
    } else if (document.visibilityState === 'visible'){
      if (syncAuth && !SES) setTimeout(()=>syncPullCheck(), 800);
    }
  });
}
setTimeout(syncBoot, 600);
