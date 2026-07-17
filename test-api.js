// 云同步后端全量测试 · 对着 wrangler pages dev (http://localhost:8788) 跑
// 用法: node test-api.js [baseUrl] [adminKey]
'use strict';
const BASE = process.argv[2] || 'http://localhost:8788';
const ADMIN = process.argv[3] || 'local-test-admin-key-123';

let pass = 0, fail = 0;
const failures = [];
function check(name, cond, extra){
  if (cond){ pass++; console.log('  ✔ ' + name); }
  else { fail++; failures.push(name + (extra ? ' :: ' + extra : '')); console.log('  ✘ ' + name + (extra ? '  ← ' + extra : '')); }
}
async function api(path, { method='GET', body, token, admin, raw } = {}){
  const headers = {};
  if (body !== undefined && !raw) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = 'Bearer ' + token;
  if (admin) headers['X-Admin-Key'] = admin;
  const res = await fetch(BASE + '/api/' + path, {
    method, headers,
    body: body === undefined ? undefined : (raw ? body : JSON.stringify(body)),
  });
  let j = null; try { j = await res.json(); } catch(e){}
  return { status: res.status, j };
}
const S1 = { v:3, w:{ 'B01:0':{b:2,due:'2026-07-20',s:1,ng:0,cs:1} }, log:{}, ck:{'2026-07-16':1}, ach:{}, xp:120, best:{}, plan:{mode:'count',quota:50,units:1}, today:null, cfg:{theme:'auto',voice:1,auto:true,sfx:true,pal:'ink'} };
const S2 = { ...S1, xp: 500, w:{ 'B01:0':{b:3,due:'2026-07-22',s:1,ng:0,cs:2}, 'B01:1':{b:1,due:'2026-07-18',s:1,ng:0,cs:1} } };

