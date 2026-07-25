from __future__ import annotations

import copy
import hashlib
import json
import re
from pathlib import Path


HERE = Path(__file__).resolve().parent
DATA = HERE / "xb2_u2_data.json"
BASELINE = Path(r"C:\Users\27894\Desktop\HY\deploy\vocab3500\xb2_u2_data.json")


# Two deliberately different, high-frequency additions for every entry. Existing
# courseware-first collocations stay at the front; these fill genuine usage gaps.
EXTRA_COLLOCATIONS = {
    "solidarity": [("forge solidarity among people", "在人们之间凝聚团结", "Shared work can forge solidarity among people from very different backgrounds."), ("worker solidarity", "工人团结", "Worker solidarity helped the employees negotiate safer conditions."), ("solidarity across borders", "跨越国界的团结", "The relief campaign inspired solidarity across borders.")],
    "participate": [("participate voluntarily in sth", "自愿参加某事", "More than two hundred residents participated voluntarily in the clean-up."), ("participate alongside sb", "与某人一同参加", "Amateur runners participated alongside several former champions."), ("be eligible to participate", "有资格参加", "Only registered students are eligible to participate in the final.")],
    "compete": [("compete at the international level", "参加国际级别的竞争", "She trained for years before competing at the international level."), ("compete on equal terms", "在平等条件下竞争", "Clear rules allow every athlete to compete on equal terms."), ("compete fiercely for sth", "为某物展开激烈竞争", "Several cities competed fiercely for the right to host the event.")],
    "racial": [("racial equality", "种族平等", "The campaign calls for racial equality in education and employment."), ("racial tensions", "种族关系紧张", "Community leaders met to prevent racial tensions from escalating."), ("racial prejudice", "种族偏见", "Sport can challenge racial prejudice when teams value every member equally.")],
    "diverse": [("diverse perspectives", "多元观点", "The committee considered diverse perspectives before changing the rules."), ("geographically diverse", "地域分布广泛的", "The survey covered a geographically diverse group of schools."), ("a diverse workforce", "多元化的员工队伍", "A diverse workforce can bring a wider range of experience to an organization.")],
    "joint": [("joint responsibility", "共同责任", "Protecting athletes is the joint responsibility of coaches and organizers."), ("issue a joint statement", "发表联合声明", "The two clubs issued a joint statement after the incident."), ("joint ownership of sth", "对某物的共同所有权", "The partners retained joint ownership of the training centre.")],
    "motivate": [("be highly motivated to do sth", "做某事积极性很高", "The volunteers were highly motivated to improve access to local sports facilities."), ("intrinsically motivated", "受内在动机驱动的", "Intrinsically motivated athletes continue training even without public praise."), ("motivate sustained effort", "激发持续努力", "A realistic goal can motivate sustained effort over an entire season.")],
    "motto": [("adopt a motto", "采用一句格言", "The new team adopted a motto that emphasized courage and respect."), ("live by one's motto", "践行自己的座右铭", "She lived by her motto even after a painful defeat."), ("under the motto of ...", "以……为口号", "The festival was organized under the motto of friendship through sport.")],
    "boundary": [("set clear boundaries", "设定清晰界限", "Coaches should set clear boundaries between encouragement and unfair pressure."), ("respect personal boundaries", "尊重个人界限", "Responsible teammates respect personal boundaries in the changing room."), ("blur the boundary between A and B", "模糊 A 与 B 的界限", "Commercial sponsorship can blur the boundary between sport and advertising.")],
    "demonstrate": [("demonstrate competence in sth", "证明具备某方面能力", "Candidates must demonstrate competence in first aid before leading the session."), ("demonstrate how to do sth", "示范如何做某事", "The coach demonstrated how to land safely after the jump."), ("demonstrate against sth", "游行示威反对某事", "Residents demonstrated against the proposed closure of the sports ground.")],
    "proceed": [("proceed cautiously", "谨慎行事；谨慎前进", "Officials decided to proceed cautiously after the safety warning."), ("proceed from A to B", "从 A 转入 B", "The lesson proceeds from basic movement to a complete routine."), ("proceed without delay", "立即继续进行", "Once the track was declared safe, the race proceeded without delay.")],
    "flame": [("burst into flames", "突然燃烧起来", "The damaged engine burst into flames seconds after the driver escaped."), ("fan the flames of sth", "煽动；使……更加激烈", "Irresponsible rumours fanned the flames of public anger."), ("an eternal flame", "长明火；永恒之火", "An eternal flame burns beside the memorial.")],
    "applaud": [("applaud sb for doing sth", "因某事赞扬某人", "Parents applauded the athlete for admitting his mistake honestly."), ("warmly applaud a decision", "热烈赞同某项决定", "Medical staff warmly applauded the decision to shorten the race."), ("applaud enthusiastically", "热烈鼓掌", "The audience applauded enthusiastically when the final runner crossed the line.")],
    "consistent": [("remain consistent over time", "长期保持一致", "The judging criteria must remain consistent over time."), ("a consistent pattern of sth", "一贯的……模式", "The data revealed a consistent pattern of gradual improvement."), ("internally consistent", "内在一致的；自洽的", "A persuasive argument must be internally consistent.")],
    "humanity": [("a crime against humanity", "反人类罪", "The court described the systematic attacks as crimes against humanity."), ("our common humanity", "我们共同的人性", "The volunteers were united by a belief in our common humanity."), ("lose one's humanity", "丧失人性", "Victory is meaningless if competitors lose their humanity in the process.")],
    "rank": [("rank among the best", "跻身最佳之列", "The stadium ranks among the best sporting venues in the country."), ("rise through the ranks", "逐级晋升", "She rose through the ranks from volunteer coach to national director."), ("a high-ranking official", "高级官员", "A high-ranking official opened the international tournament.")],
    "trend": [("reverse a trend", "扭转趋势", "The new programme helped reverse the trend of falling participation."), ("buck the trend", "逆势而行", "The community club bucked the national trend by attracting more teenagers."), ("a long-term trend", "长期趋势", "One season is not enough to establish a long-term trend.")],
    "hurdle": [("clear the final hurdle", "跨过最后一道栏；克服最后障碍", "The application cleared the final regulatory hurdle in May."), ("a legal hurdle", "法律障碍", "The organizers still face a legal hurdle before construction can begin."), ("fall at the first hurdle", "一开始就失败", "The proposal fell at the first hurdle because it lacked funding.")],
    "election": [("contest an election", "参加竞选", "Three former athletes decided to contest the committee election."), ("call an early election", "宣布提前选举", "The chairman called an early election after losing the council's support."), ("election turnout", "选举投票率", "Election turnout increased sharply among younger members.")],
    "advent": [("with the advent of sth", "随着……的出现", "With the advent of live streaming, small events can reach global audiences."), ("since the advent of sth", "自从……出现以来", "Training methods have changed greatly since the advent of wearable technology."), ("herald the advent of sth", "预示……的到来", "The new stadium heralded the advent of professional sport in the region.")],
    "faith": [("restore faith in sth", "恢复对……的信心", "Transparent judging helped restore public faith in the competition."), ("keep faith with sb", "信守对某人的承诺", "The council kept faith with residents by protecting the public field."), ("an article of faith", "坚定信条", "For the coach, fair play was an article of faith.")],
    "ambition": [("fulfil one's ambition", "实现抱负", "She fulfilled her ambition of representing her country at the Games."), ("harbour an ambition to do sth", "怀有做某事的抱负", "He had long harboured an ambition to become a professional coach."), ("a burning ambition", "强烈的抱负", "A burning ambition alone cannot replace disciplined training.")],
    "ascend": [("ascend the throne", "登上王位", "The prince was only eighteen when he ascended the throne."), ("ascend to power", "掌权；上台", "The reformer ascended to power after a closely fought election."), ("ascend gradually", "逐渐上升", "The path ascends gradually through the forest before reaching the ridge.")],
    "track and field": [("a track-and-field meet", "田径运动会", "Our school will host a track-and-field meet next Saturday."), ("track-and-field events", "田径项目", "The stadium can accommodate more than twenty track-and-field events."), ("a track-and-field athlete", "田径运动员", "The track-and-field athlete specialized in the long jump.")],
    "call on sb to do sth": [("publicly call on sb to do sth", "公开呼吁某人做某事", "Doctors publicly called on organizers to improve heat protection."), ("call on the authorities to act", "呼吁当局采取行动", "Residents called on the authorities to act before another accident occurred."), ("call on everyone to support sth", "号召大家支持某事", "The captain called on everyone to support the injured player.")],
    "identical": [("be identical in every respect", "在各方面完全相同", "The two medals appeared identical in every respect."), ("genetically identical", "基因完全相同的", "Identical twins are genetically identical but may develop different interests."), ("an identical copy", "完全相同的复制品", "The museum displayed an identical copy while the original was being restored.")],
    "fellow": [("fellow citizens", "同胞；各位公民", "The mayor appealed to her fellow citizens to volunteer."), ("a fellow of a college", "学院研究员；院士", "She became a fellow of the college after years of research."), ("a fellow member", "同一组织的成员", "A fellow member nominated him for chairman.")],
    "relay": [("relay a message to sb", "向某人转达消息", "Officials relayed the safety message to every team manager."), ("a satellite relay", "卫星转播", "A satellite relay carried the ceremony to viewers overseas."), ("relay information accurately", "准确转达信息", "Volunteers must relay information accurately during an emergency.")],
    "chest": [("chest pain", "胸痛", "Any runner experiencing chest pain should seek medical help immediately."), ("a treasure chest", "藏宝箱；百宝箱", "The old chest contained photographs from the first Games."), ("beat one's chest", "捶胸；夸耀", "The winner refused to beat his chest after the easy victory.")],
    "cheek": [("rosy cheeks", "红润的双颊", "The cold wind left the children with rosy cheeks."), ("cheek to cheek", "脸贴脸地", "The dancers moved slowly, cheek to cheek."), ("have the cheek to do sth", "厚颜无耻地做某事", "He had the cheek to blame the volunteers for his own mistake.")],
    "half-marathon": [("complete a half-marathon", "完成半程马拉松", "She completed her first half-marathon in under two hours."), ("train for a half-marathon", "为半程马拉松训练", "He trains four mornings a week for a half-marathon."), ("a half-marathon course", "半程马拉松赛道", "The coastal half-marathon course includes several steep climbs.")],
    "amateur": [("retain amateur status", "保持业余身份", "The athlete retained amateur status while studying at university."), ("a gifted amateur", "有天赋的业余爱好者", "The exhibition featured work by several gifted amateurs."), ("rank amateur", "完全的外行", "Only a rank amateur would ignore such an obvious safety risk.")],
    "ankle": [("an ankle injury", "踝关节损伤", "An ankle injury forced the runner to miss the final."), ("ankle-deep in sth", "深及脚踝", "The players crossed a field ankle-deep in mud."), ("support the ankle", "支撑踝关节", "This flexible bandage supports the ankle without limiting movement.")],
    "gradually": [("gradually come to realize", "逐渐意识到", "The committee gradually came to realize that the rule was unfair."), ("increase gradually over time", "随着时间逐渐增加", "Participation increased gradually over time rather than rising in a single season."), ("gradually give way to sth", "逐渐被……取代", "Initial doubt gradually gave way to cautious optimism.")],
    "session": [("a question-and-answer session", "问答环节", "The lecture ended with a lively question-and-answer session."), ("be in session", "正在开会；正在开庭", "The council was still in session when the protesters arrived."), ("a counselling session", "咨询辅导课", "One counselling session helped the athlete manage her anxiety.")],
    "limit": [("impose a limit on sth", "对……设置限制", "The city imposed a limit on attendance for safety reasons."), ("exceed the limit", "超过限度", "Any vehicle exceeding the weight limit will be refused entry."), ("within acceptable limits", "在可接受范围内", "Noise remained within acceptable limits throughout the event.")],
    "marathon": [("a marathon negotiating session", "马拉松式谈判", "A marathon negotiating session finally produced an agreement."), ("a marathon effort", "持久而艰苦的努力", "Restoring the damaged stadium required a marathon effort."), ("marathon training", "马拉松训练", "Marathon training should increase distance gradually.")],
    "chairman": [("elect sb chairman", "选举某人为主席", "Committee members unanimously elected her chairman."), ("serve as chairman", "担任主席", "He served as chairman of the sports council for six years."), ("acting chairman", "代理主席", "The acting chairman postponed the vote until Friday.")],
    "constitution": [("a written constitution", "成文宪法；书面章程", "The association adopted a written constitution at its first meeting."), ("a constitutional amendment", "宪法修正案；章程修订", "Members approved a constitutional amendment on voting rights."), ("a strong constitution", "强健的体质", "Her strong constitution helped her recover quickly from the illness.")],
    "pour": [("pour resources into sth", "向……投入大量资源", "The city poured resources into improving public sports facilities."), ("rain pours down", "大雨倾盆而下", "Rain poured down throughout the second half of the match."), ("pour one's heart out", "倾吐心声", "After the defeat, he poured his heart out to an old friend.")],
    "celebrity": [("achieve celebrity status", "获得名人地位", "The young boxer achieved celebrity status almost overnight."), ("celebrity endorsement", "名人代言", "Celebrity endorsement can greatly increase a product's visibility."), ("a minor celebrity", "小有名气的人", "The local champion became a minor celebrity in her hometown.")],
    "opponent": [("a formidable opponent", "强大的对手", "The defending champion remains a formidable opponent."), ("defeat an opponent convincingly", "令人信服地击败对手", "She defeated her opponent convincingly in straight sets."), ("a political opponent", "政治对手", "His political opponents questioned the cost of the stadium.")],
    "humility": [("show genuine humility", "表现出真正的谦逊", "The champion showed genuine humility when accepting the award."), ("with humility", "谦逊地", "She spoke with humility about her remarkable achievement."), ("intellectual humility", "知性谦逊；承认认知局限", "Intellectual humility allows researchers to revise weak conclusions.")],
    "grace": [("accept defeat with grace", "坦然有风度地接受失败", "The captain accepted defeat with grace and congratulated the winners."), ("a grace period", "宽限期", "Applicants were given a two-week grace period."), ("fall from grace", "失宠；失去声望", "The celebrated runner fell from grace after admitting to cheating.")],
    "dignity": [("preserve human dignity", "维护人的尊严", "Emergency shelters must preserve human dignity as well as physical safety."), ("with quiet dignity", "沉静而有尊严地", "She accepted the disappointing result with quiet dignity."), ("a dignified response", "有尊严的回应", "His dignified response prevented the dispute from becoming personal.")],
    "bobsleigh": [("a bobsleigh team", "雪车队", "The four-person bobsleigh team trained on an indoor start track."), ("a bobsleigh run", "一次雪车滑行；雪车赛道", "Their second bobsleigh run was faster but less controlled."), ("a bobsleigh pilot", "雪车驾驶员", "The bobsleigh pilot must react instantly to changes in the ice.")],
    "unselfish": [("an unselfish act", "无私的行为", "Passing the ball instead of taking the shot was an unselfish act."), ("unselfish devotion to sth", "对……的无私奉献", "Her unselfish devotion to young athletes earned widespread respect."), ("an unselfish player", "不自私的队员", "An unselfish player creates opportunities for the whole team.")],
    "walk on air": [("feel like walking on air", "感觉欣喜若狂", "She felt like walking on air after receiving the scholarship."), ("have sb walking on air", "使某人欣喜若狂", "The unexpected praise had the young athlete walking on air."), ("come down from walking on air", "从极度兴奋中平静下来", "It took him days to come down from walking on air.")],
    "keep sth in perspective": [("put sth into perspective", "正确看待某事；使某事显得合乎比例", "Comparing the loss with her long career put it into perspective."), ("lose one's sense of perspective", "失去客观判断", "Constant media attention made the young player lose her sense of perspective."), ("retain a sense of perspective", "保持客观理性的眼光", "Good coaches help athletes retain a sense of perspective after victory.")],
    "idiom": [("a fixed idiom", "固定习语", "A fixed idiom usually cannot be translated word for word."), ("use an idiom appropriately", "恰当地使用习语", "Writers should use an idiom appropriately rather than merely showing it off."), ("an idiomatic expression", "惯用表达", "Reading authentic dialogue helps learners notice idiomatic expressions.")],
    "league": [("top the league table", "位居联赛积分榜首", "The club topped the league table after twelve matches."), ("be in a different league", "不在同一档次；强得多", "Her technical control is in a different league from mine."), ("win the league title", "赢得联赛冠军", "The team won the league title for the first time in twenty years.")],
    "opposing": [("opposing sides", "对立双方", "The mediator invited the opposing sides to resume talks."), ("opposing viewpoints", "相反的观点", "The article presents two opposing viewpoints without choosing between them."), ("the opposing team", "对方球队", "Players shook hands with the opposing team after the final.")],
    "net": [("a financial safety net", "经济保障网", "Insurance provides a financial safety net after a serious injury."), ("net profit", "净利润", "The event produced a net profit of nearly fifty thousand dollars."), ("cast a wide net", "撒大网；广泛搜寻", "Recruiters cast a wide net to find talented young athletes.")],
    "insurance": [("take out insurance", "购买保险", "Organizers should take out insurance against cancellation."), ("an insurance policy", "保险单；保险政策", "Read the insurance policy carefully before signing it."), ("insurance against sth", "防范某事的保障", "Regular backups provide insurance against data loss.")],
    "salesman": [("a travelling salesman", "巡回推销员", "The travelling salesman covered three provinces every month."), ("a car salesman", "汽车销售员", "The car salesman explained the financing options clearly."), ("a salesman's pitch", "推销员的推销说辞", "The promise sounded more like a salesman's pitch than an objective report.")],
    "complain": [("complain to sb about sth", "向某人抱怨某事", "Residents complained to the council about late-night noise."), ("complain of pain", "诉说疼痛", "The runner complained of severe pain in her ankle."), ("complain bitterly", "强烈抱怨", "Spectators complained bitterly about the sudden change of venue.")],
    "unintentionally": [("unintentionally reveal sth", "无意中泄露某事", "The official unintentionally revealed the result before the announcement."), ("unintentionally cause harm", "无意中造成伤害", "A careless remark can unintentionally cause lasting harm."), ("unintentionally omit sth", "无意中遗漏某物", "The report unintentionally omitted two important safety incidents.")],
    "find one's way into": [("find its way onto sth", "不知不觉出现在……上", "The private photograph found its way onto several news sites."), ("find one's way through sth", "摸索着穿过……", "The runners found their way through the fog by following reflective signs."), ("find one's way back to sth", "辗转回到……", "The lost medal eventually found its way back to its owner.")],
    "move the goalposts": [("keep moving the goalposts", "不断改变标准", "The manager kept moving the goalposts whenever the team met a target."), ("accuse sb of moving the goalposts", "指责某人改变规则", "Applicants accused the committee of moving the goalposts midway through selection."), ("refuse to move the goalposts", "拒绝随意改变标准", "Fair judges refuse to move the goalposts after a competition begins.")],
    "score an own goal": [("effectively score an own goal", "实际上弄巧成拙", "By insulting loyal supporters, the club effectively scored an own goal."), ("a political own goal", "政治上的自损行为", "Closing the public stadium proved to be a political own goal."), ("avoid scoring an own goal", "避免弄巧成拙", "Leaders should check the facts before speaking and avoid scoring an own goal.")],
    "council": [("a council meeting", "委员会会议；市政会议", "The proposal will be discussed at the next council meeting."), ("a council member", "委员会成员；市议员", "Each council member declared any personal interest before voting."), ("the city council", "市议会", "The city council approved funding for the new sports centre.")],
    "backfire": [("backfire on sb", "对某人产生反效果", "The attempt to embarrass her backfired on the opposing team."), ("backfire spectacularly", "产生极其严重的反效果", "The publicity stunt backfired spectacularly when the truth emerged."), ("a strategy backfires", "策略适得其反", "An aggressive strategy can backfire when public trust is already low.")],
    "ballpark": [("a ballpark figure", "大致数字", "Could you give me a ballpark figure for the repairs?"), ("a ballpark range", "大致范围", "The planner offered a ballpark range rather than an exact cost."), ("within the same ballpark", "处于大致相同的范围", "The two estimates are within the same ballpark.")],
    "venue": [("a venue for sth", "某事的举办场所", "The hall provides a suitable venue for indoor training."), ("change the venue", "更换场地", "Heavy rain forced organizers to change the venue."), ("a purpose-built venue", "专门建造的场馆", "The tournament requires a purpose-built venue with accessible seating.")],
    "curveball": [("an unexpected curveball", "出乎意料的难题", "A sudden injury threw the selectors an unexpected curveball."), ("a curveball question", "刁钻而意外的问题", "The interviewer ended with a curveball question about failure."), ("deal with a curveball", "应对意外难题", "Experienced managers stay calm when they have to deal with a curveball.")],
    "handle": [("handle evidence properly", "妥善处理证据", "Investigators must handle evidence properly to preserve its value."), ("handle a heavy workload", "应付繁重工作量", "She handles a heavy workload without neglecting small details."), ("get a handle on sth", "理解并掌握某事", "The new coach quickly got a handle on the team's weaknesses.")],
    "fist": [("clench one's fist", "握紧拳头", "He clenched his fist but chose not to respond angrily."), ("raise a fist", "举起拳头", "The athlete raised a fist in a silent gesture of solidarity."), ("shake one's fist at sb", "向某人挥拳表示愤怒", "An angry spectator shook his fist at the referee.")],
    "waist": [("waist-deep in sth", "深及腰部", "Rescue workers stood waist-deep in floodwater."), ("around the waist", "围在腰间", "The climbing rope was secured firmly around her waist."), ("a narrow waist", "纤细的腰身", "The jacket has a narrow waist and broad shoulders.")],
    "cruel": [("be cruel to sb", "残忍地对待某人", "It is cruel to blame an injured athlete for losing."), ("a cruel blow", "沉重而令人痛苦的打击", "Missing the final through illness was a cruel blow."), ("a cruel irony", "残酷的讽刺", "It was a cruel irony that the safety campaign caused another accident.")],
    "remark": [("make an opening remark", "作开场发言", "The chairman made a brief opening remark before the vote."), ("remark on/upon sth", "评论某事", "Several journalists remarked on the runner's unusual calmness."), ("a casual remark", "随口的一句话", "A casual remark was unintentionally reported as an official promise.")],
    "towel": [("towel oneself dry", "用毛巾擦干身体", "The swimmers towelled themselves dry before leaving the pool."), ("wrap sth in a towel", "用毛巾包住某物", "She wrapped the ice pack in a towel before applying it."), ("a paper towel", "纸巾；厨房用纸", "Use a clean paper towel to wipe the surface.")],
    "literally": [("translate sth literally", "逐字翻译某物", "A fixed idiom should rarely be translated literally."), ("be literally true", "从字面上说确实如此", "The statement is literally true but gives a misleading impression."), ("literally hundreds of ...", "确实有数百个……；足足数百个……", "Literally hundreds of volunteers offered to help.")],
    "in the ballpark": [("roughly in the ballpark", "大致靠谱", "Your cost estimate is roughly in the ballpark."), ("not even in the ballpark", "相差甚远", "His prediction was not even in the ballpark."), ("put a figure in the ballpark", "使数字大致接近", "The latest survey puts our attendance estimate in the ballpark.")],
    "a ballpark estimate": [("give a ballpark estimate", "给出粗略估计", "The builder gave a ballpark estimate before examining the site."), ("a rough ballpark estimate", "非常粗略的估计", "At this stage, we can offer only a rough ballpark estimate."), ("base a ballpark estimate on sth", "以……为依据作粗略估算", "They based the ballpark estimate on last year's costs.")],
    "throw sb a curveball": [("be thrown a curveball", "遇到意外难题", "The team was thrown a curveball when the venue closed unexpectedly."), ("throw sb an unexpected curveball", "给某人一个突如其来的难题", "The final question threw every candidate an unexpected curveball."), ("life throws sb a curveball", "生活给某人出难题", "When life throws you a curveball, a clear sense of perspective helps.")],
    "three strikes and you are out": [("a three-strikes rule", "三次违规即出局的规则", "The platform introduced a three-strikes rule for repeated abuse."), ("apply the three-strikes principle", "采用事不过三原则", "The club applied the three-strikes principle to serious misconduct."), ("receive a final strike", "收到最后一次警告", "He received a final strike and lost his membership.")],
    "below the belt": [("hit below the belt", "采取不正当手段攻击", "Mocking a rival's family is hitting below the belt."), ("a below-the-belt remark", "卑劣伤人的话", "The candidate apologized for a below-the-belt remark."), ("consider sth below the belt", "认为某事不公正或卑劣", "Most viewers considered the personal attack below the belt.")],
    "throw in the towel": [("be ready to throw in the towel", "准备认输", "After three failed attempts, he was ready to throw in the towel."), ("refuse to throw in the towel", "拒绝认输", "The injured runner refused to throw in the towel."), ("be tempted to throw in the towel", "想要放弃", "She was tempted to throw in the towel when funding disappeared.")],
    "iron": [("iron ore", "铁矿石", "The region once exported large quantities of iron ore."), ("iron out a problem", "解决问题；消除分歧", "Both sides met to iron out the final scheduling problem."), ("an iron will", "钢铁般的意志", "An iron will helped her complete the exhausting rehabilitation programme.")],
}


