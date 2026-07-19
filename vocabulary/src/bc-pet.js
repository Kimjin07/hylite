'use strict';
/* ================= 学习宠物「斩宝」 =================
 * 一只跟着你背单词一起长大的小鸟：喂它=背单词，会孵化→长大→毕业，
 * 会根据你的表现在主页说俏皮话。纯本地、离线可用、跨词书共用一只。
 * 台词来源现为本地文案库；预留 petLineLLM() 接口，接了 AI 后端即可升级为实时生成。
 */

var PET_KEY = 'hylite_pet_v1';
var petState = null;
var petPending = null;   // 下次主页渲染要说的"事件台词"桶（学习中发生、回主页时补说）

function petLoad(){
  try { petState = JSON.parse(store() && store().getItem(PET_KEY)); } catch(e){ petState = null; }
  if (!petState || typeof petState !== 'object'){
    petState = { name:'斩宝', exp:0, born: today(), lastSeen: today(), stage:0 };
  }
  if (typeof petState.exp !== 'number') petState.exp = 0;
  if (!petState.name) petState.name = '斩宝';
  return petState;
}
function petSave(){ try { store() && store().setItem(PET_KEY, JSON.stringify(petState)); } catch(e){} }

/* ---------- 进化阶段（按累计经验） ---------- */
var PET_STAGES = [
  { id:0, name:'蛋',   title:'一颗蠢蠢欲动的蛋', min:0,   next:40 },
  { id:1, name:'雏鸟', title:'刚破壳的小不点',   min:40,  next:140 },
  { id:2, name:'小鸟', title:'扑腾学飞的斩宝',   min:140, next:400 },
  { id:3, name:'飞鸟', title:'展翅高飞的斩宝',   min:400, next:900 },
  { id:4, name:'学霸鸟', title:'戴学士帽的词王', min:900, next:Infinity },
];
function petStageOf(exp){ let s=0; for (const st of PET_STAGES){ if (exp>=st.min) s=st.id; } return s; }
function petStage(){ return PET_STAGES[petStageOf(petState.exp)]; }
function petProgress(){
  const st = petStage();
  if (!isFinite(st.next)) return 1;
  return Math.max(0, Math.min(1, (petState.exp - st.min) / (st.next - st.min)));
}

/* ---------- 心情（实时，按今天学习状态 + 时间） ---------- */
function petMood(){
  if (petPending === 'evolve') return 'excited';
  const t = today();
  const studiedToday = (S && S.log && S.log[t] && ((S.log[t].n||0)>0 || (S.log[t].q||0)>0));
  const checkedIn = (S && S.ck && S.ck[t]);
  let hr = 12; try { hr = new Date().getHours(); } catch(e){}
  if (checkedIn) return 'happy';
  if (hr>=23 || hr<6) return 'sleepy';
  if (!studiedToday) return 'hungry';
  return 'chill';
}

/* ---------- 喂养（学习事件触发） ---------- */
function petFeed(kind){
  if (!petState) petLoad();
  const add = { learn:3, master:5, checkin:30, combo:1 }[kind] || 0;
  if (!add) return;
  const before = petStageOf(petState.exp);
  petState.exp += add;
  petState.lastSeen = today();
  const after = petStageOf(petState.exp);
  if (after > before){
    petState.stage = after;
    petPending = 'evolve';
    try { toast('🎉 ' + petState.name + ' 进化成「' + PET_STAGES[after].name + '」了！'); sfx('ck'); confetti(); } catch(e){}
  } else if (kind==='checkin' && !petPending){
    petPending = 'checkin';
  }
  petSave();
}
// 学习会话结束时按表现补一句评语
function petAfterSession(acc, n){
  if (petPending==='evolve') return;                 // 进化优先
  if (acc>=95) petPending='praise_hi';
  else if (acc>=70) petPending='praise_mid';
  else petPending='praise_low';
}

