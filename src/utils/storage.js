import Taro from '@tarojs/taro'

const PROGRESS_KEY = 'en_progress_v1'
const SETTINGS_KEY = 'en_settings_v1'
const WRONG_KEY = 'en_wrong_v1'

/** ---------- 设置 ---------- */
export function getSettings() {
  try {
    return Taro.getStorageSync(SETTINGS_KEY) || { autoSpeak: true, autoNext: true, rate: 0.9 }
  } catch (e) {
    return { autoSpeak: true, autoNext: true, rate: 0.9 }
  }
}

export function saveSettings(s) {
  try {
    Taro.setStorageSync(SETTINGS_KEY, s)
  } catch (e) {}
}

/** ---------- 每章节进度 ---------- */
function readAll() {
  try {
    return Taro.getStorageSync(PROGRESS_KEY) || {}
  } catch (e) {
    return {}
  }
}

export function getChapterProgress(chapterId) {
  return readAll()[chapterId] || { maxScore: 0, lastStudyAt: 0, doneDays: [] }
}

export function saveChapterProgress(chapterId, patch) {
  const all = readAll()
  const old = all[chapterId] || { maxScore: 0, lastStudyAt: 0, doneDays: [] }
  all[chapterId] = { ...old, ...patch, lastStudyAt: Date.now() }
  try {
    Taro.setStorageSync(PROGRESS_KEY, all)
  } catch (e) {}
}

/** ---------- 错题本 ---------- */
export function getWrongBook() {
  try {
    return Taro.getStorageSync(WRONG_KEY) || []
  } catch (e) {
    return []
  }
}

export function addWrong(item) {
  const list = getWrongBook()
  const key = item.en || item.text
  if (list.some(x => (x.en || x.text) === key)) return
  list.unshift({ ...item, at: Date.now() })
  try {
    Taro.setStorageSync(WRONG_KEY, list.slice(0, 100))
  } catch (e) {}
}

export function clearWrongBook() {
  try {
    Taro.setStorageSync(WRONG_KEY, [])
  } catch (e) {}
}