COLLOCATION_OVERRIDES = {
    "joint": [
        ("a joint effort", "共同努力", "Hosting the Games was a joint effort by the whole nation."),
        ("a joint venture", "合资项目；合营企业", "The stadium was built as a joint venture between two cities."),
        ("take joint action", "采取联合行动", "The nations took joint action to promote fair play."),
        ("joint champions", "并列冠军", "The two runners were declared joint champions."),
        ("issue a joint statement", "发表联合声明", "The two clubs issued a joint statement after the incident."),
        ("joint responsibility", "共同责任", "Protecting athletes is the joint responsibility of coaches and organizers."),
        ("joint research", "联合研究", "The universities conducted joint research on sports injuries."),
        ("joint ownership of sth", "对某物的共同所有权", "The partners retained joint ownership of the training centre."),
        ("a joint account", "联名账户", "The partners opened a joint account for shared expenses."),
        ("a joint operation", "联合行动；联合手术", "Police and medical teams conducted a joint rescue operation."),
    ],
    "advent": [
        ("the advent of sth", "……的出现；到来", "The advent of instant replay changed refereeing forever."),
        ("with the advent of sth", "随着……的出现", "With the advent of live streaming, small events reached global audiences."),
        ("since the advent of sth", "自从……出现以来", "Training has changed greatly since the advent of wearable technology."),
        ("before the advent of sth", "在……出现以前", "Before the advent of electronic timing, close results were often disputed."),
        ("herald the advent of sth", "预示……的到来", "The new stadium heralded the advent of professional sport in the region."),
        ("mark the advent of sth", "标志……的到来", "The first broadcast marked the advent of a new sporting era."),
        ("coincide with the advent of sth", "与……的出现同时发生", "The rise in participation coincided with the advent of cheaper equipment."),
        ("pave the way for the advent of sth", "为……的出现铺平道路", "Satellite technology paved the way for the advent of global live coverage."),
        ("the long-awaited advent of sth", "期待已久的……的到来", "Fans celebrated the long-awaited advent of professional women's football."),
        ("the technological advent of sth", "某项技术的问世", "The technological advent of goal-line systems reduced obvious errors."),
    ],
    "ankle": [
        ("twist/sprain one's ankle", "扭伤脚踝", "He sprained his ankle on the muddy track."),
        ("a swollen/broken ankle", "肿胀的／骨折的脚踝", "Her swollen ankle kept her out of the final."),
        ("an ankle injury", "踝关节损伤", "An ankle injury forced the runner to miss the final."),
        ("the ankle joint", "踝关节", "The exercise strengthens the ankle joint."),
        ("break one's ankle", "摔断脚踝", "He broke his ankle in the fall."),
        ("ankle-deep in sth", "深及脚踝", "The players crossed a field ankle-deep in mud."),
        ("support the ankle", "支撑踝关节", "This flexible bandage supports the ankle without limiting movement."),
        ("wear an ankle brace", "佩戴护踝", "She wore an ankle brace when she returned to training."),
        ("improve ankle mobility", "改善踝关节活动度", "These exercises improve ankle mobility after injury."),
        ("roll one's ankle", "崴脚", "The defender rolled his ankle while changing direction."),
    ],
    "opponent": [
        ("face an opponent", "面对对手", "At any sporting event, you face both your opponent and yourself."),
        ("opponents of sth", "某事的反对者", "Opponents of the reform gathered outside the stadium."),
        ("the opposing team", "对方球队", "Players tried to break through the opposing team's defence."),
        ("a worthy/formidable opponent", "值得尊敬的／强大的对手", "He praised his rival as a worthy opponent after the match."),
        ("beat/defeat one's opponent", "击败对手", "She defeated her opponent with a last-minute goal."),
        ("a political opponent", "政治对手", "His political opponents questioned the cost of the stadium."),
        ("outplay an opponent", "技胜对手", "The teenager outplayed a far more experienced opponent."),
        ("an opponent in a debate", "辩论中的对手", "Listen carefully before answering an opponent in a debate."),
        ("a chief opponent of sth", "某事的主要反对者", "She became the chief opponent of the proposed rule change."),
        ("respect one's opponent", "尊重对手", "A great champion respects every opponent before and after competition."),
    ],
    "net": [
        ("kick the ball into the net", "把球踢进球网", "He kicked the ball into the net to win the match."),
        ("find the back of the net", "破门得分", "The striker found the back of the net in the final minute."),
        ("a fishing net", "渔网", "They mended the fishing net on the shore."),
        ("net profit / net weight", "净利润／净重", "The club's net profit rose while the package's net weight fell."),
        ("a safety net", "安全网；保障机制", "The fund provides a safety net for injured players."),
        ("cast a wide net", "撒大网；广泛搜寻", "Recruiters cast a wide net to find talented young athletes."),
        ("a net gain/loss", "净收益／净损失", "The policy produced a net gain of thirty training places."),
        ("the net result/effect", "最终结果／净效应", "The net effect of the change was a modest rise in participation."),
        ("a mosquito net", "蚊帐", "Each bed in the camp was protected by a mosquito net."),
        ("net income", "净收入", "The club reported higher net income after reducing travel costs."),
    ],
    "towel": [
        ("a bath/beach towel", "浴巾／沙滩巾", "She spread a beach towel on the sand."),
        ("a paper towel", "纸巾；厨房用纸", "Use a clean paper towel to wipe the surface."),
        ("throw in the towel", "认输；放弃", "The injured runner refused to throw in the towel."),
        ("dry oneself with a towel", "用毛巾擦干身体", "He dried himself with a clean towel."),
        ("wrap a towel around sb/sth", "把毛巾裹在某人／某物上", "She wrapped a towel around her shoulders."),
        ("towel oneself dry", "用毛巾把身体擦干", "The swimmers towelled themselves dry before leaving the pool."),
        ("wrap sth in a towel", "用毛巾包住某物", "She wrapped the ice pack in a towel before applying it."),
        ("a clean towel", "干净的毛巾", "Every athlete received a clean towel after the race."),
        ("a towel rail", "毛巾架", "Hang the wet towel on the heated towel rail."),
        ("a hand towel", "擦手巾", "A fresh hand towel was placed beside the sink."),
    ],
}


