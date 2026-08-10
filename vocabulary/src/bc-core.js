'use strict';
/* ================= 数据与常量 ================= */
const BOX_GAP = [0,1,2,4,7,15,30,60];      // 各强度等级到下次复习的天数
const MAXB = 7, MASTER = 5;                // box>=5 视为掌握, box7 烂熟不再复习
const DEFAULT_DAILY_QUOTA = 300;           // 按词数模式的默认每日新词数
const KEY_BASE = 'hylite_bcz_v3';          // 每本词书独立存档: KEY_BASE + '__' + bookId
const BOOK_KEY = 'hylite_bcz_book';        // 当前选择的词书 id
const OLDKEYS = ['hylite_bihui_v2','hylite_renshu_v1'];  // 仅 b3000 继承的旧存档
const TITLES = ['初入词场','小试锋芒','渐入佳境','斩词新秀','斩词能手','百词斩士','千词斩将','词海纵横','一代词宗'];

/* ================= 多词书 ================= */
// 不同班用不同词书，各自独立进度；框架完全复用
// 词书数据注册表：单文件构建时数据常量内联(下方 try 直接注册)；拆分构建时由 data/<id>.js 动态注册
const __BOOK_DATA = {};
function __reg(id, units){ __BOOK_DATA[id] = units; }
try{ __reg('b3000', BOOK3000); }catch(e){}
try{ __reg('prep',  PREP_UNITS); }catch(e){}
try{ __reg('basic', BASIC_UNITS); }catch(e){}
try{ __reg('core',  CORE_UNITS); }catch(e){}
try{ __reg('green', GREEN_UNITS); }catch(e){}
try{ __reg('oxford', OXFORD_UNITS); }catch(e){}
try{ __reg('a1',    A1_UNITS); }catch(e){}
try{ __reg('a2',    A2_UNITS); }catch(e){}
try{ __reg('b1',    B1_UNITS); }catch(e){}
try{ __reg('b1p',   B1P_UNITS); }catch(e){}
try{ __reg('b2',    B2_UNITS); }catch(e){}
try{ __reg('lis18', LIS18_UNITS); }catch(e){}
try{ __reg('liscene', LISCENE_UNITS); }catch(e){}
try{ __reg('sat',   SAT_UNITS); }catch(e){}
try{ __reg('tfr',   TFR_UNITS); }catch(e){}
try{ __reg('tfl',   TFL_UNITS); }catch(e){}
try{ __reg('tfs',   TFS_UNITS); }catch(e){}
try{ __reg('tfw',   TFW_UNITS); }catch(e){}
// cat: 选书目录的分组(按用途)；组内按难度由易到难排列；listen: 听力词书(听音练习优先+学后自动特训)
const BASE_BOOKS = [
  {id:'b3000', name:'必会 3000', sub:'认读 6000 · 频段词表',   cat:'通用词库', grouped:true,  plan:{mode:'count', quota:DEFAULT_DAILY_QUOTA}},
  {id:'prep',  name:'预备词汇',   sub:'入门起步',               cat:'通用词库', grouped:false, plan:{mode:'unit',  units:1}},
  {id:'basic', name:'基础词汇',   sub:'初级进阶',               cat:'通用词库', grouped:false, plan:{mode:'unit',  units:1}},
  {id:'core',  name:'核心词汇',   sub:'中级核心',               cat:'通用词库', grouped:false, plan:{mode:'unit',  units:1}},
  {id:'green', name:'绿皮书',     sub:'新版核心词汇 · 中高级',   cat:'通用词库', grouped:false, plan:{mode:'unit',  units:1}},
  {id:'oxford', name:'牛津3000+5000', sub:'Oxford CEFR 分级 A1-C1', cat:'通用词库', grouped:false, plan:{mode:'count', quota:DEFAULT_DAILY_QUOTA}},
  {id:'a1',    name:'A1',        sub:'教材同步 · 入门',         cat:'教材同步',           grouped:false, plan:{mode:'unit',  units:1}},
  {id:'a2',    name:'A2',        sub:'教材同步 · 基础',         cat:'教材同步',           grouped:false, plan:{mode:'unit',  units:1}},
  {id:'b1',    name:'B1',        sub:'教材同步 · 中级',         cat:'教材同步',           grouped:false, plan:{mode:'unit',  units:1}},
  {id:'b1p',   name:'B1+',       sub:'教材同步 · 进阶',         cat:'教材同步',           grouped:false, plan:{mode:'unit',  units:1}},
  {id:'b2',    name:'B2',        sub:'教材同步 · 高阶',         cat:'教材同步',           grouped:false, plan:{mode:'unit',  units:1}},
  {id:'lis18', name:'18天听力',   sub:'听力高频 · 每天一个 Day', cat:'听力专项',           grouped:false, plan:{mode:'unit',  units:1}, listen:true},
  {id:'liscene',name:'听力场景',  sub:'雅思听力场景词汇',        cat:'听力专项',           grouped:false, plan:{mode:'unit',  units:1}, listen:true},
  {id:'tfr',   name:'托福阅读',  sub:'高频 800 · 按学科话题',   cat:'托福备考',           grouped:false, plan:{mode:'unit',  units:1}},
  {id:'tfl',   name:'托福听力',  sub:'场景高频 800 词',         cat:'托福备考',           grouped:false, plan:{mode:'count', quota:DEFAULT_DAILY_QUOTA}, listen:true},
  {id:'tfs',   name:'托福口语',  sub:'口语高频 300 词',         cat:'托福备考',           grouped:false, plan:{mode:'count', quota:DEFAULT_DAILY_QUOTA}},
  {id:'tfw',   name:'托福写作',  sub:'写作高频 500 词',         cat:'托福备考',           grouped:false, plan:{mode:'count', quota:DEFAULT_DAILY_QUOTA}},
  {id:'sat',   name:'SAT 核心',  sub:'SAT 1000 · 高阶难词',     cat:'高阶挑战',           grouped:false, plan:{mode:'count', quota:DEFAULT_DAILY_QUOTA}},
];
// ===== 乱序分支：每本书自动生成 <id>_r 变体（固定种子洗牌→每50词一单元，进度/同步完全独立）=====
const RAND_SEED = 20260718;                 // 改动会打乱既有乱序进度的对应关系，永远别改
function mulberry32(a){ return function(){ a|=0; a=(a+0x6D2B79F5)|0; let t=Math.imul(a^(a>>>15),1|a); t=(t+Math.imul(t^(t>>>7),61|t))^t; return ((t^(t>>>14))>>>0)/4294967296; }; }
function seededShuffle(arr, seed){ const r=mulberry32(seed); for(let i=arr.length-1;i>0;i--){ const j=Math.floor(r()*(i+1)); const tmp=arr[i]; arr[i]=arr[j]; arr[j]=tmp; } return arr; }
function buildVariantData(baseId){
  const base=__BOOK_DATA[baseId]; if(!base) return null;
  const all=[]; base.forEach(u=>u.words.forEach(w=>all.push(w)));
  seededShuffle(all, RAND_SEED);
  const units=[];
  for(let i=0;i<all.length;i+=50){
    const no=String(units.length+1).padStart(2,'0');
    units.push({id:'R'+no, name:'乱序 '+no, words:all.slice(i,i+50)});
  }
  return units;
}
const BOOKS = [];
for (const b of BASE_BOOKS){
  BOOKS.push(b);
  BOOKS.push({ id:b.id+'_r', name:b.name+' 乱序', sub:'乱序版 · 打乱顺序防"顺背"', cat:b.cat,
    grouped:false, listen:b.listen, variantOf:b.id,
    plan: b.plan.mode==='unit' ? {mode:'unit', units:1} : {mode:'count', quota:b.plan.quota||DEFAULT_DAILY_QUOTA} });
}
// 词书规模（未加载时用拆分构建注入的 BOOK_STATS 清单；已加载用真实数据；乱序变体沿用本体词量）
function bookStat(b){
  const u=__BOOK_DATA[b.id];
  if (u) return {units:u.length, words:u.reduce((s,x)=>s+x.words.length,0)};
  if (b.variantOf){
    const baseB=BOOKS.find(x=>x.id===b.variantOf);
    const s=baseB?bookStat(baseB):{units:0,words:0};
    return {units:Math.ceil(s.words/50), words:s.words};
  }
  if (typeof BOOK_STATS!=='undefined' && BOOK_STATS[b.id]) return BOOK_STATS[b.id];
  return {units:0, words:0};
}
// 按需加载词书数据（拆分构建）
function loadBookData(id, cb){
  const old=document.getElementById('bookjs-'+id);
  if (old) old.remove();
  try{ toast('正在加载词书…'); }catch(e){}
  const s=document.createElement('script');
  s.id='bookjs-'+id;
  s.src='data/'+id+'.js';
  s.onload=()=>cb(true);
  s.onerror=()=>{ s.remove(); try{ toast('⚠ 词书加载失败，请检查网络后重试'); }catch(e){} cb(false); };
  document.head.appendChild(s);
}
function bookPlan(){ return curBook().plan || {mode:'count', quota:DEFAULT_DAILY_QUOTA}; }
let curBookId = 'b3000';
let UNITS = __BOOK_DATA['b3000'] || [];     // 当前词书的单元（切书时替换；拆分构建下启动后异步填充）
let KEY = KEY_BASE + '__b3000';             // 当前词书的存档 key
const WORDS = []; const WIDX = {};          // 当前词书派生（内容随切书重建，引用保持）
let TOTAL = 0;
function curBook(){ return BOOKS.find(b=>b.id===curBookId) || BOOKS[0]; }
function buildWords(){
  WORDS.length = 0;
  for (const k in WIDX) delete WIDX[k];
  UNITS.forEach(u => u.words.forEach((w,i) => {
    const k = u.id + ':' + i;
    WIDX[k] = WORDS.length;
    WORDS.push({k, u:u.id, i, w:w[0], g:w[1], p:w[2]||''});
  }));
  TOTAL = WORDS.length;
}
buildWords();

