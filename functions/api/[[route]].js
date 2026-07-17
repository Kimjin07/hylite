// HY-LITE 云同步后端 · Cloudflare Pages Functions + D1
// 路由: /api/*  绑定: env.DB (D1) / env.ADMIN_KEY (管理员密钥, Pages secret)
//
// 设计原则:
// - 同步码 HY-XXXX-XXXX 是账号的根凭证(注册即得, 可独立登录, 也是忘记密码的找回钥匙)
// - 账号名+密码为可选的第二种登录方式
// - 进度按 (user, book) 存整份 JSON, 只增不删; 服务端永不主动清数据
// - 所有写接口有输入校验和大小上限; 登录类接口有限流

'use strict';

/* ---------------- 工具 ---------------- */
const JSONH = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' };
const ok = (data) => new Response(JSON.stringify({ ok: true, ...data }), { headers: JSONH });
const err = (status, msg) => new Response(JSON.stringify({ ok: false, error: msg }), { status, headers: JSONH });

const MAX_BODY = 1_500_000;        // 请求体上限 1.5MB(单本词书进度实测 < 500KB)
const MAX_DATA = 1_200_000;        // 单本进度 JSON 上限
const BOOK_IDS = new Set(['b3000','prep','basic','core','green','a2','b1','b1p','b2']);
const SESSION_DAYS = 180;          // 会话有效期

function hex(buf){ return [...new Uint8Array(buf)].map(b=>b.toString(16).padStart(2,'0')).join(''); }
function randHex(bytes){ const a=new Uint8Array(bytes); crypto.getRandomValues(a); return hex(a.buffer); }

// 同步码: HY-XXXX-XXXX, 字符集去掉易混淆的 0O1IL
const CODE_CHARS = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
function genSyncCode(){
  const a = new Uint8Array(8); crypto.getRandomValues(a);
  const p = [...a].map(b => CODE_CHARS[b % CODE_CHARS.length]);
  return 'HY-' + p.slice(0,4).join('') + '-' + p.slice(4).join('');
}
function normCode(s){
  if (typeof s !== 'string') return null;
  const t = s.trim().toUpperCase().replace(/[\s-]/g, '');
  if (!/^HY[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{8}$/.test(t)) return null;
  return 'HY-' + t.slice(2,6) + '-' + t.slice(6);
}

async function pbkdf2(password, saltHex, iterations){
  const enc = new TextEncoder();
  const salt = new Uint8Array(saltHex.match(/.{2}/g).map(h=>parseInt(h,16)));
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name:'PBKDF2', hash:'SHA-256', salt, iterations }, key, 256);
  return hex(bits);
}
const PBKDF2_ITER = 10000; // 免费版 Workers 10ms CPU 限制下的稳妥值; 场景为学习进度, 非高价值凭证