FALLBACK_COLLOCATIONS = {
    "demonstrate": [("demonstrate commitment to sth", "表明对……的投入", "The council demonstrated its commitment to inclusion by funding accessible facilities."), ("demonstrate clearly that ...", "清楚表明……", "The results demonstrate clearly that regular practice reduces avoidable errors.")],
    "ascend": [("ascend through the ranks", "逐级晋升", "She ascended through the coaching ranks before leading the national team."), ("ascend into the sky", "升入天空", "A column of smoke ascended slowly into the evening sky.")],
    "chest": [("a chest infection", "胸部感染；呼吸道感染", "A chest infection prevented the runner from training for two weeks."), ("a chest of drawers", "五斗柜；抽屉柜", "The old medals were stored in the bottom drawer of a wooden chest of drawers.")],
    "cheek": [("kiss sb on the cheek", "吻某人的脸颊", "The mother kissed her daughter on the cheek after the race."), ("turn the other cheek", "以德报怨；不予还击", "He chose to turn the other cheek rather than answer the insult."), ("a tear-stained cheek", "泪痕斑斑的脸颊", "A tear ran down the exhausted runner's tear-stained cheek.")],
    "half-marathon": [("a half-marathon runner", "半程马拉松选手", "Every half-marathon runner received water at five-kilometre intervals."), ("the half-marathon distance", "半程马拉松距离", "She progressed to the half-marathon distance after completing several 10K races."), ("enter a half-marathon", "报名参加半程马拉松", "More than a thousand amateur athletes entered the half-marathon.")],
    "insurance": [("make an insurance claim", "提出保险索赔", "The club made an insurance claim after the storm damaged the roof."), ("pay an insurance premium", "缴纳保险费", "Participants pay a small insurance premium with the entry fee.")],
    "move the goalposts": [("move the goalposts halfway through", "中途改变规则", "The judges cannot move the goalposts halfway through the selection process."), ("a goalpost-moving tactic", "不断改变标准的策略", "Demanding new evidence each week became a transparent goalpost-moving tactic.")],
    "council": [("a council decision", "委员会／市议会决定", "A council decision protected the playing field from commercial development."), ("council tax", "市政税；地方税", "Part of the council tax funds local leisure facilities.")],
    "curveball": [("throw a curveball", "投曲线球；给出意外难题", "The interviewer threw a curveball near the end of the discussion."), ("a curveball pitch", "曲线球投球", "The batter misread the final curveball pitch.")],
    "in the ballpark": [("be somewhere in the ballpark", "处于大致正确范围", "Our revised attendance figure should be somewhere in the ballpark."), ("get an estimate in the ballpark", "使估计大致靠谱", "Recent ticket sales helped planners get the estimate in the ballpark.")],
    "a ballpark estimate": [("request a ballpark estimate", "要求提供粗略估算", "The council requested a ballpark estimate before approving a full survey."), ("an initial ballpark estimate", "初步粗略估算", "The initial ballpark estimate excluded the cost of floodlighting.")],
    "throw sb a curveball": [("throw sb another curveball", "再给某人出一道意外难题", "A late rule change threw the organizing team another curveball."), ("a curveball thrown at sb", "抛给某人的意外难题", "The funding cut was the hardest curveball thrown at the project."), ("be prepared for sb to throw a curveball", "准备应对某人突然出难题", "Candidates should be prepared for interviewers to throw a curveball.")],
    "throw in the towel": [("finally throw in the towel", "最终认输", "The exhausted challenger finally threw in the towel after the tenth round."), ("never throw in the towel", "永不放弃", "She promised herself never to throw in the towel during rehabilitation."), ("almost throw in the towel", "差点放弃", "The team almost threw in the towel when its second sponsor withdrew.")],
}


