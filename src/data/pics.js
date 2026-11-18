/** 单词 → 图片（emoji），儿童模式用图代替文字 */

const PICS = {
  // unit01 日常口语寒暄
  'see you soon': '👋',
  text: '💬',
  agree: '✅',
  'agree with': '🤝',
  "that's too bad": '😢',
  mad: '😠',
  'mad at': '😤',
  'plan to': '📅',
  jealous: '😒',
  'try to': '💪',
  'want to': '🫶',
  'how are you doing': '🙋',
  "'d like to": '☝️',
  worried: '😟',
  seem: '🤔',
  lonely: '🧍',
  everything: '🌍',
  "what's wrong": '❓',
  explain: '🗣',
  talk: '💬',

  // unit02 情绪与关心
  excited: '🤩',
  nervous: '😰',
  calm: '😌',
  'proud of': '🏆',
  'tired of': '😴',

  // unit03 点餐与购物
  order: '📋',
  menu: '📖',
  receipt: '🧾',
  discount: '🏷',
  change: '💵',
  'try on': '👕',
  size: '📏',
  cash: '💰',

  // unit04 出行与问路
  station: '🚉',
  ticket: '🎫',
  'turn left': '⬅️',
  'cross the street': '🚸',
  nearby: '📍',
  subway: '🚇',
  'get lost': '🧭',
  'far from': '📐',

  // unit05 天气与季节
  sunny: '☀️',
  cloudy: '☁️',
  windy: '🌬',
  rainy: '🌧',
  snowy: '❄️',
  temperature: '🌡',
  umbrella: '☂️',
  season: '🍂',

  // unit06 工作与学习
  meeting: '🗓',
  deadline: '⏰',
  report: '📄',
  colleague: '👥',
  schedule: '📆',
  prepare: '🧰',
  'on time': '🕘',
  'ask for help': '🙋‍♂️',

  // unit07 家庭与朋友
  parents: '👨‍👩‍👧',
  cousin: '👦',
  neighbor: '🏘',
  gather: '🫂',
  celebrate: '🎉',
  visit: '🚪',
  'bring a gift': '🎁',
  'keep in touch': '📞',

  // unit08 爱好与运动
  hiking: '🥾',
  swimming: '🏊',
  badminton: '🏸',
  workout: '🏋️',
  relax: '🧘',
  practice: '🎯',
  'join a club': '👥',
  'free time': '⏳',

  // unit09 旅行见闻
  passport: '🛂',
  luggage: '🧳',
  souvenir: '🎐',
  sightseeing: '📷',
  journey: '🛤',
  'book a room': '🏨',
  'take photos': '📸',
  'local food': '🍜',

  // unit10 健康与身体
  headache: '🤕',
  fever: '🤒',
  medicine: '💊',
  rest: '🛌',
  recover: '🌱',
  'drink water': '💧',
  'see a doctor': '👨‍⚕️',
  'feel sick': '🤢'
}

const FALLBACK = ['📘', '🎈', '🌟', '🧩', '🍎', '🚀', '🎨', '🐣']

/** 没配图的词，按字母算一个固定图标，保证每次看到的是同一张 */
export function picOf(word) {
  const key = String(word || '').toLowerCase().trim()
  if (PICS[key]) return PICS[key]
  let h = 0
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) % 999
  return FALLBACK[h % FALLBACK.length]
}

export default PICS