(async () => {
  console.log('== 健康检查 ==');
  { const r = await api('health'); check('GET /health 200', r.status===200 && r.j.ok); }

  console.log('== 注册：仅同步码 ==');
  let uA;
  { const r = await api('register', { method:'POST', body:{ nickname:'测试学生A' } });
    check('注册成功', r.status===200 && r.j.ok, JSON.stringify(r.j));
    check('返回 token', !!(r.j.token && r.j.token.length===64));
    check('同步码格式 HY-XXXX-XXXX', /^HY-[2-9A-HJKMNP-Z]{4}-[2-9A-HJKMNP-Z]{4}$/.test(r.j.user?.sync_code||''), r.j.user?.sync_code);
    check('无账号名', r.j.user?.username === null || r.j.user?.username === undefined);
    uA = r.j; }

  console.log('== 注册：带账号密码 ==');
  let uB;
  { const r = await api('register', { method:'POST', body:{ nickname:'测试学生B', username:'student_b', password:'pass123456' } });
    check('注册成功', r.status===200 && r.j.ok, JSON.stringify(r.j));
    uB = r.j; }
  { const r = await api('register', { method:'POST', body:{ nickname:'重名尝试', username:'student_b', password:'x1234567' } });
    check('重复账号名被拒 409', r.status===409, String(r.status)); }

  console.log('== 注册：输入校验 ==');
  { const r = await api('register', { method:'POST', body:{ nickname:'' } });
    check('空姓名被拒', r.status===400); }
  { const r = await api('register', { method:'POST', body:{ nickname:'<script>x' } });
    check('姓名含特殊字符被拒', r.status===400); }
  { const r = await api('register', { method:'POST', body:{ nickname:'只填账号', username:'onlyuser' } });
    check('只填账号不填密码被拒', r.status===400); }
  { const r = await api('register', { method:'POST', body:{ nickname:'短密码', username:'shortpw', password:'123' } });
    check('密码太短被拒', r.status===400); }
  { const r = await api('register', { method:'POST', body:'not json', raw:true });
    check('非 JSON 请求体被拒', r.status===400); }

  console.log('== 登录：账号密码 ==');
  { const r = await api('login', { method:'POST', body:{ username:'student_b', password:'wrongpass' } });
    check('错误密码 401', r.status===401); }
  { const r = await api('login', { method:'POST', body:{ username:'no_such_user', password:'whatever123' } });
    check('不存在账号 401', r.status===401); }
  let tokenB2;
  { const r = await api('login', { method:'POST', body:{ username:'student_b', password:'pass123456' } });
    check('正确密码登录成功', r.status===200 && r.j.ok);
    check('返回用户信息', r.j.user?.nickname === '测试学生B');
    tokenB2 = r.j.token; }

  console.log('== 登录：同步码 ==');
  { const r = await api('login-code', { method:'POST', body:{ sync_code:'HY-2222-3333' } });
    check('不存在的同步码 401', r.status===401); }
  { const r = await api('login-code', { method:'POST', body:{ sync_code:'bad-format' } });
    check('格式错误 400', r.status===400); }
  let tokenA2;
  { const code = uA.user.sync_code;
    const messy = code.toLowerCase().replace(/-/g, ' ');   // 容错：小写+空格
    const r = await api('login-code', { method:'POST', body:{ sync_code: messy } });
    check('同步码登录成功(容错输入)', r.status===200 && r.j.ok, JSON.stringify(r.j));
    tokenA2 = r.j.token; }

  console.log('== 会话 ==');
  { const r = await api('me', { token: uA.token }); check('注册 token 有效', r.status===200 && r.j.user?.nickname==='测试学生A'); }
  { const r = await api('me', { token: 'f'.repeat(64) }); check('伪造 token 401', r.status===401); }
  { const r = await api('me'); check('无 token 401', r.status===401); }

  console.log('== 进度同步 ==');
  { const r = await api('sync', { method:'POST', token:uA.token, body:{ book_id:'b1', data:JSON.stringify(S1), updated_at:new Date().toISOString(), device:'test' } });
    check('上传进度成功', r.status===200 && r.j.ok, JSON.stringify(r.j));
    check('返回 server_at', !!r.j.server_at); }
  { const r = await api('sync?book=b1', { token:uA.token });
    check('拉取进度成功', r.status===200 && r.j.exists);
    const d = JSON.parse(r.j.data); check('数据完整往返', d.xp===120 && d.w['B01:0'].b===2); }
  { const r = await api('sync', { method:'POST', token:uA.token, body:{ book_id:'b1', data:JSON.stringify(S2) } });
    check('覆盖更新成功', r.status===200); }
  { const r = await api('sync?book=b1', { token:uA.token });
    const d = JSON.parse(r.j.data); check('更新后取回新数据', d.xp===500 && Object.keys(d.w).length===2); }
  { const r = await api('sync?book=b3000', { token:uA.token });
    check('未同步过的书 exists=false', r.status===200 && r.j.exists===false); }
  { const r = await api('sync-meta', { token:uA.token });
    check('sync-meta 返回列表', r.status===200 && Array.isArray(r.j.books) && r.j.books.length===1 && r.j.books[0].book_id==='b1'); }

  console.log('== 进度同步：校验与防护 ==');
  { const r = await api('sync', { method:'POST', token:uA.token, body:{ book_id:'evil', data:JSON.stringify(S1) } });
    check('非法词书 id 被拒', r.status===400); }
  { const r = await api('sync', { method:'POST', token:uA.token, body:{ book_id:'b1', data:'not json at all' } });
    check('非 JSON 进度被拒', r.status===400); }
  { const r = await api('sync', { method:'POST', token:uA.token, body:{ book_id:'b1', data:JSON.stringify({hello:1}) } });
    check('缺 w 字段的进度被拒', r.status===400); }
  { const big = JSON.stringify({ w:{}, pad:'x'.repeat(1_300_000) });
    const r = await api('sync', { method:'POST', token:uA.token, body:{ book_id:'b1', data:big } });
    check('超大进度被拒', r.status===400, String(r.status)); }
  { const r = await api('sync', { method:'POST', body:{ book_id:'b1', data:JSON.stringify(S1) } });
    check('未登录上传被拒', r.status===401); }
  { const r = await api('sync?book=b1', { token: tokenB2 });
    check('用户隔离：B 看不到 A 的进度', r.status===200 && r.j.exists===false); }

  console.log('== 补设账号密码 ==');
  { const r = await api('set-credentials', { method:'POST', token: tokenA2, body:{ username:'student_a', password:'apass12345' } });
    check('补设成功', r.status===200 && r.j.ok, JSON.stringify(r.j)); }
  { const r = await api('login', { method:'POST', body:{ username:'student_a', password:'apass12345' } });
    check('新账号密码可登录', r.status===200 && r.j.user?.sync_code===uA.user.sync_code); }
  { const r = await api('set-credentials', { method:'POST', token: tokenA2, body:{ username:'student_b', password:'whatever12' } });
    check('占用他人账号名被拒 409', r.status===409); }

  console.log('== 登出 ==');
  { const r = await api('logout', { method:'POST', token: tokenA2 }); check('登出成功', r.status===200); }
  { const r = await api('me', { token: tokenA2 }); check('登出后 token 失效', r.status===401); }
  { const r = await api('me', { token: uA.token }); check('其他会话不受影响', r.status===200); }

  console.log('== 管理员接口 ==');
  { const r = await api('admin/users'); check('无密钥 401', r.status===401); }
  { const r = await api('admin/users', { admin:'wrong-key-aaaa' }); check('错误密钥 401', r.status===401); }
  { const r = await api('admin/users', { admin: ADMIN });
    check('学生列表成功', r.status===200 && Array.isArray(r.j.users), JSON.stringify(r.j).slice(0,120));
    check('包含两个测试学生', (r.j.users||[]).filter(u=>u.nickname.startsWith('测试学生')).length===2);
    const a = (r.j.users||[]).find(u=>u.nickname==='测试学生A');
    check('列表含词书数', a && a.books===1, JSON.stringify(a));
    if (a){
      const r2 = await api('admin/user?id=' + a.id, { admin: ADMIN });
      check('学生详情成功', r2.status===200 && r2.j.user?.nickname==='测试学生A');
      const b1 = (r2.j.books||[]).find(b=>b.book_id==='b1');
      check('详情统计正确(已学2/XP500)', b1 && b1.stat?.seen===2 && b1.stat?.xp===500, JSON.stringify(b1?.stat)); } }
  { const r = await api('admin/user?id=999999', { admin: ADMIN }); check('不存在学生 404', r.status===404); }

  console.log('== 登录限流 ==');
  { let got429 = false;
    for (let i=0;i<12;i++){
      const r = await api('login', { method:'POST', body:{ username:'ratelimit_probe', password:'wrong'+i+'123' } });
      if (r.status===429){ got429=true; break; } }
    check('连续错误登录触发 429', got429); }

  console.log('\n========== 结果: ' + pass + ' 通过, ' + fail + ' 失败 ==========');
  if (failures.length){ console.log('失败项:'); failures.forEach(f=>console.log('  - '+f)); process.exit(1); }
})().catch(e => { console.error('测试脚本异常:', e); process.exit(2); });