function timingSafeEqual(a, b){
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

/* ---------------- 限流(D1) ---------------- */
async function rateLimit(env, key, limit, windowSec){
  const now = Date.now();
  const row = await env.DB.prepare('SELECT count, window_start FROM rate_limits WHERE rl_key=?1').bind(key).first();
  if (row){
    const start = Date.parse(row.window_start);
    if (now - start < windowSec * 1000){
      if (row.count >= limit) return false;
      await env.DB.prepare('UPDATE rate_limits SET count=count+1 WHERE rl_key=?1').bind(key).run();
      return true;
    }
  }
  await env.DB.prepare(
    'INSERT INTO rate_limits (rl_key,count,window_start) VALUES (?1,1,?2) ON CONFLICT(rl_key) DO UPDATE SET count=1, window_start=?2'
  ).bind(key, new Date(now).toISOString()).run();
  return true;
}
function clientIp(request){
  return request.headers.get('CF-Connecting-IP') || 'unknown';
}

/* ---------------- 会话 ---------------- */
async function createSession(env, userId){
  const token = randHex(32);
  await env.DB.prepare('INSERT INTO sessions (token,user_id,last_used) VALUES (?1,?2,datetime(\'now\'))').bind(token, userId).run();
  return token;
}
async function authUser(env, request){
  const h = request.headers.get('Authorization') || '';
  const m = h.match(/^Bearer ([0-9a-f]{64})$/);
  if (!m) return null;
  const row = await env.DB.prepare(
    `SELECT s.token, s.user_id, u.sync_code, u.username, u.nickname
     FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token=?1 AND s.created_at > datetime('now', ?2)`
  ).bind(m[1], `-${SESSION_DAYS} days`).first();
  if (!row) return null;
  // last_used 低频更新(每次都写太费写额度)
  if (Math.random() < 0.1){
    await env.DB.prepare('UPDATE sessions SET last_used=datetime(\'now\') WHERE token=?1').bind(row.token).run();
    await env.DB.prepare('UPDATE users SET last_seen=datetime(\'now\') WHERE id=?1').bind(row.user_id).run();
  }
  return row;
}
function publicUser(u){
  return { sync_code: u.sync_code, username: u.username || null, nickname: u.nickname };
}

/* ---------------- 输入校验 ---------------- */
function validNickname(s){
  return typeof s === 'string' && s.trim().length >= 1 && s.trim().length <= 24 && !/[<>"'`\\]/.test(s);
}
function validUsername(s){
  return typeof s === 'string' && /^[A-Za-z0-9_一-鿿-]{2,24}$/.test(s);
}
function validPassword(s){
  return typeof s === 'string' && s.length >= 6 && s.length <= 64;
}
async function readJson(request){
  const len = Number(request.headers.get('content-length') || 0);
  if (len > MAX_BODY) return null;
  try { return await request.json(); } catch (e) { return null; }
}

/* ---------------- 主路由 ---------------- */
export async function onRequest(context){
  const { request, env, params } = context;
  const path = '/' + (Array.isArray(params.route) ? params.route.join('/') : (params.route || ''));
  const method = request.method;

  try {
    if (method === 'OPTIONS') return new Response(null, { status: 204 }); // 同源部署, 无需 CORS 头

    /* ---- 健康检查 ---- */
    if (path === '/health' && method === 'GET') return ok({ ts: new Date().toISOString() });

    /* ---- 注册 ---- */
    if (path === '/register' && method === 'POST'){
      if (!await rateLimit(env, 'reg|' + clientIp(request), 10, 3600)) return err(429, '注册太频繁，请稍后再试');
      const b = await readJson(request);
      if (!b) return err(400, '请求格式错误');
      if (!validNickname(b.nickname)) return err(400, '请填写姓名（1-24字，不含特殊符号）');
      const nickname = b.nickname.trim();

      let username = null, passHash = null, passSalt = null;
      if (b.username || b.password){
        if (!validUsername(b.username)) return err(400, '账号名需 2-24 位（字母/数字/汉字/下划线）');
        if (!validPassword(b.password)) return err(400, '密码需 6-64 位');
        username = b.username.trim();
        const exist = await env.DB.prepare('SELECT id FROM users WHERE username=?1').bind(username).first();
        if (exist) return err(409, '该账号名已被使用，换一个吧');
        passSalt = randHex(16);
        passHash = await pbkdf2(b.password, passSalt, PBKDF2_ITER);
      }

      // 生成不冲突的同步码(碰撞概率极低, 兜底重试)
      let syncCode = null;
      for (let i = 0; i < 5; i++){
        const c = genSyncCode();
        const dup = await env.DB.prepare('SELECT id FROM users WHERE sync_code=?1').bind(c).first();
        if (!dup){ syncCode = c; break; }
      }
      if (!syncCode) return err(500, '系统繁忙，请重试');

      let ins;
      try {
        ins = await env.DB.prepare(
          'INSERT INTO users (sync_code,username,pass_hash,pass_salt,nickname,last_seen) VALUES (?1,?2,?3,?4,?5,datetime(\'now\'))'
        ).bind(syncCode, username, passHash, passSalt, nickname).run();
      } catch (e) {
        if (String(e).includes('UNIQUE')) return err(409, '该账号名已被使用，换一个吧');
        throw e;
      }
      const userId = ins.meta.last_row_id;
      const token = await createSession(env, userId);
      return ok({ token, user: { sync_code: syncCode, username, nickname } });
    }

    /* ---- 登录: 账号密码 ---- */
    if (path === '/login' && method === 'POST'){
      const b = await readJson(request);
      if (!b || !validUsername(b.username || '') || typeof b.password !== 'string') return err(400, '请输入账号和密码');
      const rlKey = 'login|' + clientIp(request) + '|' + b.username;
      if (!await rateLimit(env, rlKey, 10, 600)) return err(429, '尝试太多次，请 10 分钟后再试');
      const u = await env.DB.prepare('SELECT * FROM users WHERE username=?1').bind(b.username.trim()).first();
      if (!u || !u.pass_hash) return err(401, '账号或密码不对');
      const h = await pbkdf2(b.password, u.pass_salt, PBKDF2_ITER);
      if (!timingSafeEqual(h, u.pass_hash)) return err(401, '账号或密码不对');
      const token = await createSession(env, u.id);
      return ok({ token, user: publicUser(u) });
    }

    /* ---- 登录: 同步码 ---- */
    if (path === '/login-code' && method === 'POST'){
      const b = await readJson(request);
      const code = b && normCode(b.sync_code);
      if (!code) return err(400, '同步码格式不对（形如 HY-XXXX-XXXX）');
      if (!await rateLimit(env, 'code|' + clientIp(request), 15, 600)) return err(429, '尝试太多次，请 10 分钟后再试');
      const u = await env.DB.prepare('SELECT * FROM users WHERE sync_code=?1').bind(code).first();
      if (!u) return err(401, '同步码不存在，请检查是否输错');
      const token = await createSession(env, u.id);
      return ok({ token, user: publicUser(u) });
    }

    /* ---- 以下都需要登录 ---- */
    if (path === '/me' && method === 'GET'){
      const s = await authUser(env, request);
      if (!s) return err(401, '未登录');
      return ok({ user: publicUser(s) });
    }

    if (path === '/logout' && method === 'POST'){
      const s = await authUser(env, request);
      if (s) await env.DB.prepare('DELETE FROM sessions WHERE token=?1').bind(s.token).run();
      return ok({});
    }

    /* ---- 设置/修改 账号密码(登录后补设或改密) ---- */
    if (path === '/set-credentials' && method === 'POST'){
      const s = await authUser(env, request);
      if (!s) return err(401, '未登录');
      const b = await readJson(request);
      if (!b || !validUsername(b.username || '')) return err(400, '账号名需 2-24 位（字母/数字/汉字/下划线）');
      if (!validPassword(b.password || '')) return err(400, '密码需 6-64 位');
      const username = b.username.trim();
      const exist = await env.DB.prepare('SELECT id FROM users WHERE username=?1 AND id<>?2').bind(username, s.user_id).first();
      if (exist) return err(409, '该账号名已被使用，换一个吧');
      const salt = randHex(16);
      const hash = await pbkdf2(b.password, salt, PBKDF2_ITER);
      await env.DB.prepare('UPDATE users SET username=?1, pass_hash=?2, pass_salt=?3 WHERE id=?4')
        .bind(username, hash, salt, s.user_id).run();
      return ok({ user: { sync_code: s.sync_code, username, nickname: s.nickname } });
    }

    /* ---- 进度: 上传(按词书整份覆盖, 服务端记录双时间) ---- */
    if (path === '/sync' && method === 'POST'){
      const s = await authUser(env, request);
      if (!s) return err(401, '未登录');
      const b = await readJson(request);
      if (!b || !BOOK_IDS.has(b.book_id)) return err(400, '词书标识不对');
      if (typeof b.data !== 'string' || b.data.length === 0 || b.data.length > MAX_DATA) return err(400, '进度数据超限或为空');
      try { const parsed = JSON.parse(b.data); if (!parsed || typeof parsed !== 'object' || !parsed.w) return err(400, '进度数据结构不对'); }
      catch(e){ return err(400, '进度数据不是有效 JSON'); }
      const updatedAt = (typeof b.updated_at === 'string' && !isNaN(Date.parse(b.updated_at))) ? b.updated_at : new Date().toISOString();
      const serverAt = new Date().toISOString();
      const device = typeof b.device === 'string' ? b.device.slice(0, 64) : null;
      await env.DB.prepare(
        `INSERT INTO progress (user_id,book_id,data,updated_at,server_at,device) VALUES (?1,?2,?3,?4,?5,?6)
         ON CONFLICT(user_id,book_id) DO UPDATE SET data=?3, updated_at=?4, server_at=?5, device=?6`
      ).bind(s.user_id, b.book_id, b.data, updatedAt, serverAt, device).run();
      return ok({ updated_at: updatedAt, server_at: serverAt });
    }

    /* ---- 进度: 拉取单本 ---- */
    if (path === '/sync' && method === 'GET'){
      const s = await authUser(env, request);
      if (!s) return err(401, '未登录');
      const book = new URL(request.url).searchParams.get('book');
      if (!BOOK_IDS.has(book)) return err(400, '词书标识不对');
      const row = await env.DB.prepare('SELECT data, updated_at, server_at, device FROM progress WHERE user_id=?1 AND book_id=?2')
        .bind(s.user_id, book).first();
      if (!row) return ok({ exists: false });
      return ok({ exists: true, data: row.data, updated_at: row.updated_at, server_at: row.server_at, device: row.device });
    }

    /* ---- 进度: 各词书云端元信息(启动时判断要不要拉) ---- */
    if (path === '/sync-meta' && method === 'GET'){
      const s = await authUser(env, request);
      if (!s) return err(401, '未登录');
      const rows = await env.DB.prepare('SELECT book_id, updated_at, server_at, length(data) AS size FROM progress WHERE user_id=?1')
        .bind(s.user_id).all();
      return ok({ books: rows.results || [] });
    }

    /* ---- 管理员接口 ---- */
    if (path.startsWith('/admin/')){
      const key = request.headers.get('X-Admin-Key') || '';
      if (!env.ADMIN_KEY || !timingSafeEqual(key, env.ADMIN_KEY)){
        if (!await rateLimit(env, 'admin|' + clientIp(request), 10, 600)) return err(429, '尝试太多次');
        return err(401, '管理员密钥不对');
      }

      if (path === '/admin/users' && method === 'GET'){
        const rows = await env.DB.prepare(
          `SELECT u.id, u.nickname, u.username, u.sync_code, u.created_at, u.last_seen,
                  COUNT(p.book_id) AS books, MAX(p.server_at) AS last_sync
           FROM users u LEFT JOIN progress p ON p.user_id = u.id
           GROUP BY u.id ORDER BY u.created_at DESC LIMIT 1000`
        ).all();
        return ok({ users: rows.results || [] });
      }

      if (path === '/admin/user' && method === 'GET'){
        const id = Number(new URL(request.url).searchParams.get('id'));
        if (!Number.isInteger(id) || id <= 0) return err(400, 'id 不对');
        const u = await env.DB.prepare('SELECT id,nickname,username,sync_code,created_at,last_seen FROM users WHERE id=?1').bind(id).first();
        if (!u) return err(404, '用户不存在');
        const p = await env.DB.prepare('SELECT book_id, data, updated_at, server_at, device FROM progress WHERE user_id=?1').bind(id).all();
        // 提炼每本书的关键指标, 也附原始数据
        const books = (p.results || []).map(r => {
          let stat = null;
          try {
            const d = JSON.parse(r.data);
            let seen = 0, master = 0, zhan = 0;
            for (const k in (d.w || {})){ const st = d.w[k];
              if (st.z){ zhan++; seen++; continue; }
              if ((st.s|0) > 0){ seen++; if ((st.b|0) >= 5) master++; } }
            stat = { seen, master, zhan, xp: d.xp|0, checkins: Object.keys(d.ck||{}).length };
          } catch(e){}
          return { book_id: r.book_id, updated_at: r.updated_at, server_at: r.server_at, device: r.device, stat, data: r.data };
        });
        return ok({ user: u, books });
      }

      return err(404, '接口不存在');
    }

    return err(404, '接口不存在');
  } catch (e) {
    return err(500, '服务器开小差了，请稍后再试');
  }
}
