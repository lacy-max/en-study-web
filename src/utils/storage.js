import Taro from '@tarojs/taro'
import { pushChapterProgress, pushWrong, pushClearWrong, pushSettings } from './api'

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
  pushSettings(s)
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
  const p = readAll()[chapterId]
  return p || { maxScore: 0, lastStudyAt: 0, doneDays: [], modes: {} }
}

export function saveChapterProgress(chapterId, patch) {
  const all = readAll()
  const old = all[chapterId] || { maxScore: 0, lastStudyAt: 0, doneDays: [], modes: {} }
  const merged = { ...old, ...patch, lastStudyAt: Date.now() }
  // 练习环节完成情况按并集合并，不会互相覆盖
  merged.modes = { ...(old.modes || {}), ...((patch && patch.modes) || {}) }
  all[chapterId] = merged
  try {
    Taro.setStorageSync(PROGRESS_KEY, all)
  } catch (e) {}
  // 有登录就同步到服务器（失败不影响本地体验）
  pushChapterProgress(chapterId, patch)
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
  const raw = getWrongBook()
  const key = item.en || item.text
  if (!key) return
  // 又答错同一个：挪到最前面，并重新算作「没复习」
  const list = raw.filter(x => (x.en || x.text) !== key)
  list.unshift({ ...item, done: false, at: Date.now() })
  try {
    Taro.setStorageSync(WRONG_KEY, list.slice(0, 100))
  } catch (e) {}
  pushWrong({ en: key, zh: item.zh || '', chapterId: item.chapterId || '' })
}

/** 这一组复习完了，标记成「已复习」；下次进来先给没复习的 */
export function markWrongDone(keys) {
  const set = {}
  ;(keys || []).forEach(k => {
    set[k] = true
  })
  const list = getWrongBook().map(x => (set[x.en || x.text] ? { ...x, done: true } : x))
  try {
    Taro.setStorageSync(WRONG_KEY, list)
  } catch (e) {}
}

/** 全部复习完一轮后重新开始：把所有记录重置为「没复习」 */
export function resetWrongDone() {
  const list = getWrongBook().map(x => ({ ...x, done: false }))
  try {
    Taro.setStorageSync(WRONG_KEY, list)
  } catch (e) {}
  return list
}

export function countWrongPending() {
  return getWrongBook().filter(x => !x.done).length
}

export function removeWrong(en) {
  const list = getWrongBook().filter(x => (x.en || x.text) !== en)
  try {
    Taro.setStorageSync(WRONG_KEY, list)
  } catch (e) {}
}

export function clearWrongBook() {
  try {
    Taro.setStorageSync(WRONG_KEY, [])
  } catch (e) {}
  pushClearWrong()
}

/** ---------- 用服务端数据覆盖本地缓存（登录后调用） ---------- */
export function applyRemote(remote) {
  if (!remote) return false
  try {
    if (remote.progress) Taro.setStorageSync(PROGRESS_KEY, remote.progress)
    if (remote.wrong) Taro.setStorageSync(WRONG_KEY, remote.wrong)
    if (remote.settings && Object.keys(remote.settings).length) {
      Taro.setStorageSync(SETTINGS_KEY, remote.settings)
    }
  } catch (e) {
    return false
  }
  return true
}
