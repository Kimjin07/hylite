import copy
import difflib
import hashlib
import json
import re
from pathlib import Path


TARGET = Path(r"C:\Users\27894\Desktop\HY\work\vocab3500-deep-rework\xb2\xb2_u3_data.json")
BASELINE = Path(r"C:\Users\27894\Desktop\HY\deploy\vocab3500\xb2_u3_data.json")
IMMUTABLE = (
    "word", "textbook", "unit", "pronunciation", "partOfSpeech", "translation",
    "source", "section", "sub_section", "original_sentence", "readingExamples",
)
FORM_KEYS = ("noun", "verb", "adjective", "adverb", "other")
ALLOWED_PRACTICE_TYPES = (
    "单句语法填空", "完成句子", "选词填空", "汉译英", "短语填空", "辨析选词",
    "同义句转换", "用指定语法形式完成句子",
)


# Each entry contains three independent writing-layer examples. The first two are
# extended in the same scene to make the sentence-upgrade pair.
POS_BANK = {
    "surgeon": "n.~The surgeon reviewed every scan before explaining the risks of the complex operation to the patient's anxious family.||n.~An experienced surgeon remained beside the injured climber until the emergency team had stabilized his breathing completely.||n.~Several young surgeons attended the international workshop to practise a less invasive technique for repairing damaged heart valves.",
    "physician": "n.~The physician compared the patient's symptoms with her medical history before recommending a carefully monitored course of treatment.||n.~A rural physician may treat infections, minor injuries and chronic illnesses during the same demanding working day.||n.~The attending physician asked the laboratory to repeat the test because one result appeared inconsistent with the others.",
    "chemist": "n.~The research chemist analysed the unusual substance twice before reporting its possible medical value to the project leader.||n.~A qualified chemist at the local pharmacy warned the customer that the two medicines should not be taken together.||n.~The analytical chemist recorded each temperature change while testing whether the new material remained stable under pressure.",
    "dentist": "n.~The dentist examined the painful tooth carefully and showed the patient why an immediate filling was necessary.||n.~A community dentist visits remote schools each month to teach children how daily brushing can prevent serious decay.||n.~The dental surgeon postponed the procedure until the swelling around the patient's jaw had been brought under control.",
    "gene": "n.~Researchers identified a gene that influences how efficiently the body repairs tissue after a severe physical injury.||n.~A child may inherit one altered gene without ever developing the disease associated with that genetic change.||n.~The team compared the gene across several populations to understand why the condition was unusually common in one region.",
    "game-changing": "adj.~The new screening method could be game-changing because it detects the disease before any obvious symptoms appear.||adj.~Affordable artificial limbs have proved game-changing for patients who previously depended on heavy and uncomfortable devices.||adj.~The committee demanded stronger evidence before describing the experimental treatment as a genuinely game-changing medical advance.",
    "genome": "n.~Scientists sequenced the patient's genome to search for inherited changes that might explain the rare disorder.||n.~Mapping the human genome created valuable research tools, but it also raised difficult questions about privacy and consent.||n.~The laboratory stores each genome in an encrypted database that only authorized medical researchers are permitted to access.",
    "cell": "n.~A healthy human cell normally contains instructions that regulate when it should grow, divide and eventually die.||n.~The prisoner wrote a short letter each evening while confined alone in a narrow underground cell.||n.~Engineers improved the solar cell so that it continued producing electricity even under weak winter light.",
    "being": "n.~Every human being should be told clearly how personal genetic information will be collected, stored and used.||n.~The new organization came into being after several patient groups joined forces to demand fairer access to treatment.||n.~The rescued animal was treated as a living being capable of fear rather than as a piece of laboratory equipment.",
    "lifespan": "n.~Regular maintenance can extend the lifespan of a medical device and reduce the amount of expensive electronic waste.||n.~Researchers are investigating whether one particular gene affects the average lifespan of people with the inherited condition.||n.~The natural lifespan of the species has increased since conservationists removed a major source of disease from its habitat.",
    "affect": "vt.~The genetic change may affect several organs even though the earliest symptoms appear only in the patient's eyes.||vt.~News of the successful transplant deeply affected the nurse who had supported the family throughout the long wait.||vt.~A researcher must not affect confidence merely to hide uncertainty about results that have not yet been independently confirmed.",
    "contract": "vt.~Patients can contract the virus through close contact before the person carrying it develops noticeable symptoms.||n.~The hospital signed a five-year contract requiring the supplier to replace faulty equipment without additional charge.||vi.~Metal components contract in extreme cold, so engineers must allow enough space for small changes in size.",
    "virus": "n.~The virus can remain in the body for several days before fever and other recognizable symptoms develop.||n.~A computer virus entered the clinic's network through an attachment that appeared to contain routine laboratory results.||n.~Scientists monitor how quickly the virus changes so that vaccines can be adjusted before the next flu season.",
    "cancer": "n.~Early screening allowed doctors to detect the cancer before it had spread beyond the patient's left lung.||n.~The research centre invited cancer survivors to describe which forms of support mattered most during their treatment.||n.~Several genes can raise the risk of cancer without making the disease certain to develop in every carrier.",
    "identify": "vt.~Investigators identified a damaged sensor as the immediate cause of the laboratory's sudden power failure during the overnight test.||vt.~The physician identified the patient by comparing the name on his wristband with the electronic medical record.||vt.~The report identifies three ethical concerns that must be addressed before genome editing is tested on human beings.",
    "relate": "vt.~The lecturer related each scientific principle to a familiar medical case so that students could understand its practical importance.||vi.~Many patients relate more easily to counsellors who listen carefully without interrupting or offering immediate judgement.||vt.~The witness related the sequence of events calmly while the investigator checked each detail against the written evidence.",
    "means": "n.~Genome editing may become an effective means of treating disease, but it should not be presented as risk-free.||n.~The mobile clinic travels by any available means of transport to reach patients living in isolated mountain villages.||n.~The scholarship enables students of limited means to complete the demanding medical course without taking on excessive debt.",
    "delete": "vt.~The technician accidentally deleted a folder containing several weeks of data before the automatic backup had finished running.||vt.~Researchers must delete identifying information from shared files unless every participant has given clear and informed consent.||vt.~The editor deleted an unsupported claim from the report because no reliable evidence could be found for it.",
    "relate to": "phr.~The new safety rule relates to every clinic that stores sensitive genetic information on a connected computer system.||phr.~Teenage patients often relate to a doctor who explains difficult choices in direct and respectful language.||phr.~The researchers discussed how their latest findings relate to evidence collected during the earlier international trial.",
    "restore": "vt.~Emergency surgery restored blood flow to the injured limb before the surrounding tissue suffered permanent damage.||vt.~Conservators restored the nineteenth-century clinic while preserving the original tiles, windows and medical instruments used by generations of local physicians.||vt.~A transparent investigation helped restore public confidence after the hospital admitted that patient records had been mishandled.",
    "ultimately": "adv.~The committee considered cost, safety and fairness, but ultimately rejected the proposal because its long-term risks remained unknown.||adv.~Whether the treatment succeeds ultimately depends on how the patient's immune system responds during the first critical weeks.||adv.~The debate is ultimately about who should control genetic information and how that power can be exercised responsibly.",
    "abnormal": "adj.~An abnormal test result does not always indicate disease, so the physician ordered a second independent examination.||adj.~The sensor detected an abnormal heartbeat while the patient was completing an otherwise routine exercise test.||adj.~Researchers observed abnormal cell growth only after the tissue had been exposed to the substance for several days.",
    "weapon": "n.~Accurate genetic screening may become a powerful weapon in the fight against several inherited forms of cancer.||n.~The international agreement prohibits laboratories from developing biological weapons from dangerous modified viruses in secret military facilities.||n.~The lawyer warned that private medical data could become a weapon against applicants seeking insurance or employment.",
    "fundamental": "adj.~Informed consent is fundamental to medical research involving patients whose genetic information may reveal family risks.||n.~The introductory course teaches the fundamentals of cell biology before students begin more specialized work on the human genome.||adj.~There is a fundamental difference between repairing a harmful gene and selecting characteristics for a future child.",
    "pace": "n.~The pace of medical innovation has increased, but public discussion of its ethical consequences has developed more slowly.||v.~The anxious father paced the hospital corridor while surgeons completed the final stage of his daughter's operation.||n.~Each student can review the difficult genetics material at a pace suited to his or her previous scientific experience.",
    "arise": "vi.~Serious privacy concerns arise when genetic records are shared with commercial companies without the patient's full knowledge.||vi.~If unexpected complications arise during the procedure, the surgeon will stop immediately and review the available evidence.||vi.~The disagreement arose from different interpretations of whether future benefits could justify the present medical risks.",
    "restrict": "vt.~The hospital restricts access to genetic records to staff directly involved in the patient's treatment or approved research.||vt.~New regulations restrict companies from using medical information to discriminate against applicants with an inherited condition.||vt.~The physician restricted the athlete's training to gentle exercise until the damaged joint had recovered fully.",
    "prohibit": "vt.~The proposed law would prohibit employers from requesting genetic test results during an ordinary recruitment process.||vt.~Safety rules strictly prohibit laboratory staff from handling the virus without protective clothing and specialist supervision.||vt.~A lack of reliable evidence may prohibit the treatment from advancing to a larger trial involving vulnerable patients.",
    "resistance": "n.~Repeated misuse of antibiotics has increased bacterial resistance and made several common infections much harder to treat.||n.~The proposal met strong resistance from patient groups concerned about the commercial use of private genetic information.||n.~Engineers reduced wind resistance by changing the shape of the lightweight vehicle used to transport medical supplies.",
    "flu": "n.~The physician advised elderly patients to receive a flu vaccine before infection rates began rising in early winter.||n.~She stayed away from the crowded clinic while recovering from the flu to avoid infecting patients with weaker immunity.||n.~Although flu and a common cold share some symptoms, flu usually causes a more sudden and severe illness.",
    "characteristic": "n.~A persistent dry cough is a characteristic of the infection, though not every patient develops that symptom.||adj.~The careful pause before each answer was characteristic of a physician unwilling to make claims beyond the evidence.||n.~Researchers recorded several physical characteristics that might help identify carriers of the rare genetic condition during early screening.",
    "wrestle": "vi.~Medical researchers continue to wrestle with the question of where treatment ends and human enhancement begins.||vt.~The security officer wrestled the stolen case from the intruder before any confidential patient files were removed.||vi.~Parents may wrestle with conflicting feelings when a genetic test reveals risks for both their child and themselves.",
    "debate": "n.~A heated public debate followed the announcement that scientists had edited genes in a human embryo.||vt.~The ethics panel debated whether future medical benefits could justify exposing present patients to uncertain risks.||vi.~Researchers debated for several hours before agreeing on language that accurately described the limitations of their findings.",
    "prohibit sb from doing sth": "phr.~The rules prohibit technicians from copying patient records onto personal devices that are not protected by hospital security.||phr.~International law prohibits researchers from conducting medical experiments on people who have not given informed consent.||phr.~Nothing should prohibit a patient from asking detailed questions before accepting an unfamiliar and potentially risky treatment.",
    "wrestle with": "phr.~The committee wrestled with a moral problem that could not be settled by scientific evidence alone.||phr.~Families often wrestle with whether to learn about genetic risks for diseases that currently have no effective cure.||phr.~The young physician wrestled with her conscience before reporting a senior colleague's serious breach of safety rules.",
    "put sth in place": "phr.~The clinic put strict safeguards in place before allowing researchers to examine anonymous patient records for the international study.||phr.~Authorities must put a fair compensation system in place for participants harmed during an experimental medical trial.||phr.~The project director put emergency arrangements in place so that treatment could continue during a sudden power cut.",
    "without doubt": "phr.~Without doubt, genome editing offers medical possibilities that earlier generations of physicians could scarcely have imagined.||phr.~The repeated laboratory results established without doubt that the substance was responsible for the abnormal cell growth.||phr.~She was without doubt the most experienced surgeon available, yet she still explained the uncertainty surrounding the operation.",
    "finding": "n.~The study's most important finding was that early treatment reduced severe symptoms without causing additional genetic damage.||n.~Researchers presented their preliminary findings at the conference but warned that a larger trial was still required.||n.~The court's finding rested on evidence showing that the company had concealed known risks from participating patients.",
    "ripe": "adj.~After years of reliable laboratory work, the new treatment appeared ripe for a carefully controlled clinical trial.||adj.~The researcher selected only fully ripe fruit because its chemical composition matched the conditions required by the experiment.||adj.~Public concern made the moment ripe for a serious debate about ownership and protection of genetic information.",
    "a ripe old age": "phr.~The retired physician remained active until a ripe old age, continuing to advise younger doctors at the rural clinic.||phr.~Her grandfather reached the ripe old age of ninety-eight while preserving both his independence and lively curiosity.||phr.~Improved treatment has allowed many patients with the condition to live comfortably to a ripe old age.",
    "withdraw": "vt.~The manufacturer withdrew the artificial joint from sale after patients reported an unexpectedly high rate of failure.||vi.~One volunteer withdrew from the clinical trial when the possible side effects were explained in greater detail.||vt.~The journal withdrew the article because independent reviewers discovered serious weaknesses in the reported evidence and statistical method.",
    "equip": "vt.~The rehabilitation centre equipped each patient with a lightweight artificial limb adjusted to individual movement patterns.||vt.~The course equips future physicians with communication skills needed to discuss frightening diagnoses honestly and sensitively.||vt.~Rescue workers equipped the temporary clinic with clean water, emergency lighting and enough medicine for three days.",
    "artificial": "adj.~Engineers designed an artificial hand that responds to electrical signals from muscles in the user's remaining arm.||adj.~The interviewer offered an artificial smile that failed to hide her discomfort with the patient's direct question.||adj.~Artificial light in the laboratory is adjusted to reproduce the natural day-and-night cycle required by the cells.",
    "limb": "n.~The patient learned to control her artificial limb through months of demanding practice with a rehabilitation specialist.||n.~A falling tree limb damaged the clinic roof during the storm but caused no injury to patients inside.||n.~Doctors examined the injured lower limb for signs that blood flow had been restricted after the accident.",
    "rubber": "n.~A flexible rubber seal prevents water from entering the sensitive electronic parts inside the artificial hand.||n.~The nurse wore rubber gloves while cleaning the wound to reduce the risk of passing on an infection.||n.~Natural rubber behaves differently from synthetic rubber when exposed to extreme heat for a prolonged period.",
    "outgoing": "adj.~Her outgoing personality helped nervous patients feel comfortable while learning to use unfamiliar assistive technology during rehabilitation sessions.||adj.~The outgoing director secured funding for the rehabilitation programme before leaving the hospital at the end of June.||adj.~The receptionist recorded every outgoing call because several included confidential information about patient appointments and test results.",
    "grateful": "adj.~The patient was deeply grateful to the engineers for adjusting the device until it no longer caused pain.||adj.~We would be grateful if participants could report any discomfort immediately rather than waiting until the next appointment.||adj.~A grateful smile crossed his face when he moved the artificial hand independently for the first time.",
    "disabled": "adj.~Disabled athletes advised the design team on changes that would make the new training equipment safer and easier to use.||adj.~The lift remained disabled after the power failure, leaving wheelchair users unable to reach the second-floor clinic.||adj.~Modern guidance recommends saying disabled people or people with disabilities instead of language that defines them by limitation.",
    "disability": "n.~The redesigned entrance allows visitors with a physical disability to reach every public area without requesting assistance.||n.~A hidden disability may affect how someone learns or communicates even when no physical difference is immediately visible.||n.~The law protects employees from disability discrimination and requires employers to consider reasonable workplace adjustments before rejecting an applicant.",
    "conventional": "adj.~The patient combined conventional treatment with acupuncture only after discussing possible interactions and contraindications with her physician.||adj.~A conventional artificial limb provides support, whereas a sensory device can also send information back to the user.||adj.~The committee rejected conventional wisdom and invited disabled people to lead the discussion about accessible design.",
    "leather": "n.~The designer replaced the heavy leather strap with a washable material that caused less irritation during exercise.||n.~The museum displayed an early artificial limb made from wood, metal and carefully shaped leather beside modern lightweight models.||n.~Synthetic leather may be easier to clean, but some users prefer the flexibility of high-quality natural leather.",
    "sensory": "adj.~The experimental hand gives users limited sensory feedback when their fingers touch a hard or fragile object.||adj.~Damage to a sensory nerve can reduce the patient's ability to feel heat, pressure or sudden pain.||adj.~The crowded clinic created sensory overload for children who were unusually sensitive to noise and bright light.",
    "patent": "n.~The university filed a patent for the control system before sharing technical details with commercial manufacturers.||n.~Holding a patent does not prove that a medical device is safe, effective or affordable for ordinary patients.||n.~The researcher licensed her patent to a company that promised to provide the artificial limbs at a reasonable price.",
    "fuel": "vt.~Unverified stories about genetic experiments fuel public anxiety and make balanced discussion of genuine risks more difficult.||vt.~A small rechargeable battery fuels the sensor system that controls movement in the artificial hand throughout the day.||vt.~The successful trial fuelled demand for affordable devices among patients who had previously lacked suitable support.",
    "disturb": "vt.~It disturbed the patient to learn that the company had stored her genetic information without clear permission.||vt.~Please do not disturb the technician while she is adjusting the sensor that controls the artificial fingers.||vt.~The sudden alarm disturbed the carefully arranged test and forced the research team to collect the measurements again.",
    "tackle": "vt.~The engineering team tackled the problem head-on by inviting users to test each version of the artificial limb.||vt.~The physician tackled the anxious parent about repeatedly ignoring instructions designed to protect the child's recovery.||n.~A well-timed tackle stopped the player, but the collision also injured his wrist and ended his match.",
    "head-on": "adv.~The committee confronted the privacy problem head-on instead of hiding uncertainty behind vague technical language.||adj.~A head-on collision damaged the ambulance, although both medical workers escaped without severe physical injury.||adv.~The design team met criticism head-on and published the complete results of the unsuccessful early trial.",
    "adjust": "vt.~The technician adjusted the artificial hand until each finger closed smoothly around objects of different sizes.||vi.~Most patients need time to adjust to sensory feedback that initially feels unfamiliar or even slightly uncomfortable.||vt.~The teacher adjusted her pace after noticing that several students had not understood the difficult genetics example.",
    "go to great lengths to do sth": "phr.~Engineers went to great lengths to protect users' privacy while collecting movement data from the experimental device.||phr.~The clinic goes to great lengths to ensure that disabled patients can attend appointments without facing unnecessary barriers.||phr.~Responsible researchers should go to great lengths to explain uncertainty before asking volunteers to accept medical risk.",
    "acupuncture": "n.~Some patients use acupuncture alongside conventional medicine to relieve pain that has not responded to standard treatment.||n.~Researchers continue to investigate how acupuncture affects the nervous system and why individual responses differ considerably.||n.~The clinic offers acupuncture only after a qualified practitioner has reviewed the patient's health and current medication.",
    "needle": "n.~The practitioner inserted each thin needle carefully and asked the patient to report any sudden or severe pain.||n.~The instrument's needle moved sharply when the electrical pulse reached the damaged part of the circuit.||n.~A pine needle found inside the old medical book helped historians estimate where it had once been stored.",
    "evidence": "n.~There is solid scientific evidence that clean needles greatly reduce the risk of transmitting a serious infection.||n.~The physician gave evidence at the hearing about how the untested drug had affected several vulnerable patients.||n.~Researchers gathered further evidence before claiming that acupuncture produced benefits beyond a temporary placebo effect in routine care.",
    "solid": "adj.~The review found no solid evidence that the expensive treatment worked better than careful conventional care.||n.~Ice changes from a solid to a liquid when enough heat breaks the fixed structure of its molecules.||adj.~The clinic built a solid reputation by publishing negative findings as openly as successful treatment results.",
    "switch": "vi.~The clinic switched to single-use stainless steel needles to reduce infection risk and simplify sterilization procedures.||vt.~Please switch the monitor off before replacing the sensor attached to the patient's injured wrist during the examination.||n.~The sudden switch from conventional treatment to an experimental drug concerned both the physician and the family.",
    "stainless": "adj.~Stainless steel needles can be sterilized effectively and do not react easily with substances in human tissue.||adj.~The clinic replaced its damaged sink with a stainless surface that could be cleaned after every patient visit.||adj.~The biography presents the scientist as morally stainless, although surviving letters reveal several serious errors of judgement.",
    "steel": "n.~The manufacturer uses medical-grade steel for instruments that must remain strong during repeated high-temperature sterilization.||vt.~The young physician steeled herself to tell the family that the operation had not restored the patient's sight.||n.~Rising energy prices forced the regional steel industry to reduce production and delay a planned factory expansion.",
    "clinic": "n.~The community clinic treats minor infections and refers patients with severe symptoms to the central hospital.||n.~A weekly acupuncture clinic operates in the village hall for patients who cannot travel easily into the city.||n.~The university runs a legal clinic where students advise disabled clients under the supervision of qualified lawyers.",
    "examine": "vt.~The physician examined the patient's tongue and pulse before asking detailed questions about sleep, pain and appetite.||vt.~Independent reviewers examined whether the evidence actually supported the research team's claims about acupuncture in ordinary clinical practice.||vt.~Medical students are examined on both scientific knowledge and their ability to communicate respectfully with anxious patients.",
    "tongue": "n.~The practitioner asked the patient to put out her tongue so that its colour and surface could be examined.||n.~He bit his tongue rather than interrupt the physician with an angry response that he might later regret.||n.~Clear explanations in a patient's mother tongue can improve consent and reduce anxiety before an unfamiliar procedure.",
    "pulse": "n.~The nurse took the patient's pulse twice because the first reading was unusually rapid and slightly irregular.||n.~Electronic pulses from the sensor travel through the device and cause the artificial fingers to close around an object.||n.~The market district has a lively pulse that continues long after the nearby clinics and offices have closed.",
    "wrist": "n.~The practitioner felt the patient's pulse at the wrist before selecting points for the acupuncture treatment.||n.~A flexible support protected her injured wrist while still allowing enough movement for gentle rehabilitation exercises.||n.~The hospital identification band remained on his wrist until every medicine and final instruction had been checked.",
    "organ": "n.~The liver is a vital organ that processes harmful substances and performs hundreds of essential chemical functions.||n.~The patient waited several years for an organ transplant while doctors monitored her declining health carefully.||n.~The newspaper once served as an official organ of the political movement rather than an independent source of news.",
    "date back to": "phr.~Written records of acupuncture date back to ancient China, although some physical evidence may be even older.||phr.~The stone building dates back to the eighteenth century and originally housed the region's first public clinic.||phr.~Several medical instruments dating back to the 1920s are displayed in a locked case near the hospital entrance.",
    "severe": "adj.~The patient reported severe pain around the needle site, so the practitioner stopped the treatment immediately.||adj.~A severe shortage of qualified physicians has forced the rural clinic to reduce its opening hours.||adj.~The committee issued a severe criticism of researchers who had concealed evidence of dangerous side effects.",
    "anxiety": "n.~Clear information before the procedure can reduce anxiety and help patients make a genuinely informed decision.||n.~Her anxiety to return to work too quickly led her to ignore the physician's advice about proper recovery.||n.~Researchers measured anxiety levels before and after treatment rather than relying only on the patient's general impression.",
    "abuse": "vt.~The report warns that companies may abuse genetic information when deciding who receives insurance or employment opportunities.||n.~Clinic staff receive training on recognizing physical abuse and responding without placing vulnerable patients in greater danger.||vt.~The angry visitor abused the receptionist verbally until a security officer calmly escorted him from the department.",
    "alcohol": "n.~The physician explained that alcohol could interact dangerously with the drug prescribed for the patient's severe anxiety.||n.~An alcohol-free solution was used to clean equipment that would otherwise be damaged by the stronger chemical.||n.~Reducing alcohol consumption can improve sleep, lower blood pressure and decrease the risk of several chronic diseases.",
    "tobacco": "n.~Tobacco smoke damages lung tissue and increases the risk of cancer for smokers and people nearby.||n.~The government introduced a tobacco control law restricting advertising and sales to customers under the legal age.||n.~Farmers in the region once depended on tobacco but now grow fruit and medicinal plants instead.",
    "drug": "n.~The physician withdrew the drug after laboratory results showed that it was damaging the patient's liver.||n.~Researchers are testing whether the new drug remains effective against bacteria that resist conventional antibiotics in hospital infections.||vt.~The victim believed someone had drugged his drink because he could not remember leaving the crowded restaurant.",
    "phenomenon": "n.~The worldwide growth of acupuncture is a complex phenomenon shaped by culture, personal experience and scientific debate.||n.~Researchers observed the phenomenon repeatedly but could not yet explain the biological process responsible for it.||n.~Online health misinformation has become a widespread phenomenon that conventional public warnings alone have failed to control.",
    "substance": "n.~Laboratory tests identified the unknown substance as a chemical capable of causing severe skin irritation after prolonged contact.||n.~The accusation had no substance because every important claim had been contradicted by reliable medical records.||n.~In substance, the report argues that patient safety must take priority over speed, profit and professional reputation.",
    "symbol": "n.~The ancient needle became a symbol of traditional medicine even though modern practice uses very different materials.||n.~A red warning symbol appears whenever the device detects an abnormal pulse or a disconnected sensor.||n.~In chemical formulas, each symbol represents a particular element and must be written with the correct capital letters.",
    "widespread": "adj.~Widespread misuse of antibiotics has increased resistance and reduced the effectiveness of several important drugs used in hospitals.||adj.~The hospital faced widespread criticism after private patient records were discovered on an unprotected public website.||adj.~Acupuncture became widespread among patients seeking additional ways to manage persistent pain and anxiety alongside conventional care.",
    "bandage": "n.~The first-aid volunteer placed a sterile bandage over the wound and checked that circulation remained normal.||vt.~She bandaged the cyclist's injured wrist firmly enough to support it without restricting blood flow to the fingers.||n.~The nurse changed the wet bandage immediately because moisture around the wound could increase infection risk.",
    "infection": "n.~Cleaning the wound thoroughly before applying a bandage can greatly reduce the risk of bacterial infection.||n.~The chest infection became severe because the patient delayed seeking medical advice for more than a week.||n.~Clinic staff traced the infection to equipment that had not been sterilized after the previous procedure.",
    "department": "n.~The emergency department treated the injured cyclist before transferring him to a specialist surgical ward for further observation.||n.~The university's chemistry department tested the unknown substance for the local public health clinic after the incident.||n.~A department head reviewed the infection report and introduced stricter rules for cleaning shared medical equipment.",
}


