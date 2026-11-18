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
  const list = getWrongBook()
  const key = item.en || item.text
  if (list.some(x => (x.en || x.text) === key)) return
  list.unshift({ ...item, at: Date.now() })
  try {
    Taro.setStorageSync(WRONG_KEY, list.slice(0, 100))
  } catch (e) {}
  pushWrong({ en: key, zh: item.zh || '', chapterId: item.chapterId || '' })
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