/* ================= 基础工具 ================= */
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
const A = encodeURIComponent;
function iso(d){ return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
function today(){ return iso(new Date()); }
function addDays(ds,n){ const d=new Date(ds+'T00:00:00'); d.setDate(d.getDate()+n); return iso(d); }
function shuffle(a){ for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }
function posOf(g){ const m=String(g).match(/^\s*(n|vt|vi|v|adj|adv|prep|pron|conj|interj|num|aux|art)\b/i); return m?m[1].toLowerCase():''; }
function clip(s,n){ s=String(s); return s.length>n ? s.slice(0,n)+'…' : s; }

/* ================= 存储 ================= */
function store(){ try { return window.localStorage; } catch(e){ return null; } }
function fresh(cfg){
  const bp=bookPlan();
  return { v:3, w:{}, log:{}, ck:{}, ach:{}, xp:0, best:{},
    plan:{mode:bp.mode, quota:bp.quota||DEFAULT_DAILY_QUOTA, units:bp.units||1}, today:null,
    cfg: cfg || {theme:'auto', voice:1, auto:true, sfx:true, pal:'ink'} };
}
function migrateOld(s, o){
  // 旧版是单元制：把单元轮次映射成词级强度
  if (!o || !o.u) return false;
  const stageBox = st => st.grad ? MASTER : Math.min(4, (st.stage||0)+1);
  let n = 0;
  for (const uid in o.u){
    const st = o.u[uid]; const unit = UNITS.find(x=>x.id===uid);
    if (!unit || !st) continue;
    const box = stageBox(st);
    const due = st.grad ? addDays(today(),30) : (st.due || today());
    unit.words.forEach((w,i)=>{
      const k = uid+':'+i;
      s.w[k] = { b:box, due, s:(st.stage||0)+1, ng:0, cs:1 };
      n++;
    });
    (st.wrongs||[]).forEach(i=>{ const k=uid+':'+i; if(s.w[k]){ s.w[k].ng=1; s.w[k].wb=1; s.w[k].cs=0; s.w[k].b=Math.max(1,box-1); } });
  }
  if (n === 0) return false;                 // 迁移失败时不留下任何旧痕迹
  if (o.wb) for (const k in o.wb){ if(s.w[k]){ s.w[k].wb=1; s.w[k].ng=Math.max(s.w[k].ng||0, o.wb[k].c||1); s.w[k].cs=0; } }
  if (o.log && typeof o.log==='object') s.log = o.log;
  if (o.cfg && o.cfg.theme) s.cfg.theme = o.cfg.theme;
  s.xp = Object.values(s.log).reduce((t,l)=>t+(Number(l&&l.q)||0)*2,0);
  return true;
}
const DATE_RE=/^\d{4}-\d{2}-\d{2}$/;
function normalize(s){
  // 深度校验：导入/迁移的数据一律清洗成合法类型，杜绝坏数据落盘后反复崩溃或注入
  if (!s || typeof s!=='object') s={};
  const out={v:3};
  const w=(s.w&&typeof s.w==='object')?s.w:{};
  out.w={};
  // 词书数据未就绪时(拆分构建加载失败/未完成) WIDX 为空，此时不做词表过滤，
  // 仅做格式清洗——否则会把整份词态误删成空档（再被云同步扩散就是灾难）
  const widxReady = TOTAL > 0 || Object.keys(WIDX).length > 0;
  for (const k in w){
    if (widxReady ? !(k in WIDX) : !/^[A-Za-z0-9]+:\d+$/.test(k)) continue;
    const e=w[k];
    if (!e || typeof e!=='object' || Array.isArray(e)) continue;
    const x={ b:Math.min(MAXB,Math.max(0,Math.floor(Number(e.b)||0))),
      s:Math.max(0,Math.floor(Number(e.s)||0)),
      ng:Math.max(0,Math.floor(Number(e.ng)||0)),
      cs:Math.max(0,Math.floor(Number(e.cs)||0)),
      due:(typeof e.due==='string'&&DATE_RE.test(e.due))?e.due:null };
    if (e.st) x.st=1; if (e.z) x.z=1; if (e.wb) x.wb=1;
    if (typeof e.note==='string'&&e.note) x.note=e.note.slice(0,500);
    out.w[k]=x;
  }
  out.log={};
  const log=(s.log&&typeof s.log==='object')?s.log:{};
  for (const d in log){ const L=log[d];
    if (!DATE_RE.test(d)||!L||typeof L!=='object') continue;
    out.log[d]={n:Math.max(0,Number(L.n)||0), q:Math.max(0,Number(L.q)||0), w:Math.max(0,Number(L.w)||0), cb:Math.max(0,Number(L.cb)||0), m:Math.max(0,Number(L.m)||0)}; }
  out.ck={};
  const ck=(s.ck&&typeof s.ck==='object')?s.ck:{};
  for (const d in ck){ if (DATE_RE.test(d)&&ck[d]) out.ck[d]=1; }
  out.ach={};
  const ach=(s.ach&&typeof s.ach==='object')?s.ach:{};
  for (const id in ach){ if (ach[id]) out.ach[id]=String(ach[id]).slice(0,10); }
  out.xp=Math.max(0,Number(s.xp)||0);
  const b=(s.best&&typeof s.best==='object')?s.best:{};
  out.best={combo:Math.max(0,Number(b.combo)||0), spell:Math.max(0,Number(b.spell)||0), spellCur:Math.max(0,Number(b.spellCur)||0),
    llk:Number(b.llk)>0?Number(b.llk):0, llkClean:Number(b.llkClean)>0?Number(b.llkClean):0};
  const bp=bookPlan();
  const legacyPlan = s.plan && !(s.plan.mode==='unit'||s.plan.mode==='count');  // 旧版存档无 mode 字段
  const q=Number(s.plan&&s.plan.quota);
  const un=Number(s.plan&&s.plan.units);
  const storedQuota = (!legacyPlan&&Number.isFinite(q)&&q>=1) ? Math.min(500,Math.floor(q)) : null;
  // 旧版本按词数默认值为 30/50 的存档升级到 300，其他自定义值保持不变。
  const quota = storedQuota===30 || storedQuota===50 ? DEFAULT_DAILY_QUOTA : (storedQuota || bp.quota || DEFAULT_DAILY_QUOTA);
  out.plan={
    mode:legacyPlan?bp.mode:((s.plan&&s.plan.mode)||bp.mode),
    quota,
    units:(!legacyPlan&&Number.isFinite(un)&&un>=1)?Math.min(20,Math.floor(un)):(bp.units||1),
    start:(s.plan&&typeof s.plan.start==='string'&&UNITS.some(u=>u.id===s.plan.start))?s.plan.start:null};
  const t=s.today;
  out.today=(t&&typeof t==='object'&&typeof t.d==='string'&&Array.isArray(t.list)&&Array.isArray(t.done))
    ? {d:t.d, list:t.list.filter(k=>typeof k==='string'&&(k in WIDX)), done:t.done.filter(k=>typeof k==='string'&&(k in WIDX)), pv:t.pv?1:0}
    : null;
  const c=(s.cfg&&typeof s.cfg==='object')?s.cfg:{};
  out.cfg={theme:['auto','light','dark'].indexOf(c.theme)>=0?c.theme:'auto', voice:c.voice===2?2:1, auto:c.auto!==false, sfx:c.sfx!==false,
    pal:['mint','ink','mono','sand'].indexOf(c.pal)>=0?c.pal:'ink'};
  if (s.mig) out.mig=true;
  return out;
}
function load(){
  let s=null;
  try { const raw=store()&&store().getItem(KEY); if(raw) s=JSON.parse(raw); } catch(e){}
  if (!s){
    s=fresh();
    if (curBookId==='b3000'){                 // 旧版单元制存档只属于必会 3000
      for (const ok of OLDKEYS){
        try { const raw=store()&&store().getItem(ok);
          if (raw && migrateOld(s, JSON.parse(raw))){ s.mig=true; break; }
        } catch(e){}
      }
    }
  }
  return normalize(s);
}
// 把最初无后缀的 v3 存档（那时只有一本 3000）迁到带后缀的键
function migrateLegacyBookKey(){
  const st=store(); if (!st) return;
  try {
    const legacy=st.getItem(KEY_BASE);
    if (legacy!=null && st.getItem(KEY_BASE+'__b3000')==null){
      st.setItem(KEY_BASE+'__b3000', legacy);
      st.removeItem(KEY_BASE);
    }
  } catch(e){}
}
// 切换当前词书：替换 UNITS/WORDS/KEY 并载入该书的独立存档
// 拆分构建下数据未加载时先异步拉取 data/<id>.js 再继续；cb 在切换完成后调用
function useBook(id, initial, cb){
  const b=BOOKS.find(x=>x.id===id)||BOOKS[0];
  if (!__BOOK_DATA[b.id]){
    if (b.variantOf){
      // 乱序变体：确保本体数据在，再本地推导（不需要额外数据文件）
      if (__BOOK_DATA[b.variantOf]){
        __BOOK_DATA[b.id]=buildVariantData(b.variantOf);
      } else {
        loadBookData(b.variantOf, ok=>{
          if (ok){ __BOOK_DATA[b.id]=buildVariantData(b.variantOf); useBook(id, initial, cb); }
        });
        return;
      }
      if (!__BOOK_DATA[b.id]) return;
    } else {
      loadBookData(b.id, ok=>{ if(ok) useBook(id, initial, cb); });
      return;
    }
  }
  curBookId=b.id;
  try { store() && store().setItem(BOOK_KEY, curBookId); } catch(e){}
  UNITS=__BOOK_DATA[b.id];
  buildWords();
  KEY=KEY_BASE+'__'+b.id;
  S=load();
  // 顶栏与页面标题跟随当前词书
  try {
    const bn=document.getElementById('brandName'); if(bn) bn.textContent=b.name;
    document.title=b.name+' | HY-LITE 环亚国际教育';
  } catch(e){}
  if (!initial){
    if (typeof SES!=='undefined'){ SES=null; FL=null; ML=null; }
    try { if (typeof advT!=='undefined') clearTimeout(advT); } catch(e){}       // 清掉残留的自动跳转倒计时
    try { if (typeof lisChainKs!=='undefined') lisChainKs=null; } catch(e){}    // 听力链词池不跨书
    screen=null; tab=0;
    applyTheme(); todayPlan(); render(); window.scrollTo(0,0); checkAch();
    toast('已切换到《'+b.name+'》');
    try { if (typeof syncOnBookSwitch==='function') syncOnBookSwitch(); } catch(e){}   // 云同步钩子
  }
  if (cb) cb();
}
function loadBookChoice(){
  try { const v=store()&&store().getItem(BOOK_KEY); if (v && BOOKS.some(b=>b.id===v)) return v; } catch(e){}
  return 'b3000';
}
let S = load();
let saveFailed=false;
function save(){
  try { const st=store(); if(!st) throw 0; st.setItem(KEY, JSON.stringify(S)); }
  catch(e){ if(!saveFailed){ saveFailed=true; try{ toast('⚠ 进度无法保存到本机，请到「我的」及时导出备份'); }catch(_){} } }
  try { if (typeof syncOnSave==='function') syncOnSave(); } catch(e){}   // 云同步钩子（未启用时无操作）
}
function ws(k){ return S.w[k] || (S.w[k]={b:0,due:null,s:0,ng:0,cs:0}); }
function wsPeek(k){ return S.w[k]; }
function bumpOn(ds,key,n){ const L=S.log[ds]||(S.log[ds]={n:0,q:0,w:0}); L[key]=Math.max(0,(L[key]||0)+n); }
function bump(key,n){ bumpOn(today(),key,n); }

/* ================= 词态查询 ================= */
function isUnseen(W){ const st=wsPeek(W.k); return !st || (st.s===0 && !st.z); }
function statusOf(k){
  const st=wsPeek(k);
  if (!st || st.s===0) return st&&st.z ? 'zhan' : 'new';
  if (st.z) return 'zhan';
  if (st.b>=MASTER) return 'master';
  return 'learn';
}
function dueList(){
  const t=today(); const out=[];
  for (const W of WORDS){ const st=wsPeek(W.k);
    if (st && st.s>0 && !st.z && st.due && st.due<=t) out.push(W); }
  return out;
}
function aheadList(n){
  const t=today();
  const pool=WORDS.filter(W=>{ const st=wsPeek(W.k); return st&&st.s>0&&!st.z&&st.due&&st.due>t; });
  pool.sort((a,b)=> wsPeek(a.k).due < wsPeek(b.k).due ? -1 : 1);
  return pool.slice(0,n);
}
function weakList(n){
  const pool=WORDS.filter(W=>{ const st=wsPeek(W.k); return st&&st.s>0&&!st.z; });
  pool.sort((a,b)=> (wsPeek(a.k).b-wsPeek(b.k).b) || (wsPeek(b.k).ng-wsPeek(a.k).ng));
  return pool.slice(0,n);
}
function reviewPool(n){
  const d=shuffle(dueList());
  if (d.length>=n) return d.slice(0,n);
  return d.concat(aheadList(n-d.length));       // 到期不足时用最近要到期的词补足
}
function wbList(){ return WORDS.filter(W=>{ const st=wsPeek(W.k); return st&&st.wb&&!st.z; }); }
function starList(){ return WORDS.filter(W=>{ const st=wsPeek(W.k); return st&&st.st&&!st.z; }); }
function zhanList(){ return WORDS.filter(W=>{ const st=wsPeek(W.k); return st&&st.z; }); }
function counts(){
  let learn=0, master=0, zhan=0, seen=0;
  for (const k in S.w){ const st=S.w[k];
    if (st.z){ zhan++; continue; }
    if (st.s>0){ seen++; if (st.b>=MASTER) master++; else learn++; } }
  return {learn, master, zhan, seen, fresh: TOTAL-seen-zhan};
}

/* ================= 每日计划 ================= */
function pickNew(n, excl){
  const ex=new Set(excl||[]); const out=[];
  let start=0;
  if (S.plan.start && (S.plan.start+':0') in WIDX) start=WIDX[S.plan.start+':0'];  // 学习起点，回绕遍历
  for (let j=0; j<WORDS.length && out.length<n; j++){
    const W=WORDS[(start+j)%WORDS.length];
    if (!isUnseen(W) || ex.has(W.k)) continue; out.push(W.k);
  }
  return out;
}
// 单元模式：取前 n 个「还有未学词」的单元里的全部未学词（B1/B1+ 一天一个单元）
function unitFresh(u){ return u.words.map((w,i)=>u.id+':'+i).filter(k=>isUnseen(WORDS[WIDX[k]])); }
function nextUnits(n, exclUnits){
  const ex=new Set(exclUnits||[]); const out=[]; let taken=0;
  for (const u of UNITS){
    if (ex.has(u.id)) continue;
    const fr=unitFresh(u);
    if (!fr.length) continue;
    out.push(...fr); taken++;
    if (taken>=n) break;
  }
  return out;
}
function unitsOfKeys(keys){ const s=[]; keys.forEach(k=>{ const u=k.split(':')[0]; if(!s.includes(u)) s.push(u); }); return s; }
function planNewKeys(){
  return S.plan.mode==='unit' ? nextUnits(S.plan.units||1) : pickNew(S.plan.quota);
}
function todayPlan(){
  const t=today();
  if (!S.today || S.today.d!==t){ S.today={d:t, list:planNewKeys(), done:[], pv:0}; save(); }
  else {
    // 剔除已被斩的、以及词表变更后失效的 key
    S.today.list = S.today.list.filter(k=>{ if(!(k in WIDX)) return false; const st=wsPeek(k); return !(st&&st.z); });
    S.today.done = S.today.done.filter(k=>S.today.list.includes(k));
    if (S.plan.mode==='unit'){
      // 每天固定 units 个单元；仅当把每日单元数「调大」时补入更多单元。
      // list 为空（当天单元被全部斩掉/清空）不补——否则会误顺延到下一单元；学完不自动顺延，明天或「加餐」再来。
      const curUnits=unitsOfKeys(S.today.list);
      if (S.today.list.length && curUnits.length < (S.plan.units||1)){
        const add=nextUnits((S.plan.units||1)-curUnits.length, curUnits);
        if (add.length) S.today.list=S.today.list.concat(add);
      }
    } else {
      // 计划调大时补充，调小时裁剪未学部分
      if (S.today.list.length < S.plan.quota){
        S.today.list = S.today.list.concat(pickNew(S.plan.quota - S.today.list.length, S.today.list));
      } else if (S.today.list.length > S.plan.quota){
        const keep = S.today.list.filter(k=>S.today.done.includes(k));
        const rest = S.today.list.filter(k=>!S.today.done.includes(k));
        S.today.list = keep.concat(rest.slice(0, Math.max(0, S.plan.quota-keep.length)));
      }
    }
    // 别处学过但没记 done 的补记
    S.today.list.forEach(k=>{ const st=wsPeek(k); if (st&&st.s>0&&!S.today.done.includes(k)) S.today.done.push(k); });
  }
  return S.today;
}
function tryCheckin(){
  const t=today();
  if (S.ck[t]) return false;
  const tp=todayPlan();
  const planDone = tp.list.length===0 || tp.done.length>=tp.list.length;
  const active = (S.log[t]&&S.log[t].q>0) || (S.log[t]&&S.log[t].n>0);
  if (planDone && active){
    S.ck[t]=1; addXp(20); save();
    toast('🎉 打卡成功 · 连续 '+streak()+' 天'); sfx('ck'); confetti();
    try { if (typeof petFeed==='function') petFeed('checkin'); } catch(e){}
    checkAch(); return true;
  }
  return false;
}
function streak(){
  let n=0; const d=new Date();
  if (!S.ck[iso(d)]) d.setDate(d.getDate()-1);
  while (S.ck[iso(d)]){ n++; d.setDate(d.getDate()-1); }
  return n;
}

/* ================= 作答核心（词级 SRS） ================= */
function applyAnswer(k, ok){
  const st=ws(k); const wasNew = st.s===0;
  const wasMaster=(st.b||0)>=MASTER;
  try {
    if (typeof petFeed==='function' && !window._noPet){     // 速刷路径不喂宠物(可撤销，避免刷经验)
      if (wasNew) petFeed('learn');                         // 学新词=喂宠物
      if (ok && !wasMaster && (st.b||0)+1>=MASTER) petFeed('master');   // 刚掌握
    }
  } catch(e){}
  st.s++;
  bump('q',1);
  if (wasNew) bump('n',1);
  if (ok){
    st.cs=(st.cs||0)+1; if (st.cs>=2) st.wb=0;
    st.b=Math.min(MAXB,(st.b||0)+1);
    st.due = st.b>=MAXB ? null : addDays(today(), BOX_GAP[st.b]);
  } else {
    st.ng=(st.ng||0)+1; st.cs=0; st.wb=1;
    st.b=Math.max(0,(st.b||0)-2);
    st.due=today();
    bump('w',1);
  }
  const isMaster=st.b>=MASTER;                       // 当日熟练量净增减
  if (isMaster&&!wasMaster) bump('m',1);
  else if (wasMaster&&!isMaster) bump('m',-1);
  if (wasNew && S.today && S.today.d===today() && S.today.list.includes(k) && !S.today.done.includes(k)) S.today.done.push(k);
  save();
}

/* ================= XP / 等级 ================= */
function lvOf(xp){ return Math.floor(Math.sqrt(xp/50))+1; }
function lvFloor(lv){ return 50*(lv-1)*(lv-1); }
function lvCeil(lv){ return 50*lv*lv; }
function titleOf(lv){ return TITLES[Math.min(TITLES.length-1, Math.floor((lv-1)/2))]; }
function addXp(n){
  const before=lvOf(S.xp); S.xp+=n; const after=lvOf(S.xp);
  if (after>before){ toast('⬆ 升级！Lv'+after+' · '+titleOf(after)); sfx('ck'); confetti(); }
}

/* ================= 成就 ================= */
const ACH = [
  {id:'first',  n:'初次见面', d:'学会第一个新词',    c:s=>Object.values(S.log).some(l=>l.n>0)},
  {id:'ck1',    n:'打卡启程', d:'完成首次打卡',      c:s=>Object.keys(S.ck).length>=1},
  {id:'ck7',    n:'七日之约', d:'连续打卡 7 天',     c:s=>streak()>=7},
  {id:'ck21',   n:'三周成习', d:'连续打卡 21 天',    c:s=>streak()>=21},
  {id:'ck50',   n:'风雨无阻', d:'连续打卡 50 天',    c:s=>streak()>=50},
  {id:'z10',    n:'初露锋芒', d:'斩掉 10 个词',      c:s=>counts().zhan>=10},
  {id:'z100',   n:'百词斩',   d:'斩掉 100 个词',     c:s=>counts().zhan>=100},
  {id:'z300',   n:'快刀斩麻', d:'斩掉 300 个词',     c:s=>counts().zhan>=300},
  {id:'m100',   n:'小有所成', d:'掌握 100 词',       c:s=>counts().master>=100},
  {id:'m500',   n:'五百强',   d:'掌握 500 词',       c:s=>counts().master>=500},
  {id:'m1000',  n:'千词在握', d:'掌握 1000 词',      c:s=>counts().master>=1000},
  {id:'m3000',  n:'通关！',   d:'掌握全部 3000 词',  c:s=>counts().master+counts().zhan>=TOTAL},
  {id:'cb30',   n:'连击达人', d:'单次连击 ×30',      c:s=>(S.best.combo||0)>=30},
  {id:'q200',   n:'今日雄起', d:'单日提取 200 次',   c:s=>Object.values(S.log).some(l=>(l.q||0)>=200)},
  {id:'sp20',   n:'拼写大师', d:'拼写连续答对 20 次', c:s=>(S.best.spell||0)>=20},
  {id:'llk',    n:'手速王',   d:'连连看 15 秒内零失误', c:s=>(S.best.llkClean||99)<=15},
];
function checkAch(){
  let got=false;
  for (const a of ACH){
    if (S.ach[a.id]) continue;
    try { if (a.c()){ S.ach[a.id]=today(); toast('🏅 成就解锁 · '+a.n); sfx('ck'); got=true; } } catch(e){}
  }
  if (got){ save(); confetti(); }
}

/* ================= 发音 / 音效 ================= */
let ttsVoice=null;
function initTTS(){
  try {
    if (!('speechSynthesis' in window)) return;
    const pick=()=>{ const vs=speechSynthesis.getVoices();
      ttsVoice = vs.find(v=>/en[-_]GB/i.test(v.lang)) || vs.find(v=>/^en/i.test(v.lang)) || null; };
    pick();
    speechSynthesis.onvoiceschanged=pick;
  } catch(e){}
}
let curAudio=null;
function stopSpeak(){                                          // 打断上一条发音，避免多路叠音
  try { if (curAudio){ curAudio.pause(); curAudio=null; } } catch(e){}
  try { if ('speechSynthesis' in window) speechSynthesis.cancel(); } catch(e){}
}
// 朗读文本清洗：去掉用法标注（括号/方括号），斜杠多变体取第一个——
// "turn (to the) left / right" 只读 "turn left"，避免把标点读出来。
// 词组词头常带词性尾巴和缩写（"first aid n." / "download v., n." / "take sth. seriously" / "apply... to..."），
// 而带句点的串有道 dictvoice 直接 500 无声——全部剥干净再送去发音
function speakText(w){
  let t = String(w)
    .replace(/（[^）]*）|\([^)]*\)|\[[^\]]*\]/g, ' ')   // 括号注释
    .split('/')[0]                                       // 斜杠多变体取第一个
    .replace(/\.{2,}|…/g, ' ')                           // 省略号 "apply... to..." → "apply to"
    .replace(/\bsth\.?/gi, 'something')                  // 缩写照课堂读法展开
    .replace(/\bsb\.?/gi, 'somebody')
    .replace(/\bswh\.?/gi, 'somewhere');
  let prev;                                              // 反复剥词尾：标点 / 带点的词性标注
  do {
    prev = t;
    t = t.replace(/[\s,;:，、]+$/, '')
         .replace(/\b(?:n|v|vt|vi|adj|adv|prep|conj|pron|num|art|int|interj|aux|phr|abbr|pl|sing|det|modal)\.$/i, '')
         .replace(/\.$/, '');
  } while (t !== prev);
  t = t.replace(/\./g, ' ').replace(/\s+/g, ' ').trim(); // 残余句点（Mr. 等）换成空格
  return t || String(w);
}
function say(w, voice){
  w = speakText(w);
  const v = voice || S.cfg.voice || 1;
  stopSpeak();
  try {
    const a=new Audio('https://dict.youdao.com/dictvoice?type='+v+'&audio='+encodeURIComponent(w));
    curAudio=a;
    let done=false;
    const fb=()=>{ if(done||curAudio!==a) return; done=true; tts(w,v); };  // 有道拉不到就用系统语音兜底；已被新发音替换则作废
    a.addEventListener('playing', ()=>{ done=true; });        // 真发声了
    a.addEventListener('error', fb);
    const p=a.play();
    if (p && p.catch) p.catch(fb);
    setTimeout(()=>{ if(!done) fb(); }, 1400);                // 1.4s 内没出声就兜底
  } catch(e){ tts(w,v); }
}
function tts(w,v){
  try {
    if (!('speechSynthesis' in window)) return;
    const u=new SpeechSynthesisUtterance(w);
    const vs=speechSynthesis.getVoices();
    const voice = (v===2 ? vs.find(x=>/en[-_]US/i.test(x.lang)) : vs.find(x=>/en[-_]GB/i.test(x.lang)))
      || vs.find(x=>/^en/i.test(x.lang)) || ttsVoice;
    if (voice) u.voice=voice;
    u.lang = v===2?'en-US':'en-GB'; u.rate=.9;
    speechSynthesis.cancel();
    try { speechSynthesis.resume(); } catch(_){}
    speechSynthesis.speak(u);
  } catch(e){}
}
let AC=null;
function sfx(kind){
  if (!S.cfg.sfx) return;
  try {
    AC = AC || new (window.AudioContext||window.webkitAudioContext)();
    if (AC.state==='suspended') AC.resume();
    const notes = kind==='ok' ? [[660,0,.08],[880,.07,.1]]
      : kind==='ng' ? [[170,0,.18]]
      : kind==='pick' ? [[520,0,.06]]
      : kind==='ck' ? [[523,0,.1],[659,.09,.1],[784,.18,.16]] : [];
    notes.forEach(([f,t,d])=>{
      const o=AC.createOscillator(), g=AC.createGain();
      o.type = kind==='ng'?'square':'sine'; o.frequency.value=f;
      g.gain.setValueAtTime(.0001, AC.currentTime+t);
      g.gain.exponentialRampToValueAtTime(kind==='ng'?.06:.09, AC.currentTime+t+.01);
      g.gain.exponentialRampToValueAtTime(.0001, AC.currentTime+t+d);
      o.connect(g).connect(AC.destination);
      o.start(AC.currentTime+t); o.stop(AC.currentTime+t+d+.02);
    });
  } catch(e){}
}