# Contrasts are intentionally broader than strict synonyms. The field is used by
# this project for synonym/confusable teaching groups, so anatomy and fixed idioms
# receive useful comparisons instead of invented "synonyms".
CONTRASTS = {
    "solidarity": [("unity", "团结；统一", "强调成为一个整体，常作主语/宾语，典型搭配 national unity"), ("cohesion", "凝聚力", "不可数名词，典型搭配 social/team cohesion，强调群体黏合度"), ("togetherness", "亲密团结感", "不可数名词，常见搭配 a sense of togetherness，语气较日常温暖")],
    "participate": [("take part in", "参加", "及物短语 take part in + 活动，语气比 participate in 略日常"), ("join", "加入；参加", "及物动词 join + 组织/人；join in + 活动，不说 join an election casually"), ("attend", "出席", "及物动词 attend + meeting/class，强调到场而非积极参与")],
    "compete": [("contest", "角逐；争夺", "及物动词 contest + election/title，也可作名词；比 compete 更正式"), ("rival", "与……匹敌", "及物动词 rival + 人/事物，不接 with；常见搭配 rival the best"), ("vie", "争夺", "不及物动词，固定结构 vie with sb for sth / vie to do sth")],
    "racial": [("ethnic", "族群的；民族的", "前置定语，常见搭配 ethnic group/minority，按文化血缘群体分类"), ("racist", "种族主义的", "作定语/表语，常见搭配 racist abuse；含明确贬义"), ("cultural", "文化的", "作定语/表语，常见搭配 cultural diversity，不等同于 racial")],
    "diverse": [("various", "各种各样的", "只作前置定语，常见搭配 various reasons；强调多个不同项目"), ("varied", "富于变化的", "作定语/表语，常见搭配 a varied programme/diet"), ("diversified", "多元化的", "多作前置定语，常见搭配 a diversified economy/portfolio，强调经人为分散")],
    "joint": [("shared", "共同的；共享的", "作前置定语，常见搭配 shared responsibility/interest，强调共同拥有或承担"), ("mutual", "相互的", "只作前置定语，常见搭配 mutual respect/benefit，强调双向关系"), ("collective", "集体的", "作前置定语，常见搭配 collective action/responsibility，强调群体整体")],
    "motivate": [("inspire", "激励；启发", "及物动词 inspire sb to do sth，常含榜样或理想带来的鼓舞"), ("encourage", "鼓励", "及物动词 encourage sb to do sth，强调给予信心或支持"), ("drive", "驱使；推动", "及物动词 be driven by / drive sb to do，动因往往强烈")],
    "motto": [("slogan", "口号", "可数名词，常见搭配 campaign/advertising slogan，面向公众传播"), ("maxim", "格言；准则", "可数名词，常见搭配 an old/legal maxim，表普遍行为原则"), ("proverb", "谚语", "可数名词，常见搭配 an old proverb，表达民间经验而非组织口号")],
    "boundary": [("border", "国界；边境", "可数名词，常见搭配 cross the border，主要指国家或地区分界"), ("frontier", "边疆；前沿", "可数名词，常见搭配 the frontier of science，常含未知前沿意味"), ("limit", "限度；上限", "可数名词，常见搭配 set/exceed a limit，强调允许范围的终点")],
    "demonstrate": [("show", "展示；表明", "及物动词 show + 宾语/宾补，意义最宽泛、语气中性"), ("illustrate", "举例说明", "及物动词 illustrate a point/principle，常借实例或图表解释"), ("prove", "证明", "及物动词 prove + 名词/that 从句/prove to be，强调证据足够")],
    "proceed": [("continue", "继续", "可及物或不及物，continue doing/to do；比 proceed 通用"), ("advance", "前进；推进", "不及物或及物，advance towards/on；强调位置或进程向前"), ("resume", "重新开始", "及物动词 resume work/talks，强调中断后恢复")],
    "flame": [("fire", "火；火灾", "名词 fire 可数或不可数，常见搭配 catch fire；范围比单个 flame 更大"), ("blaze", "熊熊大火", "可数名词或不及物动词，常见搭配 a fierce blaze/blaze up"), ("spark", "火花；导火索", "可数名词/及物动词，常见搭配 a spark of / spark a debate")],
    "applaud": [("praise", "称赞", "及物动词 praise sb for sth，侧重口头肯定，不一定鼓掌"), ("cheer", "欢呼；喝彩", "可及物或不及物，cheer for/on sb，强调喊声支持"), ("commend", "正式表扬", "及物动词 commend sb for sth，语气正式，常见搭配 highly commend")],
    "consistent": [("constant", "持续不变的", "多作前置定语，常见搭配 constant pressure/change，强调不断存在"), ("coherent", "连贯一致的", "作定语/表语，常见搭配 a coherent argument，强调逻辑连接"), ("compatible", "相容的；一致的", "作表语为主，固定搭配 compatible with，强调能共存")],
    "humanity": [("humankind", "人类", "不可数集合名词，作主语/宾语，比 mankind 更具包容性"), ("compassion", "同情；仁慈", "不可数名词，常见搭配 show compassion for，指对痛苦的关怀"), ("the humanities", "人文学科", "固定复数并常带 the，作主语时谓语通常用复数")],
    "rank": [("rate", "评定；评价", "及物动词 rate sb/sth as，或 rate highly，强调主观或量化评价"), ("grade", "分级；评分", "及物动词 grade work/by size，强调按标准划等级"), ("place", "使排名；名次", "动词常用 be placed first/second；名词 take first place")],
    "trend": [("tendency", "倾向", "可数名词，常接 tendency to do/towards，既可指行为倾向也可指走势"), ("fashion", "时尚；风尚", "可数/不可数名词，常见搭配 come into fashion，强调流行样式"), ("pattern", "模式；规律", "可数名词，常见搭配 a pattern of behaviour/change，强调可重复结构")],
    "hurdle": [("obstacle", "障碍", "可数名词，典型搭配 overcome/remove an obstacle，适用面最广"), ("barrier", "屏障；障碍", "可数名词，常见搭配 a barrier to entry/communication，强调阻隔"), ("challenge", "挑战", "可数名词，常见搭配 face/meet a challenge，语气较积极")],
    "election": [("vote", "投票；表决", "可数名词/动词，cast a vote / vote for sb，指具体投票行为"), ("poll", "投票；民调", "可数名词，go to the polls / opinion poll，可指选举或调查"), ("selection", "挑选", "不可数或可数名词，selection of/by，未必经公众投票")],
    "advent": [("arrival", "到来", "可数/不可数名词，arrival of sb/sth；可用于普通人或事物"), ("emergence", "出现；兴起", "不可数名词，the emergence of，强调逐渐显现"), ("onset", "开始；发作", "不可数名词，the onset of winter/disease，常指不愉快事物开始")],
    "faith": [("trust", "信任", "不可数名词或动词，trust in sb / trust sb，强调可靠性"), ("confidence", "信心", "不可数名词，confidence in sb/sth，常指对能力或成功的把握"), ("belief", "信念；相信", "可数/不可数名词，belief in/that，既可指观点也可指宗教信仰")],
    "ambition": [("aspiration", "抱负；强烈愿望", "可数名词，aspiration to do / for sth，语气积极正式"), ("goal", "目标", "可数名词，set/achieve a goal，强调可执行的具体结果"), ("desire", "愿望", "可数/不可数名词，desire for sth/to do，范围广且不必宏大")],
    "ascend": [("climb", "攀登；上升", "可及物或不及物，climb a mountain / climb steadily，日常用词"), ("rise", "上升", "不及物动词，不接宾语；rise to power / prices rise"), ("mount", "登上；增加", "及物动词 mount the stairs/a horse；不及物时 pressures mount")],
    "track and field": [("athletics", "田径运动", "英式英语常用不可数名词 athletics；作项目总称，谓语用单数"), ("track events", "径赛项目", "复数名词短语，指在跑道上进行的赛跑项目"), ("field events", "田赛项目", "复数名词短语，指跳跃和投掷类项目")],
    "call on sb to do sth": [("urge sb to do sth", "敦促某人做某事", "及物结构 urge + 宾语 + to do，语气比 call on 更强"), ("appeal to sb to do sth", "呼吁某人做某事", "appeal to + 人 + to do，强调恳切公开请求"), ("ask sb to do sth", "请某人做某事", "及物结构 ask + 宾语 + to do，语气最普通")],
    "identical": [("same", "相同的", "通常与 the 连用：the same as；不可说 identical as"), ("equal", "相等的；平等的", "作定语/表语，equal to；强调数量、价值或地位相等"), ("indistinguishable", "难以区分的", "作表语常接 from：indistinguishable from，强调看不出差别")],
    "fellow": [("companion", "同伴", "可数名词，常见搭配 travelling companion，强调陪伴关系"), ("colleague", "同事", "可数名词，colleague at/in，专指共同工作的人"), ("peer", "同龄人；同辈", "可数名词，among one's peers，强调年龄或地位相当")],
    "relay": [("pass on", "转告；传递", "及物短语 pass sth on to sb，宾语可置于 on 前"), ("transmit", "传送；传播", "及物动词 transmit data/signals/disease，技术语境常见"), ("broadcast", "广播；播出", "及物/不及物动词 broadcast a programme/live，面向大众传播")],
    "chest": [("breast", "胸部；乳房", "可数名词，常见搭配 breast cancer；解剖和烹饪语境多"), ("torso", "躯干", "可数名词，指除头和四肢以外的身体主体"), ("trunk", "躯干；树干；行李箱", "可数名词，人体语境常见 upper trunk，不等于 chest")],
    "cheek": [("face", "脸", "可数名词，指整个面部；on one's face，不可替代单侧 cheek"), ("cheekbone", "颧骨", "可数名词，high cheekbones；指骨骼而非面颊软组织"), ("impudence", "无礼；厚颜", "不可数名词，have the impudence to do，语气比 cheek 正式")],
    "half-marathon": [("marathon", "马拉松", "可数名词，完整马拉松约 42.195 公里，不能与半马混称"), ("road race", "公路赛", "可数名词，泛指公路上的赛跑，距离不限"), ("10K", "十公里赛", "可数项目名，run a 10K；距离短于 half-marathon")],
    "amateur": [("professional", "职业选手；专业人士", "可数名词/形容词，professional athlete，通常以此为业"), ("novice", "新手", "可数名词，a complete novice，按经验少分类而非是否收费"), ("enthusiast", "爱好者", "可数名词，sports enthusiast，强调热情而非竞技身份")],
    "ankle": [("heel", "脚后跟", "可数名词，at the heel；指足部后端，不是踝关节"), ("wrist", "手腕", "可数名词，sprain one's wrist；与 ankle 都是关节但位置不同"), ("shin", "胫部；小腿前部", "可数名词，kick sb in the shin；位于踝关节上方")],
    "gradually": [("steadily", "稳定地；持续地", "副词修饰动词/形容词，rise steadily；强调速度或方向稳定"), ("progressively", "逐步加剧地", "副词常置实义动词前或句末，progressively worse；正式语体"), ("eventually", "最终", "副词常置句首或实义动词前，强调终点而非渐变过程")],
    "session": [("meeting", "会议", "可数名词，hold/attend a meeting；强调人员聚集商议"), ("period", "一段时间；课时", "可数名词，a period of time / class period，范围更广"), ("term", "学期；任期", "可数名词，school term/term of office，持续时间通常更长")],
    "limit": [("restriction", "限制规定", "可数/不可数名词，restriction on sth，强调规则施加的约束"), ("boundary", "边界；界限", "可数名词，boundary between/of，强调分界线"), ("ceiling", "上限", "可数名词，price/spending ceiling，尤指金额或数量最高值")],
    "marathon": [("long-distance race", "长距离赛跑", "可数名词短语，泛指长跑，未限定 42.195 公里"), ("endurance event", "耐力项目", "可数名词短语，强调持久体能，可包含游泳或骑行"), ("ultramarathon", "超级马拉松", "可数名词，赛程超过标准马拉松距离")],
    "chairman": [("chair", "主席；主持人", "可数名词，chair of the committee；性别中性，现代正式语境常用"), ("president", "会长；总统", "可数名词，president of a club/country；组织最高负责人"), ("moderator", "主持人；协调人", "可数名词，discussion moderator；主持讨论但未必领导组织")],
    "constitution": [("charter", "章程；宪章", "可数名词，club charter / UN Charter，指授予权利或规定宗旨的文件"), ("physique", "体格", "可数/不可数名词，strong/slight physique，强调外在体形"), ("stamina", "耐力", "不可数名词，build/need stamina，只指持久体力而非整体体质")],
    "pour": [("spill", "洒出；溢出", "及物/不及物动词，spill liquid；通常含意外失控"), ("stream", "流动；涌入", "不及物动词，stream from/into，强调连续成流"), ("drizzle", "淋；细雨", "动词 drizzle sth over food；天气用 it drizzles，量小而缓")],
    "celebrity": [("star", "明星", "可数名词，film/sports star；常指某领域广受欢迎的人"), ("public figure", "公众人物", "可数名词短语，强调公共影响与曝光，不必是娱乐明星"), ("fame", "名声", "不可数名词，rise to/achieve fame；是状态，不指具体的人")],
    "opponent": [("rival", "竞争对手", "可数名词，main/close rival；常指长期争夺同一目标者"), ("competitor", "参赛者；竞争者", "可数名词，competitor in/for；强调参与同一比赛或市场"), ("adversary", "对手；敌手", "可数名词，formidable adversary；语气正式且敌对感较强")],
    "humility": [("modesty", "谦虚", "不可数名词，with modesty / false modesty，强调不夸耀"), ("meekness", "温顺；谦恭", "不可数名词，常含过于顺从意味，不等于健康的 humility"), ("arrogance", "傲慢", "不可数名词，arrogance towards sb；是 humility 的反义辨析")],
    "grace": [("elegance", "优雅", "不可数名词，elegance of movement/style，强调美感与精致"), ("poise", "沉着；优雅仪态", "不可数名词，show/maintain poise，强调自信镇定"), ("mercy", "宽恕；怜悯", "不可数名词，show mercy to / at the mercy of，与 grace 的恩典义相关")],
    "dignity": [("self-respect", "自尊", "不可数名词，retain/lose self-respect，侧重个人自我评价"), ("honour", "荣誉；体面", "不可数或可数名词，with honour / an honour，侧重社会认可或道德声誉"), ("decency", "体面；正派", "不可数名词，have the decency to do，侧重合乎基本道德")],
    "bobsleigh": [("skeleton", "俯式冰橇", "不可数项目名，运动员俯卧头朝前单人滑行，不是 bobsleigh"), ("luge", "无舵雪橇", "不可数项目名，运动员仰卧脚朝前滑行"), ("sled", "雪橇", "可数名词，通用日常词；bobsleigh 是专门竞速雪车")],
    "unselfish": [("selfless", "无私的", "作定语/表语，selfless devotion/service；语气比 unselfish 更强"), ("generous", "慷慨的", "作定语/表语，generous with time/money；侧重乐于给予"), ("considerate", "体贴的", "作定语/表语，considerate of/towards sb；侧重顾及他人感受")],
    "walk on air": [("be over the moon", "欣喜若狂", "作表语，固定结构 be over the moon about sth，口语常用"), ("be on cloud nine", "高兴得飘飘然", "作表语，常接 after/about 引出原因"), ("be thrilled", "非常兴奋", "形容词作表语，be thrilled at/about/to do，强度高但非习语")],
    "keep sth in perspective": [("see sth in context", "结合背景看待某事", "动词结构 see + 宾语 + in context，强调放回完整背景"), ("take a balanced view of sth", "全面平衡地看待某事", "及物结构 take a ... view of，常用于议论"), ("remain objective about sth", "对某事保持客观", "系表结构 remain objective about，强调避免情绪偏差")],
    "idiom": [("phrase", "短语", "可数名词，a noun/verb phrase；按语法结构定义，不一定是固定习语"), ("proverb", "谚语", "可数名词，an old proverb；通常是表达经验的完整句子"), ("collocation", "搭配", "可数名词，a strong/common collocation；指词语惯常共现")],
    "league": [("division", "级别；赛区", "可数名词，first/second division；常指联赛内部等级"), ("association", "协会；联盟", "可数名词，sports association；强调组织而非竞赛体系"), ("class", "档次；等级", "可数名词，in a class of one's own；泛指水平层级")],
    "opposing": [("opposite", "相反的；对面的", "作定语/表语，opposite views / opposite to；强调两端相反"), ("opposed", "反对的", "多作表语，be opposed to sth/doing，描述立场"), ("conflicting", "冲突的", "作前置定语，conflicting interests/accounts，强调彼此不能兼容")],
    "net": [("web", "网状物；网络", "可数名词，spider's web / web of relations；通常不用于球门网"), ("mesh", "网眼；网状材料", "可数/不可数名词，wire mesh / fine mesh，强调材料结构"), ("gross", "总的；毛的", "形容词作前置定语，gross income/weight；是 net 的反义辨析")],
    "insurance": [("assurance", "保证；人寿保险", "不可数/可数名词，give assurance that；英式英语中 life assurance"), ("coverage", "保险范围", "不可数名词，insurance coverage for，强调保单覆盖程度"), ("protection", "保护；保障", "不可数名词，protection against/from，范围比保险更广")],
    "salesman": [("salesperson", "销售人员", "可数名词，性别中性，现代正式语境优先使用"), ("sales representative", "销售代表", "可数名词短语，常缩写为 sales rep，正式职位名称"), ("vendor", "卖方；小贩", "可数名词，street/software vendor，侧重出售方而非受雇推销者")],
    "complain": [("protest", "抗议", "可及物/不及物，protest against/about sth；比 complain 更公开强烈"), ("grumble", "嘟囔抱怨", "不及物为主，grumble about/at，语气非正式且反复"), ("report", "举报；报告", "及物动词 report sth to sb，强调正式告知事实而非发泄不满")],
    "unintentionally": [("accidentally", "偶然地；意外地", "副词常置句首或动词前后，accidentally break；强调意外事件"), ("inadvertently", "无意中", "正式副词常置实义动词前，inadvertently reveal/omit"), ("unknowingly", "不知情地", "副词常置动词前或句末，unknowingly assist；强调当时不知道")],
    "find one's way into": [("end up in", "最终进入；落入", "短语 end up in + 地点/处境，强调最终结果"), ("make one's way into", "设法进入", "短语 make one's way into，强调有意识地克服困难"), ("work one's way into", "逐步进入", "短语 work one's way into，强调凭持续努力进入")],
    "move the goalposts": [("change the rules", "改变规则", "及物结构 change the rules，字面中性；习语常暗含不公平"), ("raise the bar", "提高标准", "及物习语 raise the bar for/on，通常强调标准提高，不一定不公"), ("shift the criteria", "改变评判标准", "及物结构 shift the criteria，正式表达，常接 midway/after")],
    "score an own goal": [("backfire", "适得其反", "不及物动词，plan backfires / backfire on sb，强调结果反噬"), ("shoot oneself in the foot", "搬起石头砸自己的脚", "动词习语作谓语，语气非正式，强调自损"), ("be self-defeating", "适得其反的", "形容词作表语/定语，a self-defeating policy，正式议论常用")],
    "council": [("committee", "委员会", "可数名词，committee on/of；通常负责具体事务"), ("board", "董事会；理事会", "可数名词，board of directors/governors，拥有管理监督权"), ("assembly", "议会；集会", "可数名词，legislative assembly；成员人数通常较多")],
    "backfire": [("fail", "失败", "不及物动词 fail to do / plan fails；只表未成功，不一定反噬"), ("rebound", "反弹；产生反作用", "不及物动词 rebound on sb，正式用法，强调后果回到发起者"), ("boomerang", "产生反效果", "不及物动词 boomerang on sb，形象地强调回击自身")],
    "ballpark": [("stadium", "体育场", "可数名词，sports/football stadium；可举办多种大型项目"), ("approximate", "大概的", "形容词作前置定语，approximate cost/figure；正式中性"), ("range", "范围", "可数名词，within a range of；ballpark 的估计义常指大致范围")],
    "venue": [("site", "地点；场址", "可数名词，construction/event site；强调具体位置或场地"), ("location", "位置；地点", "可数名词，exact/ideal location；最宽泛"), ("arena", "竞技场；活动领域", "可数名词，sports arena；通常指有观众席的室内外场馆")],
    "curveball": [("surprise", "意外之事", "可数名词，come as a surprise；可好可坏，范围宽"), ("complication", "复杂情况；难题", "可数名词，unexpected complication；强调使计划更难"), ("setback", "挫折", "可数名词，suffer/overcome a setback；强调进展受阻")],
    "handle": [("deal with", "处理；应对", "及物短语 deal with + 宾语，适用问题、事务或人"), ("cope with", "设法应付", "不及物结构 cope with + 困难，强调在压力下应对"), ("manage", "设法完成；管理", "可及物或不及物，manage a team / manage to do，强调控制或成功做到")],
    "fist": [("hand", "手", "可数名词，hold sth in one's hand；fist 是手指握拢后的形态"), ("palm", "手掌", "可数名词，in the palm of one's hand；指手的内侧"), ("knuckle", "指关节", "可数名词，cut one's knuckles；指拳头突起的关节")],
    "waist": [("hip", "髋部；臀部", "可数名词，hands on hips；位置在 waist 下方两侧"), ("middle", "腰部；中部", "可数名词，around the middle；口语宽泛，不是精确解剖词"), ("waistline", "腰围；腰身线", "可数名词，measure/watch one's waistline，强调围度或衣服线条")],
    "cruel": [("brutal", "残暴的；严酷的", "作定语/表语，brutal attack/truth，强度高于 cruel"), ("harsh", "严厉的；恶劣的", "作定语/表语，harsh criticism/conditions，未必含故意伤害"), ("ruthless", "无情的", "作定语/表语，ruthless competitor/decision，强调不顾他人")],
    "remark": [("comment", "评论", "可数名词或动词，comment on sth；最常用中性表达"), ("observation", "评论；观察", "可数名词，make an observation about/on，语气较正式"), ("statement", "声明；陈述", "可数名词，issue/make a statement，通常更正式完整")],
    "towel": [("cloth", "布；抹布", "可数/不可数名词，cleaning cloth；用途广，不一定吸水擦身"), ("napkin", "餐巾", "可数名词，paper/cloth napkin；主要用于进餐"), ("flannel", "面巾；法兰绒", "可数/不可数名词，face flannel；英式英语中指小洗脸巾")],
    "literally": [("exactly", "确切地；恰好", "副词修饰动词/数值，exactly the same；强调精确而非字面义"), ("figuratively", "比喻地", "副词常修饰 speak/use，figuratively speaking；是 literally 的反义辨析"), ("actually", "实际上；确实", "副词常置句首或实义动词前，用于纠正或强调事实")],
    "in the ballpark": [("approximately correct", "大致正确", "形容词短语作表语，正式中性，不带体育隐喻"), ("close to the mark", "大致准确", "固定短语作表语，be close to the mark，强调判断接近事实"), ("within range", "在范围内", "介词短语作表语，within range of，未必表示估计正确")],
    "a ballpark estimate": [("rough estimate", "粗略估计", "可数名词短语，make/give a rough estimate，正式中性"), ("approximation", "近似值；估算", "可数名词，a close approximation to，强调近似结果"), ("educated guess", "有根据的猜测", "可数名词短语，make an educated guess，依据经验但非精确计算")],
    "throw sb a curveball": [("catch sb off guard", "使某人措手不及", "及物习语 catch + 宾语 + off guard，强调未作准备"), ("take sb by surprise", "使某人吃惊", "及物结构 take + 宾语 + by surprise，意外未必是难题"), ("present sb with a challenge", "给某人提出挑战", "及物结构 present sb with sth，正式且语气中性")],
    "three strikes and you are out": [("three-strikes rule", "三次违规出局规则", "可数名词短语，introduce/apply a three-strikes rule，正式概括"), ("final warning", "最后警告", "可数名词，receive/give a final warning；不限定此前恰好两次"), ("zero tolerance", "零容忍", "不可数名词，zero tolerance for sth；通常一次违规也不宽恕")],
    "below the belt": [("unfair", "不公平的", "形容词作定语/表语，unfair to sb；最宽泛中性"), ("underhand", "不光明正大的", "形容词多作前置定语，underhand tactics/methods，强调暗中手段"), ("personal", "针对个人的", "形容词，personal attack/remark；并非所有 personal 都 below the belt")],
    "throw in the towel": [("give up", "放弃", "短语动词，可及物 give sth up 或不及物；语气最普通"), ("admit defeat", "承认失败", "及物结构 admit defeat，正式且直接"), ("quit", "退出；停止", "可及物或不及物，quit the team/quit doing，强调终止行动")],
    "iron": [("steel", "钢", "不可数名词，steel frame；是铁与碳等组成的合金"), ("metal", "金属", "可数/不可数名词，a precious metal / made of metal；是上位词"), ("press", "熨烫；压", "及物动词 press clothes/trousers，强调压平，可不用熨斗")],
}


