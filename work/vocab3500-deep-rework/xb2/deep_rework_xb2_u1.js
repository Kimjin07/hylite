const fs = require('fs');

const DATA_PATH = 'C:/Users/27894/Desktop/HY/work/vocab3500-deep-rework/xb2/xb2_u1_data.json';
const BASELINE_PATH = 'C:/Users/27894/Desktop/HY/deploy/vocab3500/xb2_u1_data.json';
const PPT_INDEX_PATH = 'C:/Users/27894/Desktop/HY/work/vocab3500-deep-rework/xb2_u1_ppt_word_index.json';
const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
const baselineData = JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8'));
const pptIndex = JSON.parse(fs.readFileSync(PPT_INDEX_PATH, 'utf8'));

// Compact notation: phrase ~ Chinese explanation ~ example. Entries are split by ||.
const COLLOCATIONS = {
  critical: `critically examine the evidence~批判性地审查证据（副词修饰动作）~Editors must critically examine the evidence before approving a report.||reach a critical stage~到达关键阶段~The rescue reached a critical stage when smoke entered the stairwell.||a critical shortage of sth~某物严重短缺~The region faces a critical shortage of trained emergency workers.||critical acclaim~评论界的高度赞誉~The documentary received critical acclaim for its factual accuracy.`,
  trap: `trap heat / smoke~困住热量／烟雾~The sealed corridor trapped smoke and made breathing difficult.||a death trap~极危险之地~Residents called the blocked stairwell a death trap.||lay a trap for sb~为某人设圈套~Investigators laid a trap for the person spreading false claims.||feel trapped by sth~感到受……束缚~Young reporters may feel trapped by the pressure to publish quickly.`,
  release: `release a statement / report~发布声明／报告（新闻正式用语）~The agency released a detailed statement after the investigation.||release sb on bail~准予某人保释~The suspect was released on bail while officers checked the evidence.||secure the release of sb~促成某人获释~The lawyer worked to secure the release of the wrongly accused journalist.||scheduled for release~计划发布／上映~The revised edition is scheduled for release next month.`,
  ambulance: `an air ambulance~空中救护机~An air ambulance carried the critically injured climber to hospital.||ambulance response time~救护车响应时间~The council promised to reduce ambulance response times in rural areas.||give way to an ambulance~给救护车让行~Drivers must give way to an ambulance using its lights and siren.||an ambulance call-out~一次救护车出勤~Each unnecessary ambulance call-out delays help for a genuine emergency.`,
  extend: `extend assistance / credit to sb~向某人提供帮助／信贷（正式）~The charity extended assistance to families displaced by the fire.||extend over a period of time~延续一段时间~The investigation extended over several months because new evidence kept emerging.||extend one's stay~延长逗留时间~The reporter extended her stay to interview more local residents.||extend an argument / principle to sth~把论点／原则推广到……~The same principle can be extended to information shared on social media.`,
  construction: `the construction of an argument~论证的构建（抽象义）~The construction of a convincing argument requires accurate evidence.||sentence construction~句子结构~Careful sentence construction makes a complex report easier to follow.||a construction boom~建筑业繁荣~The housing shortage led to a construction boom on the city's edge.||halt construction~叫停施工~Safety concerns forced the authorities to halt construction immediately.`,
  dozen: `a dozen or so~十二个左右~A dozen or so witnesses remained at the scene.||in batches of a dozen~每十二个一批~The forms were checked in batches of a dozen.||not more than a dozen~不超过十二个~Not more than a dozen residents attended the late meeting.||a dime a dozen~多得不值钱；司空见惯~Sensational headlines are a dime a dozen online, but reliable reports are rare.`,
  minor: `a minor in politics~政治学辅修专业~She completed a minor in politics before entering journalism.||minor in a subject~辅修某学科（动词）~He majored in history and minored in journalism.||a minor setback~小挫折~A minor setback did not prevent the team from completing its investigation.||minority / minor distinction~少数与次要的构词辨别~Do not confuse a minor issue with an issue affecting a minority group.`,
  bath: `a bath of warm water~一浴缸温水~The nurse prepared a bath of warm water for the child.||give sb a bath~给某人洗澡~The carers gave the injured dog a bath after treatment.||bath salts / bath oil~浴盐／浴油~The shop removed bath salts that failed the safety test.||take a long soak in the bath~在浴缸里久泡~After the night shift, she took a long soak in the bath.`,
  scream: `scream oneself hoarse~喊到嗓子嘶哑~The trapped residents screamed themselves hoarse before help arrived.||a piercing scream~刺耳的尖叫~A piercing scream brought neighbours into the corridor.||scream abuse at sb~冲某人高声辱骂~The crowd screamed abuse at the reporter during the live broadcast.||tires scream~轮胎发出尖锐摩擦声（拟声义）~The car's tyres screamed as the driver stopped beside the ambulance.`,
  bark: `bark a warning~厉声发出警告~The officer barked a warning when people moved towards the unsafe entrance.||strip the bark from a tree~剥去树皮~The heat stripped the bark from several trees beside the building.||rough bark~粗糙的树皮~The witness scratched a mark into the tree's rough bark.||bark with laughter~突然粗声大笑~The editor barked with laughter at the obviously false slogan.`,
  choke: `choke on smoke / food~被烟呛到／被食物噎住~Several residents choked on smoke while escaping downstairs.||choke the streets / drains~堵塞街道／下水道~Emergency vehicles choked the narrow streets around the building.||choke back a sob~强忍住呜咽~The witness choked back a sob while describing the rescue.||choke under pressure~因压力发挥失常~An experienced broadcaster is less likely to choke under pressure.`,
  cigarette: `a cigarette burns / smoulders~香烟燃烧／闷烧~A cigarette was still smouldering in the damaged room.||a carton of cigarettes~一条香烟~Customs officers discovered a hidden carton of cigarettes.||cigarette advertising~香烟广告~Many countries strictly limit cigarette advertising aimed at young people.||cigarette consumption~香烟消费量~Higher taxes have reduced cigarette consumption among teenagers.`,
  carpet: `a thick / threadbare carpet~厚地毯／磨旧的地毯~Smoke had darkened the once bright carpet.||carpet an area with sth~用……铺满某地；覆盖~Broken glass carpeted the pavement below the tower.||be called on the carpet~被叫去训斥~The editor was called on the carpet for publishing an unchecked claim.||a carpet of flowers / leaves~一层花／落叶~A carpet of flowers appeared outside the building after the tragedy.`,
  automatic: `automatic renewal~自动续期~Users can turn off automatic renewal in their membership settings.||an automatic assumption~下意识的假设~Readers should question the automatic assumption that every photograph is genuine.||automatic entry / qualification~自动入选／获得资格~Winning the regional contest gives the team automatic entry to the final.||far from automatic~远非必然~Public trust is far from automatic and must be earned through accurate reporting.`,
  investigate: `investigate sb for sth~因某事调查某人~Police investigated the company for possible safety violations.||investigate allegations / claims~调查指控／说法~Independent journalists investigated allegations of hidden sponsorship.||investigate a matter thoroughly~彻底调查某事~The committee promised to investigate the matter thoroughly.||investigate further~进一步调查~The unusual figures gave the reporter a reason to investigate further.`,
  'dozens of': `dozens upon dozens of~一批又一批的；很多很多~Dozens upon dozens of messages reached the newsroom after the broadcast.||many dozens of~许多个十二；数十~Many dozens of volunteers offered help after the fire.||dozens of different kinds of~数十种不同的……~The platform carries dozens of different kinds of advertisement.||by dozens~成打地；大批地~Applications arrived by dozens once the scholarship was advertised.`,
  journalist: `a staff journalist~报社在编记者~A staff journalist checked the figures against the official report.||a foreign correspondent / journalist~驻外记者~The foreign journalist reported from the disaster area for three weeks.||a journalist covering a story~报道某事件的记者~Every journalist covering the story had to respect the victims' privacy.||journalistic integrity~新闻职业操守~Journalistic integrity requires reporters to correct factual errors openly.`,
  priority: `assign priority to sth~赋予某事优先地位~The editor assigned priority to reports affecting public safety.||competing priorities~相互冲突的优先事项~Newsrooms must balance the competing priorities of speed and accuracy.||priority access~优先使用权~Emergency workers were given priority access to the damaged building.||on a priority basis~优先地~Applications from displaced families were processed on a priority basis.`,
  contradict: `contradict a claim / account~否定某种说法／叙述~Video evidence contradicted the witness's original account.||appear to contradict sth~似乎与……矛盾~The latest figures appear to contradict the earlier report.||contradictory evidence~相互矛盾的证据~Investigators refused to draw a conclusion from contradictory evidence.||a contradiction between A and B~A 与 B 之间的矛盾~There is a clear contradiction between the slogan and the company's conduct.`,
  factual: `factually correct / inaccurate~事实层面正确／不准确~The article was grammatically polished but factually inaccurate.||separate factual reporting from opinion~区分事实报道和观点~Responsible readers separate factual reporting from personal opinion.||a factual basis for sth~某事的事实依据~The accusation had no factual basis and was later withdrawn.||remain strictly factual~严格基于事实~During the broadcast, the journalist remained strictly factual.`,
  instance: `in one particular instance~在某一具体情况下~In one particular instance, the platform removed an accurate report by mistake.||a clear instance of sth~……的明显实例~The correction was a clear instance of responsible journalism.||at first instance~初审；第一审~The case was dismissed at first instance for lack of evidence.||for instance alone~仅以该例而言~For that instance alone, the new rule deserves careful review.`,
  differ: `differ markedly / fundamentally~显著／根本不同~The two witnesses differed fundamentally in their accounts of the fire.||differ as to whether ...~对于是否……意见不同~Editors differ as to whether graphic images should be published.||differ according to sth~因……而异~Advertising rules differ according to the platform and audience.||beg to differ~恕不同意~I beg to differ: speed does not excuse factual inaccuracy.`,
  conclusion: `a foregone conclusion~预料中的必然结果~The election result was far from a foregone conclusion.||the conclusion of an agreement~协议的缔结~The conclusion of the agreement allowed the investigation to continue.||bring sth to a conclusion~使某事结束~New evidence helped bring the long inquiry to a conclusion.||arrive at an informed conclusion~得出有根据的结论~Readers should compare several sources before arriving at an informed conclusion.`,
  false: `a false accusation~诬告；不实指控~A false accusation can permanently damage a journalist's reputation.||false advertising~虚假广告~The company was fined for false advertising.||ring false~听起来不真实~His carefully prepared apology rang false to many viewers.||create a false sense of security~造成虚假的安全感~Automatic checks can create a false sense of security if nobody reviews the results.`,
  minimum: `minimum standards~最低标准~Every report must meet minimum standards of accuracy and fairness.||meet the minimum requirement~达到最低要求~The advertisement failed to meet the minimum legal requirement.||with minimum delay~尽量不延误~Emergency services released verified information with minimum delay.||a minimum level of sth~最低程度的……~A minimum level of media literacy is essential for online readers.`,
  maximum: `set a maximum limit~设定最高限额~The platform set a maximum limit on political advertising.||maximum efficiency~最高效率~The rescue centre reorganized its staff for maximum efficiency.||the maximum permitted amount~允许的最高量~The product contained more than the maximum permitted amount of sugar.||reach maximum capacity~达到最大容量~The emergency phone line quickly reached maximum capacity.`,
  sum: `sum to / total sth~总计为……~The separate donations summed to more than a million yuan.||a tidy / considerable sum~一大笔钱~The sponsor contributed a considerable sum to the scholarship fund.||the sum total of sth~……的全部~The headline was the sum total of what many readers remembered.||greater than the sum of its parts~整体大于各部分之和~A strong campaign can be greater than the sum of its individual advertisements.`,
  accurate: `accurate to three decimal places~精确到小数点后三位~The measurement is accurate to three decimal places.||an accurate reflection of sth~对……的准确反映~Audience ratings are not always an accurate reflection of programme quality.||keep accurate records~保存准确记录~The newsroom keeps accurate records of every correction.||pinpoint accurate~极其精确的~The rescue team needed pinpoint accurate location data.`,
  committed: `a highly committed workforce~高度敬业的员工队伍~A highly committed newsroom can maintain standards under pressure.||commit resources to sth~把资源投入……~The publisher committed more resources to investigative journalism.||commit to a course of action~承诺采取某种行动~The platform committed to a course of action that would protect young users.||a committed relationship~稳定认真的恋爱关系~The interview explored how a committed relationship affects work choices.`,
  discrimination: `exercise discrimination~运用辨别力~Readers must exercise discrimination when comparing online sources.||subtle discrimination~隐蔽的歧视~The investigation revealed subtle discrimination in the placement process.||positive discrimination~积极区别对待；优惠措施~The policy permits positive discrimination in limited circumstances.||a discrimination claim~歧视申诉~The former employee filed a discrimination claim against the company.`,
  'come about': `come about unexpectedly~意外发生~The change came about unexpectedly after the report attracted public attention.||explain how sth came about~解释某事如何发生~The documentary explains how the housing crisis came about.||changes that have come about~已经发生的变化~The chart records the social changes that have come about since 2000.||come about without warning~毫无预警地发生~The sudden fall in ratings came about without warning.`,
  'for instance': `consider, for instance, ...~例如考虑……（插入语）~Consider, for instance, how quickly a false headline can spread.||one notable instance is ...~一个显著例子是……~One notable instance is the correction published after the live broadcast.||to cite a specific instance~举一个具体事例~To cite a specific instance, the reporter checked every name twice.||as, for instance, in ...~例如在……中（较正式插入）~Some words change meaning by context, as, for instance, in legal writing.||take a simple instance~举一个简单实例~Take a simple instance: one unchecked figure can change a headline.||for instance alone~仅以这一例而言~For this instance alone, the new checking rule is justified.`,
  'bring sth to light': `bring wrongdoing to light~揭露不法行为~Investigative journalism can bring hidden wrongdoing to light.||facts newly brought to light~新近披露的事实~Facts newly brought to light forced the sponsor to withdraw.||bring the circumstances to light~揭示具体情况~Witness statements brought the circumstances of the accident to light.||help bring sth to light~帮助揭露某事~A leaked document helped bring the tax scheme to light.`,
  'be committed to': `be firmly committed to sth~坚定致力于……~The newspaper is firmly committed to factual reporting.||be committed to the principle that ...~信守……原则~The editor is committed to the principle that corrections must be visible.||remain committed despite sth~尽管……仍坚持投入~The journalist remained committed despite repeated threats.||be equally committed to A and B~同样致力于 A 和 B~Responsible media should be equally committed to speed and accuracy.`,
  curiosity: `pique one's curiosity~激起某人的好奇心~The unexplained figure piqued the journalist's curiosity.||a matter of more than curiosity~不只是好奇的问题~The source of the funding is a matter of more than curiosity.||curiosity gets the better of sb~某人按捺不住好奇心~Curiosity got the better of him, so he opened the unverified link.||a curiosity shop / cabinet~古玩店／珍奇陈列柜~The old advertisement showed a crowded curiosity shop.`,
  journalism: `advocacy journalism~倡议型新闻~Advocacy journalism openly argues for a social cause.||journalism ethics~新闻伦理~The course places journalism ethics above the pursuit of clicks.||a piece of journalism~一篇新闻作品~The investigation became an influential piece of journalism.||practice journalism~从事新闻工作~She practised journalism before entering politics.`,
  commitment: `fulfil / meet a commitment~履行承诺~The platform failed to meet its commitment to remove false advertisements.||a binding commitment~有约束力的承诺~The sponsor made a binding commitment to fund the scholarship.||financial commitments~财务负担；已承诺支出~Rising housing costs left the family with heavy financial commitments.||without commitment~不承担义务地~Customers can request information without commitment to purchase.`,
  citizen: `a dual citizen~双重国籍公民~The journalist is a dual citizen of Canada and France.||citizens' rights / duties~公民权利／义务~Reliable information helps citizens exercise their rights and duties.||a citizen of the world~世界公民~The ambassador described herself as a citizen of the world.||citizen participation~公民参与~The platform was designed to encourage citizen participation in local politics.`,
  found: `found sth on evidence~把某事建立在证据上~A sound conclusion must be founded on verified evidence.||newly founded~新创立的~The newly founded newspaper hired several experienced journalists.||a founding member~创始成员~She was a founding member of the press association.||unfounded allegations~毫无根据的指控~The editor refused to publish unfounded allegations.`,
  politics: `the politics surrounding sth~围绕某事的政治因素~The article examines the politics surrounding the housing project.||stay out of politics~不参与政治~The ambassador promised to stay out of domestic politics.||the personal is political~个人问题也是政治问题~The drama explores the claim that the personal is political.||politics and policy~政治活动与具体政策~Good reporting distinguishes politics from policy.`,
  accuse: `accuse sb without evidence~无证据指控某人~The blogger accused the journalist without evidence.||stand accused of sth~被控……~The company stands accused of misleading consumers.||make / deny an accusation~提出／否认指控~The sponsor denied the accusation in a public statement.||accusations fly~互相指责；指控四起~Accusations flew after the contradictory figures were released.`,
  tax: `impose / levy a tax on sth~对……征税~The government imposed a tax on cigarette advertising.||a tax burden~税负~Small newspapers argued that the new tax burden was unfair.||tax relief~税收减免~The scholarship fund receives limited tax relief.||tax one's patience / resources~使某人的耐心／资源不堪重负~The long investigation taxed the small newsroom's resources.`,
  mount: `mount evidence / concern~证据／担忧不断增加~Evidence mounted that the advertisement had misled consumers.||mount the podium~登上讲台~The ambassador mounted the podium to deliver a brief statement.||mount a defence~组织辩护~The newspaper mounted a strong defence of its investigation.||mounted police~骑警~Mounted police controlled the crowd outside the platform.`,
  elevation: `elevation to high office~晋升到高位~Her elevation to high office attracted intense media attention.||a front elevation drawing~正立面图~The newspaper published a front elevation drawing of the proposed estate.||elevation data~高程数据~The rescue team checked elevation data before sending an air ambulance.||elevation of mood~情绪提升~The brighter room produced a noticeable elevation of mood.`,
  profession: `the journalistic profession~新闻职业~The journalistic profession depends on public trust.||professional standards~职业标准~The editor insisted that every report meet professional standards.||a profession of faith / innocence~信仰／清白的公开声明~His profession of innocence contradicted the recorded evidence.||the learned professions~需要高等教育的专业职业~Law and medicine are traditionally described as learned professions.`,
  'mount up': `mount up to a total of~累积到总计……~Repair costs mounted up to a total of two million yuan.||let problems mount up~任由问题积累~The platform let complaints mount up instead of investigating them.||rapidly mounting costs~迅速攀升的费用~Rapidly mounting costs forced the sponsor to reduce the campaign.||mounting evidence that ...~越来越多的证据表明……~There is mounting evidence that the ratings were inaccurate.`,
  drama: `a period / series drama~历史剧／系列剧~The channel broadcast a popular period drama on Sunday evenings.||drama critic~戏剧评论家~A drama critic praised the production's factual detail.||turn sth into a drama~把某事闹大~The advertisement turned a minor disagreement into unnecessary drama.||without fuss or drama~不声张；平静地~The correction was published without fuss or drama.`,
  scholarship: `scholarship on sth~关于……的学术研究~Recent scholarship on digital journalism questions the old model.||a Rhodes scholarship~罗德奖学金~She won a Rhodes scholarship to study politics at Oxford.||scholarship recipient~奖学金获得者~Each scholarship recipient must complete a work placement.||fund a scholarship~资助奖学金~The media company agreed to fund a journalism scholarship.`,
  category: `create a new category~新设类别~The competition created a new category for data journalism.||category error~范畴错误~Treating opinion as factual evidence is a category error.||category label~类别标签~A clear category label helps readers find relevant reports.||across all categories~在所有类别中~The documentary received the highest rating across all categories.`,
  nevertheless: `even so, nevertheless~即便如此，仍然~The evidence was incomplete; even so, the conclusion was nevertheless persuasive.||small but nevertheless significant~虽小但仍然重要~The correction was small but nevertheless significant.||nevertheless true / possible~尽管如此仍然真实／可能~The claim sounds surprising but is nevertheless true.||..., and nevertheless ...~然而仍然（连接已有 and 的分句）~The risks were clear, and nevertheless the journalist continued the investigation.||admittedly ..., nevertheless ...~诚然……，然而……~Admittedly, the sample was small; nevertheless, the pattern deserves attention.||nevertheless remain / continue~尽管如此仍保持／继续~The ratings fell, but the programme nevertheless remained influential.||nevertheless retain sth~尽管如此仍保留……~The revised edition nevertheless retains the original conclusion.||perhaps surprising, but nevertheless ...~也许令人意外，但仍然……~The result is perhaps surprising, but nevertheless factually accurate.`,
  witness: `witness to a document~为文件签署作证~Two independent adults acted as witnesses to the document.||expert witness~专家证人~An expert witness explained the chart to the court.||witness for the prosecution / defence~控方／辩方证人~The key witness for the prosecution contradicted himself.||witness first-hand~亲眼见证~The reporter witnessed first-hand how quickly false information spread.`,
  edition: `an abridged / unabridged edition~节本／未删节本~Students compared the abridged edition with the original text.||a digital-first edition~数字优先版本~The newspaper launched a digital-first edition for younger readers.||go into a second edition~再版~The investigative book went into a second edition within a month.||edit an edition~编辑某一版~A specialist team edited the anniversary edition.`,
  platform: `a railway platform~火车站台~The journalist interviewed passengers on the railway platform.||a political platform~政治纲领~The candidate's political platform gave priority to affordable housing.||platform economy~平台经济~The report examines working conditions in the platform economy.||give sb a platform~给某人发声机会~The programme should not give false experts a platform.`,
  interaction: `interaction effect~交互作用~The study found an interaction effect between age and advertising exposure.||meaningful interaction~有意义的互动~The platform encourages meaningful interaction rather than automatic reactions.||facilitate interaction~促进互动~Small discussion groups facilitate interaction among new members.||through interaction with~通过与……互动~Children learn persuasive language through interaction with advertisements.`,
  membership: `membership stands at ...~会员人数为……~Membership now stands at more than ten thousand.||terminate / cancel membership~终止／取消会员资格~Users can cancel membership without paying an additional fee.||membership eligibility~会员资格条件~The website clearly explains membership eligibility.||a decline in membership~会员人数下降~A decline in membership followed the false advertising scandal.`,
  chart: `chart a path / course forward~规划前进道路~The report charts a path forward for responsible advertising.||chart the rise and fall of sth~记录……的兴衰~The documentary charts the rise and fall of print journalism.||off the charts~高得惊人；超出量表~Online interaction during the broadcast was off the charts.||enter the charts at number ...~空降排行榜第……位~The sponsored song entered the charts at number three.`,
  broadcast: `broadcast from / across sth~从……播出／向……传播~The programme was broadcast from a temporary studio.||broadcast a warning~广播警报~Emergency services broadcast a warning to nearby residents.||broadcast journalist~广播记者~A broadcast journalist must speak accurately under pressure.||simultaneous broadcast~同步播出~The debate received a simultaneous broadcast on radio and television.`,
  'spring up': `spring up along sth~沿……迅速出现~New housing estates sprang up along the railway line.||spring up to meet demand~为满足需求而兴起~Advertising agencies sprang up to meet demand from online brands.||newly sprung-up businesses~新兴企业（较少用，强调新出现）~Newly sprung-up businesses competed for attention on the platform.||allow sth to spring up~任由……涌现~Weak regulation allowed false advertisements to spring up.`,
  advertising: `targeted advertising~定向广告~Targeted advertising uses data to reach selected consumers.||truth in advertising~广告真实性原则~The regulator enforces strict truth-in-advertising rules.||advertising space / time~广告版面／时段~The sponsor purchased advertising space beside the news report.||misleading advertising~误导性广告~The company withdrew its misleading advertising after an investigation.`,
  persuasion: `beyond persuasion~无法劝服~The editor was beyond persuasion once the factual error was confirmed.||moral persuasion~道义劝说~The charity relied on moral persuasion rather than pressure.||a means of persuasion~说服手段~Fear should not be the main means of persuasion in public advertising.||resist persuasion~拒绝被说服~Critical readers resist persuasion until they see reliable evidence.`,
  persuade: `persuade sb otherwise~使某人改变原有看法~The figures seemed convincing, but later evidence persuaded us otherwise.||be persuaded of the need for sth~确信有必要……~Editors were persuaded of the need for a public correction.||persuade sb over time~逐渐说服某人~The campaign persuaded consumers over time rather than through one slogan.||persuade rather than inform~旨在说服而非告知~Most advertisements seek to persuade rather than inform.`,
  advertisement: `a misleading / deceptive advertisement~误导性／欺骗性广告~The platform removed a deceptive advertisement for a false cure.||advertisement copy~广告文案~The editor shortened the advertisement copy without changing its claim.||advertisement break~广告时段~Ratings fell sharply during the long advertisement break.||an unsolicited advertisement~未经请求的广告~Users complained about unsolicited advertisements in private messages.`,
  channel: `channel sth through sth~经由……输送某物~The charity channelled donations through a trusted local organization.||a distribution channel~分销渠道~Online shops have become an important distribution channel.||change / switch channels~换台~Viewers often switch channels during advertising breaks.||a secure channel~安全渠道~The source sent the documents through a secure channel.`,
  peak: `peak at a figure~达到某一峰值~Audience numbers peaked at twelve million during the final.||peak viewing hours~收视高峰时段~The company bought advertising time during peak viewing hours.||past one's peak~过了巅峰期~The newspaper was past its peak but still respected.||peak-to-peak variation~峰间变化~The chart shows the peak-to-peak variation in daily traffic.`,
  advertise: `advertise directly to sb~直接向某群体做广告~Companies must not advertise tobacco directly to children.||advertise oneself as sth~把自己宣传为……~The platform advertises itself as a trusted news source.||an advertised price~广告标价~The final purchase price was higher than the advertised price.||advertise through social media~通过社交媒体宣传~Small brands often advertise through social media.`,
  boost: `boost demand / investment~提振需求／投资~The new policy boosted investment in affordable housing.||a confidence boost~信心提升~Positive feedback gave the young journalist a confidence boost.||boost a signal~增强信号~Engineers installed equipment to boost the broadcast signal.||boost sth by a percentage~使……提高某一百分比~The campaign boosted online sales by twenty percent.`,
  psychology: `the psychology of persuasion~说服心理学~The course explores the psychology of persuasion in advertising.||psychological pressure~心理压力~Journalists often face psychological pressure during a crisis.||apply psychological principles~运用心理学原理~Advertisers apply psychological principles to make slogans memorable.||group psychology~群体心理~Group psychology can explain why false claims spread rapidly.`,
  purchase: `purchase sth online / in advance~网上／提前购买……~Viewers could purchase the advertised product online.||a compulsory purchase order~强制购买令~The council issued a compulsory purchase order for the land.||purchase intention~购买意向~The survey measured how slogans affected purchase intention.||purchase at one's own risk~自行承担风险购买~Consumers who ignore the warning purchase the product at their own risk.`,
  memorable: `make a memorable impression~留下难忘印象~The ambassador made a memorable impression during the live interview.||a memorable line / image~令人难忘的台词／画面~The advertisement ended with a memorable image of the brand.||memorable for the wrong reasons~因负面原因令人难忘~The campaign was memorable for the wrong reasons.||instantly memorable~让人一下子记住的~A short rhythm can make a slogan instantly memorable.`,
  slogan: `a slogan associated with sth~与……相关的口号~The slogan became closely associated with the environmental campaign.||slogan writing~标语创作~Slogan writing requires both brevity and accuracy.||under the slogan ...~以……为口号~The charity launched its appeal under the slogan “Homes for All”.||an empty slogan~空洞口号~Without concrete action, the promise is merely an empty slogan.`,
  teapot: `a pot of tea~一壶茶~The host placed a pot of tea beside the silver teapot.||brew tea in a teapot~在茶壶中泡茶~For the advertisement, the actor brewed tea in a traditional teapot.||the spout of a teapot~茶壶嘴~Steam rose from the spout of the teapot.||not one's cup of tea~非某人所好（由 tea 延伸）~Television advertising is not every journalist's cup of tea.`,
  brand: `brand recognition~品牌认知度~The memorable slogan increased brand recognition.||brand positioning~品牌定位~The company changed its brand positioning to attract younger consumers.||brand sb as sth~给某人贴上……的标签~One false report unfairly branded the witness as dishonest.||a household brand / name~家喻户晓的品牌／名字~The small business soon became a household brand.`,
  ambassador: `ambassador-at-large~无任所大使~The ambassador-at-large spoke on behalf of the country.||an ambassadorial role~大使职责；形象代表作用~The athlete accepted an ambassadorial role for the charity.||recall an ambassador~召回大使~The government recalled its ambassador after the dispute.||ambassador to a court / country~驻某国大使~She served as ambassador to France for four years.`,
  placement: `strategic placement~策略性摆放~Strategic placement made the brand visible without interrupting the drama.||placement with a company~在公司的实习岗位~The scholarship includes a placement with a national newspaper.||secure a placement~获得实习／安置机会~Each student must secure a placement before graduation.||out-of-home placement~户外广告投放~The campaign used out-of-home placement near railway stations.`,
  rating: `rate sth highly~高度评价某物~Viewers rated the documentary highly for its accuracy.||ratings agency~评级机构~A ratings agency lowered the company's credit rating.||rating system / scale~评级制度／量表~The platform introduced a clearer rating system.||receive an age rating~获得年龄分级~The drama received an age rating before broadcast.`,
  sponsor: `title sponsor~冠名赞助商~The bank became the title sponsor of the journalism award.||sponsor legislation / a bill~发起法案（政治用语）~Three senators sponsored legislation on online advertising.||sponsorship deal~赞助协议~The channel signed a sponsorship deal with the brand.||sponsor content~赞助内容~The platform must clearly label sponsor-funded content.`,
  absorb: `absorb losses / costs~承担损失／成本~The publisher agreed to absorb the cost of replacing the false edition.||be absorbed by / into sth~被并入／吸收进……~The small channel was absorbed into a larger media group.||absorb the impact~缓冲冲击~Soft material absorbs the impact during transport.||be completely absorbed in sth~完全专注于……~She was completely absorbed in checking the investigation notes.`,
  discount: `discount a possibility / theory~认为某可能性／理论不值得考虑~Investigators refused to discount the possibility of deliberate misinformation.||a discount off the list price~在标价基础上的折扣~Members receive a discount off the list price.||trade discount~商业折扣~The supplier offered the newspaper a trade discount.||sell at a deep discount~大幅折价出售~Old editions were sold at a deep discount.`,
  tailor: `tailor-made for sb / sth~为……量身定制的~The short video was tailor-made for a mobile audience.||tailor one's language to sb~针对某人调整语言~A skilled journalist tailors her language to the intended audience.||individually tailored advice~个性化建议~Members receive individually tailored purchasing advice.||tailor a campaign around sth~围绕……定制宣传活动~The agency tailored the campaign around one memorable slogan.`,
  'get across': `get across to sb that ...~让某人理解……~The report must get across to readers that the figures are estimates.||fail to get one's meaning across~未能把意思表达清楚~The advertisement failed to get its meaning across.||get across a complex idea simply~简明传达复杂观点~A good chart gets across a complex idea simply.||get oneself across~使别人理解自己~The nervous speaker struggled to get himself across.`,
  housing: `social housing~社会保障性住房~The council promised to build more social housing.||housing stock~住房存量~The fire damaged a significant part of the town's housing stock.||housing benefit~住房补贴~Low-income residents may qualify for housing benefit.||adequate housing~适足住房~Every citizen should have access to adequate housing.`,
  estate: `estate planning~遗产规划~The advertisement offered advice on estate planning.||administer an estate~管理遗产~A lawyer was appointed to administer the late sponsor's estate.||estate developer~地产开发商~The estate developer funded a new ambulance station.||industrial / retail estate~工业园／零售园区~The new broadcast centre stands on a former industrial estate.`,
  amuse: `amuse oneself by doing sth~以做某事自娱~The children amused themselves by inventing advertising slogans.||an amused smile / expression~被逗乐的微笑／表情~The false claim brought an amused smile to the editor's face.||amusingly enough~有趣的是~Amusingly enough, the least expensive advertisement received the highest rating.||more amused than offended~觉得好笑多于被冒犯~The ambassador was more amused than offended by the minor mistake.`,
  'brighten up': `brighten up at the news~听到消息后高兴起来~She brightened up at the news that her scholarship had been approved.||brighten sth up with colour~用颜色使……更明亮~The designer brightened the advertisement up with a clear yellow border.||brighten up considerably~明显转晴／振作~The weather brightened up considerably before the outdoor broadcast.||a brightening outlook~好转的前景~Lower housing costs suggest a brightening outlook for young families.`,
  'housing estate': `estate residents~住宅区居民~Estate residents asked the council for a faster ambulance service.||a high-rise housing estate~高层住宅区~The documentary follows families living on a high-rise housing estate.||a mixed-tenure housing estate~混合产权住宅区~The plan proposes a mixed-tenure housing estate near the station.||housing-estate regeneration~住宅区改造~The report charts twenty years of housing-estate regeneration.`,
};

