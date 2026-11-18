/**
 * 章节数据 —— 你每天/每个单元只需要改这个文件
 *
 * 结构说明：
 * chapters: 单元列表
 *   id        单元唯一标识（不要重复）
 *   title     列表页显示的标题
 *   subtitle  列表页副标题
 *   words     生词（含例句），用于「连线配对」和「交叉练习」
 *       en          英文单词/短语（配对时的匹配键，不能重复）
 *       cn          中文释义
 *       sentence    例句（自己写的，不要照搬多邻国原句）
 *       answer      被挖空的目标词（交叉练习的正确答案）
 *       sentenceCn  例句中文翻译
 *   sentences 句子列表，用于「句子填空」模式
 *
 * 新增一个单元 = 复制一份对象，改 id/title/内容即可
 */

export const chapters = [
  {
    id: 'unit01',
    title: 'Unit 01 · 日常口语寒暄',
    subtitle: '生词 20 个 · 巩固练习',
    words: [
      { en: 'see you soon', cn: '回头见', sentence: 'I will call you soon.', answer: 'call you', sentenceCn: '我很快就会给你打电话。' },
      { en: 'text', cn: '短信；发消息', sentence: 'Please text me later.', answer: 'text', sentenceCn: '稍后给我发消息。' },
      { en: 'agree', cn: '同意', sentence: 'I agree with you.', answer: 'agree', sentenceCn: '我同意你的看法。' },
      { en: 'agree with', cn: '同意（某人）', sentence: 'I agree with this idea.', answer: 'agree with', sentenceCn: '我赞同这个想法。' },
      { en: "that's too bad", cn: '那太遗憾了', sentence: "That's too bad, you can't come.", answer: "that's too bad", sentenceCn: '真可惜，你来不了。' },
      { en: 'mad', cn: '生气的', sentence: 'He is mad now.', answer: 'mad', sentenceCn: '他现在很生气。' },
      { en: 'mad at', cn: '对……生气', sentence: 'The teacher is not mad at the boy.', answer: 'mad at', sentenceCn: '老师没有生这个男孩的气。' },
      { en: 'plan to', cn: '计划去做', sentence: 'I plan to go home.', answer: 'plan to', sentenceCn: '我打算回家。' },
      { en: 'jealous', cn: '嫉妒的', sentence: 'She is not jealous.', answer: 'jealous', sentenceCn: '她并不嫉妒。' },
      { en: 'try to', cn: '尽力去做', sentence: 'I try to help you.', answer: 'try to', sentenceCn: '我尽力帮你。' },
      { en: 'want to', cn: '想要', sentence: 'I want to learn English.', answer: 'want to', sentenceCn: '我想要学英语。' },
      { en: 'how are you doing', cn: '你最近怎么样', sentence: 'Hi, how are you doing?', answer: 'how are you doing', sentenceCn: '嗨，你最近还好吗？' },
      { en: "'d like to", cn: '想要（would like to）', sentence: "I 'd like to drink water.", answer: "'d like to", sentenceCn: '我想喝点水。' },
      { en: 'worried', cn: '担心的', sentence: 'She is worried about her kid.', answer: 'worried', sentenceCn: '她很担心她的孩子。' },
      { en: 'seem', cn: '似乎，好像', sentence: 'You seem tired.', answer: 'seem', sentenceCn: '你看起来很累。' },
      { en: 'lonely', cn: '孤单的', sentence: 'He feels lonely.', answer: 'lonely', sentenceCn: '他感到孤单。' },
      { en: 'everything', cn: '一切', sentence: 'Everything is ok.', answer: 'everything', sentenceCn: '一切都好。' },
      { en: "what's wrong", cn: '怎么了', sentence: "What's wrong with you?", answer: "what's wrong", sentenceCn: '你怎么了？' },
      { en: 'explain', cn: '解释', sentence: 'Let me explain it.', answer: 'explain', sentenceCn: '让我来解释一下。' },
      { en: 'talk', cn: '交谈', sentence: 'We talk every day.', answer: 'talk', sentenceCn: '我们每天聊天。' }
    ],
    sentences: [
      'I can explain',
      'you don\u2019t need to explain',
      'we need to have fun together',
      'max is not happy ,he feels sad',
      'i can\u2019t talk right now',
      "she's always worried about him",
      'I want to spend more time with you',
      'I spend a lot of time with her',
      "Well that's too bad",
      'Are you mad at them',
      'I agree with you'
    ]
  },
  {
    id: 'unit02',
    title: 'Unit 02 · 情绪与关心',
    subtitle: '生词 4 个 · 巩固练习',
    words: [
      { en: 'excited', cn: '兴奋的', sentence: 'The kids are excited about the trip.', answer: 'excited', sentenceCn: '孩子们对这次旅行很兴奋。' },
      { en: 'nervous', cn: '紧张的', sentence: 'I feel nervous before the test.', answer: 'nervous', sentenceCn: '考试前我感到紧张。' },
      { en: 'calm', cn: '平静的', sentence: 'Please stay calm.', answer: 'calm', sentenceCn: '请保持平静。' },
      { en: 'proud of', cn: '为……骄傲', sentence: 'My parents are proud of me.', answer: 'proud of', sentenceCn: '我父母为我骄傲。' },
      { en: 'tired of', cn: '厌倦', sentence: 'I am tired of this game.', answer: 'tired of', sentenceCn: '我厌倦了这个游戏。' }
    ],
    sentences: [
      'She feels much better today',
      'I am excited to see you',
      'He is not afraid of the dark',
      'We should take a short break',
      'They are proud of their work'
    ]
  },
  {
    id: 'unit03',
    title: 'Unit 03 · 点餐与购物',
    subtitle: '生词 8 个 · 巩固练习',
    words: [
      { en: "order", cn: "点餐；点单", sentence: "We order two bowls of noodles.", answer: "order", sentenceCn: "我们点两碗面。" },
      { en: "menu", cn: "菜单", sentence: "The menu is on the wall.", answer: "menu", sentenceCn: "菜单在墙上。" },
      { en: "receipt", cn: "小票；收据", sentence: "Keep the receipt in your bag.", answer: "receipt", sentenceCn: "把小票放进包里。" },
      { en: "discount", cn: "折扣", sentence: "This shop gives a small discount.", answer: "discount", sentenceCn: "这家店有小折扣。" },
      { en: "change", cn: "零钱", sentence: "Do you have any change?", answer: "change", sentenceCn: "你有零钱吗？" },
      { en: "try on", cn: "试穿", sentence: "You can try on the jacket here.", answer: "try on", sentenceCn: "你可以在这里试穿这件外套。" },
      { en: "size", cn: "尺码；尺寸", sentence: "This size is too small for me.", answer: "size", sentenceCn: "这个尺码对我来说太小了。" },
      { en: "cash", cn: "现金", sentence: "I will pay in cash.", answer: "cash", sentenceCn: "我用现金付款。" }
    ],
    sentences: [
      "I would like to order some soup",
      "The price on the menu looks fine to me",
      "Please keep the receipt for me",
      "She paid in cash at the counter",
      "This size fits me very well"
    ]
  },
  {
    id: 'unit04',
    title: 'Unit 04 · 出行与问路',
    subtitle: '生词 8 个 · 巩固练习',
    words: [
      { en: "station", cn: "车站", sentence: "The station is near my home.", answer: "station", sentenceCn: "车站离我家很近。" },
      { en: "ticket", cn: "车票", sentence: "I bought a ticket this morning.", answer: "ticket", sentenceCn: "我今天早上买了车票。" },
      { en: "turn left", cn: "向左转", sentence: "Turn left at the corner.", answer: "turn left", sentenceCn: "在拐角处向左转。" },
      { en: "cross the street", cn: "过马路", sentence: "Please cross the street carefully.", answer: "cross the street", sentenceCn: "过马路请小心。" },
      { en: "nearby", cn: "附近的", sentence: "There is a park nearby.", answer: "nearby", sentenceCn: "附近有一个公园。" },
      { en: "subway", cn: "地铁", sentence: "We take the subway every day.", answer: "subway", sentenceCn: "我们每天坐地铁。" },
      { en: "get lost", cn: "迷路", sentence: "I got lost in the old town.", answer: "get lost", sentenceCn: "我在老城里迷路了。" },
      { en: "far from", cn: "离……远", sentence: "The airport is far from here.", answer: "far from", sentenceCn: "机场离这里很远。" }
    ],
    sentences: [
      "Go straight and turn left at the corner",
      "The subway station is not far from here",
      "We got lost on the way to the park",
      "Please cross the street when the light is green",
      "There is a small shop nearby"
    ]
  },
  {
    id: 'unit05',
    title: 'Unit 05 · 天气与季节',
    subtitle: '生词 8 个 · 巩固练习',
    words: [
      { en: "sunny", cn: "晴朗的", sentence: "It is sunny this morning.", answer: "sunny", sentenceCn: "今天早上是晴天。" },
      { en: "cloudy", cn: "多云的", sentence: "The sky is cloudy today.", answer: "cloudy", sentenceCn: "今天天空多云。" },
      { en: "windy", cn: "有风的", sentence: "It is windy on the hill.", answer: "windy", sentenceCn: "山上风很大。" },
      { en: "rainy", cn: "下雨的", sentence: "We stay home on rainy days.", answer: "rainy", sentenceCn: "下雨天我们待在家。" },
      { en: "snowy", cn: "下雪的", sentence: "The road is snowy and white.", answer: "snowy", sentenceCn: "道路被雪覆盖，白茫茫的。" },
      { en: "temperature", cn: "温度", sentence: "The temperature is dropping.", answer: "temperature", sentenceCn: "温度在下降。" },
      { en: "umbrella", cn: "雨伞", sentence: "Take an umbrella with you.", answer: "umbrella", sentenceCn: "带把伞出门。" },
      { en: "season", cn: "季节", sentence: "Autumn is my favorite season.", answer: "season", sentenceCn: "秋天是我最喜欢的季节。" }
    ],
    sentences: [
      "It is cloudy and cool outside",
      "The temperature will drop tonight",
      "Take an umbrella before you go out",
      "Autumn is a nice season for walking",
      "It was windy on the beach yesterday"
    ]
  },
  {
    id: 'unit06',
    title: 'Unit 06 · 工作与学习',
    subtitle: '生词 8 个 · 巩固练习',
    words: [
      { en: "meeting", cn: "会议", sentence: "The meeting starts at nine.", answer: "meeting", sentenceCn: "会议九点开始。" },
      { en: "deadline", cn: "截止日期", sentence: "The deadline is next Friday.", answer: "deadline", sentenceCn: "截止日期是下周五。" },
      { en: "report", cn: "报告", sentence: "I sent the report last night.", answer: "report", sentenceCn: "我昨晚交了报告。" },
      { en: "colleague", cn: "同事", sentence: "My colleague helps me a lot.", answer: "colleague", sentenceCn: "我的同事帮了我很多。" },
      { en: "schedule", cn: "日程", sentence: "My schedule is full today.", answer: "schedule", sentenceCn: "我今天的日程排满了。" },
      { en: "prepare", cn: "准备", sentence: "I prepare the slides before the class.", answer: "prepare", sentenceCn: "上课前我准备幻灯片。" },
      { en: "on time", cn: "准时", sentence: "Please finish the task on time.", answer: "on time", sentenceCn: "请按时完成任务。" },
      { en: "ask for help", cn: "寻求帮助", sentence: "Do not be afraid to ask for help.", answer: "ask for help", sentenceCn: "不要害怕寻求帮助。" }
    ],
    sentences: [
      "The meeting will start at nine sharp",
      "I need to finish the report today",
      "My schedule is quite full this week",
      "She always asks for help when she needs it",
      "We prepare everything before the class"
    ]
  },
  {
    id: 'unit07',
    title: 'Unit 07 · 家庭与朋友',
    subtitle: '生词 8 个 · 巩固练习',
    words: [
      { en: "parents", cn: "父母", sentence: "My parents live in the city.", answer: "parents", sentenceCn: "我父母住在城里。" },
      { en: "cousin", cn: "表亲；堂亲", sentence: "My cousin is a student.", answer: "cousin", sentenceCn: "我表哥是个学生。" },
      { en: "neighbor", cn: "邻居", sentence: "Our neighbor has a small dog.", answer: "neighbor", sentenceCn: "我们的邻居养了一条小狗。" },
      { en: "gather", cn: "聚会；聚集", sentence: "We gather at my aunt’s home.", answer: "gather", sentenceCn: "我们在我姑姑家聚会。" },
      { en: "celebrate", cn: "庆祝", sentence: "We celebrate her birthday together.", answer: "celebrate", sentenceCn: "我们一起庆祝她的生日。" },
      { en: "visit", cn: "拜访", sentence: "I visit my grandparents every month.", answer: "visit", sentenceCn: "我每个月去看望祖父母。" },
      { en: "bring a gift", cn: "带礼物", sentence: "Please bring a gift to the party.", answer: "bring a gift", sentenceCn: "聚会请带一份礼物。" },
      { en: "keep in touch", cn: "保持联系", sentence: "We keep in touch by phone.", answer: "keep in touch", sentenceCn: "我们用电话保持联系。" }
    ],
    sentences: [
      "My parents came to visit us last week",
      "We celebrate the new year with our family",
      "Our neighbor brought a gift for the baby",
      "I keep in touch with my cousin by phone",
      "The whole family gathered at the table"
    ]
  },
  {
    id: 'unit08',
    title: 'Unit 08 · 爱好与运动',
    subtitle: '生词 8 个 · 巩固练习',
    words: [
      { en: "hiking", cn: "徒步", sentence: "Hiking is good for your health.", answer: "hiking", sentenceCn: "徒步对健康有好处。" },
      { en: "swimming", cn: "游泳", sentence: "She goes swimming after class.", answer: "swimming", sentenceCn: "她下课后去游泳。" },
      { en: "badminton", cn: "羽毛球", sentence: "We play badminton on Sundays.", answer: "badminton", sentenceCn: "我们周日打羽毛球。" },
      { en: "workout", cn: "锻炼", sentence: "A short workout is enough.", answer: "workout", sentenceCn: "短时间锻炼就够了。" },
      { en: "relax", cn: "放松", sentence: "I relax by listening to music.", answer: "relax", sentenceCn: "我听音乐放松。" },
      { en: "practice", cn: "练习", sentence: "Practice makes it easier.", answer: "practice", sentenceCn: "多练习就会更容易。" },
      { en: "join a club", cn: "加入社团", sentence: "I want to join a club this term.", answer: "join a club", sentenceCn: "这学期我想加入一个社团。" },
      { en: "free time", cn: "空闲时间", sentence: "What do you do in your free time?", answer: "free time", sentenceCn: "你空闲时间做什么？" }
    ],
    sentences: [
      "I play badminton with my friends on Sundays",
      "She spends her free time on hiking",
      "A short workout after work helps me relax",
      "He wants to join a club this term",
      "Practice a little every day and you will improve"
    ]
  },
  {
    id: 'unit09',
    title: 'Unit 09 · 旅行见闻',
    subtitle: '生词 8 个 · 巩固练习',
    words: [
      { en: "passport", cn: "护照", sentence: "Do not forget your passport.", answer: "passport", sentenceCn: "别忘了你的护照。" },
      { en: "luggage", cn: "行李", sentence: "My luggage is very heavy.", answer: "luggage", sentenceCn: "我的行李很重。" },
      { en: "souvenir", cn: "纪念品", sentence: "I bought a small souvenir.", answer: "souvenir", sentenceCn: "我买了一个小纪念品。" },
      { en: "sightseeing", cn: "观光", sentence: "We go sightseeing in the morning.", answer: "sightseeing", sentenceCn: "我们上午去观光。" },
      { en: "journey", cn: "旅程", sentence: "The journey took five hours.", answer: "journey", sentenceCn: "这段旅程花了五个小时。" },
      { en: "book a room", cn: "订房间", sentence: "I booked a room near the river.", answer: "book a room", sentenceCn: "我在河边订了一个房间。" },
      { en: "take photos", cn: "拍照", sentence: "We take photos by the lake.", answer: "take photos", sentenceCn: "我们在湖边拍照。" },
      { en: "local food", cn: "当地美食", sentence: "The local food is really tasty.", answer: "local food", sentenceCn: "当地美食真的很好吃。" }
    ],
    sentences: [
      "Please put your passport in a safe place",
      "The journey to the island was long but nice",
      "We took many photos by the lake",
      "I booked a room near the train station",
      "The local food here is fresh and tasty"
    ]
  },
  {
    id: 'unit10',
    title: 'Unit 10 · 健康与身体',
    subtitle: '生词 8 个 · 巩固练习',
    words: [
      { en: "headache", cn: "头痛", sentence: "I have a light headache.", answer: "headache", sentenceCn: "我有点头痛。" },
      { en: "fever", cn: "发烧", sentence: "She had a fever last night.", answer: "fever", sentenceCn: "她昨晚发烧了。" },
      { en: "medicine", cn: "药", sentence: "Take the medicine after dinner.", answer: "medicine", sentenceCn: "晚饭后吃药。" },
      { en: "rest", cn: "休息", sentence: "You should rest for a day.", answer: "rest", sentenceCn: "你应该休息一天。" },
      { en: "recover", cn: "康复", sentence: "He will recover soon.", answer: "recover", sentenceCn: "他很快就会康复。" },
      { en: "drink water", cn: "喝水", sentence: "Drink more water every day.", answer: "drink water", sentenceCn: "每天多喝水。" },
      { en: "see a doctor", cn: "看医生", sentence: "You should see a doctor today.", answer: "see a doctor", sentenceCn: "你今天应该去看医生。" },
      { en: "feel sick", cn: "不舒服", sentence: "I feel sick in the morning.", answer: "feel sick", sentenceCn: "我早上感到不舒服。" }
    ],
    sentences: [
      "I have a headache and I need some rest",
      "Take the medicine twice a day",
      "You should see a doctor if the fever stays",
      "Drink more water and go to bed early",
      "He recovered after a few days of rest"
    ]
  }
]

export function getChapterById(id) {
  return chapters.find(c => c.id === id) || chapters[0]
}
