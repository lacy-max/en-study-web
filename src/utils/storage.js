import Taro from '@tarojs/taro'
import { pushChapterProgress, pushWrong, pushWrongDone, pushClearWrong, pushSettings } from './api'

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
  // 统一字段：en / zh / chapterId（页面按 chapterId + en 去找单词和例句）
  const entry = {
    en: key,
    zh: item.zh || item.cn || '',
    chapterId: item.chapterId || '',
    // 记原题：题型、题干、我的答案、正确答案，错题本按题展示而不是只给一个单词
    type: item.type || '',
    prompt: item.prompt || '',
    mine: item.mine || '',
    answer: item.answer || '',
    options: Array.isArray(item.options) && item.options.length ? item.options : null
  }
  // 又答错同一个：挪到最前面，并重新算作「没复习」
  const list = raw.filter(x => (x.en || x.text) !== key)
  list.unshift({ ...entry, done: false, at: Date.now() })
  try {
    Taro.setStorageSync(WRONG_KEY, list.slice(0, 100))
  } catch (e) {}
  // 给个明确反馈，避免「答错了但不知道有没有记进去」
  try {
    Taro.showToast({ title: '已记入错题本', icon: 'none', duration: 1200 })
  } catch (e) {}
  pushWrong(entry)
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
  // 已复习状态也要存服务端，退出登录/换设备后不会复活
  pushWrongDone(keys)
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

/** 退出登录时只清本地缓存，服务端数据保留，下次登录自动拉回 */
export function clearLocalWrong() {
  try {
    Taro.removeStorageSync(WRONG_KEY)
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
    if (Array.isArray(remote.wrong)) {
      // 服务端字段是 chapter_id，页面用 chapterId；顺带补 done 标记
      const remoteList = remote.wrong.map(r => ({
        en: r.en,
        zh: r.zh || '',
        chapterId: r.chapterId || r.chapter_id || '',
        type: r.type || '',
        prompt: r.prompt || '',
        mine: r.mine || '',
        answer: r.answer || '',
        options: r.options || null,
        done: !!r.done,
        at: r.at || 0
      }))
      const localList = Taro.getStorageSync(WRONG_KEY) || []
      const local = {}
      const localDone = {}
      localList.forEach(x => {
        const k = x.en || x.text
        if (!k) return
        if (!remoteList.some(y => y.en === k)) local[k] = x
        if (x.done) localDone[k] = true
      })
      // 服务端不存「已复习」标记，合并时把本地的 done 保住，避免复习完又冒出来
      const merged = remoteList
        .map(r => (localDone[r.en] ? { ...r, done: true } : r))
        .concat(Object.keys(local).map(k => local[k]))
      Taro.setStorageSync(WRONG_KEY, merged)
    }
    if (remote.settings && Object.keys(remote.settings).length) {
      Taro.setStorageSync(SETTINGS_KEY, remote.settings)
    }
  } catch (e) {
    return false
  }
  return true
}