// Each item contrasts meaning, syntactic position and a characteristic pattern.
const SYNONYMS = {
  critical: [`decisive~决定性的~The final interview proved decisive in her appointment.~可作定语或表语，常见 a decisive factor/moment；强调直接决定结果，不含“批评的、危急的”义。`,`analytical~善于分析的~She took an analytical approach to the conflicting reports.~多作前置定语或表语，常见 an analytical approach/mind；强调分析方法，不能替代 be critical of/to。`],
  trap: [`ensnare~诱捕；使陷入圈套~The advertisement was designed to ensnare careless buyers.~及物动词，宾语通常是人；比 trap 正式，常含欺骗意味，不作“夹子”名词。`,`corner~把……逼入困境~The evidence cornered the suspect into admitting the truth.~及物动词，常见 corner sb into doing sth；强调逼得无路可退，trap 范围更广。`],
  release: [`issue~正式发布；发行~The department issued a warning after the fire.~及物动词，常接 statement/report/warning；强调官方发出，不表示释放人或宣泄情绪。`,`discharge~释放；准许离开~The patient was discharged from hospital on Friday.~及物动词，常用 be discharged from hospital/duty；语域正式且对象受限。`],
  ambulance: [`paramedic vehicle~急救人员车辆~A paramedic vehicle reached the village first.~名词短语，作主语、宾语或定语；强调由急救人员使用，未必具备运送病人的完整设备。`,`air ambulance~空中救护机~An air ambulance flew the climber to a specialist hospital.~可数名词短语，常接 call/send/use；是 ambulance 的空中类型，不等同于普通 road ambulance。`],
  extend: [`lengthen~使变长；延长~The council lengthened the consultation period by two weeks.~及物或不及物，常接 road/skirt/period；强调长度或时间变长，不用于 extend a welcome/invitation。`,`broaden~拓宽；扩大范围~The editor broadened the investigation to include online platforms.~及物动词，常接 debate/appeal/scope；强调范围或内容变广。`],
  construction: [`erection~建造；竖立~The erection of the new tower began in spring.~不可数过程名词，常见 the erection of a building/monument；只指竖立建造，不指句子或观点的构成。`,`fabrication~制造；编造~The report was dismissed as a fabrication.~名词，可数时指编造物，常见 a complete fabrication；与 construction 的抽象“构建”义需按语境区分。`],
  dozen: [`twelve~十二~Exactly twelve witnesses signed the statement.~基数词直接修饰复数名词；dozen 前有具体数词时通常不加 -s、不接 of。`,`several~几个；若干~Several ambulances were already at the scene.~限定词置于复数名词前；数量通常少于 dozens of，语气也不强调成组的十二。`],
  minor: [`marginal~次要的；微小的~The revision produced only a marginal improvement.~可作定语或表语，常见 marginal difference/effect；强调处于边缘或幅度极小。`,`secondary~次要的；第二位的~Speed is secondary to accuracy in responsible journalism.~可作定语或表语，常用 be secondary to；强调优先级较低。`],
  bath: [`bathe~洗澡；给……洗澡~The nurse bathed the child's injured arm.~动词，可及物或不及物；bath 是可数名词，英式英语也可作动词。`,`wash~洗；清洗~She washed the child's hands before running a bath.~及物或不及物动词，常接 clothes/hands；强调清洁动作，不专指在浴缸中浸泡。`],
  scream: [`cry out~大声呼喊~The resident cried out when smoke entered the room.~不及物短语，常接 in pain/for help；不一定像 scream 那样尖锐。`,`screech~发出尖厉声~The brakes screeched as the ambulance stopped.~不及物或及物，主语可为人、鸟、轮胎；强调刺耳尖声。`],
  bark: [`roar~吼叫；咆哮~The officer roared an order above the noise.~可及物或不及物，常接 with laughter/at sb；声音比 bark 更响、更持续。`,`woof~狗的低沉吠声~The dog gave a single woof at the gate.~多作拟声名词或不及物动词；只用于狗叫，不含“厉声命令”或“树皮”义。`],
  choke: [`gag~作呕；噎住~The smoke made several residents gag.~通常不及物，也可 gag on sth；强调恶心反射，不一定完全无法呼吸。`,`clog~堵塞~Ash clogged the emergency exit.~及物或不及物，常接 drain/filter/road；仅对应 choke 的“堵塞”义。`],
  cigarette: [`tobacco~烟草；烟草制品~Tobacco advertising is restricted by law.~通常不可数名词，常作定语 tobacco industry/use；是材料或统称，不是一支香烟。`,`e-cigarette~电子烟~Many platforms restrict advertisements for e-cigarettes.~可数名词，常见 use/vape an e-cigarette；通过加热液体产生气溶胶，不是燃烧纸烟。`],
  carpet: [`mat~垫子；小块地垫~Wipe your shoes on the mat.~可数名词，常见 door/bath mat；尺寸小且通常可移动。`,`flooring~地板材料~The builder replaced the damaged flooring.~不可数集合名词，指木材、瓷砖、地毯等铺地材料的总称。`],
  automatic: [`automated~自动化的~The platform uses an automated checking system.~多作前置定语，强调由机器或软件控制的流程；automatic 还可指无意识反应。`,`spontaneous~自发的~The announcement produced spontaneous applause.~可作定语或表语，强调未经计划自然发生，不等于机械式 automatic。`],
  investigate: [`inquire into~调查；查究~The committee inquired into the handling of the complaint.~正式短语动词，不及物后接 into + 事项；常用于官方调查。`,`probe~深入探查~Reporters probed the source of the campaign funds.~及物或不及物，常接 allegation/cause 或 probe into；强调深入追问。`],
  'dozens of': [`a large number of~大量的~A large number of residents contacted the newsroom.~后接复数可数名词，谓语通常随该复数名词；比 dozens of 更中性正式。`,`a great many~许多~A great many questions remained unanswered.~直接修饰复数可数名词，不接 of；书面语色彩较强。`],
  journalist: [`editor~编辑~The editor checked the reporter's sources before publication.~可数名词，常作主语或定语；负责选编把关，不一定亲自采访报道。`,`columnist~专栏作家~The columnist writes weekly about local politics.~可数名词，常接 for + 媒体；主要发表固定专栏和观点。`],
  priority: [`urgency~紧迫性~The urgency of the rescue justified immediate action.~不可数名词，常见 a matter of urgency；强调时间紧迫，不等于优先次序。`,`precedence~优先次序~Safety takes precedence over speed.~不可数名词，固定结构 take precedence over；比 priority 正式。`],
  contradict: [`refute~驳倒~The figures refuted the claim that sales had doubled.~及物动词，宾语为 claim/argument；表示用证据证明错误，比 contradict 更强。`,`deny~否认~The sponsor denied hiding the payment.~及物动词，可接名词或 doing/that 从句；表示拒绝承认，不一定提供相反证据。`],
  factual: [`fact-based~基于事实的~The channel promised fact-based reporting.~通常作前置定语，常见 fact-based analysis/reporting；强调有事实依据。`,`documentary~纪实的~The programme combines documentary evidence with interviews.~多作前置定语，常见 documentary evidence/film；还可作名词“纪录片”。`],
  instance: [`occasion~场合；某次~On one occasion, the reporter corrected himself live.~可数名词，常见 on one occasion；突出某次发生的时间，不是抽象例证。`,`illustration~例证~This case provides a useful illustration of media bias.~可数名词，常接 of；强调用于解释观点的实例。`],
  differ: [`diverge~出现分歧；分叉~Their accounts diverged on one critical detail.~不及物动词，常接 on/over/from；比 differ 正式，暗示从共同点分开。`,`distinguish~区分~Readers must distinguish fact from opinion.~及物动词，常见 distinguish A from/between A and B；表示主动辨别，不是“彼此不同”。`],
  conclusion: [`finding~调查结果~The report's main finding was supported by new evidence.~可数名词，常用复数 findings；指研究调查所得结果，不一定是推理终点。`,`verdict~裁决；定论~The public's verdict on the campaign was negative.~可数名词，常见 reach/return a verdict；法律语境指陪审团裁决。`],
  false: [`misleading~误导性的~The advertisement made a misleading comparison.~作定语或表语，强调使人形成错误印象，不一定每个陈述本身为假。`,`counterfeit~伪造的；假冒的~Police seized counterfeit brand labels.~主要作前置定语，也可作名词/动词；常修饰 money/goods/document。`],
  minimum: [`minimal~极少的；最低程度的~The change had minimal impact on ratings.~只作形容词，常见 minimal effort/damage；表示少到几乎没有，不直接充当数值名词。`,`lowest~最低的~This channel recorded the lowest audience figure.~形容词最高级，前通常有 the，修饰具体可比较对象。`],
  maximum: [`upper limit~上限~The law sets an upper limit on advertising time.~可数名词短语，常见 set/exceed an upper limit；强调边界值。`,`optimal~最佳的~The team adjusted the signal for optimal performance.~形容词，通常作定语，表示最有利而非数值最大。`],
  sum: [`aggregate~总计；合计~The aggregate cost exceeded the original budget.~可作名词或形容词，书面正式，常见 aggregate amount/score。`,`figure~数额；数字~The final figure includes tax and delivery.~可数名词，常指统计数字或金额，不一定由加法得出。`],
  accurate: [`reliable~可靠的~The survey provides reliable information about viewing habits.~作定语或表语，强调值得信赖、结果稳定，不必达到数值精确。`,`faithful~忠实的~The drama is a faithful account of the historical event.~作定语或表语，常见 faithful account/copy；强调与原物一致。`],
  committed: [`loyal~忠诚的~The brand has a loyal group of customers.~作定语或表语，常接 loyal to；强调忠诚，不一定投入大量行动。`,`determined~下定决心的~She was determined to complete the investigation.~作表语常接 to do，亦可前置定语；强调意志，不用 determined to doing。`],
  discrimination: [`discernment~辨别力~Good editors show discernment when judging sources.~不可数名词，常见 show/exercise discernment；只表判断力，不表社会歧视。`,`bias~偏见；偏向~The report revealed bias against older applicants.~可数或不可数，常接 against/in favour of；可导致 discrimination，但不等同于具体歧视行为。`],
  'come about': [`arise~产生；出现~The problem arose from unclear advertising rules.~不及物动词，常接 from/out of；主语通常为 problem/question，不用被动。`,`take place~发生；举行~The meeting took place after the report was released.~不及物短语，不用被动；可用于计划事件，come about 更侧重形成过程。`],
  'for instance': [`namely~即；也就是~Two channels, namely radio and television, carried the warning.~副词用于具体说明前述内容，不是从多个可能中举一例。`,`to illustrate~举例说明~To illustrate, compare the two advertisements on this page.~句首话语标记，后接完整分句；语气比 for instance 更强调说明作用。`],
  'bring sth to light': [`disclose~披露~The company disclosed the sponsorship in its annual report.~及物动词，常接 information/details；正式且可指主动公开，不一定揭丑。`,`unearth~发掘；发现~Reporters unearthed documents that contradicted the official account.~及物动词，常接 evidence/document；强调艰难搜寻后发现。`],
  'be committed to': [`be bound to~一定会；有义务~The editor is bound to correct a factual error.~后接动词原形，表示必然或义务；不可与 be committed to doing 的“致力于”混用。`,`pledge oneself to~保证致力于~The channel pledged itself to protecting children's privacy.~及物结构，to 为介词，后接名词或 doing；比 be committed to 更强调公开承诺。`],
  curiosity: [`wonder~好奇；惊奇~The strange figure filled her with wonder.~多作不可数名词，常见 in wonder；强调惊奇感，curiosity 更强调求知欲。`,`interest~兴趣~The report aroused public interest in local politics.~可数或不可数，常接 in；范围比 curiosity 广，未必促使主动探究。`],
  journalism: [`news media~新闻媒体~The news media reported the investigation widely.~集合名词短语，可作主语；指机构和渠道，journalism 指职业、实践或作品。`,`reportage~新闻报道~The book combines reportage with personal reflection.~不可数名词，正式，强调报道作品或写法。`],
  commitment: [`obligation~义务~The sponsor has a legal obligation to disclose the payment.~可数名词，常接 to do/to sb；强调责任约束，不一定出于自愿投入。`,`undertaking~正式承诺~The company gave a written undertaking to change the advertisement.~可数名词，常见 give an undertaking to do；比 promise 正式且可具法律效力。`],
  citizen: [`civilian~平民~The broadcast warned civilians to leave the area.~可数名词，也可作定语；与军人相对，不强调国籍或法律身份。`,`subject~臣民；国民~British subjects once had a different legal status from citizens.~可数名词，常接 of + 君主/国家；带君主制或法律历史色彩。`],
  found: [`launch~创办；推出~The publisher launched a new digital platform.~及物动词，常接 campaign/product/service；强调开始运作，不表示理论“建立在”某基础上。`,`institute~建立；制定~The channel instituted stricter fact-checking procedures.~及物动词，常接 system/reform/inquiry；正式，侧重建立制度或措施。`],
  politics: [`political science~政治学~She studied political science before becoming a journalist.~不可数、通常接单数谓语；专指学科，politics 还可指实际政治活动。`,`public affairs~公共事务~The channel broadcasts a weekly public-affairs programme.~复数名词短语，常作定语 public-affairs；涵盖政策与公共议题。`],
  accuse: [`allege~声称；指控~The report alleged that the company had hidden its sponsor.~及物动词，常接 that 从句或 allege wrongdoing；主语多为人或文件，不用 allege sb of。`,`condemn~谴责~The editor condemned the advertisement as dishonest.~及物动词，常见 condemn sth as/for；表达强烈道德批评，不是法律控告结构。`],
  tax: [`levy~征收；税款~The council levied a small charge on advertisers.~动词常见 levy a tax on；名词 levy 指征收额或征集，语域正式。`,`tariff~关税~The government reduced tariffs on imported equipment.~可数名词，常用复数 tariffs，专指进出口税或价目表。`],
  mount: [`escalate~升级；增加~Public concern escalated after the second report.~可及物或不及物，常接 crisis/tension/cost；强调程度升级，不表示登上或组织。`,`stage~组织；上演~The group staged a protest outside the station.~及物动词，常接 protest/event/show；对应 mount a campaign/exhibition 的组织义。`],
  elevation: [`altitude~海拔；高度~The helicopter struggled at high altitude.~不可数或可数，常见 at an altitude of；多指相对海平面的高度。`,`promotion~晋升~Her promotion to editor was announced on Monday.~可数或不可数，常接 to + 职位；只对应 elevation 的地位提升义。`],
  profession: [`vocation~职业；使命感~She regarded journalism as a vocation rather than a job.~可数名词，常见 a vocation for/as；强调天职和投入。`,`trade~行业；手艺~He learned the printing trade from his father.~可数或不可数，常见 learn/practise a trade；偏体力或技能行业。`],
  'mount up': [`snowball~迅速累积扩大~Small errors snowballed into a serious factual problem.~不及物动词，主语多为 cost/debt/problem；强调越滚越大。`,`add up~合计；逐渐累积~The repeated delays added up to a major loss.~不及物短语，常接 to + 总数/结果；还可表“讲得通”。`],
  drama: [`theatre~戏剧艺术；剧院~She studied theatre before working in television.~不可数时指戏剧艺术，可数时指剧院；drama 还指戏剧性事件。`,`spectacle~壮观场面；公开闹剧~The rescue became a media spectacle.~可数名词，常见 a public/media spectacle；强调供人观看的场面。`],
  scholarship: [`bursary~助学金~The university offers a bursary to students with financial need.~可数名词，常接 for/to；多依据经济需要，scholarship 常依据成绩。`,`academic learning~学术研究与学识~The article reflects years of academic learning.~不可数名词短语；对应 scholarship 的“学问”义，不表示奖学金。`],
  category: [`classification~分类；类别体系~The classification of advertisements depends on their purpose.~可数或不可数，常接 of；强调分类过程或体系。`,`genre~体裁；类型~The programme mixes the documentary and drama genres.~可数名词，主要用于文学、影视、艺术类型。`],
  nevertheless: [`yet~然而~The slogan was simple, yet it was memorable.~作并列连词连接两个分句，前常用逗号；也可作副词，位置较灵活。`,`despite that~尽管如此~The figures were incomplete; despite that, the report was published.~介词短语性质，后可独立指代前述事实；nevertheless 是连接副词。`],
  witness: [`spectator~观众；旁观者~Spectators watched the live broadcast from the platform.~可数名词，常接 at/of；指观看活动者，不一定亲历关键事件或作证。`,`testify~作证~The witness testified that the figures had been changed.~不及物动词常接 to/about/that；witness 可作名词或及物动词。`],
  edition: [`release~发行版本；发布~The digital release includes additional interviews.~可数名词，指发行物，常接 digital/latest；edition 强调经过编辑形成的特定版本。`,`impression~印次~The first impression sold out within a week.~出版术语中的可数名词，指同一版的一次印刷；edition 可包含多次印刷。`],
  platform: [`forum~论坛；讨论场所~The website provides a forum for public debate.~可数名词，常接 for；强调交流讨论，不指站台或政纲。`,`podium~讲台；领奖台~The ambassador stepped onto the podium.~可数名词，常接 stand on/step onto；比 platform 小，通常供一人站立。`],
  interaction: [`interplay~相互作用~The report examines the interplay between advertising and psychology.~不可数名词，常接 between/of；强调复杂相互影响。`,`engagement~参与；互动~The campaign achieved high audience engagement.~不可数名词，常见 audience/user engagement；强调主动参与程度。`],
  membership: [`affiliation~隶属关系~The journalist disclosed her political affiliation.~可数或不可数，常接 with/to；强调与组织的联系，不一定是正式会员资格。`,`enrolment~注册；注册人数~Course enrolment increased after the advertisement.~可数或不可数，常接 in/on；指课程、计划等注册。`],
  chart: [`table~表格~The table lists advertising costs by channel.~可数名词，信息按行列排列；chart 多为图形化呈现。`,`plot~绘图；标绘~The graph plots ratings against advertising spending.~动词常见 plot A against B；chart 还可表示长期记录或规划路线。`],
  broadcast: [`stream~在线流播~The channel streamed the debate live.~及物或不及物，常接 live/online；强调通过网络连续传输。`,`telecast~电视播送~The ceremony was telecast nationwide.~可作名词或动词，专指电视播出，语域较正式。`],
  'spring up': [`proliferate~激增；大量出现~False advertisements proliferated on unregulated platforms.~不及物动词，主语多为事物；正式，强调数量迅速增加。`,`crop up~意外出现~New problems kept cropping up during the investigation.~不及物短语，常见 problem/question crops up；更口语，常含不受欢迎意味。`],
  advertising: [`marketing~市场营销~The company increased its marketing budget.~不可数名词，范围包括产品、定价、渠道和推广；advertising 只是其中的广告活动。`,`promotion~推广；促销~The brand used online promotion to reach young buyers.~可数或不可数名词，常见 sales promotion；可包含折扣和公关。`],
  persuasion: [`coercion~强迫~Consent obtained through coercion is not genuine.~不可数名词，常见 through/by coercion；与 persuasion 的自愿被说服形成对比。`,`influence~影响力~The ambassador has considerable influence over young consumers.~不可数或可数，常接 over/on；不一定涉及有意识的说服过程。`],
  persuade: [`induce~诱使；促使~The discount induced customers to purchase more.~及物动词，常见 induce sb to do；较正式，可暗示利益刺激。`,`talk sb into~说服某人做……~She talked the editor into extending the deadline.~口语短语，接 doing；对应 persuade sb into doing。`],
  advertisement: [`advert~广告~The newspaper printed a full-page advert.~可数名词，英式非正式缩略语，常接 for；与 advertisement 含义相同但语体较口语。`,`notice~启事；通知~The school placed a notice in the local paper.~可数名词，强调告知信息，不一定用于商业促销。`],
  channel: [`avenue~途径~The scholarship opened a new avenue for young journalists.~可数名词，常见 an avenue for/of；比 channel 更抽象。`,`conduit~渠道；导管~The platform became a conduit for false information.~可数名词，常接 for；正式，强调传递某物的通道。`],
  peak: [`climax~高潮~The drama reaches its climax in the final scene.~可数名词，常见 reach a climax；强调事件最激动或决定性的阶段。`,`crest~浪尖；顶峰~Demand reached a crest before falling sharply.~可数名词，也可作动词；常用于波峰，书面色彩较强。`],
  advertise: [`endorse~代言；公开支持~The ambassador endorsed the new product.~及物动词，主语通常为名人或机构；强调以信誉支持，不等同投放广告。`,`announce~宣布~The channel announced its new schedule.~及物动词，常接 plan/result/that 从句；以告知为主，不必带促销目的。`],
  boost: [`enhance~提升；增强~Clear charts enhance the report's credibility.~及物动词，常接 quality/reputation/ability；书面且强调改善品质。`,`stimulate~刺激；促进~The discount stimulated demand for the product.~及物动词，常接 growth/demand/economy；强调引发活动或增长。`],
  psychology: [`mindset~心态；思维模式~A critical mindset helps readers resist false claims.~可数名词，常见 growth/consumer mindset；指一套固定思维方式。`,`behavioural science~行为科学~Advertising draws heavily on behavioural science.~不可数学科名词，范围包含心理学、经济学等行为研究。`],
  purchase: [`procure~设法获得；采购~The hospital procured new ambulance equipment.~及物动词，正式，常接 equipment/supplies；强调获取过程，不一定普通购物。`,`order~订购~Customers can order the new edition online.~及物动词，常接 product/meal；表示下单，尚不必完成付款取得。`],
  memorable: [`notable~值得注意的~The edition contains several notable improvements.~作定语或表语，强调重要或突出，不一定让人难忘。`,`striking~醒目的~The advertisement uses a striking visual image.~作定语或表语，常见 striking contrast/image；强调立刻引人注意。`],
  slogan: [`tagline~广告标语；品牌短句~The advertisement ends with a witty tagline.~可数名词，常接 for；专指品牌或广告结尾短句。`,`mantra~反复念叨的信条~“Accuracy first” became the editor's mantra.~可数名词，常见 become/repeat a mantra；强调反复坚持。`],
  teapot: [`tea urn~大茶桶；热水茶饮器~A tea urn served guests at the large event.~可数名词，用于大量供应热饮；容量大于家用 teapot。`,`tea infuser~泡茶器~She placed a tea infuser inside the glass pot.~可数名词，盛放茶叶并浸入水中；它是泡茶工具，不是盛装和倾倒茶水的壶。`],
  brand: [`trademark~商标~The logo is a registered trademark.~可数名词，常见 register/protect a trademark；指受法律保护的标识。`,`reputation~声誉~False advertising damaged the company's reputation.~可数或不可数，常接 for；是公众评价，不等于品牌本身。`],
  ambassador: [`envoy~使节~A special envoy attended the negotiations.~可数名词，常接 to/for；多为某项任务临时派遣。`,`delegate~代表~Each member sent a delegate to the conference.~可数名词，常接 to；代表组织参会，政治级别低于 ambassador。`],
  placement: [`positioning~定位；放置~Careful product positioning increased its visibility.~不可数名词，常见 brand/product positioning；强调策略位置。`,`appointment~任命；职位安排~Her appointment as editor was announced today.~可数名词，常见 appointment as/to；强调正式任命，不是一般放置。`],
  rating: [`score~得分~The programme received a score of nine out of ten.~可数名词，常接 of/out of；表示具体数值，rating 可为等级或受众数据。`,`classification~分级~The film received an adult classification.~可数名词，常见 age/content classification；强调归入类别。`],
  sponsor: [`patron~资助人；赞助人~A wealthy patron funded the scholarship.~可数名词，常接 of；多长期支持艺术、慈善，不一定换取广告曝光。`,`underwrite~为……承担费用~The bank underwrote the cost of the broadcast.~及物动词，常接 cost/event/issue；正式，强调承担财务风险。`],
  absorb: [`assimilate~吸收并理解~Students need time to assimilate the new information.~及物动词，常接 information/ideas；强调纳入已有知识。`,`soak up~吸收；尽情吸取~The carpet soaked up water from the broken pipe.~可分短语动词，宾语可置中间；较口语，也可指吸收知识或气氛。`],
  discount: [`rebate~返款；退款优惠~Customers can claim a rebate after purchase.~可数名词，常见 receive/offer a rebate；通常先付款后返还，不是直接降价。`,`markdown~标价下调~The store applied a markdown to old editions.~可数名词，零售语境，强调标价降低。`],
  tailor: [`modify~修改~The editor modified the report for a younger audience.~及物动词，常接 plan/design/text；泛指改变，不一定为特定对象量身定制。`,`personalize~使个性化~The platform personalizes advertisements for each user.~及物动词，常接 service/content/message；强调个体差异。`],
  'get across': [`communicate~传达；沟通~The chart communicates the main finding clearly.~及物或不及物，常接 idea/message 或 communicate with；语体中性。`,`articulate~清楚表达~She articulated her concerns during the interview.~及物动词，常接 view/concern/idea；正式，强调表达清晰有条理。`],
  housing: [`lodging~临时住处~The sponsor provided temporary lodging for the journalist.~不可数名词或复数 lodgings，常指短期租住；housing 更广且常用于公共政策。`,`residence~住所；居住~Applicants must provide proof of residence.~可数或不可数名词，正式，指居住地或居住状态。`],
  estate: [`landholding~土地持有；地产~The family's landholding was divided after his death.~可数名词，强调拥有的一片土地。`,`development~开发区；新建项目~The new development includes affordable housing.~可数名词，常见 housing/property development；强调新建项目。`],
  amuse: [`delight~使高兴~The children's slogans delighted the audience.~及物动词，宾语为人，语气比 amuse 更强、更积极。`,`distract~使分心；消遣~Games distracted the children during the long wait.~及物动词，常见 distract sb from sth；重点是转移注意力。`],
  'brighten up': [`lighten up~放松；别太严肃~The presenter lightened up after the difficult question.~不及物短语，多指人变轻松；也可及物 lighten sth up。`,`illuminate~照亮；阐明~The new evidence illuminated a hidden part of the case.~及物动词，正式，既可字面照亮也可抽象阐明。`],
  'housing estate': [`housing development~住宅开发区~A new housing development is planned near the station.~可数名词，尤常见于美式英语；强调开发建设项目。`,`residential neighbourhood~住宅街区~The fire occurred in a quiet residential neighbourhood.~可数名词，强调社区环境和邻里范围，不一定统一规划。`],
};

