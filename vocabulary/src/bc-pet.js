'use strict';
/* ================= 学习伙伴 · 表情图鉴 =================
 * 登录后才有。养一只小动物（狗/猫/鼠…可选），每背满 50 个词点亮一个新表情，一套集齐 6 个。
 * 学生可自选展示哪个已解锁表情：主页大图 + 答题右下角小挂件都用它。
 * 台词本地文案库（预留 petLineLLM() 以后可接 AI）。进度存本地(登录可见)。
 * —— 加新物种：deploy/vocabulary/pet/<id>/p1..p6.gif 放好，PET_SPECIES 加一行即可。
 */

var PET_KEY = 'hylite_petdex_v1';
var petState = null;
var petPending = null;

// 每个表情槽的默认属性（解锁门槛 / 情绪 / 名字）。各物种默认复用这套映射，特殊的可在物种里覆盖。
// 功能总开关：false = 只有预览(?pet=1/?petall=1)能看到，普通学生看不到；确认上线后改 true 对所有登录用户开放
var PET_LIVE = false;
var PET_STEP = 20;   // 每背 20 词解锁一个
// 用 [情绪, 名字] 列表定义每套表情（顺序 = p1,p2,...）。情绪决定什么场景自动露脸：
//   idle待机 / start开学 / happy高兴 / angry催学 / cry委屈 / tired摸鱼 / play互动 / confused懵 / neutral日常
function petMk(list, i){ return { id:i+1, file:'p'+(i+1)+'.gif', mood:list[0], name:list[1] }; }
var PET_SPECIES = [
  { id:'cat', name:'月薪喵', folder:'cat', emotes:[
    ['idle','呆萌'],['start','上号'],['happy','开心'],['angry','生气'],['cry','委屈'],['tired','摸鱼'],['cry','大哭'],['confused','懵圈'],['play','贴贴'] ].map(petMk) },
  { id:'rat', name:'抑郁大鼠', folder:'rat', emotes:[
    ['idle','呆萌'],['happy','开心'],['tired','躺平'],['angry','黑脸'],['cry','捂嘴'] ].map(petMk) },
  { id:'linedog', name:'线条小狗', folder:'linedog', emotes:[
    ['idle','呆坐'],['happy','蹦跶'],['start','摇摆'],['neutral','呆站'],['idle','毛球'],['tired','躺平'],['confused','趴着'],['play','贴贴'] ].map(petMk) },
];
function petSpecies(){ return PET_SPECIES.find(s=>s.id===petState.species) || PET_SPECIES[0]; }
function petSlots(){ return petSpecies().emotes.length; }   // 当前物种表情总数(不再固定 6)
// 预览：url 带 ?petall=1 全部解锁+免登录看；?pet=1 只是提前开启功能(仍需登录)
function petPreviewAll(){ try { return /[?&]petall=1/.test(location.search); } catch(e){ return false; } }
function petPreviewOn(){ try { return PET_LIVE || /[?&]pet(all)?=1/.test(location.search); } catch(e){ return PET_LIVE; } }
// 是否显示宠物卡片：预览全解锁模式(免登录) 或 (功能已开 且 已登录)
function petVisible(){ if (petPreviewAll()) return true; if (!petPreviewOn()) return false; try { return typeof syncUser==='function' && !!syncUser(); } catch(e){ return false; } }