FORM_BANK = {
    "surgeon": "surgeon 外科医生 / surgery 外科手术||operate (on sb) 给某人动手术||surgical 外科的||surgically 以外科手术方式||搭配：perform/undergo surgery；surgeon 是人，surgery 是手术或诊所",
    "physician": "physician 医师 / medicine 医学||practise medicine 行医 / treat 治疗||medical 医疗的||medically 在医学上||physician 较正式，尤指内科医师；physician's 仅作所有格",
    "chemist": "chemist 化学家；药剂师 / chemistry 化学||analyse/synthesize chemicals 分析／合成化学物质||chemical 化学的||chemically 在化学上||英式 at the chemist's 指“在药店”；美式常说 pharmacy/drugstore",
    "dentist": "dentist 牙医 / dentistry 牙科||practise dentistry 从事牙科工作||dental 牙齿的；牙科的||dentally 在牙科方面||词根 dent- 表“牙”：dental clinic / dental surgeon",
    "gene": "gene 基因 / genetics 遗传学 / geneticist 遗传学家||inherit/pass on a gene 遗传／传递基因||genetic 遗传的||genetically 在遗传上||gene 是可数名词；genetics 作学科时通常视为单数",
    "game-changing": "game changer 带来重大改变的人或事 / change 改变||change 改变||game-changing 改变局面的||in a game-changing way 以改变局面的方式||复合形容词通常置于名词前并保留连字符：a game-changing discovery",
    "genome": "genome 基因组 / genomics 基因组学||sequence/map a genome 测序／绘制基因组||genomic 基因组的||genomically 在基因组层面||gene 指单个遗传单位；genome 指一个生物体的全部遗传信息",
    "cell": "cell 细胞；小室 / cellular biology 细胞生物学||divide/grow 细胞分裂／生长||cellular 细胞的；蜂窝网络的||at the cellular level 在细胞层面||合成词：stem cell / blood cell / prison cell / solar cell",
    "being": "being 生物；存在 / existence 存在||be 存在；成为||existing 现存的 / human 人的||at present 目前（表达存在状态）||come into being = come into existence；for the time being 暂时",
    "lifespan": "lifespan 寿命 / longevity 长寿||live/survive 生存||lifelong 终身的 / long-lived 长寿的||throughout one's life 一生中||复合词 life + span；既可指生物寿命，也可指产品使用期限",
    "affect": "affect 影响（动词） / effect 影响（名词）||affect 影响；侵袭；打动；假装||affected 受影响的；做作的 / affective 情感的||affectively 在情感层面||易混：affect sth = have an effect on sth；affect 作名词时另有心理学专业义",
    "contract": "contract /ˈkɒntrækt/ 合同 / contraction 收缩||contract /kənˈtrækt/ 感染；收缩；订约||contractual 合同的 / contracted 收缩的||contractually 按合同||名词重音在前、动词重音在后；contract a disease / enter into a contract",
    "virus": "virus 病毒 / virology 病毒学 / virologist 病毒学家||infect 感染 / transmit 传播||viral 病毒的；迅速传播的||virally 以病毒方式；在网络上迅速传播||复数 viruses；go viral 在网络上爆红，不等于 spread a virus",
    "cancer": "cancer 癌症 / oncology 肿瘤学 / oncologist 肿瘤科医师||develop/treat cancer 患癌／治疗癌症||cancerous 癌变的||in a cancerous form 以癌变形式（常用短语）||cancer 通常不可数；a cancer 可指某种癌或社会“毒瘤”",
    "identify": "identity 身份 / identification 识别||identify 识别；确定 / identify with 认同||identifiable 可识别的 / identified 已确认的||identifiably 可辨认地||结构：identify sb/sth as...；identify A with B；identify with sb",
    "relate": "relation / relationship 关系 / relative 亲属||relate 联系；叙述||related 有关的 / relative 相对的||relatively 相对地||relate A to B；relate to sth 涉及；relate to sb 理解某人",
    "means": "means 手段；财力 / meaning 意义||mean 意味着；打算||meaningful 有意义的 / mean 吝啬的；平均的||meaningfully 有意义地||means 单复数同形：a means / several means；by means of 借助",
    "delete": "deletion 删除 / delete key 删除键||delete 删除||deleted 已删除的 / deletable 可删除的||permanently 永久地（常修饰 delete）||delete 源自拉丁语 delere“擦除、毁掉”，不能拆成现代英语 de- + -lete；常搭 delete a file/account",
    "relate to": "relation / relationship 关系||relate to 涉及；理解；与……相关||related to 与……有关的||in relation to 关于||to 为介词，后接名词或动名词；与 refer to / concern 区分",
    "restore": "restoration 恢复；修复 / restorer 修复者||restore 恢复；修复||restored 修复的 / restorative 恢复健康的||in a restorative way 以恢复性的方式（常用短语）||restore A to B 把 A 恢复到 B；restore order/confidence/sight",
    "ultimately": "ultimate result 最终结果||lead/result 最终导致||ultimate 最终的；根本的||ultimately 最终；从根本上说||可置句首修饰全句，也可置行为动词前：ultimately depend on",
    "abnormal": "abnormality 异常||deviate 偏离正常||abnormal 异常的 / normal 正常的||abnormally 异常地||构词 ab-（离开）+ normal；反义 normal，名词复数 abnormalities",
    "weapon": "weapon 武器 / weaponry 武器装备||weaponize 把……武器化||weaponized 武器化的||as a weapon 作为武器||可数名词；比喻搭配 a weapon in the fight against sth",
    "fundamental": "fundamental 基本原则 / fundamentals 基础知识||underlie 构成……基础||fundamental 根本的||fundamentally 根本上||be fundamental to sth；the fundamentals of sth 常用复数",
    "pace": "pace 速度；一步||pace 踱步；为……定速度||fast-paced 快节奏的 / paced 按节奏的||at a steady pace 以稳定速度||set/keep/gather pace；pace oneself 合理安排速度",
    "arise": "arising 出现 / origin 起因||arise 出现；起因；起身||arising 由此产生的||as a result 因而||arise 是不及物动词，无被动；过去式 arose，过去分词 arisen",
    "restrict": "restriction 限制||restrict 限制||restricted 受限的 / restrictive 限制性的||restrictively 限制性地||restrict A to B；restrict sb from doing；lift/impose restrictions",
    "prohibit": "prohibition 禁止||prohibit 禁止；阻止||prohibited 被禁止的 / prohibitive 高得令人却步的||prohibitively 过高地||prohibit sb from doing；不可用 prohibit sb to do",
    "resistance": "resistance 抵抗；抗性 / resistor 电阻器||resist 抵抗||resistant 有抵抗力的 / resistible 可抵抗的||with resistance 带着抵抗；in a resistant manner 以抵抗的方式||resistance/resistant 后均常接 to，to 是介词",
    "flu": "flu / influenza 流感||catch/have/recover from the flu||flu-related 流感相关的||severely 严重地（修饰 flu symptoms）||通常说 the flu；flu 的复数极少用，教材原句 flus 表不同流感类型",
    "characteristic": "characteristic 特征 / character 性格||characterize 以……为特征||characteristic 典型的||characteristically 典型地||a characteristic of；be characteristic of；characteristics 常用复数",
    "wrestle": "wrestling 摔跤 / wrestler 摔跤手||wrestle 摔跤；努力处理||wrestling 摔跤的||physically/mentally 在身体／思想上较量||wrestle with a problem；wrestle sb to the ground",
    "debate": "debate 辩论 / debater 辩手||debate 辩论；反复考虑||debatable 有争议的||debatably 可以争议地||debate sth / debate whether...；a debate on/about/over sth",
    "prohibit sb from doing sth": "prohibition 禁令||prohibit sb from doing sth 禁止某人做某事||prohibited 被禁止的||strictly 严格地（strictly prohibited）||from 为介词，后接动名词；正式法令语体",
    "wrestle with": "wrestling 较量 / struggle 挣扎||wrestle with 努力处理||wrestling 奋力应对的||painfully 艰难地||with 后接 problem/issue/conscience 等抽象名词",
    "put sth in place": "measure/system 制度措施||put sth in place 落实；安放||in place 到位的||properly 恰当地||sth 可为 controls/safeguards/policy/system；被动 be put in place",
    "without doubt": "doubt 怀疑 / certainty 确信||doubt 怀疑||doubtful 可疑的 / undoubted 无疑的||undoubtedly 无疑地||without/beyond doubt 作状语；there is no doubt that...",
    "finding": "finding 发现；裁定 / findings 研究结果||find 发现||found 已发现的||reportedly 据报道（常引 findings）||研究义常用复数 findings；the findings show/suggest/indicate that",
    "ripe": "ripeness 成熟||ripen （使）成熟||ripe 成熟的||at full ripeness 完全成熟时（常用短语）||the time is ripe for/to do；ripe for change；反义 unripe",
    "a ripe old age": "age 年龄 / longevity 长寿||age 变老||ripe 年高而健康的 / aged 年老的||healthily 健康地||固定搭配 live/reach the ripe old age of + 数字",
    "withdraw": "withdrawal 撤回；提款||withdraw 撤回；退出；取款||withdrawn 退缩的；撤回的||formally 正式地（withdraw formally）||过去式/分词 withdrew/withdrawn；withdraw A from B",
    "equip": "equipment 设备[U]||equip 配备；使有能力||equipped 配备好的||fully/well 充分地／良好地||equip A with B；equip sb to do；equipment 不可数",
    "artificial": "artificiality 人工性；不自然||create/make artificially 人工制造||artificial 人造的；不自然的||artificially 人工地||反义 natural；artificial intelligence/limb/light/smile",
    "limb": "limb 肢体；大树枝||lose/move a limb||limbless 无肢的 / artificial 人工的||with difficulty 困难地（移动肢体）||upper/lower limb；risk life and limb；不要与 branch 完全等同",
    "rubber": "rubber 橡胶；橡皮 / rubber band 橡皮筋||rub 擦（非 rubber 的动词形）||rubber 橡胶制的 / rubberized 涂橡胶的||elastically 有弹性地||材料义通常不可数；英式 a rubber 可指一块橡皮",
    "outgoing": "outgoing call/mail 外拨电话／外发邮件 / outgoing person 外向者||go out 外出；离任||outgoing 外向的；即将离任的||in a sociable way 以善于交际的方式（常用短语）||三义：外向的、离任的、向外的，均作前置定语或表语",
    "grateful": "gratitude 感激||thank 感谢 / appreciate 感激||grateful 感激的||gratefully 感激地||be grateful to sb for sth；I would be grateful if...",
    "disabled": "disability 残疾||disable 使失去能力；使停用||disabled 残疾的；停用的||accessibly 以无障碍方式（相关表达）||现代用语优先 disabled people / people with disabilities",
    "disability": "disability 残疾 / ability 能力||disable 使失去能力||disabled 残疾的||accessibly 以无障碍方式||复数 disabilities；physical/learning/hidden disability",
    "conventional": "convention 惯例 / conventionality 传统性||conform 遵循常规||conventional 传统的||conventionally 按常规||反义 unconventional；conventional medicine/weapons/wisdom",
    "leather": "leather 皮革[U]||tan leather 鞣制皮革||leather 皮革制的 / leathery 似皮革的||in leather 以皮革材料||材料义不可数；a leather jacket 中 leather 作前置定语",
    "sensory": "sense 感觉 / sensation 感受||sense 感觉到||sensory 感官的 / sensitive 敏感的||at a sensory level 在感官层面（常用短语）||sensory 指感官系统；sensitive 指容易感受或反应，勿混",
    "patent": "patent 专利 / patent holder 专利权人||patent 为……取得专利||patented 取得专利的 / patent 明显的||patently 明显地||apply/file for a patent；patent 也可作形容词“显然的”",
    "fuel": "fuel 燃料；刺激因素||fuel 加燃料；加剧||fuelled 受到推动的 / fuel-efficient 节能的||intensely 强烈地（fuel debate）||英式 fuelled/fuelling，常搭 fuel concern/fear/debate/demand",
    "disturb": "disturbance 打扰；骚乱||disturb 打扰；使不安||disturbed 不安的 / disturbing 令人不安的||disturbingly 令人不安地||disturb sb / disturb the peace；be disturbed by/at",
    "tackle": "tackle 处理；擒抱 / tackle equipment 用具||tackle 处理；擒抱；交涉||tackling 处理中的||head-on 正面地||及物动词直接接 problem/issue/opponent；tackle sb about sth",
    "head-on": "head-on collision 正面碰撞 / confrontation 正面对抗||meet/confront head-on 正面迎击||head-on 正面的||head-on 正面地||既可作形容词也可作副词；通常置于名词前或动词后",
    "adjust": "adjustment 调整||adjust 调整；适应||adjustable 可调的 / adjusted 调整后的||accordingly 相应地||adjust A to B；adjust to (doing) sth；make an adjustment",
    "go to great lengths to do sth": "length 长度；所费努力||go to great lengths 竭尽全力||lengthy 漫长的||greatly 极大地（相关副词）||to 是不定式符号；同义 spare no effort to do / make every effort to do",
    "acupuncture": "acupuncture 针灸 / acupuncturist 针灸师||perform/administer acupuncture 施针||acupuncture 针灸的（前置定语）||by acupuncture 通过针灸||通常不可数；have/receive/undergo acupuncture treatment",
    "needle": "needle 针 / needlework 针线活||needle 用针缝；刺激||needle-like 针状的||with a needle 用针||可数；thread/insert a needle；needle 也可作动词“刺激、挑衅”",
    "evidence": "evidence 证据[U]||evidence 证明（正式）||evident 明显的 / evidential 证据的||evidently 显然||evidence 不可数，不说 an evidence；a piece of evidence",
    "solid": "solid 固体 / solidity 坚固||solidify （使）凝固||solid 固体的；可靠的||solidly 坚固地||solid 可作名词和形容词；solid evidence/foundation/food/colour",
    "switch": "switch 开关；转变||switch 转换；开关；调换||switchable 可切换的 / switched 切换后的||abruptly 突然地（switch abruptly）||switch to/between；switch A with B；switch on/off",
    "stainless": "stainless steel 不锈钢||resist rust 防锈||stainless 不锈的；无污点的||spotlessly 一尘不染地||stain + -less；最常见于 stainless steel，不等于 stain-free 所有语境",
    "steel": "steel 钢 / steelworks 钢铁厂||steel oneself 使自己坚强||steel 钢制的 / steely 钢铁般的||with steely resolve 以钢铁般的决心（常用短语）||steel 是铁碳合金；steel oneself to do / for sth",
    "clinic": "clinic 诊所 / clinician 临床医师||run/attend a clinic||clinical 临床的||clinically 临床上||clinic 可指诊所或专科门诊；clinical trial 临床试验",
    "examine": "examination 检查；考试 / examiner 考官||examine 检查；审查；考核||examining 检查中的 / examinable 可考的||closely/carefully 仔细地||examine sb for sth；examine whether/how；be examined in/on",
    "tongue": "tongue 舌；语言||speak 用某种语言说||tongued 有……舌头的 / tongue-tied 说不出话的||sharply 尖刻地（speak sharply）||mother tongue；bite/hold one's tongue；tongue 也可指狭长陆地",
    "pulse": "pulse 脉搏；脉冲||pulse 搏动||pulsed 脉冲式的 / pulsating 跳动的||rhythmically 有节奏地||take/feel a pulse；pulse rate；也可指城市“活力脉搏”",
    "wrist": "wrist 手腕 / wristband 腕带||bend/support the wrist||wrist-worn 戴在腕上的||at the wrist 在手腕处||可数；by the wrist 抓住手腕；wristwatch 合成词",
    "organ": "organ 器官；风琴；机构 / organist 风琴师||function 运作 / play the organ||organic 器官的；有机的||organically 有机地||多义：body organ / pipe organ / governing organ / newspaper organ",
    "date back to": "date 日期；年代||date back to 追溯到||dated 有年代的 / dating back to 追溯到……的||historically 从历史上||无被动、通常用一般现在时；dating back to 可作后置定语",
    "severe": "severity 严重程度||intensify 加剧||severe 严重的；严厉的||severely 严重地||severe pain/weather/punishment/shortage；be severe with sb",
    "anxiety": "anxiety 焦虑；渴望||worry 担心||anxious 焦虑的；渴望的||anxiously 焦急地||anxiety about/over；anxiety to do；be anxious for/to do",
    "abuse": "abuse /əˈbjuːs/ 滥用；虐待||abuse /əˈbjuːz/ 滥用；辱骂||abusive 辱骂的；虐待的||abusively 辱骂地||名词与动词末音不同；abuse power/trust/drugs；verbal abuse",
    "alcohol": "alcohol 酒精；酒类 / alcoholism 酒精依赖||drink/consume alcohol||alcoholic 含酒精的；酒精依赖的||under the influence of alcohol 在酒精影响下（常用短语）||alcohol 泛指通常不可数；an alcohol 可指某类化学醇",
    "tobacco": "tobacco 烟草 / tobacconist 烟草商||grow/chew tobacco||tobacco-related 烟草相关的||through tobacco use 通过使用烟草||材料义通常不可数；tobacco products/industry/control",
    "drug": "drug 药物；毒品||drug 给……下药||drug-related 与药物／毒品相关的 / drugged 被下药的||medically 在医疗上||可数；drug 作“药”中性，作“毒品”由语境判断",
    "phenomenon": "phenomenon 现象||occur/happen 发生||phenomenal 非凡的||phenomenally 非凡地||希腊词复数 phenomena，不写 phenomenons（非正式偶见除外）",
    "substance": "substance 物质；实质 / substantiality 实质性||substantiate 证实||substantial 大量的；实质的||substantially 大幅地；实质上||in substance 实质上；have no substance 无事实依据",
    "symbol": "symbol 象征；符号 / symbolism 象征手法||symbolize 象征||symbolic 象征性的||symbolically 象征性地||symbol of；symbol stands for；与 sign/signal/mark 区分",
    "widespread": "spread 传播；范围||spread 传播||widespread 广泛的||widely 广泛地||widespread 通常只作形容词；副词用 widely，不用 widespreadly",
    "bandage": "bandage 绷带||bandage 用绷带包扎||bandaged 包扎好的||securely 牢固地（bandage securely）||可数名词；bandage a wound / apply a bandage to sth",
    "infection": "infection 感染 / infectivity 传染性||infect 感染||infected 被感染的 / infectious 传染性的||infectiously 有感染力地||infection with/by；risk/spread of infection；infectious disease",
    "department": "department 部门 / departmental division 部门划分||run/head a department||departmental 部门的||departmentally 按部门地||department of；department store；academic department",
}