const MEANINGS = {
  journalism: [
    { partOfSpeech: 'n.', meaning: '新闻业；新闻职业（行业整体）', example: 'She hopes to pursue a career in journalism.' },
    { partOfSpeech: 'n.', meaning: '新闻报道与写作的实践', example: 'Responsible journalism separates verified fact from opinion.' },
    { partOfSpeech: 'n.', meaning: '新闻作品；报道材料（集合义）', example: 'The investigation is an outstanding piece of journalism.' },
  ],
  citizen: [
    { partOfSpeech: 'n.', meaning: '公民；依法享有某国权利的人', example: 'Every citizen has the right to accurate public information.' },
    { partOfSpeech: 'n.', meaning: '市民；某城市的居民', example: 'The mayor addressed the citizens of the city.' },
    { partOfSpeech: 'n.', meaning: '（某一群体或世界的）成员', example: 'Schools aim to prepare students to become responsible global citizens.' },
  ],
  accuse: [
    { partOfSpeech: 'vt.', meaning: '指责；谴责（accuse sb of doing）', example: 'Readers accused the channel of hiding its sponsor.' },
    { partOfSpeech: 'vt.', meaning: '控告；指控犯罪', example: 'He was accused of deliberately falsifying the records.' },
  ],
  scholarship: [
    { partOfSpeech: 'n.', meaning: '奖学金；助学金（可数）', example: 'She was awarded a scholarship to study journalism.' },
    { partOfSpeech: 'n.', meaning: '学术研究；学问（不可数）', example: 'The new edition reflects recent scholarship on media history.' },
  ],
  edition: [
    { partOfSpeech: 'n.', meaning: '书报刊的版次；版本', example: 'The revised edition contains a new chapter on advertising.' },
    { partOfSpeech: 'n.', meaning: '广播或电视节目的某一期', example: 'Tonight\'s edition of the programme examines housing policy.' },
  ],
  interaction: [
    { partOfSpeech: 'n.', meaning: '人与人之间的互动、交流', example: 'Face-to-face interaction helps new members build trust.' },
    { partOfSpeech: 'n.', meaning: '事物之间的相互作用、相互影响', example: 'The study examines the interaction between colour and memory.' },
  ],
  membership: [
    { partOfSpeech: 'n.', meaning: '会员资格；会员身份（不可数）', example: 'Annual membership gives users access to every edition.' },
    { partOfSpeech: 'n.', meaning: '全体会员（集合义）', example: 'The membership voted to change the advertising rules.' },
    { partOfSpeech: 'n.', meaning: '会员人数（可数统计义）', example: 'Club membership has risen by twenty percent.' },
  ],
  broadcast: [
    { partOfSpeech: 'n.', meaning: '广播、电视节目；一次播送', example: 'The live broadcast reached a national audience.' },
    { partOfSpeech: 'vt. & vi.', meaning: '广播；播送；通过无线或网络传播', example: 'The channel broadcast the warning live.' },
  ],
  advertising: [
    { partOfSpeech: 'n.', meaning: '广告活动；广告宣传（不可数）', example: 'The brand spends heavily on online advertising.' },
    { partOfSpeech: 'n.', meaning: '广告业（行业）', example: 'She has worked in advertising for ten years.' },
    { partOfSpeech: 'n.', meaning: '广告材料的总称', example: 'The magazine contains less advertising than its competitors.' },
  ],
  persuasion: [
    { partOfSpeech: 'n.', meaning: '说服、劝说的过程', example: 'After considerable persuasion, the witness agreed to speak.' },
    { partOfSpeech: 'n.', meaning: '说服力；劝说能力', example: 'The ambassador used her powers of persuasion effectively.' },
  ],
  persuade: [
    { partOfSpeech: 'vt.', meaning: '说服某人采取行动（persuade sb to do）', example: 'The campaign persuaded viewers to check the source.' },
    { partOfSpeech: 'vt.', meaning: '使某人相信某事（persuade sb that/of）', example: 'The evidence persuaded the editor that a correction was necessary.' },
  ],
  advertise: [
    { partOfSpeech: 'vt. & vi.', meaning: '为商品或服务做广告', example: 'The brand advertises its products on social media.' },
    { partOfSpeech: 'vt.', meaning: '宣传；使广为人知', example: 'The bright packaging advertises the product from a distance.' },
    { partOfSpeech: 'vi.', meaning: '登广告征聘或求购（advertise for）', example: 'The newspaper advertised for an experienced journalist.' },
  ],
  psychology: [
    { partOfSpeech: 'n.', meaning: '心理学（学科，不可数）', example: 'She studied psychology before entering advertising.' },
    { partOfSpeech: 'n.', meaning: '某人或群体的心理特点', example: 'The slogan appeals to the psychology of young consumers.' },
    { partOfSpeech: 'n.', meaning: '某情境背后的心理机制', example: 'The documentary explains the psychology behind mass persuasion.' },
  ],
  ambassador: [
    { partOfSpeech: 'n.', meaning: '大使；国家正式外交代表', example: 'The ambassador presented her credentials to the president.' },
    { partOfSpeech: 'n.', meaning: '形象大使；某组织或事业的代表人物', example: 'The athlete serves as a brand ambassador.' },
  ],
  placement: [
    { partOfSpeech: 'n.', meaning: '放置、安排的位置或行为', example: 'Careful product placement made the brand clearly visible.' },
    { partOfSpeech: 'n.', meaning: '实习岗位；实习安排', example: 'The course includes a six-month journalism placement.' },
  ],
  rating: [
    { partOfSpeech: 'n.', meaning: '等级、评级；评价结果', example: 'The programme received a five-star rating.' },
    { partOfSpeech: 'n.', meaning: 'the ratings：广播电视的收视率、收听率', example: 'The drama rose to the top of the ratings.' },
  ],
  tailor: [
    { partOfSpeech: 'vt.', meaning: '专门制作；量身定制衣物', example: 'The suit was tailored for the ambassador.' },
    { partOfSpeech: 'vt.', meaning: '调整内容使适合特定对象', example: 'The message was tailored to a younger audience.' },
    { partOfSpeech: 'n.', meaning: '裁缝', example: 'The tailor adjusted the jacket by hand.' },
  ],
  'get across': [
    { partOfSpeech: 'phr. v.', meaning: '把意思、信息讲清楚（及物，可分）', example: 'The chart gets the main point across quickly.' },
    { partOfSpeech: 'phr. v.', meaning: '被理解、被传达（不及物）', example: 'Her concern did not get across during the short interview.' },
  ],
  housing: [
    { partOfSpeech: 'n.', meaning: '住房；住房供给（不可数集合义）', example: 'The city urgently needs more affordable housing.' },
    { partOfSpeech: 'n.', meaning: '机器或设备的外壳、套', example: 'The camera\'s protective housing absorbed the impact.' },
  ],
  estate: [
    { partOfSpeech: 'n.', meaning: '庄园；大片私有土地', example: 'The interview was filmed on a country estate.' },
    { partOfSpeech: 'n.', meaning: '为特定用途规划的区域、园区', example: 'The channel moved to a new industrial estate.' },
    { partOfSpeech: 'n.', meaning: '某人去世后留下的全部财产、遗产', example: 'The scholarship was funded from her estate.' },
  ],
  amuse: [
    { partOfSpeech: 'vt.', meaning: '逗笑；使觉得有趣', example: 'The clever slogan amused the audience.' },
    { partOfSpeech: 'vt.', meaning: '给……提供消遣；使快乐', example: 'Games amused the children while they waited.' },
  ],
  'brighten up': [
    { partOfSpeech: 'phr. v.', meaning: '（使房间、颜色等）变明亮或增色', example: 'A yellow border brightened up the advertisement.' },
    { partOfSpeech: 'phr. v.', meaning: '（使人）高兴起来、振作起来', example: 'She brightened up when the scholarship was confirmed.' },
    { partOfSpeech: 'phr. v.', meaning: '（天气）转晴', example: 'The weather brightened up before the outdoor broadcast.' },
  ],
};