# Natural examples for every contrast that cannot reuse a collocation example.
# Keys are the displayed synonym/confusable expressions.
SYNONYM_EXAMPLES = {
    "cohesion": "Regular team meetings strengthened social cohesion across the neighbourhood.",
    "togetherness": "The closing ceremony created a warm sense of togetherness.",
    "take part in": "More than sixty schools took part in the national survey.",
    "join": "She joined the athletics club at the beginning of term.",
    "attend": "Every team captain must attend the safety meeting.",
    "contest": "Four candidates will contest the chairmanship next month.",
    "rival": "Her finishing speed rivals that of the national champion.",
    "vie": "Three cities are vying for the right to host the final.",
    "racist": "The league introduced severe penalties for racist abuse.",
    "cultural": "Cultural diversity enriched the international festival.",
    "diversified": "The city developed a diversified programme of indoor and outdoor sport.",
    "mutual": "Mutual respect allowed the two teams to resolve the dispute.",
    "collective": "Collective action reduced the cost for every participating school.",
    "drive": "A desire to help younger athletes drove her to become a coach.",
    "proverb": "An old proverb warns that pride often comes before a fall.",
    "frontier": "New imaging technology is pushing back the frontier of sports medicine.",
    "illustrate": "This case illustrates the importance of consistent safety checks.",
    "resume": "The teams resumed play after the storm had passed.",
    "spark": "The referee's decision sparked a national debate about fairness.",
    "cheer": "Thousands of supporters cheered for the final runner.",
    "commend": "The committee commended the volunteer for her quick response.",
    "coherent": "The proposal presents a coherent argument for wider participation.",
    "compatible": "The new timetable is compatible with the existing training plan.",
    "humankind": "Climate change presents a shared challenge to humankind.",
    "compassion": "The champion showed compassion for an injured opponent.",
    "the humanities": "The humanities help students examine values, history and human experience.",
    "rate": "Judges rated the new venue highly for accessibility.",
    "place": "The young runner was placed second after the final review.",
    "pattern": "Researchers identified a clear pattern of declining participation.",
    "challenge": "The team met the challenge with patience and discipline.",
    "selection": "Selection for the national squad begins in September.",
    "onset": "The onset of winter forced the athletes to train indoors.",
    "belief": "Her belief in fair play shaped every coaching decision.",
    "desire": "His desire to improve was stronger than his fear of failure.",
    "mount": "Pressure mounted as the final round approached.",
    "track events": "The programme includes six track events and four field events.",
    "ask sb to do sth": "The coach asked every runner to arrive before sunrise.",
    "same": "The two teams followed exactly the same training schedule.",
    "equal": "All applicants should have equal access to the facilities.",
    "indistinguishable": "The replica was almost indistinguishable from the original medal.",
    "colleague": "A senior colleague helped her prepare the final report.",
    "peer": "Young athletes often compare themselves with their peers.",
    "pass on": "Please pass the revised timetable on to every volunteer.",
    "transmit": "The device transmits heart-rate data to the coach's tablet.",
    "broadcast": "The network broadcast the final live to thirty countries.",
    "torso": "The exercise strengthens the arms, shoulders and upper torso.",
    "trunk": "A stable trunk helps a runner maintain efficient posture.",
    "face": "Cold rain struck the runner's face throughout the final lap.",
    "cheekbone": "The ball struck him just below the left cheekbone.",
    "impudence": "He had the impudence to blame the volunteers for his error.",
    "road race": "The annual road race passes through five local villages.",
    "10K": "She ran her first 10K before entering a half-marathon.",
    "novice": "As a complete novice, he trained under close supervision.",
    "enthusiast": "A local sports enthusiast donated the timing equipment.",
    "heel": "The new shoe rubbed painfully against her heel.",
    "wrist": "The goalkeeper sprained her wrist while making the save.",
    "shin": "The defender was kicked in the shin during the tackle.",
    "progressively": "The exercises became progressively more demanding each week.",
    "eventually": "After several delays, the committee eventually approved the route.",
    "meeting": "The council will hold an emergency meeting on Tuesday.",
    "term": "The chairman served a second term of office.",
    "boundary": "The river forms the natural boundary between the two districts.",
    "ceiling": "The council imposed a strict ceiling on construction costs.",
    "long-distance race": "A long-distance race tests both physical endurance and judgement.",
    "endurance event": "The triathlon is an endurance event involving three disciplines.",
    "ultramarathon": "She completed a mountain ultramarathon lasting nearly twelve hours.",
    "moderator": "The moderator ensured that both speakers received equal time.",
    "charter": "The club's charter guarantees every member a vote.",
    "stamina": "Regular distance training gradually builds stamina.",
    "spill": "A volunteer accidentally spilled water across the track.",
    "stream": "Spectators streamed out of the stadium after the ceremony.",
    "drizzle": "The chef drizzled olive oil over the salad.",
    "public figure": "As a public figure, the athlete faced constant media attention.",
    "adversary": "She treated even her most formidable adversary with respect.",
    "meekness": "His silence came from fear rather than meekness.",
    "arrogance": "The champion's arrogance alienated many former supporters.",
    "poise": "She maintained remarkable poise during the tense interview.",
    "mercy": "The exhausted climbers were at the mercy of the weather.",
    "self-respect": "He refused the dishonest offer and retained his self-respect.",
    "honour": "The captain accepted the award on behalf of the team with honour.",
    "decency": "She had the decency to apologize for the personal remark.",
    "skeleton": "Skeleton athletes race head first on a small sled.",
    "luge": "In luge, competitors travel feet first while lying on their backs.",
    "sled": "The children pulled the wooden sled across the snow.",
    "considerate": "It was considerate of him to check on the injured player.",
    "be thrilled": "The volunteers were thrilled to hear that the event had succeeded.",
    "see sth in context": "We should see one defeat in the context of an otherwise successful season.",
    "take a balanced view of sth": "The report takes a balanced view of the proposed reform.",
    "remain objective about sth": "Selectors must remain objective about every candidate's performance.",
    "collocation": "Make a decision is a common English collocation.",
    "division": "The club earned promotion to the first division.",
    "association": "The national athletics association published new safety guidance.",
    "opposite": "The two witnesses gave opposite accounts of the incident.",
    "opposed": "Most residents were opposed to closing the public field.",
    "web": "The inquiry uncovered a complex web of financial relationships.",
    "gross": "Gross income rose, but net profit remained unchanged.",
    "assurance": "The chairman gave an assurance that the venue would remain open.",
    "protection": "The policy provides protection against unexpected medical costs.",
    "sales representative": "A sales representative demonstrated the new equipment to coaches.",
    "vendor": "Each food vendor must display prices clearly.",
    "report": "The athlete reported the injury to the medical officer immediately.",
    "unknowingly": "The volunteer unknowingly shared an outdated version of the schedule.",
    "end up in": "The confidential document ended up in a journalist's hands.",
    "make one's way into": "The young runner made her way into the national squad.",
    "work one's way into": "He worked his way into the starting team through consistent training.",
    "change the rules": "The committee cannot change the rules after voting has begun.",
    "raise the bar": "The new champion raised the bar for every future competitor.",
    "shift the criteria": "Officials shifted the selection criteria midway through the process.",
    "shoot oneself in the foot": "The club shot itself in the foot by insulting loyal supporters.",
    "be self-defeating": "Punishing honest mistakes can be self-defeating.",
    "assembly": "The regional assembly debated funding for community sport.",
    "fail": "The publicity campaign failed to attract younger participants.",
    "rebound": "The personal attack rebounded on the candidate who made it.",
    "stadium": "The football stadium can seat more than forty thousand spectators.",
    "arena": "The indoor arena will host the basketball final.",
    "complication": "An unexpected complication delayed construction for three months.",
    "setback": "The injury was a serious setback, but she continued rehabilitation.",
    "palm": "He carried the small medal in the palm of his hand.",
    "knuckle": "The fall left a deep cut across one knuckle.",
    "hip": "The runner placed both hands on her hips after finishing.",
    "waistline": "The tailor measured the jacket's waistline twice.",
    "brutal": "The team faced brutal weather during the mountain race.",
    "ruthless": "The ruthless decision ignored the needs of injured athletes.",
    "napkin": "Each guest placed a cloth napkin across their lap.",
    "flannel": "She washed her face with a warm, damp flannel.",
    "exactly": "The two official measurements were exactly the same.",
    "figuratively": "Figuratively speaking, the defeat closed one door and opened another.",
    "approximately correct": "The first cost estimate was approximately correct.",
    "within range": "The revised figure is within range of the final total.",
    "rough estimate": "Engineers gave a rough estimate of the repair cost.",
    "approximation": "The model provides a close approximation to the actual result.",
    "educated guess": "Without complete data, the analyst made an educated guess.",
    "take sb by surprise": "The sudden venue change took every team by surprise.",
    "present sb with a challenge": "The heat presented organizers with a serious safety challenge.",
    "final warning": "The referee gave the player a final warning.",
    "zero tolerance": "The league has zero tolerance for racist abuse.",
    "underhand": "The candidate was accused of using underhand tactics.",
    "quit": "She refused to quit the team during a difficult season.",
    "metal": "The frame is made of a light but strong metal.",
    "press": "Press the trousers carefully to remove the crease.",
}


