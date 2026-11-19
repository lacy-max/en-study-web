/** 单词 → 图片（emoji），儿童模式用图代替文字
 *
 * 以后要换成开源插画（OpenMoji / Twemoji）：
 *   1. 跑 `python3 tools/fetch_openmoji.py`
 *   2. 它会按下面的 emoji 映射下载 SVG 到 src/assets/pics/ 并生成 picAssets.js
 *   3. 页面会自动优先用真实图片，找不到再退回 emoji
 */

const PICS = {
  // ---- L0 动物 ----
  cat: '🐱',
  dog: '🐶',
  bird: '🐦',
  fish: '🐟',
  duck: '🦆',
  pig: '🐷',
  cow: '🐮',
  sheep: '🐑',
  rabbit: '🐰',
  monkey: '🐵',
  tiger: '🐯',
  panda: '🐼',
  elephant: '🐘',
  animal: '🐾',
  zoo: '🦁',

  // ---- L0 打招呼 ----
  hi: '👋',
  hello: '👋',
  bye: '👋',
  yes: '✅',
  no: '❌',
  please: '🙏',
  thanks: '🙏',
  sorry: '😔',
  good: '👍',
  morning: '🌅',
  night: '🌙',
  name: '🏷',
  baby: '👶',
  ok: '👌',
  wow: '🤩',

  // ---- L0 颜色 ----
  red: '🟥',
  blue: '🟦',
  green: '🟩',
  yellow: '🟨',
  black: '⬛',
  white: '⬜',
  pink: '🩷',
  orange: '🟧',
  brown: '🟫',
  purple: '🟪',
  color: '🎨',
  light: '💡',
  dark: '🌑',
  flower: '🌸',
  ball: '⚽',

  // ---- L0 数字 ----
  one: '1️⃣',
  two: '2️⃣',
  three: '3️⃣',
  four: '4️⃣',
  five: '5️⃣',
  six: '6️⃣',
  seven: '7️⃣',
  eight: '8️⃣',
  nine: '9️⃣',
  ten: '🔟',
  number: '🔢',
  count: '🧮',
  how: '❓',
  many: '🧺',
  age: '🎂'
}

import { PIC_ASSETS } from './picAssets'

const FALLBACK = ['📘', '🎈', '🌟', '🧩', '🍎', '🚀', '🎨', '🐣']

/** 有开源插图就用插图，没有就返回 null（页面退回 emoji） */
export function picAsset(word) {
  const key = String(word || '').toLowerCase().trim()
  return PIC_ASSETS[key] || null
}

/** 章节主题图标（按标题里的关键词匹配，换话题只改这里） */
export function topicIcon(title) {
  const t = String(title || '')
  const table = [
    ['打招呼', '👋'], ['颜色', '🎨'], ['数字', '🔢'], ['动物', '🐾'],
    ['家人', '👨‍👩‍👧'], ['食物', '🍎'], ['玩具', '🧸'], ['学校', '🏫'],
    ['天气', '🌤'], ['生日', '🎈'], ['情绪', '🤗'], ['点餐', '🍔'],
    ['出行', '🚌'], ['工作', '💼'], ['爱好', '🎾'], ['旅行', '✈️'], ['健康', '🩺']
  ]
  for (const [k, v] of table) if (t.indexOf(k) >= 0) return v
  return '📘'
}

/** 没配图的词，按字母算一个固定图标，保证每次看到的是同一张 */
export function picOf(word) {
  const key = String(word || '').toLowerCase().trim()
  if (PICS[key]) return PICS[key]
  let h = 0
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) % 999
  return FALLBACK[h % FALLBACK.length]
}

export default PICS
