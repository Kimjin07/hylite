'use strict';
/* ================= 训练会话 ================= */
let SES=null, FL=null, ML=null, advT=null;
const SPK='<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true" style="vertical-align:-2px"><path fill="currentColor" stroke="none" d="M3 9v6h4l5 5V4L7 9H3z"/><path d="M15.5 8.5a5 5 0 0 1 0 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';

function typeByBox(b){ return b<=1 ? 'ec' : b===2 ? 'ce' : b===3 ? 'ls' : 'sp'; }
// 适合听写的词：纯字母/空格/撇号/连字符，且别太长（带括号斜杠的用法标注短语拼不了）
function spellable(w){ return /^[A-Za-z][A-Za-z '\-]*$/.test(w) && w.length<=20; }
// 听力词书：复习题型也向"听到就懂"倾斜——低强度听音辨义，高强度听写(拼不了的仍用辨义)
function pickType(b, wstr){
  if (!curBook().listen) return typeByBox(b);
  return (b<=2 || (wstr!=null && !spellable(wstr))) ? 'ls' : 'dt';
}
function typeName(t){ return {ec:'看词选义', ce:'看义选词', ls:'听音辨义', sp:'看义拼写', dt:'听音拼写'}[t]; }
function endDest(kind){ return kind==='task'||kind==='lis1'||kind==='lis2' ? 0 : kind==='unit' ? 2 : 1; }

/* ---------- 听力特训链：任务完成 → 听音辨义 → 听音拼写 ---------- */
var lisChainKs=null;
function startLisChain(stage, ks){
  clearTimeout(advT);
  ks=(ks||[]).filter(k=>k in WIDX);
  if (!ks.length){ SES=null; screen=null; go(0); return; }
  ks=ks.filter(k=>!((wsPeek(k)||{}).z));                     // 斩掉的词不进特训
  if (!ks.length){ SES=null; screen=null; go(0); return; }
  lisChainKs=ks;
  // light:1 = 巩固练习：只记经验/连击，不动记忆曲线和错词本（当天不重复升级强度）
  beginSession(stage===2?'lis2':'lis1', shuffle(ks.slice()).map(k=>({k, t: stage===2 && spellable(WORDS[WIDX[k]].w) ? 'dt' : 'ls', light:1})));
}

function startTask(){
  const tp=todayPlan();
  const newKs=tp.list.filter(k=>!tp.done.includes(k));
  if (newKs.length && !tp.pv){                    // 印象关：先整批通读，再逐词提取
    pvCover=false;
    screen={type:'learn', ks:newKs, cont:'task'};
    render(); window.scrollTo(0,0);
    return;
  }
  buildTask();
}
function buildTask(){
  const tp=todayPlan();
  const newKs=tp.list.filter(k=>!tp.done.includes(k));
  const steps=[];
  newKs.forEach(k=>steps.push({k, t:'ec', nw:1}));
  newKs.forEach(k=>steps.push({k, t:'ce', drill:1, second:1}));
  dueList().forEach(W=>steps.push({k:W.k, t:pickType(wsPeek(W.k).b, W.w)}));
  if (!steps.length){ toast('今天的任务都完成了'); return; }
  beginSession('task', steps);
}

/* ---------- 通读印象关 ---------- */
let pvCover=false;
function rLearn(){
  const sc=screen; const ks=sc.ks.filter(k=>k in WIDX);
  let h=`<div class="stop">
    <button class="x" onclick="back()" aria-label="返回">✕</button>
    <div style="flex:1;font-weight:800;letter-spacing:1px">通读印象 · ${ks.length} 个新词</div></div>
  <div class="unitmeta" style="margin:0 2px 10px">第一遍只求混个脸熟：整批过一眼，点单词可发音，难词顺手点 ☆ 收进生词本；读完再进入逐词提取</div>
  <button class="b3d ghost" style="margin:0 0 10px;padding:10px;font-size:13px;letter-spacing:2px" id="coverBtn" onclick="pvToggleCover()">${pvCover?'显示全部释义':'遮住释义 · 自测一遍'}</button>
  <div class="card wordlist${pvCover?' covered':''}" id="wl">`;
  ks.forEach((k,i)=>{
    const W=WORDS[WIDX[k]]; const st=wsPeek(k);
    h+=`<div class="wl-row"><span class="no">${i+1}</span>
      <span><span class="w" data-say="${A(W.w)}">${esc(W.w)}</span>${W.p?`<span class="ph">/${esc(W.p)}/</span>`:''}</span>
      <span class="starbtn ${st&&st.st?'on':''}" onclick="toggleStar('${k}')" title="标记生难词">${st&&st.st?'★':'☆'}</span>
      <span class="g">${esc(W.g)}</span></div>`;
  });
  h+=`</div>
  <button class="b3d" onclick="pvDone()">读完了 · 开始提取</button>
  <button class="b3d ghost" onclick="back()">先不学，返回</button>`;
  $('#app').innerHTML=h;
}
function pvToggleCover(){
  pvCover=!pvCover;
  const wl=$('#wl');
  wl.classList.toggle('covered', pvCover);
  wl.querySelectorAll('.g.open').forEach(x=>x.classList.remove('open'));
  $('#coverBtn').textContent=pvCover?'显示全部释义':'遮住释义 · 自测一遍';
}
function pvDone(){
  const sc=screen; if (!sc || sc.type!=='learn') return;
  if (sc.cont==='task'){
    if (S.today){ S.today.pv=1; save(); }
    buildTask();
  } else {
    beginSession('unit', sc.ks.map(k=>({k,t:'ec',nw:1})).concat(sc.ks.map(k=>({k,t:'ce',drill:1}))));
  }
}
function startReview(){
  const dues=dueList();
  const pool = dues.length ? dues : aheadList(50);   // 有到期先清到期，否则提前复习
  if (!pool.length){ toast('还没有可复习的词，先学新词吧'); return; }
  beginSession('review', shuffle(pool.slice()).slice(0,50).map(W=>({k:W.k, t:pickType(wsPeek(W.k).b, W.w)})));
}
function startMode(t, dest){
  const listenDrill = curBook().listen && (t==='ls'||t==='dt');
  let pool=reviewPool(20);
  if ((t==='dt'||t==='sp')){
    const sp=pool.filter(W=>spellable(W.w));
    if (sp.length) pool=sp;          // 优先可拼写的词；全是短语类则退回原池（sp题看着拼还行）
    else if (t==='dt' && !listenDrill){ toast('学过的词里暂时没有适合听写的，先练听音辨义吧'); return; }
    else if (t==='dt') pool=[];      // 听力书：交给下面的未学词补足
  }
  let steps=pool.map(W=>({k:W.k, t}));
  // 听力书拿起来就能听：学过的词不足 20 个时，用未学的词按书序补足（预习模式，不动记忆曲线）
  if (listenDrill && steps.length<20){
    const have=new Set(pool.map(W=>W.k));
    for (const W of WORDS){
      if (steps.length>=20) break;
      const st=wsPeek(W.k);
      if (have.has(W.k) || (st&&(st.s>0||st.z))) continue;
      if (t==='dt' && !spellable(W.w)) continue;
      steps.push({k:W.k, t, light:1});
    }
  }
  if (!steps.length){ toast(t==='dt'?'这本书暂时没有适合听写的词':'还没有可练的词，先学新词吧'); return; }
  beginSession('mode', steps, dest);
}
function startWrongs(){
  const pool=shuffle(wbList().slice()).slice(0,20);
  if (!pool.length){ toast('错词本是空的，很棒'); return; }
  // 听力词书的错词复练仍走听音题——测的就是"听到没懂"那条通路
  beginSession('wrongs', pool.map(W=>({k:W.k, t: curBook().listen ? pickType((wsPeek(W.k)||{}).b||0, W.w) : 'ec'})));
}
function startStars(){
  const pool=shuffle(starList().slice()).slice(0,20);
  if (!pool.length){ toast('生词本是空的，先去收藏几个词'); return; }
  beginSession('stars', pool.map(W=>({k:W.k, t:pickType((wsPeek(W.k)||{}).b||0, W.w)})));
}
function startUnitLearn(id){
  const u=UNITS.find(x=>x.id===id); const ks=[];
  u.words.forEach((w,i)=>{ const k=id+':'+i; if (isUnseen(WORDS[WIDX[k]])) ks.push(k); });
  if (!ks.length){ toast('本单元没有未学的词'); return; }
  pvCover=false;
  screen={type:'learn', ks, cont:'unit'};
  render(); window.scrollTo(0,0);
}
function startUnitQuiz(id){
  const u=UNITS.find(x=>x.id===id); const pool=[];
  u.words.forEach((w,i)=>{ const k=id+':'+i; const st=wsPeek(k); if (st&&st.s>0&&!st.z) pool.push(k); });
  if (!pool.length){ toast('本单元还没学过的词，先学新词'); return; }
  beginSession('unit', shuffle(pool).map(k=>({k, t:pickType(wsPeek(k).b, WORDS[WIDX[k]].w)})));
}
function beginSession(kind, steps, dest){
  steps=steps.filter(s=>s.k in WIDX);
  if (!steps.length){ toast('没有可练的词'); return; }
  SES={kind, steps, pos:0, ok:0, ng:0, newN:0, combo:0, maxCombo:0, rq:{}, xp0:S.xp, dest:(dest!=null?dest:null)};
  if (typeof petRndId !== 'undefined') petRndId = 0;   // 每场会话重掷一次随机露脸表情
  screen={type:'session'}; render(); window.scrollTo(0,0);
}
function starCur(){
  const q=SES; if (!q) return;
  const st=q.steps[q.pos]; if (st) toggleStar(st.k);
}
function zhanCur(){
  const q=SES; if (!q) return;
  const st=q.steps[q.pos]; if (!st) return;
  const k=st.k, w=ws(k);
  w.z=1; if (w.s===0) w.s=1; save();
  toast('⚔ 已斩 · 此词不再出现（可在「已斩词」恢复）'); sfx('ok'); checkAch();
  q.steps=q.steps.filter((s,i)=>i<=q.pos || s.k!==k);
  if (lisChainKs) lisChainKs=lisChainKs.filter(x=>x!==k);   // 特训池同步剔除
  sNext();
}
function requeue(st){
  // 听力词书的听音题：错了不当场重出，看完正确答案就往下走——巩固交给遗忘曲线，下次复习自动再现
  if (curBook().listen && (st.t==='ls'||st.t==='dt')) return;
  const q=SES; q.rq[st.k]=(q.rq[st.k]||0)+1;
  if (q.rq[st.k]<=2) q.steps.push({k:st.k, t:st.t, drill:1});
}
function exitSession(){
  if (SES && SES.pos<SES.steps.length){
    ask('退出本次训练？\n已作答的进度会保留。', doExitSession, '退 出');
    return;
  }
  doExitSession();
}
function doExitSession(){
  clearTimeout(advT); SES=null; screen=null; lisChainKs=null; render(); window.scrollTo(0,0);
}
function sNext(){
  clearTimeout(advT);
  if (!SES) return;
  SES.pos++; render(); window.scrollTo(0,0);
}
function sAnswer(oi){
  const q=SES; if (!q) return;
  const st=q.steps[q.pos]; if (st.ans!=null) return;
  const W=WORDS[WIDX[st.k]];
  const ok = st.opts[oi].k===W.k;
  st.ans=oi; st.ok=ok;
  gradeStep(st, W, ok);
  if (st.t!=='ec' || !ok) say(W.w);
  render();
  if (ok && !needDetail(st)) advT=setTimeout(sNext, 550);
}
function gradeStep(st, W, ok){
  if (st.light){
    // 听力特训巩固步：不动 SRS/错词本，只给少量经验和连击反馈
    if (ok){ SES.ok++; SES.combo++; SES.maxCombo=Math.max(SES.maxCombo,SES.combo); addXp(1); }
    else { SES.ng++; SES.combo=0; }
    save(); sfx(ok?'ok':'ng');
    return;
  }
  if (!st.drill){
    applyAnswer(W.k, ok);
    if (st.nw) SES.newN++;
    if (ok){
      SES.ok++; SES.combo++; SES.maxCombo=Math.max(SES.maxCombo,SES.combo);
      if (SES.combo>(S.best.combo||0)) S.best.combo=SES.combo;
      const L=S.log[today()]; if (L) L.cb=Math.max(L.cb||0, SES.combo);   // 当日最高连击
      addXp(2 + (SES.combo>0 && SES.combo%10===0 ? 5 : 0));
      if (SES.combo>0 && SES.combo%10===0){ try { if (typeof petFeed==='function') petFeed('combo'); } catch(e){} }  // 每 10 连击也喂宠物
    } else { SES.ng++; SES.combo=0; addXp(1); }
    save();
  }
  if (!ok) requeue(st);
  sfx(ok?'ok':'ng');
  checkAch();
}
function needDetail(st){ return st.ok===false; }   // 只有答错才停下纠正；答对一律直接走

/* ---------- 拼写 ---------- */
function spCheck(){
  const q=SES; if (!q) return;
  const st=q.steps[q.pos]; if (st.ans!=null) return;
  const W=WORDS[WIDX[st.k]];
  const inp=$('#spin'); if (!inp) return;
  // 判定前归一化：弯撇号→直撇号、连续空格合一（iOS 智能标点/多敲空格不冤枉人）
  const spNorm=s=>String(s).replace(/[’‘]/g,"'").replace(/\s+/g,' ').trim().toLowerCase();
  const val=spNorm(inp.value);
  if (!val) return;
  const ok = val===spNorm(W.w);
  st.tries=(st.tries||0)+1;
  st.typed=val;
  if (ok){
    st.ans=1; st.ok=true;
    if (!st.drill){                                        // 巩固步不计入拼写连对纪录
      S.best.spellCur=(S.best.spellCur||0)+1;
      S.best.spell=Math.max(S.best.spell||0, S.best.spellCur);
    }
    gradeStep(st, W, true); say(W.w); render();
    if (!needDetail(st)) advT=setTimeout(sNext, 600);
  } else if (st.tries>=2){
    st.ans=1; st.ok=false; if (!st.drill) S.best.spellCur=0;
    gradeStep(st, W, false); say(W.w); render();
  } else {
    if (!st.drill) S.best.spellCur=0;
    save();
    sfx('ng'); render();
    if (st.t==='dt') say(W.w);          // 听写第一次拼错多半是没听清，自动重播一遍
    const i2=$('#spin'); if (i2){ i2.value=''; i2.focus(); }
  }
}
function spSlots(W, typed, final){
  const t=W.w; let h='<div class="slots">';
  for (let i=0;i<t.length;i++){
    const ch=t[i]===' ' ? '&nbsp;' : esc(t[i]);
    if (final) h+=`<span class="slot ${typed && typed[i]===t[i].toLowerCase()?'hit':'miss'}">${ch}</span>`;
    else h+=`<span class="slot">${typed&&typed[i]?esc(typed[i]):''}</span>`;
  }
  return h+'</div>';
}

/* ---------- 回看：直接翻回上一题（已答状态），只看不改进度 ---------- */
function sReview(){                 // 点"回看"→ 跳到上一题(已做好的样子)
  const q=SES; if (!q || q.pos<=0) return;
  clearTimeout(advT);
  q.rev = q.pos-1; render(); window.scrollTo(0,0);
}
function sRevGo(d){                 // 回看模式里前后翻题
  const q=SES; if (!q || q.rev==null) return;
  let n=q.rev+d;
  if (n<0) n=0;
  if (n>=q.pos){ sRevExit(); return; }   // 翻过最新一题 → 回到当前继续
  q.rev=n; render(); window.scrollTo(0,0);
}
function sRevExit(){                // 返回当前题继续答
  const q=SES; if (!q) return;
  q.rev=null; render(); window.scrollTo(0,0);
}

/* ---------- 会话渲染 ---------- */
function rSession(){
  const q=SES;
  const rev = (q.rev!=null && q.rev>=0 && q.rev<q.pos);   // 回看模式：看已答过的第 q.rev 题
  if (!rev && q.pos>=q.steps.length) return rSessionEnd();
  const pos = rev ? q.rev : q.pos;
  const st=q.steps[pos]; const W=WORDS[WIDX[st.k]];
  if (!st.opts && st.t!=='sp' && st.t!=='dt') st.opts=optionsFor(W, st.t==='ce'?'w':'g');
  const answered = rev ? true : (st.ans!=null);
  const starred=!!(wsPeek(st.k)&&wsPeek(st.k).st);
  let h;
  if (rev){
    h=`<div class="stop">
      <button class="x" onclick="sRevExit()" title="返回继续答题" aria-label="返回">✕</button>
      <div class="revtag">↩ 回看 · 第 ${pos+1} / ${q.pos} 题（已做）</div></div>`;
  } else {
    h=`<div class="stop">
      <button class="x" onclick="exitSession()" aria-label="退出">✕</button>
      <div class="sprog"><i style="width:${Math.round(q.pos/q.steps.length*100)}%"></i></div>
      <span class="combo num">${q.combo>1?'⚡ ×'+q.combo:''}</span>
      <button class="x" onclick="starCur()" title="标记生难词，收入生词本" aria-label="标记生难词" ${starred?'style="color:var(--amber);border-color:var(--amber)"':''}>${starred?'★':'☆'}</button>
      <button class="x" onclick="zhanCur()" title="斩掉这个词，不再出现" aria-label="斩掉这个词">⚔</button></div>`;
    if (q.pos>0) h+=`<div class="sbackwrap"><button class="sback" onclick="sReview()" title="回看上一题做过的" aria-label="回看">↩ 回看</button></div>`;
  }
  h+=`<div class="qask">${st.drill?'巩固 · ':''}${st.nw?'新词 · ':''}${typeName(st.t)}</div>`;

  if (st.t==='ec'){
    h+=`<div class="qword" data-say="${A(W.w)}">${esc(W.w)}</div>
        <div class="qphon">${W.p?'/'+esc(W.p)+'/':''}</div>`;
    h+=rOpts(st, W, 'g');
  } else if (st.t==='ce'){
    h+=`<div class="gmeaning">${esc(W.g)}</div>`;
    h+=rOpts(st, W, 'w');
  } else if (st.t==='ls'){
    if (!answered) h+=`<button class="bigsay" data-say="${A(W.w)}" aria-label="播放发音"><svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3z" fill="currentColor" stroke="none"/><path d="M15.5 7a6.5 6.5 0 0 1 0 10M18 4.5a10 10 0 0 1 0 15"/></svg></button>
      <div class="muted" style="text-align:center">听发音，选出词义 · 没听到就点大喇叭</div>`;
    else h+=`<div class="qword reveal" data-say="${A(W.w)}">${esc(W.w)}</div><div class="qphon">${W.p?'/'+esc(W.p)+'/':''}</div>`;
    h+=rOpts(st, W, 'g');
  } else if (st.t==='sp' || st.t==='dt'){
    if (st.t==='sp'){
      h+=`<div class="gmeaning">${esc(W.g)}</div>
          <div class="qphon" style="margin-top:6px">${W.p?'/'+esc(W.p)+'/':''}</div>`;
    } else {
      h+=`<button class="bigsay" data-say="${A(W.w)}" aria-label="播放发音" style="margin-top:14px"><svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3z" fill="currentColor" stroke="none"/><path d="M15.5 7a6.5 6.5 0 0 1 0 10M18 4.5a10 10 0 0 1 0 15"/></svg></button>`;
      if (!answered) h+=`<div class="muted" style="text-align:center">听发音，拼出这个单词 · 没听到就点大喇叭</div>`;
      if (st.tries && !answered) h+=`<div class="gmeaning reveal" style="font-size:15px;padding-top:8px">${esc(W.g)}</div>`;
    }
    if (!answered){
      h+=spSlots(W, '', false);
      h+=`<input id="spin" class="spellin" type="text" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="拼出这个单词" onkeydown="if(event.key==='Enter'&&!event.repeat)spCheck()">`;
      if (st.tries) h+=`<div class="muted" style="text-align:center;margin-top:8px">再试一次 · 首字母 <b>${esc(W.w[0])}</b> · 共 ${W.w.replace(/[^A-Za-z]/g,'').length} 个字母${W.w.includes(' ')?` · ${W.w.trim().split(/\s+/).length} 个词`:''}</div>`;
      h+=`<button class="b3d" onclick="spCheck()">检 查</button>`;
    } else {
      if (st.t==='dt') h+=`<div class="gmeaning" style="padding-top:6px;font-size:15px">${esc(W.g)}</div>`;
      h+=spSlots(W, st.ok ? W.w.toLowerCase() : st.typed, true);
      if (!st.ok) h+=`<div class="muted" style="text-align:center">你拼的是：${esc(st.typed||'—')} · 正确拼写见上（红色为拼错的位置）</div>`;
    }
  }

  if (answered && needDetail(st)) h+=rDetail(W);
  if (rev){
    h+=`<div class="revnav">
      <button class="b3d line" onclick="sRevGo(-1)" ${pos<=0?'disabled':''}>‹ 上一题</button>
      <button class="b3d line" onclick="sRevGo(1)" ${pos>=q.pos-1?'disabled':''}>下一题 ›</button>
    </div>
    <button class="b3d" onclick="sRevExit()">返回 · 继续答题</button>
    <div class="khint"><kbd>←</kbd> <kbd>→</kbd> 翻题　<kbd>回车</kbd> 返回继续</div>`;
  } else {
    if (answered && (st.t==='sp' || needDetail(st) || !st.ok)) h+=`<button class="b3d snext" onclick="sNext()">下一词</button>`;
    const kh = (st.t==='sp'||st.t==='dt')
      ? (answered ? `<kbd>回车</kbd> 继续` : `<kbd>回车</kbd> 检查${st.t==='dt'?'　点喇叭重播':''}`)
      : `<kbd>1</kbd>–<kbd>4</kbd> 选项　<kbd>空格</kbd> 发音　<kbd>回车</kbd> 继续`;
    h+=`<div class="khint">${kh}</div>`;
  }
  if (typeof petCornerHtml==='function'){ try { h+=petCornerHtml(); } catch(e){} }   // 右下角小表情挂件
  $('#app').innerHTML=h;
  const inp=$('#spin'); if (inp) inp.focus();
  if (!answered){
    if (st.t==='ec' && S.cfg.auto && st.said!==1){ st.said=1; say(W.w); }
    if ((st.t==='ls' || st.t==='dt') && st.said!==1){ st.said=1; say(W.w); }
  }
}
function rOpts(st, W, kind){
  const answered=st.ans!=null;
  let h='<div class="opts">';
  st.opts.forEach((o,i)=>{
    let cls='opt';
    if (answered){
      if (o.k===W.k) cls+=' right';
      else if (i===st.ans) cls+=' wrong';
      else cls+=' dim';
    }
    const label = kind==='g' ? o.g : o.w;
    h+=`<button class="${cls}" type="button" data-answer="${i}" ${answered?'disabled':''}><span class="kno">${i+1}</span>${esc(label)}</button>`;
  });
  return h+'</div>';
}
function rDetail(W){
  const st=wsPeek(W.k)||{};
  return `<div class="detail reveal">
    <div class="spread"><div><span class="dw">${esc(W.w)}</span> <span class="dp">${W.p?'/'+esc(W.p)+'/':''}</span></div></div>
    <div class="dg">${esc(W.g)}</div>
    ${st.note?`<div class="muted" style="margin-top:6px">📝 ${esc(st.note)}</div>`:''}
    <div class="dbtns">
      <button data-say="${A(W.w)}">${SPK} 英音</button>
      <button data-say2="${A(W.w)}">${SPK} 美音</button>
      <button class="${st.st?'on':''}" onclick="toggleStar('${W.k}');render()"><svg viewBox="0 0 24 24"><path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.5 9.7l5.9-.9z"/></svg>${st.st?'已收藏':'生词本'}</button>
      <button class="${st.z?'zon':''}" onclick="toggleZhan('${W.k}')"><svg viewBox="0 0 24 24"><path d="M4 20 20 4M9.5 4.5 20 15M4 15l5 5"/></svg>${st.z?'已斩·撤销':'斩'}</button>
    </div></div>`;
}
function rSessionEnd(){
  clearTimeout(advT);
  const q=SES;
  const acc = (q.ok+q.ng) ? Math.round(q.ok/(q.ok+q.ng)*100) : 100;
  try { if (typeof petAfterSession==='function' && !q._petDone){ q._petDone=1; petAfterSession(acc, q.newN); } } catch(e){}
  const gained = S.xp-q.xp0;
  let h=`<div class="endwrap">
    <div style="font-size:52px;line-height:1">${acc>=90?'🏆':acc>=70?'💪':'📖'}</div>
    <h2>${q.kind==='task'?'今日任务完成':'训练完成'}</h2>
    <div class="sub">正确率 ${acc}%</div>
    <div class="endstats">
      <div><div class="n num">${q.newN}</div><div class="l">新学</div></div>
      <div><div class="n num">${q.ok+q.ng-q.newN}</div><div class="l">复习</div></div>
      <div><div class="n am num">×${q.maxCombo}</div><div class="l">最高连击</div></div>
      <div><div class="n num">+${gained}</div><div class="l">经验</div></div>
    </div></div>`;
  const wrongs=[...new Set(q.steps.filter(s=>!s.drill&&!s.light&&s.ok===false).map(s=>s.k))];
  const lisWrongs=[...new Set(q.steps.filter(s=>s.light&&s.ok===false).map(s=>s.k))];
  if (lisWrongs.length){
    h+=`<div class="sec">没听出来的词 · 建议点开再听几遍</div><div class="card">`;
    lisWrongs.forEach(k=>{ const W=WORDS[WIDX[k]]; h+=wRow(W); });
    h+=`</div>`;
  }
  if (wrongs.length){
    h+=`<div class="sec">本轮错词 · 已进错词本</div><div class="card">`;
    wrongs.forEach(k=>{ const W=WORDS[WIDX[k]]; h+=wRow(W); });
    h+=`</div>`;
  }
  if (q.kind==='wrongs' && wbList().length) h+=`<button class="b3d red" onclick="startWrongs()">再抽一批错词 · ${Math.min(20,wbList().length)} 词</button>`;
  if (q.kind==='mode' && q.steps.length) h+=`<button class="b3d line" onclick="startMode('${q.steps[0].t}', ${q.dest!=null?q.dest:'null'})">再来一组</button>`;

  // 听力词书：任务完成后自动进入听力特训两关（听音辨义 → 听音拼写）
  const lisNext = curBook().listen ? (q.kind==='task' ? 1 : q.kind==='lis1' ? 2 : 0) : 0;
  if (lisNext){
    // 练习池只算一次并固定（点星标等重渲染不再重洗牌）：今天学过的全部词 ∪ 刚才会话的词
    if (!q.lisKs){
      const doneToday = (S.today && S.today.d===today() && S.today.done) || [];
      q.lisKs = q.kind==='task'
        ? shuffle([...new Set([...doneToday, ...q.steps.map(s=>s.k)])]).slice(0,30)
        : (lisChainKs || []);
    }
    const ks = q.lisKs;
    if (ks && ks.length){
      lisChainKs = ks;
      h+=`<div class="card" style="text-align:center;margin-top:12px">
        <div style="font-weight:800;letter-spacing:1px">🎧 听力特训 第${lisNext}关</div>
        <div class="muted" style="margin-top:4px">${lisNext===1?'听音辨义 · 听到就要认出意思':'听音拼写为主 · 拼不了的短语出辨义'}，3 秒后自动开始</div></div>
        <button class="b3d" onclick="startLisChain(${lisNext}, lisChainKs)">立即开始</button>
        <button class="b3d ghost" onclick="clearTimeout(advT);SES=null;screen=null;lisChainKs=null;go(0)">今天先到这，跳过</button>`;
      $('#app').innerHTML=h;
      tryCheckin(); checkAch();
      // 词卡弹层打开时暂停倒计时（关闭弹层重渲染时会重新计时）
      let modalOpen=false; try { modalOpen=$('#modal').classList.contains('show'); } catch(e){}
      if (!modalOpen) advT=setTimeout(()=>{ startLisChain(lisNext, lisChainKs); }, 3000);
      return;
    }
  }
  if (q.kind==='lis2'){ h=h.replace('训练完成','🎧 听力特训完成'); lisChainKs=null; }

  h+=`<button class="b3d" onclick="SES=null;screen=null;go(${q.dest!=null?q.dest:endDest(q.kind)})">完 成</button>`;
  $('#app').innerHTML=h;
  tryCheckin(); checkAch();
}

/* ================= 速刷 ================= */
function startFlash(dest){
  const pool=reviewPool(30);
  if (!pool.length){ toast('还没有学过的词，先学新词吧'); return; }
  FL={cards:shuffle(pool.slice()), pos:0, showG:false, hist:[], ok:0, ng:0, xp0:S.xp, dest:(dest!=null?dest:1)};
  screen={type:'flash'}; render(); window.scrollTo(0,0);
}
function flAnswer(ok){
  const q=FL; if (!q || q.pos>=q.cards.length) return;
  const W=q.cards[q.pos];
  const prev=S.w[W.k] ? JSON.parse(JSON.stringify(S.w[W.k])) : null;
  const wasNew = !prev || prev.s===0;
  const wasMaster = !!prev && (prev.b||0)>=MASTER;
  const h={k:W.k, prev, ok, wasNew, pos:q.pos, d:today()};
  q.hist.push(h);
  window._noPet=1; applyAnswer(W.k, ok); window._noPet=0;   // 速刷可撤销，不喂宠物防刷经验
  h.md = ((S.w[W.k].b>=MASTER)?1:0) - (wasMaster?1:0);   // 熟练量净变化，撤销时反向冲销
  if (ok){ q.ok++; addXp(2); } else { q.ng++; addXp(1); }
  save(); sfx(ok?'ok':'ng');
  if (ok){ q.pos++; q.showG=false; } else { q.showG=true; say(W.w); }
  render();
}
function flUndo(){
  const q=FL; if (!q || !q.hist.length) return;
  const h=q.hist.pop();
  q.pos=h.pos; q.showG=false;                    // 无条件回到作答时的卡片
  if (h.prev) S.w[h.k]=h.prev; else delete S.w[h.k];
  bumpOn(h.d,'q',-1); if (!h.ok) bumpOn(h.d,'w',-1); if (h.wasNew) bumpOn(h.d,'n',-1);
  if (h.md) bumpOn(h.d,'m',-h.md);
  if (h.wasNew && S.today && S.today.done){ S.today.done=S.today.done.filter(x=>x!==h.k); }
  if (h.ok){ q.ok--; S.xp=Math.max(0,S.xp-2); } else { q.ng--; S.xp=Math.max(0,S.xp-1); }
  save(); render();
}
function flZhan(){
  const q=FL; if (!q || q.pos>=q.cards.length) return;
  const W=q.cards[q.pos]; const w=ws(W.k);
  w.z=1; if (w.s===0) w.s=1; save();
  toast('⚔ 已斩 · 此词不再出现'); sfx('ok'); checkAch();
  q.pos++; q.showG=false; render();
}
function flNext(){ const q=FL; if(!q) return; q.pos++; q.showG=false; render(); }
function rFlash(){
  const q=FL;
  if (q.pos>=q.cards.length){
    const acc=(q.ok+q.ng)?Math.round(q.ok/(q.ok+q.ng)*100):100;
    $('#app').innerHTML=`<div class="endwrap"><div style="font-size:52px;line-height:1">⚡</div>
      <h2>速刷完成</h2><div class="sub">认识率 ${acc}%</div>
      <div class="endstats">
        <div><div class="n num">${q.ok}</div><div class="l">认识</div></div>
        <div><div class="n rd num">${q.ng}</div><div class="l">不认识</div></div>
        <div><div class="n num">${q.ok+q.ng}</div><div class="l">总量</div></div>
        <div><div class="n num">+${S.xp-q.xp0}</div><div class="l">经验</div></div></div>
      <button class="b3d" onclick="const _d=FL.dest;FL=null;screen=null;go(_d)">完 成</button></div>`;
    tryCheckin(); checkAch(); return;
  }
  const W=q.cards[q.pos];
  let h=`<div class="stop">
    <button class="x" onclick="FL=null;screen=null;render()" aria-label="退出">✕</button>
    <div class="sprog"><i style="width:${Math.round(q.pos/q.cards.length*100)}%"></i></div>
    <span class="combo num">${q.pos+1}/${q.cards.length}</span></div>`;
  h+=`<div class="fcard">
    <div class="qword" data-say="${A(W.w)}" style="padding-top:0">${esc(W.w)}</div>
    <div class="qphon">${W.p?'/'+esc(W.p)+'/':''}</div>`;
  if (q.showG){
    h+=`<div class="dg reveal" style="margin-top:14px;font-size:17px">${esc(W.g)}</div></div>
      <button class="b3d" onclick="flNext()">下一个</button>`;
  } else {
    h+=`</div><div class="row2">
      <button class="b3d" onclick="flAnswer(true)">认 识</button>
      <button class="b3d red" onclick="flAnswer(false)">不认识</button></div>`;
  }
  const fstar=!!(wsPeek(W.k)&&wsPeek(W.k).st);
  h+=`<div class="row2"><button class="b3d ghost" onclick="flUndo()" ${q.hist.length?'':'disabled'}>撤销</button>
    <button class="b3d ghost" onclick="toggleStar('${W.k}')" ${fstar?'style="color:var(--amber);border-color:var(--amber)"':''}>${fstar?'★ 已标生词':'☆ 标生难词'}</button>
    <button class="b3d ghost" onclick="flZhan()">⚔ 斩</button></div>
    <div class="khint"><kbd>→</kbd> 认识　<kbd>←</kbd> 不认识　<kbd>Z</kbd> 撤销　<kbd>空格</kbd> 发音</div>`;
  $('#app').innerHTML=h;
  if (S.cfg.auto && q.said!==q.pos && !q.showG){ q.said=q.pos; say(W.w); }
}

/* ================= 连连看 ================= */
function startMatch(dest){
  const pool=WORDS.filter(W=>{ const st=wsPeek(W.k); return st&&st.s>0&&!st.z; });
  if (pool.length<5){ toast('学过 5 个词后开放连连看'); return; }
  const seenG=new Set(); const pairs=[];
  for (const W of shuffle(pool.slice())){            // 释义文本去重，避免两个格子长一样
    if (seenG.has(W.g)) continue;
    seenG.add(W.g); pairs.push(W);
    if (pairs.length>=5) break;
  }
  if (pairs.length<5){ toast('可用词不足 5 个'); return; }
  ML={dest:(dest!=null?dest:1), pairs, ws:shuffle(pairs.slice()), gs:shuffle(pairs.slice()), sel:null,
      done:new Set(), miss:0, t0:performance.now(), fin:0};
  screen={type:'match'}; render(); window.scrollTo(0,0);
  mTick();
}
function mTick(){
  if (!ML || ML.fin) return;
  const el=$('#mt'); if (el) el.textContent=((performance.now()-ML.t0)/1000).toFixed(1)+'s';
  requestAnimationFrame(mTick);
}
function mPick(side, i){
  const q=ML; if (!q || q.fin) return;
  const item = side==='w' ? q.ws[i] : q.gs[i];
  if (q.done.has(item.k)) return;
  sfx('pick');
  if (!q.sel){ q.sel={side, i, k:item.k}; render(); return; }
  if (q.sel.side===side){ q.sel={side, i, k:item.k}; render(); return; }
  if (q.sel.k===item.k){
    q.done.add(item.k); q.sel=null; sfx('ok');
    if (q.done.size===q.pairs.length) mFinish();
    render();
  } else {
    q.miss++; const a=q.sel; q.sel=null; sfx('ng');
    render();
    const c1=$('#m_'+a.side+'_'+a.i), c2=$('#m_'+side+'_'+i);
    if (c1) c1.classList.add('bad'); if (c2) c2.classList.add('bad');
  }
}
function mFinish(){
  const q=ML; q.fin=1;
  q.time=Math.round((performance.now()-q.t0)/100)/10;
  if (!S.best.llk || q.time<S.best.llk) S.best.llk=q.time;
  if (q.miss===0 && (!S.best.llkClean || q.time<S.best.llkClean)) S.best.llkClean=q.time;
  bump('q',5); addXp(10); save();
  sfx('ck'); checkAch(); tryCheckin();
}
function rMatch(){
  const q=ML;
  let h=`<div class="stop">
    <button class="x" onclick="ML=null;screen=null;render()" aria-label="退出">✕</button>
    <div class="mtimer num" id="mt" style="flex:1">0.0s</div>
    <span class="combo num">失误 ${q.miss}</span></div>`;
  if (q.fin){
    h+=`<div class="endwrap"><div style="font-size:52px;line-height:1">${q.miss===0?'🥇':'🎯'}</div>
      <h2 class="num">${q.time}s</h2>
      <div class="sub">失误 ${q.miss} 次 · 最佳 ${S.best.llk||q.time}s${S.best.llkClean?' · 零失误最佳 '+S.best.llkClean+'s':''}</div>
      <div class="row2"><button class="b3d" onclick="startMatch()">再来一局</button>
      <button class="b3d line" onclick="const _d=ML.dest;ML=null;screen=null;go(_d)">返 回</button></div></div>`;
    $('#app').innerHTML=h; return;
  }
  h+=`<div class="muted" style="text-align:center;margin-top:4px">把单词和释义连成对</div><div class="mgrid">`;
  for (let i=0;i<q.pairs.length;i++){
    const wI=q.ws[i], gI=q.gs[i];
    const selW=q.sel&&q.sel.side==='w'&&q.sel.i===i, selG=q.sel&&q.sel.side==='g'&&q.sel.i===i;
    h+=`<button id="m_w_${i}" class="mcell ${q.done.has(wI.k)?'done':''} ${selW?'sel':''}" onclick="mPick('w',${i})" style="font-size:16px;font-weight:800">${esc(wI.w)}</button>`;
    h+=`<button id="m_g_${i}" class="mcell ${q.done.has(gI.k)?'done':''} ${selG?'sel':''}" onclick="mPick('g',${i})">${esc(clip(gI.g,26))}</button>`;
  }
  h+=`</div>`;
  $('#app').innerHTML=h;
}

/* ================= 全局键盘 ================= */
document.addEventListener('keydown', e=>{
  if (e.repeat || askOpen()) return;
  if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
  const k=e.key;
  if (SES && screen && screen.type==='session'){
    if (SES.rev!=null && SES.rev>=0 && SES.rev<SES.pos){   // 回看模式：←→翻题，回车/Esc 返回
      if (k==='ArrowLeft'){ e.preventDefault(); sRevGo(-1); return; }
      if (k==='ArrowRight'){ e.preventDefault(); sRevGo(1); return; }
      if (k==='Enter'||k==='Escape'){ e.preventDefault(); sRevExit(); return; }
      if (k===' '){ e.preventDefault(); const rst=SES.steps[SES.rev]; if (rst) say(WORDS[WIDX[rst.k]].w); return; }
      return;
    }
    const st=SES.steps[SES.pos];
    if (!st) return;
    if (st.ans==null && st.t!=='sp' && st.t!=='dt' && ['1','2','3','4'].includes(k)){ e.preventDefault(); const i=+k-1; if (st.opts && st.opts[i]) sAnswer(i); return; }
    if (k===' '){ e.preventDefault(); say(WORDS[WIDX[st.k]].w); return; }
    if (k==='Enter' && st.ans!=null){ e.preventDefault(); sNext(); return; }
  }
  if (FL && screen && screen.type==='flash' && FL.pos<FL.cards.length){
    if (k===' '){ e.preventDefault(); say(FL.cards[FL.pos].w); return; }
    if (FL.showG){ if (k==='Enter'||k==='ArrowRight'){ e.preventDefault(); flNext(); return; } }
    else {
      if (k==='ArrowRight'){ e.preventDefault(); flAnswer(true); return; }
      if (k==='ArrowLeft'){ e.preventDefault(); flAnswer(false); return; }
    }
    if (k==='z'||k==='Z'){ flUndo(); return; }
  }
});