COLLOCATION_BANK = {
    "surgeon": "the surgeon on call~值班外科医生~The surgeon on call reached the emergency department within ten minutes. 值班外科医生十分钟内赶到了急诊科。||a paediatric surgeon~小儿外科医生~A paediatric surgeon explained the operation in language the child could understand. 小儿外科医生用孩子能听懂的语言解释了手术。",
    "physician": "the physician-patient relationship~医患关系~Trust is central to the physician-patient relationship. 信任是医患关系的核心。||seek a second physician's opinion~征求另一位医生的意见~The family sought a second physician's opinion before accepting the treatment. 家人在接受治疗前征求了另一位医生的意见。",
    "chemist": "a forensic chemist~法医化学家~A forensic chemist identified the substance found on the damaged container. 法医化学家鉴定了受损容器上的物质。||an industrial chemist~工业化学家~The industrial chemist developed a safer process for producing the material. 工业化学家开发了更安全的材料生产工艺。",
    "dentist": "a paediatric dentist~儿童牙医~The paediatric dentist showed the nervous child every instrument before beginning. 儿童牙医在开始前向紧张的孩子展示了每件器械。||dentist-approved toothpaste~牙医认可的牙膏~The clinic recommends a dentist-approved toothpaste containing enough fluoride. 诊所推荐含足量氟化物的牙医认可牙膏。",
    "gene": "a dominant / recessive gene~显性／隐性基因~A recessive gene may remain hidden for several generations. 隐性基因可能隐藏数代。||turn a gene on or off~开启或关闭基因~Environmental signals can turn a gene on or off. 环境信号可以开启或关闭基因。",
    "game-changing": "a potentially game-changing approach~可能带来重大改变的方法~Researchers described the approach as potentially game-changing but still experimental. 研究人员称该方法可能改变局面，但仍处于实验阶段。||game-changing potential~改变局面的潜力~The device has game-changing potential for patients in remote communities. 该设备对偏远社区患者具有改变局面的潜力。",
    "genome": "a reference genome~参考基因组~The team compared each sample with a carefully checked reference genome. 团队将每个样本与经核查的参考基因组比较。||genome-wide analysis~全基因组分析~A genome-wide analysis revealed several unexpected patterns. 全基因组分析揭示了若干意外规律。",
    "cell": "a cell culture~细胞培养物~The laboratory kept the cell culture at a constant temperature. 实验室将细胞培养物保持在恒温下。||cell death~细胞死亡~The treatment slowed abnormal cell growth without increasing healthy cell death. 该疗法减缓异常细胞生长且未增加健康细胞死亡。",
    "being": "one's whole being~整个身心~A sense of relief spread through her whole being. 如释重负的感觉传遍她的整个身心。||a rational being~有理性的存在者~The law treats every adult as a rational being capable of informed choice. 法律将每位成年人视为能够知情选择的理性主体。",
    "lifespan": "a limited operational lifespan~有限的工作寿命~Every battery has a limited operational lifespan. 每块电池的工作寿命都有限。||lifespan variation~寿命差异~The study examined lifespan variation across genetically similar animals. 研究考察了遗传相近动物之间的寿命差异。",
    "affect": "affect the outcome~影响结果~A small measurement error can affect the outcome of the entire trial. 一个小的测量误差会影响整个试验结果。||affect sb emotionally~在情感上影响某人~The patient's story affected every member of the medical team emotionally. 患者的故事在情感上打动了医疗团队每个人。",
    "contract": "a legally binding contract~具有法律约束力的合同~Both parties signed a legally binding contract after reviewing every clause. 双方审阅所有条款后签署了具有法律约束力的合同。||contract sharply~急剧收缩~The damaged muscle contracted sharply when the physician touched it. 医生触碰时受损肌肉急剧收缩。",
    "virus": "a highly contagious virus~传染性极强的病毒~A highly contagious virus spread rapidly through the crowded shelter. 一种传染性极强的病毒在拥挤的避难所迅速传播。||a virus mutates~病毒发生变异~The virus mutates often enough to complicate vaccine development. 该病毒频繁变异，增加了疫苗研发难度。",
    "cancer": "cancer prevention~癌症预防~The campaign emphasizes cancer prevention as well as early detection. 该活动既强调癌症预防，也强调早期发现。||cancer goes into remission~癌症进入缓解期~Her cancer went into remission after several months of treatment. 数月治疗后，她的癌症进入缓解期。",
    "identify": "identify a risk factor~确定风险因素~The review identified smoking as a major risk factor. 该综述将吸烟确定为主要风险因素。||identify by name~叫出名字；确认姓名~The witness could identify only one visitor by name. 目击者只能说出一位访客的姓名。",
    "relate": "relate one event to another~把一件事与另一件事联系起来~The report relates the rise in infections to delayed treatment. 报告把感染上升与延误治疗联系起来。||relate the facts accurately~准确叙述事实~The witness related the facts accurately and without exaggeration. 目击者准确且不夸张地叙述了事实。",
    "means": "the means by which...~……所凭借的手段~The report explains the means by which the virus enters a cell. 报告解释了病毒进入细胞的方式。||means-tested support~按经济状况审查的援助~The clinic offers means-tested support to low-income patients. 诊所向低收入患者提供经经济状况审查的援助。",
    "delete": "delete without recovery~彻底删除且无法恢复~The system can delete sensitive files without recovery. 该系统可彻底删除敏感文件且无法恢复。||mark sth for deletion~将某物标记为待删除~Reviewers marked the duplicated paragraph for deletion. 审稿人将重复段落标记为待删除。",
    "relate to": "relate to everyday experience~与日常经验相关~The teacher made genetics relate to everyday experience. 老师让遗传学与日常经验建立联系。||closely relate to health~与健康密切相关~Sleep patterns closely relate to both physical and mental health. 睡眠模式与身心健康密切相关。",
    "restore": "restore a function~恢复功能~The device restored limited movement to the patient's hand. 该设备使患者的手恢复了有限活动能力。||fully restore sth~完全恢复某物~The backup fully restored the deleted medical records. 备份完全恢复了被删除的病历。",
    "ultimately": "ultimately determine sth~最终决定某事~Patient safety must ultimately determine whether the trial continues. 患者安全必须最终决定试验是否继续。||ultimately unsuccessful~最终未成功的~The first attempt was ultimately unsuccessful despite promising early results. 第一次尝试虽早期结果可喜，但最终未成功。",
    "abnormal": "an abnormal response to sth~对某物的异常反应~The patient showed an abnormal response to the standard dose. 患者对标准剂量出现异常反应。||return to normal from abnormal~从异常恢复正常~The pulse gradually returned to normal from an abnormal rhythm. 脉搏逐渐从异常节律恢复正常。",
    "weapon": "turn sth into a weapon~把某物变成武器~Private data should never be turned into a weapon against patients. 私人数据绝不能成为针对患者的武器。||conceal a weapon~藏匿武器~Security officers discovered that the visitor had concealed a weapon. 安保人员发现该访客藏匿了武器。",
    "fundamental": "a fundamental assumption~基本假设~The study rests on a fundamental assumption that has not been tested. 该研究建立在一个未经检验的基本假设上。||remain fundamentally unchanged~根本上保持不变~The ethical question remains fundamentally unchanged despite the new technology. 尽管技术更新，道德问题根本上没有改变。",
    "pace": "a relentless pace~不停歇的节奏~Medical staff struggled to maintain the relentless pace throughout the emergency. 医护人员在整个紧急事件中勉力维持不停歇的节奏。||force the pace~加快步伐~Commercial pressure should not force the pace of a clinical trial. 商业压力不应迫使临床试验加快步伐。",
    "arise": "arise unexpectedly~意外出现~A technical problem arose unexpectedly during the final test. 最终测试期间意外出现了技术问题。||a dispute arises over sth~因某事产生争议~A dispute arose over who owned the genetic data. 围绕遗传数据归属产生了争议。",
    "restrict": "restrict the flow of sth~限制某物的流动~The tight bandage restricted the flow of blood to her hand. 过紧的绷带限制了流向她手部的血液。||restrictive criteria~限制性标准~Overly restrictive criteria excluded many suitable volunteers. 过度限制性的标准排除了许多合适志愿者。",
    "prohibit": "prohibit entry~禁止进入~A red sign prohibits entry to the high-risk laboratory. 红色标志禁止进入高风险实验室。||a prohibitive cost~高得令人却步的费用~The device's prohibitive cost prevents widespread use. 该设备高昂到令人却步的成本阻碍了普及。",
    "resistance": "offer resistance~进行抵抗~The damaged lock offered little resistance to the rescue team. 损坏的锁几乎未对救援队形成阻力。||resistance develops~抗性形成~Resistance develops when antibiotics are repeatedly misused. 反复滥用抗生素会形成抗性。",
    "flu": "a severe case of flu~一场严重流感~A severe case of flu kept the physician away from work for a week. 一场严重流感让这位医生停工一周。||flu-like symptoms~流感样症状~Several volunteers reported mild flu-like symptoms after vaccination. 数名志愿者接种后报告了轻微流感样症状。",
    "characteristic": "possess a characteristic~具有某种特征~Each sample possessed a characteristic pattern under the microscope. 每个样本在显微镜下都有一种特征性图样。||characteristically cautious~一贯谨慎的~The physician was characteristically cautious about promising a cure. 这位医生一贯谨慎，不轻易承诺治愈。",
    "wrestle": "wrestle with uncertainty~努力应对不确定性~Families often wrestle with uncertainty while waiting for test results. 家人在等待检测结果时常努力应对不确定感。||wrestle away from sb~从某人手中奋力夺走~The guard wrestled the dangerous instrument away from the intruder. 警卫从闯入者手中奋力夺走危险器械。",
    "debate": "the subject of debate~争论的主题~Ownership of genetic information remains the subject of debate. 遗传信息的所有权仍是争论主题。||debate the merits of sth~辩论某事的优点~The panel debated the merits of early genetic screening. 专家组辩论了早期基因筛查的优点。",
    "prohibit sb from doing sth": "rules prohibit staff from sharing data~规定禁止员工共享数据~The rules prohibit staff from sharing identifiable data externally. 规定禁止员工向外部共享可识别数据。||prohibit a company from using sth~禁止公司使用某物~The law prohibits a company from using genetic results unfairly. 法律禁止公司不公平使用遗传检测结果。",
    "wrestle with": "wrestle with competing duties~努力权衡相互冲突的责任~Physicians sometimes wrestle with competing duties to patients and families. 医生有时要努力权衡对患者和家属的冲突责任。||wrestle with the implications~努力思考影响~The class wrestled with the implications of editing inherited genes. 全班努力思考编辑遗传基因的影响。",
    "put sth in place": "put consent procedures in place~落实知情同意程序~The team put clear consent procedures in place before recruitment. 团队在招募前落实了清晰的知情同意程序。||put protections firmly in place~切实落实保护措施~Regulators put privacy protections firmly in place. 监管者切实落实了隐私保护措施。",
    "without doubt": "know without doubt~确定无疑地知道~Doctors cannot know without doubt how every patient will respond. 医生无法确定每位患者会如何反应。||an expert without doubt~毫无疑问的专家~She is without doubt an expert in medical ethics. 她毫无疑问是医学伦理专家。",
    "finding": "a robust finding~可靠的研究发现~The result became a robust finding after three independent studies. 三项独立研究后，该结果成为可靠发现。||findings remain inconclusive~研究结果仍无定论~The findings remain inconclusive because the sample was too small. 由于样本太小，研究结果仍无定论。",
    "ripe": "ripe for investigation~适合深入调查~The unexplained pattern is ripe for further investigation. 这一未解释的规律适合进一步调查。||overripe fruit~熟过头的水果~Overripe fruit produced unreliable measurements in the experiment. 熟过头的水果使实验测量不可靠。",
    "a ripe old age": "survive to a ripe old age~活到高龄~Many patients now survive to a ripe old age with proper treatment. 许多患者在适当治疗下如今能活到高龄。||the remarkably ripe old age of...~令人惊叹的高龄……~The former surgeon reached the remarkably ripe old age of one hundred. 这位前外科医生高寿至一百岁。",
    "withdraw": "withdraw a claim~撤回说法~The researcher withdrew the claim after new evidence appeared. 新证据出现后，研究人员撤回了说法。||withdraw gradually~逐步退出／撤回~The clinic withdrew the medicine gradually under medical supervision. 诊所在医疗监督下逐步停用了该药。",
    "equip": "poorly equipped~装备不足的~The poorly equipped rural clinic cannot perform complex surgery. 装备不足的乡村诊所无法进行复杂手术。||equip a device with sensors~给设备配备传感器~Engineers equipped the artificial hand with pressure sensors. 工程师给人工手配备了压力传感器。",
    "artificial": "artificially enhanced~人工增强的~The debate concerns whether artificially enhanced abilities should be permitted. 争论涉及是否应允许人工增强能力。||an artificial distinction~人为的区分~The report draws an artificial distinction between two similar conditions. 报告在人为区分两种相似状况。",
    "limb": "a prosthetic limb~假肢~The athlete trained for months with a newly fitted prosthetic limb. 运动员佩戴新适配的假肢训练数月。||regain use of a limb~恢复肢体功能~Therapy helped the patient regain use of the injured limb. 治疗帮助患者恢复了受伤肢体的功能。",
    "rubber": "rubber tubing~橡胶管~Flexible rubber tubing carried air through the testing device. 柔性橡胶管把空气输送通过测试设备。||rubber deteriorates~橡胶老化~Natural rubber deteriorates when repeatedly exposed to strong sunlight. 天然橡胶反复暴晒会老化。",
    "outgoing": "an outgoing message~外发信息~Every outgoing message containing patient data is encrypted. 每条含患者数据的外发信息都会加密。||outgoing and approachable~外向且平易近人的~The new therapist is outgoing and approachable without being intrusive. 新治疗师外向亲切但不过分打扰。",
    "grateful": "grateful acknowledgement~感激的致谢~The report includes a grateful acknowledgement of the volunteers' contribution. 报告对志愿者的贡献表达了感激。||remain grateful for sth~一直感激某事~She remained grateful for the clinic's patient support. 她一直感激诊所耐心的支持。",
    "disabled": "temporarily disabled~暂时失灵的／暂时失去能力的~The safety system was temporarily disabled during the repair. 安全系统维修期间暂时停用。||disabled-friendly facilities~方便残疾人士的设施~The new clinic includes disabled-friendly facilities throughout. 新诊所各处都设有方便残疾人士的设施。",
    "disability": "acquire a disability~后天形成残疾~Some patients acquire a disability after illness or injury. 一些患者在疾病或受伤后形成残疾。||disability inclusion~残疾融合~Disability inclusion requires removing physical and social barriers. 残疾融合要求消除物理和社会障碍。",
    "conventional": "by conventional standards~按传统标准~By conventional standards, the experimental design appears unusual. 按传统标准，这一实验设计显得不同寻常。||a conventional battery~普通电池~The prototype runs for two days on a conventional battery. 原型机使用普通电池可运行两天。",
    "leather": "a leather covering~皮革外层~A soft leather covering protected the user's skin from the metal frame. 柔软的皮革外层保护使用者皮肤免受金属框架摩擦。||tanned leather~鞣制皮革~The museum tested the tanned leather before restoring the historic limb. 博物馆在修复历史假肢前检测了鞣制皮革。",
    "sensory": "sensory data~感官数据~The artificial hand converts pressure into sensory data for the user. 人工手把压力转化为使用者的感官数据。||sensory function~感觉功能~The treatment restored limited sensory function in two fingers. 治疗使两根手指恢复了有限感觉功能。",
    "patent": "patent protection~专利保护~Patent protection allows the inventor to control commercial use temporarily. 专利保护使发明者能暂时控制商业使用。||a patent expires~专利到期~The patent expires next year, allowing other firms to manufacture the device. 该专利明年到期，届时其他公司可生产该设备。",
    "fuel": "fuel a controversy~加剧争议~The leaked report fuelled a controversy over patient consent. 泄露的报告加剧了有关患者同意的争议。||fuel consumption~燃料消耗~The mobile clinic reduced fuel consumption by planning shorter routes. 流动诊所通过规划更短路线降低了燃料消耗。",
    "disturb": "disturb a delicate balance~扰乱微妙平衡~The treatment may disturb a delicate chemical balance in the body. 治疗可能扰乱体内微妙的化学平衡。||deeply disturbing~令人深感不安的~The hidden use of patient data is deeply disturbing. 隐瞒使用患者数据令人深感不安。",
    "tackle": "tackle a person fairly~对某人进行合理交涉~The manager tackled the supplier fairly about the repeated defects. 经理就反复出现的缺陷与供应商进行了合理交涉。||a coordinated tackle of sth~对某问题的协同处理~A coordinated tackle of infection requires every department to cooperate. 协同处理感染问题需要各部门合作。",
    "head-on": "a head-on challenge~正面挑战~The report presents a head-on challenge to conventional medical practice. 报告对传统医疗实践提出正面挑战。||avoid a head-on conflict~避免正面冲突~The physician explained the evidence calmly to avoid a head-on conflict. 医生平静解释证据以避免正面冲突。",
    "adjust": "adjust for age~针对年龄进行校正~Researchers adjusted the results for age and existing illness. 研究人员针对年龄和既有疾病校正了结果。||a minor adjustment~小幅调整~A minor adjustment made the artificial hand much more comfortable. 一次小幅调整让人工手舒适得多。",
    "go to great lengths to do sth": "go to great lengths to preserve dignity~竭尽全力维护尊严~Staff went to great lengths to preserve every patient's dignity. 员工竭尽全力维护每位患者的尊严。||the extraordinary lengths taken to...~为……所付出的非凡努力~The report describes the extraordinary lengths taken to verify the evidence. 报告描述了为核实证据所付出的非凡努力。",
    "acupuncture": "acupuncture research~针灸研究~Acupuncture research increasingly uses controlled trials and measurable outcomes. 针灸研究越来越多采用对照试验和可测量结果。||administer acupuncture~施行针灸~Only a trained practitioner should administer acupuncture in the clinic. 诊所内只有受训从业者应施行针灸。",
    "needle": "a blunt / sterile needle~钝针／无菌针~The nurse replaced the needle with a sterile one before the injection. 护士在注射前将针换成无菌针。||needle-shaped leaves~针状叶~The plant's needle-shaped leaves reduce water loss in winter. 这种植物的针状叶可减少冬季水分流失。",
    "evidence": "a body of evidence~一整套证据~A growing body of evidence supports early treatment. 越来越多的证据支持早期治疗。||evidence points to sth~证据指向某事~The available evidence points to contamination during storage. 现有证据指向储存期间的污染。",
    "solid": "a solid mass~固体块~The material cooled into a solid mass within seconds. 材料数秒内冷却成固体块。||solidly constructed~结构坚固的~The mobile clinic is solidly constructed for rough mountain roads. 流动诊所结构坚固，适合崎岖山路。",
    "switch": "switch allegiance~改变支持立场~Two committee members switched allegiance after reading the safety report. 两名委员读完安全报告后改变了支持立场。||at the flick of a switch~轻按开关即可~The monitor starts at the flick of a switch. 轻按开关，显示器便会启动。",
    "stainless": "remain stainless~保持无锈无污~The instrument remained stainless after repeated cleaning. 器械反复清洗后仍无锈迹。||stainless reputation~无瑕的声誉~No public official can assume that his reputation is stainless. 没有公职人员可以认定自己的声誉毫无污点。",
    "steel": "reinforced steel~钢筋／强化钢材~The clinic entrance uses reinforced steel for earthquake protection. 诊所入口使用强化钢材防震。||steel one's nerves~鼓起勇气~The young doctor steeled her nerves before entering the operating room. 年轻医生在进入手术室前鼓起勇气。",
    "clinic": "a specialist clinic~专科门诊~The hospital opened a specialist clinic for rare genetic disorders. 医院开设了罕见遗传病专科门诊。||clinic hours~门诊时间~Clinic hours were extended to serve working patients. 为服务在职患者，门诊时间延长了。",
    "examine": "examine a claim critically~批判性审查说法~Students examined the medical claim critically before accepting it. 学生在接受医学说法前对其进行了批判性审查。||an examining physician~检查医师~The examining physician recorded every visible sign of infection. 检查医师记录了每个可见感染迹象。",
    "tongue": "a coated tongue~舌苔厚的舌头~A coated tongue can have several causes and does not prove one diagnosis. 舌苔厚可能有多种原因，不能证明单一诊断。||on the tip of one's tongue~话到嘴边；一时想不起~The technical term was on the student's tongue but would not come out. 那个术语学生就在嘴边却说不出来。",
    "pulse": "a pulse of energy~一阵能量脉冲~A short pulse of energy activates the sensor. 一阵短促能量脉冲会启动传感器。||the pulse quickens~脉搏加快~The patient's pulse quickened when the severe pain returned. 剧痛复发时，患者脉搏加快。",
    "wrist": "wrist mobility~手腕活动度~Gentle exercise gradually improved wrist mobility. 温和锻炼逐渐改善了手腕活动度。||a wrist-worn sensor~腕戴式传感器~A wrist-worn sensor recorded the patient's pulse throughout the night. 腕戴式传感器整夜记录患者脉搏。",
    "organ": "organ function~器官功能~Regular blood tests allow physicians to monitor organ function. 定期验血使医生能够监测器官功能。||an organ of government~政府机关~The agency operates as an independent organ of government. 该机构作为独立政府机关运作。",
    "date back to": "can be dated back to...~可追溯到……（不推荐的被动）~Use dates back to rather than the unnecessary passive can be dated back to. 应用 dates back to，避免不必要的被动。||date back several centuries~追溯数百年~The medical tradition dates back several centuries. 这一医疗传统可追溯数百年。",
    "severe": "severely limit sth~严重限制某事~The shortage severely limits treatment in remote areas. 这一短缺严重限制偏远地区的治疗。||severe consequences~严重后果~Ignoring infection control can have severe consequences. 忽视感染控制会造成严重后果。",
    "anxiety": "heightened anxiety~加剧的焦虑~Unclear instructions caused heightened anxiety among patients. 含糊指示加剧了患者焦虑。||anxiety subsides~焦虑减退~Her anxiety subsided once the physician explained the results. 医生解释结果后，她的焦虑减退了。",
    "abuse": "abuse of authority~滥用职权~The inquiry uncovered serious abuse of authority. 调查揭露了严重的职权滥用。||a pattern of abuse~持续的虐待模式~Staff were trained to recognize a pattern of abuse. 员工接受培训以识别持续的虐待模式。",
    "alcohol": "excessive alcohol intake~过量饮酒~Excessive alcohol intake can damage the liver. 过量饮酒会损害肝脏。||pure alcohol~纯酒精~The solution contains a small amount of pure alcohol. 该溶液含少量纯酒精。",
    "tobacco": "tobacco-related disease~烟草相关疾病~The clinic treats many patients with tobacco-related disease. 诊所治疗许多烟草相关疾病患者。||raw tobacco leaf~生烟叶~Workers wore masks while handling raw tobacco leaf. 工人处理生烟叶时佩戴口罩。",
    "drug": "a prescription drug~处方药~The prescription drug must be taken exactly as directed. 处方药必须严格遵医嘱服用。||drug withdrawal~停药；戒毒反应~Sudden drug withdrawal can require medical supervision. 突然停药可能需要医疗监督。",
    "phenomenon": "a poorly understood phenomenon~尚未充分理解的现象~The reaction remains a poorly understood phenomenon. 这种反应仍是一个尚未充分理解的现象。||phenomenal growth~惊人的增长~The clinic experienced phenomenal growth after expanding its services. 诊所扩展服务后实现惊人增长。",
    "substance": "a substance dissolves~物质溶解~The substance dissolves completely in warm water. 该物质在温水中完全溶解。||substantial evidence~大量有力证据~The review found substantial evidence of unsafe practice. 综述发现了大量不安全操作的有力证据。",
    "symbol": "a universally understood symbol~普遍理解的符号~The red cross is a widely recognized medical symbol. 红十字是广为认可的医疗符号。||symbolic importance~象征意义~The old clinic has symbolic importance for the community. 老诊所对社区具有象征意义。",
    "widespread": "widespread availability~广泛可获得性~Widespread availability does not guarantee safe use. 广泛可获得并不保证安全使用。||spread widely~广泛传播~The unsupported claim spread widely online. 这一无依据说法在网上广泛传播。",
    "bandage": "bandage sth tightly / loosely~把某处包扎得紧／松~Do not bandage the wrist so tightly that circulation is restricted. 不要把手腕包扎得过紧以致血液循环受限。||a pressure bandage~加压绷带~The first-aid worker applied a pressure bandage to control bleeding. 急救员使用加压绷带控制出血。",
    "infection": "infection takes hold~感染开始加重~The wound was cleaned before infection could take hold. 伤口在感染加重前得到清理。||cross-infection~交叉感染~Separate equipment reduces the risk of cross-infection. 分开使用器材可降低交叉感染风险。",
    "department": "a departmental meeting~部门会议~The infection report was discussed at a departmental meeting. 感染报告在部门会议上讨论。||transfer between departments~在部门间调动~The nurse transferred between departments during the emergency. 紧急期间，这名护士在部门间调动。",
}


