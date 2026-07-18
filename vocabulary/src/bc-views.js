'use strict';
/* ================= 路由 ================= */
let tab=0, screen=null, calOff=0, libQ='', libF='all';

function go(t, force){
  if (!force && SES && screen && screen.type==='session' && SES.pos<SES.steps.length){
    ask('正在训练中，离开吗？\n已作答的进度会保留。', ()=>go(t, true), '离 开');
    return;
  }
  clearTimeout(advT);
  SES=null; FL=null; ML=null; screen=null; tab=t;
  render(); window.scrollTo(0,0);
}
function openScreen(sc){ screen=sc; render(); window.scrollTo(0,0); }
function back(){ screen=null; render(); window.scrollTo(0,0); }

function updateChrome(){
  const lv=lvOf(S.xp), fl=lvFloor(lv), ce=lvCeil(lv);
  $('#hLv').textContent=lv; $('#hTitle').textContent=titleOf(lv);
  $('#hStreak').textContent=streak();
  $('#xpFill').style.width=Math.min(100,Math.round((S.xp-fl)/(ce-fl)*100))+'%';
  $('#xpNow').textContent='XP '+S.xp;
  $('#xpNext').textContent=(ce-S.xp)+' 升级';
  const tp=S.today&&S.today.d===today()?S.today:{list:[],done:[]};
  const remain=tp.list.filter(k=>!tp.done.includes(k)).length + dueList().length;
  $('#bToday').textContent=remain||'';
  $('#bTrain').textContent=wbList().length||'';
}
function render(){
  tryCheckin();      // 幂等：条件一满足（含调低配额、斩掉剩余新词、中途退出等路径）立即打卡
  [0,1,2,3,4].forEach(i=>$('#nav'+i).classList.toggle('on', i===tab && !screen));
  updateChrome();
  if (screen){
    if (screen.type==='session') return rSession();
    if (screen.type==='learn')   return rLearn();
    if (screen.type==='flash')   return rFlash();
    if (screen.type==='match')   return rMatch();
    if (screen.type==='unit')    return rUnit(screen.id);
    if (screen.type==='list')    return rList(screen.kind);
  }
  if (tab===0) rHome();
  else if (tab===1) rTrain();
  else if (tab===2) rLib();
  else if (tab===3) rStats();
  else rMe();
}
const ICP_BEIAN = '';   // ICP 备案通过后填入，如 '苏ICP备2026XXXXXX号'，页脚自动显示
function footer(){
  const synced = (typeof syncUser==='function' && syncUser());
  return `<footer>环亚国际教育 HY-LITE EDUCATION · 当前词书《${esc(curBook().name)}》<br>${
    synced ? '云同步已开启 · 进度自动备份' : '进度保存在本机浏览器 · 换设备请登录云同步'
  }${
    ICP_BEIAN?`<br><a href="https://beian.miit.gov.cn" target="_blank" rel="noopener" style="color:inherit">${esc(ICP_BEIAN)}</a>`:''
  }</footer>`;
}

/* ================= 组件 ================= */
function strength(st){
  const b=st?Math.min(MAXB,st.b||0):0;
  let h=`<span class="strength ${st&&st.z?'z':''}">`;
  for (let i=0;i<MAXB;i++) h+=`<i class="${i<b?'f':''}"></i>`;
  return h+'</span>';
}
function wRow(W, extra){
  const st=wsPeek(W.k);
  const zs=st&&st.z?'<span class="pill rd">已斩</span>':'';
  const nt=st&&st.note?'<span class="mark" style="color:var(--mint)">📝</span>':'';
  return `<button class="wrow" onclick="openWord('${W.k}')">
    <span class="wt"><b>${esc(W.w)}</b><span class="ph">${W.p?'/'+esc(W.p)+'/':''}</span> ${nt}${zs}${extra||''}
    <span class="g">${esc(W.g)}</span></span>
    ${strength(st)}
    <span class="starbtn ${st&&st.st?'on':''}" role="button" tabindex="0" title="${st&&st.st?'移出生词本':'标记生难词'}" onclick="event.stopPropagation();toggleStar('${W.k}')">${st&&st.st?'★':'☆'}</span></button>`;
}