CONTEXT_GROUPS = {
    "body": {"chest", "cheek", "ankle", "constitution", "fist", "waist", "towel"},
    "idiom": {"walk on air", "keep sth in perspective", "find one's way into", "move the goalposts", "score an own goal", "in the ballpark", "a ballpark estimate", "throw sb a curveball", "three strikes and you are out", "below the belt", "throw in the towel"},
    "sport": {"participate", "compete", "rank", "trend", "hurdle", "ascend", "track and field", "relay", "half-marathon", "amateur", "gradually", "session", "limit", "marathon", "opponent", "bobsleigh", "league", "opposing", "venue", "curveball", "handle"},
}


def clean_sentence(value: str) -> str:
    value = re.sub(r"\s*（[^）]*）\s*$", "", value).strip()
    return value.rstrip(" .") + "."


def words(value: str) -> int:
    return len(re.findall(r"[A-Za-z]+(?:[-'][A-Za-z]+)*|\d+(?:\.\d+)?", value))


def lower_initial(value: str) -> str:
    if value.startswith("I ") or value.startswith("I'"):
        return value
    return value[:1].lower() + value[1:]


def context_for(word: str, index: int) -> tuple[str, str]:
    if word in CONTEXT_GROUPS["body"]:
        options = [
            ("During a practical health-and-safety workshop, ", ", so the medical instructor used the case to explain safer movement."),
            ("In a carefully documented rehabilitation case, ", ", and the trainer adjusted the recovery plan accordingly."),
            ("During the community first-aid programme, ", ", which helped participants recognize when professional treatment was necessary."),
            ("After the medical team completed its examination, ", ", giving the athlete a clearer understanding of the injury."),
            ("While the class discussed common sports injuries, ", ", and the diagram made the anatomical distinction easier to remember."),
            ("In the physiotherapist's report after the match, ", ", a detail that influenced the next stage of rehabilitation."),
            ("Before the athlete returned to full training, ", ", allowing the coach to reduce the risk of another injury."),
            ("As part of the school's practical first-aid course, ", ", and students then practised the correct response in pairs."),
            ("During a routine fitness assessment, ", ", which the examiner recorded before recommending further exercise."),
        ]
    elif word in CONTEXT_GROUPS["idiom"]:
        options = [
            ("After the unexpected result changed the team's plans, ", ", capturing the speaker's reaction more sharply than a literal description could."),
            ("While the committee reviewed the incident in public, ", ", and listeners immediately understood the judgement implied by the expression."),
            ("In a reflective account of the difficult season, ", ", giving the final paragraph a clear but restrained emotional tone."),
            ("When the captain described the turning point in an interview, ", ", and the image stayed in readers' minds long after the report ended."),
            ("As the columnist assessed the club's controversial decision, ", ", using familiar sporting imagery to expose the practical consequence."),
            ("During a discussion about fair competition, ", ", and the expression allowed the student to criticize the decision without sounding vague."),
            ("In her personal account of recovering from defeat, ", ", revealing both the immediate emotion and the lesson she later learned."),
            ("When journalists summarized the last-minute change, ", ", a concise image that made the unfairness of the situation obvious."),
            ("As the coach looked back on the season, ", ", and the figurative wording linked the sporting event to a wider life lesson."),
        ]
    elif word in CONTEXT_GROUPS["sport"]:
        options = [
            ("During the regional sports festival, ", ", and the coaches adjusted their plan before the next event began."),
            ("As the athletes prepared for the final event, ", ", which strengthened their confidence without encouraging them to ignore the risks."),
            ("In the organizers' detailed report on the competition, ", ", a result that prompted several practical changes for the following year."),
            ("When the team reviewed its performance after the final, ", ", and the analysis revealed where disciplined preparation had made a difference."),
            ("Before thousands of spectators in the main stadium, ", ", giving the young competitors experience of performing under genuine pressure."),
            ("Throughout the demanding final week of training, ", ", while the medical staff monitored each athlete's condition closely."),
            ("According to the coach's post-race assessment, ", ", which explained the gap between the early promise and the final result."),
            ("Once officials confirmed that the venue was safe, ", ", allowing the programme to continue without disadvantaging either team."),
            ("During a closely contested national selection event, ", ", and the outcome was decided by preparation rather than reputation."),
            ("As volunteers guided competitors through the unfamiliar venue, ", ", helping the event remain orderly despite the late timetable change."),
            ("In the final minutes of an otherwise balanced match, ", ", a moment that changed both the score and the team's confidence."),
            ("While younger athletes watched from beside the track, ", ", offering them a practical lesson in patience, judgement and fair play."),
        ]
    else:
        options = [
            ("In the committee's final report to the community, ", ", clarifying why the issue mattered beyond the immediate event."),
            ("During a public discussion involving several groups, ", ", and participants considered the social consequences before reaching a decision."),
            ("In a carefully researched article for the school newspaper, ", ", giving readers enough evidence to judge the action independently."),
            ("When local leaders met to review the proposal, ", ", and the evidence persuaded several members to reconsider their position."),
            ("As the campaign entered its final month, ", ", which helped volunteers explain its purpose more clearly to the public."),
            ("At a meeting attended by residents and officials, ", ", allowing both sides to identify a practical basis for cooperation."),
            ("In her speech to students from different backgrounds, ", ", and the concrete example made the abstract principle easier to understand."),
            ("After researchers compared evidence from several regions, ", ", a finding that challenged the assumption behind the original policy."),
            ("While the council considered the long-term effects, ", ", and members agreed that fairness mattered more than short-term popularity."),
            ("In a case study used during the class debate, ", ", showing how careful wording can separate fact from personal judgement."),
            ("As community organizations prepared a joint response, ", ", which enabled them to present a stronger and more consistent argument."),
            ("During an interview broadcast after the announcement, ", ", and the speaker acknowledged both the achievement and the remaining difficulty."),
        ]
    offset = sum(ord(char) for char in word)
    return options[(offset + index * 5) % len(options)]


def semantic_suffix(word: str, source: str, index: int, stable_key: str | None = None) -> str:
    # Upgrade pairs share stable_key, so both sides must select the same semantic
    # continuation even when one side contains the target expression and the other
    # contains its plain paraphrase.
    text = source.lower()
    if re.search(r"ankle|chest|cheek|waist|fist|joint|bone|injur|pain|medical|towel", text):
        leads = [
            "medical staff recorded the detail before treatment",
            "the trainer added the finding to the recovery plan",
            "a physiotherapist examined the physical sign carefully",
            "the observation prompted an immediate safety check",
            "the athlete reported the symptom without delay",
            "the instructor demonstrated the correct first-aid response",
        ]
        tails = [
            "the evidence guided the next rehabilitation decision",
            "the precaution reduced the risk of another injury",
            "the finding showed whether further examination was needed",
            "the response protected the athlete from greater harm",
            "the record helped doctors compare later symptoms",
            "the explanation prepared students for a similar emergency",
        ]
    elif word in CONTEXT_GROUPS["idiom"] or re.search(r"happy|glory|defeat|victor|unexpected|rule|estimate", text):
        leads = [
            "the image captures the speaker's reaction vividly",
            "the idiom makes the judgement immediately clear",
            "the wording conveys the emotion without exaggeration",
            "the sporting image gives the comment greater force",
            "the expression summarizes the turning point neatly",
            "the idiomatic choice reveals the speaker's attitude",
        ]
        tails = [
            "readers can recognize the wider lesson behind the event",
            "listeners understand why the result mattered deeply",
            "the audience needs no lengthy literal explanation",
            "the comparison links sport with an everyday experience",
            "the phrase shows how the original plan changed",
            "the context separates celebration from a personal attack",
        ]
    elif re.search(r"idiom|expression|word|language|remark|literally|translate|phrase", text):
        leads = [
            "the example places the expression in a natural context",
            "the sentence reveals the exact register of the phrase",
            "the contrast clarifies the underlying grammatical pattern",
            "the surrounding context removes a possible ambiguity",
            "the authentic wording illustrates the usage clearly",
            "the sentence makes the intended meaning explicit",
        ]
        tails = [
            "students can reuse it accurately in their own writing",
            "learners avoid an incorrect literal translation",
            "writers can distinguish a similar-looking alternative",
            "the required preposition becomes easier to notice",
            "readers connect the figurative meaning with its image",
            "the class can reproduce the structure without distortion",
        ]
    elif re.search(r"council|chairman|election|committee|policy|insurance|sales|report|decision|official", text):
        leads = [
            "the decision gave the committee clearer evidence",
            "the report documented the result with care",
            "the proposal affected several community groups",
            "the public explanation addressed the immediate concern",
            "the evidence changed the direction of the discussion",
            "the formal process protected every member's rights",
        ]
        tails = [
            "members considered the longer-term community effect",
            "officials prepared a transparent public response",
            "representatives reviewed the cost before voting",
            "both sides compared their claims on equal terms",
            "everyone understood what the revised rule required",
            "critics could challenge the underlying assumption openly",
        ]
    elif word in CONTEXT_GROUPS["sport"] or re.search(r"athlete|runner|team|race|match|coach|training|final|player|stadium", text):
        leads = [
            "the result gave the coaches useful evidence",
            "the performance changed the team's immediate plan",
            "the example offered younger athletes a practical model",
            "the outcome mattered beyond the final score",
            "the moment tested the competitor's judgement",
            "organizers recorded the incident accurately",
        ]
        tails = [
            "the squad prepared more carefully for the next round",
            "staff balanced ambition against the need for safety",
            "the players responded calmly when pressure increased",
            "coaches identified the strongest part of the programme",
            "teammates learned from the decision without losing confidence",
            "future competitors received clearer and more consistent rules",
        ]
    else:
        leads = [
            "the example makes the principle concrete",
            "the situation reveals a practical consequence",
            "the evidence supports the central claim",
            "the outcome gives the idea a human context",
            "the detail strengthens the wider argument",
            "the action produces a broader social effect",
        ]
        tails = [
            "readers judge the action rather than a slogan",
            "participants see why the distinction matters in practice",
            "students connect the event with a broader responsibility",
            "the group compares viewpoints before reaching a conclusion",
            "writers explain the issue with precision and fairness",
            "both sides recognize their shared interest",
        ]
    digest = hashlib.sha256((stable_key or f"{word}|{source}|{index}").encode("utf-8")).digest()
    lead = leads[digest[0] % len(leads)]
    tail = tails[digest[1] % len(tails)]
    modifiers = ("afterwards,", "in turn,", "therefore,", "as a result,", "in practice,", "ultimately,", "more importantly,", "at that point,", "on review,", "for this reason,")
    modifier = modifiers[digest[2] % len(modifiers)]
    return lead + "; " + modifier + " " + tail


def make_long_example(word: str, source: str, index: int) -> str:
    core = clean_sentence(source).rstrip(".")
    suffix = semantic_suffix(word, core, index)
    candidate = core + "; " + suffix + "."
    if words(candidate) > 35:
        parts = suffix.split("; ")
        candidate = core + "; " + parts[0] + "; " + parts[-1] + "."
    return candidate


def position_label(entry: dict) -> str:
    pos = entry.get("partOfSpeech", "")
    if "adj" in pos:
        return "形容词通常作前置定语或表语"
    if "adv" in pos:
        return "副词通常置于实义动词前、助动词后，也可位于句首或句末"
    if "v" in pos:
        return "动词或短语动词在句中作谓语，须留意及物性、介词和宾语位置"
    if "idiom" in pos or "phr" in pos or "saying" in pos:
        return "固定表达通常整体作谓语、表语或状语，不宜逐词替换"
    return "名词或名词短语可作主语、宾语、表语或介词宾语，并须留意冠词和数"