SYNONYM_BANK = {
    "surgeon": [
        ("physician", "医师（辨析）", "The physician referred the patient to a heart surgeon.", "作可数名词；physician 诊断、用药，surgeon 实施手术；典型搭配 consult a physician / a heart surgeon。"),
        ("medical specialist", "医学专科医生", "A medical specialist reviewed the unusual test results.", "作可数名词；范围比 surgeon 广；典型搭配 a specialist in cardiology / a specialist surgeon。"),
    ],
    "physician": [("medical practitioner", "执业医师", "Every medical practitioner must protect patient confidentiality.", "作可数名词，正式；典型搭配 a licensed medical practitioner；physician 更常指具体诊疗医生。")],
    "chemist": [
        ("chemical scientist", "化学科研人员", "The chemical scientist tested the stability of the compound.", "作可数名词，解释性表达；典型搭配 a research chemist；chemist 比 chemical scientist 更自然。"),
        ("druggist", "药剂师；药商（旧式美语）", "The old novel describes a village druggist preparing medicine.", "作可数名词，现较旧；典型搭配 a village druggist；现代美语通常用 pharmacist。"),
    ],
    "dentist": [
        ("dental surgeon", "牙科医生；口腔外科医生", "The dental surgeon removed the damaged tooth.", "作可数名词；典型搭配 consult a dental surgeon；更强调外科处理。"),
        ("orthodontist", "正畸专科医生", "The orthodontist adjusted the teenager's braces.", "作可数名词；典型搭配 see an orthodontist；是 dentist 的专科下位词，不可完全互换。"),
    ],
    "gene": [
        ("allele", "等位基因", "A child receives one allele from each parent.", "作可数名词；典型搭配 a dominant/recessive allele；allele 是同一 gene 的不同版本。"),
        ("genetic factor", "遗传因素", "The disease involves both genetic and environmental factors.", "作可数名词短语；典型搭配 a genetic risk factor；范围比 gene 广。"),
    ],
    "game-changing": [("transformative", "带来深刻改变的", "The treatment could have a transformative effect on rural care.", "作前置定语或表语；典型搭配 transformative effect/change；比 game-changing 更正式。")],
    "genome": [
        ("genetic blueprint", "遗传蓝图（比喻）", "The genome is often described as a genetic blueprint.", "作可数名词短语；典型搭配 decode a genetic blueprint；是解释性比喻，并非严格同义词。"),
        ("genetic material", "遗传物质", "The virus carries its genetic material inside a protein shell.", "作不可数名词短语；典型搭配 carry genetic material；范围可小于或大于完整 genome。"),
    ],
    "cell": [
        ("compartment", "小隔间（小室义）", "The samples were stored in a sealed compartment.", "作可数名词；典型搭配 a sealed compartment；只对应 cell 的“小室”义，不指生物细胞。"),
        ("battery", "电池（电学义）", "The device runs on a rechargeable battery.", "作可数名词；典型搭配 a rechargeable battery；cell 是单个电池单元，battery 可由多个 cells 构成。"),
    ],
    "cancer": [
        ("malignancy", "恶性肿瘤；恶性状态", "Tests found no sign of malignancy.", "作可数或不可数名词；典型搭配 detect/treat a malignancy；医学语体比 cancer 更专业。"),
        ("carcinoma", "癌；癌瘤（专业）", "The biopsy confirmed an early-stage carcinoma.", "作可数名词；典型搭配 an invasive carcinoma；只指上皮组织癌，是 cancer 的下位词。"),
    ],
    "abnormal": [("anomalous", "异常的；反常的（正式）", "The team investigated an anomalous reading.", "作前置定语或表语；典型搭配 anomalous data/result；比 abnormal 更书面、强调偏离规律。")],
    "weapon": [("tool", "工具；手段", "Education is a powerful tool against prejudice.", "作可数名词；典型搭配 a tool for/against；中性，weapon 作比喻时更强调对抗性。")],
    "pace": [("tempo", "节奏；速度", "The conductor increased the tempo gradually.", "作可数名词；典型搭配 a fast/slow tempo；多用于音乐，pace 适用范围更广。")],
    "arise": [("happen", "发生", "Unexpected complications happened during the operation.", "作不及物动词；典型搭配 something happens unexpectedly；happen 更口语，arise 常搭 problem/need/question。")],
    "restrict": [("constrain", "限制；约束", "Limited funding constrained the size of the trial.", "作及物动词；典型搭配 constrain growth/choice；语体正式，强调条件造成的束缚。")],
    "resistance": [("resilience", "恢复力；韧性", "Regular exercise can improve physical resilience.", "作不可数名词；典型搭配 build resilience；resistance 是抵抗，resilience 是受冲击后的恢复力。")],
    "flu": [
        ("influenza", "流行性感冒（正式全称）", "Influenza can cause severe illness in older adults.", "作不可数名词；典型搭配 seasonal influenza；正式医学语体，flu 是缩略口语形式。"),
        ("viral illness", "病毒性疾病", "The child recovered quickly from the viral illness.", "作可数名词短语；典型搭配 a mild/severe viral illness；范围比 flu 广。"),
    ],
    "wrestle": [("contend", "奋力应对；争夺", "Researchers must contend with limited evidence.", "作不及物动词，典型搭配 contend with a problem；比 wrestle with 更正式、形象性较弱。")],
    "prohibit sb from doing sth": [("prevent sb from doing sth", "阻止某人做某事", "The failure prevented staff from accessing the records.", "及物结构 prevent sb from doing；搭配与 prohibit 相同，但 prevent 不含法律禁令义。")],
    "wrestle with": [("contend with", "费力应对", "The clinic contended with a severe staff shortage.", "不及物短语，后接 problem/pressure/shortage；比 wrestle with 更正式、比喻色彩较弱。")],
    "put sth in place": [("implement", "实施；落实", "The hospital implemented a stricter privacy policy.", "作及物动词，直接接 policy/system/measure；put sth in place 更强调准备到位。")],
    "without doubt": [("certainly", "当然；无疑", "The treatment is certainly worth further study.", "作句子副词，位于助动词后或实义动词前；典型搭配 certainly true/important。")],
    "finding": [("discovery", "发现", "The discovery changed how the disease was treated.", "作可数名词；典型搭配 make a discovery；finding 强调调查结果，discovery 强调首次发现。")],
    "ripe": [
        ("ready", "准备好的；时机成熟的", "The proposal is ready for public discussion.", "作表语，典型搭配 ready for/to do；ripe for 更形象，常指条件已经成熟。"),
        ("mellow", "熟透醇美的", "The fruit becomes mellow after several days.", "作表语或前置定语；典型搭配 mellow fruit/flavour；强调熟成后的柔和，范围比 ripe 窄。"),
    ],
    "a ripe old age": [
        ("great age", "高龄", "The physician continued working to a great age.", "作名词短语；典型搭配 live to a great age；中性，不含 ripe old age 的健康长寿色彩。"),
        ("longevity", "长寿", "Regular exercise contributed to her longevity.", "作不可数名词；典型搭配 remarkable longevity；指长寿这一性质，不直接替换 age 数值结构。"),
    ],
    "withdraw": [("retract", "撤回言论或说法", "The journal retracted the unsupported article.", "作及物动词；典型搭配 retract a statement/claim/article；对应 withdraw 的撤回义，范围更窄。")],
    "equip": [("outfit", "给……配备装备", "The rescue team was outfitted with protective clothing.", "作及物动词，常用被动 be outfitted with；比 equip 更强调服装或成套装备。")],
    "artificial": [("fake", "假的；伪造的", "The website displayed a fake medical certificate.", "作前置定语或表语；典型搭配 fake smile/document；口语且强调欺骗，artificial 可仅表人造。")],
    "limb": [
        ("extremity", "四肢末端；肢体（医学）", "The physician checked circulation in each extremity.", "作可数名词，医学语体；典型搭配 upper/lower extremity；比 limb 更专业。"),
        ("appendage", "附肢；附属部分", "The creature uses the appendage to sense movement.", "作可数名词；典型搭配 a flexible appendage；多用于动物或比喻，不是日常 arm/leg。"),
    ],
    "rubber": [
        ("elastomer", "弹性体（专业材料）", "The seal is made from a heat-resistant elastomer.", "作可数名词；典型搭配 synthetic elastomer；材料学专业词，rubber 是常用词。"),
        ("eraser", "橡皮擦（美式）", "She used an eraser to remove the pencil mark.", "作可数名词；典型搭配 a pencil eraser；英式用 rubber 表此义。"),
    ],
    "disabled": [
        ("impaired", "功能受损的", "The device assists users with impaired vision.", "作前置定语或表语；典型搭配 visually/hearing impaired；通常修饰具体功能，不等同 disabled 人群总称。"),
        ("people with disabilities", "残障人士（人本表达）", "The policy was developed with people with disabilities.", "作复数名词短语；典型搭配 support/include people with disabilities；强调人而非状况。"),
    ],
    "disability": [
        ("impairment", "功能损伤", "The patient has a mild hearing impairment.", "作可数名词；典型搭配 visual/hearing impairment；比 disability 更具体指某项功能受损。"),
        ("incapacity", "无能力；失能", "Temporary incapacity prevented him from working.", "作可数或不可数名词；典型搭配 temporary/legal incapacity；语气较强且常见于法律语境。"),
    ],
    "leather": [
        ("skin", "兽皮；皮肤", "The bag was made from treated animal skin.", "作可数或不可数名词；典型搭配 animal skin；skin 是原料，leather 是鞣制后的材料。"),
        ("leatherette", "人造革", "The inexpensive case is covered in leatherette.", "作不可数名词；典型搭配 leatherette covering；外观似皮革但不是真皮。"),
    ],
    "sensory": [
        ("perceptual", "知觉的", "The study measured perceptual changes after treatment.", "作前置定语；典型搭配 perceptual ability/process；强调大脑解释感觉，sensory 强调感官输入。"),
        ("sensual", "感官享受的；肉欲的", "The novel uses rich sensual imagery.", "作前置定语或表语；典型搭配 sensual pleasure/imagery；与 sensory 形近但语义不同。"),
    ],
    "patent": [
        ("trademark", "商标权（辨析）", "The company registered its name as a trademark.", "作可数名词；典型搭配 register a trademark；保护品牌标识，不保护发明。"),
        ("licence", "许可；许可证（辨析）", "The inventor granted the manufacturer a licence.", "作可数名词；典型搭配 grant/hold a licence；patent 是权利，licence 是使用授权。"),
    ],
    "head-on": [("frontal", "正面的；迎面的", "The car suffered severe damage in a frontal collision.", "作前置定语；典型搭配 frontal collision/attack；不能像 head-on 那样直接作方式副词。")],
    "acupuncture": [
        ("acupressure", "指压疗法（辨析）", "Acupressure uses pressure rather than needles.", "作不可数名词；典型搭配 receive acupressure；与 acupuncture 同源但不用针。"),
        ("dry needling", "干针疗法（辨析）", "Dry needling targets muscular trigger points.", "作不可数名词短语；典型搭配 undergo dry needling；现代肌肉治疗，不等同传统针灸体系。"),
        ("needling therapy", "针刺疗法（解释性近义）", "Needling therapy must be performed with sterile equipment.", "作不可数名词短语；典型搭配 administer needling therapy；解释性表达，不如 acupuncture 固定。"),
    ],
    "needle": [
        ("spike", "尖状物", "The instrument ends in a narrow metal spike.", "作可数名词；典型搭配 a sharp metal spike；比 needle 粗且不用于缝纫。"),
        ("syringe", "注射器（辨析）", "The nurse filled the syringe before attaching a sterile needle.", "作可数名词；典型搭配 fill/use a syringe；syringe 是注射器整体，needle 是针头。"),
    ],
    "evidence": [("testimony", "证词", "The court heard testimony from two physicians.", "作不可数或可数名词；典型搭配 give/hear testimony；只对应人证，evidence 范围更广。")],
    "solid": [("substantial", "充分的；大量的", "The claim is supported by substantial evidence.", "作前置定语或表语；典型搭配 substantial evidence/support；对应 solid 的“可靠充分”义。")],
    "switch": [("swap", "交换；调换", "The nurses swapped shifts for the weekend.", "作及物或不及物动词；典型搭配 swap A for B / swap shifts；比 switch 更口语。")],
    "stainless": [
        ("corrosion-resistant", "耐腐蚀的", "The tool uses a corrosion-resistant alloy.", "作前置定语或表语；典型搭配 corrosion-resistant material；范围比 stainless 更精确。"),
        ("spotless", "一尘不染的；无瑕的", "The clinic kept every surface spotless.", "作表语或前置定语；典型搭配 spotless room/reputation；不表达金属防锈。"),
    ],
    "steel": [
        ("alloy", "合金", "The instrument is made from a light alloy.", "作可数或不可数名词；典型搭配 a steel alloy/light alloy；steel 是特定铁碳合金。"),
        ("metal", "金属", "The frame combines metal with flexible rubber.", "作可数或不可数名词；典型搭配 a metal frame；上位词，范围远大于 steel。"),
    ],
    "tongue": [
        ("speech", "言语；说话", "Fear briefly robbed him of speech.", "作不可数名词；典型搭配 freedom of speech；对应 tongue 的“说话方式”义，非器官义。"),
        ("dialect", "方言", "The physician explained the advice in the local dialect.", "作可数名词；典型搭配 speak a dialect；dialect 是某语言变体，tongue 可泛指语言。"),
    ],
    "pulse": [
        ("beat", "搏动；节拍", "The music has a steady beat.", "作可数名词；典型搭配 a steady beat；对应 pulse 的节奏义，医学上 heartbeat 更准确。"),
        ("rhythm", "节律", "The monitor detected an irregular heart rhythm.", "作可数或不可数名词；典型搭配 heart rhythm / sense of rhythm；强调规律模式。"),
    ],
    "wrist": [
        ("carpus", "腕骨；腕部（解剖学）", "The carpus consists of eight small bones.", "作单数专业名词；典型搭配 bones of the carpus；医学术语，日常用 wrist。"),
        ("wrist joint", "腕关节", "The wrist joint allows movement in several directions.", "作可数名词短语；典型搭配 injure/support the wrist joint；比 wrist 更具体。"),
        ("ankle", "脚踝（形近部位辨析）", "She injured her ankle rather than her wrist.", "作可数名词；典型搭配 sprain an ankle；ankle 在脚部，wrist 在手部。"),
    ],
    "organ": [
        ("body part", "身体部位（上位表达）", "The liver is a vital body part.", "作可数名词短语；典型搭配 an internal body part；范围比 organ 广。"),
        ("institution", "机构（机构义）", "The institution operates independently of government.", "作可数名词；典型搭配 a public institution；对应 organ 的机构义但更中性。"),
        ("instrument", "乐器（风琴义辨析）", "The organ is a large keyboard instrument.", "作可数名词；典型搭配 a musical instrument；organ 是具体种类。"),
    ],
    "alcohol": [
        ("spirits", "烈酒", "The licence permits the sale of wine but not spirits.", "作复数名词；典型搭配 drink/sell spirits；只指烈酒，alcohol 范围更广。"),
        ("ethanol", "乙醇（化学名称）", "The solution contains seventy percent ethanol.", "作不可数名词；典型搭配 pure/diluted ethanol；化学专业词，不直接指酒类。"),
    ],
    "tobacco": [
        ("nicotine", "尼古丁（辨析）", "Nicotine is an addictive chemical found in tobacco.", "作不可数名词；典型搭配 nicotine dependence；是烟草中的成分，不等于 tobacco。"),
        ("cigarette", "香烟（制品辨析）", "The warning appears on every cigarette packet.", "作可数名词；典型搭配 smoke a cigarette；是 tobacco 制品，不是原料本身。"),
        ("smoking material", "吸烟材料（解释性表达）", "The law regulates tobacco as a smoking material.", "作可数或不可数名词短语；典型搭配 a regulated smoking material；解释性上位表达。"),
    ],
    "drug": [
        ("medication", "药物；用药", "The physician changed the patient's medication.", "作可数或不可数名词；典型搭配 take/change medication；只指治疗用药，不指毒品。"),
        ("narcotic", "麻醉性毒品", "The police seized an illegal narcotic.", "作可数名词或形容词；典型搭配 illegal narcotics；范围比 drug 窄且法律色彩强。"),
    ],
    "phenomenon": [
        ("event", "事件", "The conference became an important cultural event.", "作可数名词；典型搭配 a major/unusual event；侧重发生的事，phenomenon 侧重待解释现象。"),
        ("marvel", "奇迹般的人或事", "The device is a marvel of modern engineering.", "作可数名词；典型搭配 a technological marvel；只对应 phenomenon 的“非凡事物”义。"),
    ],
    "substance": [
        ("matter", "物质", "Matter can exist as a solid, liquid or gas.", "作不可数名词；典型搭配 organic matter；科学上是上位概念，substance 指特定物质。"),
        ("essence", "实质；要点", "The summary captures the essence of the argument.", "作不可数名词；典型搭配 the essence of；对应 substance 的“实质”义。"),
    ],
    "symbol": [
        ("emblem", "象征性标志", "The flower is the national emblem.", "作可数名词；典型搭配 a national emblem；侧重正式标志，symbol 范围更广。"),
        ("signal", "信号", "A red light is a signal to stop.", "作可数名词；典型搭配 send/receive a signal；传递行动信息，不等于抽象象征。"),
    ],
    "widespread": [
        ("prevalent", "盛行的；普遍的", "The condition is prevalent among older adults.", "作表语或前置定语；典型搭配 prevalent among/in；比 widespread 更正式。"),
        ("extensive", "广泛的；大面积的", "The storm caused extensive damage.", "作前置定语或表语；典型搭配 extensive damage/research；强调范围或数量大。"),
    ],
    "bandage": [
        ("gauze", "纱布", "The nurse covered the cut with sterile gauze.", "作不可数名词；典型搭配 sterile gauze；gauze 是材料，bandage 是包扎带。"),
        ("wrap", "包裹物；包扎", "Apply a compression wrap around the joint.", "作可数名词或动词；典型搭配 a compression wrap；比 bandage 更泛。"),
    ],
    "infection": [
        ("contagion", "传染；传染病", "Isolation reduced the risk of contagion.", "作不可数名词；典型搭配 risk/spread of contagion；强调传播过程。"),
        ("inflammation", "炎症（辨析）", "The injury caused inflammation without infection.", "作不可数名词；典型搭配 reduce inflammation；炎症可由感染引起，但二者不等同。"),
    ],
    "department": [
        ("division", "部门；分部", "She leads the company's research division.", "作可数名词；典型搭配 a business/research division；常指较大的组织分部。"),
        ("faculty", "院系；全体教员", "He teaches in the medical faculty.", "作可数或集合名词；典型搭配 Faculty of Medicine；只对应大学院系义。"),
    ],
    "being": [("organism", "生物体", "Every organism responds to changes in its environment.", "作可数名词；典型搭配 a living organism；只对应 being 的生物义，不表达抽象“存在”。")],
    "lifespan": [("service life", "使用寿命", "The battery has a service life of five years.", "作可数名词短语；典型搭配 extend the service life of equipment；只对应产品 lifespan。")],
    "virus": [("pathogen", "病原体", "The laboratory identified the pathogen in the sample.", "作可数名词；典型搭配 a viral/bacterial pathogen；是上位词，范围比 virus 广。")],
    "outgoing": [("extrovert", "性格外向者", "She is an extrovert who enjoys meeting new patients.", "作可数名词；典型搭配 be an extrovert；outgoing 是形容词，二者句法位置不同。")],
    "grateful": [("indebted", "感激的；蒙恩的", "I am deeply indebted to the medical team.", "作表语，典型搭配 be indebted to sb for sth；比 grateful 更正式且语气更强。")],
    "conventional": [("standard", "标准的；常规的", "The clinic followed the standard procedure.", "作前置定语或表语；典型搭配 standard procedure/treatment；强调标准化，conventional 强调传统通行。")],
    "fuel": [("feed", "助长；加剧", "The rumours fed public anxiety about the trial.", "作及物动词；典型搭配 feed fear/suspicion；与 fuel 的比喻义相近，但语气稍弱。")],
    "disturb": [("disrupt", "扰乱；使中断", "The alarm disrupted the clinical examination.", "作及物动词；典型搭配 disrupt a process/service；强调打断运行，disturb 强调打扰平静。")],
    "go to great lengths to do sth": [("take great pains to do sth", "煞费苦心做某事", "The physician took great pains to explain the risks clearly.", "固定结构 take great pains to do；比 go to great lengths 更强调细致努力。")],
    "clinic": [("medical centre", "医疗中心", "The medical centre provides several specialist services.", "作可数名词短语；典型搭配 a community medical centre；通常规模比 clinic 大。")],
    "date back to": [("stem from", "源于", "The practice stems from an ancient medical tradition.", "不及物短语，典型搭配 stem from a tradition/cause；强调来源，不强调具体年代。")],
    "anxiety": [("unease", "不安", "The unexplained delay caused growing unease.", "作不可数名词；典型搭配 a sense of unease；程度通常弱于 clinical anxiety。")],
}


