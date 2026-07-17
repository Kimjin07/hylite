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

  console.log('== 进度同步（乐观并发） ==');
  let sA1;   // A 用户 b1 的当前云端版本号
  { const r = await api('sync', { method:'POST', token:uA.token, body:{ book_id:'b1', data:JSON.stringify(S1), updated_at:new Date().toISOString(), device:'test', base_server_at:null } });
    check('首次上传成功(base=null)', r.status===200 && r.j.ok, JSON.stringify(r.j));
    check('返回 server_at', !!r.j.server_at);
    sA1 = r.j.server_at; }
  { const r = await api('sync?book=b1', { token:uA.token });
    check('拉取进度成功', r.status===200 && r.j.exists);
    const d = JSON.parse(r.j.data); check('数据完整往返', d.xp===120 && d.w['B01:0'].b===2); }
  { const r = await api('sync', { method:'POST', token:uA.token, body:{ book_id:'b1', data:JSON.stringify(S2) } });
    check('缺 base 覆盖已有数据被拒 409', r.status===409, String(r.status));
    check('409 附带冲突数据', r.j.conflict===true && !!r.j.data && !!r.j.server_at); }
  { const r = await api('sync', { method:'POST', token:uA.token, body:{ book_id:'b1', data:JSON.stringify(S2), base_server_at:'2020-01-01T00:00:00.000Z' } });
    check('过期 base 被拒 409', r.status===409); }
  { const r = await api('sync', { method:'POST', token:uA.token, body:{ book_id:'b1', data:JSON.stringify(S2), base_server_at:sA1 } });
    check('正确 base 覆盖成功', r.status===200, JSON.stringify(r.j));
    sA1 = r.j.server_at; }
  { const r = await api('sync?book=b1', { token:uA.token });
    const d = JSON.parse(r.j.data); check('更新后取回新数据', d.xp===500 && Object.keys(d.w).length===2); }
  { const empty = JSON.stringify({ ...S1, w:{}, xp:0, ck:{} });
    const r = await api('sync', { method:'POST', token:uA.token, body:{ book_id:'b1', data:empty, base_server_at:sA1 } });
    check('空词态档覆盖非空云档被拒 422', r.status===422, String(r.status)); }
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

  console.log('== 账号名大小写不敏感 ==');
  { const r = await api('login', { method:'POST', body:{ username:'STUDENT_B', password:'pass123456' } });
    check('大写账号名可登录', r.status===200 && r.j.ok, String(r.status)); }
  { const r = await api('register', { method:'POST', body:{ nickname:'大小写抢注', username:'Student_B', password:'x1234567' } });
    check('不同大小写的重复账号被拒 409', r.status===409, String(r.status)); }

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
  { const r = await api('me', { token: uA.token }); check('补设密码已吊销注册会话(新语义)', r.status===401); }
  { const r = await api('login', { method:'POST', body:{ username:'student_a', password:'apass12345' } });
    check('重新登录获取新会话', r.status===200); uA.token = r.j.token; }

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
      check('详情统计正确(已学2/XP500)', b1 && b1.stat?.seen===2 && b1.stat?.xp===500, JSON.stringify(b1?.stat));
      check('保留上一版数据(prev_data, xp=120)', b1 && b1.prev_data && JSON.parse(b1.prev_data).xp===120, b1 && b1.prev_data ? 'has' : 'missing'); } }
  { const r = await api('admin/user?id=999999', { admin: ADMIN }); check('不存在学生 404', r.status===404); }

  console.log('== 同数据短路(保住 prev_data) ==');
  { const r1 = await api('sync', { method:'POST', token:uA.token, body:{ book_id:'b2', data:JSON.stringify(S1), base_server_at:null } });
    check('b2 首推成功', r1.status===200);
    const r2 = await api('sync', { method:'POST', token:uA.token, body:{ book_id:'b2', data:JSON.stringify(S2), base_server_at:r1.j.server_at } });
    check('b2 更新成功(prev=S1)', r2.status===200);
    const r3 = await api('sync', { method:'POST', token:uA.token, body:{ book_id:'b2', data:JSON.stringify(S2), base_server_at:r2.j.server_at } });
    check('同数据重推返回 unchanged', r3.status===200 && r3.j.unchanged===true, JSON.stringify(r3.j));
    check('同数据重推 server_at 不变', r3.j.server_at===r2.j.server_at);
    const admin1 = await api('admin/users', { admin: ADMIN });
    const aid = (admin1.j.users||[]).find(u=>u.nickname==='测试学生A');
    const det = await api('admin/user?id=' + aid.id, { admin: ADMIN });
    const b2row = (det.j.books||[]).find(b=>b.book_id==='b2');
    check('prev_data 仍是 S1(未被同数据轮换)', b2row && b2row.prev_data && JSON.parse(b2row.prev_data).xp===120, b2row && b2row.prev_data ? JSON.parse(b2row.prev_data).xp : 'missing'); }

  console.log('== 更换同步码 ==');
  { const rOld = uA.user.sync_code;
    // 建立第二个会话(模拟另一台设备)
    const s2 = await api('login-code', { method:'POST', body:{ sync_code: rOld } });
    check('第二会话建立', s2.status===200);
    const rot = await api('rotate-code', { method:'POST', token: uA.token });
    check('更换同步码成功', rot.status===200 && rot.j.user.sync_code !== rOld, JSON.stringify(rot.j));
    const oldLogin = await api('login-code', { method:'POST', body:{ sync_code: rOld } });
    check('旧同步码失效', oldLogin.status===401);
    const newLogin = await api('login-code', { method:'POST', body:{ sync_code: rot.j.user.sync_code } });
    check('新同步码可登录', newLogin.status===200);
    const s2check = await api('me', { token: s2.j.token });
    check('其他设备会话已被吊销', s2check.status===401);
    const selfCheck = await api('me', { token: uA.token });
    check('当前会话保留', selfCheck.status===200); }

  console.log('== 改密吊销其他会话 ==');
  { const sX = await api('login', { method:'POST', body:{ username:'student_b', password:'pass123456' } });
    const sY = await api('login', { method:'POST', body:{ username:'student_b', password:'pass123456' } });
    const chg = await api('set-credentials', { method:'POST', token: sX.j.token, body:{ username:'student_b', password:'newpass789' } });
    check('改密成功', chg.status===200, JSON.stringify(chg.j));
    const yCheck = await api('me', { token: sY.j.token });
    check('其他会话被吊销', yCheck.status===401);
    const xCheck = await api('me', { token: sX.j.token });
    check('操作会话保留', xCheck.status===200); }

  console.log('== 恶意昵称 ==');
  { const r = await api('register', { method:'POST', body:{ nickname:'张‮三' } });
    check('含双向覆盖符的昵称被拒', r.status===400, String(r.status)); }

  console.log('== 登录限流 ==');
  { let got429 = false;
    for (let i=0;i<12;i++){
      const r = await api('login', { method:'POST', body:{ username:'ratelimit_probe', password:'wrong'+i+'123' } });
      if (r.status===429){ got429=true; break; } }
    check('连续错误登录触发 429', got429); }

  console.log('== 管理密钥爆破阻断(最后跑,会锁本IP管理接口10分钟) ==');
  { for (let i=0;i<11;i++){ await api('admin/users', { admin:'brute-'+i }); }
    const r = await api('admin/users', { admin: ADMIN });
    check('超限后正确密钥也被 429 阻断', r.status===429, String(r.status)); }

  console.log('\n========== 结果: ' + pass + ' 通过, ' + fail + ' 失败 ==========');
  if (failures.length){ console.log('失败项:'); failures.forEach(f=>console.log('  - '+f)); process.exit(1); }
})().catch(e => { console.error('测试脚本异常:', e); process.exit(2); });