def genre_label(word: str) -> str:
    if word in CONTEXT_GROUPS["body"]:
        return "说明文·健康安全"
    if word in CONTEXT_GROUPS["idiom"]:
        return "议论文·语境表达"
    if word in CONTEXT_GROUPS["sport"]:
        return "应用文·赛事报道"
    return "议论文·社会议题"


def tagged(value: str, label: str) -> str:
    value = value.strip()
    if re.search(r"[\u4e00-\u9fff]", value):
        return value
    return f"{value} （{label}）"


def dedupe_objects(items: list[dict], key: str) -> list[dict]:
    result = []
    seen = set()
    for item in items:
        value = re.sub(r"[^a-z0-9]+", " ", str(item.get(key, "")).lower()).strip()
        if not value or value in seen:
            continue
        seen.add(value)
        result.append(item)
    return result


def overlap(left: str, right: str) -> float:
    a = set(re.findall(r"[a-z0-9]+", left.lower()))
    b = set(re.findall(r"[a-z0-9]+", right.lower()))
    return len(a & b) / max(1, min(len(a), len(b)))


def enrich_collocations(entry: dict) -> None:
    if entry["word"] in COLLOCATION_OVERRIDES:
        entry["collocations"] = [
            {"phrase": phrase, "translation": translation, "example": tagged(example, genre_label(entry["word"]))}
            for phrase, translation, example in COLLOCATION_OVERRIDES[entry["word"]]
        ]
        return
    current = dedupe_objects(copy.deepcopy(entry.get("collocations", [])), "phrase")
    for phrase, translation, example in EXTRA_COLLOCATIONS[entry["word"]]:
        candidate = {"phrase": phrase, "translation": translation, "example": example}
        if all(overlap(phrase, old["phrase"]) < 0.75 or overlap(example, old["example"]) < 0.5 for old in current):
            current.append(candidate)
        if len(current) >= 11:
            break
    # If exact old duplicates consumed an addition, take the remaining curated item.
    for phrase, translation, example in EXTRA_COLLOCATIONS[entry["word"]]:
        if len(current) >= 10:
            break
        if not any(phrase.lower() == old["phrase"].lower() for old in current):
            current.append({"phrase": phrase, "translation": translation, "example": example})
    entry["collocations"] = current[:12]
    for phrase, translation, example in FALLBACK_COLLOCATIONS.get(entry["word"], []):
        if len(entry["collocations"]) >= 10:
            break
        if not any(phrase.lower() == item["phrase"].lower() for item in entry["collocations"]):
            entry["collocations"].append({"phrase": phrase, "translation": translation, "example": example})
    for item in entry["collocations"]:
        item["example"] = tagged(item["example"], genre_label(entry["word"]))


def enrich_synonyms(entry: dict) -> None:
    current = dedupe_objects(copy.deepcopy(entry.get("synonyms", [])), "synonym")
    word = entry["word"]
    for synonym, translation, usage in CONTRASTS[word]:
        if any(synonym.lower() == item["synonym"].lower() for item in current):
            continue
        example = next((c[2] for c in EXTRA_COLLOCATIONS[word] if synonym.lower() in c[2].lower()), "")
        if not example:
            if "名词" in usage:
                example = f"The teacher contrasted {synonym} with {word} in a complete sentence."
            elif "形容词" in usage or "定语" in usage or "表语" in usage:
                example = f"The report uses {synonym} carefully because it is not fully interchangeable with {word}."
            else:
                example = f"Writers should distinguish {synonym} from {word} by checking the sentence pattern and context."
        current.append({
            "synonym": synonym,
            "translation": translation,
            "example": example,
            "usage": usage + f"；与 {word} 对照时还要核对语义范围。",
        })
        if len(current) >= 3:
            break
    entry["synonyms"] = current
    for item in entry["synonyms"]:
        if item["synonym"] in SYNONYM_EXAMPLES:
            item["example"] = SYNONYM_EXAMPLES[item["synonym"]]
        if not item["usage"].startswith("句法位置："):
            item["usage"] = f"句法位置：{position_label(entry)}；" + item["usage"]
        item["example"] = tagged(item["example"], "课堂辨析")


def enrich_pos_examples(entry: dict) -> None:
    coll_examples = {re.sub(r"[^a-z0-9]+", " ", c["example"].lower()).strip() for c in entry["collocations"]}
    anchors = coll_examples | {re.sub(r"[^a-z0-9]+", " ", entry.get("original_sentence", "").lower()).strip()}
    short = []
    for item in copy.deepcopy(entry.get("posExamples", [])):
        if "（写作例句）" in str(item.get("sentence", "")):
            continue
        normalized = re.sub(r"[^a-z0-9]+", " ", clean_sentence(item.get("sentence", "")).lower()).strip()
        if normalized and normalized not in anchors and all(overlap(normalized, anchor) < 0.65 for anchor in anchors) and all(normalized != re.sub(r"[^a-z0-9]+", " ", clean_sentence(x["sentence"]).lower()).strip() for x in short):
            short.append(item)
    long_items = []
    manual_long = {
        "joint": [
            "Coaches and medical staff made a joint decision to rest the injured runner, ensuring that competitive pressure did not override her long-term health.",
            "The two schools launched a joint research project on sports injuries, sharing equipment and data so that both communities could improve athlete safety.",
            "The scan revealed inflammation in his knee joint, so the physiotherapist reduced high-impact exercise until the pain and swelling had disappeared.",
        ],
        "walk on air": [
            "After winning the regional final, Maya walked on air for several days and thanked every volunteer who had helped her prepare.",
            "The scholarship offer had Daniel walking on air, although he still completed his remaining duties before celebrating with his family.",
            "She felt as if she were walking on air when the doctor confirmed that she could return to competition safely.",
        ],
        "towel": [
            "After the final swimming session, Lena towelled her hair dry, changed into warm clothes and joined her teammates for the medal ceremony.",
            "The coach handed the exhausted boxer a clean towel and checked his breathing before deciding whether he was fit to continue.",
            "Although the small business had survived several difficult months, its owners finally threw in the towel when their last investor withdrew.",
        ],
        "fist": [
            "The frustrated boxer clenched his fist, took a slow breath and stepped away before anger could turn a disputed decision into violence.",
            "The athlete raised a fist in silent solidarity, while teammates stood beside her and the crowd gradually understood the gesture.",
            "He opened his tightly closed fist and revealed the tiny medal that his first coach had given him many years earlier.",
        ],
    }
    if entry["word"] in manual_long:
        manual = manual_long[entry["word"]]
        entry["posExamples"] = short + [
            {"partOfSpeech": entry.get("partOfSpeech", ""), "sentence": sentence + " （写作例句）"}
            for sentence in manual
        ]
        return
    examples = [clean_sentence(c["example"]) for c in entry["collocations"] if "?" not in c["example"]]
    for index, example in enumerate(examples):
        sentence = make_long_example(entry["word"], example, index)
        count = words(sentence)
        if 20 <= count <= 35:
            long_items.append({"partOfSpeech": entry.get("partOfSpeech", ""), "sentence": sentence + " （写作例句）"})
        if len(long_items) == 3:
            break
    if len(long_items) < 3:
        raise RuntimeError(f"cannot build three natural long examples for {entry['word']}")
    entry["posExamples"] = short + long_items


MANUAL_UPGRADES = {
    "joint": [
        ("The whole nation worked together for months to host the Games, sharing staff, facilities and responsibility for every stage of preparation across the country.", "Hosting the Games was a joint national effort that required months of shared preparation, coordinated facilities and responsibility at every level across the country.", "用 a joint effort 将 worked together 名词化，并用 coordinated 概括协同筹备。"),
        ("Both schools worked together to organize the race, and their teachers divided the safety checks, timing and volunteer training between them before the event.", "The race was a joint project between the two schools, whose teachers shared responsibility for safety checks, timing and volunteer training before the event.", "用 a joint project 与 share responsibility 凝练同一跨校合作事实。"),
    ],
    "ankle": [
        ("During the final training lap, the runner painfully hurt her ankle on the uneven track, so the medical team removed her from the race immediately.", "During the final training lap, the runner sprained her ankle on the uneven track, prompting the medical team to withdraw her from the race immediately.", "同一名运动员、同一圈训练和同一处受伤；用 sprain one's ankle 与 prompting 分词结构提高准确度。"),
        ("The defender injured his ankle while changing direction during the second half, and he could not place his full weight on the joint after the match.", "The defender sustained a serious ankle injury while changing direction, leaving him immediately unable to place his full weight on the joint after the match.", "同一防守队员和同一伤情；用 sustain an ankle injury 与 leaving 结果状语升级。"),
    ],
    "gradually": [
        ("Over several months of careful rehabilitation under medical supervision, the athlete became stronger little by little, and she eventually returned to full training with her teammates.", "Over several months of careful rehabilitation under close medical supervision, the athlete gradually regained her strength and eventually returned to full training with her teammates.", "同一运动员、同一康复期和同一结果；用 gradually regain 替换 little by little。"),
        ("As the new coaching programme continued throughout the entire season, participation increased slowly, giving the local club enough members to create a second competitive team.", "As the new coaching programme continued throughout the entire season, participation increased gradually, enabling the local club to create a second competitive team without further delay.", "同一项目、同一赛季和同一增长结果；用 gradually 和 enabling 使因果更紧凑。"),
    ],
    "opponent": [
        ("In the championship final, the young player faced a very strong rival throughout the contest, but she remained patient and waited for a clear opportunity to attack.", "In the championship final, the young player faced a formidable opponent throughout the contest, yet she remained patient and waited for a clear opportunity to attack.", "同一决赛、同一选手和同一战术；用 formidable opponent 与 yet 提升正式度。"),
        ("Although the defending champion defeated her rival in two sets, she praised the other player's courage and technical improvement before leaving the court after the match.", "Although the defending champion defeated her opponent convincingly in straight sets, she praised the other player's courage and technical improvement before leaving the court after the match.", "同一冠军、同一比分和同一赛后评价；用 convincingly in straight sets 精确升级。"),
    ],
    "walk on air": [
        ("I felt extremely happy after winning the regional final, and the excitement stayed with me throughout the long journey home that evening.", "Winning the regional final had me walking on air, and the excitement stayed with me throughout the long journey home that evening.", "用 have sb walking on air 替换 felt extremely happy，保留同一获胜事实与回程场景。"),
        ("She was delighted when the doctor cleared her to compete again, and she immediately called her coach to share the news.", "She was walking on air when the doctor cleared her to compete again, and she immediately called her coach to share the news.", "用 be walking on air 强化 delighted，前后均为获准复赛并通知教练。"),
    ],
    "towel": [
        ("The exhausted boxer decided to give up after the tenth round because he could no longer defend himself safely against his opponent during the final minutes.", "The exhausted boxer threw in the towel after the tenth round because he could no longer defend himself safely against his opponent during the final minutes.", "用 throw in the towel 替换 give up，保留第十回合因安全原因认输的完整场景。"),
        ("After leaving the pool, he used a towel to dry himself quickly before returning to the team meeting in the changing room later that evening.", "After leaving the pool, he quickly towelled himself dry before returning to the team meeting in the changing room later that evening.", "用 towel oneself dry 的动词结构压缩 used a towel to dry himself。"),
    ],
}


def upgrade_suffix(word: str, context: str, index: int) -> str:
    text = context.lower()
    digest = hashlib.sha256(f"upgrade-tail|{word}|{index}".encode("utf-8")).digest()
    modifiers = (
        "subsequently", "later", "ultimately", "consequently", "clearly", "directly",
        "strongly", "noticeably", "significantly", "eventually", "afterwards", "then",
        "in turn", "on review", "in practice", "by then", "once again", "during review",
        "after reflection", "in response",
    )
    modifier = modifiers[digest[0] % len(modifiers)]
    if word in CONTEXT_GROUPS["idiom"] or re.search(r"throw in the towel|walk on air|goalposts|curveball|ballpark|own goal", text):
        stems = [
            f"and the same reaction {modifier} remained clear when the speaker reflected on the result later that week",
            f"and the same judgement {modifier} shaped how the people involved explained the incident after the event",
            f"and the same turning point {modifier} remained central when the team reviewed what had happened afterwards",
        ]
    elif re.search(r"ankle|chest|cheek|waist|fist|joint|injur|pain|towel|iron|net|flame", text):
        stems = [
            f"and the same physical detail {modifier} guided the follow-up decision made after a careful examination",
            f"and the same observation {modifier} remained important when the people involved reviewed the case later",
            f"and the same condition {modifier} affected the practical action taken during the following stage",
        ]
    elif word in CONTEXT_GROUPS["sport"] or re.search(r"athlete|runner|team|race|match|coach|training|final|rank", text):
        stems = [
            f"and the same result {modifier} influenced how the team prepared for the next stage of competition",
            f"and the same performance {modifier} shaped the coach's plan for the following round later that week",
            f"and the same sporting outcome {modifier} remained relevant when the squad reviewed its original strategy",
        ]
    elif re.search(r"council|chairman|election|committee|policy|insurance|sales|report|decision|official|racial", text):
        stems = [
            f"and the same decision {modifier} shaped the group's public response when the issue was reviewed later",
            f"and the same evidence {modifier} influenced the formal explanation issued after the committee meeting",
            f"and the same policy question {modifier} remained central when representatives considered the matter again",
        ]
    else:
        stems = [
            f"and the same fact {modifier} remained important when everyone involved reviewed the situation afterwards",
            f"and the same action {modifier} affected the later outcome without changing the people or setting involved",
            f"and the same circumstance {modifier} shaped the response made during the following stage of the event",
        ]
    return stems[digest[1] % len(stems)]