SYNONYM_USAGE_PATCHES = {
    "lifespan": {
        "life expectancy": "作可数或不可数名词短语，可作主语或宾语；典型搭配 life expectancy at birth，侧重统计预测，lifespan 还可指个体或产品的实际寿命。",
    },
    "relate to": {
        "refer to": "作及物短语，后接名词、代词或动名词；典型搭配 refer to a rule/example，侧重提及或适用于，不表达情感共鸣。",
    },
    "fundamental": {
        "essential": "作前置定语或表语，常用结构 be essential to/for sth 与 be essential to do sth；强调不可缺少，fundamental 更强调根基地位。",
    },
    "prohibit": {
        "forbid": "作及物动词，典型结构 forbid sb to do sth / forbid doing sth；prohibit 更正式，固定搭配 prohibit sb from doing sth。",
    },
    "resistance": {
        "opposition": "作不可数名词，典型搭配 meet/face opposition to sth；侧重公开反对主张，resistance 还可指物理阻力、抗药性与抵抗力。",
    },
    "characteristic": {
        "feature": "作可数名词，常作主语或宾语；典型搭配 a key/distinctive feature of sth，泛指显著组成或特色。",
        "trait": "作可数名词，通常作前置定语的中心词或宾语；典型搭配 a personality/genetic trait，范围比 characteristic 窄。",
    },
    "wrestle": {
        "struggle": "作不及物动词，典型搭配 struggle with/against sth 或 struggle to do sth；wrestle with 更形象，强调反复较量。",
    },
    "debate": {
        "argue": "作不及物动词时搭配 argue about/over sth，作及物动词时可接 that 从句；debate 更正式，常用于有组织的正反讨论。",
    },
    "finding": {
        "result": "作可数名词，研究语境常用复数作主语或宾语；典型搭配 research/test results，finding 更强调调查后得出的具体发现。",
    },
    "equip": {
        "provide sb with sth": "作及物结构，直接接人作宾语并以 with 引出所提供之物；equip sb with sth 更强调为特定任务配备设备或能力。",
    },
    "adjust": {
        "modify": "作及物动词，直接接 plan/design/treatment 作宾语；典型搭配 modify sth to suit a need，不用于人逐渐适应环境。",
        "get used to": "作系表式固定结构，to 为介词，后接名词、代词或动名词；侧重已经习惯，adjust to 强调适应过程。",
    },
    "evidence": {
        "proof": "作不可数名词，常作主语或宾语；典型搭配 proof of/that...，表示足以证实的依据，强度通常高于 evidence。",
    },
    "switch": {
        "change": "作及物或不及物动词，可直接接宾语或搭配 change from A to B；switch 更强调在两个选项、系统或状态间切换。",
    },
    "clinic": {
        "surgery": "作可数名词，英式英语中常作主语或介词宾语；典型搭配 a doctor's surgery / attend surgery，指全科诊所或坐诊时间。",
    },
    "examine": {
        "inspect": "作及物动词，直接接场所、设备或文件作宾语；典型搭配 inspect sth for defects，强调系统查看问题或瑕疵。",
        "investigate": "作及物或不及物动词；及物时接 case/cause/claim，典型结构 investigate whether/how...，侧重查明原因或真相。",
    },
    "severe": {
        "serious": "作前置定语或表语，典型搭配 serious illness/problem/consequences；severe 语气更强，还常修饰 pain、weather、shortage 与 punishment。",
        "harsh": "作前置定语或表语，典型搭配 harsh conditions/criticism/treatment；强调环境、言辞或待遇严酷，不用于 severe pain 的一般替换。",
    },
    "anxiety": {
        "worry": "作可数或不可数名词，也可作及物或不及物动词；名词典型搭配 worry about/over sth，程度通常弱于 anxiety。",
    },
    "abuse": {
        "misuse": "作及物动词时直接接 power/data/drugs 作宾语，也可作不可数名词；典型搭配 misuse of authority，语气通常弱于 abuse。",
        "mistreat": "只作及物动词，直接接人或动物作宾语；典型搭配 badly mistreat a patient/animal，只对应 abuse 的虐待义。",
    },
}