function petLoad(){
  try { petState = JSON.parse(store() && store().getItem(PET_KEY)); } catch(e){ petState = null; }
  if (!petState || typeof petState !== 'object'){
    // 首次：用已学词数折算已解锁数(每20词1个)，老用户不空手
    let seed = 0;
    try { if (typeof counts==='function'){ const c=counts(); seed = c.seen||0; } } catch(e){}
    petState = { name:'旺仔', learned:seed, wordGranted:Math.floor(seed/PET_STEP), dex:{}, lastClaim:'', lastSeen: today(), species:'cat', pick:0 };
    petState.dex.cat = petState.wordGranted;
    petSave();
  }
  if (typeof petState.learned !== 'number') petState.learned = 0;
  if (typeof petState.wordGranted !== 'number') petState.wordGranted = Math.floor(petState.learned/PET_STEP);
  if (!petState.dex || typeof petState.dex !== 'object') petState.dex = {};
  if (!petState.name) petState.name = '旺仔';
  if (!petState.species || !PET_SPECIES.some(s=>s.id===petState.species)) petState.species = PET_SPECIES[0].id;
  if (typeof petState.pick !== 'number') petState.pick = 0;
  return petState;
}
var petPushT = null, petPulled = false;
function petSave(){
  try { store() && store().setItem(PET_KEY, JSON.stringify(petState)); } catch(e){}
  petSchedulePush();
}

/* ---------- 云同步（跟随账号；宠物全局一份，冲突取收集更多的一方） ---------- */
function petCloudOn(){ try { return typeof syncUser==='function' && !!syncUser() && typeof syncApi==='function'; } catch(e){ return false; } }
function petScore(p){ let s=Math.max(0,Number(p&&p.learned)||0); if(p&&p.dex) for(const k in p.dex) s+=Math.max(0,Number(p.dex[k])||0)*5; return s; }
function petMergeInto(cloud){
  // 把云端合进本地：learned 取大、每套 dex 取大、签到日期取晚、名字/当前物种/展示以"分高的一方"为准
  if (!cloud || typeof cloud!=='object') return;
  const localScore = petScore(petState), cloudScore = petScore(cloud);
  petState.learned = Math.max(petState.learned||0, cloud.learned||0);
  petState.wordGranted = Math.max(petState.wordGranted||0, cloud.wordGranted||0);
  const dex = petState.dex||{}; const cd = cloud.dex||{};
  for (const k in cd) dex[k] = Math.max(dex[k]||0, cd[k]||0);
  petState.dex = dex;
  if ((cloud.lastClaim||'') > (petState.lastClaim||'')) petState.lastClaim = cloud.lastClaim;
  if (cloudScore > localScore){   // 云端更"资深"，沿用它的身份设置
    if (cloud.name) petState.name = cloud.name;
    if (cloud.species) petState.species = cloud.species;
    if (typeof cloud.pick==='number') petState.pick = cloud.pick;
  }
}
async function petCloudPull(){
  if (!petCloudOn()) return;
  if (!petState) petLoad();
  try {
    const r = await syncApi('pet');
    if (r && r.ok && r.exists && r.data){
      let cloud; try { cloud = JSON.parse(r.data); } catch(e){ cloud=null; }
      if (cloud){ petMergeInto(cloud); try{ store()&&store().setItem(PET_KEY, JSON.stringify(petState)); }catch(e){}
        if (typeof render==='function' && !screen && petVisible()) render(); }
    }
    petPulled = true;
    petCloudPush();   // 合并后把结果推回，保证云端也是合并态
  } catch(e){}
}
async function petCloudPush(){
  if (!petCloudOn() || !petState) return;
  try {
    const r = await syncApi('pet', { method:'POST', body:{ data: JSON.stringify(petState) } });
    // 服务端可能返回"分更高的云端版本"，据此对齐本地，避免来回覆盖
    if (r && r.ok && r.data){ try { const back=JSON.parse(r.data); if (petScore(back)>petScore(petState)){ petMergeInto(back); store()&&store().setItem(PET_KEY, JSON.stringify(petState)); if(typeof render==='function'&&!screen&&petVisible()) render(); } } catch(e){} }
  } catch(e){}
}
function petSchedulePush(){
  if (!petCloudOn()) return;
  clearTimeout(petPushT);
  petPushT = setTimeout(()=>{ petCloudPush(); }, 4000);
}

