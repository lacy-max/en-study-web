import Taro from '@tarojs/taro'

const GAME_KEY = 'en_game_v1'

/** 每开一次宝箱需要的星星 */
export const CHEST_COST = 50

const EMPTY = {
  stars: 0, // 累计总星
  cards: [], // 已解锁卡牌 id
  gender: '', // 'boy' | 'girl'，决定奖励样式
  badges: [], // 徽章 id
  accessories: [], // 宝箱配饰 id
  chestUsed: 0, // 已投入宝箱的星星
  streak: 0, // 连续学习天数
  lastDay: '', // 最后活跃日期 YYYY-MM-DD
  bestCombo: 0, // 历史最高连击
  days: [] // 打卡日期列表 YYYY-MM-DD
}

function todayStr() {
  const d = new Date()
  const m = `${d.getMonth() + 1}`.padStart(2, '0')
  const day = `${d.getDate()}`.padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

function yesterdayStr() {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  const m = `${d.getMonth() + 1}`.padStart(2, '0')
  const day = `${d.getDate()}`.padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

export function getGame() {
  let g = null
  try {
    g = Taro.getStorageSync(GAME_KEY)
  } catch (e) {}
  return { ...EMPTY, ...(g || {}) }
}

export function saveGame(patch) {
  const g = { ...getGame(), ...patch }
  try {
    Taro.setStorageSync(GAME_KEY, g)
  } catch (e) {}
  return g
}

/** 加星星 */
export function addStars(n) {
  if (!n || n <= 0) return getGame()
  const g = getGame()
  return saveGame({ stars: g.stars + n })
}

/** 记录今天来过，维护连续天数 */
export function touchToday() {
  const g = getGame()
  const today = todayStr()
  if (g.lastDay === today) return g
  const streak = g.lastDay === yesterdayStr() ? g.streak + 1 : 1
  const days = (g.days || []).indexOf(today) >= 0 ? g.days : (g.days || []).concat([today]).slice(-400)
  return saveGame({ lastDay: today, streak, days })
}

/** 设置性别（登录时选择，运营侧决定奖励） */
export function setGender(gender) {
  if (gender !== 'boy' && gender !== 'girl') return getGame()
  return saveGame({ gender })
}

export function getGender() {
  return getGame().gender || ''
}

/** 解锁卡牌，返回是否新解锁 */
export function unlockCard(cardId) {
  const g = getGame()
  if (g.cards.indexOf(cardId) >= 0) return false
  saveGame({ cards: g.cards.concat([cardId]) })
  return true
}

/** 加徽章，返回是否新获得 */
export function addBadge(badgeId) {
  const g = getGame()
  if (g.badges.indexOf(badgeId) >= 0) return false
  saveGame({ badges: g.badges.concat([badgeId]) })
  return true
}

export function updateBestCombo(combo) {
  const g = getGame()
  if (combo > (g.bestCombo || 0)) saveGame({ bestCombo: combo })
}

/** 宝箱进度：累计星 - 已消耗 */
export function chestProgress() {
  const g = getGame()
  return Math.max(0, g.stars - (g.chestUsed || 0))
}

/** 开宝箱，返回 { ok, accessory } */
export function openChest(pool) {
  const g = getGame()
  const ready = g.stars - (g.chestUsed || 0)
  if (ready < CHEST_COST) return { ok: false, need: CHEST_COST - ready }
  const owned = g.accessories || []
  const left = pool.filter(a => owned.indexOf(a.id) < 0)
  if (left.length === 0) {
    // 配饰已集齐，返还星星奖励，不再扣进度
    return { ok: true, accessory: null, allOwned: true }
  }
  const pick = left[Math.floor(Math.random() * left.length)]
  saveGame({
    accessories: owned.concat([pick.id]),
    chestUsed: (g.chestUsed || 0) + CHEST_COST
  })
  return { ok: true, accessory: pick }
}