/* ================= 今日 ================= */
function rHome(){
  const tp=todayPlan();
  const dues=dueList().length;
  const done=tp.done.length, quota=tp.list.length;
  const L=S.log[today()]||{n:0,q:0,w:0};
  const ckd=!!S.ck[today()];
  const c=counts();
  const pct=quota?Math.min(1,done/quota):1;
  const C=2*Math.PI*38;
  let cta, ctaFn='startTask()';
  if (done<quota) cta = done?`继续学习 ${done}/${quota}`:'开始今日任务';
  else if (dues>0) cta = `清空复习 · ${dues} 词`;
  else { cta = quota?'今日任务已完成':'词库已全部学过'; }
  const allDone = done>=quota && dues===0;

  const bk=curBook();
  const unitMode=S.plan.mode==='unit';
  const todayUnitNames=unitMode?unitsOfKeys(tp.list).map(id=>(UNITS.find(u=>u.id===id)||{}).name||id):[];
  let h=`<button class="bookbar" onclick="openBookPicker()">
    <span class="bk-ic"><svg viewBox="0 0 24 24"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15.5H6.5A2.5 2.5 0 0 0 4 21z"/><path d="M4 18.5A2.5 2.5 0 0 1 6.5 16H20"/></svg></span>
    <span class="bk-tt"><s>当前词书</s><b>${esc(bk.name)}</b></span>
    <span class="bk-sw">切换词书 <svg viewBox="0 0 24 24"><path d="M8 9l4-4 4 4M8 15l4 4 4-4"/></svg></span>
  </button>`;
  h+=`<div class="card"><div class="plan">
    <div class="ring"><svg width="88" height="88" viewBox="0 0 88 88">
      <circle cx="44" cy="44" r="38" fill="none" stroke="var(--card2)" stroke-width="9"/>
      <circle cx="44" cy="44" r="38" fill="none" stroke="var(--mint)" stroke-width="9" stroke-linecap="round" stroke-dasharray="${(pct*C).toFixed(1)} ${C.toFixed(1)}"/>
    </svg><div class="rc"><b class="num">${done}/${quota}</b><s>${unitMode?'词':'新词'}</s></div></div>
    <div class="rside">
      ${unitMode?`<div style="font-size:15px;font-weight:800;margin-bottom:2px">今日单元：${esc(todayUnitNames.join('、')||'—')}</div>`:''}
      <div class="nums">
        <div style="cursor:pointer" onclick="openScreen({type:'list',kind:'today'})"><div class="n num">${quota-done>0?quota-done:0}<em> 词 ›</em></div><div class="l">待新学</div></div>
        <div style="cursor:pointer" onclick="openScreen({type:'list',kind:'due'})"><div class="n num" ${dues?'style="color:var(--amber)"':''}>${dues}<em> 词 ›</em></div><div class="l">待复习</div></div>
      </div>
      <div class="muted">${unitMode?`一天${S.plan.units||1}个单元 · 点数字可预览词单`:'点数字可预览词单 · 斩掉的词不再出现'}</div>
    </div></div>
    <button class="b3d ${allDone?'ghost':''}" onclick="${ctaFn}" ${allDone?'disabled':''}>${cta}</button>
    ${allDone&&counts().fresh>0?`<button class="b3d line" onclick="extraBatch()">${unitMode?'加餐 · 再学一个单元':'加餐 · 再学 5 个新词'}</button>`:''}
    <div class="ckline">${ckd?'<span class="ok">✔ 今日已打卡</span>':'完成今日新词即可打卡'} · 连续 <b class="num">${streak()}</b> 天</div>
  </div>`;

  if (bk.listen){
    h+=`<div class="sec">🎧 听力特训</div><div class="card">
      <div class="muted" style="margin-bottom:10px;line-height:1.7">听力词汇的目标是<b>听到就懂</b>：随时点开就能练，学过的词优先出题、不足时自动用新词磨耳朵；每天学完新词还会自动进入两关特训。</div>
      <div class="row2">
        <button class="b3d" onclick="startMode('ls', 0)">🔊 听音辨义</button>
        <button class="b3d line" onclick="startMode('dt', 0)">✍️ 听音拼写</button>
      </div>
    </div>`;
  }

  h+=`<div class="sec">今日战报</div><div class="card"><div class="report">
    <div><div class="n num">${L.n||0}</div><div class="l">新学</div></div>
    <div><div class="n num">${L.q||0}</div><div class="l">提取</div></div>
    <div><div class="n num">${L.q?Math.round((1-(L.w||0)/L.q)*100):100}%</div><div class="l">正确率</div></div>
    <div><div class="n warn num">×${L.cb||0}</div><div class="l">今日连击</div></div>
  </div></div>`;

  h+=`<div class="sec">快捷训练</div><div class="quick">
    <button onclick="startFlash(0)"><svg viewBox="0 0 24 24"><path d="M13 2 4.5 13.5H11L9.5 22 19 10h-6.5z"/></svg>速刷</button>
    <button onclick="startMode('ls', 0)"><svg viewBox="0 0 24 24"><path d="M3 10v4h4l5 4V6l-5 4z"/><path d="M16.5 8.5a5 5 0 0 1 0 7"/></svg>听音</button>
    <button onclick="startMode('sp', 0)"><svg viewBox="0 0 24 24"><path d="M4 20h16"/><path d="m6 16 10.5-10.5a2.1 2.1 0 0 1 3 3L9 19l-4 1z"/></svg>拼写</button>
    <button onclick="startMatch(0)"><svg viewBox="0 0 24 24"><rect x="3" y="3" width="8" height="8" rx="2"/><rect x="13" y="13" width="8" height="8" rx="2"/><path d="M13 7h4M7 13v4"/></svg>连连看</button>
  </div>`;

  const donePct=Math.round((c.master+c.zhan)/TOTAL*100);
  h+=`<div class="sec">词库总进度</div><div class="card">
    <div class="spread"><b>${c.master+c.zhan} / ${TOTAL}</b><span class="muted num">${donePct}%</span></div>
    <div class="gbar" style="margin-top:8px"><i class="g1" style="width:${(c.master+c.zhan)/TOTAL*100}%"></i><i class="g2" style="width:${c.learn/TOTAL*100}%"></i></div>
    <div class="muted" style="margin-top:8px">掌握 ${c.master} · 学习中 ${c.learn} · 已斩 ${c.zhan} · 未学 ${c.fresh}</div>
  </div>`;
  $('#app').innerHTML=h+footer();
}
function setPlanMode(m){
  if (S.plan.mode===m) return;
  S.plan.mode=m; S.today=null;            // 换模式重排今日计划
  if (m==='unit' && !S.plan.units) S.plan.units=1;
  if (m==='count' && !S.plan.quota) S.plan.quota=50;
  save(); render();
}
function extraBatch(){
  const tp=todayPlan();
  const add = S.plan.mode==='unit'
    ? nextUnits(1, unitsOfKeys(tp.list))     // 加餐一个单元
    : pickNew(5, tp.list);                    // 加餐 5 个新词
  if (!add.length){ toast('没有更多新词了'); return; }
  tp.list=tp.list.concat(add); tp.pv=0;      // 加餐的新词也先过一遍印象关
  save(); startTask();
}