/* ---------- 解锁进度（按已解锁"数量"推进：背词 + 每日领取都 +1；每套独立） ---------- */
function petUnlockedCount(){ if (petPreviewAll()) return petSlots(); return Math.min(petSlots(), petState.dex[petState.species] || 0); }
function petIsUnlocked(e){ return e.id <= petUnlockedCount(); }
function petEmoteSrc(e){ return 'pet/' + petSpecies().folder + '/' + e.file; }
// 给当前物种解锁下一个表情；reason 用于台词/提示
function petGrantOne(reason){
  const sp = petState.species, cur = petState.dex[sp] || 0;
  if (cur >= petSlots()) return false;
  petState.dex[sp] = cur + 1;
  petState._justUnlocked = cur + 1;
  petPending = 'unlock';
  try { toast('🎁 ' + (reason==='daily'?'今日签到，':'') + '解锁新表情：' + petSpecies().emotes[cur].name + '！'); sfx('ck'); confetti(); } catch(e){}
  return true;
}
// 今日能否领取（登录且当前物种没集满且今天没领过）
function petCanClaim(){ return petState && petState.lastClaim !== today() && (petState.dex[petState.species]||0) < petSlots(); }
function petClaim(){
  if (!petState) petLoad();
  if (petState.lastClaim === today()){ try{ toast('今天已经领过啦，明天再来～'); }catch(e){} return; }
  if ((petState.dex[petState.species]||0) >= petSlots()){ try{ toast('这只已经集齐啦，换个伙伴继续收集吧！'); }catch(e){} return; }
  petState.lastClaim = today();
  petGrantOne('daily');
  petSave();
  if (typeof render==='function' && !screen) render();
}

/* ---------- 心情 + 当前该露脸的表情 ---------- */
function petMoodNow(){
  const t = today();
  const studiedToday = (S && S.log && S.log[t] && ((S.log[t].n||0)>0 || (S.log[t].q||0)>0));
  const checkedIn = (S && S.ck && S.ck[t]);
  let hr = 12; try { hr = new Date().getHours(); } catch(e){}
  if (checkedIn) return 'happy';
  if (hr>=23 || hr<6) return 'tired';
  if (!studiedToday) return 'angry';
  return 'idle';
}
// 学生选中的展示表情（若已选且已解锁）优先；否则按心情/事件挑一个已解锁的
function petCurrentEmote(){
  const em = petSpecies().emotes;
  const unlocked = em.filter(petIsUnlocked);
  if (!unlocked.length) return null;
  if (petState.pick){ const p = em.find(e=>e.id===petState.pick); if (p && petIsUnlocked(p)) return p; }
  let want = petMoodNow();
  if (petPending==='unlock' && petState._justUnlocked){ const j=em.find(e=>e.id===petState._justUnlocked); if (j) return j; }
  else if (petPending==='cry' || petPending==='praise_low') want='cry';
  else if (petPending==='praise_hi' || petPending==='checkin') want='happy';
  return unlocked.find(e=>e.mood===want) || unlocked[unlocked.length-1] || unlocked[0];
}

/* ---------- 喂养（只有"学新词"计入解锁） ---------- */
function petFeed(kind){
  if (!petState) petLoad();
  if (kind==='learn'){
    petState.learned += 1; petState.lastSeen = today();
    // 每满 PET_STEP 个词发一个解锁额度（用 wordGranted 记账，避免撤销后重复发）
    const due = Math.floor(petState.learned / PET_STEP);
    if (due > petState.wordGranted){ petState.wordGranted = due; petGrantOne('word'); }
    petSave(); return 1;
  }
  if (kind==='checkin'){ petState.lastSeen=today(); if(!petPending) petPending='checkin'; petSave(); }
  return 0;
}
function petUnfeed(amount){
  if (!petState || !amount) return;
  petState.learned = Math.max(0, petState.learned - amount);
  petState.wordGranted = Math.min(petState.wordGranted, Math.floor(petState.learned/PET_STEP));
  petSave();
}
function petAfterSession(acc, n){
  if (petPending==='unlock') return;
  if (acc>=95) petPending='praise_hi'; else if (acc<60) petPending='cry'; else petPending='praise_mid';
}