// Per-word natural continuations. POS clauses expand one lexical fact instead of
// joining collocation examples; upgrade continuations preserve each short pair's facts.
const NATURAL_EXPANSIONS = {
  critical: { p: ['because a single unsupported claim could mislead thousands of readers within minutes', 'when flames reached the only stairwell connecting the upper floors to safety', 'which has forced rural hospitals to share specialists and delay non-urgent treatment'], u: ['The decision affects every department, so a careless choice would delay the entire project and waste months of preparation.', 'Students use the same three questions to test the source, evidence, and purpose of every article before accepting its conclusion.'] },
  trap: { p: ['because the ventilation system stopped carrying dangerous fumes away from the residents', 'after investigators discovered that the emergency door had been locked from the outside', 'before the false claim could be shared with another group of inexperienced buyers'], u: ['Firefighters faced the same smoke-filled corridor and had only one safe route to reach the residents waiting above.', 'Both residents remained beside the same blocked stairwell until a rescue team opened an alternative exit from below.'] },
  release: { p: ['so that residents could distinguish confirmed facts from rumours circulating on social media', 'after the judge concluded that he posed no immediate risk to the continuing investigation', 'by presenting documents that proved the detention order had been issued in error'], u: ['The figures covered the same twenty-four-hour period and came from the emergency service that had recorded every hospital transfer.', 'Officials checked the same statistics twice before making them available to journalists and members of the public.'] },
  ambulance: { p: ['because the mountain road was blocked and the patient needed specialist treatment within an hour', 'after residents complained that some villages waited more than forty minutes for emergency care', 'even when heavy traffic makes an ordinary journey slow and inconvenient'], u: ['The vehicle carried the same injured passenger directly to the nearest hospital while paramedics monitored his breathing throughout the journey.', 'The injured passenger used the same emergency transport and reached the same hospital without any change in route or treatment.'] },
  extend: { p: ['after the fire damaged their homes and left them without basic supplies for several weeks', 'as witnesses from different departments produced records that required separate checks', 'because one final interview could clarify the contradiction in the published account'], u: ['The committee kept the same deadline but moved it fourteen days later so that every witness could submit a complete statement.', 'The road followed the same planned route, but engineers added two kilometres to connect the isolated village with the main highway.'] },
  construction: { p: ['because each conclusion must follow logically from facts that the reader can verify', 'especially when several subordinate clauses compete for the reader’s attention', 'but stricter lending rules later prevented developers from building beyond actual demand'], u: ['The same workers are building the same bridge at the same site, using the schedule approved by the local authority last spring.', 'The bridge remains the same public project, and the additional phrase simply states that builders are still working on it now.'] },
  dozen: { p: ['although the police had originally expected more than thirty people to provide useful evidence', 'so that two editors could verify names and telephone numbers without mixing the records', 'because the late hour and heavy rain prevented several families from travelling across town'], u: ['The baker packed exactly twelve rolls in the same box and charged the customer the price shown beside the bread counter.', 'The newsroom received exactly twelve complaints about the same headline during the first hour after publication.'] },
  minor: { p: ['before choosing investigative reporting as the subject of her postgraduate research', 'while completing the practical training required for a career in newspaper production', 'because fresh evidence resolved the delay without changing the investigation’s central conclusion'], u: ['The injury affected the same player’s ankle, required only simple treatment, and did not prevent her from finishing the match.', 'The factual error concerned the same date, left the article’s main conclusion unchanged, and was corrected before the evening edition.'] },
  bath: { p: ['after the heating failed and the child had spent several hours in a cold emergency shelter', 'while checking the water temperature carefully to avoid causing pain around the wound', 'because both products had been recalled after laboratory tests revealed an unsafe chemical'], u: ['She used the same warm water and remained in the tub for twenty minutes to relax after completing the night shift.', 'The nurse used the same basin of warm water to wash the same injured child before applying a clean dressing.'] },
  scream: { p: ['yet the thick concrete walls prevented anyone on the street from hearing their calls', 'and the sudden sound led a neighbour to call the emergency services immediately', 'although the presenter continued speaking calmly and did not respond to the personal attack'], u: ['The same resident used the same desperate voice to ask rescuers outside the building to come quickly.', 'The witness reacted to the same sudden explosion with the same fear, but the stronger verb makes the sound more vivid.'] },
  bark: { p: ['because falling glass made the entrance dangerous even for trained rescue workers', 'after laboratory tests showed that several mature trees could not recover from the intense heat', 'although the recording later proved that the animal had remained quiet throughout the incident'], u: ['The same dog produced the same loud warning sound at the gate when the unfamiliar visitor approached the house after dark.', 'The same officer delivered the same command in a short harsh voice so everyone near the unsafe entrance stopped immediately.'] },
  choke: { p: ['before firefighters fitted them with masks and guided them towards the emergency stairs', 'until police created a clear lane for ambulances and other rescue vehicles', 'because she wanted to finish the interview without losing control of her voice'], u: ['The same piece of food blocked the child’s throat at dinner, and an adult responded immediately with first aid.', 'The same smoke affected the same residents’ breathing while they were moving through the corridor towards the marked exit.'] },
  cigarette: { p: ['and investigators photographed it before moving any object that might explain the fire', 'during a routine inspection of luggage arriving from a country with lower tobacco taxes', 'because public-health officials found that repeated exposure increased the risk of later smoking'], u: ['The same cigarette remained burning in the same room after the occupant left, creating the fire risk described in the report.', 'The same smoker used the same match to ignite the cigarette outside the building where smoking was permitted.'] },
  carpet: { p: ['after water, ash, and repeated foot traffic damaged the fibres during the rescue operation', 'creating an image that conveyed the scale of destruction without showing injured residents', 'because the published correction revealed that he had ignored repeated warnings from fact-checkers'], u: ['The same floor remained covered by the same fitted material, but the stronger noun identifies it directly and economically.', 'The same layer of autumn leaves covered the same path from end to end after the overnight storm.'] },
  automatic: { p: ['so customers must actively change the setting if they do not want another annual charge', 'even when the photograph has been edited or removed from its original context', 'because the earlier victory has already satisfied every formal condition for participation'], u: ['The same doors open by themselves whenever the same sensor detects someone approaching the hospital entrance.', 'The same response occurs without conscious thought whenever the alarm creates the familiar sound used in emergency drills.'] },
  investigate: { p: ['after maintenance records suggested that managers had ignored repeated warnings about the wiring', 'instead of repeating accusations from an unnamed source as if they were established facts', 'and publish a correction if the new documents disprove the paper’s earlier conclusion'], u: ['The same team examines the same accident to establish its cause before officials decide whether safety rules were broken.', 'The same officers look carefully into the same complaint and record every interview before reaching a conclusion.'] },
  'dozens of': { p: ['and editors grouped them by topic before deciding which concerns required a public response', 'although only a small number had the medical training needed inside the damaged building', 'ranging from brief product announcements to complex political campaigns with several sponsors'], u: ['The same crowd contained many separate individuals, but the revised phrase gives a more concrete sense of their number.', 'The same newsroom received the same large number of messages during the hour following the live emergency broadcast.'] },
  journalist: { p: ['because permanent employees have continuing access to editors, archives, and legal advice', 'while respecting local safety rules and protecting interviewees who feared official punishment', 'and must avoid questioning people in ways that interfere with emergency treatment'], u: ['The same professional gathers the same verified information and presents it to the public through a responsible news organization.', 'She performs the same reporting work for the same newspaper, and the revised noun names her profession more precisely.'] },
  priority: { p: ['because inaccurate instructions could expose residents to immediate and avoidable danger', 'when limited staff must decide whether a rapid update or a detailed investigation matters more', 'while reporters and members of the public waited behind the safety barrier'], u: ['The same rescue team continues to protect life before property because that order guides every decision at the scene.', 'The same editor treats factual accuracy as the most important requirement before allowing any report to be published.'] },
  contradict: { p: ['showing that the event could not have occurred at the time he originally described', 'because the new totals were lower rather than higher in every category', 'so the committee postponed its conclusion until a specialist could explain the difference'], u: ['The same two witnesses give accounts of the same event that cannot both be true because their times and locations differ.', 'The same speaker states one claim and later states its direct opposite during the same recorded interview.'] },
  factual: { p: ['because it placed the wrong person at the scene and confused two separate emergency calls', 'instead of allowing the writer’s personal judgement to appear as established evidence', 'despite repeated questions designed to encourage speculation about who was responsible'], u: ['The same report gives information based entirely on verified facts, without adding the writer’s unsupported personal opinions.', 'The same account records only events that witnesses and official documents confirm, so readers can check every important detail.'] },
  instance: { p: ['after an automatic filter treated a quotation from the false claim as if it repeated that claim', 'because it acknowledged a mistake, explained its cause, and gave readers the verified information', 'after the judge ruled that the available statement did not establish a legal case'], u: ['The same example concerns one reporter who corrected an error publicly after checking the original source again.', 'The same particular case illustrates how an apparently minor mistake can influence thousands of readers.'] },
  differ: { p: ['so investigators checked the video record rather than choosing the more confident speaker', 'because publication may inform the public but also cause unnecessary harm to victims', 'especially when younger users receive personalized messages through a mobile application'], u: ['The same two reports present different totals for the same period even though both claim to use official records.', 'The same editor and reporter hold different opinions about the same headline but continue discussing it respectfully.'] },
  conclusion: { p: ['because several undecided voters changed their minds only after the final public debate', 'after both sides accepted the final wording and completed the required legal review', 'once investigators connected the anonymous payment with the sponsor named in the contract'], u: ['The same reader reaches the same judgement only after comparing the evidence in three independent reports.', 'The same investigation ends with the same finding after every witness statement and financial record has been checked.'] },
  false: { p: ['even though the publisher removed the post and apologized before the end of the day', 'after investigators proved that the comparison omitted the product’s actual price and limitations', 'because his gestures and tone did not match the regret expressed in his carefully written words'], u: ['The same story contains information that is not true, and the revised adjective identifies that factual problem directly.', 'The same alarm reports a danger that does not exist, although residents still follow the emergency procedure until officials confirm it.'] },
  minimum: { p: ['even when competition for attention encourages reporters to publish before every claim is checked', 'before the application can move to the detailed review conducted by an independent committee', 'while correcting the dangerous rumour before it caused confusion among nearby residents'], u: ['The same applicant must be at least eighteen years old on the closing date to satisfy the stated age rule.', 'The same newsroom keeps unnecessary delay as low as possible while still checking every figure before publication.'] },
  maximum: { p: ['so wealthy companies cannot dominate every available space during an election campaign', 'after managers reassigned technical staff and simplified the process for urgent reports', 'and the regulator required the manufacturer to remove it from sale immediately'], u: ['The same hall can legally hold no more than five hundred people under the fire-safety certificate displayed at the entrance.', 'The same team uses every available hour effectively to complete the investigation before the agreed deadline.'] },
  sum: { p: ['after the organizer added several smaller contributions from local businesses and private citizens', 'even though the publisher had originally requested a much smaller contribution', 'because most viewers remembered the dramatic wording but not the evidence presented later'], u: ['The same sponsor provides the same large amount of money to fund the scholarship for three complete academic years.', 'The same final total comes from adding the same four payments recorded in the financial statement.'] },
  accurate: { p: ['which allows another laboratory to repeat the calculation and obtain the same result', 'because rankings measure popularity rather than the full artistic or educational value of a programme', 'including the date, source, correction status, and editor responsible for the final decision'], u: ['The same figures match the official records exactly for the same period and contain no calculation or transcription error.', 'The same description presents the building’s location, condition, and damage exactly as investigators recorded them at the scene.'] },
  committed: { p: ['because every editor accepts personal responsibility for correcting errors rather than hiding them', 'instead of relying only on cheaper summaries produced by outside agencies', 'and promised to report its progress publicly at the end of each month'], u: ['The same teacher gives the same students sustained time, care, and attention throughout the difficult school year.', 'The same journalist remains devoted to checking facts carefully even when competitors publish unverified claims first.'] },
  discrimination: { p: ['because headlines that look professional can still rest on weak or selective evidence', 'when interview questions and promotion decisions repeatedly disadvantage the same group', 'although the employer described the rule as a neutral part of its placement process'], u: ['The same reader carefully separates reliable reports from misleading ones by checking sources, evidence, and internal consistency.', 'The same policy treats applicants differently because of age, even when their qualifications and experience are otherwise equal.'] },
  'come about': { p: ['when an independent investigation persuaded officials to replace the original rule', 'instead of presenting the present shortage as an isolated or unavoidable event', 'and therefore cannot be explained by a single announcement made on one particular day'], u: ['The same change happened gradually after residents, reporters, and officials discussed the evidence over several months.', 'The same situation developed from the same chain of decisions rather than from one sudden and unexplained event.'] },
  'for instance': { p: ['before trusting an image merely because it has been shared by a familiar account', 'and the decision later became a model for other live programmes', 'while a general claim would be too broad to show how the checking procedure works'], u: ['The same example shows one specific way in which a false headline can spread before anyone checks its source.', 'The writer uses the same particular case to support the broader claim about responsible journalism.'] },
  'bring sth to light': { p: ['that senior managers had concealed from employees, customers, and the independent regulator', 'and made the earlier official explanation impossible to defend', 'by confirming where the fire began and why the emergency alarm failed'], u: ['The same investigation reveals the same hidden financial arrangement and makes it available for public examination.', 'The same documents expose the same facts that company officials had deliberately kept from shareholders.'] },
  'be committed to': { p: ['even when publishing more slowly means losing attention to less careful competitors', 'rather than treating the promise as an attractive slogan with no practical effect', 'because neither public safety nor truthful reporting should be sacrificed for speed'], u: ['The same newspaper continues to devote its staff and resources to accurate reporting throughout the election campaign.', 'The same reporter remains dedicated to protecting confidential sources despite repeated pressure to reveal their identities.'] },
  curiosity: { p: ['and led her to compare the published chart with the organization’s original financial records', 'because public money and a possible conflict of interest were involved', 'despite a warning that the website might collect his personal information'], u: ['The same student wants to know why the figures changed and therefore asks the teacher to explain the calculation.', 'The same unusual photograph makes the same reporter eager to discover who created it and where it first appeared.'] },
  journalism: { p: ['because it states its social purpose instead of pretending to offer a neutral account', 'and requires reporters to disclose methods that readers may otherwise never see', 'after editors verified the records, protected vulnerable sources, and explained each important conclusion'], u: ['The same work informs citizens through verified reporting and remains essential to a society in which public decisions depend on evidence.', 'The same professional practice checks facts rigorously before publication and corrects significant errors openly when reliable new evidence appears.'] },
  commitment: { p: ['after an independent review confirmed that the original campaign had misled young users', 'so the promised funding cannot be withdrawn merely because market conditions change', 'and had to reduce other spending before signing the new sponsorship agreement'], u: ['The same organization formally promises to protect its users and assigns staff and money to fulfil that promise.', 'The same editor devotes the same time and energy to checking every source throughout the six-month investigation.'] },
  citizen: { p: ['and may therefore vote, work, and receive public services in either country', 'especially when government decisions affect health, housing, taxation, or personal safety', 'because her reporting connects local events with responsibilities shared across national borders'], u: ['The same person has the same legal membership of the country and enjoys the rights granted by its laws.', 'The same city resident takes part in the local meeting and raises a question about affordable housing.'] },
  found: { p: ['rather than on an attractive story that no independent source can confirm', 'and published its first digital edition before opening a permanent office', 'after helping to write the professional standards that still guide the organization'], u: ['The same school was established by the same group of local teachers to serve children in the surrounding villages.', 'The same conclusion rests on the same verified facts collected during the independent investigation.'] },
  politics: { p: ['including the dispute over land ownership and the promised number of affordable homes', 'while continuing to report accurately on decisions made by elected officials', 'instead of presenting campaign promises as if they were already adopted government decisions'], u: ['The same student studies how governments, elections, and public power operate rather than taking part in a political campaign.', 'The same reporter chooses not to enter political life and continues covering public affairs as an independent journalist.'] },
  accuse: { p: ['and later refused to correct the allegation after the original document proved it wrong', 'while financial records and witness statements directly supported the charge', 'after the second set of figures also failed to match the audited accounts'], u: ['The same customer says the same company acted dishonestly and identifies the misleading statement in the advertisement.', 'The same prosecutor charges the same official with hiding public records during the investigation.'] },
  tax: { p: ['after health experts showed that promotion increased cigarette use among teenagers', 'but independent publishers warned that it could reduce local reporting', 'because staff had to review thousands of documents within a short legal deadline'], u: ['The same government collects the same percentage of income under the tax rule approved by parliament last year.', 'The same investigation places a heavy demand on the same newsroom’s limited staff, time, and financial resources.'] },
  mount: { p: ['as three independent studies reported the same pattern among younger consumers', 'before giving a carefully prepared statement about the international agreement', 'after the first explanation failed to answer questions raised by the released documents'], u: ['The same debts continue to increase each month because the family’s income remains below its essential expenses.', 'The same organization plans and carries out the same public campaign to improve safety around schools.'] },
  elevation: { p: ['because the new role gives her authority over every national news operation', 'so readers could compare entrances, windows, and emergency exits on each side', 'before deciding whether the helicopter could cross the mountain safely'], u: ['The same village stands at the same measured height above sea level, where winter weather often blocks the road.', 'The same editor moves to the same senior position after years of responsible reporting and staff leadership.'] },
  profession: { p: ['and every serious breach of accuracy weakens the trust on which that work depends', 'rather than treating accuracy as a personal preference that changes under commercial pressure', 'although the documents released later left many readers unconvinced'], u: ['The same person works as a doctor and completed the specialist training required for that occupation.', 'The same graduate enters journalism as a long-term career requiring professional knowledge, judgement, and ethical responsibility.'] },
  'mount up': { p: ['after labour, transport, and material prices all rose during the delayed project', 'until public criticism forced managers to establish a proper response system', 'but the sponsor refused to increase the amount promised in the original agreement'], u: ['The same unpaid bills gradually accumulate over several months and eventually exceed the family’s available income.', 'The same body of evidence steadily increases as investigators obtain more documents and interview additional witnesses.'] },
  drama: { p: ['and attracted viewers who wanted both historical detail and continuing characters', 'who checked the production’s language, structure, acting, and interpretation of the original play', 'instead of reporting the disagreement accurately and allowing the two sides to respond'], u: ['The same television programme tells the same fictional story through actors, dialogue, and a sequence of connected scenes.', 'The same real event becomes tense and exciting when the final witness enters the room with unexpected evidence.'] },
  scholarship: { p: ['because new archives and digital methods have challenged conclusions accepted for decades', 'after a committee compared her academic record, public service, and proposed research', 'and gains practical experience while receiving financial support for tuition'], u: ['The same student receives the same financial award to study journalism after meeting the academic requirements.', 'The same article demonstrates serious academic learning through careful use of archives and recent research.'] },
  category: { p: ['because interactive investigations did not fit the existing divisions for print and broadcast work', 'since it treats a personal judgement as if it belonged to the class of verifiable facts', 'so researchers can search, compare, and update thousands of records consistently'], u: ['The same three reports belong to the same clearly defined group because they share purpose, format, and audience.', 'The same organizer divides the entries into the same five classes before judges compare work within each group.'] },
  nevertheless: { p: ['because the available evidence still supported a limited but defensible finding', 'since it showed that the newsroom was willing to acknowledge and repair a mistake', 'although legal advisers and senior editors had warned her about the personal risk'], u: ['The same report remains useful despite its limited sample because its method and evidence are explained clearly.', 'The same reporter continues the same investigation despite threats, financial pressure, and repeated refusals to answer questions.'] },
  witness: { p: ['and confirmed that each person had signed voluntarily in the presence of the others', 'using straightforward language to explain why two apparently similar bars represented different totals', 'because she stood beside the original account when the misleading post appeared'], u: ['The same reporter personally sees the same event and records what happened without relying on another person’s description.', 'The same person gives evidence about the same accident after observing it directly from the station platform.'] },
  edition: { p: ['to determine whether shortening the chapters had removed evidence essential to the author’s argument', 'with additional context, source links, and corrections added before the morning publication deadline', 'because demand for the documented investigation remained strong after the first printing sold out'], u: ['The same book appears in the same revised version with updated figures and a new introduction from the editor.', 'The same news programme presents its evening issue at the usual time with reports updated during the afternoon.'] },
  platform: { p: ['while waiting for the delayed train that would take them away from the city', 'and promised stricter rules for political advertising on large social networks', 'when research showed that repeated exposure alone could make an unsupported claim appear familiar'], u: ['The same website gives the same group of journalists an online space to publish investigations and interact with readers.', 'The same candidate presents the same set of political policies as the official programme for the election campaign.'] },
  interaction: { p: ['which means the effect of one factor changes according to the level of the other', 'instead of rewarding brief automatic reactions that add little to public discussion', 'and gradually learn which emotional appeals are intended to influence their choices'], u: ['The same two groups communicate directly and respond to each other’s questions during the public meeting.', 'The same two forces influence one another throughout the process and cannot be understood separately.'] },
  membership: { p: ['after a successful recruitment campaign reached students at every regional university', 'and the service remains available until the final day of the paid period', 'before the association changed its rules and reduced the annual fee'], u: ['The same applicant receives formal membership of the same club after paying the fee and accepting its rules.', 'The same association now has more members than it did last year because students joined after the campaign.'] },
  chart: { p: ['by linking each recommendation to the evidence and practical step required for implementation', 'from its early regional experiments to its later influence on national politics', 'after viewers shared clips from the programme across several major platforms'], u: ['The same graph displays the same monthly figures visually so readers can compare rises and falls at a glance.', 'The same team records the same project’s progress over twelve months and marks each critical stage on a timeline.'] },
  broadcast: { p: ['because the main studio had lost power during the severe overnight storm', 'and repeated it every fifteen minutes until the damaged bridge was closed', 'while producers supply verified information through an earpiece during a changing emergency'], u: ['The same channel sends the same programme to a national audience live at eight o’clock in the evening.', 'The same warning is transmitted by radio and television so residents without internet access receive it quickly.'] },
  'spring up': { p: ['after the new station made commuting faster and increased demand for nearby homes', 'once small brands began seeking specialists who understood digital consumer behaviour', 'until regulators introduced clear penalties and required platforms to check sponsors'], u: ['The same small businesses appear rapidly across the same neighbourhood after the new station opens.', 'The same websites emerge in large numbers when public demand creates an opportunity for a new service.'] },
  advertising: { p: ['and may exclude users whose recent behaviour does not match the selected profile', 'because health claims must be supported and important limitations cannot be hidden', 'where its size and position attracted attention without interrupting the news text'], u: ['The same company pays to present the same product to potential customers through several online channels.', 'The same employee works in the industry that creates and places persuasive messages for brands.'] },
  persuasion: { p: ['after documentary evidence convinced her that the original conclusion could not be defended', 'because the appeal focused on shared responsibility rather than fear or personal advantage', 'when public messages concern health, safety, or other decisions with serious consequences'], u: ['The same speaker changes the same audience’s opinion through reasoned argument rather than force or deception.', 'The same editor needs careful encouragement before agreeing to publish the correction in a prominent position.'] },
  persuade: { p: ['and they accepted that the original advertisement had given consumers an incomplete impression', 'because familiarity and trust developed gradually through consistent evidence rather than one dramatic promise', 'whereas a responsible public notice should give people the facts needed for an independent decision'], u: ['The same campaign convinces the same viewers to check the source before sharing the dramatic headline with friends.', 'The same evidence makes the same editor believe that a visible correction is necessary before the next edition.'] },
  advertisement: { p: ['after investigators found that its promised medical benefit had no scientific support', 'but the remaining claim still explained the product’s actual purpose and price', 'because the ratings showed that many viewers changed channels before the programme returned'], u: ['The same company pays for the same public message to promote its product on television during the evening programme.', 'The same newspaper prints the same paid notice for the vacant reporting position in its Saturday edition.'] },
  channel: { p: ['so that local partners could document every payment and deliver support to families directly', 'because delivery costs and access to customers now depend heavily on digital services', 'instead of exposing confidential evidence through an ordinary personal account'], u: ['The same television station carries the same programme to viewers at the scheduled time every Friday evening.', 'The same official route carries information between the same two organizations without changing the message.'] },
  peak: { p: ['before declining as viewers moved to other channels during the advertisement break', 'when the largest number of viewers were watching the final episode of the drama', 'although its experienced journalists and specialist archives continued to influence younger competitors'], u: ['The same audience figure reaches its highest level during the final scene and falls immediately afterwards.', 'The same journalist reaches the most successful stage of her career after the investigation wins a national award.'] },
  advertise: { p: ['because the law recognizes their limited ability to judge persuasive health and lifestyle claims', 'although an independent review later found that many reports contained unchecked information', 'so consumers can compare the amount they actually pay with the claim made in the campaign'], u: ['The same company publicly promotes the same product through the same newspaper and online platform.', 'The same newspaper announces the same vacant position and invites qualified journalists to submit applications.'] },
  boost: { p: ['by reducing financial uncertainty and encouraging developers to begin delayed projects', 'after an editor praised the accuracy of her first independently researched article', 'following surveys that showed weak reception outside the centre of the city'], u: ['The same policy increases the same level of investment by reducing a specific cost faced by developers.', 'The same praise raises the same journalist’s confidence after she completes the difficult interview successfully.'] },
  psychology: { p: ['to explain why repeated exposure can make a familiar claim seem more trustworthy', 'especially when they must report distressing events and interview people who have suffered loss', 'although ethical rules should prevent those techniques from exploiting vulnerable consumers'], u: ['The same student studies the scientific field concerned with thought, emotion, and human behaviour.', 'The same campaign uses knowledge of consumer thinking to explain why a familiar slogan influences purchasing decisions.'] },
  purchase: { p: ['after comparing the full price, delivery charge, return policy, and independent customer ratings', 'because the planned railway could not proceed while ownership remained divided', 'rather than whether they remembered the slogan or recognized the brand'], u: ['The same customer buys the same product online and receives proof of payment by email.', 'The same hospital obtains the same emergency equipment from a local supplier under a formal agreement.'] },
  memorable: { p: ['because her concise answers connected personal experience with the organization’s public purpose', 'and viewers continued describing it accurately several weeks after the campaign ended', 'since the offensive joke damaged the brand more than any positive product claim helped it'], u: ['The same experience remains clear in the same student’s memory many years after the journalism course ends.', 'The same slogan is easy for the same audience to remember because its rhythm and image support the message.'] },
  slogan: { p: ['and appeared on posters, social posts, product packaging, and the campaign’s official website', 'because it combines the brand’s purpose with a brief phrase that consumers can repeat', 'unless the promised housing programme receives money, land, and a realistic construction schedule'], u: ['The same campaign uses the same short memorable phrase to express its central public message.', 'The same crowd repeatedly chants the same words to show support for the political demand.'] },
  teapot: { p: ['so guests could refill their cups without interrupting the recorded conversation', 'to produce the deep colour needed for the carefully staged advertising image', 'before the director asked the actor to pour the tea slowly towards the camera'], u: ['The same host uses the same pot to brew and serve tea to the guests during the interview.', 'The same ceramic container holds the same prepared tea, whereas the kettle only boils the water.'] },
  brand: { p: ['because the redesigned package and repeated slogan made the product easier to identify', 'after research showed that older customers associated it with an outdated market', 'and readers criticized the description before the paper published a complete correction'], u: ['The same consumers become more willing to buy the same product as they increasingly like its ambassador.', 'The same customers repeatedly purchase the same products because they trust the brand’s consistent quality and service.'] },
  ambassador: { p: ['and represented the government at meetings that did not require a resident diplomatic head', 'because the charity wanted a trusted public figure to explain its work to younger supporters', 'after negotiations failed and both governments issued sharply critical public statements'], u: ['The same diplomat officially represents the same country in France and reports to the foreign ministry.', 'The same athlete publicly represents the same charity and explains its purpose at schools and sporting events.'] },
  placement: { p: ['while allowing the drama’s characters and story to remain the main focus of each scene', 'and provides supervised reporting experience in addition to financial support for tuition', 'after her published work and interview demonstrated both accuracy and professional judgement'], u: ['The same producer places the same branded teapot in a visible position within the drama scene.', 'The same student completes the same six-month work experience with a newspaper as part of the course.'] },
  rating: { p: ['after several reviewers praised its evidence, structure, and careful treatment of interviewees', 'because an independent assessment found that the company faced a greater risk of default', 'so parents can decide whether the programme is suitable before children watch it'], u: ['The same programme receives the same high evaluation from viewers who completed the independent survey.', 'The same broadcast attracts the same large audience and therefore rises in the official weekly ratings.'] },
  sponsor: { p: ['and its name appeared beside the event title on every ticket, poster, and broadcast', 'after growing concern about political messages aimed at children through social platforms', 'so viewers understand who paid for the report and can judge any possible conflict of interest'], u: ['The same bank provides the same money for the journalism award and receives the agreed public recognition.', 'The same lawmakers formally support the same bill and accept responsibility for introducing it to parliament.'] },
  absorb: { p: ['rather than passing that unexpected expense to readers who had bought the inaccurate book', 'after both organizations concluded that shared technology would reduce operating costs', 'while its internal layers protect the product from damage during delivery'], u: ['Simon remains focused on the same book and therefore does not notice the same person enter the room.', 'Simon’s complete concentration on the same book causes him to miss both the entrance and the closing door.'] },
  discount: { p: ['until every financial record and witness statement had been examined independently', 'provided they enter a verified code before completing the online payment', 'because the publisher needed storage space for the newly revised version'], u: ['The same shop reduces the same product’s price by ten percent during the weekend promotion.', 'The same investigators refuse to dismiss the same possible explanation before checking the available evidence.'] },
  tailor: { p: ['because most viewers would watch on a small screen without sound during short breaks', 'while preserving every factual qualification contained in the original expert statement', 'so the slogan, image, channel, and timing all appealed to the chosen group'], u: ['The same teacher adjusts the same course for the needs and language level of the adult learners.', 'The same editor adapts the same message for the intended audience without changing its verified factual content.'] },
  'get across': { p: ['rather than giving them a false impression of complete mathematical certainty', 'because its attractive images did not explain what the product actually did', 'by limiting labels, arranging values logically, and stating the comparison in the title'], u: ['The same speaker communicates the same central message clearly enough for the audience to explain it afterwards.', 'The same chart conveys the same complex relationship more directly than a long paragraph of figures.'] },
  housing: { p: ['after years of rising rents forced essential workers to leave the town centre', 'and officials estimated the cost of making the damaged homes safe again', 'when rent exceeds the fixed proportion of income established by the national scheme'], u: ['The same city provides the same affordable homes for families whose income is below the stated limit.', 'The same protective case surrounds the camera and prevents dust and water from reaching its internal parts.'] },
  estate: { p: ['because the family wanted professional help with tax, inheritance, and future care costs', 'and promised to build affordable homes beside the new commercial units', 'before transferring the remaining property to the scholarship foundation named in her will'], u: ['The same family owns the same large country property, including the house, farmland, and surrounding woodland.', 'The same lawyer manages the same deceased sponsor’s property, debts, and gifts according to the written will.'] },
  amuse: { p: ['while adults completed the membership forms and discussed the day’s programme', 'because he had already identified the factual error before the article was published', 'and producers repeated the successful campaign during the following month'], u: ['The same story makes the same audience laugh during the long wait before the live programme begins.', 'The same simple games entertain the same children while their parents complete the emergency registration forms.'] },
  'brighten up': { p: ['after months of uncertainty about whether she could afford the journalism course', 'while leaving enough empty space for the product and price to remain clear', 'allowing the outdoor interview to continue without the artificial lights planned by producers'], u: ['The same room becomes lighter and more cheerful after the designer adds the same warm colours.', 'The same student becomes visibly happier after hearing that the same scholarship application has succeeded.'] },
  'housing estate': { p: ['because repeated delays showed that the existing service could not reach the area quickly enough', 'and examines how design decisions affect safety, privacy, and social interaction', 'so rented, privately owned, and shared-ownership homes stand within the same development'], u: ['The same family lives in the same planned residential area containing many homes and shared public spaces.', 'The same council builds the same group of homes on the same site for residents who need affordable housing.'] },
};

