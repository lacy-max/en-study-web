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