/* ================= 训练 ================= */
function rTrain(){
  const dues=dueList().length, wb=wbList().length, st=starList().length, zh=zhanList().length;
  const tp=todayPlan(); const remainNew=tp.list.filter(k=>!tp.done.includes(k)).length;
  const ic=p=>`<svg viewBox="0 0 24 24">${p}</svg>`;
  let h=`<div class="sec">每日</div>`;
  h+=`<button class="mode" onclick="startTask()"><span class="ic">${ic('<path d="M12 3v18M3 12h18"/>')}</span>
    <span class="tt"><b>今日任务</b><span>新词 + 到期复习一起完成</span></span>
    <span class="ct"><b class="num">${remainNew+dues}</b> 待做</span></button>`;
  h+=`<button class="mode" onclick="startReview()"><span class="ic am">${ic('<path d="M20 11A8 8 0 1 0 18.3 16"/><path d="M20 5v6h-6"/>')}</span>
    <span class="tt"><b>到期复习</b><span>${dues?'混合题型，按强度出题':'暂无到期，可提前复习'}</span></span>
    <span class="ct"><b class="num">${dues}</b> 到期</span></button>`;
  h+=`<div class="sec">词单</div>`;
  h+=`<button class="mode" onclick="openScreen({type:'list',kind:'wb'})"><span class="ic rd">${ic('<path d="M12 4 3 20h18z"/><path d="M12 10v4M12 17v.5"/>')}</span>
    <span class="tt"><b>错词本</b><span>答错自动收录 · 连对两次移出</span></span><span class="ct"><b class="num">${wb}</b> 词</span></button>`;
  h+=`<button class="mode" onclick="openScreen({type:'list',kind:'star'})"><span class="ic am">${ic('<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.5 9.7l5.9-.9z"/>')}</span>
    <span class="tt"><b>生词本</b><span>手动收藏的单词</span></span><span class="ct"><b class="num">${st}</b> 词</span></button>`;
  h+=`<button class="mode" onclick="openScreen({type:'list',kind:'zhan'})"><span class="ic rd">${ic('<path d="M4 20 20 4M9.5 4.5 20 15M4 15l5 5"/>')}</span>
    <span class="tt"><b>已斩词</b><span>确认烂熟的词 · 可随时恢复</span></span><span class="ct"><b class="num">${zh}</b> 词</span></button>`;
  h+=`<div class="sec">专项训练</div>`;
  const c0=counts(); const learned=c0.learn+c0.master;
  const nOf=n=>Math.min(n,learned);
  const modes=[
    ['ec','看词选义','四选一 · 最快上手','<circle cx="12" cy="12" r="8.5"/><path d="M9 12h6M12 9v6"/>'],
    ['ce','看义选词','反向提取 · 更接近输出','<path d="M4 7h16M4 12h10M4 17h7"/>'],
    ['ls','听音辨义','磨耳朵 · 语音直连词义','<path d="M3 10v4h4l5 4V6l-5 4z"/><path d="M16.5 8.5a5 5 0 0 1 0 7"/>'],
    ['sp','看义拼写','看释义拼单词 · 双倍巩固','<path d="M4 20h16"/><path d="m6 16 10.5-10.5a2.1 2.1 0 0 1 3 3L9 19l-4 1z"/>'],
    ['dt','听音拼写','真·听写 · 最高难度','<path d="M3 10v4h4l5 4V6l-5 4z"/><path d="M17 4v10.5M17 14.5a2.5 2.5 0 1 1-2.5-2.5"/>'],
  ];
  modes.forEach(([t,n,d,p])=>{
    h+=`<button class="mode" onclick="startMode('${t}')"><span class="ic">${ic(p)}</span>
      <span class="tt"><b>${n}</b><span>${d}</span></span><span class="ct num">${nOf(20)} 词</span></button>`;
  });
  h+=`<button class="mode" onclick="startFlash()"><span class="ic am">${ic('<path d="M13 2 4.5 13.5H11L9.5 22 19 10h-6.5z"/>')}</span>
    <span class="tt"><b>极速判断</b><span>认识 / 不认识 二选一速刷</span></span><span class="ct num">${nOf(30)} 词</span></button>`;
  h+=`<button class="mode" onclick="startMatch()"><span class="ic am">${ic('<rect x="3" y="3" width="8" height="8" rx="2"/><rect x="13" y="13" width="8" height="8" rx="2"/><path d="M13 7h4M7 13v4"/>')}</span>
    <span class="tt"><b>连连看</b><span>词义配对小游戏 · 计时挑战</span></span>
    <span class="ct">${S.best.llk?'最佳 <b class="num">'+S.best.llk+'</b>s':'未挑战'}</span></button>`;
  $('#app').innerHTML=h+footer();
}
function rList(kind){
  const tp=todayPlan();
  const conf={
    wb:   {t:'错词本',   list:wbList(),  tip:'答错的词自动进来；任何测验里连对 2 次自动移出。'},
    star: {t:'生词本',   list:starList(),tip:'在词卡里点 ★ 收藏；再点取消。'},
    zhan: {t:'已斩词',   list:zhanList(),tip:'斩掉的词不会再出现在任何学习和测验中，点词可恢复。'},
    today:{t:'今日新词', list:tp.list.map(k=>WORDS[WIDX[k]]), tip:'今天计划学的新词，✔ 表示已完成首次提取。'},
    due:  {t:'到期复习', list:dueList(), tip:'记忆强度到期、今天该复习的词。'},
  }[kind];
  let h=`<button class="back" onclick="back()"><svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>返 回</button>
    <div class="sec">${conf.t}（${conf.list.length}）</div>`;
  if (kind==='wb' && conf.list.length) h+=`<button class="b3d red" style="margin:2px 0 12px" onclick="startWrongs()">抽测错词 · ${Math.min(20,conf.list.length)} 词</button>`;
  if (kind==='star' && conf.list.length) h+=`<button class="b3d amber" style="margin:2px 0 12px" onclick="startStars()">抽测生词 · ${Math.min(20,conf.list.length)} 词</button>`;
  if ((kind==='today'||kind==='due') && (tp.list.some(k=>!tp.done.includes(k)) || dueList().length)) h+=`<button class="b3d" style="margin:2px 0 12px" onclick="startTask()">开始今日任务</button>`;
  if (!conf.list.length) h+=`<div class="card empty">这里空空如也<br>${conf.tip}</div>`;
  else {
    h+=`<div class="muted" style="margin:0 4px 8px">${conf.tip}</div><div class="card">`;
    conf.list.forEach(W=>h+=wRow(W, kind==='today'&&tp.done.includes(W.k)?' <span class="pill">✔ 已学</span>':''));
    h+=`</div>`;
  }
  $('#app').innerHTML=h+footer();
}