const PPT_NOTE_CARDS = {
  critical: { type: '课件讲者备注·同义表达群', expression: 'of vital / crucial / critical / decisive importance 都可表示“至关重要”，其中 decisive 还强调会直接决定结果。', example: 'Independent evidence is of critical importance when two reports contradict each other. （Reading LP·notes 1）' },
  trap: { type: '课件讲者备注·熟词语境', expression: 'fall into the trap of doing sth 陷入做某事的误区；people caught in the unemployment trap 陷入失业困境的人。', example: 'Parents may fall into the trap of arranging everything for their children. （Reading LP·notes 6）' },
  discrimination: { type: '课件讲者备注·辨析', expression: 'distinguish right from wrong 强调辨别；age/racial/sex discrimination 强调因年龄、种族或性别受到不公正对待；show favour to sb 表示偏爱。', example: 'A fair placement process must prevent age, racial, and sex discrimination. （Reading LP·notes 22）' },
  mount: { type: '课件讲者备注·词块联想', expression: 'mounting pressure 表示“不断增加的压力”；表达“迅速成名”可用 rise/shoot to fame、take off、become a hit。', example: 'Mounting pressure forced the platform to investigate the misleading campaign. （Grammar LP·notes 3）' },
  advertising: { type: '课件讲者备注·一词多义', expression: 'advertising 可指 advertising activity“广告活动”，也可指 the advertising industry“广告业”；work in advertising/publicity 表示从事广告宣传。', example: 'She works in advertising and plans campaigns for several national brands. （Extended Reading LP·notes 1）' },
  advertisement: { type: '课件讲者备注·投放位置', expression: 'an advertisement is placed on a popular website or on TV；place/run an advertisement on a website / on TV。', example: 'The company placed the advertisement on a popular website and on television. （Extended Reading LP·notes 2）' },
  peak: { type: '课件讲者备注·同义表达群', expression: 'be at the peak of one\'s career = be in one\'s prime；be past one\'s peak / prime 表示已过巅峰期。', example: 'Her flourishing career was at its peak when the documentary won the award. （Extended Reading LP·notes 8）' },
  housing: { type: '课件正文·commit 词块', expression: 'commit large amounts of money to housing projects：把大量资金投入住房项目；commit sth to sth 中 to 是介词。', example: 'The council committed large amounts of money to housing projects. （Reading LP·slide 46）' },
};