/* ================= 应用内确认弹层（沙箱里原生 confirm/alert 被禁用） ================= */
let askYesFn=null;
function ask(msg, onYes, yesLabel, danger){
  askYesFn=onYes;
  const m=$('#askMsg'), y=$('#askYes');
  if (!m){ if (onYes) onYes(); return; }        // 骨架异常时兜底放行
  m.textContent=msg;
  y.textContent=yesLabel||'确 定';
  y.className='b3d'+(danger?' red':'');
  $('#ask').classList.add('show');
  y.focus();
}
function askClose(yes){
  $('#ask').classList.remove('show');
  const f=askYesFn; askYesFn=null;
  if (yes && f) f();
}
function askOpen(){ const a=$('#ask'); return !!(a && a.classList.contains('show')); }
document.addEventListener('keydown', e=>{
  if (!askOpen()) return;
  e.stopPropagation();
  if (e.key==='Escape'){ e.preventDefault(); askClose(false); }
  else if (e.key==='Enter'){ e.preventDefault(); askClose(true); }
}, true);

/* ================= toast / 彩带 ================= */
function toast(msg){
  const w=$('#toasts'); if(!w) return;
  const el=document.createElement('div'); el.className='toast'; el.textContent=msg;
  w.appendChild(el);
  setTimeout(()=>el.classList.add('out'), 1900);
  setTimeout(()=>el.remove(), 2400);
}
let fxT=null;
function confetti(){
  if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const cv=$('#fx'); if(!cv) return;
  const dpr=window.devicePixelRatio||1;
  cv.width=innerWidth*dpr; cv.height=innerHeight*dpr;
  const ctx=cv.getContext('2d'); ctx.scale(dpr,dpr);
  const cols=['#31C79A','#FFB454','#5CC8FF','#FF6B6B','#E8DE6A'];
  const ps=Array.from({length:90},()=>({
    x:Math.random()*innerWidth, y:-20-Math.random()*innerHeight*.4,
    vx:(Math.random()-.5)*2.2, vy:2.2+Math.random()*3.2,
    r:3+Math.random()*4, a:Math.random()*6.28, va:(Math.random()-.5)*.3,
    c:cols[Math.floor(Math.random()*cols.length)]
  }));
  const t0=performance.now();
  cancelAnimationFrame(fxT);
  (function tick(t){
    const el=(t-t0)/1000;
    ctx.clearRect(0,0,innerWidth,innerHeight);
    if (el>2.2) return;
    for (const p of ps){
      p.x+=p.vx; p.y+=p.vy; p.a+=p.va;
      ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.a);
      ctx.globalAlpha=Math.max(0,1-el/2.2);
      ctx.fillStyle=p.c; ctx.fillRect(-p.r,-p.r/2,p.r*2,p.r);
      ctx.restore();
    }
    fxT=requestAnimationFrame(tick);
  })(t0);
}