/* ================= 词库 ================= */
function rLib(){
  let h=`<input class="search" id="q" type="search" placeholder="搜索单词或释义…" value="${esc(libQ)}" oninput="libQ=this.value;renderLibBody()" autocomplete="off">
    <div class="filters" id="libFs"></div><div id="libBody"></div>`;
  $('#app').innerHTML=h;
  renderLibBody();
}
const LIB_FS=[['all','全部'],['new','未学'],['learn','学习中'],['master','已掌握'],['zhan','已斩'],['star','星标'],['note','有笔记']];
function setLibF(f){ libF=f; renderLibBody(); }
function renderLibBody(){
  const fs=$('#libFs');
  if (fs) fs.innerHTML=LIB_FS.map(([f,n])=>`<button class="${libF===f?'on':''}" onclick="setLibF('${f}')">${n}</button>`).join('');
  const body=$('#libBody'); if (!body) return;
  const q=libQ.trim().toLowerCase();
  const fOk=W=>{
    if (libF==='all') return true;
    if (libF==='star'){ const st=wsPeek(W.k); return st&&st.st; }
    if (libF==='note'){ const st=wsPeek(W.k); return st&&st.note; }
    return statusOf(W.k)===libF;
  };
  let h='';
  if (q || libF!=='all'){
    const hits=[];
    for (const W of WORDS){
      if (!fOk(W)) continue;
      if (q){
        const a=W.w.toLowerCase(); let sc=-1;
        if (a===q) sc=0; else if (a.startsWith(q)) sc=1; else if (a.includes(q)) sc=2;
        else if (W.g.toLowerCase().includes(q)) sc=3;
        if (sc<0) continue; hits.push({sc,W});
      } else hits.push({sc:0,W});
    }
    hits.sort((x,y)=>x.sc-y.sc);
    const top=hits.slice(0,60);
    h+=`<div class="muted" style="margin:4px 4px 8px">${hits.length} 个词${hits.length>60?' · 显示前 60':''}</div>`;
    if (top.length){ h+=`<div class="card">`; top.forEach(x=>h+=wRow(x.W)); h+=`</div>`; }
    else h+=`<div class="card empty">没有匹配的词</div>`;
  } else {
    const block=(title,list)=>{
      h+=`<div class="sec">${title}</div>`;
      list.forEach(u=>{
        let m=0,l=0,z=0;
        u.words.forEach((w,i)=>{ const s=statusOf(u.id+':'+i); if(s==='master')m++; else if(s==='learn')l++; else if(s==='zhan')z++; });
        h+=`<button class="urow" onclick="openScreen({type:'unit',id:'${u.id}'})">
          <span class="tt"><b>${esc(u.name)}</b>
          <span class="gbar"><i class="g1" style="width:${(m+z)/u.words.length*100}%"></i><i class="g2" style="width:${l/u.words.length*100}%"></i></span></span>
          <span class="ct num">${m+z}/${u.words.length}<br>掌握</span></button>`;
      });
    };
    if (curBook().grouped){
      const bs=UNITS.filter(u=>u.id[0]==='B'), as=UNITS.filter(u=>u.id[0]==='A');
      block(`频段词表 ${bs[0].id}–${bs[bs.length-1].id}`, bs);
      block(`AWL 学术词表 ${as[0].id}–${as[as.length-1].id}`, as);
    } else {
      block(`${esc(curBook().name)} · 全部单元`, UNITS);
    }
  }
  body.innerHTML=h+footer();
}
function rUnit(id){
  const u=UNITS.find(x=>x.id===id);
  let m=0, fresh=0, seen=0;
  u.words.forEach((w,i)=>{ const s=statusOf(id+':'+i);
    if (s==='master'||s==='zhan') m++;
    if (s==='new') fresh++; else if (s!=='zhan') seen++; });
  let h=`<button class="back" onclick="back()"><svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>返回词库</button>
    <div class="sec">${esc(u.name)} · ${m}/${u.words.length} 掌握</div>
    <div class="row2" style="margin-bottom:12px">
      <button class="b3d" onclick="startUnitLearn('${id}')" ${fresh?'':'disabled'}>学本单元 · ${fresh} 新词</button>
      <button class="b3d line" onclick="startUnitQuiz('${id}')" ${seen?'':'disabled'}>测本单元 · ${seen} 词</button>
    </div><div class="card">`;
  u.words.forEach((w,i)=>h+=wRow(WORDS[WIDX[id+':'+i]]));
  h+=`</div>`;
  $('#app').innerHTML=h+footer();
}