EXTRA_PRACTICE_BANK = {
    "cell": [
        {
            "type": "选词填空",
            "question": "All I get is a busy ____ when I dial George's cell phone number. (symbol / sign / signal / mark)",
            "answer": "signal",
            "note": "【课件原题】busy signal 指电话占线信号；同时识别 cell phone 中 cell 的美式英语“手机”义。",
        },
    ],
    "finding": [
        {
            "type": "单句语法填空",
            "question": "A boy ____ (lead), we had no trouble finding the school in the village.",
            "answer": "leading the way",
            "note": "【课件原题】独立主格中 a boy 与 lead 为主动关系，用 leading the way；finding 在 have trouble doing 中作动名词。",
        },
    ],
    "means": [
        {
            "type": "单句语法填空",
            "question": "Email remains one of the most convenient ____ (means) of contacting the clinic.",
            "answer": "means",
            "note": "means 表“方式、手段”时单复数同形；one of 后接复数概念，形式仍为 means。",
        },
    ],
}


PPT_ADVANCED_BANK = {
    "game-changing": [
        {
            "type": "课件讲者备注·名词与V-ing构成复合形容词",
            "expression": "【课件讲者备注】game-changing = noun + verb-ing；同类有 time-consuming 与 English-speaking，整体可作定语或表语。",
            "example": "Genome editing is a game-changing technology. 基因组编辑是一项具有颠覆性的技术。",
        },
    ],
    "being": [
        {
            "type": "课件语法点·being在动名词结构中",
            "expression": "【课件】stop taking part in an activity or being a member 中 being 与 taking 并列；prohibit sb from doing 中 from 后也接动名词。",
            "example": "The rule prohibits a member from being involved in both reviews. 该规则禁止成员同时参与两项审查。",
        },
    ],
    "contract": [
        {
            "type": "课件讲者备注·contract跨词性搭配",
            "expression": "【课件讲者备注】contract out services（外包服务）；stretch and contract（伸展与收缩）；muscular contractions（肌肉收缩）；win the contract（赢得合同）。",
            "example": "The clinic contracted out cleaning services after winning a new public contract. 诊所赢得新公共合同后把清洁服务外包了。",
        },
    ],
    "means": [
        {
            "type": "课件讲者备注·means名词与动词辨形",
            "expression": "【课件讲者备注】It means they are created 中 means 是 mean 的第三人称单数动词；a means of treatment 中 means 是单复数同形名词。",
            "example": "This means the cells are created by a different process. 这意味着这些细胞由不同过程产生。",
        },
    ],
    "weapon": [
        {
            "type": "课件词块·serve as a weapon in the fight against",
            "expression": "【课件】serve as a new weapon in the fight against diseases 表示“成为对抗疾病的新武器”；weapon 在此是对抗手段的比喻义。",
            "example": "The discovery may serve as a new weapon in the fight against cancer. 这一发现可能成为抗癌的新武器。",
        },
    ],
    "fundamental": [
        {
            "type": "课件讲者备注·fundamental difference",
            "expression": "【课件讲者备注】fundamental difference 指“根本差异”；另比较 a fundamental change、be fundamental to success 与 the fundamentals of a subject。",
            "example": "There is a fundamental difference between treatment and enhancement. 治疗与增强之间存在根本差异。",
        },
    ],
    "resistance": [
        {
            "type": "课件讲者备注·物理阻力与电阻义",
            "expression": "【课件讲者备注】wind/air resistance 指风阻或空气阻力；物理学中 resistance 还指电阻，符号为 R；医学中 build up a resistance to sth 指形成抵抗力。",
            "example": "Engineers reduced air resistance before measuring electrical resistance. 工程师先降低空气阻力，再测量电阻。",
        },
    ],
    "debate": [
        {
            "type": "课件短语群·debate固定搭配",
            "expression": "【课件】withdraw from a debate 表示“退出辩论”；add fuel to the debate over/on sth 表示“使关于某事的争论更加激烈”。",
            "example": "The report added fuel to the debate over genetic privacy. 这份报告使有关基因隐私的争论更加激烈。",
        },
    ],
    "artificial": [
        {
            "type": "课件词块·be equipped with an artificial hand",
            "expression": "【课件】be equipped with an artificial hand 表示“装配一只人工手”；artificial 作前置定语，强调人造而非天然。",
            "example": "The patient was equipped with an artificial hand. 这名患者装配了一只人工手。",
        },
    ],
    "severe": [
        {
            "type": "课件讲者备注·a severe voice",
            "expression": "【课件讲者备注】a severe voice 中 severe 表示“严厉的”，不同于 severe pain/illness 中的“严重的”；常用结构 speak in a severe voice。",
            "example": "The head teacher spoke in a severe voice. 班主任用严厉的声音说道。",
        },
    ],
}