/* ================= 选项生成 ================= */
function optionsFor(W, kind){ // kind 'g': 选释义；'w': 选单词
  const p=posOf(W.g);
  const picked=[]; const seenK=new Set([W.k]); const seenT=new Set([kind==='g'?W.g:W.w.toLowerCase()]);
  // 听力词书选释义时排除近义干扰项(场景书里"在左边/在左侧"这类同屏必误判)：
  // 归一化释义(去词性前缀/标点)后，与正确项前两字相同的候选跳过
  const normG = s=>String(s).replace(/^[a-zA-Z\.,;&()\s]+/, '').replace(/^[，。、；]+/, '').slice(0,2);
  const corr2 = (kind==='g' && curBook().listen) ? (normG(W.g).length>=2 ? normG(W.g) : null) : null;
  const take=x=>{
    const t = kind==='g'?x.g:x.w.toLowerCase();
    if (seenK.has(x.k)||seenT.has(t)) return;
    if (corr2 && normG(x.g)===corr2) return;
    seenK.add(x.k); seenT.add(t); picked.push(x);
  };
  const tiers=[
    WORDS.filter(x=>x.u===W.u && posOf(x.g)===p),
    WORDS.filter(x=>posOf(x.g)===p),
    WORDS
  ];
  for (const tier of tiers){ if (picked.length>=3) break;
    for (const x of shuffle(tier.slice())){ if (picked.length>=3) break; take(x); } }
  return shuffle([W, ...picked]);
}

/* ================= 主题 ================= */
function applyTheme(){
  const r=document.documentElement;
  if (S.cfg.theme==='auto') r.removeAttribute('data-theme');
  else r.setAttribute('data-theme', S.cfg.theme);
  const p=S.cfg.pal||'ink';
  if (p==='mint') r.removeAttribute('data-pal');
  else r.setAttribute('data-pal', p);
}