/* ================= 统计 ================= */
function rStats(){
  const c=counts();
  const ckDays=Object.keys(S.ck).length;
  let h=`<div class="card"><div class="stgrid">
    <div><div class="n num">${c.master}</div><div class="l">已掌握</div></div>
    <div><div class="n num">${c.learn}</div><div class="l">学习中</div></div>
    <div><div class="n num">${c.zhan}</div><div class="l">已斩</div></div>
    <div><div class="n num">${ckDays}</div><div class="l">打卡天数</div></div>
  </div>`;
  if (c.fresh>0){
    const days=Math.ceil(c.fresh/S.plan.quota);
    h+=`<div class="muted" style="text-align:center;margin-top:10px;border-top:1px dashed var(--line);padding-top:9px">还剩 ${c.fresh} 个新词 · 按每天 ${S.plan.quota} 个，约 <b>${days}</b> 天学完（${addDays(today(),days)}）</div>`;
  }
  h+=`</div>`;
  const Lt=S.log[today()]||{};
  h+=`<div class="sec">复习热力图 · 近 20 周</div><div class="card">${heatHtml()}
    <div class="hm-cap"><span>颜色越深，当天提取越多（悬停看明细）</span><span>今日熟练 ${(Lt.m||0)>0?'+':''}${Lt.m||0} · 累计掌握 ${c.master}</span></div></div>`;
  h+=`<div class="sec">打卡日历</div><div class="card">${calHtml()}<div class="hm-cap"><span>底色越深当天提取越多 · 实绿=已打卡</span><span>连续 ${streak()} 天</span></div></div>`;
  h+=`<div class="sec">近 14 天提取量</div><div class="card">${barsHtml()}</div>`;
  h+=`<div class="sec">记忆强度分布</div><div class="card">${histHtml(c)}</div>`;
  h+=`<div class="sec">未来 7 天复习负载</div><div class="card">${loadHtml()}</div>`;
  h+=`<div class="sec">个人纪录</div><div class="card"><div class="stgrid">
    <div><div class="n num">×${S.best.combo||0}</div><div class="l">最高连击</div></div>
    <div><div class="n num">${S.best.spell||0}</div><div class="l">拼写连对</div></div>
    <div><div class="n num">${S.best.llk||'—'}</div><div class="l">连连看(s)</div></div>
    <div><div class="n num">${S.best.llkClean||'—'}</div><div class="l">零失误(s)</div></div>
  </div></div>`;
  h+=`<div class="sec">成就（${Object.keys(S.ach).length}/${ACH.length}）</div><div class="badges">`;
  ACH.forEach(a=>{
    const got=!!S.ach[a.id];
    const date=got?esc(String(S.ach[a.id])):'';
    h+=`<div class="badge ${got?'':'lock'}" title="${esc(a.d)}${got?'（'+date+' 解锁）':''}"><div class="bi"><svg viewBox="0 0 24 24"><circle cx="12" cy="9" r="5.5"/><path d="m8.5 13.5-2 7 5.5-3 5.5 3-2-7"/></svg></div>
      <b>${a.n}</b><s>${esc(a.d)}</s>${got?`<s style="color:var(--mint)">${date.slice(5)}</s>`:''}</div>`;
  });
  h+=`</div>`;
  $('#app').innerHTML=h+footer();
}
function heatHtml(){
  const DAYS=139;                                 // 20 周
  const start=new Date(); start.setDate(start.getDate()-DAYS);
  const pad=(start.getDay()+6)%7;                 // 周一对齐
  let h='<div class="hm-wrap"><div class="hm">';
  for (let p=0;p<pad;p++) h+='<i style="visibility:hidden"></i>';
  for (let d=DAYS; d>=0; d--){
    const dt=new Date(); dt.setDate(dt.getDate()-d);
    const ds=iso(dt), L=S.log[ds];
    const q=L?(L.q||0):0;
    const lv=q<=0?0 : q<15?1 : q<40?2 : q<90?3 : 4;
    h+=`<i class="${lv?'l'+lv:''}${ds===today()?' hmtd':''}" title="${ds} · 提取 ${q} 次 · 新学 ${L?(L.n||0):0} 词 · 熟练 ${L&&(L.m||0)>0?'+':''}${L?(L.m||0):0}"></i>`;
  }
  return h+'</div></div>';
}
function calHtml(){
  const base=new Date(); base.setDate(1); base.setMonth(base.getMonth()-calOff);
  const y=base.getFullYear(), m=base.getMonth();
  const dim=new Date(y,m+1,0).getDate();
  const off=(new Date(y,m,1).getDay()+6)%7;
  const t=today();
  let h=`<div class="calhead"><button onclick="calOff++;render()" aria-label="上个月">‹</button>
    <span class="num">${y} 年 ${m+1} 月</span>
    <button onclick="if(calOff>0){calOff--;render()}" aria-label="下个月">›</button></div>
    <div class="calgrid">${['一','二','三','四','五','六','日'].map(d=>`<span class="wd">${d}</span>`).join('')}`;
  for (let i=0;i<off;i++) h+=`<span></span>`;
  for (let d=1;d<=dim;d++){
    const ds=y+'-'+String(m+1).padStart(2,'0')+'-'+String(d).padStart(2,'0');
    const L=S.log[ds]; const q=L?(L.q||0):0;
    const lv=q<=0?0:q<20?1:q<60?2:3;
    const cls='cday'+(S.ck[ds]?' ck':(lv?' q'+lv:''))+(ds===t?' td':'')+(ds>t?' off':'');
    h+=`<span class="${cls} num" title="${ds} · 提取 ${q} 次${S.ck[ds]?' · 已打卡':''}">${d}</span>`;
  }
  return h+'</div>';
}
function barsHtml(){
  const days=[]; let mx=1;
  for (let d=13;d>=0;d--){ const ds=addDays(today(),-d); const q=(S.log[ds]||{}).q||0; mx=Math.max(mx,q); days.push({ds,q}); }
  let h='<div class="bars">';
  days.forEach((x,i)=>{ h+=`<div><b class="num">${x.q||''}</b><i style="height:${x.q?Math.max(4,Math.round(x.q/mx*62)):2}px"></i><s>${i===13?'今':x.ds.slice(8)}</s></div>`; });
  return h+'</div>';
}
function histHtml(c){
  const b=[0,0,0,0]; // 薄弱0-1 成长2-3 巩固4 掌握5+
  for (const k in S.w){ const st=S.w[k]; if (!st || st.s===0 || st.z) continue;
    const x=st.b<=1?0:st.b<=3?1:st.b===4?2:3; b[x]++; }
  const rows=[['未学',c.fresh],['薄弱',b[0]],['成长',b[1]],['巩固',b[2]],['掌握',b[3]],['已斩',c.zhan]];
  const mx=Math.max(1,...rows.map(r=>r[1]));
  return rows.map(([n,v])=>`<div class="hrow"><span class="hl">${n}</span><span class="ht"><i style="width:${v/mx*100}%${n==='已斩'?';background:var(--red)':''}${n==='未学'?';background:var(--line)':''}"></i></span><b class="hn num">${v}</b></div>`).join('');
}
function loadHtml(){
  const t=today(); const days=[];
  for (let d=0;d<7;d++) days.push({ds:addDays(t,d),n:0});
  for (const k in S.w){ const st=S.w[k];
    if (!st||st.s===0||st.z||!st.due) continue;
    const idx = st.due<=t?0:days.findIndex(x=>x.ds===st.due);
    if (idx>=0) days[idx].n++;
  }
  const mx=Math.max(1,...days.map(x=>x.n));
  const wd=['日','一','二','三','四','五','六'];
  let h='<div class="bars load">';
  days.forEach((x,i)=>{ const d=new Date(x.ds+'T00:00:00');
    h+=`<div><b class="num">${x.n||''}</b><i style="height:${x.n?Math.max(4,Math.round(x.n/mx*62)):2}px"></i><s>${i===0?'今':wd[d.getDay()]}</s></div>`; });
  return h+'</div>';
}