const PPT_EXERCISE_SLIDES = {
  critical: 6, release: 15, extend: 21, choke: 26, 'come about': 29, differ: 38,
  conclusion: 41, accuse: 4, drama: 7, witness: 4, edition: 5, persuade: 6,
  brand: 20, sponsor: 25, absorb: 29, tailor: 32, 'get across': 19,
};

const POS_EXTENSIONS = {
  committed: [null, 'during the paper’s year-long regional expansion', null],
  'bring sth to light': [null, 'during the final public hearing', null],
  'be committed to': [null, null, 'in every edition released that week'],
  found: [null, 'during its first year of operation', null],
  accuse: [null, 'in the formal charge filed that morning', null],
  tax: ['under the newly adopted public-health policy', null, null],
  mount: ['throughout the final week of public hearings', null, null],
  profession: [null, null, 'during the nationally televised press conference'],
  scholarship: [null, null, 'at the same respected national newspaper'],
  membership: ['following the annual membership review', null, 'after the widely reported advertising scandal'],
  advertising: [null, 'through several heavily regulated national media channels', null],
  channel: [null, null, 'during the confidential cross-border investigation'],
  boost: ['during a period of weak national demand', null, null],
  psychology: [null, null, 'when children or anxious patients are the intended audience'],
  purchase: [null, null, 'rather than actual buying behaviour after the campaign'],
  brand: ['during the crowded national launch event', null, null],
  ambassador: [null, null, 'before formal diplomatic relations were finally restored'],
  sponsor: [null, 'before the final parliamentary vote', null],
  absorb: [null, null, 'throughout the long international delivery journey'],
  discount: [null, 'under the verified annual membership scheme', 'before the revised edition reached bookshops'],
};

