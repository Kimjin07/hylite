// 宠物云同步后端测试 · 对着 wrangler pages dev (http://localhost:8788) 跑
// 用法: node test-pet-api.js [baseUrl]
'use strict';
const BASE = process.argv[2] || 'http://localhost:8788';
let pass = 0, fail = 0; const failures = [];
function check(name, cond, extra){
  if (cond){ pass++; console.log('  ✔ ' + name); }
  else { fail++; failures.push(name + (extra?' :: '+extra:'')); console.log('  ✘ ' + name + (extra?'  ← '+extra:'')); }
}
async function api(path, { method='GET', body, token } = {}){
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = 'Bearer ' + token;
  const res = await fetch(BASE + '/api/' + path, { method, headers, body: body===undefined?undefined:JSON.stringify(body) });
  let j=null; try{ j=await res.json(); }catch(e){}
  return { status: res.status, j };
}
const petJson = o => JSON.stringify(o);

(async () => {
  console.log('== 准备：注册一个学生 ==');
  const reg = await api('register', { method:'POST', body:{ nickname:'宠物测试生' } });
  check('注册成功', reg.status===200 && reg.j.ok, JSON.stringify(reg.j));
  const token = reg.j.token;

  console.log('== 未登录保护 ==');
  { const r = await api('pet', { method:'GET' }); check('GET /pet 未登录 401', r.status===401); }
  { const r = await api('pet', { method:'POST', body:{ data: petJson({learned:1}) } }); check('POST /pet 未登录 401', r.status===401); }

  console.log('== 新账号云端为空 ==');
  { const r = await api('pet', { token }); check('GET /pet 初始 exists=false', r.status===200 && r.j.ok && r.j.exists===false, JSON.stringify(r.j)); }

  console.log('== 上传 + 回读 ==');
  const p1 = { name:'旺仔', learned:40, wordGranted:40, dex:{cat:2}, lastClaim:'2026-07-18', species:'cat', pick:0 };
  { const r = await api('pet', { method:'POST', token, body:{ data: petJson(p1) } });
    check('POST /pet 成功', r.status===200 && r.j.ok, JSON.stringify(r.j));
    check('POST 回传落库数据', r.j.data && JSON.parse(r.j.data).learned===40); }
  { const r = await api('pet', { token });
    check('GET /pet exists=true', r.status===200 && r.j.exists===true);
    check('GET /pet 数据一致(learned=40)', JSON.parse(r.j.data).learned===40);
    check('GET /pet dex 一致(cat=2)', JSON.parse(r.j.data).dex.cat===2); }

  console.log('== 冲突解决：低分不覆盖高分 ==');
  const pLow = { name:'低', learned:10, dex:{cat:1}, species:'cat' };   // score=10+5=15 < 40+10=50
  { const r = await api('pet', { method:'POST', token, body:{ data: petJson(pLow) } });
    check('POST 低分返回的是云端高分版', r.j.data && JSON.parse(r.j.data).learned===40, r.j.data); }
  { const r = await api('pet', { token }); check('GET 仍是高分版(learned=40)', JSON.parse(r.j.data).learned===40); }

  console.log('== 冲突解决：高分覆盖 ==');
  const pHigh = { name:'高', learned:100, dex:{cat:9,rat:5}, species:'rat' };   // score=100+ (9+5)*5=170
  { const r = await api('pet', { method:'POST', token, body:{ data: petJson(pHigh) } });
    check('POST 高分被采纳', JSON.parse(r.j.data).learned===100); }
  { const r = await api('pet', { token });
    check('GET 更新为高分版(learned=100)', JSON.parse(r.j.data).learned===100);
    check('GET dex 合并结果(rat=5)', JSON.parse(r.j.data).dex.rat===5); }

  console.log('== 输入校验 ==');
  { const r = await api('pet', { method:'POST', token, body:{ data: 'not-json{' } }); check('非 JSON 被拒 400', r.status===400); }
  { const r = await api('pet', { method:'POST', token, body:{ data: petJson({foo:1}) } }); check('缺 learned 被拒 400', r.status===400); }
  { const r = await api('pet', { method:'POST', token, body:{ data: 'x'.repeat(20001) } }); check('超长被拒 400', r.status===400); }
  { const r = await api('pet', { method:'POST', token, body:{ } }); check('无 data 字段被拒 400', r.status===400); }

  console.log('\n========== 结果: ' + pass + ' 通过, ' + fail + ' 失败 ==========');
  if (failures.length) console.log('失败项:\n - ' + failures.join('\n - '));
  process.exit(fail?1:0);
})();