/* ================= 我的 ================= */
function rMe(){
  const c=S.cfg;
  const unitMode=S.plan.mode==='unit';
  let h=(typeof syncCardHtml==='function'?syncCardHtml():'');
  h+=`<div class="sec">学习计划</div><div class="card">
    <div class="setrow" style="border:none;padding-top:0"><div><div class="st1">每日进度模式</div><div class="st2">按固定词数，或按教材单元推进</div></div>
      <div class="seg" style="width:170px"><button class="${!unitMode?'on':''}" onclick="setPlanMode('count')">按词数</button><button class="${unitMode?'on':''}" onclick="setPlanMode('unit')">按单元</button></div></div>
    ${unitMode
      ? `<div class="setrow" style="border:none;margin-top:6px"><div><div class="st1">每日单元数</div><div class="st2">一天学几个单元的新词</div></div></div>
         <div class="qopts">${[1,2,3].map(n=>`<button class="${(S.plan.units||1)===n?'on':''} num" onclick="S.plan.units=${n};S.today=null;save();render()">${n}</button>`).join('')}</div>`
      : `<div class="setrow" style="border:none;margin-top:6px"><div><div class="st1">每日新词量</div><div class="st2">调整后立即生效，当天计划自动增减</div></div></div>
         <div class="qopts">${[10,20,30,50,100].map(n=>`<button class="${S.plan.quota===n?'on':''} num" onclick="S.plan.quota=${n};save();render()">${n}</button>`).join('')}</div>`}
    <div class="setrow" style="border:none;margin-top:6px"><div><div class="st1">学习起点</div><div class="st2">新词从这个单元开始取，学完自动接后面的单元</div></div>
      <select class="search" style="width:170px;padding:8px 10px" onchange="S.plan.start=this.value||null;S.today=null;save();render()">
        <option value="">从头开始</option>
        ${UNITS.map(u=>`<option value="${u.id}" ${S.plan.start===u.id?'selected':''}>${esc(u.name)}</option>`).join('')}
      </select></div>
  </div>`;
  h+=`<div class="sec">发音与音效</div><div class="card">
    <div class="setrow"><div><div class="st1">发音口音</div><div class="st2">点词发音使用的音源</div></div>
      <div class="seg" style="width:150px"><button class="${c.voice===1?'on':''}" onclick="S.cfg.voice=1;save();render()">英音</button><button class="${c.voice===2?'on':''}" onclick="S.cfg.voice=2;save();render()">美音</button></div></div>
    <div class="setrow"><div><div class="st1">自动发音</div><div class="st2">出题时自动朗读单词</div></div>
      <button class="tog ${c.auto?'on':''}" onclick="S.cfg.auto=!S.cfg.auto;save();render()" aria-label="自动发音"></button></div>
    <div class="setrow"><div><div class="st1">答题音效</div><div class="st2">对错反馈提示音</div></div>
      <button class="tog ${c.sfx?'on':''}" onclick="S.cfg.sfx=!S.cfg.sfx;save();render()" aria-label="答题音效"></button></div>
  </div>`;
  h+=`<div class="sec">外观</div><div class="card">
    <div class="seg">
      <button class="${c.theme==='auto'?'on':''}" onclick="S.cfg.theme='auto';save();applyTheme();render()">跟随系统</button>
      <button class="${c.theme==='light'?'on':''}" onclick="S.cfg.theme='light';save();applyTheme();render()">浅色</button>
      <button class="${c.theme==='dark'?'on':''}" onclick="S.cfg.theme='dark';save();applyTheme();render()">夜读</button>
    </div>
    <div class="setrow" style="border:none;margin-top:12px;padding-bottom:4px"><div><div class="st1">浅色配色</div><div class="st2">夜读模式配色统一，不受此选项影响</div></div></div>
    <div class="qopts">${[['ink','纸墨绿'],['sand','纸墨赭'],['mono','白纸黑'],['mint','薄荷']].map(([p,n])=>
      `<button class="${(c.pal||'ink')===p?'on':''}" onclick="S.cfg.pal='${p}';save();applyTheme();render()">${n}</button>`).join('')}</div>
  </div>`;
  h+=`<div class="sec">数据</div>`;
  if (!store()) h+=`<div class="card" style="border-color:var(--red)"><span class="muted">⚠ 当前环境无法保存进度（浏览器禁用了本地存储），刷新即丢失。学习后请立即导出备份。</span></div>`;
  if (S.mig) h+=`<div class="card"><span class="muted">✔ 已自动继承旧版滚动提取工具的进度（单元轮次已折算为词级记忆强度）。</span></div>`;
  h+=`<button class="b3d line" onclick="exportData()">导出进度备份</button>
    <button class="b3d ghost" onclick="document.getElementById('imp').click()">导入进度</button>
    <input id="imp" type="file" accept=".json" style="display:none" onchange="importData(this)">
    <button class="b3d red" onclick="resetAll()">全部重置</button>`;
  h+=`<div class="sec">方法</div><div class="card"><div class="muted" style="line-height:1.9">
    每个词有 0–7 级记忆强度：答对升 1 级，下次复习间隔按 1 → 2 → 4 → 7 → 15 → 30 天拉长；答错降 2 级、当天重来。强度 5 以上算掌握，升到 7 级即烂熟出栏、不再复习。真正认识的词直接「斩」掉，把时间留给不熟的。</div></div>`;
  $('#app').innerHTML=h+footer();
}
function exportData(){
  const out=Object.assign({}, S, {book:curBookId, bookName:curBook().name});  // 标记所属词书
  const blob=new Blob([JSON.stringify(out)],{type:'application/json'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download='hylite-'+curBookId+'-'+today()+'.json';
  a.click();
}
function importData(inp){
  const f=inp.files[0]; if(!f) return;
  inp.value='';
  if (f.size > 8*1024*1024){ toast('文件过大，不像是本应用的备份'); return; }
  const r=new FileReader();
  r.onload=()=>{
    try {
      const d=JSON.parse(r.result);
      // 备份属于别的词书时，先提示切过去再导入，避免词条被按当前书过滤丢弃
      if (d && d.book && d.book!==curBookId && BOOKS.some(b=>b.id===d.book)){
        const tb=BOOKS.find(b=>b.id===d.book);
        ask(`这份备份属于《${tb.name}》，当前在《${curBook().name}》。\n要切换到《${tb.name}》再导入吗？`,
          ()=>{ useBook(d.book, false, ()=>setTimeout(()=>{ doImport(d); }, 60)); }, '切换并导入');
        return;
      }
      doImport(d);
    } catch(e){ toast('文件格式不对，导入失败'); }
  };
  r.readAsText(f);
}
function doImport(d){
  try {
    let next=null;
    if (d && d.v===3 && d.w){ next=normalize(d); }
    else if (d && d.u){ const s=fresh(); if (!migrateOld(s,d)) throw 0; s.mig=true; next=normalize(s); }
    else throw 0;
    const cNow=counts();
    const cNew=(()=>{ let seen=0; for(const k in next.w){ if(next.w[k].s>0&&!next.w[k].z) seen++; } return seen; })();
    const cloudNote2 = (typeof syncUser==='function' && syncUser()) ? '\n⚠ 云同步已开启：导入的进度也会同步到云端和其他设备。' : '';
    ask(`导入将覆盖《${curBook().name}》当前进度：\n当前：已学 ${cNow.seen} 词 · 打卡 ${Object.keys(S.ck).length} 天\n文件：已学 ${cNew} 词 · 打卡 ${Object.keys(next.ck).length} 天\n\n确定用文件覆盖吗？`+cloudNote2,
      ()=>{ S=next; save(); applyTheme(); toast('导入成功');
        try { if (typeof syncPushIntent==='function' && typeof syncUser==='function' && syncUser()) syncPushIntent(curBookId); } catch(e){}  // 导入是显式意图，直推云端不参与分数合并
        go(0); }, '覆 盖', true);
  } catch(e){ toast('文件格式不对，导入失败'); }
}
function resetAll(){
  const cloudNote = (typeof syncUser==='function' && syncUser()) ? '\n⚠ 云同步已开启：继续学习后，云端备份和其他设备也会被新进度覆盖。' : '';
  ask('清空全部进度？\n词态、错词本、打卡、经验、成就都会删除，此操作不可撤销。'+cloudNote,
    ()=>{ S=fresh(S.cfg); save(); toast('已全部重置'); go(0); }, '清 空', true);
}

/* ================= 词书选择器 ================= */
function bookProgress(b){
  // 轻量读取某本书的独立存档，统计 掌握/已学，不切书、不 normalize
  const total=bookStat(b).words;
  let seen=0, master=0;
  if (b.id===curBookId){
    for (const k in S.w){ const st=S.w[k]; if (st.z){seen++;master++;continue;} if (st.s>0){seen++; if(st.b>=MASTER)master++;} }
  } else {
    try {
      const raw=store()&&store().getItem(KEY_BASE+'__'+b.id);
      if (raw){ const w=(JSON.parse(raw)||{}).w||{};
        for (const k in w){ const st=w[k]; if(!st||typeof st!=='object')continue;
          if (st.z){seen++;master++;continue;} if ((Number(st.s)||0)>0){seen++; if((Number(st.b)||0)>=MASTER)master++;} } }
    } catch(e){}
  }
  return {total, seen, master};
}
function openBookPicker(){
  modalK=null;
  let h=`<div class="grab"></div><div class="dw" style="font-size:22px;margin-bottom:4px">选择词书</div>
    <div class="muted" style="margin-bottom:6px">不同班用不同词书，各自的进度、打卡、错词本完全独立，随时切回不丢。</div>`;
  let lastCat=null;
  BOOKS.forEach(b=>{
    if (b.variantOf) return;                              // 乱序变体不单列，挂在本体行内
    if (b.cat!==lastCat){ h+=`<div class="sec" style="margin-top:14px">${esc(b.cat||'词书')}</div>`; lastCat=b.cat; }
    const p=bookProgress(b), cur=b.id===curBookId, curR=curBookId===b.id+'_r';
    const pct=p.total?Math.round(p.master/p.total*100):0;
    h+=`<button class="bookopt ${(cur||curR)?'on':''}" onclick="pickBook('${b.id}')">
      <div class="spread"><b>${esc(b.name)}${b.listen?' <span class="pill">🎧 听力</span>':''}${cur?' <span class="pill">当前</span>':''}${curR?' <span class="pill">当前 · 乱序</span>':''}</b><span class="muted num">${p.master}/${p.total} 掌握</span></div>
      <div class="muted" style="font-size:12px;margin:2px 0 8px">${esc(b.sub)} · ${bookStat(b).units} 单元 · ${p.total} 词</div>
      <div class="gbar"><i class="g1" style="width:${pct}%"></i><i class="g2" style="width:${p.total?Math.round((p.seen-p.master)/p.total*100):0}%"></i></div>
      <div style="margin-top:8px;text-align:right"><span class="pill" style="${curR?'':'background:var(--card2);color:var(--sub);'}cursor:pointer" onclick="event.stopPropagation();pickBook('${b.id}_r')">🔀 乱序版${curR?' ✓':''}</span></div>
    </button>`;
  });
  h+=`<button class="b3d ghost" style="margin-top:14px" onclick="closeModal()">关 闭</button>`;
  $('#sheet').innerHTML=h;
  $('#modal').classList.add('show');
}
function pickBook(id){
  $('#modal').classList.remove('show');
  if (id===curBookId){ return; }
  useBook(id);
}

/* ================= 词卡弹层 ================= */
let modalK=null;
function openWord(k){
  clearTimeout(advT);      // 词卡弹层打开时暂停自动跳转倒计时（关闭后重渲染会重新计时）
  modalK=k;
  const W=WORDS[WIDX[k]]; const st=wsPeek(k)||{b:0,s:0,ng:0};
  const stName=st.z?'已斩':st.s===0?'未学':st.b>=MASTER?'已掌握':'学习中';
  $('#sheet').innerHTML=`<div class="grab"></div>
    <div class="spread"><div><span class="dw">${esc(W.w)}</span> <span class="dp">${W.p?'/'+esc(W.p)+'/':''}</span></div>
    <span class="pill ${st.z?'rd':st.b>=MASTER?'':'am'}">${stName}</span></div>
    <div class="saybtns">
      <button data-say="${A(W.w)}">${SPK} 英音</button>
      <button data-say2="${A(W.w)}">${SPK} 美音</button>
    </div>
    <div class="dg">${esc(W.g)}</div>
    <div class="kv"><span>记忆强度</span><b>${strength(st)} <span class="num">${Math.min(MAXB,st.b||0)}/7</span></b></div>
    <div class="kv"><span>下次复习</span><b class="num">${st.z?'—':st.b>=MAXB?'已烂熟':st.due||'学完新词后排期'}</b></div>
    <div class="kv"><span>提取 / 答错</span><b class="num">${st.s||0} / ${st.ng||0} 次</b></div>
    <div class="kv"><span>所属单元</span><b>${esc((UNITS.find(u=>u.id===W.u)||{}).name||W.u)}</b></div>
    <textarea class="notein" placeholder="写点助记：词根、谐音、例句…" onchange="ws('${k}').note=this.value;save()">${esc(st.note||'')}</textarea>
    <div class="row2">
      <button class="b3d ${st.st?'amber':'line'}" onclick="toggleStar('${k}')">${st.st?'★ 已收藏':'☆ 收入生词本'}</button>
      <button class="b3d ${st.z?'ghost':'red'}" onclick="toggleZhan('${k}')">${st.z?'恢复此词':'⚔ 斩'}</button>
    </div>
    <button class="b3d ghost" onclick="closeModal()">关 闭</button>`;
  $('#modal').classList.add('show');
}
function closeModal(){ $('#modal').classList.remove('show'); modalK=null; render(); }
function toggleStar(k){
  const st=ws(k); st.st=st.st?0:1; save();
  toast(st.st?'已收入生词本 ★':'已移出生词本');
  if (modalK===k) openWord(k); else render();
}
function toggleZhan(k){
  const st=ws(k);
  if (st.z){ st.z=0; st.due=today(); toast('已恢复，今天会重新出现'); }
  else { st.z=1; if(st.s===0)st.s=1; toast('⚔ 已斩 · 此词不再出现'); sfx('ok'); checkAch(); }
  save();
  if (modalK===k) openWord(k); else render();
}

/* ================= 全局点击委托 ================= */
document.addEventListener('click', e=>{
  const g=e.target.closest('.g');
  if (g && g.closest('.covered')){ g.classList.toggle('open'); return; }
  const s2=e.target.closest('[data-say2]');
  if (s2){ say(decodeURIComponent(s2.dataset.say2), 2); return; }
  const s=e.target.closest('[data-say]');
  if (s){ say(decodeURIComponent(s.dataset.say)); return; }
});

/* ================= 启动 ================= */
migrateLegacyBookKey();            // 旧无后缀存档 → b3000
initTTS();                          // 预加载系统语音（有道拉不到时兜底发音）
applyTheme();                       // 先按已有存档应用主题，避免拆分构建下异步加载期间闪白
if (!store()){
  const warn=document.createElement('div');
  warn.style.cssText='margin:0 16px 4px;padding:9px 14px;border:1.5px solid var(--red);border-radius:12px;font-size:12px;color:var(--red);font-weight:700';
  warn.textContent='⚠ 当前环境无法保存进度，刷新即丢失 — 学习后请到「我的」导出备份';
  document.querySelector('.xpwrap').after(warn);
}
// 载入上次选择的词书（拆分构建下为异步，数据就绪后再渲染）
useBook(loadBookChoice(), true, ()=>{
  applyTheme();
  todayPlan();
  render();
  checkAch();
});