/* ---------- 台词库 ---------- */
var PET_LINES = {
  // 主页问候（按心情）
  greet_happy: ['今天也打卡啦，我又胖了一圈！','嘿嘿，学得好我心情就好～','有你这样的主人，我脸上有光。','背得漂亮，奖励我看你继续背？','今天状态在线，冲鸭！'],
  greet_chill: ['来都来了，不背两个词？','翅膀痒痒的，想学新词了。','我在这儿等你好久啦。','摸鱼可以，但先背 5 个？','今天想学哪本？我陪你。'],
  greet_hungry:['咕……我今天还没吃词呢。','主人，我饿了，喂我几个单词嘛。','再不学我要饿扁啦！','空空的肚子只有单词能填满。','喂词！喂词！(眼巴巴)'],
  greet_sleepy:['这么晚还学？我先眯一会儿…','困了…但你学我就陪着。','夜猫子主人，注意休息呀。','zzz…啊！我没睡，继续。','熬夜背词，明早别赖床哦。'],
  // 连续天数彩蛋（覆盖 greet）
  streak_hi:  ['连续 {s} 天！你是要把我喂成凤凰吗？','{s} 天不断更，主人你太猛了！','连打卡 {s} 天，我给你鼓掌(拍翅膀)。'],
  // 回归（隔了几天没来）
  comeback:   ['你终于回来了！我等得毛都长齐了。','以为你把我忘了…还好你回来了。','断更这么久，罚你多背 10 个！','失踪人口回归，抱一个(蹭蹭)。'],
  // 表现评语（会话后）
  praise_hi:  ['全对！你是不是偷偷开挂了？','这正确率，我给满分！','稳得一批，学霸本霸。','对对对对对——我词都不够你答了。'],
  praise_mid: ['不错不错，稳中有进。','大部分都对，再磨磨就无敌了。','及格线上小能手，继续！','有错才有长进，这波不亏。'],
  praise_low: ['错了几个？没事，我陪你再来。','别灰心，词是纸老虎。','错的都进错词本啦，回头收拾它们。','菜是暂时的，练练就香了。'],
  // 打卡
  checkin:    ['今日打卡！我又进食成功。','咔——打卡到手，连 {s} 天！','完成！今天的我营养均衡。','打卡打卡，我的养料到账～'],
  // 进化
  evolve:     ['我进化啦！是不是更帅了？','铛铛铛——{name} 升级形态！','感受到力量了…都是你喂的词！','新造型，认得出我吗？'],
  // 摸摸它
  pat:        ['嘿，痒痒的！','再摸要收费了(背 3 个词)。','舒服～但别耽误学习哦。','摸头杀，我认了。','咕咕(开心)。','别戳脸，戳翅膀。'],
};
function petPick(bucket){
  const arr = PET_LINES[bucket] || PET_LINES.greet_chill;
  const i = Math.floor(Math.random() * arr.length);
  return arr[i];
}
function petFill(s){
  return String(s).replace(/\{name\}/g, petState.name)
    .replace(/\{s\}/g, (typeof streak==='function'?streak():0))
    .replace(/\{lv\}/g, petStage().name);
}
// 预留：接了 AI 后端后，把这里改成 await fetch('/api/pet',...) 即可实时生成台词
function petLineLLM(/* bucket, ctx */){ return null; }
function petLine(){
  // 事件台词优先（进化/评语/打卡），说一次就清掉
  if (petPending){
    const map = { evolve:'evolve', checkin:'checkin', praise_hi:'praise_hi', praise_mid:'praise_mid', praise_low:'praise_low' };
    const b = map[petPending]; petPending = null;
    if (b) return petFill(petPick(b));
  }
  // 否则按心情问候，穿插连续天数/回归彩蛋
  const mood = petMood();
  const s = (typeof streak==='function'?streak():0);
  const lastGap = petDaysSince(petState.lastSeen);
  if (lastGap>=2) return petFill(petPick('comeback'));
  if (s>=7 && Math.random()<0.4) return petFill(petPick('streak_hi'));
  return petFill(petPick('greet_'+mood));
}
function petDaysSince(ds){
  try { const a=new Date(ds+'T00:00:00'), b=new Date(today()+'T00:00:00'); return Math.round((b-a)/86400000); } catch(e){ return 0; }
}

