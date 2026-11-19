/** 卡牌、配饰、徽章的定义表 —— 想加新的，复制一份改内容即可 */

/** 卡牌：每通关一个单元解锁一张 */
export const CARDS = {
  unit01: { id: 'unit01', emoji: '💬', title: '日常口语寒暄', color: '#fb923c', color2: '#fdba74', animal: 'cat' },
  unit02: { id: 'unit02', emoji: '🤗', title: '情绪与关心', color: '#38bdf8', color2: '#7dd3fc', animal: 'bear' },
  unit03: { id: 'unit03', emoji: '🍔', title: '点餐与购物', color: '#f59e0b', color2: '#fcd34d', animal: 'rabbit' },
  unit04: { id: 'unit04', emoji: '🚌', title: '出行与问路', color: '#34d399', color2: '#6ee7b7', animal: 'duck' },
  unit05: { id: 'unit05', emoji: '🌤', title: '天气与季节', color: '#60a5fa', color2: '#93c5fd', animal: 'cat' },
  unit06: { id: 'unit06', emoji: '💼', title: '工作与学习', color: '#a78bfa', color2: '#c4b5fd', animal: 'bear' },
  unit07: { id: 'unit07', emoji: '👨‍👩‍👧', title: '家庭与朋友', color: '#f472b6', color2: '#f9a8d4', animal: 'rabbit' },
  unit08: { id: 'unit08', emoji: '🎾', title: '爱好与运动', color: '#22d3ee', color2: '#67e8f9', animal: 'duck' },
  unit09: { id: 'unit09', emoji: '✈️', title: '旅行见闻', color: '#818cf8', color2: '#a5b4fc', animal: 'cat' },
  unit10: { id: 'unit10', emoji: '🩺', title: '健康与身体', color: '#f87171', color2: '#fca5a5', animal: 'bear' }
}

/** 女孩专属奖励：每完成一关解锁一张原创卡通娃娃卡（自绘 emoji 风格，不涉及他人 IP） */
export const DOLL_CARDS = [
  { id: 'doll01', emoji: '🎀', title: '蝴蝶结娃娃', color: '#f9a8d4', color2: '#fbcfe8' },
  { id: 'doll02', emoji: '👧', title: '马尾娃娃', color: '#fda4af', color2: '#fecdd3' },
  { id: 'doll03', emoji: '🌸', title: '樱花娃娃', color: '#f0abfc', color2: '#f5d0fe' },
  { id: 'doll04', emoji: '🧸', title: '抱熊娃娃', color: '#fdba74', color2: '#fed7aa' },
  { id: 'doll05', emoji: '🍭', title: '糖果娃娃', color: '#a5b4fc', color2: '#c7d2fe' },
  { id: 'doll06', emoji: '🌷', title: '郁金香娃娃', color: '#fca5a5', color2: '#fecaca' },
  { id: 'doll07', emoji: '🦄', title: '独角兽娃娃', color: '#c4b5fd', color2: '#ddd6fe' },
  { id: 'doll08', emoji: '🌈', title: '彩虹娃娃', color: '#93c5fd', color2: '#bfdbfe' }
]

/** 按章节顺序分配娃娃卡（第 1 关给第 1 张，超过 8 关循环） */
export function dollForChapter(chapterIndex) {
  if (DOLL_CARDS.length === 0) return null
  const i = Math.max(0, chapterIndex) % DOLL_CARDS.length
  return DOLL_CARDS[i]
}

/** 宝箱里能开出的伙伴配饰 */
export const ACCESSORIES = [
  { id: 'cap', emoji: '🎩', name: '小礼帽' },
  { id: 'scarf', emoji: '🧣', name: '红围巾' },
  { id: 'glass', emoji: '👓', name: '圆眼镜' },
  { id: 'crown', emoji: '👑', name: '小皇冠' },
  { id: 'bow', emoji: '🎀', name: '蝴蝶结' }
]

/** 徽章 */
export const BADGES = [
  { id: 'first_win', emoji: '🎖', name: '首战告捷', desc: '完成一个单元' },
  { id: 'perfect', emoji: '💯', name: '满分达人', desc: '单次得分 90 以上' },
  { id: 'combo5', emoji: '🔥', name: '连击高手', desc: '连击达到 5' },
  { id: 'streak3', emoji: '📅', name: '坚持三天', desc: '连续 3 天来学' },
  { id: 'collector', emoji: '📚', name: '收集家', desc: '集齐 3 张卡牌' }
]

export function getBadge(id) {
  return BADGES.filter(b => b.id === id)[0]
}