/* ---------- 台词库 ---------- */
var PET_LINES = {
  idle:  ['来都来了，不背两个词？','爪子痒痒，想学新词了。','我在这儿等你好久啦。','摸鱼可以，但先背 5 个？','今天想学哪本？我陪你。'],
  start: ['上号上号，今天冲哪本？','装备已就位，开背！','奖励我看你连背 20 个？','让我看看你今天的手速。','走起，词海等着我们呢。'],
  happy: ['嘿嘿，学得好我尾巴都翘了！','有你这样的主人，我脸上有光。','背得漂亮，今天靓仔。','这状态，学霸预定！','爽！再来一组？'],
  angry: ['咕……今天还没喂我词呢！','再不学我要气鼓鼓了哦。','手指头动一动，背几个嘛！','你的词库在瞪你，快学。','哼，不背完不理你了。'],
  cry:   ['呜…错了几个没关系，我陪你再来。','别灰心，词是纸老虎。','错的都进错词本啦，回头收拾它。','菜是暂时的，练练就香了。','抱抱，擦干眼泪继续冲。'],
  tired: ['这么晚还学？我先趴一会儿…','困了…但你学我就陪着。','夜猫子主人，早点睡呀。','学完这组我们都去休息。','熬夜背词，明早别赖床。'],
  comeback:['你终于回来了！我等得毛都长齐了。','以为你把我忘了…还好你回来了。','断更这么久，罚你多背 10 个！','失踪人口回归，蹭蹭。'],
  praise_hi:['全对！你是不是偷偷开挂了？','这正确率我给满分！','稳得一批，学霸本霸。','对对对对对——我都跟不上你了。'],
  praise_mid:['不错不错，稳中有进。','大部分都对，再磨磨就无敌。','及格线上小能手，继续！','有错才有长进，这波不亏。'],
  checkin:['今日打卡！我又开心了。','咔——打卡到手，连 {s} 天！','完成！今天营养均衡。','打卡打卡，养料到账～'],
  unlock:['铛铛铛——新表情到手！','看我新解锁的样子，帅不帅？','又收集到一个我，继续凑齐！','背词的奖励，就是更多的我～'],
  pat:   ['嘿，痒痒的！','再摸要收费了（背 3 个词）。','舒服～但别耽误学习哦。','摸头杀，我认了。','汪！（开心）','别戳脸，戳肚子。'],
};
// 各物种性格化的"点它说话"台词（嘲讽/鼓励/耍贱/表达心情，混着来，越多越不重样）
var PET_SAY = {
  cat: [
    '又是为你打工的一天，喵。','这月薪，够你买几个新词？','摸鱼一时爽，考试火葬场哦~','别戳我，我在算今天亏了几个词。',
    '你不背，我可要扣你工资了。','打工人的命也是命，背两个吧。','喵？你确定这就够了？','加油…虽然我也不想加班。',
    '背完这组，本喵准你摸鱼五分钟。','KPI 就是你的正确率，冲！','老板（就是你）画的饼，我先啃为敬。','别划水了，海里没有单词。',
    '本喵今日情绪：为你的进度而波动。','再背 10 个，我给你打个五星好评。','摸鱼被我看到了啊，记小本本上了。','工资可以拖，单词不能欠。',
    '你学一个，我打一个卡，双赢。','喵生建议：现在背，比考前哭强。','这波不亏，学到就是赚到。','困了？我也困，但 deadline 不困。',
    '你是我唯一的甲方，求你上分。','背单词=充值，充得越多我越亮。','别看我可爱，我可是持证上岗的监工。','今天的你，比昨天多认识几个字母朋友。',
    '这个词你都不会？我 emo 了（不是，我是猫）。','背完这单元，本喵给你转发一条锦鲤。','单词不背，考场徒伤悲，喵。','阿伟，别学了…骗你的，快背。',
    '你与雅思高分之间，只差这几个词的距离。','退退退！退散吧，你的记不住！','这波啊，这波是背词版的田忌赛马。','家人们谁懂啊，主人今天词汇量涨了！',
    '你礼貌吗？这个高频词还没背。','背单词の呼吸·壹之型：日更五十。','这词一看就是考试的常客，盯紧它。','emo 是暂时的，词汇量是永久的。',
    '本喵掐指一算，这词今年必考。','word 不 word？先背了再说。','你的单词量正在偷偷变强，喵嘻嘻。','摸鱼可以，但 vocabulary 得跟上。',
    '这个词长得凶，但背下来它就是你的了。','别人在卷，你也别躺，各背各的。','拴 Q，但你还是得背这一组。','背词一时爽，一直背一直爽（真的）。'],
  rat: [
    '活着好累…但你在，我就不 emo 了。','背吧背吧，反正逃不掉的。','我 emo 了，除非你背 10 个哄我。','世界那么大，先把这几个词记了。',
    '别摸了我今天没电…开玩笑，继续。','虽然丧，但你进步我是真开心。','唉…好吧，看在你努力的份上夸夸你。','大鼠虽菜，但陪你到底。',
    'emo 归 emo，单词还是要背的。','我躺平，但我希望你别躺。','人间不值得，但这几个词值得。','摆烂 0 天…你一学我就支棱起来了。',
    '别问我快乐吗，问就是背单词的时候还行。','丧不可怕，可怕的是丧还不背。','我把忧郁留给自己，把加油留给你。','今天也想消失…但想看你考高分，忍了。',
    '你要是放弃，我可就真没盼头了。','唉，学吧，学着学着就不 emo 了。','负能量满满，但对你满是好评。','宇宙尽头是编制，编制之前是背词。',
    '我不是懒，我只是在积蓄陪你冲刺的能量。','你笑一个我能多活三天。','背不动的时候看看我，我比你还惨还在坚持。',
    '这个词背不下来？那我们一起烂在这（不是，你得背）。','听我说谢谢你，因为有你背单词。','鼠鼠我啊，就想看你词汇量支棱起来。','摆了摆了…骗你的，这单元陪你背完。',
    '生活已经很难了，别让单词也难住你，背它。','退钱！退钱！退我记不住的脑子…算了继续背。','这词是四级钉子户，见一次背一次。','我 emo 值 -100，但你每背一个 +10。',
    '鼠鼠不想动，但鼠鼠想让你考高分。','这个单词，多看它两眼它就服你了。','人生海海，先把这几个词记牢再说。','我裂开了，但你的记忆曲线不能裂。',
    '别问，问就是这词考试爱考。','背完这组你就赢过昨天的自己了，芭比 Q 的是我还得陪。','世另我：一个不想动但还在背词的存在。','这波记不住不算完，明天遗忘曲线见。',
    '鼠言鼠语：今日单词，宜背，忌摸。','我丧我的，你背你的，互不耽误。','有你在，背单词都没那么想 emo 了。'],
  linedog: [
    '汪！简单快乐就完事了~','我不懂那么多，就知道陪你背！','摸摸我，我更有劲陪你学！','汪汪！你真棒，我也棒！',
    '背单词耶！开心！','不管对错，反正我爱你（狗狗的爱）。','一起冲鸭，汪！','你笑一下嘛，我看着你学更香。',
    '今天也要摇尾巴支持你！','对了我开心，错了我还是开心，因为有你。','脑子空空，快乐满满，学它！','汪汪汪（翻译：你是最棒的）！',
    '不会就多看两眼，我陪你看。','我什么都不图，就图你多背两个。','冲鸭冲鸭！我的尾巴都摇成螺旋桨了！','你学习的样子，狗看了都点赞。',
    '简单的狗，只想你考好。','来嘛来嘛，背一个我转一圈。','我把快乐分你一半，剩下一半也给你。','汪！今天也是元气满满的一天！',
    '不管多难，有我在，汪！','你努力的样子，比小饼干还香。',
    '汪！这个词交给我们俩，拿下！','你背单词，我摇尾巴，绝配！','这词有点难？没事，我陪你磕它！','狗狗听不懂英语，但狗狗知道你在变强！',
    '这个单词记住啦？奖励我一个摸头！','背一个词，我就多爱你一点，汪！','冲鸭！单词都是纸老虎，我们是真狗！','你今天的词汇量，狗看了都要学！',
    '记不住？再看一眼嘛，我陪你看到会！','汪汪！这单元我们包圆了！','单词虐我千百遍，我待背词如初恋（狗版）！','你背词的样子，我能看一整天！',
    '这个词念出来给我听听？汪，好听！','别怕难词，有我给你摇旗呐喊，汪！','背完这组，我们去（脑内）散步庆祝！','你记住一个，我的尾巴就转一圈！',
    '主人加油，狗子监督（其实在卖萌）！','这词今天不背，明天还得背，不如现在，汪！'],
};
function petSayLine(){ const a = PET_SAY[petState.species] || PET_LINES.pat; return a[Math.floor(Math.random()*a.length)]; }
function petPick(b){ const a=PET_LINES[b]||PET_LINES.idle; return a[Math.floor(Math.random()*a.length)]; }
function petFill(s){ return String(s).replace(/\{name\}/g, petState.name).replace(/\{s\}/g, (typeof streak==='function'?streak():0)); }
function petLineLLM(){ return null; }
function petDaysSince(ds){ try { const a=new Date(ds+'T00:00:00'), b=new Date(today()+'T00:00:00'); return Math.round((b-a)/86400000); } catch(e){ return 0; } }
// 分动物性格的心情问候（顶部气泡）——每套一种口吻
var PET_MOOD_SAY = {
  cat: { idle:['来都来了，不背两个词？喵。','本喵已上岗，等你打卡。','摸鱼请自觉，先背 5 个。'],
    start:['上号！今天冲哪本词书？','装备就位，开背，喵~','让本喵看看你的手速。'],
    happy:['学得好，本喵今天准你摸鱼。','这状态，加薪（不是）！','嘿嘿，你争气我脸上有光。'],
    angry:['今天还没喂我词，工资倒扣！','再不学，本喵要罢工了喵。','你的 KPI 在瞪你，快！'],
    tired:['这么晚还卷？本喵先趴会儿…','加班有害健康，学完早睡。','困了…但 deadline 不困。'],
    cry:['错几个而已，本喵不扣你钱。','菜是暂时的，练练就香。','别丧，错词都进本子了，回头收拾它。'] },
  rat: { idle:['来了啊…那，背两个？','我在角落等你好久了。','摆烂可以，先背 5 个再摆。'],
    start:['勉强支棱起来，陪你开背。','来吧，逃不掉的，一起。','emo 暂停，学习开始。'],
    happy:['你进步，我难得地开心了。','今天不 emo，全靠你。','嘿…被你带得有点快乐。'],
    angry:['今天没喂我词，我更丧了。','再不学，我要原地消失了。','你不学，我 emo 加倍哦。'],
    tired:['这么晚…我快没电了，但陪你。','夜里学，明早别赖床。','困到怀疑人生…但你学我就撑着。'],
    cry:['呜…错了没事，我比你还惨还在陪你。','别哭，单词又不会咬人（大概）。','抱抱，擦干眼泪继续，反正都得学。'] },
  linedog: { idle:['汪！来背单词啦？','我摇着尾巴等你好久啦！','摸鱼也行，但先背 5 个嘛~'],
    start:['汪汪！今天冲哪本？','走起走起，我陪你！','尾巴已就位，开背！'],
    happy:['你学得好，我尾巴摇成螺旋桨！','嘿嘿，有你我最开心！','汪！今天也是元气满满！'],
    angry:['今天还没学，我…我要转圈圈了！','快学嘛快学嘛，汪！','再不背我要咬你裤脚啦（假的）。'],
    tired:['这么晚啦…我先趴一会儿，你学。','晚安前再背两个嘛~','困了也要陪你，汪…'],
    cry:['错了没关系，我永远爱你！','别难过，我舔舔你（狗狗的安慰）。','菜怕什么，有我陪你练！'] },
};
function petMoodLine(mood){
  const set = PET_MOOD_SAY[petState.species];
  if (set && set[mood] && set[mood].length){ const a=set[mood]; return a[Math.floor(Math.random()*a.length)]; }
  return petPick(mood);   // 兜底通用库
}
function petLine(){
  if (petPending){
    const b = { unlock:'unlock', checkin:'checkin', praise_hi:'praise_hi', praise_mid:'praise_mid', cry:'cry' }[petPending];
    petPending = null; petState._justUnlocked = 0; petSave();
    if (b === 'cry') return petFill(petMoodLine('cry'));
    if (b) return petFill(petPick(b));
  }
  if (petUnlockedCount()===0) return '背满 20 个词、或每天签到，就能领到第一个我！';
  if (petDaysSince(petState.lastSeen)>=2) return petFill(petPick('comeback'));
  return petFill(petMoodLine(petMoodNow()));
}