ADVANCED_CARD_REPLACEMENTS = {
    "surgeon": {
        "构词法·-eon 表人": {
            "type": "词源辨析·surgeon不可拆成surg与-eon",
            "expression": "surgeon 经古法语 surgien/chirurgien 进入英语，与 surgery、surgical 同族；-eon 不是表示“人”的英语后缀，不能类比 dungeon 或 pigeon。",
            "example": "A surgeon performs surgery, while surgical describes an operation. 外科医生做手术，surgical 修饰与手术有关的事物。",
        },
    },
    "physician": {
        "构词法·区分近形词": {
            "type": "词源辨析·physician与physicist",
            "expression": "physician 与 physics 在历史上都可追溯到希腊语 physis“自然”，但现代英语中 physician 指医师，physicist 指物理学家，二者不可按词形互换。",
            "example": "The physician treated the physicist after the laboratory accident. 实验室事故后，医师为这位物理学家治疗。",
        },
    },
    "genome": {
        "构词法·gen- + -ome": {
            "type": "词源与构词·genome",
            "expression": "genome 是由 gene 与 chromosome 组合创造的术语；后来 -ome 被用于表示“某类事物的完整集合”，如 proteome、microbiome。",
            "example": "A genome is the complete set of genetic material in an organism. 基因组是一个生物体全部遗传物质的集合。",
        },
    },
    "abnormal": {
        "构词法·ab-": {
            "type": "构词法·ab-加normal",
            "expression": "abnormal 可按 ab-（离开、偏离）+ normal 理解为“偏离正常的”；课堂类比可用 abduction 等历史同源词，不把 abuse 当作透明的现代前缀构词。",
            "example": "An abnormal result differs from the normal range. 异常结果偏离正常范围。",
        },
    },
    "fundamental": {
        "构词法·-al 形容词后缀": {
            "type": "构词法·fundament加-al",
            "expression": "fundamental = fundament“基础、根基” + -al“……的”；不是把单词任意拆成 fund + ament + al。",
            "example": "A fundamental principle forms part of the foundation of a subject. 基本原则构成一门学科的根基。",
        },
    },
    "prohibit": {
        "构词法·pro-（在前/向前）+ -hibit（持有）": {
            "type": "词源辨析·prohibit",
            "expression": "prohibit 来自拉丁语 prohibere（pro“向前”+ habere“持有”），本义为“拦住”；现代英语中 -hibit 不是可独立套用的自由后缀。",
            "example": "The law prohibits unauthorized access. 法律禁止未经授权的访问。",
        },
    },
    "artificial": {
        "构词法·artifice 相关": {
            "type": "词源与派生·artificial",
            "expression": "artificial 经拉丁语 artificialis 进入英语，与 artifice 同源；课堂上应记 artificial → artificially / artificiality，不把它机械拆成 arti- 与 -ficial。",
            "example": "The artificial limb was made by skilled human design rather than by nature. 这只人工肢体出自人的设计，并非天然形成。",
        },
    },
    "acupuncture": {
        "构词法·acu-(针)+puncture(刺)": {
            "type": "词源与构词·acupuncture",
            "expression": "acupuncture 源于拉丁语 acus“针”与 punctura“刺、穿刺”；可用 puncture 帮助记忆“刺”，但不把 acute 当作它的直接派生词。",
            "example": "Acupuncture uses fine needles to puncture selected points. 针灸用细针刺入选定穴位。",
        },
    },
    "clinic": {
        "构词法·-ic 名词后缀": {
            "type": "词源与派生·clinic",
            "expression": "clinic 源自希腊语 klinike“床边诊疗”，与 kline“床”有关；现代词族为 clinic、clinical、clinician、clinically，不能把 -ic 解释成这里的名词后缀。",
            "example": "Clinical originally referred to care given at a patient's bedside. clinical 原本指在病床边进行的诊疗。",
        },
    },
    "outgoing": {
        "语法点·not only...but also 主谓一致": {
            "type": "语法点·并列主语的就近一致",
            "expression": "两个并列主语由 not only...but also... 连接时，谓语与靠近它的后一主语在人称和数上保持一致。",
            "example": "Not only the nurses but also the physician is prepared. 不仅护士们，医生也准备好了。",
        },
    },
    "ultimately": {
        "同义表达群·最终": {
            "type": "同义表达群·从根本上说",
            "expression": "表示“从根本上说”可用 fundamentally / essentially / at bottom / in essence；这一义项不同于 eventually、finally 表示的时间终点。",
            "example": "Ultimately, the dispute is about trust. 从根本上说，这场争议关乎信任。",
        },
    },
    "withdraw": {
        "一词多义·withdraw 四义项": {
            "type": "课件一词多义·withdraw四义项",
            "expression": "【课件】① withdraw sth from sale 撤下市场；② withdraw from an activity/organization 退出；③ withdraw support 停止提供支持；④ withdraw money from an account 取款；另有 withdraw into oneself 变得沉默孤僻。",
            "example": "The drug was withdrawn from sale after serious side effects appeared. 出现严重副作用后，该药被撤下市场。",
        },
    },
}


ADVANCED_TYPES_TO_DROP = {
    "delete": {"同义表达群·删除"},
    "grateful": {"同义表达群·表达感激"},
    "means": {"同义表达群·方法"},
    "outgoing": {"语法点·not only...but also 主谓一致"},
    "relate to": {"语法点·relate to"},
    "prohibit sb from doing sth": {"短语群·表示“禁止”"},
    "put sth in place": {"语法点·put sth in place"},
    "a ripe old age": {"语法点·a ripe old age"},
}


UPGRADE_SUFFIXES = {
    "surgeon": (", then invited them to ask questions before signing the consent form", ", coordinating treatment until a specialist transport team arrived from the city"),
    "physician": (", noting each possible interaction in the electronic record for later review", ", without allowing the crowded waiting room to reduce the care given to each person"),
    "chemist": (", and the second analysis confirmed that the first result was not a measurement error", ", thereby preventing a potentially dangerous combination from being dispensed that afternoon"),
    "dentist": (", giving her time to understand the procedure and agree without unnecessary fear", ", reaching children whose families would otherwise travel several hours for preventive care"),
    "gene": (", which could eventually guide a more precise form of rehabilitation for affected patients", ", so the counsellor explained probability carefully and avoided presenting risk as certainty"),
    "game-changing": (", potentially allowing physicians to intervene while the condition is still manageable", ", enabling users to work, exercise and complete daily tasks with greater independence"),
    "genome": (", and the analysis identified two changes that deserved further clinical investigation", ", prompting the committee to strengthen rules on access, storage and future commercial use"),
    "cell": (", a tightly controlled process that protects surrounding tissue from uncontrolled growth", ", recording his experience in plain language so his young daughter would not worry"),
    "being": (", including the right to refuse uses unrelated to the treatment they originally accepted", ", creating a single voice strong enough to influence the national health authority"),
    "lifespan": (", saving the clinic money while ensuring that patients receive dependable support", ", after controlling for diet, living conditions and access to medical care"),
    "affect": (", requiring doctors from several departments to coordinate long-term monitoring and care", ", because the family's relief reminded her of an earlier patient she had been unable to save"),
    "contract": (", which makes early isolation especially important in a busy hospital environment", ", protecting the clinic from unexpected repair costs during the agreed period"),
    "virus": (", allowing infected people to spread it unknowingly through ordinary daily contact", ", and technicians restored the files from a secure offline backup before appointments began"),
    "cancer": (", making a less aggressive course of treatment possible and improving her chances of recovery", ", whose practical advice later shaped the centre's counselling and follow-up services"),
    "identify": (", allowing engineers to replace the component before conducting another controlled test", ", preventing a dangerous medicine from being given to the wrong person"),
    "relate": (", turning an abstract idea into a question students could discuss with confidence", ", particularly when they have experienced the same fear or uncertainty themselves"),
    "means": (", especially for inherited conditions that cannot be managed effectively by existing drugs", ", sometimes continuing the journey on foot when landslides make the road impassable"),
    "delete": (", forcing the team to reconstruct part of the experiment from handwritten laboratory notes", ", a safeguard that protects privacy while preserving information needed for valid analysis"),
    "relate to": (", including temporary workers who use the database only during evening shifts", ", rather than using technical terms that make the conversation feel distant"),
    "restore": (", allowing the patient to keep the arm and begin rehabilitation several weeks later", ", reopening it as a small museum of regional medicine and community health"),
    "ultimately": (", concluding that uncertain benefits could not outweigh preventable harm to vulnerable volunteers", ", a response influenced by age, previous treatment and several genetic factors"),
    "abnormal": (", confirming that the first reading had been caused by a temporary laboratory error", ", and the medical team adjusted the treatment before the rhythm became dangerous"),
    "weapon": (", allowing physicians to target people who need further tests rather than screening everyone repeatedly", ", requiring inspection rules that apply even to research described as defensive"),
    "fundamental": (", because participants must understand both the proposed benefits and the possible long-term consequences", ", including gene expression, mutation and the mechanisms of ordinary cell division"),
    "pace": (", creating pressure to make decisions before laws and public understanding had caught up", ", pausing beside the window whenever footsteps approached the operating theatre"),
    "arise": (", especially when consent forms do not explain possible sharing beyond the original study", ", deciding in advance which safety threshold would require the procedure to end"),
    "restrict": (", with every access attempt recorded so that improper use can be investigated", ", protecting people from decisions based on risk rather than their present ability"),
    "prohibit": (", ensuring that hiring decisions reflect actual qualifications rather than predicted illness", ", a restriction displayed clearly beside every entrance to the secure area"),
    "resistance": (", leaving physicians with fewer reliable options for treating vulnerable patients", ", who wanted consent requirements strengthened before any data were transferred"),
    "flu": (", reducing the likelihood of severe illness during the busiest part of the season", ", following telephone advice until her fever had disappeared for a full day"),
    "characteristic": (", so doctors considered it together with fever, test results and recent exposure", ", checking every conclusion against published research before discussing it with the family"),
    "wrestle": (", balancing the desire to relieve suffering against the danger of irreversible inherited change", ", securing the evidence while another officer called the police"),
    "debate": (", bringing scientists, patients, lawyers and religious leaders into the same difficult conversation", ", particularly because the volunteers could not personally benefit from the experiment"),
    "prohibit sb from doing sth": (", reducing the chance that a lost laptop will expose confidential genetic information", ", a protection that remains essential even when the proposed study appears beneficial"),
    "wrestle with": (", because reasonable people could assign different weight to safety, autonomy and future benefit", ", knowing that silence might allow the unsafe practice to continue"),
    "put sth in place": (", separating names from research data and recording every request for access", ", including independent medical care and a simple process for reporting harm"),
    "without doubt": (", but those possibilities require the same careful evidence as less dramatic medical claims", ", since the pattern appeared in every sample tested by two separate laboratories"),
    "finding": (", providing a stronger basis for a larger trial involving several independent hospitals", ", because the small sample and short follow-up period limited any final conclusion"),
    "ripe": (", provided that an independent board continued to monitor every participant closely", ", avoiding softer samples that could alter the concentration of the measured substance"),
    "a ripe old age": (", reading case notes each morning and discussing difficult decisions over lunch", ", inspiring four generations of relatives to value education, humour and daily exercise"),
    "withdraw": (", while regulators investigated whether the defect had caused lasting damage", ", a choice the coordinator accepted without questioning the volunteer's reasons"),
    "equip": (", allowing the team to compare movement, comfort and reliability during ordinary tasks", ", especially when a diagnosis changes a family's expectations for the future"),
    "artificial": (", allowing the user to close the fingers with a more natural and controlled motion", ", and the patient noticed immediately that the reassurance was not sincere"),
    "limb": (", gradually building confidence until she could carry a cup without assistance", ", and maintenance workers moved everyone away before inspecting the damaged structure"),
    "rubber": (", maintaining the device's reliability when the user washes or exercises in wet conditions", ", protecting both the patient and the nurse during the wound-care procedure"),
    "outgoing": (", encouraging them to ask practical questions rather than hiding confusion or embarrassment", ", leaving the incoming director a detailed plan for completing the work"),
    "grateful": (", enabling her to wear it throughout the day without avoiding ordinary movement", ", because early reporting allows small technical problems to be corrected safely"),
    "disabled": (", revealing difficulties that non-disabled engineers had failed to notice in the first design", ", so staff moved appointments downstairs and provided a quiet temporary entrance"),
    "disability": (", including consultation rooms, toilets and the outdoor rehabilitation garden", ", which is why colleagues should ask what support is useful rather than making assumptions"),
    "conventional": (", ensuring that complementary care did not replace evidence-based treatment for the underlying condition", ", giving users information about pressure that may prevent accidental damage"),
    "leather": (", improving comfort while also making the support easier to clean after daily use", ", showing visitors how design priorities have shifted towards comfort and independent movement"),
    "sensory": (", helping them judge how firmly to hold a glass without seeing every finger", ", making pressure and temperature harder to recognize before tissue is injured"),
    "patent": (", protecting the invention while safety testing and manufacturing plans were completed", ", so the committee examined whether legal protection might delay wider access"),
    "fuel": (", encouraging people to confuse imagined future uses with the limited study actually proposed", ", allowing the lightweight device to operate for an entire day between charges"),
    "disturb": (", a discovery that led her to withdraw from the project and request deletion of the records", ", since one careless movement could produce misleading measurements or injure the user"),
    "tackle": (", replacing assumptions with direct evidence about comfort, reliability and everyday use", ", explaining that continued delay was increasing both cost and risk"),
    "head-on": (", publishing specific safeguards and inviting patient representatives to challenge them", ", and emergency services replaced the vehicle before its next scheduled journey"),
    "adjust": (", testing the grip with a cup, a key and a sheet of thin paper", ", requiring several short sessions before the signals began to feel meaningful"),
    "go to great lengths to do sth": (", removing names and allowing participants to review how their recordings would be stored", ", arranging transport, step-free access and longer consultation times where necessary"),
    "acupuncture": (", after their physicians confirmed that none of their symptoms required urgent investigation or different care", ", while acknowledging that reported pain relief may involve several biological and psychological mechanisms"),
    "needle": (", maintaining a calm conversation so that anxiety did not make the discomfort feel worse", ", suggesting that the machine needed immediate inspection rather than a simple reset"),
    "evidence": (", supporting the use of sealed containers and proper disposal in every clinic", ", describing the sequence of failures and the warnings that staff had previously ignored"),
    "solid": (", so the committee refused to recommend it outside a properly designed research trial", ", demonstrating the physical change without altering the substance's chemical identity"),
    "switch": (", a change that also shortened preparation time between consecutive patient appointments", ", protecting both the electrical circuit and the technician performing the repair"),
    "stainless": (", making them suitable for procedures that require strict infection-control standards", ", allowing staff to disinfect it quickly between examinations"),
    "steel": (", reducing the chance that a bent or broken instrument will injure the patient", ", choosing direct but compassionate language rather than hiding behind technical terms"),
    "clinic": (", ensuring that serious cases receive equipment and specialist support without unnecessary delay", ", allowing older residents to receive treatment closer to home"),
    "examine": (", comparing those observations with laboratory evidence before making a diagnosis", ", including whether small samples and weak controls had distorted the apparent effect"),
    "tongue": (", treating the observation as one clue rather than a complete diagnosis on its own", ", waiting until the discussion became calmer before explaining his concern"),
    "pulse": (", confirming that the change was real before the physician adjusted any medicine", ", providing movement that feels smoother than a single continuous electrical signal"),
    "wrist": (", combining a traditional observation with questions about the patient's overall condition", ", restoring strength without placing excessive pressure on the healing joint"),
    "organ": (", including filtering the blood and producing substances needed for digestion", ", receiving regular updates while transplant staff searched for a suitable donor"),
    "date back to": (", showing that the practice developed long before modern clinical research methods", ", and conservation work preserved its original stone entrance and wooden staircase"),
    "severe": (", checking the skin and pulse before deciding whether medical attention was needed", ", leaving some patients to travel more than one hundred kilometres for care"),
    "anxiety": (", allowing the nurse to answer questions and correct frightening misunderstandings", ", and she returned before the injured wrist had recovered enough for heavy work"),
    "abuse": (", which is why strict rules must govern access, sharing and commercial decision-making", ", asking careful questions and documenting concerns before contacting specialist services"),
    "alcohol": (", so she suggested avoiding it completely until the course of treatment ended", ", keeping the sensor transparent without weakening the surrounding material"),
    "tobacco": (", which explains why smoke-free public spaces protect more people than smokers alone", ", combining advertising limits, health warnings and support for people trying to quit"),
    "drug": (", replacing it with a safer alternative while continuing to monitor organ function", ", publishing both the promising result and the limitations of the small early study"),
    "phenomenon": (", requiring evidence from medicine, history and social behaviour rather than one simple explanation", ", so the team designed a new experiment to test several competing explanations"),
    "substance": (", and staff sealed the container before arranging specialist disposal", ", with no document or witness supporting the story presented to the committee"),
    "symbol": (", reminding visitors that a practice can carry cultural meaning beyond its measurable effect", ", prompting the nurse to examine the connection before trusting the displayed result"),
    "widespread": (", allowing resistant bacteria to spread between hospitals and communities", ", forcing administrators to notify affected patients and order an independent security review"),
    "bandage": (", securing it without making the fingers cold, pale or difficult to move", ", and then tested sensation in each finger before allowing her to leave"),
    "infection": (", and the volunteer then explained which warning signs required medical help", ", eventually requiring hospital treatment and a longer course of medication"),
    "department": (", where a surgeon confirmed that no operation was necessary for the wrist injury", ", identifying a reaction that routine testing had not previously detected"),
}