const UPGRADE_EXTENSIONS = {
  dozen: [null, ' Both descriptions still refer to exactly twelve complaints.'],
  instance: [null, ' The broader argument and supporting case remain unchanged.'],
  'come about': [' The sequence and final change are identical in both versions.', null],
  'for instance': [null, ' The general claim and chosen example remain exactly the same.'],
  'bring sth to light': [null, ' The documents and concealed facts remain unchanged.'],
  citizen: [null, ' The person and local meeting are unchanged.'],
  accuse: [null, ' The official, records, and alleged act remain unchanged.'],
  profession: [' The training and occupation remain identical.', ' The graduate, career, and professional duties remain identical.'],
  'mount up': [null, ' The evidence and investigation remain unchanged.'],
  scholarship: [null, ' The same research and archives support both sentences.'],
  interaction: [null, ' The same forces and process appear in both versions.'],
  'spring up': [' The location and opening event remain unchanged.', null],
  persuasion: [null, ' The editor and requested correction remain unchanged.'],
  rating: [null, ' The programme and audience figures remain unchanged.'],
  slogan: [null, ' The campaign and central message remain unchanged.'],
  discount: [null, ' The possibility and investigation remain unchanged.'],
  'get across': [null, ' The same chart and relationship appear in both versions.'],
};

const POS_LABELS = {
  trap: ['vt.', 'n.', 'n.'], release: ['vt.', 'vt.', 'n.'], minor: ['n.', 'vi.', 'adj.'],
  scream: ['vi.', 'n.', 'vt.'], bark: ['vt.', 'n.', 'n.'], carpet: ['n.', 'vt.', 'n.'],
  minimum: ['adj.', 'adj.', 'adj.'], maximum: ['adj.', 'adj.', 'adj.'], sum: ['vi.', 'n.', 'n.'],
  committed: ['adj.', 'adj.', 'adj.'], mount: ['vi.', 'vt.', 'vt.'], witness: ['vt.', 'n.', 'n.'],
  chart: ['vt.', 'vt.', 'n.'], broadcast: ['vt.', 'vt.', 'n.作定语'], channel: ['vt.', 'n.', 'n.'],
  peak: ['vi.', 'adj.', 'n.'], boost: ['vt.', 'n.', 'vt.'], purchase: ['vt.', 'n.作定语', 'n.作定语'],
  brand: ['n.作定语', 'n.作定语', 'vt.'], rating: ['n.', 'n.作定语', 'n.作定语'],
  sponsor: ['n.', 'vt.', 'n.'], discount: ['vt.', 'n.', 'n.作定语'], tailor: ['adj.', 'vt.', 'adj.'],
  amuse: ['vt.', 'vt.', 'vt.'],
};

const POS_OVERRIDES = {
  critical: [
    'A critical examination of the leaked documents prevented the newsroom from repeating an unsupported claim that could have misled thousands of readers within minutes.',
    'The rescue reached a critical stage after smoke entered the stairwell and flames blocked the only safe route from the upper floors.',
    null,
  ],
  bark: [
    null,
    null,
    'The witness identified the tree by its rough bark, where a fresh mark showed that the escaping driver had struck it during the accident.',
  ],
  committed: [
    null,
    'The publisher remained fully committed to investigative journalism and allocated additional reporters, legal support, and travel funds during the paper’s year-long regional expansion.',
    'The platform stayed committed to protecting young users and reported its progress publicly at the end of every month during the campaign.',
  ],
  'for instance': [
    null,
    null,
    'For instance, the reporter checked every name against the official register twice, showing exactly how the newsroom’s verification rule worked in practice.',
  ],
  politics: [
    null,
    null,
    'The drama explores the politics of a housing campaign by showing how personal experience, public policy, and competition for power influence one another.',
  ],
  accuse: [
    null,
    null,
    'Critics accused the sponsor of hiding a second set of figures after the published totals failed to match the independently audited accounts.',
  ],
  psychology: [
    null,
    'The psychology of journalists working through a crisis deserves attention because repeated exposure to loss can affect judgement, sleep, and emotional health.',
    'Advertisers use psychology to make slogans memorable, although ethical rules should prevent those techniques from exploiting children, anxious patients, or other vulnerable consumers.',
  ],
  rating: [
    'The documentary received a high rating from viewers after independent reviewers praised its evidence, structure, and careful treatment of vulnerable interviewees.',
    null,
    null,
  ],
  sponsor: [
    null,
    null,
    'The sponsor signed a transparent funding agreement before the broadcast so viewers could identify who had paid for the report and judge possible conflicts of interest.',
  ],
  amuse: [
    null,
    null,
    'The least expensive advertisement amused viewers with a gentle joke, and producers repeated the successful campaign during the following month.',
  ],
  'housing estate': [
    'Residents of the housing estate asked the council for a faster ambulance service because repeated delays showed that emergency crews could not reach the area quickly enough.',
    null,
    null,
  ],
  ambassador: [
    null,
    null,
    'The government recalled its ambassador after negotiations failed and both governments issued sharply critical statements, a step taken before formal diplomatic relations were eventually restored.',
  ],
};

const ADVANCED_DROP_TYPES = {
  bath: ['辨析·bath 与 bathe', '词族·bath 词族'], 'dozens of': ['同义表达群·许多', '语法点·概数表达'],
  instance: ['短语群·举例'], differ: ['短语群·differ 搭配'], sum: ['短语群·sum'],
  discrimination: ['语法点·discriminate 的介词'], 'for instance': ['句子结构·for instance', '同义表达群·举例'],
  'bring sth to light': ['句子结构·bring sth to light'], 'be committed to': ['语法点·to 是介词'],
  commitment: ['语法点·commitment 的介词'], tax: ['句子结构·tax'],
  elevation: ['短语群·表"海拔/高度"'], persuade: ['短语群·persuade 核心结构'],
  peak: ['短语群·peak 核心结构'], boost: ['短语群·boost 核心结构'],
  slogan: ['短语群·slogan 核心结构'], placement: ['短语群·placement 核心结构'],
  estate: ['短语群·estate 核心结构'], 'brighten up': ['同义表达群·brighten up 与 cheer up'],
};

function parseTriples(raw) {
  return raw.split('||').map((item) => {
    const [phrase, translation, example] = item.split('~');
    return { phrase, translation, example };
  });
}

function normalize(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/sb\.?|sth\.?|one'?s/g, 'x')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function nearDuplicate(a, b) {
  const left = normalize(a);
  const right = normalize(b);
  if (!left || !right) return false;
  if (left === right) return true;
  const shorter = left.length <= right.length ? left : right;
  const longer = left.length > right.length ? left : right;
  if (longer.includes(shorter) && shorter.length / longer.length >= 0.72) return true;
  const lset = new Set(left.split(' '));
  const rset = new Set(right.split(' '));
  const overlap = [...lset].filter((token) => rset.has(token)).length;
  const union = new Set([...lset, ...rset]).size;
  return union > 0 && overlap / union >= 0.88;
}

function uniqueBy(items, selector, near = false) {
  const result = [];
  for (const item of items) {
    const value = selector(item);
    if (!result.some((old) => near ? nearDuplicate(selector(old), value) : normalize(selector(old)) === normalize(value))) {
      result.push(item);
    }
  }
  return result;
}

function stripPeriod(value) {
  return String(value || '').trim().replace(/[.!?]+$/, '');
}

function expandNaturally(base, clause) {
  const commaClause = /^(?:and|but|yet|which|who|creating|showing|allowing|including|ranging|although|while|even\b|despite\b)/i.test(clause);
  return `${stripPeriod(base)}${commaClause ? ',' : ''} ${clause}`;
}

function lowerFirst(value) {
  return value ? value[0].toLowerCase() + value.slice(1) : value;
}

function registerTag(index) {
  if (index <= 15) return '（应用文·灾情与应急报道）';
  if (index <= 45) return '（议论文·新闻素养与事实核查）';
  return '（应用文·媒体传播与广告分析）';
}

function syntaxNote(entry) {
  const pos = entry.partOfSpeech.toLowerCase();
  if (pos.includes('phrasal') || pos.includes('phr.')) {
    return `目标短语 ${entry.word} 整体充当谓语或句中固定词块；是否可分、所接介词和宾语形式必须连同核心搭配一起记忆`;
  }
  if (pos.includes('adj')) {
    return `${entry.word} 可按具体义项作前置定语或表语；作表语时应优先记忆其固定介词和补足结构`;
  }
  if (pos.includes('adv')) {
    return `${entry.word} 是连接或修饰副词，位置由信息衔接决定；连接两个独立分句时要使用句号或分号`;
  }
  if (pos.includes('n.')) {
    return `${entry.word} 作名词时要同时判断可数性、冠词和单复数；复合名词作定语时通常保持单数形式`;
  }
  return `${entry.word} 作动词时要同时记住及物性、宾语形式、固定介词以及主动和被动结构`;
}

function distinctionSyntaxPrefix(entry, usage) {
  if (/名词|可数|不可数/.test(usage)) return '句法位置：通常作主语、宾语或前置定语；';
  if (/形容词/.test(usage)) return '句法位置：通常作前置定语或表语；';
  if (/副词|连接副词|连词/.test(usage)) return '句法位置：可置于句首或句中，连接分句时注意标点；';
  if (/动词|及物|不及物/.test(usage)) return '句法位置：通常作谓语，须辨别及物性、宾语形式和固定介词；';
  const pos = entry.partOfSpeech.toLowerCase();
  if (pos.includes('adj')) return '句法位置：通常作前置定语或表语；';
  if (pos.includes('n.')) return '句法位置：通常作主语、宾语或前置定语；';
  if (pos.includes('phr')) return '句法位置：短语整体作谓语、状语或插入语，结构不可随意拆换；';
  return '句法位置：通常作谓语，须辨别及物性、宾语形式和固定介词；';
}

function tokenJaccard(a, b) {
  const left = new Set(normalize(a).split(' ').filter(Boolean));
  const right = new Set(normalize(b).split(' ').filter(Boolean));
  const overlap = [...left].filter((token) => right.has(token)).length;
  const union = new Set([...left, ...right]).size;
  return union ? overlap / union : 0;
}