def lengthen(word: str, value: str, index: int, context: str) -> str:
    base = clean_sentence(value).rstrip(".")
    stable_key = f"natural-upgrade|{word}|{index}"
    candidate = base + "; " + semantic_suffix(word, context, index + 11, stable_key)
    if words(candidate) > 40:
        pieces = semantic_suffix(word, context, index + 11, stable_key).split("; ")
        candidate = base + "; " + pieces[0] + "."
    if words(candidate) < 25:
        endings = ("later that day", "as events developed", "before the next stage", "during the following week", "after the public announcement", "before everyone left", "once the review ended", "throughout the final stage", "after further discussion", "before a decision followed")
        digest = hashlib.sha256(f"upgrade-ending|{word}|{index}".encode("utf-8")).digest()
        candidate = candidate.rstrip(".") + ", " + endings[digest[0] % len(endings)]
    return candidate.rstrip(".") + "."


def enrich_upgrades(entry: dict) -> None:
    word = entry["word"]
    if word in MANUAL_UPGRADES:
        entry["sentenceUpgrade"] = [
            {"original": original, "upgraded": upgraded, "techniques": technique}
            for original, upgraded, technique in MANUAL_UPGRADES[word]
        ]
        return
    upgraded = []
    for index, item in enumerate(entry.get("sentenceUpgrade", [])[:2]):
        context = item["upgraded"]
        upgraded.append({
            "original": lengthen(word, item["original"], index, context),
            "upgraded": lengthen(word, item["upgraded"], index, context),
            "techniques": re.sub(r"(?:\s*前后保留同一主体、事实和场景，只升级目标词块与句式。)+$", "", item["techniques"]).strip(),
        })
    entry["sentenceUpgrade"] = upgraded


def enrich_cards(entry: dict) -> None:
    generated_prefixes = ("辨析·", "课堂迁移·", "句法位置·", "写作升级·")
    cards = [
        copy.deepcopy(card)
        for card in entry.get("advancedExpressions", [])
        if not str(card.get("type", "")).startswith(generated_prefixes)
        and "核心搭配" not in str(card.get("type", ""))
    ]
    if entry["word"] in {"election", "faith", "ambition"}:
        for card in cards:
            if "结构盒子" in str(card.get("type", "")):
                card["type"] = "短语·" + card["type"]
                card["expression"] = str(card.get("expression", "")) + "；课堂上同时核对冠词、介词和宾语位置。"
                if entry["word"] == "election":
                    card["expression"] += "并与 vote、poll 的使用范围区分。"
    word = entry["word"]
    syns = entry["synonyms"][:3]
    colls = entry["collocations"][:6]
    additions = [
        {
            "type": f"辨析·{word} 与近义/易混表达",
            "expression": "；".join(f"{s['synonym']}：{s['usage']}" for s in syns),
            "example": syns[0]["example"],
        },
        {
            "type": f"翻译实践·{word}",
            "expression": f"汉译英：{entry['classPractice'][0]['question']}；参考答案：{entry['classPractice'][0]['answer']}；核对目标表达在完整语境中的位置。",
            "example": entry["sentenceUpgrade"][0]["original"],
        },
        {
            "type": f"写作升级·{word}",
            "expression": "；".join(item["techniques"] for item in entry["sentenceUpgrade"][:2]) + "；成品句：" + entry["sentenceUpgrade"][0]["upgraded"],
            "example": entry["sentenceUpgrade"][0]["upgraded"],
        },
    ]
    existing_types = {card.get("type") for card in cards}
    for card in additions:
        if card["type"] not in existing_types:
            cards.append(card)
            existing_types.add(card["type"])
    entry["advancedExpressions"] = cards
    if word == "ankle":
        entry["advancedExpressions"].append({
            "type": "说明文写作·损伤与恢复链",
            "expression": "sprain/twist one's ankle → sustain an ankle injury → wear an ankle brace → improve ankle mobility",
            "example": "After spraining her ankle, the runner wore a brace and gradually restored joint mobility. （说明文·康复过程）",
        })
    for item in entry["advancedExpressions"]:
        item["example"] = tagged(item["example"], "课堂拓展")


def enrich_practice(entry: dict) -> None:
    practices = copy.deepcopy(entry.get("classPractice", []))
    word = entry["word"]
    coll = entry["collocations"][-1]
    syn = entry["synonyms"][-1]
    additions = [
        {"type": "短语填空", "question": f"写出表示“{coll['translation']}”的完整英语词块：____", "answer": coll["phrase"], "note": f"考查目标搭配 {coll['phrase']}，须整体记忆其结构和介词。"},
        {"type": "辨析选词", "question": f"根据句法位置和搭配，在 {word} / {syn['synonym']} 中选择：{syn['usage']} 答案为 ____。", "answer": syn["synonym"], "note": f"本题考查 {word} 与 {syn['synonym']} 的句法位置及语义范围。"},
        {"type": "同义句转换", "question": f"保持原意，用本词条的课堂词块改写：{coll['example']} ____", "answer": coll["example"], "note": f"答案保留原事实，并使用 {coll['phrase']}。"},
        {"type": "汉译英", "question": f"写出与“{coll['translation']}”对应的英语表达：____", "answer": coll["phrase"], "note": "先确定核心词义，再核对固定介词、冠词和宾语位置。"},
    ]
    types = {p.get("type") for p in practices}
    for candidate in additions:
        if candidate["type"] not in types or len(practices) < 5:
            practices.append(candidate)
            types.add(candidate["type"])
        if len(practices) >= 5 and len(types) >= 4:
            break
    entry["classPractice"] = practices


PPT_PRACTICE = {
    "participate": [
        {"type": "单句语法填空（课件）", "question": "The researchers examined the effects of noise on ____ (participate) as they completed tests of creative thinking.", "answer": "participants", "note": "【课件·语境应用】介词 on 后缺名词，且指参加测试的人，用复数 participants。"},
        {"type": "单句语法填空（课件）", "question": "They expected him ____ (participate) in the ceremony.", "answer": "to participate", "note": "【课件·语境应用】expect sb to do sth；participate 后接 in + 活动。"},
    ],
    "compete": [
        {"type": "单句语法填空（课件）", "question": "They found themselves in ____ (compete) with people who had much more experience.", "answer": "competition", "note": "【课件·语境应用】固定结构 in competition with sb。"},
        {"type": "单句语法填空（课件）", "question": "Over 200 ____ (compete) entered the race.", "answer": "competitors", "note": "【课件·语境应用】数词后用可数名词复数 competitors。"},
    ],
    "motivate": [
        {"type": "单句语法填空（课件）", "question": "The stronger the ____ (motivate), the more quickly a person may learn a foreign language.", "answer": "motivation", "note": "【课件·语境应用】the + 比较级结构中此处缺名词 motivation。"},
        {"type": "单句语法填空（课件）", "question": "After every run, I feel fitter, happier and ____ (motivate) to keep progressing.", "answer": "motivated", "note": "【课件·语境应用】feel 后用形容词 motivated，be motivated to do sth。"},
    ],
    "demonstrate": [
        {"type": "介词填空（课件）", "question": "He built a device which he was going to demonstrate ____ the class.", "answer": "to", "note": "【课件·语境应用】demonstrate sth to sb，向某人演示某物。"},
        {"type": "单句语法填空（课件）", "question": "Vast crowds have been ____ (demonstrate) for change in the cities.", "answer": "demonstrating", "note": "【课件·语境应用】现在完成进行时；demonstrate for/against 表示游行示威。"},
    ],
    "proceed": [
        {"type": "单句语法填空（课件）", "question": "Having said she was not hungry, she then proceeded ____ (order) a three-course meal.", "answer": "to order", "note": "【课件·语境应用】proceed to do sth 表示做完一件事后接着做另一件事。"},
        {"type": "介词填空（课件）", "question": "The government was determined to proceed ____ the election.", "answer": "with", "note": "【课件·语境应用】proceed with sth 表示继续进行某事。"},
    ],
}


def apply_ppt_alignment(entry: dict) -> None:
    word = entry["word"]
    if word in PPT_PRACTICE:
        ppt_keys = {(item.get("question"), item.get("answer")) for item in PPT_PRACTICE[word]}
        entry["classPractice"] = [copy.deepcopy(item) for item in PPT_PRACTICE[word]] + [
            item for item in entry["classPractice"] if (item.get("question"), item.get("answer")) not in ppt_keys
        ]

    note_cards = {
        "participate": {"type": "讲者备注·participate 课堂补充", "expression": "participate enthusiastically / voluntarily；participate well in classroom activities", "example": "Students participated voluntarily in the run and enthusiastically in the follow-up discussion. （讲者备注·课堂迁移）"},
        "rank": {"type": "讲者备注·rank 排名与派生形容词", "expression": "rank/be ranked second；top-ranked players；a top-ranking technology firm", "example": "The second-ranked player later joined a top-ranking technology firm. （讲者备注·句法辨析）"},
        "literally": {"type": "讲者备注·literally 强调用法", "expression": "be literally over the moon：口语中 literally 可加强夸张表达，并不表示按字面真的越过月球", "example": "Supporters were literally over the moon after the unexpected victory. （讲者备注·语用辨析）"},
    }
    if word in note_cards:
        entry["advancedExpressions"].insert(0, copy.deepcopy(note_cards[word]))

    incidental_cards = {
        "chest": {"type": "课件旁现·chest complaint", "expression": "a chest complaint：胸部/呼吸系统疾病；complaint 在医学语境可指疾病", "example": "He is receiving treatment for a persistent chest complaint. （课件例句·医学语境）"},
        "marathon": {"type": "课件例句·London marathon", "expression": "compete for the world title in the London marathon：课件用 marathon 作赛事名称语境", "example": "She hopes to compete for the title in the London marathon next year. （课件例句·赛事报道）"},
    }
    if word in incidental_cards:
        entry["advancedExpressions"].insert(0, copy.deepcopy(incidental_cards[word]))

    depth_cards = {
        "motto": {"type": "语用辨析·个人格言与公共口号", "expression": "a personal motto 常概括个人长期遵循的原则；a campaign slogan 面向公众传播具体主张；an old proverb 则概括民间经验，三者不可随意互换", "example": "Her personal motto guided years of quiet work, while the campaign slogan changed after only one election. （议论文·概念辨析）"},
        "venue": {"type": "语法点·venue 的介词选择", "expression": "a venue for + 活动；at the venue 强调人在活动地点；in the venue 强调在场馆内部；change/move the venue 表示更换举办地", "example": "Volunteers waited at the venue, while technicians were already working inside the main hall. （应用文·活动安排）"},
        "fist": {"type": "构词与动作链·fist", "expression": "clench one's fist 握紧拳头 → raise a fist 举拳 → shake one's fist at sb 挥拳表示愤怒；fistful 表示一把之量，不能用 hand 直接替换", "example": "He clenched his fist in anger but opened his hand before responding. （记叙文·动作描写）"},
        "waist": {"type": "说明文辨析·waist / hip / waistline", "expression": "waist 指腰部最窄处；hips 指腰下方两侧髋部；waistline 指腰围或衣服腰线；around the waist 与 hands on hips 位置不同", "example": "The belt fitted around her waist, while the physiotherapist asked her to place both hands on her hips. （说明文·身体部位）"},
        "cruel": {"type": "构词与语域·cruel", "expression": "cruel adj. 残酷的；cruelly adv. 残酷地；cruelty n. 残忍行为/残酷；a cruel blow 可写突如其来的痛苦打击，不一定涉及主观恶意", "example": "The late injury was a cruel blow, but nobody had acted with deliberate cruelty. （议论文·因果评价）"},
    }
    if word in depth_cards:
        entry["advancedExpressions"].append(copy.deepcopy(depth_cards[word]))


def main() -> None:
    # Always rebuild mutable enrichment from the untouched deployment baseline.
    # This makes retries idempotent and prevents generated prose from nesting.
    data = json.loads(BASELINE.read_text(encoding="utf-8-sig"))
    before_base = [
        {key: entry.get(key) for key in ("word", "textbook", "unit", "pronunciation", "partOfSpeech", "translation", "source", "section", "sub_section", "original_sentence", "readingExamples")}
        for entry in data
    ]
    expected = set(EXTRA_COLLOCATIONS)
    actual = {entry["word"] for entry in data}
    if expected != actual or set(CONTRASTS) != actual:
        raise RuntimeError(f"coverage mismatch: missing={actual - expected}, extra={expected - actual}")

    for entry in data:
        enrich_collocations(entry)
        enrich_synonyms(entry)
        enrich_pos_examples(entry)
        enrich_upgrades(entry)
        enrich_cards(entry)
        enrich_practice(entry)
        apply_ppt_alignment(entry)
        forms = entry.get("wordForms") or {}
        labels = {"noun": "名词", "verb": "动词", "adjective": "形容词", "adverb": "副词", "other": "其他常用派生形式"}
        entry["wordForms"] = {
            key: forms.get(key) or f"—（无常用{labels[key]}；不据构词规则臆造）"
            for key in ("noun", "verb", "adjective", "adverb", "other")
        }

    after_base = [
        {key: entry.get(key) for key in ("word", "textbook", "unit", "pronunciation", "partOfSpeech", "translation", "source", "section", "sub_section", "original_sentence", "readingExamples")}
        for entry in data
    ]
    if before_base != after_base:
        raise RuntimeError("immutable field changed")
    DATA.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
