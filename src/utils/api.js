import Taro from '@tarojs/taro'
import { API_BASE } from './config'
import { chapters as fallbackChapters } from '../data/chapters'
const CACHE_KEY = 'en_chapters_cache_v1'

function normalize(data) {
  if (!data) return null
  if (typeof data === 'string') {
    try {
      return JSON.parse(data)
    } catch (e) {
      return null
    }
  }
  return data
}

/**
 * 拉取题库：优先走服务端，失败就用上次缓存，再失败用包里自带的
 * 这样断网也能继续练
 */
export async function loadChapters() {
  let cached = []
  try {
    const res = await Taro.getStorage({ key: CACHE_KEY })
    const list = normalize(res.data)
    if (Array.isArray(list) && list.length) cached = list
  } catch (e) {}

  try {
    const res = await Taro.request({
      url: `${API_BASE}/api/chapters?full=1`,
      timeout: 3000
    })
    const list = normalize(res.data)
    if (Array.isArray(list) && list.length) {
      Taro.setStorage({ key: CACHE_KEY, data: list }).catch(() => {})
      return list
    }
  } catch (e) {
    console.warn('[api] 题库拉取失败，用本地缓存', e)
  }

  if (cached.length) return cached
  return fallbackChapters
}

export function findChapter(list, id) {
  const arr = list && list.length ? list : fallbackChapters
  return arr.find(c => c.id === id) || arr[0] || null
}

/** ---------- 账号与云端进度 ---------- */
const TOKEN_KEY = 'en_token_v1'

export function getSession() {
  try {
    return Taro.getStorageSync(TOKEN_KEY) || null
  } catch (e) {
    return null
  }
}

export function setSession(session) {
  try {
    if (session) Taro.setStorageSync(TOKEN_KEY, session)
    else Taro.removeStorageSync(TOKEN_KEY)
  } catch (e) {}
}

export async function login(name, code, phone) {
  const res = await Taro.request({
    url: `${API_BASE}/api/login`,
    method: 'POST',
    timeout: 6000,
    header: { 'Content-Type': 'application/json' },
    data: { name, code, phone: phone || '' }
  })
  if (res.statusCode !== 200) {
    throw new Error((res.data && res.data.detail) || '登录失败')
  }
  const session = res.data
  setSession(session)
  return session
}

/** 首次登录时保存性别（之后不再问） */
export function saveGender(gender) {
  if (!getSession()) return Promise.resolve(null)
  return Taro.request({
    url: `${API_BASE}/api/gender`,
    method: 'POST',
    timeout: 5000,
    header: authHeader(),
    data: { gender }
  })
    .then(res => res.data || null)
    .catch(() => null)
}

/** 校验本地登录态是否还有效（返回 {ok, data}，网络错误不清登录） */
export function fetchMe() {
  const s = getSession()
  if (!s || !s.token) return Promise.resolve({ ok: false, data: null })
  return Taro.request({
    url: `${API_BASE}/api/me`,
    method: 'GET',
    timeout: 5000,
    header: authHeader()
  })
    .then(res => {
      if (res.statusCode === 200) return { ok: true, data: res.data }
      if (res.statusCode === 401) return { ok: false, data: null }
      return { ok: true, data: s }
    })
    .catch(() => ({ ok: true, data: s }))
}

/** 今天打卡（学完一节调用），可带 days 补录本机历史，返回 {days, streak} */
export function markCheckin(backfillDays) {
  if (!getSession()) return Promise.resolve(null)
  return Taro.request({
    url: `${API_BASE}/api/checkin`,
    method: 'POST',
    data: backfillDays && backfillDays.length ? { days: backfillDays } : {},
    timeout: 5000,
    header: authHeader()
  })
    .then(res => res.data || null)
    .catch(() => null)
}

/** 打卡记录（服务端，换设备也在） */
export function fetchCheckins() {
  if (!getSession()) return Promise.resolve(null)
  return Taro.request({
    url: `${API_BASE}/api/checkin`,
    method: 'GET',
    timeout: 5000,
    header: authHeader()
  })
    .then(res => res.data || null)
    .catch(() => null)
}