/* ---------- 造型（内联 SVG，随阶段/心情变化） ---------- */
function petEyes(mood){
  const c='#2b2b2b';
  if (mood==='happy')   return `<path d="M34 44 q4 -5 8 0" stroke="${c}" stroke-width="2.4" fill="none" stroke-linecap="round"/><path d="M58 44 q4 -5 8 0" stroke="${c}" stroke-width="2.4" fill="none" stroke-linecap="round"/>`;
  if (mood==='sleepy')  return `<path d="M34 45 h8" stroke="${c}" stroke-width="2.4" stroke-linecap="round"/><path d="M58 45 h8" stroke="${c}" stroke-width="2.4" stroke-linecap="round"/>`;
  if (mood==='excited') return `<text x="38" y="49" font-size="12" fill="${c}">★</text><text x="62" y="49" font-size="12" fill="${c}">★</text>`;
  if (mood==='hungry')  return `<circle cx="38" cy="45" r="3.4" fill="${c}"/><circle cx="62" cy="45" r="3.4" fill="${c}"/><circle cx="39.2" cy="43.8" r="1" fill="#fff"/><circle cx="63.2" cy="43.8" r="1" fill="#fff"/>`;
  return `<circle cx="38" cy="45" r="3" fill="${c}"/><circle cx="62" cy="45" r="3" fill="${c}"/>`;   // chill
}
function petMouthCheeks(mood){
  const beak='<path d="M46 52 l4 5 l4 -5 z" fill="#F5A623"/>';
  const cheek = (mood==='happy'||mood==='excited') ? '<circle cx="30" cy="52" r="4" fill="#FF9AA2" opacity=".7"/><circle cx="70" cy="52" r="4" fill="#FF9AA2" opacity=".7"/>' : '';
  return beak + cheek;
}
function petSVG(stage, mood){
  mood = mood || petMood();
  const eyes = petEyes(mood), face = petMouthCheeks(mood);
  const bob = mood==='sleepy' ? '' : ' class="petbob"';
  if (stage===0){
    // 蛋（带裂纹，随经验裂开一点）
    return `<svg viewBox="0 0 100 100"${bob} aria-hidden="true">
      <ellipse cx="50" cy="56" rx="30" ry="36" fill="#FDECC8" stroke="#E8C98A" stroke-width="2"/>
      <path d="M28 52 l10 -6 l6 8 l10 -7 l8 7" fill="none" stroke="#C9A25A" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="42" cy="66" r="2.6" fill="#2b2b2b"/><circle cx="58" cy="66" r="2.6" fill="#2b2b2b"/>
    </svg>`;
  }
  const size = { 1:0.7, 2:0.85, 3:1, 4:1 }[stage] || 1;
  const wings = stage>=2 ? '<ellipse cx="18" cy="60" rx="9" ry="14" fill="#FFD23F" transform="rotate(-18 18 60)"/><ellipse cx="82" cy="60" rx="9" ry="14" fill="#FFD23F" transform="rotate(18 82 60)"/>' : '';
  const cap = stage>=4 ? '<g><rect x="34" y="12" width="32" height="6" rx="1" fill="#243b53"/><path d="M50 4 l22 8 l-22 8 l-22 -8 z" fill="#243b53"/><circle cx="50" cy="12" r="2" fill="#F5A623"/><rect x="61" y="12" width="2" height="12" fill="#F5A623"/><circle cx="62" cy="25" r="2.4" fill="#F5A623"/></g>' : '';
  const feet = stage>=3 ? '<path d="M42 88 v6 M39 96 h6 M58 88 v6 M55 96 h6" stroke="#F5A623" stroke-width="2.4" stroke-linecap="round"/>' : '';
  return `<svg viewBox="0 0 100 100"${bob} aria-hidden="true">
    <g transform="translate(50 55) scale(${size}) translate(-50 -55)">
      ${wings}
      <ellipse cx="50" cy="56" rx="30" ry="30" fill="#FFD23F"/>
      <ellipse cx="50" cy="62" rx="20" ry="18" fill="#FFE58A"/>
      <g class="peteye">${eyes}</g>
      ${face}
      ${feet}
    </g>
    ${cap}
  </svg>`;
}

/* ---------- 主页宠物卡片 ---------- */
function petCardHtml(){
  if (!petState) petLoad();
  const st = petStage();
  const line = petLine();
  const pct = Math.round(petProgress()*100);
  const mood = petMood();
  return `<div class="petcard">
    <div class="petbubble">${esc(line)}</div>
    <div class="petstage-wrap">
      <button class="petbody" onclick="petPat()" aria-label="摸摸${esc(petState.name)}">${petSVG(st.id, mood)}</button>
    </div>
    <div class="petmeta">
      <div class="petname" onclick="petRename()">${esc(petState.name)} <span class="muted" style="font-size:11px">✎</span></div>
      <div class="muted" style="font-size:12px">${esc(st.title)}</div>
      <div class="petbar"><i style="width:${pct}%"></i></div>
      <div class="muted" style="font-size:11px;margin-top:3px">${isFinite(st.next)?('再喂 '+(st.next-petState.exp)+' 点经验就进化'):'已是最终形态 · 满级词王'}</div>
    </div>
  </div>`;
}
function petPat(){
  if (!petState) petLoad();
  const el = document.querySelector('.petbubble');
  if (el){ el.textContent = petFill(petPick('pat')); }
  const body = document.querySelector('.petbody svg');
  if (body){ body.classList.remove('petwiggle'); void body.offsetWidth; body.classList.add('petwiggle'); }
  try { sfx('ok'); } catch(e){}
}
function petRename(){
  let name = null;
  try { name = window.prompt('给宠物起个名字（最多 6 个字）：', petState.name); } catch(e){ return; }
  if (name==null) return;
  name = String(name).trim().slice(0,6);
  if (!name) return;
  petState.name = name; petSave();
  if (typeof render==='function' && !screen) render();
}
petLoad();