function countEnglishWords(value) {
  return String(value || '').match(/[A-Za-z]+(?:['-][A-Za-z]+)*/g)?.length || 0;
}

function padLongExample(value, index) {
  if (countEnglishWords(value) >= 20) return value;
  if (index <= 15) {
    return `${value}, while officials verified the sequence of events before releasing a detailed public account`;
  }
  if (index <= 45) {
    return `${value}, giving critical readers a firmer basis for comparison with evidence from independent sources`;
  }
  return `${value}, allowing the team to assess its effect on consumer attention without confusing visibility with trust`;
}

function combineExamples(first, second, connector, tag, index) {
  const a = stripPeriod(first);
  const b = lowerFirst(stripPeriod(second));
  return `${padLongExample(`${a}; ${connector}, ${b}`, index)}. ${tag}`;
}

function blankExact(sentence, answer) {
  const escaped = answer.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(escaped, 'i');
  return re.test(sentence) ? sentence.replace(re, '____') : null;
}

for (let index = 0; index < data.length; index += 1) {
  const entry = data[index];
  const rawCollocations = COLLOCATIONS[entry.word];
  const synonymItems = SYNONYMS[entry.word];
  if (!rawCollocations || !synonymItems) {
    throw new Error(`Missing deep profile for ${entry.word}`);
  }

  const tag = registerTag(index);
  const additions = parseTriples(rawCollocations).map((item) => ({
    ...item,
    example: `${stripPeriod(item.example)}. ${tag}`,
  }));

  // Preserve all distinct existing classroom material, remove only internal duplicates,
  // then append genuinely different structures until the entry reaches 10-12 items.
  const existingCollocations = uniqueBy(entry.collocations || [], (item) => item.phrase, true);
  const mergedCollocations = [...existingCollocations];
  for (const item of additions) {
    if (mergedCollocations.length >= 12) break;
    if (!mergedCollocations.some((old) => nearDuplicate(old.phrase, item.phrase))) {
      mergedCollocations.push(item);
    }
  }
  if (mergedCollocations.length < 10) {
    throw new Error(`${entry.word}: only ${mergedCollocations.length} distinct collocations after merge`);
  }
  entry.collocations = mergedCollocations.map((item) => ({
    ...item,
    example: /[\u3400-\u9fff]/.test(item.example || '') ? item.example : `${stripPeriod(item.example)}. ${tag}`,
  }));

  const pptHits = (pptIndex[entry.word] || []).filter((hit) => hit.context);
  if (pptHits.length) {
    const pptText = normalize(pptHits.map((hit) => hit.context).join(' ')).replace(/\bx\b/g, '');
    const firstHit = pptHits[0];
    const sourceLabel = `${firstHit.file.split('/').pop().replace('.pptx', '')} ${firstHit.kind} ${firstHit.number}`;
    const classroom = [];
    const secondary = [];
    for (const item of entry.collocations) {
      const phrase = normalize(item.phrase).replace(/\bx\b/g, '').trim();
      const phraseTokens = phrase.split(' ').filter(Boolean);
      const fromPpt = /课件/.test(item.translation || '') || (phraseTokens.length >= 2 && pptText.includes(phrase));
      if (fromPpt) {
        classroom.push({
          ...item,
          translation: `【课件·${sourceLabel}】 ${String(item.translation || '').replace(/【课件(?:·[^】]*)?】/g, '').trim()}`.trim(),
        });
      } else {
        secondary.push(item);
      }
    }
    entry.collocations = [...classroom, ...secondary];

    if (PPT_EXERCISE_SLIDES[entry.word]) {
      const slide = PPT_EXERCISE_SLIDES[entry.word];
      entry.classPractice = (entry.classPractice || []).map((item) => /课件/.test(item.note || '') ? {
        ...item,
        note: `${String(item.note).replace(/【课件[^】]*】/g, '').trim()}【课件原练习·slide ${slide}】`,
      } : item);
    }
  }

  const parsedSynonyms = synonymItems.map((raw) => {
    const [synonym, translation, example, usage] = raw.split('~');
    return { synonym, translation, example: `${stripPeriod(example)}. ${tag}`, usage: `${distinctionSyntaxPrefix(entry, usage)}${usage}` };
  });
  entry.synonyms = uniqueBy([...(entry.synonyms || []), ...parsedSynonyms], (item) => item.synonym).map((item) => ({
    ...item,
    usage: /句法位置/.test(item.usage || '') ? item.usage : `${distinctionSyntaxPrefix(entry, item.usage || '')}${item.usage || ''}`,
  }));
  if (entry.synonyms.length < 3) throw new Error(`${entry.word}: fewer than three distinctions`);

  if (MEANINGS[entry.word]) {
    entry.uncommonMeanings = uniqueBy([...(entry.uncommonMeanings || []), ...MEANINGS[entry.word]], (item) => `${item.partOfSpeech}:${item.meaning}`);
  }

  entry.wordForms = {
    noun: entry.wordForms?.noun ?? null,
    verb: entry.wordForms?.verb ?? null,
    adjective: entry.wordForms?.adjective ?? null,
    adverb: entry.wordForms?.adverb ?? null,
    other: entry.wordForms?.other || `形态与句法：${entry.word}（${entry.partOfSpeech}）；${syntaxNote(entry)}。`,
  };
  const informativeFormKeys = ['noun', 'verb', 'adjective', 'adverb', 'other'].filter((key) => entry.wordForms[key]);
  if (informativeFormKeys.length < 3) {
    const emptyKey = ['verb', 'adjective', 'noun', 'adverb'].find((key) => !entry.wordForms[key]);
    entry.wordForms[emptyKey] = `无常用的独立同根${{ noun: '名词', verb: '动词', adjective: '形容词', adverb: '副词' }[emptyKey]}；表达相应意义时优先使用词块 “${additions[0].phrase}”。`;
  }

  // Three independent long writing examples are built from different lexical facts;
  // the original short classroom examples remain untouched and stay first.
  const sourceExamples = additions.map((item) => item.example.replace(/（[^）]+）$/, '').trim());
  const naturalProfile = NATURAL_EXPANSIONS[entry.word];
  if (!naturalProfile || naturalProfile.p.length !== 3 || naturalProfile.u.length !== 2) {
    throw new Error(`${entry.word}: incomplete natural-expansion profile`);
  }
  const longExamples = naturalProfile.p.map((clause, position) => ({
    partOfSpeech: POS_LABELS[entry.word]?.[position] || entry.partOfSpeech,
    sentence: POS_OVERRIDES[entry.word]?.[position]
      ? `${stripPeriod(POS_OVERRIDES[entry.word][position])}. ${tag}`
      : `${expandNaturally(sourceExamples[position], clause)}${POS_EXTENSIONS[entry.word]?.[position] ? `, ${POS_EXTENSIONS[entry.word][position]}` : ''}. ${tag}`,
  }));
  const lexicalAnchors = [entry.original_sentence, ...entry.collocations.map((item) => item.example)];
  const preservedPosExamples = (entry.posExamples || []).filter((item) => {
    if (/（(?:应用文|议论文)·(?:灾情与应急报道|新闻素养与事实核查|媒体传播与广告分析)）$/.test(item.sentence)) return false;
    return !lexicalAnchors.some((anchor) => tokenJaccard(item.sentence, anchor) >= 0.65);
  });
  entry.posExamples = uniqueBy([...preservedPosExamples, ...longExamples], (item) => item.sentence);

  const firstSynonym = parsedSynonyms[0];
  const strongest = additions[0];
  const grammarCard = {
    type: `句子结构·${entry.word}`,
    expression: `${syntaxNote(entry)}；课堂落点：${strongest.phrase}`,
    example: strongest.example,
  };
  const rewriteCard = {
    type: `等值改写·${entry.word}`,
    expression: `${entry.word} 与 ${firstSynonym.synonym} 在特定义项上接近，但不能忽略句法限制：${firstSynonym.usage}`,
    example: firstSynonym.example,
  };
  const writingCard = {
    type: `写作层·${entry.word}`,
    expression: `在本单元主题写作中优先使用信息完整的词块 “${additions[1].phrase}”，避免只写孤立目标词。`,
    example: additions[1].example,
  };
  entry.advancedExpressions = uniqueBy(
    [...(entry.advancedExpressions || []), grammarCard, rewriteCard, writingCard],
    (item) => `${item.type}:${item.expression}`,
  );
  if (PPT_NOTE_CARDS[entry.word]) {
    entry.advancedExpressions = uniqueBy([PPT_NOTE_CARDS[entry.word], ...entry.advancedExpressions], (item) => `${item.type}:${item.expression}`);
  }

  // Replace prior template-like copies with two word-specific natural expansions.
  const originals = (baselineData[index].sentenceUpgrade || []).slice(0, 2);
  const expandedUpgrades = originals.map((pair, position) => ({
    original: `${stripPeriod(pair.original)}. ${naturalProfile.u[position]}${UPGRADE_EXTENSIONS[entry.word]?.[position] || ''}`,
    upgraded: `${stripPeriod(pair.upgraded)}. ${naturalProfile.u[position]}${UPGRADE_EXTENSIONS[entry.word]?.[position] || ''}`,
    techniques: `[深度返工·同主语同事实] ${pair.techniques} 追加细节同时用于前后句，人物、时间、原因和结果保持一致。`,
  }));
  entry.sentenceUpgrade = expandedUpgrades;

  const collocationPractice = {
    type: '短语填空',
    question: `将括号内的核心词块译成英语：____（${strongest.translation}）`,
    answer: strongest.phrase,
    note: `[深度返工·搭配] 不能只写目标词，需完整写出结构 “${strongest.phrase}”。`,
  };
  const synonymSentence = firstSynonym.example.replace(/（[^）]+）$/, '').trim();
  const blankedSynonym = blankExact(synonymSentence, firstSynonym.synonym) || `Choose ${entry.word} or ${firstSynonym.synonym}: ____`;
  const discriminationPractice = {
    type: '辨析选词',
    question: `在 ${entry.word} / ${firstSynonym.synonym} 中选择正确形式：${blankedSynonym}`,
    answer: firstSynonym.synonym,
    note: `[深度返工·辨析] ${firstSynonym.usage}`,
  };
  const baseUpgrade = originals[0];
  const grammarPractice = {
    type: '用指定语法形式完成句子',
    question: `保持主语和事实不变，用目标词条改写：${baseUpgrade.original} → ____`,
    answer: baseUpgrade.upgraded,
    note: `[深度返工·句法] ${baseUpgrade.techniques}`,
  };
  entry.classPractice = uniqueBy(
    [...(entry.classPractice || []), collocationPractice, discriminationPractice, grammarPractice],
    (item) => `${item.type}:${item.question}`,
  );

  const practiceTypes = new Set(entry.classPractice.map((item) => item.type));
  if (!practiceTypes.has('汉译英')) {
    entry.classPractice.push({
      type: '汉译英',
      question: `请把核心词块译成英语：${strongest.translation}`,
      answer: strongest.phrase,
      note: `[深度返工·翻译] 答案需保留完整搭配和介词：${strongest.phrase}。`,
    });
  }
}

const UPGRADE_OVERRIDES = {
  conclusion: [
    {
      original: 'Finally, I want to thank my family for their patience, practical help, and constant encouragement throughout the difficult reporting project.',
      upgraded: 'In conclusion, I would like to express my sincere gratitude to my family for their patience, practical support, and unwavering encouragement throughout the demanding reporting project.',
      techniques: '[深度返工·同主语同事实] 保持结尾致谢、家人及三项帮助不变，用 in conclusion、express my sincere gratitude、unwavering 提升正式度。',
    },
    {
      original: 'The evidence shows that the advertisement influenced recognition but did not increase actual purchases, so the team reached a cautious conclusion about its effect.',
      upgraded: 'The evidence indicates that the advertisement enhanced brand recognition without increasing actual purchases; the team therefore drew a cautious conclusion about its overall impact.',
      techniques: '[深度返工·同事实链] 保留广告、认知度、实际购买及谨慎结论，用 indicate、enhance、draw a conclusion 和分号重组逻辑。',
    },
  ],
  journalism: [
    {
      original: 'Journalism is very important because it helps citizens understand public events after reporters compare claims with independent sources and separate verified facts from personal opinion.',
      upgraded: 'Responsible journalism plays an indispensable role in helping citizens understand public events after reporters compare claims with independent sources and separate verified facts from personal opinion.',
      techniques: '[深度返工·同主语同事实] 保持 journalism 主语、核查过程和公众作用不变，用 responsible、play an indispensable role in 提升表达。',
    },
    {
      original: 'Good journalism is based on careful fact-checking, clear source attribution, and visible corrections whenever a published report contains an important factual error before readers rely on it.',
      upgraded: 'Responsible journalism rests on rigorous fact-checking, transparent source attribution, and prominent corrections whenever a published report contains a significant factual error before readers rely on it.',
      techniques: '[深度返工·同主语同事实] 保持三项职业标准不变，用 rest on、rigorous、transparent、prominent 作等值升级。',
    },
  ],
  found: [
    {
      original: 'Their marriage was based on love, mutual respect, and honest conversation, which helped both partners remain calm and supportive when work commitments created serious pressure at home.',
      upgraded: 'Their marriage was founded on love, mutual respect, and honest conversation, which helped both partners remain calm and supportive when work commitments created serious pressure at home.',
      techniques: '[深度返工·同主语同事实] 主语、三项基础及结果完全一致，仅用 be founded on 等值替换 be based on。',
    },
    {
      original: 'Public trust is based on accurate information, independent evidence, and prompt visible corrections when a news organization discovers that it has published a seriously misleading claim.',
      upgraded: 'Public trust is founded on accurate information, independent evidence, and prompt visible corrections when a news organization discovers that it has published a seriously misleading claim.',
      techniques: '[深度返工·同主语同事实] 保持 public trust 主语与三个事实基础不变，用 be founded on 提升书面度。',
    },
  ],
  brand: [
    {
      original: 'Consumers gradually become more willing to purchase the advertised product as their liking for the same brand ambassador increases during repeated viewings of the campaign.',
      upgraded: 'The more consumers like the same brand ambassador, the more willing they gradually become to purchase the advertised product during repeated viewings of the campaign.',
      techniques: '[深度返工·同主语同事实] 保持 consumers、同一代言人、购买意愿和观看情境不变，改用 the more..., the more...。',
    },
    {
      original: 'Customers repeatedly purchased the same products throughout the entire year because they trusted the brand to provide consistently high quality and reliable after-sales service.',
      upgraded: 'Customers demonstrated lasting brand loyalty by repeatedly purchasing the same products throughout the year because they trusted the brand to provide consistently high quality and reliable after-sales service.',
      techniques: '[深度返工·同主语同事实] 保持 customers 主语、重复购买、品牌及原因不变，用 demonstrate brand loyalty 概括原行为。',
    },
  ],
  absorb: [
    {
      original: 'Because Simon was concentrating completely on his book, he did not notice me enter the quiet room, even after I softly called his name from the doorway.',
      upgraded: 'Completely absorbed in his book, Simon did not notice me enter the quiet room, even after I softly called his name twice from the nearby doorway.',
      techniques: '[深度返工·同主语同事实] 保持 Simon、读书、未注意到来人及呼唤细节不变，用 absorbed in 过去分词短语压缩原因从句。',
    },
    {
      original: 'Simon concentrated so completely on the book that he failed to notice me enter the room or hear the heavy door close quietly behind me.',
      upgraded: 'So absorbed was Simon in the book that he failed to notice me enter the room or hear the heavy door close quietly behind me.',
      techniques: '[深度返工·同主语同事实] 保持 Simon 的专注程度及两个结果不变，用 so + 形容词置于句首引发部分倒装。',
    },
  ],
};

for (const [word, upgrades] of Object.entries(UPGRADE_OVERRIDES)) {
  const entry = data.find((item) => item.word === word);
  entry.sentenceUpgrade = upgrades;
}

for (const [word, types] of Object.entries(ADVANCED_DROP_TYPES)) {
  const entry = data.find((item) => item.word === word);
  const dropped = new Set(types);
  entry.advancedExpressions = entry.advancedExpressions.filter((item) => !dropped.has(item.type));
}
const replacementCards = {
  bath: {
    type: '习语延伸·take a bath',
    expression: 'take a bath 除“洗澡”外，在美式非正式语境中还可表示“遭受严重经济损失”；该习语不能按字面理解。',
    example: 'Several investors took a bath when the false advertising campaign collapsed. （议论文·商业诚信）',
  },
  'dozens of': {
    type: '翻译实践·概数处理',
    expression: '该概数短语不译成精确的“十二个”，应按语境译为“数十个/许多”；确数结构中的单位词保持原形，且不用介词连接名词。',
    example: 'Dozens of applications arrived overnight. 一夜之间收到了数十份申请。',
  },
  'for instance': {
    type: '句子结构·take A for instance',
    expression: '引出实例的短语作句首插入语时用逗号隔开；把具体名词置于短语中间时，词序随之改变，两种结构不可机械互换。',
    example: 'Take the release of emergency figures for instance: every number must be checked before publication.',
  },
};
for (const [word, card] of Object.entries(replacementCards)) {
  const entry = data.find((item) => item.word === word);
  entry.advancedExpressions = [...entry.advancedExpressions.filter((item) => item.type !== card.type), card];
}
const forInstanceEntry = data.find((item) => item.word === 'for instance');
const punctuationCard = forInstanceEntry.advancedExpressions.find((item) => item.type === '语法点·插入语标点');
if (punctuationCard) {
  punctuationCard.expression = '表示举例的连接成分置于句首或句中时通常用逗号与主干隔开；它不是并列连词，不能单独连接两个完整分句。';
}
const chokeEntry = data.find((item) => item.word === 'choke');
chokeEntry.advancedExpressions = chokeEntry.advancedExpressions.filter((item) => item.expression !== 'choke on / choke to death / choke back tears / be choked with');

const bark = data.find((item) => item.word === 'bark');
bark.uncommonMeanings = bark.uncommonMeanings.filter((item, index, items) => {
  if (item.meaning === '树皮') return false;
  return items.findIndex((other) => other.meaning === item.meaning) === index;
});
bark.advancedExpressions = bark.advancedExpressions.filter((item) => item.type !== '熟词僻义·bark');
bark.wordForms = {
  noun: 'bark（犬吠声；树皮）',
  verb: 'bark-barked-barked-barking（吠叫；厉声说）',
  adjective: 'barking（吠叫的；非正式：疯狂的）',
  adverb: null,
  other: '同形异义：bark n. 可指“犬吠声”或“树皮”；bark at sb 对某人吠叫/厉声说，bark out an order 厉声下令。',
};

const bathEntry = data.find((item) => item.word === 'bath');
bathEntry.idioms = uniqueBy([...(bathEntry.idioms || []), {
  idiom: 'throw the baby out with the bathwater',
  meaning: '把婴儿连同洗澡水一起倒掉；因清除坏处而把有价值的部分也抛弃',
  example: 'When revising the policy, do not throw the baby out with the bathwater by removing every useful safety rule.',
}], (item) => item.idiom);

fs.writeFileSync(DATA_PATH, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
console.log(`Deep-reworked ${data.length} entries in ${DATA_PATH}`);