/* ---------- 主页卡片 ---------- */
function petCardHtml(){
  if (!petState) petLoad();
  const sp = petSpecies();
  const unlockedN = petUnlockedCount();
  const line = petLine();
  const cur = petCurrentEmote();
  const toNext = PET_STEP - (petState.learned % PET_STEP);   // 距下一个"背词解锁"还差几个

  const big = cur ? `<img src="${petEmoteSrc(cur)}" alt="${esc(petState.name)}" draggable="false">` : `<div class="petq">?</div>`;

  let dex = '<div class="petdex">';
  for (const e of sp.emotes){
    const on = petIsUnlocked(e);
    const chosen = petState.pick===e.id && on;
    // 全部可点开放大预览；未解锁显示为黑色剪影
    dex += `<button class="petslot ${on?'on':'lock'}${chosen?' pick':''}" onclick="petPreview(${e.id})" title="${on?esc(e.name):'未解锁'}"><img src="${petEmoteSrc(e)}" alt="${esc(e.name)}">${chosen?'<i>✓</i>':''}</button>`;
  }
  dex += '</div>';

  const slots = petSlots();
  const full = unlockedN >= slots;
  const sub = full ? `图鉴已集齐 ${slots}/${slots} 🎉`
                   : `已收集 ${unlockedN}/${slots} · 再背 <b>${toNext}</b> 个词解锁一个`;
  const switcher = PET_SPECIES.length>1 ? `<span class="petsw" onclick="petOpenSpecies()">换伙伴 ⇄</span>` : '';
  const claim = petCanClaim()
    ? `<button class="b3d" style="margin-top:10px;padding:10px" onclick="petClaim()">🎁 今日签到 · 领取一个表情</button>`
    : (!full ? `<div class="muted" style="font-size:11px;margin-top:8px;text-align:center">✔ 今日已领取，明天再来领一个</div>` : '');

  return `<div class="petcard">
    <div class="pettop">
      <div class="petbubble">${esc(line)}</div>
      <button class="petbig" onclick="petPat()" aria-label="摸摸${esc(petState.name)}">${big}</button>
      <div class="petinfo">
        <div class="petname" onclick="petRename()">${esc(petState.name)} <span class="muted" style="font-size:11px">✎</span> ${switcher}</div>
        <div class="muted" style="font-size:12px;margin-top:2px">${sub}</div>
        ${unlockedN?'<div class="muted" style="font-size:11px;margin-top:2px">点下面已解锁的表情，选一个挂到答题页</div>':''}
      </div>
    </div>
    ${dex}
    ${claim}
  </div>`;
}
// 答题右下角的小挂件（学生选中的表情；未选或未解锁则不显示）
function petCornerHtml(){
  try {
    if (!petVisible()) return '';
    if (!petState) petLoad();
    if (!petState.pick) return '';
    const e = petSpecies().emotes.find(x=>x.id===petState.pick);
    if (!e || !petIsUnlocked(e)) return '';
    return `<img class="petcorner" src="${petEmoteSrc(e)}" alt="" draggable="false">`;
  } catch(e){ return ''; }
}
// 点开放大预览：已解锁可"设为展示"，未解锁显示黑剪影+解锁提示
function petPreview(id){
  if (!petState) petLoad();
  modalK = null;
  const e = petSpecies().emotes.find(x=>x.id===id); if (!e) return;
  const on = petIsUnlocked(e);
  const chosen = petState.pick===id;
  let h = `<div class="grab"></div>
    <div class="petprev ${on?'':'lock'}"><img src="${petEmoteSrc(e)}" alt="${esc(e.name)}"></div>`;
  if (on){
    h += `<div class="petprev-line">${esc(petSayLine())}</div>
      <button class="b3d" onclick="petSetPick(${id})">${chosen?'✓ 正在展示 · 取消':'设为展示表情'}</button>
      <button class="b3d ghost" onclick="closeModal()">关 闭</button>`;
  } else {
    h += `<div class="petprev-line muted">还没解锁哦～背 ${PET_STEP} 个词或每天签到，就能领到它。</div>
      <button class="b3d ghost" onclick="closeModal()">关 闭</button>`;
  }
  $('#sheet').innerHTML = h; $('#modal').classList.add('show');
}
function petSetPick(id){
  if (!petState) petLoad();
  petState.pick = (petState.pick===id ? 0 : id);   // 再点一次取消
  petSave();
  closeModal();
  if (typeof render==='function' && !screen) render();
}
function petOpenSpecies(){
  modalK = null;
  let h = `<div class="grab"></div><div class="dw" style="font-size:22px;margin-bottom:10px">选择伙伴</div>`;
  for (const s of PET_SPECIES){
    const cur = s.id===petState.species;
    h += `<button class="bookopt ${cur?'on':''}" onclick="petChooseSpecies('${s.id}')">
      <div class="spread"><b>${esc(s.name)}${cur?' <span class="pill">当前</span>':''}</b></div>
      <div class="petdex" style="margin-top:8px">${s.emotes.map(e=>{const on=petPreviewAll()||(petState.dex[s.id]||0)>=e.id; return `<span class="petslot ${on?'on':'lock'}"><img src="pet/${s.folder}/${e.file}"></span>`;}).join('')}</div>
    </button>`;
  }
  h += `<button class="b3d ghost" style="margin-top:12px" onclick="closeModal()">关 闭</button>`;
  $('#sheet').innerHTML = h; $('#modal').classList.add('show');
}
function petChooseSpecies(id){
  if (!petState) petLoad();
  petState.species = id; petState.pick = 0; petSave();
  closeModal(); if (!screen) render();
}
function petPat(){
  if (!petState) petLoad();
  const el = document.querySelector('.petbubble'); if (el) el.textContent = petSayLine();   // 点它=性格化搞笑台词
  const img = document.querySelector('.petbig'); if (img){ img.classList.remove('petwiggle'); void img.offsetWidth; img.classList.add('petwiggle'); }
  try { sfx('ok'); } catch(e){}
}
function petRename(){
  let name = null;
  try { name = window.prompt('给伙伴起个名字（最多 6 个字）：', petState.name); } catch(e){ return; }
  if (name==null) return; name = String(name).trim().slice(0,6); if (!name) return;
  petState.name = name; petSave();
  if (typeof render==='function' && !screen) render();
}
petLoad();