def normalized(value):
    return re.sub(r"[^a-z0-9]+", " ", str(value or "").casefold()).strip()


def english_words(value):
    return re.findall(r"[A-Za-z]+(?:'[A-Za-z]+)?", str(value or ""))


def jaccard(left, right):
    a = set(english_words(str(left).casefold()))
    b = set(english_words(str(right).casefold()))
    return len(a & b) / len(a | b) if a and b else 0.0


def parse_collocations(value):
    items = []
    for raw in value.split("||"):
        phrase, translation, example = raw.split("~", 2)
        items.append({"phrase": phrase, "translation": translation, "example": example})
    return items


def parse_pos(value):
    items = []
    for raw in value.split("||"):
        part_of_speech, sentence = raw.split("~", 1)
        items.append({
            "partOfSpeech": part_of_speech,
            "sentence": sentence.rstrip(". ") + ".（写作层·独立例句）",
        })
    return items


def parse_forms(value):
    values = value.split("||")
    if len(values) != len(FORM_KEYS):
        raise AssertionError(f"wordForms bank needs five values: {value}")
    return dict(zip(FORM_KEYS, values))


def normalized_practice_type(value):
    for allowed in ALLOWED_PRACTICE_TYPES:
        if str(value).startswith(allowed):
            return allowed
    raise AssertionError(f"unknown practice type: {value}")


def add_unique(items, candidate, key):
    candidate_key = re.sub(r"\s+", " ", str(candidate.get(key, "")).casefold()).strip()
    existing_keys = {
        re.sub(r"\s+", " ", str(item.get(key, "")).casefold()).strip()
        for item in items
    }
    if candidate_key and candidate_key not in existing_keys:
        items.append(copy.deepcopy(candidate))


def add_advanced_layers(entry):
    word = entry["word"]
    new_collocations = entry["collocations"][-2:]
    synonyms = entry["synonyms"][:3]
    forms = entry["wordForms"]
    meanings = [entry.get("translation", "")]
    meanings.extend(
        f"{item.get('partOfSpeech', '')} {item.get('meaning', '')}"
        for item in entry.get("uncommonMeanings", [])
    )
    cards = [
        {
            "type": f"短语群·{word}异质搭配",
            "expression": "；".join(
                f"{item['phrase']}（{item['translation']}）" for item in new_collocations
            ),
            "example": new_collocations[0]["example"],
        },
        {
            "type": f"辨析·{word}句法边界",
            "expression": "；".join(
                f"{item['synonym']}：{item['usage']}" for item in synonyms
            ),
            "example": synonyms[0]["example"],
        },
        {
            "type": f"构词法·{word}词族",
            "expression": "；".join(f"{key}: {forms[key]}" for key in FORM_KEYS),
            "example": entry["posExamples"][2]["sentence"],
        },
        {
            "type": f"一词多义·{word}完整义项",
            "expression": "；".join(value for value in meanings if value),
            "example": entry["posExamples"][0]["sentence"],
        },
        {
            "type": f"写作提升·{word}同场景扩展",
            "expression": (
                f"先保留原句“{entry['sentenceUpgrade'][0]['original']}”，"
                f"再用 {word} 所在场景补充条件、结果或限制，不更换人物与核心事实。"
            ),
            "example": entry["sentenceUpgrade"][0]["upgraded"],
        },
    ]
    advanced = entry["advancedExpressions"]
    for card in cards:
        card_type = card["type"]
        if card_type.startswith("短语群·"):
            matching = next(
                (
                    item for item in advanced
                    if item.get("type") in {f"短语群·{word}", f"短语群·{word}异质搭配"}
                ),
                None,
            )
            if matching:
                if card["expression"] not in str(matching.get("expression", "")):
                    matching["expression"] = str(matching.get("expression", "")).rstrip("； ") + "；" + card["expression"]
                continue
        elif card_type.startswith("辨析·"):
            matching = next(
                (
                    item for item in advanced
                    if item.get("type") in {f"辨析·{word}", f"辨析·{word}句法边界"}
                ),
                None,
            )
            if matching:
                matching.update(copy.deepcopy(card))
                matching["type"] = f"辨析·{word}句法边界"
                continue
        elif card_type.startswith("构词法·"):
            matching = next(
                (
                    item for item in advanced
                    if item.get("type") in {f"构词法·{word} 词族", f"构词法·{word}词族"}
                ),
                None,
            )
            if matching:
                matching.update(copy.deepcopy(card))
                matching["type"] = f"构词法·{word}词族"
                continue
        elif card_type.startswith("一词多义·"):
            if any(
                str(item.get("type", "")).startswith((f"一词多义·{word}", f"熟词僻义·{word}"))
                for item in advanced
            ):
                continue
        elif card_type.startswith("写作提升·"):
            if any("写作" in str(item.get("type", "")) for item in advanced):
                continue
        add_unique(advanced, card, "type")


def validate_entry(entry):
    word = entry["word"]
    issues = []
    collocations = entry.get("collocations", [])
    synonyms = entry.get("synonyms", [])
    advanced = entry.get("advancedExpressions", [])
    practices = entry.get("classPractice", [])
    pos_examples = entry.get("posExamples", [])
    upgrades = entry.get("sentenceUpgrade", [])

    if not 10 <= len(collocations) <= 12:
        issues.append(f"{word}: collocations={len(collocations)}")
    if sum(bool(re.search(r"[\u3400-\u9fff]", str(item.get("example", "")))) for item in collocations) < len(collocations):
        issues.append(f"{word}: not every collocation example has Chinese/register")
    for left_index, left in enumerate(collocations):
        for right in collocations[left_index + 1:]:
            if jaccard(left.get("phrase"), right.get("phrase")) >= 0.75 and jaccard(left.get("example"), right.get("example")) >= 0.5:
                issues.append(f"{word}: near-duplicate collocations")
                break

    if len(synonyms) < 3:
        issues.append(f"{word}: synonyms={len(synonyms)}")
    syntax_count = sum(
        bool(re.search(r"作|定语|表语|宾补|主语|宾语|及物|不及物|前置|后置|句首|句中|后接|搭配|结构", str(item.get("usage", ""))))
        for item in synonyms
    )
    if syntax_count < 2:
        issues.append(f"{word}: syntax-rich synonym usages={syntax_count}")

    type_prefixes = {str(item.get("type", "")).split("·", 1)[0] for item in advanced}
    if len(advanced) < 5 or len(type_prefixes) < 4:
        issues.append(f"{word}: advanced depth/types={len(advanced)}/{len(type_prefixes)}")
    if not any("写作" in str(item.get("type", "")) for item in advanced):
        issues.append(f"{word}: missing writing-layer card")

    if set(entry.get("wordForms", {})) != set(FORM_KEYS):
        issues.append(f"{word}: bad wordForms keys")
    elif any(not str(entry["wordForms"].get(key, "")).strip() for key in FORM_KEYS):
        issues.append(f"{word}: empty wordForms value")

    if len(pos_examples) != 3:
        issues.append(f"{word}: posExamples={len(pos_examples)}")
    references = [entry.get("original_sentence", "")]
    references.extend(entry.get("readingExamples", []))
    references.extend(item.get("example", "") for item in collocations)
    for item in pos_examples:
        sentence = item.get("sentence", "")
        if len(english_words(sentence)) < 16:
            issues.append(f"{word}: short POS: {sentence}")
        if any(jaccard(sentence, reference) >= 0.65 for reference in references if reference):
            issues.append(f"{word}: POS too close to source: {sentence}")

    if len(upgrades) != 2:
        issues.append(f"{word}: upgrades={len(upgrades)}")
    for index, item in enumerate(upgrades):
        if index >= len(pos_examples):
            continue
        if item.get("original") != re.sub(r"\.（写作层·独立例句）$", ".", pos_examples[index]["sentence"]):
            issues.append(f"{word}: upgrade original not anchored")
        if not str(item.get("upgraded", "")).startswith(item.get("original", "").rstrip(".")):
            issues.append(f"{word}: upgraded sentence changed prefix")
        if len(english_words(item.get("upgraded", ""))) < 22:
            issues.append(f"{word}: short upgraded sentence")

    practice_types = {normalized_practice_type(item.get("type", "")) for item in practices}
    if len(practices) < 4 or len(practice_types) < 3:
        issues.append(f"{word}: practice depth/types={len(practices)}/{len(practice_types)}")
    for item in practices:
        if not item.get("question") or not item.get("answer") or not item.get("note"):
            issues.append(f"{word}: malformed practice")
        if any(len(run) != 4 for run in re.findall(r"_{2,}", item.get("question", ""))):
            issues.append(f"{word}: malformed blank")
    return issues


def main():
    baseline = json.loads(BASELINE.read_text(encoding="utf-8-sig"))
    data = copy.deepcopy(baseline)
    words = [entry["word"] for entry in data]
    word_set = set(words)
    for label, bank in (
        ("POS_BANK", POS_BANK),
        ("FORM_BANK", FORM_BANK),
        ("COLLOCATION_BANK", COLLOCATION_BANK),
        ("UPGRADE_SUFFIXES", UPGRADE_SUFFIXES),
    ):
        if set(bank) != word_set:
            raise AssertionError(
                f"{label} mismatch; missing={sorted(word_set - set(bank))}; extra={sorted(set(bank) - word_set)}"
            )

    by_word = {entry["word"]: entry for entry in data}
    for word in words:
        entry = by_word[word]
        replacement_map = ADVANCED_CARD_REPLACEMENTS.get(word, {})
        drop_types = ADVANCED_TYPES_TO_DROP.get(word, set())
        curated_advanced = []
        for card in entry.get("advancedExpressions", []):
            card_type = card.get("type", "")
            if card_type in drop_types:
                continue
            curated_advanced.append(copy.deepcopy(replacement_map.get(card_type, card)))
        entry["advancedExpressions"] = curated_advanced
        entry["posExamples"] = parse_pos(POS_BANK[word])
        entry["wordForms"] = parse_forms(FORM_BANK[word])

        for item in entry.get("collocations", []):
            if not re.search(r"[\u3400-\u9fff]", str(item.get("example", ""))):
                item["example"] = str(item.get("example", "")).rstrip() + " （课堂层·核心搭配）"
        existing_phrases = {normalized(item.get("phrase")) for item in entry["collocations"]}
        for item in parse_collocations(COLLOCATION_BANK[word]):
            if normalized(item["phrase"]) in existing_phrases:
                raise AssertionError(f"duplicate collocation addition: {word}/{item['phrase']}")
            entry["collocations"].append(item)
            existing_phrases.add(normalized(item["phrase"]))

        existing_synonyms = {normalized(item.get("synonym")) for item in entry.get("synonyms", [])}
        for synonym, translation, example, usage in SYNONYM_BANK.get(word, []):
            if len(entry["synonyms"]) >= 3:
                break
            if normalized(synonym) not in existing_synonyms:
                entry["synonyms"].append({
                    "synonym": synonym,
                    "translation": translation,
                    "example": example + "（课堂层·辨析例句）",
                    "usage": usage,
                })
                existing_synonyms.add(normalized(synonym))
        if len(entry.get("synonyms", [])) < 3:
            raise AssertionError(f"insufficient synonym bank: {word}/{len(entry.get('synonyms', []))}")
        usage_patches = SYNONYM_USAGE_PATCHES.get(word, {})
        for item in entry["synonyms"]:
            replacement = usage_patches.get(item.get("synonym"))
            if replacement:
                item["usage"] = replacement

        entry["sentenceUpgrade"] = []
        suffixes = UPGRADE_SUFFIXES[word]
        for index in range(2):
            original = re.sub(r"\.（写作层·独立例句）$", ".", entry["posExamples"][index]["sentence"])
            upgraded = original.rstrip(".") + suffixes[index] + ".（写作层·同场景升级）"
            entry["sentenceUpgrade"].append({
                "original": original,
                "upgraded": upgraded,
                "techniques": (
                    f"完整保留 {word} 原句的主语、动作与事实链；围绕“"
                    f"{' '.join(english_words(original)[:7])}”补充同一场景中的条件、结果或限制。"
                ),
            })

        entry["classPractice"] = [
            {
                **copy.deepcopy(item),
                "type": normalized_practice_type(item.get("type", "")),
                "question": re.sub(r"_{2,}", "____", item.get("question", "")),
                "note": str(item.get("note", "")).replace("PPT", "课件"),
            }
            for item in entry.get("classPractice", [])
        ]
        new_collocations = entry["collocations"][-2:]
        practice_additions = [
            {
                "type": "短语填空",
                "question": f"完成课堂词块：____（{new_collocations[0]['translation']}）",
                "answer": new_collocations[0]["phrase"],
                "note": f"考查 {word} 的异质搭配 {new_collocations[0]['phrase']}，不要用词义相近但结构不同的表达。",
            },
            {
                "type": "汉译英",
                "question": f"用本词条的准确搭配翻译：“{new_collocations[1]['translation']}”。",
                "answer": new_collocations[1]["phrase"],
                "note": f"答案须保留 {word} 的完整词块 {new_collocations[1]['phrase']}。",
            },
        ]
        for addition in practice_additions:
            add_unique(entry["classPractice"], addition, "question")
        for addition in EXTRA_PRACTICE_BANK.get(word, []):
            add_unique(entry["classPractice"], addition, "question")

        add_advanced_layers(entry)
        for card in PPT_ADVANCED_BANK.get(word, []):
            add_unique(entry["advancedExpressions"], card, "type")

    errors = []
    for current, original in zip(data, baseline):
        if current["word"] != original["word"]:
            errors.append("word order changed")
            continue
        for field in IMMUTABLE:
            if current.get(field) != original.get(field):
                errors.append(f"immutable changed: {current['word']}.{field}")
        for field in ("uncommonMeanings", "idioms"):
            if current.get(field) != original.get(field):
                errors.append(f"preserved field changed: {current['word']}.{field}")
        errors.extend(validate_entry(current))
    if errors:
        raise AssertionError("\n".join(errors))

    before_sha = hashlib.sha256(TARGET.read_bytes()).hexdigest()
    serialized = json.dumps(data, ensure_ascii=False, indent=2) + "\n"
    TARGET.write_text(serialized, encoding="utf-8")
    print(json.dumps({
        "entries": len(data),
        "before_sha256": before_sha,
        "after_sha256": hashlib.sha256(TARGET.read_bytes()).hexdigest(),
        "collocations": sum(len(entry["collocations"]) for entry in data),
        "synonyms": sum(len(entry["synonyms"]) for entry in data),
        "advanced_cards": sum(len(entry["advancedExpressions"]) for entry in data),
        "practices": sum(len(entry["classPractice"]) for entry in data),
        "immutable_match": True,
    }, ensure_ascii=False))


if __name__ == "__main__":
    main()