/** 学过的单词（服务端分页，每次默认 10 条） */
export function fetchWords(offset = 0, limit = 10) {
  if (!getSession()) return Promise.resolve(null)
  return Taro.request({
    url: `${API_BASE}/api/words?offset=${offset}&limit=${limit}`,
    method: 'GET',
    timeout: 8000,
    header: authHeader()
  })
    .then(res => res.data || null)
    .catch(() => null)
}

/** 记录一次学习活跃（后台活跃度用） */
export function pingStudy() {
  if (!getSession()) return Promise.resolve(null)
  return Taro.request({
    url: `${API_BASE}/api/activity`,
    method: 'POST',
    timeout: 5000,
    header: authHeader()
  })
    .then(res => res.data || null)
    .catch(() => null)
}

function authHeader() {
  const s = getSession()
  return s ? { 'X-Token': s.token, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' }
}

/** 我的娃娃卡（服务端） */
export function fetchCards() {
  if (!getSession()) return Promise.resolve([])
  return Taro.request({
    url: `${API_BASE}/api/cards`,
    method: 'GET',
    timeout: 5000,
    header: authHeader()
  })
    .then(res => (res.data && res.data.owned) || [])
    .catch(() => [])
}

/** 完成章节随机奖励一张娃娃卡（同一章只发一次） */
export function awardDollCard(chapterId) {
  if (!getSession()) return Promise.resolve(null)
  return Taro.request({
    url: `${API_BASE}/api/cards/award`,
    method: 'POST',
    timeout: 5000,
    header: authHeader(),
    data: { chapterId }
  })
    .then(res => res.data || null)
    .catch(() => null)
}

/** 提交意见反馈（失败抛出，页面据此提示） */
export async function sendFeedback(text) {
  const res = await Taro.request({
    url: `${API_BASE}/api/feedback`,
    method: 'POST',
    timeout: 8000,
    header: authHeader(),
    data: { text: String(text || '').slice(0, 200), at: Date.now() }
  })
  if (res.statusCode !== 200) throw new Error('submit failed')
  return res.data
}

/** 拉取该账号在服务端的全部进度（进度 / 错题 / 设置） */
export async function fetchProgress() {
  if (!getSession()) return null
  try {
    const res = await Taro.request({
      url: `${API_BASE}/api/progress`,
      timeout: 5000,
      header: authHeader()
    })
    if (res.statusCode === 200) return res.data
    if (res.statusCode === 401) setSession(null)
  } catch (e) {
    console.warn('[api] 进度拉取失败', e)
  }
  return null
}

export function pushChapterProgress(chapterId, patch) {
  if (!getSession()) return Promise.resolve(false)
  return Taro.request({
    url: `${API_BASE}/api/progress`,
    method: 'POST',
    timeout: 5000,
    header: authHeader(),
    data: { chapterId, patch }
  }).then(() => true).catch(() => false)
}

export function pushWrong(item) {
  if (!getSession()) return Promise.resolve(false)
  return Taro.request({
    url: `${API_BASE}/api/wrong`,
    method: 'POST',
    timeout: 5000,
    header: authHeader(),
    data: item
  }).then(() => true).catch(() => false)
}

export function pushClearWrong() {
  if (!getSession()) return Promise.resolve(false)
  return Taro.request({
    url: `${API_BASE}/api/wrong`,
    method: 'DELETE',
    timeout: 5000,
    header: authHeader()
  }).then(() => true).catch(() => false)
}

export function pushSettings(settings) {
  if (!getSession()) return Promise.resolve(false)
  return Taro.request({
    url: `${API_BASE}/api/settings`,
    method: 'POST',
    timeout: 5000,
    header: authHeader(),
    data: settings
  }).then(() => true).catch(() => false)
}

/** 当前练习状态（刷新、换手机都能续上） */
export function getPracticeStates(chapterId) {
  if (!getSession()) return Promise.resolve(null)
  return Taro.request({
    url: `${API_BASE}/api/state?chapterId=${encodeURIComponent(chapterId || '')}`,
    method: 'GET',
    timeout: 5000,
    header: authHeader()
  })
    .then(res => normalize(res.data))
    .catch(() => null)
}

export function savePracticeState(chapterId, mode, data) {
  if (!getSession()) return Promise.resolve(false)
  return Taro.request({
    url: `${API_BASE}/api/state`,
    method: 'POST',
    timeout: 5000,
    header: authHeader(),
    data: { chapterId, mode, data }
  })
    .then(() => true)
    .catch(() => false)
}
